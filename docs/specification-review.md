# Implementação da especificação VINUM

Fonte: VINUM_Especificacao_Funcional_Estrutural_Atualizada.pdf (21 páginas),
lido integralmente em 20/09/2026, junto da solicitação anexada.

## Auditoria anterior às alterações

Código: frontend React, APIs Express, Prisma/PostgreSQL, autenticação por sessão
persistida, services, routes, schema, 11 migrações, seed e Docker Compose analisados.
Banco atual: 1 vinícola, 3 vinhos, 2 safras, 2 lotes, 30 uvas, 12 tipos,
2 usuários, 2 pedidos, 3 itens de estoque, 13 garrafas. 23 FKs validadas.
Nenhum saldo divergente ou par lote/safra incompatível.

| Requisito do PDF | Estado inicial / ação |
| --- | --- |
| §§1,6: única vinícola e vínculo administrativo | Parcial; falta constraint e FK usuário/vinícola |
| §§2,3: tipo, classificação e uvas | Tipos/uvas existentes; classificação ausente |
| §§2.3,4: safra e composição histórica | Criação atômica existente; edição sobrescreve composição |
| §5: lotes filtrados e uvas históricas | Filtro/FK presentes; falta seleção automática única e proteção histórica |
| §§6.3–6.4: cadastro/resumo | Existentes; falta telefone da entidade e contagem de classificações |
| §§6.5–6.6: perfil e autorização | Persistência existe; falta e-mail editável seguro e idade derivada |
| §§6.7–6.10: estoque/pedidos | Transações e saldo presentes; endurecer origem, papéis e privacidade das fotos |
| §7: Docker, migrações e banco vazio | Volume presente; migração antiga de demonstração impede instalação vazia |
| §8: sobrescritas e fonte única | Remover atualizações indevidas de snapshots; seeds sem sobrescrita |
| §9: commits por tópico | Executar após testes e revisão de cada etapa |
| §10: blockchain/QR reservados | Blockchain não implementada; bloquear nova geração de QR sem apagar históricos |
| §11: critérios e regressões | Executar e registrar evidências por etapa e na validação final |

## Decisões de compatibilidade

- Não recriar schema, remover volumes ou editar migrações já aplicadas.
- Manter as tabelas de cliente existentes, sem um perfil/adega duplicado.
- Manter a FK composta lote/safra/vinho: já impede divergências no banco.
- Classificação de cadastros antigos não será inventada; exigir na criação de novos vinhos.
- Preservar imagens, dados reais e o catálogo público.
- Migração histórica de demonstração é marcada como dispensada somente em banco vazio.
  Não será reexecutada nem alterada na instalação atual.

## Execução

## Resultado da execução

Implementação funcional concluída e validada por API/SQL/testes automatizados.
Conferência visual interativa não executada: a ferramenta Browser não encontrou
nenhum navegador conectado. Não há alegação de teste visual ou de ausência absoluta
de defeitos. Blockchain e nova geração de QR ficam intencionalmente reservadas.

### Checklist final do PDF

