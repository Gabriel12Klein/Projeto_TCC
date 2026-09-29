# Pedidos e Dashboard da adega — versão 2.2.0

Data da implementação e validação: 26/09/2026.

## Regra funcional

`Meus pedidos` continua sendo a entrada de aquisições. A antiga tela `Meu estoque` passou a se chamar `Dashboard` e apresenta a visão da adega e o histórico pessoal. A URL principal é `/dashboard`; `/estoque` apenas redireciona para preservar links antigos.

Cada unidade comprada é representada por uma garrafa física com ciclo próprio:

`DISPONIVEL → ABERTA → CONSUMIDA`

ou, quando a unidade sai da adega sem consumo:

`DISPONIVEL ou ABERTA → DESCARTADA`

Garrafas consumidas e descartadas não são apagadas. Elas permanecem no
histórico com seus eventos e dados do vinho. Garrafas disponíveis e abertas
compõem o estoque ativo; estados consumido e descartado são finais.

## Banco e preservação

A migration incremental `20260926210000_individual_cellar_bottles` criou `garrafa_adega` e converteu os saldos existentes sem reset, `TRUNCATE`, recriação de banco ou exclusão de volume. Pedidos, itens, movimentos, fotos, vinhos externos e contas existentes foram preservados.

O backfill gerou 36 garrafas a partir dos dados anteriores: 19 disponíveis e 17 consumidas. O saldo agregado permaneceu igual ao número de garrafas disponíveis. Para consumos antigos sem data de abertura, a data histórica de término também identifica a abertura, deixando explícita a limitação do dado legado.

As migrations complementares:

- `20260926211000_bottle_opening_movement`: inclui o movimento auditável `ABERTURA`.
- `20260926212000_cellar_bottle_integrity`: garante no PostgreSQL que garrafa, estoque, pedido, movimento e cliente sejam compatíveis.
- `20260929120000_add_discarded_cellar_bottles`: adiciona data e motivo do descarte, estado `DESCARTADA` e movimento `DESCARTE`.

Rótulos externos continuam privados: não criam vinho ou vinícola pública e não aparecem no catálogo.

## Backend

- A criação de pedido gera uma linha por unidade em `garrafa_adega`, na mesma transação.
- A edição de quantidade só remove garrafas ainda disponíveis; unidades abertas, consumidas ou descartadas bloqueiam uma redução incompatível.
- `POST /api/cliente/estoque/garrafas/:id/abrir` registra a abertura e mantém a unidade no estoque ativo.
- `POST /api/cliente/estoque/garrafas/:id/consumir` finaliza exclusivamente uma garrafa aberta.
- `POST /api/cliente/estoque/garrafas/:id/descartar` registra data e motivo em uma unidade disponível ou aberta, sem reduzir a quantidade histórica da compra.
- As ações usam trava transacional por cliente e validam propriedade, estado, datas e saldo no backend.
- O gráfico mensal usa `finishedAt`, a data em que a garrafa foi terminada.

## Frontend

O Dashboard mostra os quatro indicadores solicitados: adquiridas, disponíveis, abertas e consumidas. O histórico lista cada unidade separadamente, permite filtro por status, expansão dos detalhes e ações de abrir/finalizar com data e confirmação explícita. Estados de carregamento, vazio, erro e sucesso são distintos.

## Validação dirigida

- 28 arquivos de teste e 94 testes passaram.
- Compra de uma e várias unidades gera garrafas individuais.
- Abertura e término registram estado e datas; a unidade consumida permanece consultável.
- Totais e gráfico são recalculados pelas garrafas, sem contadores duplicados.
- Rótulo externo, isolamento entre clientes, logout/login, rollback e saldo legado foram cobertos.
- Typecheck e build de produção passaram.
- No navegador autenticado, o menu, os quatro cards, o gráfico, o filtro de consumidas e os detalhes da garrafa foram validados sem alterar dados reais.
- A largura ampliada não apresentou overflow horizontal externo.

A regressão geral permanece separada e não foi iniciada por esta alteração.

## Ajustes finais — versão 2.2.1

- `Meus pedidos` foi renomeado para `Meus vinhos`; `/pedidos` continua como redirecionamento compatível para `/vinhos`.
- Em uma nova carga, `Todos` ordena por disponível, aberta e consumida. Dentro dos grupos, rótulos e números de unidade usam ordem crescente e estável.
- Depois de confirmar uma mudança em `Todos`, o cache atualiza somente a garrafa correspondente, preservando sua posição visual. Trocar o filtro ou recarregar consulta e reaplica a ordenação padrão.
- Botões da área do cliente receberam transições sutis de hover, clique, foco e estado desabilitado, respeitando `prefers-reduced-motion`.
- Botão, subtítulo e cards do Dashboard foram atualizados para a nova nomenclatura.
- O cadastro passou a normalizar a data local da compra para meio-dia UTC, evitando divergência entre a data exibida e o mínimo permitido para abertura durante a mudança do dia em UTC.
- Não houve migration: schema, endpoints e modelagem já suportavam os ajustes.

### Limpeza e validação

