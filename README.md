# VINUM — Sistema de rastreabilidade e catálogo de vinhos

Aplicação desenvolvida como projeto de TCC para uma vinícola. O VINUM permite cadastrar e administrar vinícolas, vinhos, tipos de vinho, uvas, safras e lotes, além de disponibilizar um catálogo público para consulta dos produtos.

O sistema possui duas áreas principais:

- **Área administrativa:** gerenciamento dos cadastros, relacionamentos, imagens, QR Codes e dados de rastreabilidade.
- **Área do cliente:** catálogo público com os vinhos publicados e consulta de um lote por QR Code.

> O projeto está configurado para utilizar **MySQL** como banco de dados por meio do **Prisma ORM**.

## 1. O que é necessário instalar

Antes de executar o projeto, instale:

1. **Node.js 22 ou superior**, que já inclui o npm.
2. **MySQL Server 8**.
3. **MySQL Workbench**, recomendado para criar o banco, visualizar as tabelas e montar o diagrama ER.
4. **Git**, caso o projeto seja baixado pelo repositório.
5. Um editor de código, como o **Visual Studio Code**.

Confira as versões instaladas:

```bash
node --version
npm --version
```

## 2. Baixar o projeto

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/Gabriel12Klein/Projeto_TCC.git
cd Projeto_TCC
```

O nome da pasta pode variar conforme o nome escolhido no computador. O nome do pacote da aplicação é `vinum-v1.0`.

## 3. Criar o banco MySQL

Abra o MySQL Workbench, conecte-se à instância local e crie o banco de dados vazio:

```sql
CREATE DATABASE vinum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Na configuração padrão, a conexão utiliza:

```text
Servidor: localhost
Porta: 3306
Banco: vinum
Usuário: root
Senha: a senha configurada no MySQL local
```

O usuário e a senha não devem ser publicados no GitHub. Eles ficam somente no arquivo `.env`, que é ignorado pelo Git.

## 4. Configurar as variáveis de ambiente

Na raiz do projeto, copie o arquivo de exemplo:

```bash
copy .env.example .env
```

No Linux/macOS, use:

```bash
cp .env.example .env
```

Edite o `.env` e informe os dados reais do MySQL:

```env
PORT=3001
VITE_API_URL=/api
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/vinum"
JWT_SECRET="uma-chave-local-forte-e-secreta"
PUBLIC_APP_URL="http://localhost:5173"
```

Se o sistema for acessado pelo celular na mesma rede Wi-Fi, substitua `localhost` pelo IPv4 do computador:

```env
PUBLIC_APP_URL="http://192.168.0.85:5173"
```

Também será necessário iniciar o Vite com acesso à rede local, se o QR Code for testado no celular:

```bash
npm run dev -- --host 0.0.0.0
```

O firewall do Windows pode solicitar permissão para o Node.js. Para acessar pelo celular, o computador e o celular precisam estar na mesma rede.

## 5. Instalar e preparar a aplicação

Na raiz do projeto, execute:

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

Esses comandos fazem o seguinte:

- `npm install`: instala as dependências do frontend, backend e ferramentas de desenvolvimento.
- `prisma:generate`: gera o cliente TypeScript do Prisma.
- `prisma:push`: cria ou atualiza as tabelas do MySQL conforme o `prisma/schema.prisma`.
- `prisma:seed`: insere os dados iniciais necessários para testar o sistema.

## 6. Executar o sistema

Use dois terminais na raiz do projeto.

No primeiro terminal, inicie a API:

```bash
npm run backend
```

No segundo terminal, inicie o frontend:

```bash
npm run dev
```

Endereços locais:

- Aplicação web: <http://localhost:5173>
- API: <http://localhost:3001/api>
- Health check: <http://localhost:3001/api/health>
- Documentação da API: <http://localhost:3001/api/docs>
- Prisma Studio: `npm run prisma:studio`

Também existe o arquivo `start.js`, que pode ser executado pelo VS Code para iniciar frontend e backend juntos:

```bash
node start.js
```

Para desenvolvimento, os dois terminais separados são mais fáceis de acompanhar quando ocorre algum erro.

## 7. Acesso e perfis

O seed cria o usuário administrativo local:

```text
E-mail: admin@vinum.local
Senha: Admin123!
```

Novos cadastros públicos recebem o perfil `CUSTOMER` (cliente). Usuários com perfil `ADMIN` ou `EDITOR` podem acessar a área administrativa.

Em ambiente real, altere a senha padrão e não use credenciais de demonstração.

## 8. Como o sistema funciona

### Fluxo administrativo

1. O administrador cadastra a vinícola.
2. Cadastra os tipos de vinho disponíveis.
3. Cadastra as uvas, que podem participar de diferentes composições.
4. Cadastra o vinho produzido, incluindo nome, tipo, volume, teor alcoólico, foto e descrição.
5. Preenche as informações complementares exibidas ao cliente: características, aromas, notas de degustação, harmonização e outras informações.
6. Cadastra a safra, relacionando-a ao vinho, ao ano, à procedência, às observações, ao status e a uma ou mais uvas.
7. Cadastra o lote, relacionando-o ao vinho e à safra, informando código, quantidade, data de produção, hora de envase, data de registro, status e uvas utilizadas.
8. Publica o vinho no catálogo.
9. Gera o QR Code do lote. O QR Code direciona para a consulta pública do lote.

### Fluxo do cliente

O cliente pode:

- navegar pelo catálogo de vinhos publicados;
- filtrar e pesquisar produtos;
- abrir a página detalhada de um vinho;
- visualizar foto, tipo, uvas, volume, teor alcoólico e descrição completa;
- consultar características, aromas, notas de degustação, harmonização e informações complementares;
- escanear o QR Code de um lote e consultar a origem, a safra, as uvas utilizadas, as datas, a quantidade e o status.