| Seção | Status | Implementação / evidência |
| --- | --- | --- |
| 1, 6.1–6.2: única vinícola | Concluído | Singleton UNIQUE + CHECK; vínculo usuário/vinícola; rejeição na API e SQL |
| 2, 3.1: tipo e classificação separados | Concluído | Tabela classificacao, FK em vinho, API genérica e seleção carregada do banco |
| 2, 3.2: vinho/uvas N:N | Preservado e validado | vinho_uva com PK composta/FKs; edição não duplica vínculos |
| 2.3, 4: safra histórica | Corrigido | Criação transacional copia uvas; edição de metadados não substitui snapshot |
| 5: lote/safra/vinho | Corrigido e validado | Filtro por vinho; escolha automática só com uma safra; FK composta impede divergência |
| 6.3: Meu cadastro | Concluído | Mesmo registro, telefone próprio da VINUM, vínculo obrigatório, credenciais protegidas |
| 6.4: resumo | Concluído | COUNT/groupBy reais em transação; inclui classificação; invalidação após alterações |
| 6.5: área do cliente | Concluído | Apenas CUSTOMER; API privada por proprietário; ADMIN restrito à gestão |
| 6.6: perfil | Concluído | E-mail editável com senha atual, unicidade, idade derivada, endereço persistido, sessões revogadas |
| 6.7: estoque/adega | Preservado e endurecido | Livro de movimentos, transação e lock por cliente; saldo não negativo; fotos privadas |
| 6.8: compras | Corrigido e validado | VINUM por FK; rótulo externo com nome/local/foto; pedido e estoque atômicos |
| 6.9: persistência mínima | Validado | Reutilizadas tabelas usuario/pedido/item_pedido/estoque_item/movimentacao_estoque |
| 6.10: isolamento | Validado | Troca de IDs recusada; fotos de outro cliente 404; anônimo 401; gestão indevida 403 |
| 7.1: volume/seed | Validado | Volume mantido; dois seeds sem alteração de fingerprints; restart real sem perda |
| 7.2–7.3: migrations/integridade | Validado | 2 migrations novas, 25 FKs válidas; instalação vazia com mesmo schema lógico |
| 8: fonte única/sobrescritas | Corrigido e revisado | Sem mocks ativos como fonte de negócio; snapshot preservado; seed não redefine conta |
| 8: limpeza | Concluído | Tela antiga de gestão por cliente removida somente após busca de referências |
| 9: commits por tópico | Concluído | Oito commits funcionais/de validação, além do relatório |
| 10: blockchain/QR | Reservado, conforme escopo | Novas gravações bloqueadas; geração 501; históricos mantidos |
| 11–12: validação/resultado | Automatizado concluído | 37 testes; instalação limpa; restart; catálogo e API funcionando; visual pendente de navegador |

### Regras e decisões preservadas

- Uma única VINUM; clientes externos não criam empresas administrativas.
- Perfil continua na própria tabela usuario: não foi criada tabela redundante.
- Pedidos guardam snapshots de apresentação e FK opcional para vinho.
- Novo pedido do catálogo exige vinho publicado; histórico pode manter vínculo de
  um vinho posteriormente despublicado.
- Editar compra altera somente a diferença no saldo e registra movimentos.
  Reduções que consumiriam mais que o saldo são recusadas.
- Excluir pedido remove seu histórico, **não** as garrafas/movimentos; a FK do
  movimento para pedido usa SET NULL. A origem continua no movimento.
- Safra antiga não muda quando a composição atual do vinho muda.
- Trocar o vinho de safra com lotes é proibido. Sem lotes, a troca explícita
  recompõe suas uvas a partir do novo vinho.
- Lote mantém a relação composta já existente. lote_uva foi preservada por
  compatibilidade; a aplicação deriva sua composição da safra.
- Novos vinhos exigem classificação no backend e em trigger de INSERT.
  Os 3 vinhos legados não receberam uma classificação inventada: NULL é
  preservado até o responsável informar a classificação correta.
- Campos legados de idade/endereço não foram excluídos. Idade exibida é derivada
  da data de nascimento, e novas alterações não gravam a idade fornecida.
- Senha nova vazia mantém o hash; mudança de credenciais confirma senha atual.
- Fotos públicas de vinhos continuam públicas. Fotos privadas são baixadas com
  Authorization, sem tokens na URL, e usam Cache-Control private/no-store.
- Cache de consultas é limpo na troca de conta; logout já recarrega a aplicação.
- Nenhum backup, upload, senha, .env ou log foi incluído nos commits.

## Alterações no PostgreSQL

### Migração 20260920140000_single_winery

- vinicola.singleton: BOOLEAN NOT NULL DEFAULT true.
- CHECK vinicola_singleton_true e UNIQUE vinicola_singleton_key: no máximo uma
  vinícola, sem possibilidade de contornar usando false.
- vinicola.phone: TEXT opcional; migração única do telefone do único ADMIN quando
  disponível, sem redefinições posteriores pelo seed.
- usuario.wineryId: TEXT opcional, preenchido para ADMIN/EDITOR existentes.
- FK usuario_wineryId_fkey → vinicola.id: DELETE RESTRICT / UPDATE CASCADE.
- Índice usuario_wineryId_idx.
- Função/trigger assert_user_winery_role / usuario_winery_role:
  ADMIN/EDITOR exigem vínculo; CUSTOMER não pode tê-lo.