Foram removidos somente dados pessoais de adega: 6 pedidos, 6 itens de pedido, 8 itens de adega, 36 garrafas e 46 movimentos. Usuários e dados administrativos foram preservados. Ao final permanecem 6 vinhos oficiais, 1 vinícola, 4 safras e 4 lotes.

Não foram encontrados arrays, mocks ou fallbacks de garrafas fora do PostgreSQL. O teste visual criou um vinho controlado com três garrafas, abriu e consumiu a unidade 2, confirmou posição, filtros, totais, gráfico e persistência após recarga. Esses registros controlados foram removidos depois do teste; o Dashboard final está zerado.

### Correção de espaçamento — versão 2.2.2

- O estado vazio de `Meus vinhos` passou a usar o mesmo recuo horizontal do cabeçalho do card: 24 px em telas pequenas e 32 px a partir de telas médias.

### Organização entre Dashboard e Meus vinhos — versão 2.2.3

- O Dashboard mantém somente o resumo da adega, os quatro indicadores e o gráfico de consumo mensal.
- A seção `Minhas garrafas` foi extraída sem recriação e passou a aparecer em `Meus vinhos`, preservando imagem, filtros, datas, detalhes e ações individuais.
- A atualização em `Todos` continua preservando a posição visual da garrafa até uma troca de filtro ou nova carga.
- Cadastrar ou editar um vinho agora também invalida a consulta da lista individual, mantendo cadastro e histórico sincronizados na mesma tela.
- Não houve alteração de banco de dados, migration, endpoint ou regra de backend.

## Catálogos privados — versão 2.3.0

Vinícolas externas, vinhos externos e locais de compra agora possuem cadastros
privados por cliente e integram o registro de aquisições em `Meus vinhos`. O
Dashboard não foi alterado nesta etapa. Modelagem, endpoints, preservação do
legado e evidências de validação estão documentados em
[`customer-private-catalogs.md`](customer-private-catalogs.md).

## Histórico e exclusão real — versão 2.6.0

- O histórico de `Meus vinhos` apresenta `Vinícola` e `Local de compra` em
  colunas independentes. Vinhos oficiais identificam a Vinícola VINUM; vinhos
  externos usam sua vinícola privada e a compra usa o local persistido.
- A exclusão pode remover uma garrafa específica ou todas as unidades daquela
  compra. Outras compras do mesmo vinho e os cadastros de catálogo permanecem
  intactos.
- Os endpoints `DELETE /api/cliente/pedidos/:id/itens/:itemId/garrafas/uma`,
  `DELETE /api/cliente/pedidos/:id/itens/:itemId/garrafas` e
  `DELETE /api/cliente/estoque/garrafas/:id` validam o proprietário e executam a
  limpeza relacionada em transação.
- A operação remove movimentos próprios das garrafas selecionadas e atualiza
  `garrafa_adega`, `movimentacao_estoque`, `item_pedido`, `pedido` e
  `estoque_item` conforme o saldo remanescente. Não houve alteração de schema ou
  nova migration nesta versão.
- As confirmações de exclusão usam modal do VINUM, com cancelamento por botão,
  fundo ou tecla Escape. O histórico continua responsivo com rolagem horizontal
  interna em larguras estreitas.
- O teste de integração cobre redução de 5 para 4 unidades, exclusão total,
  duas compras do mesmo vinho, garrafas abertas e consumidas, movimentos
  dependentes, isolamento entre clientes e recálculo do Dashboard.

## Datas e ficha individual — versão 2.8.0

- Compra, abertura e consumo são comparados por dia civil, sem converter o
  valor escolhido em um horário local. Abertura e finalização aceitam o mesmo
  dia da compra; a finalização aceita o mesmo dia da abertura; datas futuras e
  anteriores ao evento mínimo continuam bloqueadas no backend.
- Os detalhes de cada unidade apresentam Vinícola, Local da compra, Safra,
  Uvas e Descrição tanto para rótulos oficiais quanto externos, sem misturar os
  dois catálogos e sem exibir volume ausente como `— ml`.
- A ficha do vinho oficial continua apontando para o catálogo VINUM. A ficha do
  vinho externo abre em diálogo responsivo e acessível, com foto, vinícola,
  safra, uvas, descrição, características, aromas e notas de degustação.
- A consulta individual do vinho externo exige autenticação e filtra o registro
  pelo cliente proprietário; acesso por ID de outra conta retorna 404.
- O botão `Excluir garrafa` foi reduzido e recebeu tratamento destrutivo próprio
  para não ser confundido com as ações de abertura e finalização.
- Não houve alteração no banco de dados, migration ou nas regras de ordenação e
  atualização visual da lista.

### Correção da ficha externa — versão 2.8.1

- O validador de respostas agora distingue a coleção
  `GET /cliente/vinhos-externos` da ficha individual
  `GET /cliente/vinhos-externos/:id`.
- A safra do resumo e da ficha detalhada usa a mesma fonte para rótulos
  externos: `ExternalWine.vintageYear`, persistido na coluna `vintageYear` de
  `vinhos_externo`.
