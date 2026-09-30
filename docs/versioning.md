# Versionamento do VINUM

A versão oficial do projeto é mantida em `package.json` e `package-lock.json`,
seguindo versionamento semântico (`MAJOR.MINOR.PATCH`). Cada versão publicada
também recebe uma tag Git no formato `vMAJOR.MINOR.PATCH`.

Versão atual: **2.14.4**

- `PATCH` (`2.1.1`): correções e ajustes sem mudança incompatível.
- `MINOR` (`2.2.0`): nova funcionalidade compatível com a versão anterior.
- `MAJOR` (`3.0.0`): mudança incompatível ou quebra de contrato.

Fluxo para os próximos envios:

1. Atualizar a versão com `npm version <nova-versão> --no-git-tag-version`.
2. Validar o projeto e registrar as alterações em commit.
3. Criar a tag correspondente: `git tag -a v<nova-versão> -m "VINUM <nova-versão>"`.
4. Enviar o commit e a tag: `git push origin main` e `git push origin v<nova-versão>`.

As tags históricas `vnum-v1.*` e `vnum-v2.0` são preservadas. A partir de
`v2.0.0`, as tags semânticas `vMAJOR.MINOR.PATCH` são a referência oficial.

## Versão 2.3.0

Inclui os cadastros privados de vinícolas externas, vinhos externos e locais de
compra, além da integração dessas referências ao registro de aquisições. A
versão é `MINOR` porque adiciona funcionalidade compatível, preservando o
catálogo oficial e os dados legados.

## Versão 2.4.0

Amplia os catálogos privados com endereços independentes, safra de rótulo,
descrições e composição por uvas oficiais. Também adiciona o autocomplete de
vinícola no local de compra, sem criar vínculo permanente entre os registros.

## Versão 2.4.1

Adiciona exemplos aos campos dos cadastros privados e apresenta a seleção
múltipla de uvas em um menu recolhível, mantendo os textos orientativos do
cadastro administrativo de vinhos.

## Versão 2.4.2

Esclarece no cadastro de local de compra que Estado/Região aceita tanto a sigla
quanto o nome completo, usando o exemplo `RS ou Rio Grande do Sul`.

## Versão 2.5.0

Adiciona o campo Rua às vinícolas externas e aos locais de compra, incluindo
persistência no PostgreSQL e cópia independente pelo autocomplete.

## Versão 2.6.0

Separa Vinícola e Local de compra no histórico da adega e adiciona exclusão
permanente de uma unidade ou de todas as garrafas de uma compra. A remoção é
transacional, limitada ao proprietário e recalcula pedidos, estoque e Dashboard
sem excluir outras compras ou cadastros de catálogo.

## Versão 2.6.1

Substitui globalmente as confirmações nativas do navegador por um modal VINUM
reutilizável, responsivo e acessível. A alteração preserva as regras existentes
de rascunho, cancelamento, exclusão e troca de telas, sem mudanças no backend ou
no banco de dados.

## Versão 2.6.2

Simplifica a seleção de uvas no cadastro de vinho externo: um seletor adiciona
uma uva por vez e as escolhas aparecem como etiquetas removíveis, permitindo
composição múltipla sem duplicações.

## Versão 2.7.0

Move o upload da foto para o cadastro do vinho externo. A imagem passa a
pertencer ao rótulo privado, é reutilizada automaticamente ao registrar compras
e continua protegida pelo cliente proprietário. Inclui migration incremental
para `vinhos_externo.imagePath`, sem alterar ou apagar registros existentes.

## Versão 2.8.0

Corrige o ciclo das garrafas para tratar compra, abertura e consumo como datas
civis de São Paulo, aceitando o dia atual e datas iguais sem deslocamento de
fuso. Padroniza os detalhes de rótulos oficiais e externos em `Meus vinhos`,
adiciona uma ficha acessível para o vinho externo com consulta privada por
proprietário e diferencia visualmente a ação de excluir garrafa. Não houve
alteração de schema nem migration.

## Versão 2.8.1

Corrige o contrato da consulta individual de vinho externo, que era validada
incorretamente como uma lista, e passa a obter a safra resumida diretamente de
`vinhos_externo.vintageYear`. Campos opcionais nulos permanecem válidos e o
isolamento por cliente continua aplicado. Não houve alteração de banco ou
migration.

## Versão 2.9.0

Vincula a safra oficial ao registro de compra. O formulário carrega as safras
do vinho VINUM, seleciona automaticamente a única opção e exige escolha quando
há mais de uma. O backend valida que o ano pertence ao vinho e persiste o
snapshot em `item_pedido.vintageYear`. Uma migration incremental preenche
compras antigas somente quando existe um único ano possível, preservando casos
ambíguos.

## Versão 2.9.1

