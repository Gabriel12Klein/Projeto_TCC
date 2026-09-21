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

### Grupo 6 — Registros administrativos

- Grupo 5 registrado em `6d39bae`.
- Visualizar substitui alert/JSON por diálogo com nomes relacionados, unidades,
  datas legíveis e observações completas; nenhuma chave/ID interno é apresentado.
- Situação, ordenação crescente/decrescente e limpar filtros funcionam. Busca
  ignora acentos e usa campos de apresentação, não serialização de IDs internos.
- Paginação limita página atual após alterações e mantém janela de páginas próxima
  da seleção. Controles anterior/próxima têm nome acessível.
- Exclusão identifica o registro, informa irreversibilidade/vínculos protegidos,
  bloqueia repetição, distingue sucesso/erro e atualiza consultas/resumo.
- Consulta tem carregamento, falha com retry, vazio real e vazio por filtro.
- 60 testes aprovados em 17 arquivos; typecheck/lint aprovados. Sem alteração
  de permissões, política de exclusão ou banco. Modal real ainda requer teste visual.

### Grupo 7 — Pedidos e estoque/adega

- Grupo administrativo preservado em `d1476a3`; retomada conferiu status, diff e log.
- Pedidos e adega distinguem carregamento/erro/vazio; total não indica zero antes
  da resposta. Erros oferecem nova tentativa sem limpar os formulários.
- Labels persistentes, quantidade inteira positiva, foto obrigatória quando
  aplicável, erros inline e foco no primeiro campo; caminhos aninhados da API
  são associados aos campos do pedido. Imagem atual do pedido permanece visível.
- Salvamento, exclusão e movimentação bloqueiam chamadas concorrentes; sucesso e
  falha têm feedback. Campos são limpos somente após sucesso. Pedido fechado pode
  ser retomado; trocar por outro formulário pede confirmação.
- Vinhos já vinculados continuam identificáveis ao editar pedido mesmo se saírem
  do catálogo. Exclusão mantém a regra existente: garrafas e movimentos preservados.
- Adega mostra as movimentações já retornadas pela API. Imagens privadas mantêm
  autenticação por cabeçalho e URLs temporárias, com estados de carregamento/falha.
- O diff maior de ClientSectionPage inclui formatação de JSX antes concentrado
  em linhas enormes; não houve redesign ou mudança de banco/backend nesta etapa.
- A última suíte completa anterior passou com 67 testes, antes dos ajustes finais.
  A repetição elevada foi recusada por limite de uso na revisão automática.
- Na retomada, teste unitário restrito falhou ao iniciar esbuild (`spawn EPERM`).
  Após inspeção, foi autorizada execução elevada **somente de testes unitários sem
  banco**: 14 testes passaram (formValidation, ClientSectionPage, QueryFeedback,
  feedback); também passaram os dois testes de saveWithImage em execução separada.
- Typecheck, lint e diff-check aprovados. Clique real, teclado, responsividade e
  integração ponta a ponta continuam sujeitos à validação em navegador conectado.
- Nenhum dado apagado, migration alterada ou volume recriado.

### Grupo 8 — Revisão de respostas inválidas da API

- Pedidos/adega finalizados em `a312da9`.
- JSON de sucesso com estrutura incompatível é rejeitado antes de chegar às listas
  e telas dependentes. Mensagem orienta nova tentativa e conferência da lista se
  havia salvamento, sem alegar que a operação não chegou ao servidor.
- Resposta 401 autenticada sinaliza sessão expirada mesmo com HTML; login inválido
  continua independente. Issues inválidas não causam erro ao montar feedback.
- Mensagens técnicas/inglesas comuns de intermediários não são repassadas diretamente.
- Contratos conferidos nas rotas/serviços atuais. Sem alteração de backend/banco.
- 15 testes unitários aprovados nesta revisão, incluindo três casos novos; lint,
  typecheck e diff-check aprovados. Verificação de formato cobre os dados necessários
  às telas, não substitui validação de domínio e autorização no servidor.

### Grupo 9 — Saída do cadastro administrativo

- Revisão da API registrada em `fa4e9ec`.
- Fechar, Escape e troca de aba pedem confirmação quando há edição não salva.
  Cancelar a confirmação mantém a janela e os campos. Salvar limpa a indicação de
  edição pendente. Selecionar a própria aba não descarta o estado de edição.
- Durante salvamento, fechar/trocar aba é bloqueado com mensagem de status.
- Dois testes unitários novos para decisão de saída; interação nativa de dialog
  ainda depende de navegador conectado.
- Revisão unitária global desta retomada: **38 testes em 13 arquivos aprovados**.
  Inclui frontend e schemas/helpers de backend sem acesso ao banco. Lint, typecheck,
  build e diff-check aprovados. Build mantém avisos de comentários da dependência
  Zod e bundle acima de 500 kB; não são falhas de compilação.