- Insere a VINUM inicial somente quando a tabela está vazia.

### Migração 20260920143000_wine_classification

- Nova tabela classificacao: id PK, name UNIQUE, description opcional,
  active BOOLEAN, createdAt e updatedAt.
- Índice classificacao_active_idx.
- vinho.classificationId: TEXT opcional para compatibilidade com legados.
- FK vinho_classificationId_fkey → classificacao.id:
  DELETE RESTRICT / UPDATE CASCADE.
- Índice vinho_classificationId_idx.
- Função/trigger require_new_wine_classification / vinho_new_classification:
  classificação obrigatória nos novos INSERTs.
- 10 referências iniciais, sem sobrescrever conflitos: Seco, Meio Seco, Suave,
  Nature, Extra Brut, Brut, Sec, Demi-Sec, Doce e Moscatel.

### Integridade existente mantida

- PKs compostas em vinho_uva, safra_uva e lote_uva.
- FK lote(vintageId,wineId) → safra(id,wineId), DELETE/UPDATE RESTRICT.
- Referências de produção em uso protegidas por RESTRICT.
- CHECKs de quantidade, volume, álcool, ano, tipo de movimento e origem do pedido.
- UNIQUE estoque_item(userId,wineId) para não duplicar vinho oficial por cliente.
- Triggers de item_pedido e movimentacao_estoque verificam proprietário dos vínculos.
- CASCADE limitado a dependentes próprios; remover pedido não apaga movimentos.
- Fonte relacional continua em PostgreSQL, sem novas estruturas paralelas de perfil,
  adega, fornecedor externo ou contagens.

### Instalação, Docker e dados preservados

- Nenhuma das 11 migrations históricas foi editada.
- 13 migrations no histórico final; em banco vazio, somente a importação histórica
  de demonstração é marcada como dispensada, sem executar suas referências inválidas.
- Banco de validação criado vazio: vinum_spec_validation. O schema foi comparado
  ao atual: campos, tipos, nullability, defaults, FKs, CHECKs, índices, triggers e
  funções coincidem. Posições físicas antigas deixadas por coluna removida não
  entram na comparação lógica.
- Prisma migrate diff entre banco atual e schema: migration vazia (sem drift).
- Banco auxiliar vinum_spec_tests da primeira etapa também permanece; nenhum
  banco/volume foi apagado para testar.
- Compose mantém volume vinum-tcc-prototipo-local_vinum_postgres_data.
- Senhas do Compose saíram do YAML e passaram para variáveis locais.
- Compose configura portas em 127.0.0.1. Containers existentes foram apenas
  reiniciados, não recriados: conservam as publicações antigas em 0.0.0.0.
  Aplicar essa restrição de rede exige recriação planejada; não foi feito reset.
- PostgreSQL e pgAdmin reiniciados com docker compose restart; comparação de
  fingerprints confirmou preservação de todas as linhas de negócio.
- O pgAdmin não é o banco nem uma segunda fonte de dados.
- Fotos ficam em backend/uploads. Backup completo precisa incluir essa pasta.
- Backup anterior à tarefa: vinum-before-specification.dump, fora do Git.
- Backend reiniciado com o código atualizado; Vite existente mantido.

### Auditoria final do banco real

| Dado | Quantidade |
| --- | ---: |
| Vinícolas | 1 |
| Vinhos | 3 |
| Safras / lotes | 2 / 2 |
| Uvas / tipos de vinho | 30 / 12 |
| Classificações | 10 |
| Usuários | 2 |
| Pedidos / itens de pedido | 2 / 2 |
| Itens de estoque / movimentos | 3 / 3 |
| Garrafas | 13 |
| Foreign keys válidas | 25 |
| FKs não validadas | 0 |
| Lotes com vinho/safra incompatíveis | 0 |
| Vinhos / safras sem uvas | 0 / 0 |
| Divergências de saldo | 0 |

## Testes e evidências

