# VINUM — protótipo local do TCC

Versão com Login, Cadastro e área administrativa para Vinícola, Safra, Vinho e Lote.

## Frontend
- React
- JavaScript
- Vite
- Tailwind CSS 4

A interface foi migrada dos arquivos CSS específicos para classes Tailwind diretamente nos componentes React. O arquivo `src/styles.css` permanece apenas como ponto de entrada do Tailwind e para registrar as fontes/cores reutilizáveis da identidade VINUM.

## Backend
- Node.js
- Express
- JavaScript
- Persistência temporária em JSON

## Como executar no VS Code
1. Abra a pasta do projeto no VS Code.
2. Abra `start.js`.
3. Execute pelo botão Run / F5 / Code Runner.
4. Na primeira vez, o script executa `npm install` automaticamente.
5. O frontend abre em `http://localhost:5173` e a API local usa `http://localhost:3001`.

## Login de teste
- E-mail: `admin@vinum.local`
- Senha: `Admin123!`

Também é possível criar uma conta pela tela de Cadastro.

## Armazenamento temporário
Ainda não existe PostgreSQL nesta versão. O backend usa `backend/data/store.json` para simular persistência local. Cadastros, edições e exclusões são gravados nesse JSON e permanecem após reiniciar o projeto.

## Estrutura atual
- `src/pages/Login`: login.
- `src/pages/Cadastro`: criação de conta.
- `src/pages/Admin`: layout administrativo e módulos.
- `src/assets/admin`: assets reutilizáveis da área administrativa.
- `src/styles.css`: entrada do Tailwind e tokens globais.
- `backend`: API Node.js/Express.
- `backend/data/store.json`: armazenamento temporário.
- `design-reference`: prints do Figma usados como referência visual.

## Observação
Os botões de blockchain e QR Code aparecem para manter a estrutura visual do Figma, mas nesta versão exibem apenas uma mensagem de protótipo. Eles serão implementados posteriormente.
