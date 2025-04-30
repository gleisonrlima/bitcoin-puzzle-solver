/***************************************************************
 * app.js - Revisão Final
 *
 * 1. Corrige ou ajusta Modo Interval e Smart para evitar pular
 *    além do range.
 * 2. Modo Aleatório continua genuinamente aleatório; se o range
 *    for muito grande, pode levar tempo para encontrar a chave.
 * 3. Última chave pesquisada atualiza a cada 10s.
 ***************************************************************/

/* -------------------------- Seleção dos Elementos HTML -------------------------- */
const btcAddressEl = document.getElementById("btcAddress");
const startKeyEl = document.getElementById("startKey");
const endKeyEl = document.getElementById("endKey");
const threadsEl = document.getElementById("threads");
const modeSelectEl = document.getElementById("modeSelect");
const puzzleSelectEl = document.getElementById("puzzleSelect");
const scanTimeEl = document.getElementById("scanTime");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const checkedKeysEl = document.getElementById("checkedKeys");
const chanceSuccessEl = document.getElementById("chanceSuccess");
const timeElapsedEl = document.getElementById("timeElapsed");
const foundKeyEl = document.getElementById("foundAddress");
const activityLogEl = document.getElementById("activityLog");
const searchedKeysEl = document.getElementById("searchedKeys");
const lastSearchedKeyEl = document.getElementById("lastSearchedKey");
const totalPossibilitiesEl = document.getElementById("totalPossibilities");
const scanSpeedEl = document.getElementById("scanSpeed");

/* --------------------------- Variáveis de Controle ----------------------------- */
let startTime = 0;
let searchInterval = null;
let checkedCount = 0;
let found = false;
let scanTimer = null;

let startCandidate;
let endCandidate;
let currentCandidate;
let totalCandidates;
let step = 1n;
let lastCandidateSearched = "";

/* ------------------------------- Eventos --------------------------------------- */
startBtn.addEventListener("click", startSearch);
stopBtn.addEventListener("click", stopSearch);
puzzleSelectEl.addEventListener("change", fillPuzzleParams);

// Atualiza a última chave pesquisada a cada 10s (em vez de 30s)
setInterval(updateLastSearchedDisplay, 10000);

/* ------------------- Função para Preencher os Campos (Desafios) ------------------- */
function fillPuzzleParams() {
	const puzzle = puzzleSelectEl.value;
	if (puzzle === "puzzle25") {
		btcAddressEl.value = "15JhYXn6Mx3oF4Y7PcTAv2wVVAuCFFQNiP";
		startKeyEl.value = "1000000";
		endKeyEl.value = "1ffffff";
	} else if (puzzle === "puzzle71") {
		btcAddressEl.value = "1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU";
		startKeyEl.value = "400000000000000000";
		endKeyEl.value = "7fffffffffffffffff";
	}
}

