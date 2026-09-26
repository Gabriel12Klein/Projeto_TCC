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

### Retomada do navegador — validação parcial

- Navegador conectado em `http://localhost:5173`; nenhum dado persistente foi criado,
  editado ou excluído durante os testes. Login inválido usou somente credenciais
  fictícias e retornou “E-mail ou senha inválidos.”.
- Cadastro/login: envio vazio foca o primeiro campo inválido; mensagens inline,
  associação acessível, mostrar/ocultar senha, checklist, recuperação honesta,
  navegação por Tab e navegação entre cadastro/login foram conferidos.
- Catálogo: home, detalhe de vinho, consulta pública de lote e retorno ao catálogo
  foram percorridos. O console não registrou erros ou avisos nos fluxos testados.
- Falha confirmada: quando cidade e UF da VINUM estavam vazias, detalhes públicos
  exibiam `Vinum · /`. Corrigida a formatação compartilhada para mostrar somente
  `Vinum` (ou apenas a parte disponível da localização) em vinho e lote.
- Teste da correção: duas rotas públicas recarregadas no navegador mostraram
  `Vinum`; teste unitário da função tem três casos aprovados. A suíte completa passou
  com 77 testes em 22 arquivos; lint, typecheck, build e `git diff --check` aprovados.
- Limites ainda pendentes: sessão cliente/admin autenticada, máscaras e edição no
  meio, upload/retentativa, menus protegidos, confirmações destrutivas, rede lenta,
  erro de imagem e validação sistemática em 320/375/768/1024/1440 px e zoom 200%.
  A auditoria Nielsen continua aberta; a auditoria de integração/regressão não inicia.

### Continuação interativa de Nielsen — 24 a 26/09/2026

- Administração: menu de conta, cadastro de vinícola, formulário de vinho, safra,
  lote, listagem, filtro, detalhe e foco pelo teclado percorridos na sessão
  administrativa. Telefone e CNPJ perdiam o cursor ao apagar no meio; a máscara
  agora preserva a posição (retorno visual e três testes unitários). Um arquivo
  `.txt` no campo de foto gerava mensagem genérica; agora informa formatos e
  limite de 5 MB. Depois, um vinho **inativo** e fictício chamado
  `Auditoria Nielsen — vinho de teste 20260926` foi salvo com PNG real sob Slow
  3G. “Salvando…” desabilitou os controles; a lista mostrou o cadastro e a
  imagem reapareceu na edição (`naturalWidth` 1301). O cadastro fica no banco
  para rastreabilidade, sem publicação no catálogo público.
- Layout: autenticação em 320 px cortava os campos por `translate` remanescente;
  detalhe público cortava título e safra; painel administrativo transbordava em
  1024 px, e cabeçalho/menu sobrepunham-se em 320 px. Correções pontuais
  conferidas no navegador. Em larguras normais de 320/375/425/768/1024/1440 px,
  os formulários e páginas percorridos não tiveram transbordamento externo.
- Cliente de teste criado pela interface: `auditoria.nielsen.20260925@example.test`
  (há também uma conta de teste da retomada anterior, de 24/09). No perfil,
  telefone inválido foi rejeitado com foco e mensagem; telefone, cidade fictícia
  e UF normalizada foram salvos e reapareceram após recarga. Senha não alterada.
- Pedidos: estado vazio, campos obrigatórios, quantidade fracionária, edição,
  cancelamento de descarte e alteração de 2 para 3 garrafas testados. Criados
  apenas nessa conta dois pedidos fictícios: um VINUM e outro de local externo.
  O externo exigiu foto, manteve os campos após erro, recebeu PNG real e exibiu
  a imagem salva durante a edição. Após seleção válida, o erro de foto agora
  desaparece. Os pedidos permanecem no histórico de teste.
- Adega: saldo e movimentações reagiram à edição do pedido; entrada e consumo de
  uma garrafa exibiram estados e mensagens corretos. Um rótulo fictício com foto
  foi enviado com sucesso. Ao consumir sua última garrafa, o serviço o marcou
  inativo e a coleção deixou de exibi-lo; o histórico não foi apagado. A frase
  automática da compra agora mostra “Compra registrada em Meus pedidos.” no
  lugar do identificador interno, sem alterar o registro persistido. A imagem
  privada do pedido externo carregou após recarga (largura natural 1301 px).
- Zoom **real** de 200% confirmado no Brave (`devicePixelRatio` ≈ 2). Adega,
  formulário de pedido, perfil editável e painel administrativo medidos em larguras CSS de
  320/375/425/768/1024/1440 px; sem rolagem horizontal da página. O teste
  estreito de 320 px correspondeu a viewport física de 640 px com zoom 200%.