O cliente não cadastra nem altera dados de produção.

## 9. Padrões de identificação

### Código do lote

O padrão adotado é:

```text
L + AA + DDD
```

Exemplo:

```text
L24100
```

- `L`: identifica um lote.
- `24`: ano do envase, neste caso 2024.
- `100`: dia do ano. Em 2024, o 100º dia corresponde a 9 de abril.

Ao informar um código válido, a data de produção é preenchida automaticamente. O sistema considera anos bissextos, permitindo os dias 001 a 365 ou 001 a 366 quando aplicável.

### Identificador da safra

O padrão adotado é:

```text
SF + AA + TDD
```

Exemplo:

```text
SF22-T04
```

- `SF`: identifica uma safra.
- `22`: ano da colheita, neste caso 2022.
- `T04`: código do tanque, lote de barricas ou local de origem utilizado no rastreamento.

O ano da safra é preenchido automaticamente a partir dos dois dígitos do identificador.

## 10. Banco de dados e relacionamentos

O esquema físico está em [`prisma/schema.prisma`](prisma/schema.prisma). As tabelas são criadas no MySQL pelo Prisma.

Principais entidades:

- `usuario`: contas, dados de perfil e permissões.
- `role`: perfis de acesso.
- `sessao`: sessões autenticadas.
- `vinicola`: dados da vinícola.
- `vinho`: cadastro e informações públicas do vinho.
- `tipo_vinho`: tipos de vinho.
- `uva`: tipos de uva.
- `vinho_uva`: relação entre vinhos e uvas.
- `imagem_vinho`: imagens associadas aos vinhos.
- `safra`: ano, procedência, observações e status da safra.
- `status_safra`: opções de situação da safra.
- `safra_uva`: relação entre safras e uvas.
- `lote`: produção, envase, datas, QR Code e referência de blockchain.
- `status_lote`: opções de situação do lote.
- `lote_uva`: relação entre lotes e uvas.

Relacionamentos centrais:

```text
Vinícola 1:N Vinho
Vinho 1:N Safra
Vinho 1:N Lote
Safra 1:N Lote
Vinho N:N Uva       (vinho_uva)
Safra N:N Uva       (safra_uva)
Lote N:N Uva        (lote_uva)
Vinho 1:N Imagem    (imagem_vinho)
Usuário 1:N Sessão
```

O lote é o registro que conecta a produção à consulta do cliente. Ele aponta para uma safra e para um vinho. A safra guarda a origem da matéria-prima; o vinho representa o produto; e o lote representa a produção/engarrafamento específico que será rastreado pelo QR Code.

## 11. Alterações no banco de dados

Quando for necessário criar tabela ou adicionar coluna, atualize o schema e registre uma migration:

```bash
npm run prisma:migrate -- --name descricao_da_alteracao
npm run prisma:generate
```

Para apenas sincronizar um banco local de desenvolvimento:

```bash
npm run prisma:push
```

Depois de alterar o banco, confira as tabelas pelo MySQL Workbench ou pelo Prisma Studio.

## 12. QR Code e blockchain

O sistema gera QR Codes localmente e salva o caminho do arquivo na coluna `qrCodePath` da tabela `lote`. O QR Code leva para uma rota pública de consulta:

```text
/consulta/lotes/:codigo-do-lote
```

O projeto possui os campos `blockchainRef` e a interface preparada para registrar uma referência futura. A integração com uma blockchain externa ainda não está implementada; atualmente a funcionalidade é uma preparação visual e estrutural para uma etapa posterior.

## 13. Upload de imagens

As imagens dos vinhos são enviadas pela API e armazenadas localmente em:

```text
backend/uploads/
```

Essa pasta possui apenas um `.gitkeep` no repositório. Imagens enviadas e QR Codes gerados não devem ser versionados.

## 14. Testes e qualidade

Comandos disponíveis:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

O comando `check` executa formatação, lint, verificação TypeScript, testes e build.

## 15. Solução de problemas

### Erro de conexão com o MySQL

Confira se:

- o serviço MySQL está iniciado;
- o banco `vinum` existe;
- usuário, senha, porta e nome do banco estão corretos no `.env`;
- a URL começa com `mysql://`.

### O celular não abre o QR Code

`localhost` aponta para o próprio celular, não para o computador. Use o IPv4 do computador em `PUBLIC_APP_URL`, inicie o Vite com `--host 0.0.0.0` e mantenha os dispositivos na mesma rede.

### Dados não aparecem depois de uma alteração no schema

Execute:

```bash
npm run prisma:generate
npm run prisma:push
```

Depois reinicie o backend.

### Mensagem de registro duplicado

Identificadores como e-mail, código do lote, identificador da safra, CNPJ, slug e nomes de referência possuem regras de unicidade. Use um valor ainda não cadastrado ou edite o registro existente.

## 16. Estrutura resumida do projeto

```text
prisma/
  schema.prisma       modelo do banco
  migrations/         alterações versionadas
  seed.ts             dados iniciais
backend/
  src/app.ts          configuração da API
  src/server.ts       servidor HTTP
  src/modules/        módulos de autenticação e domínio
  src/common/         erros, arquivos e formatação
  uploads/            imagens e QR Codes locais
src/
  api/                cliente HTTP do frontend
  pages/              telas públicas, cliente e administração
  features/           regras de interface
  types/              tipos compartilhados
```

## Licença e finalidade

Projeto acadêmico desenvolvido para o TCC. O código pode ser usado para fins de estudo, demonstração e evolução do sistema VINUM.
