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

### Grupo 2 — Autenticação e senhas

- Grupo 1 preservado no commit `31a60ca`.
- Mostrar/ocultar independente em login, cadastro, perfil e cadastro administrativo;
  senha oculta inicialmente, botão não submete e informa estado/nome acessível.
- Regra compartilhada frontend/backend (8–72 caracteres, maiúscula, minúscula,
  número) e checklist visível. Login mantém compatibilidade com senhas existentes;
  deixar nova senha vazia continua mantendo a senha atual.
- Login/cadastro: labels associados, erros inline, foco do react-hook-form no
  primeiro campo inválido, autocomplete e envio com bloqueio síncrono de duplicação.
- Cadastro não promete administração nem geração de QR ao cliente; sucesso fica
  visível, limpa senhas e rascunho, sem redirecionamento automático nem novo envio.
- Removido checkbox “Lembrar de mim” sem efeito; recuperação informa honestamente
  indisponibilidade e contato com responsável, sem simular envio de e-mail.
- Painéis podem crescer para acomodar erros e requisitos sem altura fixa.
- Testes: 51 aprovados em 13 arquivos; typecheck, lint e build aprovados.
  Corrigida atribuição redundante indicada pelo lint em `src/api/api.ts`.
- Browser consultado nesta retomada: nenhum navegador conectado. Teste estático
  verifica HTML acessível; clique, foco e layout visual ainda não foram validados.
- Sem alteração de banco. Máscaras, validação inline completa dos perfis e demais
  grupos da matriz continuam pendentes; esta seção não declara a auditoria concluída.

### Grupo 3 — Consulta pública e menu

- Grupo 2 registrado em `9e2a62a`.
- Home distingue carregamento, erro com nova tentativa e catálogo vazio. Vinho e
  lote distinguem 404 de falha de conexão; dados produtivos e QR existentes preservados.
- Menu do cliente fecha com Escape (restaura foco) e clique externo. Links comuns
  usam navegação por Tab, sem declarar um menu ARIA incompleto.
- Sair na Home utiliza o mesmo logout do restante do aplicativo, revogando a sessão
  no servidor quando disponível, com estado “Saindo…” e bloqueio de repetição.
- Componente QueryFeedback reutilizável: prioridade de carregamento/erro sobre vazio,
  tentativa bloqueada durante requisição. Dois testes novos, 53 testes aprovados
  em 14 arquivos, typecheck e lint aprovados. Sem alteração de API/banco.
- Interação visual/teclado real permanece pendente por falta de navegador conectado.

### Grupo 4 — Contato e perfis

- Grupo 3 registrado em `6375ad8`.
- Telefone compartilhado para cliente/administrador: fixo e celular com DDD,
  máscara consistente, entrada incompleta editável, excesso de dígitos não truncado.
- API valida telefone e persiste somente dígitos nos novos salvamentos. Leitura
  aceita registros antigos formatados. Teste de integração confirma persistência
  após novo login, mantendo proteção de e-mail e invalidação de sessões.
- CNPJ mantém política alfanumérica anterior, aceita colagem com/sem máscara e
  rejeita excesso/caracteres inválidos. Nenhuma nova regra de dígito verificador.
- Perfis exibem erros inline com associação acessível e foco no primeiro erro;
  falhas da API preservam os campos. Bloqueio síncrono evita envio concorrente.
- Cancelar perfil confirma descarte e volta à visualização do próprio perfil,
  sem navegar para rota administrativa. Requisitos de senha permanecem visíveis.
- 56 testes aprovados em 15 arquivos; typecheck/lint aprovados. Backend alterado
  apenas para validação e normalização de contato; nenhuma migration ou exclusão.

### Grupo 5 — Salvamento produtivo e recuperação de foto

- Grupo 4 registrado em `495c11d`.
- Formulários produtivos bloqueiam envio concorrente e mostram “Salvando…”.
  Não mudam para registros antes de concluir foto. Upload com falha mantém o ID
  salvo no rascunho; retry atualiza esse vinho em vez de duplicá-lo. Após recarregar,
  foto pendente precisa ser selecionada novamente; arquivo não vai para sessionStorage.
- Opções de vinho, uva, classificação e safra diferenciam carregamento/erro com
  retry. Autopreenchimento e snapshots históricos existentes foram preservados.
- Foco não obriga preenchimento sequencial. Submit foca primeiro erro editável;
  campos opcionais preenchidos também são validados. Erros da API associados.
- Validação de tipo/tamanho da foto antes de salvar; limpar pede confirmação.
  Campos têm associação de label, erro e ajuda; grid adapta para uma coluna estreita.
- 58 testes aprovados em 16 arquivos; lint/typecheck aprovados. Dois testes novos
  simulam falha de upload, ordem de retenção de ID e repetição sem nova criação.
- Teste visual e interrupção real de rede permanecem pendentes. Perda da resposta
  da criação antes de obter o ID não equivale a idempotência garantida no servidor.