- Rede lenta configurada pelo usuário como Slow 3G: a interface mostrou
  “Carregando VINUM…”, “Carregando sua adega…”, “Carregando vinho…” e
  “Carregando foto…” antes do conteúdo; o pedido externo concluiu com feedback
  de sucesso e atualização posterior da lista. A ferramenta não informou a
  taxa exata aplicada, portanto esta evidência não comprova um valor de latência.
- Lote público L26254: `qrCodePath` existente aponta para imagem que não carrega
  (`naturalWidth` 0). A interface agora explica a indisponibilidade e oferece
  “Consultar o lote L26254”; o destino foi aberto e mostrou os dados do lote.
  Nenhum arquivo de QR ou dado histórico foi recriado/removido.
- Tentativa de simular Offline pelo DevTools: após o usuário ativar a opção, um
  salvamento e uma recarga ainda acessaram a API e mostraram os registros. Não
  há evidência de que o bloqueio tenha atingido a aba controlada. Para obter
  um caso real, somente o processo local da API foi interrompido brevemente e
  reiniciado com `npm.cmd run backend`; frontend, PostgreSQL e volumes ficaram
  ativos. Na recarga, o VINUM mostrou “Não foi possível verificar sua sessão”
  sem desconectar o administrador; “Tentar novamente” restaurou a lista. Em
  outra interrupção, a edição do vinho fictício retornou “O serviço está
  temporariamente indisponível”, preservou todos os campos e a foto anterior.
  Após restaurar a API, o mesmo formulário salvou e a nova descrição apareceu
  no detalhe, sem criar outro vinho.
- Upload parcial, em cenário controlado: somente o vinho fictício inativo teve a
  rota de foto temporariamente indisponível, antes de gravar qualquer arquivo.
  A edição dos dados concluiu, mas a tela manteve o formulário e o PNG escolhido,
  mostrando “O vinho foi salvo, mas a foto não foi enviada… sem duplicar o vinho”.
  A simulação foi removida, a API reiniciada normalmente e o mesmo botão reenviou
  a foto. A lista filtrada mostrou **um** registro, o detalhe exibiu a nova
  descrição e a imagem da edição carregou (`naturalWidth` 1301). Nenhuma
  instrumentação de falha ficou no código versionado.
- Expiração de sessão com rascunho: a duplicação da aba copiou a sessão. Após
  sair na cópia, a aba original ainda tinha a cidade não salva. O primeiro
  teste revelou redirecionamento para a Home sem aviso, por disputa com a guarda
  de rota. Corrigida a guarda em `App.tsx`. Repetido o mesmo cenário: ao salvar,
  a aba abriu `/login?motivo=sessao-expirada` com “Sua sessão expirou. Entre
  novamente para continuar.”; após entrar de novo, o rascunho reapareceu.
  A cidade da conta de teste foi restaurada para “Cidade de teste, RS”.
  Sem expiração, as guardas mantêm o comportamento anterior: `/perfil` sem
  sessão volta à Home e `/admin` sem sessão abre o login (ambos revalidados).
- Confirmação de descarte do perfil: o diálogo nativo abriu com alteração
  não salva; após a tentativa de cancelar o diálogo, o formulário ainda exibia
  “Rascunho descartável Nielsen”. A conexão da automação travou ao confirmar
  o descarte. O usuário confirmou manualmente na aba que, após aceitar, voltou
  ao resumo com o botão “Editar informações” e “Cidade de teste, RS”. Nenhum
  valor do rascunho foi salvo.
- Aceite Nielsen dos fluxos priorizados: administração e cliente autenticados,
  formulários, máscaras, senha, foco/teclado, menus, mensagens, uploads,
  indisponibilidade/retentativa, expiração de sessão, responsividade e zoom
  200% foram validados nas condições descritas acima. A auditoria de
  integração/regressão **não foi iniciada**. Os limites da amostra estão
  explicitados na consolidação abaixo; este aceite não certifica WCAG nem
  garante todas as combinações de dados ou condições de rede.

## Consolidação das 10 heurísticas — evidências e limites

**Situação: auditoria de Nielsen concluída em 26/09/2026 para o escopo funcional
e os dados atuais descritos neste documento.**
Não confundir testes unitários/renderização estática com avaliação interativa real.

