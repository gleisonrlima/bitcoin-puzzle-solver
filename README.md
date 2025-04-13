# Bitcoin Puzzle Solver

Aplicação web para tentativas de resolver puzzles públicos de Bitcoin, buscando chaves privadas associadas a endereços **Compressed**.

> **Atenção**: Este projeto é de uso educacional e experimental.  
> Não nos responsabilizamos por usos ilegais ou não autorizados.

## Características

1. O endereço Bitcoin alvo é do tipo **Compressed** (normalmente começando com `1` ou `3`).  
2. A chave privada gerada/conversão para **WIF** também está no formato Compressed.  
3. Utiliza as bibliotecas [crypto-js](https://github.com/brix/crypto-js) e [elliptic](https://github.com/indutny/elliptic) de forma **local**, sem links externos.  
4. Layout moderno e responsivo em CSS puro.  

## Como Executar

1. Baixe ou clone este repositório.  
2. Mantenha todos os arquivos na mesma pasta:  
   - `index.html`  
   - `style.css`  
   - `app.js`  
   - `crypto-js.min.js`  
   - `elliptic.min.js`  
3. Abra o arquivo **`index.html`** em seu navegador.  

### Ou via GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `bitcoin-puzzle-solver`).
2. Envie todos os arquivos mencionados acima para a branch principal.
3. Vá em **Settings > Pages** e ative o GitHub Pages apontando para a branch principal (e pasta raiz).
4. Acesse a URL fornecida pelo GitHub Pages.

## Estrutura do Projeto

