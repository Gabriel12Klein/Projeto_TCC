# VINUM — catálogo e gestão de uma vinícola

Aplicação acadêmica da única vinícola administradora VINUM. O catálogo publicado é público; cada cliente possui perfil, pedidos e adega privados. PostgreSQL é a fonte dos dados de negócio.

## Preparação

Requisitos: Node.js 22+, npm e Docker Desktop. Na primeira instalação, copie `.env.example` para `.env` e substitua todos os exemplos de senha. Nunca sobrescreva um `.env` já configurado.

- `DATABASE_URL`: PostgreSQL em localhost:5433, banco e usuário `vinum`; senha igual a `POSTGRES_PASSWORD` (codificada como URL quando necessário).
- `POSTGRES_PASSWORD` e `PGADMIN_DEFAULT_PASSWORD`: apenas para inicialização dos respectivos serviços; mudar essas variáveis não troca senhas em bancos já existentes.
- `ADMIN_INITIAL_EMAIL` e `ADMIN_INITIAL_PASSWORD`: criação inicial do administrador. A senha deve ter pelo menos 12 caracteres. Contas existentes não são redefinidas pelo seed.
- `PORT=3001`, `VITE_API_URL=/api`.

```bash
npm install
docker compose up -d
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
```

No PowerShell com scripts bloqueados, use `npm.cmd` em vez de `npm`.
A instalação vazia dispensa somente a migração histórica de demonstração incompatível, sem alterar seu arquivo. Dados de demonstração não são restaurados.

## Execução

Em dois terminais:

```bash
npm run backend
npm run dev
```

- Aplicação: http://localhost:5173
- API/saúde: http://localhost:3001/api/health
- Documentação da API: http://localhost:3001/api/docs
- pgAdmin: http://localhost:5051 (e-mail inicial `admin@vinum.com`).
- No pgAdmin em Docker, conecte ao host `postgres`, porta `5432`, banco/usuário `vinum`.
- Na máquina host, a porta do PostgreSQL é `5433`.
- Para encerrar o desenvolvimento, use Ctrl+C no terminal de cada serviço. Não encerre indiscriminadamente todos os processos Node.

O Compose usa o volume existente `vinum-tcc-prototipo-local_vinum_postgres_data`.
Nunca use `docker compose down -v`, reset ou exclusão de volumes para atualizar o sistema.
As portas no arquivo Compose estão limitadas a localhost; containers antigos precisam ser recriados para aplicar alterações de publicação de portas. Um simples restart preserva sua configuração anterior.

## Domínio administrativo

Somente ADMIN/EDITOR vinculados à VINUM podem administrar produtos. O cadastro público sempre cria CUSTOMER. Uma segunda vinícola é recusada pela API e pelo banco.

- Meu cadastro atualiza a mesma vinícola e a conta administrativa. Telefone da vinícola é independente do telefone pessoal. Alterar credenciais exige a senha atual; senha nova vazia mantém o hash existente.
- Resumo consulta COUNT e agrupamentos das tabelas reais, sem tabela de totais.
- Tipo e classificação são referências separadas, carregadas da API.
- Vinho contém uma ou mais uvas por `vinho_uva`. Novos vinhos exigem classificação; cadastros legados sem classificação continuam preservados até edição.
- Safra pertence ao vinho e copia suas uvas em uma transação. Alterar posteriormente o vinho ou editar observações da safra não muda essa composição histórica.
- Lote pertence a uma safra e ao mesmo vinho, garantido pela FK composta. A seleção é automática apenas quando existe uma safra; com várias, exige escolha.
- O catálogo apresenta somente vinhos publicados. Consultas públicas de lotes exigem lote e vinho publicados.
- Blockchain e geração de QR Code ficam reservadas. A API de geração responde 501; imagens e referências históricas não são apagadas.

Os identificadores existentes continuam `SF26-T01` (safra/ano/tanque) e `L26254` (lote/ano/dia do ano).

## Domínio do cliente

- Perfil persistido na própria tabela `usuario`; idade calculada pela data de nascimento.
- E-mail é único; alteração de e-mail/senha exige a senha atual e invalida outras sessões.
- Pedido VINUM referencia o vinho do catálogo; rótulo externo tem nome, foto e origem privados, sem cadastrar outra empresa.
- Pedido, estoque e movimento de entrada são gravados juntos. Movimentações concorrentes são serializadas por cliente.
- ENTRADA soma, CONSUMO subtrai e AJUSTE define o saldo absoluto. Saldo negativo é recusado.
- Editar pedido reconcilia a diferença com movimentos; reduções incompatíveis com o saldo são recusadas.
- Excluir pedido remove seu histórico, mas mantém garrafas e movimentos, conforme confirmação da interface.
- Fotos de clientes exigem autenticação e propriedade, inclusive quando alguém conhece a URL. O frontend usa download autenticado, sem token na URL.
- ADMIN não acessa os módulos privados de clientes; nenhum cliente pode alterar dados de outro.

## Persistência e evolução

O modelo está em `prisma/schema.prisma`. As migrations também contêm CHECKs e triggers que não são integralmente representados pelo Prisma.

Principais relações: usuário→papel; administrador→VINUM; VINUM→vinho; tipo/classificação→vinho; vinho↔uva; vinho→safra↔uva; safra→lote; cliente→pedido→item; cliente→estoque→movimento. O item de pedido e o estoque podem referenciar vinho oficial ou guardar um rótulo externo privado.

Para evoluir o banco, revise o schema e crie uma **nova** migration SQL incremental em `prisma/migrations/<timestamp>_<descricao>/migration.sql`, depois execute:

```bash
npm run prisma:deploy
npm run prisma:generate
```

Não edite migrations já aplicadas. Não use `db push` ou aceite resets.
O antigo atalho `prisma:migrate` executa `migrate dev`: não é o fluxo recomendado neste histórico, pois a migração antiga de demonstração depende de dados ausentes no shadow database. Use o fluxo incremental acima.

Imagens ficam em `backend/uploads`; PostgreSQL guarda referências. Backup completo inclui banco **e** uploads. Sessões são tokens aleatórios com hash no PostgreSQL, não JWT. O armazenamento do navegador é cache de sessão/formulário, nunca a fonte definitiva dos dados.

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx tsx backend/scripts/audit-relations.ts
```

Para reproduzir a validação integral (há breve indisponibilidade durante restart):

```bash
npx tsx backend/scripts/verify-specification.ts --restart
```

Esse script cria/reutiliza apenas `vinum_spec_validation`, compara schemas, roda testes e valida perfil/cadastro/pedido/foto/estoque após restart e novo login. Confere fingerprints dos dados reais e idempotência do seed. Não apaga banco nem volume. O banco isolado permanece disponível; fixtures transitórias são removidas somente por seus IDs.

`npm run check` também verifica formatação global. Não execute `npm run format` indiscriminadamente para corrigir apenas um módulo.

Relatório completo de implementação, testes, decisões e limitações: [docs/specification-review.md](docs/specification-review.md).

## Licença e finalidade

Projeto acadêmico de Gabriel Klein para o TCC.