| Heurística | Problemas identificados e correções | Preservado / verificação restante |
| --- | --- | --- |
| H1 — Visibilidade do estado | Consultas deixavam erro parecer vazio; envio e movimentos sem feedback. QueryFeedback, status de envio, contador sem zero prematuro e mensagens de resultado. | Carregamentos observados sob Slow 3G configurado pelo usuário; taxa exata não aferida. Falha real da API e retentativa observadas. |
| H2 — Correspondência com o mundo real | JSON técnico nos detalhes, unidades ausentes, cadastro prometia administração ao cliente. Detalhes com nomes, unidades e linguagem por perfil. | Vocabulário vinho/safra/lote/garrafa, identidade VINUM e relações existentes. |
| H3 — Controle e liberdade | Foco sequencial obrigatório; descarte administrativo sem confirmação; cancelar perfil em rota errada. Navegação livre entre campos, confirmações, retorno ao perfil e retomada de pedido fechado. | Escape, foco do menu, descarte de pedido e bloqueio durante salvamento testados. O usuário confirmou visualmente o retorno ao resumo após descarte do perfil. |
| H4 — Consistência | Senhas e telefone inconsistentes, controles sem efeito. Componentes compartilhados, regras únicas, labels e feedback de campo. | Paleta, fluxos e estrutura das páginas; não houve redesign arbitrário. |
| H5 — Prevenção de erros | Quantidade fracionária/negativa, upload após navegação, repetição de envio, contato inválido. Validações frontend/API e bloqueios síncronos. | Transações, autorização e constraints anteriores. Bloqueio no cliente não garante idempotência após perda de resposta do servidor. |
| H6 — Reconhecimento | IDs nos detalhes e campos sem rótulo persistente. Nomes relacionados, foto atual, labels e requisitos visíveis. | Uvas herdadas e composição histórica de safra, seleção automática apenas quando aplicável. |
| H7 — Flexibilidade e eficiência | Filtro e ordenação decorativos; paginação distante. Controles funcionais, busca sem acento, limpar filtros e paginação próxima. | Defaults e dados já cadastrados, sem criar estruturas duplicadas. |
| H8 — Estética e simplicidade | Dados técnicos e descrições longas em listagem. Conteúdo resumido na tabela e completo no detalhe. Painéis de autenticação podem crescer com os avisos. | Layout e zoom 200% medidos nas seis larguras listadas; sem certificação de contraste WCAG. Dados originais não foram truncados. |
| H9 — Reconhecimento e recuperação de erros | Inglês, falha de rede/JSON, expiração indevida por indisponibilidade, foto com sucesso parcial. Mensagens seguras, retry, manutenção de campos e identificação do vinho salvo. | Falha da API, expiração com rascunho e upload parcial com retentativa testados no navegador. Logs técnicos e códigos HTTP preservados. |
| H10 — Ajuda e documentação | Requisitos de senha ocultos e ações futuras parecendo prontas. Checklist, exemplos, ajuda de foto/origem e recuperação de senha explicada honestamente. | QR/blockchain futuros não foram implementados nem dados existentes removidos. |

## Padronização de formulários e prevenção de erros

| Formulários | O que foi revisado/corrigido | Limite de validação atual |
| --- | --- | --- |
| Login e cadastro | Mostrar/ocultar, autocomplete, regras/checklist de senha, confirmação, erros inline, envio único, sucesso persistente. | Alternância, Tab e foco testados no navegador; sem auditoria WCAG integral. |
| Cadastro administrativo | Telefone fixo/celular, CNPJ alfanumérico opcional, labels, requisitos, confirmação de senha, erros associados, proteção de fechamento. | Edição no meio da máscara e Escape testados; nenhum cadastro administrativo real criado. |
| Perfil do cliente | Máscara, regras de senha, checklist existente, idade derivada, erros inline, proteção de envio e cancelar correto. | Validação, persistência e rascunho após expiração testados; descarte nativo concluído com confirmação visual do usuário. |
| Vinho | Opções carregadas antes do formulário, foto validada, upload com recuperação, campos opcionais preenchidos validados, erros de API associados. | Upload real, falha parcial, retentativa sem duplicar e falha de conexão testados em vinho fictício inativo. |
| Safra/lote | Herança preservada, opções com retry, foco livre, envio bloqueado, ajuda/associações dos campos, grid estreito. | Cinco vinhos atuais testados sem salvar: uvas herdadas, safra automática/ausente e troca de seleção. Não cobre combinações futuras em bases maiores. |
| Uvas/tipos/classificações | Formulário e registros genéricos recebem as correções de validação, foco, envio, consulta e exclusão. | A confirmação informa irreversibilidade e vínculos protegidos. O comportamento transacional/por permissão será verificado na auditoria de integração, sem exclusão exploratória de dados reais. |
| Pedidos | Origem/local distinguíveis, foto existente, quantidade inteira, labels, erro por campo, continuar preenchimento e exclusão com histórico preservado. | Fluxos VINUM/externo, edição, foto, descarte e zoom testados. Rascunho revalidado no navegador após navegação e por teste isolado após limpeza da autenticação. |
| Adega | Labels, foto/quantidade, cancelamento sem apagar preenchimento, mensagens de movimento, consulta distinta de vazio e histórico visível. | Entrada, último consumo, histórico e imagem privada testados; trava síncrona de cliques concorrentes coberta por teste unitário. |

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
| `9e3f9d2` | fix(ux): valida fluxos Nielsen e corrige falhas confirmadas |
| `a2582cf` | fix(ux): conclui aceite Nielsen de sessao e upload |
| `dd1bbc4` | fix(ux): preserva rascunho de pedido e corrige rotas de sessao |

