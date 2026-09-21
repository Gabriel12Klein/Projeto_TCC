# Integridade do banco — revisão de 20/09/2026

> Registro histórico da revisão anterior à especificação. A implementação posterior,
> incluindo classificação, vinícola única e instalação vazia, está documentada em
> [specification-review.md](specification-review.md). As limitações finais deste
> registro histórico foram reavaliadas nesse relatório.

O banco ativo é PostgreSQL, banco `vinum`, porta local 5433.
O Docker mantém os dados no volume `vinum-tcc-prototipo-local_vinum_postgres_data`.
As imagens ficam em `backend/uploads`; o banco guarda os caminhos.
Um backup completo da instalação deve incluir **banco e uploads**.

## Relações

- Usuário → perfil obrigatório; sessões, pedidos e estoque pertencem ao usuário.
- Vinho → vinícola e tipo obrigatórios; composição em `vinho_uva`.
- Safra → vinho obrigatório; uvas em `safra_uva`.
- Lote → safra **e o mesmo vinho da safra**, garantido por chave estrangeira composta.
- Pedido → itens → estoque; os vínculos verificam cliente e vinho.
- Movimentação → estoque e, quando originada de compra, pedido.
- Rótulos particulares podem existir sem vinho do catálogo e sem pedido. Esses campos nulos são intencionais.
- Autor do vinho e imagem continuam opcionais. Apagar o autor não apaga o catálogo.

Vinícola, tipo, uva, safra e vinho em uso não são apagados silenciosamente.
O histórico de compra contém nome/foto do rótulo no momento do registro.
A localização de compra também fica nas movimentações, sobrevivendo à exclusão do pedido.
Excluir pedido remove o histórico, **não** as garrafas nem as movimentações, conforme a confirmação da interface.

## Estoque e edição

Entradas, consumos e alterações de pedidos são transacionais, serializados por cliente.
Existe unicidade de cliente/vinho para estoque do catálogo e proteção contra saldo negativo.
`ENTRADA` soma; `CONSUMO` subtrai; `AJUSTE` define o saldo absoluto, inclusive zero.
A edição mantém IDs e data do pedido; aplica somente a diferença de quantidade.
Trocar o rótulo estorna a quantidade antiga e credita a nova no mesmo commit.
Reduções que exigiriam retirar garrafas já consumidas são recusadas.
O lote usa as uvas da safra selecionada, não uma composição inferida pelo nome do vinho.
Nomes e anos não únicos são recusados como identificadores; a interface envia IDs.

## Migrações e verificação

`npm run prisma:deploy` agora usa `prisma migrate deploy`, não `db push`.
As regras SQL adicionais (CHECK e triggers) estão nas migrações e não aparecem integralmente no modelo Prisma.
Não use `db push` como procedimento de implantação.

- `npm run prisma:generate`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npx tsx backend/scripts/audit-relations.ts` — somente leitura, contagens e conciliação de saldos.

O backup anterior à revisão está em `vinum-before-relations.dump`, ignorado pelo Git.
Não foi necessário criar tabelas novas: as entidades já existiam. Foram corrigidos vínculos,
obrigatoriedade, índices, validações e adicionados `orderId` e `purchaseLocation` às movimentações.
O vínculo ausente do Syrah foi preenchido com a única vinícola existente (Vinum);
a safra SF24-T05 recebeu o vinho e as uvas do seu lote já cadastrado.
Nenhum cadastro operacional existente foi excluído.

Esta revisão valida a instalação atual e os fluxos cobertos pelos testes. Não certifica ausência
de todo possível defeito nem uma implantação vazia com o histórico antigo de migrações de demonstração.
