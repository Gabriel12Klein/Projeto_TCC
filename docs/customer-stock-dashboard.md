# Pedidos e Dashboard da adega — versão 2.2.0

Data da implementação e validação: 26/09/2026.

## Regra funcional

`Meus pedidos` continua sendo a entrada de aquisições. A antiga tela `Meu estoque` passou a se chamar `Dashboard` e apresenta a visão da adega e o histórico pessoal. A URL principal é `/dashboard`; `/estoque` apenas redireciona para preservar links antigos.

Cada unidade comprada é representada por uma garrafa física com ciclo próprio:

`DISPONIVEL → ABERTA → CONSUMIDA`

Uma garrafa consumida não é apagada. Ela permanece no histórico com compra, abertura, término do consumo, origem, safra e volume disponíveis. Uma garrafa consumida não pode ser aberta ou consumida novamente.

## Banco e preservação

A migration incremental `20260926210000_individual_cellar_bottles` criou `garrafa_adega` e converteu os saldos existentes sem reset, `TRUNCATE`, recriação de banco ou exclusão de volume. Pedidos, itens, movimentos, fotos, vinhos externos e contas existentes foram preservados.

O backfill gerou 36 garrafas a partir dos dados anteriores: 19 disponíveis e 17 consumidas. O saldo agregado permaneceu igual ao número de garrafas disponíveis. Para consumos antigos sem data de abertura, a data histórica de término também identifica a abertura, deixando explícita a limitação do dado legado.

As migrations complementares:

- `20260926211000_bottle_opening_movement`: inclui o movimento auditável `ABERTURA`.
- `20260926212000_cellar_bottle_integrity`: garante no PostgreSQL que garrafa, estoque, pedido, movimento e cliente sejam compatíveis.

Rótulos externos continuam privados: não criam vinho ou vinícola pública e não aparecem no catálogo.

## Backend

- A criação de pedido gera uma linha por unidade em `garrafa_adega`, na mesma transação.
- A edição de quantidade só remove garrafas ainda disponíveis; unidades abertas ou consumidas bloqueiam uma redução incompatível.
- `POST /api/cliente/estoque/garrafas/:id/abrir` registra a abertura e retira a unidade do saldo disponível.
- `POST /api/cliente/estoque/garrafas/:id/consumir` finaliza uma garrafa aberta ou realiza abertura e término na mesma data quando o consumo é direto.
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
