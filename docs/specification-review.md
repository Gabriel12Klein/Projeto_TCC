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

Relatório de commits, testes e resultados será completado à medida que cada etapa for validada.