/* ---------------------------- Função Principal: startSearch() ---------------------------- */
function startSearch() {
	clearInterval(searchInterval);
	if (scanTimer) clearTimeout(scanTimer);
	resetDisplay();

	const btcAddress = btcAddressEl.value.trim();
	const startKey = startKeyEl.value.trim();
	const endKey = endKeyEl.value.trim();
	const threads = Number.parseInt(threadsEl.value, 10);
	const scanTime = scanTimeEl.value.trim();

	if (!btcAddress || !validateBitcoinAddress(btcAddress)) {
		logActivity("Erro: Endereço Bitcoin inválido ou vazio!");
		return;
	}
	if (!startKey || !endKey || !validateHexRange(startKey, endKey)) {
		logActivity("Erro: Valores de início/fim inválidos em hexadecimal.");
		return;
	}

	logActivity(`Iniciando busca para o endereço: ${btcAddress}`);
	logActivity(`Faixa de chaves: ${startKey} até ${endKey}`);

	// Configura intervalos
	startCandidate = BigInt(`0x${startKey}`);
	endCandidate = BigInt(`0x${endKey}`);
	currentCandidate = startCandidate;
	totalCandidates = endCandidate - startCandidate + 1n;

	totalPossibilitiesEl.textContent = `${totalCandidates}`;

	found = false;
	checkedCount = 0;
	startTime = Date.now();

	// Ajusta step para modo Interval
	step = totalCandidates / 1000n;
	if (step < 1n) step = 1n;
	if (step > totalCandidates) step = totalCandidates;

	// Se houver tempo de scan configurado
	if (scanTime) {
		scanTimer = setTimeout(() => {
			stopSearch();
			logActivity(
				`Tempo de scan configurado (${scanTime}s) atingido. Busca interrompida.`,
			);
			updateLastSearchedDisplay();
		}, Number(scanTime) * 1000);
	}

	// Inicia a busca em "batches"
	searchInterval = setInterval(() => {
		const elapsedMs = Date.now() - startTime;
		const elapsedSec = Math.floor(elapsedMs / 1000);

		for (let i = 0; i < 1000; i++) {
			if (found) {
				clearInterval(searchInterval);
				if (scanTimer) clearTimeout(scanTimer);
				updateLastSearchedDisplay();
				return;
			}

			const mode = modeSelectEl.value;
			let candidate;

			switch (mode) {
				case "sequential":
					candidate = currentCandidate;
					currentCandidate++;
					if (candidate > endCandidate) {
						finishNoKey();
						return;
					}
					break;
				case "aleatorio":
					candidate = randomCandidate(startCandidate, endCandidate);
					break;
				case "interval": {
					candidate = currentCandidate;
					if (candidate > endCandidate) {
						finishNoKey();
						return;
					}
					// Tenta avançar step, mas se ultrapassar endCandidate,
					// "circula" ou ajusta para o final
					let nextCandidate = currentCandidate + step;
					if (nextCandidate > endCandidate) {
						nextCandidate =
							startCandidate + (nextCandidate - endCandidate - 1n);
						// Se "circulamos" e ainda estamos além, ajustamos
						if (nextCandidate > endCandidate) {
							nextCandidate = endCandidate;
						}
					}
					currentCandidate = nextCandidate;
					break;
				}
				case "smart": {
					// Combinação de sequencial + aleatório no step
					const offset = randomCandidate(0n, step);
					candidate = currentCandidate + offset;
					// Caso passemos do limite, "circulamos" ou ajustamos
					if (candidate > endCandidate) {
						candidate = startCandidate + (candidate - endCandidate - 1n);
						if (candidate > endCandidate) {
							candidate = endCandidate;
						}
					}
					currentCandidate++;
					if (currentCandidate > endCandidate) {
						currentCandidate = startCandidate;
					}
					break;
				}
				default:
					candidate = currentCandidate;
					currentCandidate++;
					if (candidate > endCandidate) {
						finishNoKey();
						return;
					}
			}

			// Converte em hex 64 dígitos
			const candidateHexFull = candidate.toString(16).padStart(64, "0");
			lastCandidateSearched = candidateHexFull;
			appendSearchedKey(candidateHexFull, mode);

			// Gera endereço
			const candidateAddress = privateKeyToAddress(candidateHexFull);
			checkedCount++;

			// Verifica se encontramos
			if (candidateAddress === btcAddress) {
				found = true;
				let candidateHexReduced = candidateHexFull.replace(/^0+/, "");
				candidateHexReduced = candidateHexReduced ? candidateHexReduced : "0";
				candidateHexReduced = `0x${candidateHexReduced}`;
				const candidateWIF = convertToWIF(candidateHexFull);
				logActivity(
					`Chave encontrada! 🎉💰\nChave Privada: ${candidateHexReduced}\nWIF: ${candidateWIF}`,
				);
				foundKeyEl.textContent = candidateHexReduced;
				clearInterval(searchInterval);
				if (scanTimer) clearTimeout(scanTimer);
				updateLastSearchedDisplay();
				return;
			}
		}

		// Atualiza estatísticas
		checkedKeysEl.textContent = `${checkedCount}`;
		const chance = (BigInt(checkedCount) * 10000n) / totalCandidates;
		chanceSuccessEl.textContent = `${(Number(chance) / 100).toFixed(2)}%`;
		timeElapsedEl.textContent = `${elapsedSec}s`;

		const speed = elapsedSec > 0 ? (checkedCount / elapsedSec) * threads : 0;
		scanSpeedEl.textContent = speed.toFixed(2);
	}, 50);
}

/* ---------------------------- Função para Parar a Busca ---------------------------- */
function stopSearch() {
	clearInterval(searchInterval);
	if (scanTimer) clearTimeout(scanTimer);
	logActivity("Busca interrompida pelo usuário.");
	updateLastSearchedDisplay();
}

