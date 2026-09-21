# Auditoria de usabilidade VINUM — Nielsen

Base: `a26fcd5`. Solicitação integral lida antes das alterações.
Modelo single-tenant, PostgreSQL, histórico e dados atuais devem ser preservados.

## Matriz inicial (antes das correções)

| Grupo | Heurísticas | Evidência / problema | Severidade | Camadas / teste |
| --- | --- | --- | --- | --- |
| API/erros/sessão | H1,H2,H5,H9 | Zod envia mensagens em inglês; metadados desconhecidos de banco podem aparecer; rede/JSON não tratados; indisponibilidade encerra sessão | Alta | API/frontend; erros simulados, sessão e regressão |
| Login/cadastro/senhas | H1,H4,H5,H9,H10 | Sem mostrar senha; lembrar de mim sem efeito; requisitos inconsistentes; feedback não associado aos campos | Alta | Componentes e schemas; requisitos, campos e teclado |
| Catálogo/menu público | H1,H3,H9 | Home confunde erro com lista vazia; menu não trata Escape; logout local não revoga sessão | Moderada | Frontend; consulta e navegação |
| Vinícola/perfil | H4,H5,H9,H10 | Telefone sem padrão compartilhado; máscara de perfil trata fixo como celular; senha sem visibilidade; validação local incompleta | Alta | Frontend/backend; máscara, validação e persistência |
| Cadastros produtivos | H1,H3,H5,H6,H9 | Foco forçado antes de campos anteriores preenchidos; sem bloqueio de salvamento; navega antes de upload, permitindo sucesso parcial enganoso | Alta | Form/API; submit duplicado, upload e recuperação |
| Registros administrativos | H1,H2,H3,H7,H9 | Visualizar abre JSON técnico; filtrar/ordenar sem ação; vazio sem explicação; exclusão sem feedback de sucesso | Alta | Frontend; detalhes, filtros, paginação e exclusão |
| Estoque/pedidos | H1,H4,H5,H9,H10 | Carregamento/erro confundidos com vazio; campos sem label persistente; consumo sem retorno de erro claro | Alta | Frontend/API; movimento, saldo, pedido e rollback |
| Banco/histórico | H5 | Constraints e transações já validadas; nenhuma nova estrutura justificada inicialmente | Preservar | Auditoria SQL e suíte de integração |

## Processo

Cada grupo: inspeção → correção comprovada → testes → diff/status → commit.
Revisão visual e responsiva depende de navegador conectado; não declarar testes não realizados.
Resultados, mensagens, commits e limitações serão consolidados aqui após cada grupo.

### Grupo 1 — API, erros e sessão

- Corrigidos Zod em inglês, nomes internos desconhecidos em conflitos e mensagem
  genérica de falha. Paths de campo são preservados para validação inline.
- Rede, HTML de proxy e indisponibilidade têm recuperação explícita; respostas
  técnicas não são reutilizadas como mensagem normal. Login inválido não dispara
  evento de sessão expirada; demais 401 autenticados solicitam novo login.
- Indisponibilidade durante verificação de sessão não apaga a autenticação local.
- Logs preservam tipo, código, método e frames, sem corpo, senha, token ou SQL.
- Preservados códigos de sucesso, autorização, transações e constraints existentes.
- TypeScript aprovado; 42 testes aprovados (11 arquivos), incluindo cinco testes
  novos de mensagens, rede, resposta inválida e expiração. Sem migration necessária.
