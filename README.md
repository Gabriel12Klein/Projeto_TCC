# VINUM — plataforma local para vinícola

Aplicação do TCC para administrar vinícolas, vinhos, safras e lotes e apresentar os vinhos publicados em um catálogo público. O catálogo não possui venda, preço, estoque comercial ou carrinho.

## Tecnologias

- React, Vite, TypeScript e Tailwind CSS 4;
- React Router, TanStack Query, React Hook Form e Zod;
- Node.js, Express e TypeScript;
- Prisma ORM com MySQL local;
- Sessões persistentes, bcrypt e autorização por papéis;
- Upload local de imagens e geração local de QR Codes;
- Vitest, Supertest, ESLint e Prettier.

## Execução rápida

Requer Node.js 22 ou superior.

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Depois, execute `start.js` pelo VS Code ou use dois terminais:

```bash
npm run backend
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001/api`
- Documentação OpenAPI: `http://localhost:3001/api/docs`
- Prisma Studio: `npm run prisma:studio`

O `start.js` instala dependências e prepara o banco automaticamente quando necessário.

## Login administrativo local

- E-mail: `admin@vinum.local`
- Senha: `Admin123!`

O cadastro público sempre cria um usuário `CUSTOMER`. Somente `ADMIN` e `EDITOR` acessam os módulos administrativos.

## Configuração

Copie `.env.example` para `.env` apenas se quiser alterar os valores locais:

```env
PORT=3001
VITE_API_URL=/api
DATABASE_URL="mysql://usuario:senha@localhost:3306/vinum"
PUBLIC_APP_URL="http://localhost:5173"
```

O banco `dev.db`, as variáveis `.env`, imagens enviadas e QR Codes gerados não são versionados.

## Estrutura

```text
prisma/                    schema, migrations e seed
backend/
  src/
    common/                erros, arquivos e formatação
    docs/                  documento OpenAPI
    modules/               auth, catálogo e domínios administrativos
    app.ts                 composição da API
    server.ts              inicialização HTTP
  uploads/                 imagens e QR Codes locais
src/
  api/                     cliente HTTP tipado
  app/                     providers globais
  features/                regras de interface por funcionalidade
  pages/                   catálogo, autenticação e administração
  types/                   contratos do frontend
```

O antigo `backend/data/store.json` permanece somente como origem histórica do seed. A aplicação em execução usa exclusivamente Prisma e MySQL.

## Modelo de dados

```text
Winery 1 ── N Wine 1 ── N Vintage 1 ── N Batch
                  └── N WineImage
User 1 ── N Session
```

Safras referenciam vinhos por `wineId`, e lotes referenciam safras por `vintageId`. Nomes relacionados não são duplicados como fonte de verdade no banco.

## Rotas principais

- `GET /api/catalog/wines`: catálogo público;
- `GET /api/catalog/wines/:slug`: detalhe público;
- `POST /api/auth/login`: autenticação;
- `GET|POST|PUT|DELETE /api/vinhos`: administração de vinhos;
- `GET|POST|PUT|DELETE /api/vinicolas`: administração de vinícolas;
- `GET|POST|PUT|DELETE /api/safras`: administração de safras;
- `GET|POST|PUT|DELETE /api/lotes`: administração de lotes;
- `POST /api/uploads/wines/:wineId`: imagem principal;
- `POST /api/lotes/:id/qr-code`: geração de QR Code.

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

Cada alteração de schema deve gerar uma migration versionada:

```bash
npm run prisma:migrate -- --name descricao_da_alteracao
```

## Limites atuais

- O projeto foi preparado para execução local com MySQL;
- imagens e QR Codes ficam no sistema de arquivos local;
- blockchain permanece apenas como campo de referência, sem integração externa;
- recuperação de senha e gestão administrativa de usuários ainda não fazem parte deste protótipo.