## Consolidação das 10 heurísticas — evidências e limites

**Situação: correções dos grupos 1–9 commitadas; aceite global ainda pendente.**
Não confundir testes unitários/renderização estática com avaliação interativa real.

| Heurística | Problemas identificados e correções | Preservado / verificação restante |
| --- | --- | --- |
| H1 — Visibilidade do estado | Consultas deixavam erro parecer vazio; envio e movimentos sem feedback. QueryFeedback, status de envio, contador sem zero prematuro e mensagens de resultado. | Dados carregados e cache não são apagados por falha transitória. Falta validar rede lenta na UI. |
| H2 — Correspondência com o mundo real | JSON técnico nos detalhes, unidades ausentes, cadastro prometia administração ao cliente. Detalhes com nomes, unidades e linguagem por perfil. | Vocabulário vinho/safra/lote/garrafa, identidade VINUM e relações existentes. |
| H3 — Controle e liberdade | Foco sequencial obrigatório; descarte administrativo sem confirmação; cancelar perfil em rota errada. Navegação livre entre campos, confirmações, retorno ao perfil e retomada de pedido fechado. | Regras de exclusão e histórico. Falta testar Escape, restauração de foco e navegação durante requisições. |
| H4 — Consistência | Senhas e telefone inconsistentes, controles sem efeito. Componentes compartilhados, regras únicas, labels e feedback de campo. | Paleta, fluxos e estrutura das páginas; não houve redesign arbitrário. |
| H5 — Prevenção de erros | Quantidade fracionária/negativa, upload após navegação, repetição de envio, contato inválido. Validações frontend/API e bloqueios síncronos. | Transações, autorização e constraints anteriores. Bloqueio no cliente não garante idempotência após perda de resposta do servidor. |
| H6 — Reconhecimento | IDs nos detalhes e campos sem rótulo persistente. Nomes relacionados, foto atual, labels e requisitos visíveis. | Uvas herdadas e composição histórica de safra, seleção automática apenas quando aplicável. |
| H7 — Flexibilidade e eficiência | Filtro e ordenação decorativos; paginação distante. Controles funcionais, busca sem acento, limpar filtros e paginação próxima. | Defaults e dados já cadastrados, sem criar estruturas duplicadas. |
| H8 — Estética e simplicidade | Dados técnicos e descrições longas em listagem. Conteúdo resumido na tabela e completo no detalhe. Painéis de autenticação podem crescer com os avisos. | Observações e dados originais não foram truncados no banco. Falta medir layout/contraste/zoom em navegador. |
| H9 — Reconhecimento e recuperação de erros | Inglês, falha de rede/JSON, expiração indevida por indisponibilidade, foto com sucesso parcial. Mensagens seguras, retry, manutenção de campos e identificação do vinho salvo. | Logs técnicos seguros e códigos HTTP. Falta teste interativo completo de sessão expirada com formulário preenchido. |
| H10 — Ajuda e documentação | Requisitos de senha ocultos e ações futuras parecendo prontas. Checklist, exemplos, ajuda de foto/origem e recuperação de senha explicada honestamente. | QR/blockchain futuros não foram implementados nem dados existentes removidos. |

## Padronização de formulários e prevenção de erros

| Formulários | O que foi revisado/corrigido | Limite de validação atual |
| --- | --- | --- |
| Login e cadastro | Mostrar/ocultar, autocomplete, regras/checklist de senha, confirmação, erros inline, envio único, sucesso persistente. | Alternância independente, Tab e foco precisam de teste real. |
| Cadastro administrativo | Telefone fixo/celular, CNPJ alfanumérico opcional, labels, requisitos, confirmação de senha, erros associados, proteção de fechamento. | Colar/apagar no meio da máscara e Escape dependem de navegador. |
| Perfil do cliente | Máscara, regras de senha, checklist existente, idade derivada, erros inline, proteção de envio e cancelar correto. | Validação após interação e restauração de foco ainda devem ser percorridas manualmente. |
| Vinho | Opções carregadas antes do formulário, foto validada, upload com recuperação, campos opcionais preenchidos validados, erros de API associados. | Confirmar upload real, erro de rede e retomada com arquivo novamente selecionado. |
| Safra/lote | Herança preservada, opções com retry, foco livre, envio bloqueado, ajuda/associações dos campos, grid estreito. | Percorrer todas as combinações de vinho/safra e verificar UI de opções indisponíveis. |
| Uvas/tipos/classificações | Formulário e registros genéricos recebem as correções de validação, foco, envio, consulta e exclusão. | Testar permissões e restrições de vínculo na interface real. |
| Pedidos | Origem/local distinguíveis, foto existente, quantidade inteira, labels, erro por campo, continuar preenchimento e exclusão com histórico preservado. | Dados ficam em memória durante esta tela; recuperação após expiração de sessão/navegação precisa de verificação específica. |
| Adega | Labels, foto/quantidade, cancelamento sem apagar preenchimento, mensagens de movimento, consulta distinta de vazio e histórico visível. | Cliques rápidos, último consumo e falha de imagem precisam de validação interativa. |