## Ampliação da cobertura Nielsen — 26/09/2026

- Lote sem salvamento: percorri todos os cinco vinhos disponíveis. Três têm
  uma safra relacionada, selecionada automaticamente com a uva correspondente;
  dois não têm safra. Trocar de vinho com safra para um sem safra limpou a
  seleção e as uvas antigas. Confirmei que o campo vazio não explicava a
  ausência de opções. Agora informa “Este vinho ainda não possui safra
  cadastrada. Abra Safra no menu para cadastrar uma antes de criar o lote.”
  O aviso está associado ao campo, desaparece quando há safra e coube em
  320 px sem rolagem horizontal externa. Nenhum lote foi criado.
- Safra sem salvamento: os cinco vinhos copiaram as uvas esperadas no
  formulário; desmarcar o vinho limpou a composição. Nenhuma safra foi criada.
- Pedido na conta Gabriel klein: confirmei perda do rascunho não salvo ao
  navegar à adega e voltar, e após expiração de sessão. O pedido não foi
  criado. O formulário agora guarda apenas os campos textuais e a referência
  de edição na sessão da aba, isolados por ID do cliente. Arquivo de foto não
  é armazenado; se selecionado, a tela pede nova seleção ao retomar.
  Navegação adega → pedidos já revalidada com rótulo, local e quantidade
  preservados. A repetição da expiração após a correção chegou à rota de
  login com motivo de expiração. Um teste isolado confirma que limpar token e
  usuário não remove o rascunho associado ao mesmo ID de cliente; a retomada
  após navegação também foi observada no navegador.
- O logout na área do cliente foi observado navegando para `/[object Object]`:
  o evento de clique era passado como destino à função de saída. O layout
  agora chama a saída sem argumentos. Teste isolado garante que o evento não é
  repassado como destino; a aba autenticada foi fechada antes da repetição visual.
- Ao abrir uma aba sem autenticação após adicionar a persistência do pedido,
  a Home ficou em branco: a rota de cliente avaliava `user.id` mesmo quando
  `user` era nulo. A referência agora é segura; a Home voltou a exibir o
  catálogo após recarga. Há teste de renderização das rotas públicas e
  protegidas sem sessão para impedir regressão desse erro.
- Cliques rápidos na adega: os botões ficam desabilitados durante a mutação e
  a trava síncrona recusa uma segunda ação antes da primeira concluir. O teste
  unitário com promessa pendente confirma uma única chamada e liberação da
  trava ao final, sem movimentar o estoque real.
- Restrições de vínculo: a interface antecipa irreversibilidade e informa que
  vínculos protegidos impedem exclusão. Testar autorização, resposta 409,
  transações e constraints pertence à próxima auditoria de integração; não é
  necessário apagar registros reais para concluir a avaliação heurística.

## Encerramento da auditoria de Nielsen

- A orientação de safra, a retomada após navegação e a Home sem sessão foram
  revalidadas no navegador. Lint, typecheck/build, 15 testes unitários
  focados em sete arquivos e `git diff --check` passaram.
- A amostra não incluiu todas as combinações possíveis em bases maiores,
  certificação de contraste/acessibilidade WCAG nem tentativa destrutiva de
  cada vínculo possível. Esses limites não deixam pendência Nielsen: são
  cobertura combinatória, acessibilidade formal ou integração.
- A auditoria de Nielsen está encerrada. A auditoria de integração/regressão
  continua separada e ainda não foi iniciada; nela cabem contratos,
  permissões, transações, constraints e histórico, sem recriar o banco ou
  apagar volumes.