| Verificação | Resultado |
| --- | --- |
| npm test no banco atual | 37/37, 9 arquivos aprovados |
| Mesma suíte na instalação isolada | 37/37, 9 arquivos aprovados |
| npm run typecheck | Aprovado |
| npm run lint | Aprovado |
| npm run build | Aprovado |
| git diff --check | Aprovado antes de cada commit |
| Migrações no banco existente | Sem pendências, sem perda de dados |
| Migrações no banco inicialmente vazio | Aprovado; schema lógico equivalente |
| Seed executado duas vezes | Fingerprints de negócio idênticos |
| Autenticação ADMIN e CUSTOMER | Aprovado |
| ADMIN sem vinícola / segunda vinícola | Rejeitados por API/SQL |
| Cliente em CRUD administrativo | POST/PUT/DELETE recusados com 403 |
| ADMIN nos módulos pessoais de cliente | Recusado com 403 |
| Alteração real de cadastro da vinícola | Mesmo ID, contagem 1, telefone persistido |
| Credenciais administrativas | Senha vazia preservada; nova senha como hash; senha anterior recusada |
| Perfil, e-mail e idade | Persistência, unicidade, confirmação de senha, idade derivada e sessões verificadas |
| Vinho/classificação/uvas | Criação/edição/FK, sem duplicações; catálogo e COUNT atualizados |
| Safra/lote | Snapshot histórico, múltiplas safras, escolha única e FK incompatível verificados |
| Estoque concorrente | Compras concorrentes consolidadas; consumo não deixa saldo negativo |
| Rótulo externo / ajustes | wineId nulo, entrada, AJUSTE absoluto inclusive zero |
| Pedido externo com foto | Pedido/estoque/origem compartilhados corretamente, persistentes |
| Pedido oficial | FK real e entrada correspondente, edições reconciliadas |
| Dados de outro cliente | Listagem isolada; editar/excluir/movimentar por ID alheio recusados |
| Foto de outro cliente/anônimo | 404 / 401; tentativa de caminho codificado sem bypass |
| Restart real dos containers | Dados reais e isolados idênticos antes/depois |
| Perfil/pedido/estoque/foto/cadastro após restart/login | Aprovado no script de validação |
| Auditoria relacional | 25 FKs válidas, zero inconsistências verificadas |
| API em execução atualizada | /api/health 200, storage prisma-postgresql |
| Catálogo/Frontend em execução | 3 vinhos públicos; localhost:5173 HTTP 200 |
| Conferência visual no navegador | Não executada: nenhum navegador conectado |

A validação reproduzível está em backend/scripts/verify-specification.ts.
Ela cria somente fixtures isoladas, usa senhas aleatórias em memória, remove
apenas os registros/arquivos de teste criados por ela e não derruba volumes.

Avisos não bloqueantes encontrados: depreciação do driver pg sobre consultas
enfileiradas, comentários PURE em dependência Zod e bundle acima de 500 kB.
Não foram feitas atualizações amplas de dependências nem reformatado todo o projeto.
Não se declara aprovação de npm run check/formatação global, que não integra
as verificações acima.

## Revisão de arquivos e limpeza

Busca de imports, rotas e referências confirmou ClientWinePage sem consumidores.
A tela antiga permitia tentar administrar vinhos como cliente e contradizia o
modelo atual; foi removida. Recuperável pelo histórico Git anterior a 4408a54.
O catálogo público de HomePage/WineDetailPage permanece.

Removidos também o helper de geração de QR sem consumidores, o bloco de limpeza
histórica de rascunhos no bootstrap e variáveis de exemplo sem uso (JWT_SECRET /
PUBLIC_APP_URL). Arquivos de migrations, uploads e referências históricas não
foram removidos. Documentação antiga de integridade foi preservada como histórico
e apontada para este relatório.

### Arquivos criados

- `backend/scripts/deploy.ts`
- `backend/scripts/verify-specification.ts`
- `backend/src/modules/auth/profile.integration.test.ts`
- `backend/src/modules/single-winery.integration.test.ts`
- `docs/specification-review.md`
- `prisma/migrations/20260920140000_single_winery/migration.sql`
- `prisma/migrations/20260920143000_wine_classification/migration.sql`
- `shared/profile.ts`
- `src/pages/Admin/modules/Lote/selection.test.ts`
- `src/pages/Admin/modules/Lote/selection.ts`
- `src/pages/Client/PrivateImage.tsx`