### Exemplos de mensagens alteradas

- Falha de conexão: “Não foi possível conectar ao VINUM. Verifique sua conexão e
  tente novamente; os campos preenchidos foram mantidos.”
- Resposta incompleta: orienta repetir a consulta e conferir a lista se estava salvando.
- Sessão: “Sua sessão expirou. Entre novamente para continuar.”
- Upload parcial: “O vinho foi salvo, mas a foto não foi enviada…”; retry reutiliza ID.
- Cadastro: “Conta criada com sucesso. Agora faça o login.”, sem sumir automaticamente.
- Movimento: “Entrada de uma garrafa registrada.” / “Consumo de uma garrafa registrado.”
- Quantidade: “Informe uma quantidade inteira de garrafas, maior que zero.”
- Exclusão de pedido: informa que garrafas e movimentações serão mantidas.
- Foto indisponível: aviso visível, sem liberar acesso público à imagem privada.
- Fechar cadastro: confirma descarte e permite manter o formulário aberto.

## Camadas e arquivos

- **Frontend:** App e camada API; Login/Cadastro/Profile; Home e detalhes públicos;
  AdminPage, AdminAccountMenu, ModuleForm, FormField, ModuleRecords e wrappers
  Vinho/Safra/Lote; ClientSectionPage, InventoryWineCard, BottlePhotoPicker, PrivateImage.
- **Novos utilitários/componentes:** `shared/password.ts`, `shared/contact.ts`,
  `src/api/feedback.ts`, `src/api/responseShape.ts`, `src/ui/PasswordInput.tsx`,
  `QueryFeedback.tsx`, `FieldError.tsx`, `useFormFeedback.ts`, `confirmLeave.ts`,
  `forms.css`, `recordView.ts`, `saveWithImage.ts`, `formValidation.ts`, com testes.
- **Backend:** `common/http.ts` (erros/logs), `auth.middleware.ts` (mensagem),
  `auth.schema.ts` e `admin-settings.schema.ts` (senha/contato compartilhados).
  Teste de perfil ajustado para telefone persistido sem máscara.
- **PostgreSQL/migrations:** nenhuma estrutura ou migration alterada nesta auditoria.
  Nenhum dado existente, volume, backup ou migration histórica foi removido.
- **Remoções:** nenhum arquivo removido. Retirados checkbox sem efeito, botões
  decorativos de filtro/ordenação (substituídos por controles funcionais), alert
  com JSON e promessas indevidas de administração/QR no cadastro de cliente.
- Relação exata versionada: `git diff --name-status a26fcd5 HEAD`.

## Commits funcionais

| Hash | Mensagem |
| --- | --- |
| `31a60ca` | fix(ux): padroniza erros e recuperacao de sessao |
| `9e2a62a` | fix(ux): padroniza senhas e feedback de autenticacao |
| `6375ad8` | fix(ux): diferencia falhas do catalogo e melhora menu publico |
| `495c11d` | fix(ux): unifica contato e validacao dos perfis |
| `6d39bae` | fix(ux): preserva cadastro ao falhar upload e bloqueia reenvio |
| `d1476a3` | fix(ux): implementa filtros e detalhes legiveis dos registros |
| `a312da9` | fix(ux): valida pedidos e melhora feedback da adega |
| `fa4e9ec` | fix(ux): rejeita respostas incompletas antes da renderizacao |
| `7ebb669` | fix(ux): protege edicoes ao fechar cadastro administrativo |

## Próxima etapa e critérios de conclusão

1. Conectar navegador ao VINUM. A skill Browser foi consultada e a descoberta
   retornou lista vazia inclusive nesta retomada; conexão solicitada ao usuário.
2. Validar como visitante/cliente/admin: formulários, cliques repetidos, rede lenta,
   erros/retentativa, sessão, foto, máscaras ao editar no meio, mostrar/ocultar,
   foco inicial/de erro/restaurado, Escape, cancelamento e ações destrutivas.
3. Conferir responsividade a 320/375/768/1024/1440 px, zoom de 200%, contraste,
   leitura por teclado e anúncios de carregamento/erro. Não há screenshots de aceite.
4. Corrigir somente regressões concretas encontradas e commitá-las após testes.
5. Atualizar esta consolidação para relatório final **somente após o aceite global**.

Não há declaração de auditoria 100% concluída: testes automatizados não comprovam
sozinhos usabilidade interativa, responsividade ou acessibilidade integral.
