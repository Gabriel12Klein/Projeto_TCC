# Pedidos, estoque e dashboard de consumo — versão 2.1.0

Data da implementação e validação: 26/09/2026.

## 1. Interpretação e mudança funcional

`Meus pedidos` é a origem principal das aquisições do cliente. Ao salvar uma compra, o backend cria o pedido, o item, cria ou atualiza o rótulo da adega e registra a entrada na mesma transação. `Meu estoque` deixou de cadastrar aquisições diretamente e passou a apresentar a visão consolidada de compras, consumos, saldo e consumo mensal.

Antes, pedidos já alimentavam a adega, mas a tela de estoque também permitia cadastrar rótulos e entradas independentemente. Isso criava dois caminhos concorrentes para a mesma intenção. Agora novas entradas são feitas somente por pedidos; os registros diretos antigos foram preservados como legado.

## 2. Arquivos

### Alterados

- `prisma/schema.prisma`
- `backend/scripts/audit-relations.ts`
- `backend/src/modules/customer/customer.routes.ts`
- `backend/src/modules/customer/customer.schema.ts`
- `backend/src/modules/customer/customer.service.ts`
- `backend/src/modules/customer/customer.service.test.ts`
- `backend/src/modules/customer/customer.upload.test.ts`
- `backend/src/modules/relations.integration.test.ts`
- `src/api/api.ts`
- `src/api/responseShape.ts`
- `src/api/responseShape.test.ts`
- `src/pages/Client/ClientSectionPage.tsx`
- `src/pages/Client/ClientSectionPage.test.ts`
- `src/pages/Client/InventoryWineCard.tsx`
- `src/pages/Client/InventoryWineCard.css`
- `src/pages/Client/formValidation.ts`
- `src/pages/Client/formValidation.test.ts`
- `src/types/index.ts`
- `src/ui/useFormFeedback.ts`
- `docs/usability-audit.md`
- `docs/versioning.md`
- `package.json`
- `package-lock.json`

### Criados

- `prisma/migrations/20260926170000_customer_stock_dashboard/migration.sql`
- `prisma/migrations/20260926173000_inventory_adjustment_direction/migration.sql`
- `backend/src/modules/customer/customer-dashboard.integration.test.ts`
- `src/pages/Client/InventoryDashboard.tsx`
- `src/pages/Client/ConsumptionChart.tsx`
- `docs/customer-stock-dashboard.md`

### Removidos

Nenhum arquivo foi removido. Foram removidos do código o formulário de cadastro direto no estoque, o botão de entrada manual e o contrato de API que permitia movimentações genéricas pelo cliente.

## 3. Frontend

- `Meus pedidos` comunica que cada compra alimenta a adega e usa a ação `Registrar compra`.
- A exclusão destrutiva saiu da interface; pedidos que alimentam a adega permanecem como histórico e podem ser corrigidos por edição.
- `Meu estoque` apresenta cards de garrafas adquiridas, consumidas, disponíveis e rótulos registrados.
- O gráfico de linha usa os doze meses do ano selecionado e dados reais da API.
- O seletor não mistura meses de anos diferentes.
- O cadastro direto de rótulo/entrada foi removido; a chamada para registrar uma nova compra leva a `Meus pedidos`.
- O consumo solicita quantidade e data, impede zero, negativo, fração, saldo excedido e data futura antes do envio.
- Estados de carregamento, vazio, erro e dados são distintos.
- A validação de respostas da API reconhece explicitamente o contrato do dashboard.
- Ao abrir formulários o foco vai para o primeiro campo; no primeiro erro, segue a ordem visual; Cancelar/Escape no consumo devolve o foco ao acionador; resultados recebem foco e também usam `status`/`alert`.

## 4. Backend e regras transacionais

- `POST /api/cliente/pedidos` continua criando pedido, item, estoque e movimento `ENTRADA` dentro de `prisma.$transaction` e com trava transacional por cliente.
- Recompras do mesmo vinho da VINUM reutilizam o item de estoque pela combinação cliente/vinho.
- Rótulos externos reutilizam a estrutura privada de item de pedido e estoque, com `wineId` nulo.
- `POST /api/cliente/estoque/:id/consumos` aceita somente quantidade e data de consumo; entradas e ajustes genéricos deixaram de ser expostos ao cliente.
- O backend obtém o cliente da sessão e valida propriedade do item.
- Consumo acima do saldo, zero, negativo, fracionário, futuro ou de outro cliente é rejeitado.
- Edições do pedido reconciliam o saldo na mesma transação e não permitem retirar garrafas já consumidas.
- `DELETE` de pedido responde `409`: o histórico que alimenta a adega é preservado e a correção deve ser feita por edição.
- Ajustes de edição são separados de aquisições e consumos e registram a direção (`aumento`/`redução`).

## 5. PostgreSQL

Nenhuma tabela, coluna, foreign key ou constraint nova foi necessária. Foram reaproveitadas:

- `usuario`
- `pedido`
- `item_pedido`
- `estoque_item`
- `movimentacao_estoque`
- `vinho`

As foreign keys e triggers existentes continuam garantindo que pedido, item, estoque e movimento pertençam ao mesmo cliente e, quando aplicável, ao mesmo vinho.

Migrations incrementais:

1. `20260926170000_customer_stock_dashboard`: recategoriza correções antigas de pedido como `AJUSTE` e cria o índice composto `movimentacao_estoque_inventoryItemId_type_occurredAt_idx` para item, tipo e data.
2. `20260926173000_inventory_adjustment_direction`: preserva e explicita a direção dos ajustes históricos para permitir auditoria do saldo.

