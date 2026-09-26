# Versionamento do VINUM

A versão oficial do projeto é mantida em `package.json` e `package-lock.json`,
seguindo versionamento semântico (`MAJOR.MINOR.PATCH`). Cada versão publicada
também recebe uma tag Git no formato `vMAJOR.MINOR.PATCH`.

Versão atual: **2.0.0**

- `PATCH` (`2.0.1`): correções e ajustes sem mudança incompatível.
- `MINOR` (`2.1.0`): nova funcionalidade compatível com a versão anterior.
- `MAJOR` (`3.0.0`): mudança incompatível ou quebra de contrato.

Fluxo para os próximos envios:

1. Atualizar a versão com `npm version <nova-versão> --no-git-tag-version`.
2. Validar o projeto e registrar as alterações em commit.
3. Criar a tag correspondente: `git tag -a v<nova-versão> -m "VINUM <nova-versão>"`.
4. Enviar o commit e a tag: `git push origin main` e `git push origin v<nova-versão>`.

As tags históricas `vnum-v1.*` e `vnum-v2.0` são preservadas. A partir de
`v2.0.0`, as tags semânticas `vMAJOR.MINOR.PATCH` são a referência oficial.