- Safra, descrição, características, aromas, notas de degustação e imagem podem
  ser nulos sem invalidar a ficha. Relações estruturais de vinícola e uvas
  continuam validadas.

## Vínculo da safra oficial — versão 2.9.0

- Ao selecionar um vinho do catálogo VINUM, `Meus vinhos` carrega suas safras.
  Uma única opção é selecionada automaticamente; múltiplas opções exigem uma
  escolha explícita.
- O backend confere se `vintageYear` pertence ao vinho oficial antes de gravar
  o snapshot no item da compra. Anos de outro vinho são rejeitados.
- A migration incremental
  `20260927170000_link_unambiguous_official_vintages` preenche compras antigas
  apenas quando o vinho possui um único ano de safra distinto. Nenhuma compra
  ambígua é alterada.
- Para compatibilidade durante a leitura, garrafas oficiais antigas sem snapshot
  também exibem a safra quando há exatamente um ano oficial possível.

## Compras, estoque ativo e descarte — versão 2.10.0

- O primeiro bloco de `Meus vinhos` passou de `Histórico da adega` para
  `Compras`. O segundo passou de `Histórico individual / Minhas garrafas` para
  `Adega - Controle de Estoque`.
- Estoque ativo é a soma de disponíveis e abertas. Consumidas e descartadas
  permanecem no histórico; excluídas deixam de existir.
- Disponível oferece Abrir, Descartar e Excluir. Aberta oferece Finalizar e
  Descartar. Consumida e descartada não oferecem ação operacional.
- O descarte usa diálogo VINUM com data e motivo, respeita compra/abertura/hoje,
  mantém a relação com a compra e não é contabilizado no gráfico de consumo.
- A exclusão real aceita somente unidades disponíveis e usa `orderItemId`,
  reduzindo apenas a compra de origem. Compras com unidades em histórico não
  podem ser removidas integralmente.
- Em `Todos`, a carga ordena disponíveis, abertas, consumidas e descartadas. A
  atualização imediata preserva a posição atual; troca de filtro e reload
  reaplicam a ordenação.
- O teste dirigido cobriu compras de 10 e 5 unidades do mesmo vinho, exclusão
  somente na compra A, abertura, consumo, descarte disponível e aberto, filtros,
  datas, estados finais, Dashboard, isolamento entre clientes e persistência no
  PostgreSQL. A validação visual confirmou ações contextuais, Escape/foco do
  diálogo, estado vazio de descartadas e layout móvel em 390 × 844.
- A auditoria geral de integração/regressão continua separada e não foi iniciada.

## Filtros da adega — versão 2.11.0

- A listagem individual combina Status, Tipo de vinho, Data inicial e Data
  final. Datas são inclusivas e qualquer uma das extremidades pode ser usada
  isoladamente.
- Intervalos com data inicial posterior à final são bloqueados antes da
  consulta e também rejeitados pela API. `Limpar filtros` restaura a listagem
  completa e combinações vazias exibem orientação própria.
- O seletor de tipo apresenta os tipos oficiais realmente cadastrados na tabela
  de tipos de vinho. Rótulos externos aparecem em `Todos` e não recebem tipo
  inventado, pois esse atributo não existe no cadastro privado atual.
- O sufixo visual `garrafa #N` foi removido do título. A identificação e a
  numeração de cada unidade continuam preservadas no backend, nas ações e nos
  diálogos que precisam distinguir a garrafa.
- A ordenação, a atualização na posição atual sob o filtro `Todos`, os detalhes
  e todas as ações do ciclo da garrafa foram preservados. Não houve alteração
  de schema ou migration.

## Paginação de compras e garrafas — versão 2.12.0

- `GET /api/cliente/pedidos` e `GET /api/cliente/estoque/garrafas` recebem
  `page` e `limit` e retornam `{ items, total, page, limit, totalPages }`.
- O limite padrão é 10 e as opções aceitas são 10, 20, 50 e 100. A interface
  apresenta intervalo, total, página atual, páginas numeradas e ações Anterior
  e Próxima.
- A consulta de compras ordena antes de aplicar `skip` e `take`. A consulta de
  garrafas aplica os filtros no PostgreSQL, preserva a ordem por status, rótulo,
  data e identificador e só então seleciona a página.
- Trocar filtro ou quantidade por página retorna à página 1. Após exclusão, uma
  página final que deixou de existir recua automaticamente para a última página
  válida.
- No filtro `Todos`, mudanças de estado continuam atualizando a unidade no lugar
  sem reposicioná-la imediatamente. A ordenação normal volta na troca de filtro
  ou em uma nova carga.
- O estado vazio não exibe controles de paginação. Os controles usam rótulos
  acessíveis, indicam a página atual e reorganizam-se em telas estreitas.
- Testes automatizados cobrem limites, filtros, ordenação, isolamento entre
  clientes e ajuste de página. A validação interativa confirmou 21 compras e 25
  garrafas temporárias nas páginas 10/20 e em 390 × 844; esses dados de teste
  foram removidos ao final.
- Não houve alteração no schema do banco nem nova migration.