As 15 migrations estão aplicadas. Não houve reset, `TRUNCATE`, recriação de schema, exclusão de volume ou alteração de migration histórica.

## 6. Cálculos

- Disponível: soma de `estoque_item.quantityBottles` do cliente autenticado.
- Consumido: soma de movimentos reais `CONSUMO` do cliente, excluindo correções históricas que não representam consumo.
- Adquirido: disponível + consumido. Essa equivalência mantém compras atuais e saldos legados sem criar contador duplicado.
- Rótulos registrados: quantidade de itens de estoque do cliente, inclusive rótulos já totalmente consumidos.
- Consumo mensal: movimentos `CONSUMO` agrupados em memória por ano UTC e mês UTC após consulta filtrada pelo cliente e ordenada por data.

Nenhum contador ou valor mensal é persistido separadamente.

## 7. Vinho externo e dados antigos

O vinho externo possui `wineId` nulo, nome/foto/origem privados e vínculo exclusivo com o cliente. Ele não cria vinícola, vinho público, safra, lote ou acesso administrativo e não aparece no catálogo.

Os itens antigos criados diretamente em estoque foram mantidos. Eles participam dos totais como saldo legado, exibem a indicação `Rótulo legado preservado do estoque anterior` e não receberam pedidos artificiais. Novas entradas diretas foram bloqueadas sem apagar o histórico existente.

## 8. Testes e resultados

### Automação dirigida

- Matriz funcional obrigatória: compra 6; consumo 2; recompra 3 do mesmo vinho sem duplicar estoque; segundo vinho com 4; rótulo externo privado; rejeição de consumo 5 sobre saldo 4; gráfico Jan=2, Fev=5 e Mar=1; dois clientes isolados; reload lógico; logout/login; rollback de pedido e rollback de consumo inválido.
- Transações e relações reais no PostgreSQL: 12 cenários passaram.
- Upload, imagem privada, edição, isolamento e preservação do pedido: 4 cenários passaram.
- Serviços/contratos/formulários das telas afetadas: 14 cenários focados passaram.
- Regressão dirigida de login, catálogo, perfil e administração: 23 cenários em 7 arquivos passaram.
- `eslint`, `tsc -b`, build Vite e `git diff --check` passaram.

### Banco preservado

Antes das migrations: 5 usuários, 5 pedidos, 5 itens de pedido, 7 itens de estoque, 38 movimentos e 17 garrafas.

Depois das migrations, antes dos dados próprios da validação visual: as mesmas contagens. A auditoria apresentou 25 foreign keys válidas, nenhum lote/safra incompatível, nenhum saldo inconsistente e nenhum ajuste sem direção. A validação visual acrescentou somente uma conta isolada, um pedido, um item de estoque e movimentos de teste, sem alterar dados anteriores.

### Navegador

- Conta isolada criada para a auditoria visual.
- Estado vazio correto em pedidos.
- Compra de 2 garrafas criou um único rótulo no estoque.
- Consumo de 1 alterou adquirido/consumido/disponível de 2/0/2 para 2/1/1 e criou ponto real em setembro.
- Reload preservou 2/1/1.
- Edição da compra para 3 reconciliou o painel para 3/1/2 sem duplicar o rótulo.
- Interrupção real da API exibiu mensagem de indisponibilidade sem encerrar a sessão; `Tentar novamente` recuperou o painel depois do reinício.
- Reflow validado em 390 px e em 823 px, equivalente à redução de largura útil no zoom de 200%, sem estouro horizontal da página.
- Serviço reiniciado sem remover volume; dados permaneceram.

## 9. Revisão de Nielsen das telas afetadas

- H1: carregamento, vazio, erro, salvamento, consumo e retentativa possuem feedback distinto.
- H2: indicadores usam `garrafas` e `rótulos`, sem o termo ambíguo `vinhos` para contagens diferentes.
- H3: compra permanece editável; histórico não pode ser apagado; consumo pode ser cancelado por botão ou Escape.
- H4: Pedidos é a única entrada de aquisição e Estoque é a visão consolidada.
- H5: quantidade, data, propriedade, saldo, clique durante envio e redução abaixo do consumido são prevenidos.
- H6: origem, local, rótulo, saldo e histórico ficam visíveis sem exigir memorização.
- H7: seleção anual aparece quando aplicável e o atalho leva diretamente ao registro de compra.
- H8: cards, gráfico e lista têm hierarquia simples; reflow estreito mantém leitura e não causa rolagem horizontal externa.
- H9: campos são mantidos após erro; falha da API oferece retentativa; erros de formulário focam o primeiro campo visual.
- H10: textos explicam que compras entram pelo pedido, que foto de catálogo pode ser reutilizada e que o gráfico representa consumo real.

## 10. Commits e decisão final

- `1fd47d0` — `feat(customer): consolida pedidos e estoque`: API, transações, métricas, migrations e testes do backend.
- `215bd27` — `feat(client): cria painel consolidado da adega`: dashboard, gráfico, consumo com data e remoção da entrada direta.
- `3c75eb3` — `fix(client): valida resposta do painel da adega`: corrige contrato confirmado no navegador.
- `cecac78` — `test(client): valida fluxos do dashboard e foco`: matriz obrigatória, foco, teclado e mensagens.
- O commit de versão/documentação registra este relatório e a versão 2.1.0.

Decisões/limites:

- Pedidos não são excluídos nem cancelados nesta versão; são preservados e corrigidos por edição.
- Registros diretos antigos continuam como legado; não foram fabricados pedidos retroativos.
- O gráfico usa UTC para manter agregação estável entre servidor e cliente.
- A auditoria geral de integração/regressão não foi iniciada. Apenas testes dirigidos às áreas impactadas foram executados.