/* ---------------------------- Funções Auxiliares ---------------------------- */
function resetDisplay() {
	activityLogEl.textContent += "\n----------------------------------------\n";
	checkedKeysEl.textContent = "0";
	chanceSuccessEl.textContent = "0%";
	timeElapsedEl.textContent = "0s";
	foundKeyEl.textContent = "-";
	searchedKeysEl.textContent = "";
	lastSearchedKeyEl.textContent = "-";
	totalPossibilitiesEl.textContent = "-";
	scanSpeedEl.textContent = "-";
	lastCandidateSearched = "";
	found = false;
	checkedCount = 0;
}

// Função finalizando sem encontrar chave
function finishNoKey() {
	clearInterval(searchInterval);
	if (scanTimer) clearTimeout(scanTimer);
	logActivity("Chave não encontrada no intervalo especificado.");
	updateLastSearchedDisplay();
}

function logActivity(msg) {
	const timestamp = new Date().toLocaleTimeString();
	activityLogEl.textContent += `${timestamp}: ${msg}\n`;
	activityLogEl.scrollTop = activityLogEl.scrollHeight;
}

function appendSearchedKey(keyHex, mode) {
	const displayKey = keyHex.replace(/^0+/, "") || "0";
	const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
	searchedKeysEl.textContent += `Modo ${modeText}: 0x${displayKey}\n`;
	const keysArray = searchedKeysEl.textContent.trim().split("\n");
	if (keysArray.length > 12) {
		searchedKeysEl.textContent = `${keysArray.slice(-12).join("\n")}\n`;
	}
}

function updateLastSearchedDisplay() {
	if (lastCandidateSearched) {
		const reduced = lastCandidateSearched.replace(/^0+/, "") || "0";
		lastSearchedKeyEl.textContent = `0x${reduced}`;
	}
}

// Valida endereço (Compressed)
function validateBitcoinAddress(address) {
	const regex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
	return regex.test(address);
}

// Valida range em hex
function validateHexRange(startHex, endHex) {
	const hexRegex = /^[0-9a-fA-F]+$/;
	if (!hexRegex.test(startHex) || !hexRegex.test(endHex)) return false;
	return BigInt(`0x${startHex}`) < BigInt(`0x${endHex}`);
}

// Retorna um candidato aleatório dentro do [start, end]
function randomCandidate(start, end) {
	const diff = end - start + 1n;
	const rand = BigInt(Math.floor(Math.random() * Number(diff)));
	return start + rand;
}

/* ------------------- Conversão: Chave Privada -> WIF (Compressed) ------------------- */
function convertToWIF(hexKey) {
	const paddedKey = hexKey.padStart(64, "0");
	const prefix = "80";
	const suffix = "01";
	const extendedKey = prefix + paddedKey + suffix;

	const hash1 = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(extendedKey));
	const hash2 = CryptoJS.SHA256(hash1);
	const checksum = hash2.toString().substring(0, 8);

	const finalHex = extendedKey + checksum;
	return base58Encode(finalHex);
}

/* ------------------- Conversão: Chave Privada -> Endereço BTC (Compressed) ----------- */
function privateKeyToAddress(privateKeyHex) {
	const paddedKey = privateKeyHex.padStart(64, "0");
	const ec = new elliptic.ec("secp256k1");
	const keyPair = ec.keyFromPrivate(paddedKey);
	const pubKeyCompressed = keyPair.getPublic(true, "hex");

	const sha256Hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(pubKeyCompressed));
	const ripemdHash = CryptoJS.RIPEMD160(sha256Hash);
	const hash160 = ripemdHash.toString();

	const version = "00";
	const extendedHash = version + hash160;
	const hashA = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(extendedHash));
	const hashB = CryptoJS.SHA256(hashA);
	const checksum = hashB.toString().substring(0, 8);

	const finalHex = extendedHash + checksum;
	return base58Encode(finalHex);
}

/* ------------------- Função de Base58 Encoding (Simplificada) ------------------- */
function base58Encode(hexStr) {
	const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
	let num = BigInt(`0x${hexStr}`);
	let encoded = "";

	while (num > 0n) {
		const remainder = Number(num % 58n);
		num = num / 58n;
		encoded = alphabet[remainder] + encoded;
	}
	// Adiciona '1' para cada byte 0 inicial
	for (let i = 0; i < hexStr.length; i += 2) {
		if (hexStr.substr(i, 2) === "00") {
			encoded = `1${encoded}`;
		} else break;
	}
	return encoded;
}
