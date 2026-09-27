# Catálogos privados do cliente — versão 2.3.0

Data da implementação e validação: 27/09/2026.

## Escopo

A área do cliente passou a manter três cadastros privados: vinícolas externas,
vinhos externos e locais de compra. Esses registros pertencem exclusivamente à
conta que os criou. A vinícola oficial VINUM e seus vinhos continuam no catálogo
administrativo existente e não são duplicados nessas tabelas.

## Banco de dados

A migration incremental `20260927020000_customer_private_catalogs` criou, sem
recriar o banco nem apagar volumes:

- `outras_vinicolas`: `id`, `userId`, `name`, `createdAt` e `updatedAt`;
- `vinhos_externo`: `id`, `userId`, `externalWineryId`, `name`, `createdAt` e
  `updatedAt`;
- `locais_de_compra`: `id`, `userId`, `name`, `createdAt` e `updatedAt`.

As três tabelas possuem chave estrangeira para `usuario`. A relação entre vinho
externo e vinícola externa usa a chave composta `(externalWineryId, userId)`,
impedindo associações entre contas. Nomes são únicos por cliente; no caso de
vinhos, a unicidade também considera a vinícola.

Foram adicionadas referências opcionais e indexadas em `pedido`, `item_pedido` e
`estoque_item`. Restrições garantem que um item não aponte simultaneamente para
um vinho oficial e um vinho externo. Exclusões de referências em uso são
bloqueadas para preservar o histórico.

Registros anteriores foram preservados. O texto legado do local de compra e os
rótulos externos antigos permanecem consultáveis com as novas FKs nulas; a
migration não inventa vinícolas, vinhos ou locais para dados antigos.

## API e isolamento

Todos os endpoints abaixo exigem autenticação com papel `CUSTOMER` e filtram por
`userId` obtido da sessão:

- `GET|POST /api/cliente/vinicolas-externas`;
- `PUT|DELETE /api/cliente/vinicolas-externas/:id`;
- `GET|POST /api/cliente/vinhos-externos`;
- `PUT|DELETE /api/cliente/vinhos-externos/:id`;
- `GET|POST /api/cliente/locais-compra`;
- `PUT|DELETE /api/cliente/locais-compra/:id`.

`GET /api/cliente/vinhos-externos?wineryId=<id>` retorna somente os vinhos da
vinícola selecionada que também pertencem à conta autenticada. A criação e a
edição de pedidos validam novamente no backend a propriedade da vinícola, do
vinho e do local de compra.

## Interface e fluxo de aquisição

O menu do cliente inclui `Cadastrar vinícola`, `Cadastrar vinho` e `Cadastrar
local de compra`, com telas de inclusão, edição, exclusão, carregamento, vazio,
erro e sucesso.

Em `Meus vinhos`, o registro de uma aquisição usa:

1. seleção da vinícola oficial VINUM ou de uma vinícola privada;
2. seleção dependente de vinho, restrita à vinícola escolhida;
3. seleção de um local de compra privado;
4. criação do pedido e das garrafas com as referências escolhidas.

Trocar a vinícola limpa o vinho selecionado. Estados vazios direcionam para os
cadastros correspondentes. O fluxo legado continua disponível somente ao editar
um pedido antigo ainda sem referência estruturada.

## Validação

- A migration foi aplicada incrementalmente e o Prisma confirmou o banco
  atualizado.
- O teste de integração cria dois clientes e comprova que listagem, associação,
  edição e exclusão não atravessam contas.
- O mesmo teste valida uma aquisição externa, uma aquisição oficial, o vínculo
  com o local e a exibição das garrafas.
- Os testes do frontend cobrem CRUD, estados de tela, seleção dependente,
  limpeza ao trocar vinícola, catálogo oficial e recuperação de rascunho.
- Antes da migration havia 6 vinhos oficiais, 1 pedido, 1 item de estoque e 10
  garrafas; esses dados foram preservados. Um local textual legado permaneceu
  sem associação fictícia.

A validação visual autenticada final não foi repetida porque a sessão do
navegador expirou e as abas foram redirecionadas ao login. Nenhum resultado
visual autenticado foi presumido; a etapa foi coberta pelos testes automatizados
e essa limitação fica registrada aqui.

## Ampliação — versão 2.4.0

A migration incremental `20260927043000_expand_customer_private_catalogs`
adicionou bairro, cidade, estado/região e país às vinícolas externas e aos locais
de compra. Em `vinhos_externo`, adicionou ano da safra do rótulo, descrição,
características, aromas e notas de degustação.

A nova tabela associativa `vinho_externo_uva` liga vinhos externos à tabela
oficial `uva` em uma relação N:N. O backend valida que todas as uvas selecionadas
estão ativas e sincroniza os vínculos durante a edição do mesmo vinho.

Na navegação, os cadastros agora aparecem na ordem vinícola, vinho e local de
compra. Os três formulários permitem cadastrar, editar e cancelar. A tela de
local oferece sugestões apenas das vinícolas do cliente autenticado; a busca é
parcial, ignora caixa, acentos e espaços repetidos. Clique, Enter ou Tab aceitam
somente a opção destacada e copiam os campos para o formulário, sem salvar.

Os dados copiados continuam independentes: alterações posteriores na vinícola
não modificam um local já salvo. Testes com duas contas validaram as rotas, a
manipulação direta de IDs, o catálogo compartilhado de uvas e o isolamento de
vinícolas, vinhos e locais.

## Rua — versão 2.5.0

A migration incremental `20260927053000_add_private_street` adicionou a coluna
opcional `street` a `outras_vinicolas` e `locais_de_compra`. O campo Rua aparece
nos dois formulários, é carregado na edição e é copiado pelo autocomplete junto
com os demais dados. Como os registros continuam independentes, alterar a rua da
vinícola depois da cópia não modifica um local já salvo.

## Foto do vinho externo — versão 2.7.0

A migration incremental `20260927060000_external_wine_image` adicionou a coluna
opcional `imagePath` a `vinhos_externo`. O campo nullable preserva integralmente
os vinhos externos anteriores.

O upload da foto foi removido do registro de compra e passou para `Cadastrar
vinho`. Novos vinhos externos exigem uma imagem JPG, PNG ou WebP de até 5 MB; na
edição, a foto atual é mantida quando nenhuma substituta é escolhida. A imagem é
privada, exige autenticação e só pode ser acessada pelo cliente proprietário.

Ao registrar ou editar uma compra, o backend reutiliza automaticamente a foto
do vinho oficial ou externo. A substituição da foto de um vinho externo também
sincroniza os itens de pedido e de estoque vinculados. Fotos legadas já gravadas
nas compras permanecem preservadas.

O teste de integração cobre upload, persistência, isolamento entre dois
clientes e reutilização da imagem em uma compra sem novo upload. A migration 22
foi aplicada sem recriação de banco ou exclusão de volumes.