### Arquivos alterados

- `.env.example`
- `README.md`
- `backend/scripts/audit-relations.ts`
- `backend/src/app.test.ts`
- `backend/src/app.ts`
- `backend/src/modules/admin-settings/admin-settings.integration.test.ts`
- `backend/src/modules/admin-settings/admin-settings.service.ts`
- `backend/src/modules/admin-settings/admin-settings.test.ts`
- `backend/src/modules/auth/auth.middleware.ts`
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/modules/auth/auth.schema.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/modules/batches/batches.routes.ts`
- `backend/src/modules/batches/batches.service.ts`
- `backend/src/modules/catalog/catalog.service.ts`
- `backend/src/modules/customer/customer.routes.ts`
- `backend/src/modules/customer/customer.schema.ts`
- `backend/src/modules/customer/customer.service.ts`
- `backend/src/modules/customer/customer.upload.test.ts`
- `backend/src/modules/references/reference.service.ts`
- `backend/src/modules/relations.integration.test.ts`
- `backend/src/modules/vintages/vintages.service.ts`
- `backend/src/modules/wineries/wineries.service.ts`
- `backend/src/modules/wines/wines.schema.ts`
- `backend/src/modules/wines/wines.service.ts`
- `backend/tsconfig.json`
- `docker-compose.yml`
- `docs/database-integrity.md`
- `package.json`
- `prisma/schema.prisma`
- `src/App.tsx`
- `src/api/api.ts`
- `src/main.tsx`
- `src/pages/Admin/AdminPage.tsx`
- `src/pages/Admin/components/AdminAccountMenu.tsx`
- `src/pages/Admin/components/AdminSidebar.tsx`
- `src/pages/Admin/components/ModuleForm.tsx`
- `src/pages/Admin/components/adminAccount.types.ts`
- `src/pages/Admin/moduleConfigs.ts`
- `src/pages/Admin/modules/Lote/LoteCadastrar.tsx`
- `src/pages/Admin/modules/Safra/SafraCadastrar.tsx`
- `src/pages/Admin/modules/Vinho/VinhoCadastrar.tsx`
- `src/pages/Catalog/WineDetailPage.tsx`
- `src/pages/Client/ClientSectionPage.tsx`
- `src/pages/Client/InventoryWineCard.tsx`
- `src/pages/Profile/ProfilePage.tsx`
- `src/types/index.ts`
- `tsconfig.app.json`
- `vitest.config.ts`

### Arquivos removidos

- `src/pages/Client/ClientWinePage.tsx`

## Commits por etapa

| Hash | Mensagem |
| --- | --- |
| 8f0a519 | fix(db): instala banco vazio sem reimportar demonstracao historica |
| 830936a | feat(admin): garante vinicola unica e vinculo das contas internas |
| 1f079c9 | feat(vinhos): adiciona classificacao persistente independente do tipo |
| f479e91 | fix(producao): preserva uvas historicas e seleciona safra sem ambiguidades |
| 2156b1d | fix(perfil): protege credenciais e deriva idade da data de nascimento |
| 052f3b0 | fix(cliente): isola fotos privadas e valida pedidos e permissoes |
| 2c4a817 | test(db): verifica instalacao limpa e persistencia apos reinicio |
| 4408a54 | refactor: remove fluxo obsoleto de cliente e documenta operacao segura |

O commit documental que contém este relatório é identificado por
`git log -1 -- docs/specification-review.md`. Os commits são locais; nenhum push
foi executado nesta tarefa.

## Limites e itens intencionais

- Blockchain e criação de QR Code não implementadas por determinação do PDF.
- Classificações reais dos registros antigos devem ser informadas pela VINUM;
  não foram inferidas nem inventadas.
- Verificação visual interativa depende de disponibilizar um navegador conectado.
- Não é uma certificação de segurança completa nem garantia de inexistência de bugs.
- O requisito funcional foi tratado sem excluir dados existentes. As limitações
  de validação e operação acima não foram ocultadas.