Corrige a concordância das mensagens nos cadastros privados de vinícola e local
de compra, limpa o estado do formulário ao alternar entre essas telas e fecha o
modal de exclusão quando uma dependência impede a operação, deixando a mensagem
de recuperação visível e acessível. Também torna o teste concorrente de consumo
independente da virada do dia em UTC, preservando a regra de datas civis de São
Paulo. Não houve alteração de banco ou migration.

## Versão 2.9.2

Adiciona scripts documentados para backup e restauração do PostgreSQL, uploads
privados e configuração local antes da troca ou formatação do computador. Os
artefatos gerados permanecem ignorados pelo Git para impedir o envio de senhas
e dados privados ao repositório público. O `docker-compose.yml` versionado
continua responsável por recriar os containers PostgreSQL e pgAdmin.

## Versão 2.10.0

Separa descarte de consumo no ciclo individual das garrafas. O novo estado
`DESCARTADA` registra data e motivo, preserva a compra original e não aumenta o
consumo. Garrafas abertas permanecem no estoque ativo; consumidas e descartadas
ficam somente no histórico; exclusão real é permitida apenas para unidades
disponíveis e reduz exclusivamente o item de compra de origem.

A migration incremental `20260929120000_add_discarded_cellar_bottles` adiciona
`discardedAt`, `discardReason`, o estado `DESCARTADA` e o movimento `DESCARTE`,
sem recriar tabelas ou alterar migrations antigas. A interface renomeia os
blocos para `Compras` e `Adega - Controle de Estoque`, adiciona o filtro de
descartadas e apresenta ações contextuais conforme o estado.

## Versão 2.11.0

Amplia a listagem `Adega - Controle de Estoque` com filtros combináveis de
status, tipo oficial de vinho e intervalo inclusivo da data da compra. O
intervalo pode ser parcial e é validado no frontend e no backend; a interface
também oferece limpeza dos filtros e retorno vazio orientativo. O número
individual da garrafa continua preservado internamente, mas deixa de poluir o
título visual do rótulo. Vinhos externos permanecem sem tipo porque esse dado
não existe em seu modelo atual. Não houve alteração de banco ou migration.

## Versão 2.12.0

Adiciona paginação no backend e na interface das listas `Compras` e
`Adega - Controle de Estoque`. As duas iniciam com 10 registros e permitem
selecionar 10, 20, 50 ou 100 itens por página, com intervalo, total, navegação
e página atual acessíveis. Filtros e ordenação são aplicados antes do recorte,
e alterações de filtro ou limite retornam à primeira página. Não houve
alteração de schema ou migration.

## Versão 2.13.0

Reativa a geração de QR Code dos lotes administrativos com persistência no
PostgreSQL. O banco conserva o endereço público codificado e a data de geração;
a imagem PNG é reconstruída de forma determinística pela API pública, sem
depender de arquivo local ou Base64. A geração é idempotente, restrita à área
administrativa e mantém compatibilidade com caminhos históricos. O QR direciona
somente para a consulta pública do lote e não altera a funcionalidade de
blockchain, que continua reservada para trabalho futuro.

## Versão 2.14.0

Adiciona à seleção pública da página inicial filtros combináveis por tipo de
vinho, classificação e nome. Tipos e classificações ativos são carregados do
PostgreSQL por endpoint público próprio. A busca por nome começa na terceira
letra, usa debounce de 300 ms e compara trechos sem diferenciar maiúsculas ou
acentos. O catálogo continua limitado aos vinhos oficiais publicados, sem
alteração de schema ou migration.

## Versão 2.14.1

Executa uma limpeza técnica conservadora do repositório: remove componentes
órfãos já substituídos, estilos associados, assets sem referências e cópias
binárias idênticas. Também elimina declarações comprovadamente não utilizadas e
amplia o `.gitignore` para artefatos regeneráveis e temporários. Migrations,
backups, uploads, documentação histórica, endpoints e dependências foram
preservados. Não houve alteração funcional, de schema ou de dados.

## Versão 2.14.2

Adiciona uma confirmação contextual antes da geração do QR Code de um lote. O
aviso explica que a consulta será pública e que o código do lote ficará
bloqueado depois da geração. O mesmo fluxo agora apresenta feedback local de
processamento, sucesso e erro junto ao QR Code, além da mensagem global já
existente. Não houve alteração de schema ou migration.

## Versão 2.14.3

Corrige o feedback do botão de geração de QR Code em lotes ainda não salvos. O
botão permanece acionável para apresentar a orientação de que o lote deve ser
salvo primeiro, mas a geração e a requisição ao backend continuam bloqueadas
enquanto não existir um `id`. Inclui teste automatizado para os estados com e
sem persistência. Não houve alteração de schema ou migration.

## Versão 2.14.4

Remove a duplicidade de mensagens no fluxo de geração do QR Code. Avisos de
pré-condição, processamento, sucesso e erro passam a aparecer somente no bloco
contextual próximo ao botão e à prévia do código, sem repetir o mesmo texto no
rodapé global do painel. Não houve alteração de schema ou migration.
