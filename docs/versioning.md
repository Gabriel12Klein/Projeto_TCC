# Versionamento do VINUM

A versão oficial do projeto é mantida em `package.json` e `package-lock.json`,
seguindo versionamento semântico (`MAJOR.MINOR.PATCH`). Cada versão publicada
também recebe uma tag Git no formato `vMAJOR.MINOR.PATCH`.

Versão atual: **2.7.0**

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
