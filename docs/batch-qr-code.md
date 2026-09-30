# QR Code persistente dos lotes

O QR Code pertence ao `Batch` (`lote`). Cada lote pode receber um único payload
estável por meio de `POST /api/lotes/:id/qr-code`, permitido somente a ADMIN e
EDITOR autenticados.

O payload é a URL pública `PUBLIC_APP_URL/consulta/lotes/:code`. Ele não contém
token, credencial ou identificador interno. Depois da primeira geração, novas
chamadas recuperam o mesmo valor; o código do lote deixa de ser alterável para
não invalidar QR Codes impressos.

## Persistência

A migration `20260929210000_persist_batch_qr_code` acrescenta ao PostgreSQL:

- `lote.qrCodePayload`: conteúdo exato codificado;
- `lote.qrCodeGeneratedAt`: instante da primeira geração.

`lote.qrCodePath`, já existente, continua preservado por compatibilidade. Novos
QR Codes usam `/api/catalog/batches/:code/qr-code`. Essa rota lê o payload no
PostgreSQL e reconstrói o PNG com a biblioteca `qrcode`; portanto reload, novo
login e reinício do backend não dependem de estado React, localStorage ou arquivo
de imagem. Referências históricas para `/uploads/qrcodes` não são apagadas e
podem ser convertidas pelo botão administrativo de geração.

## Interface e erros

Lotes ainda não salvos orientam o administrador a salvar primeiro. Lotes sem QR
oferecem `Gerar QR Code`; durante a operação aparece `Gerando QR Code…`; lotes
gerados exibem a imagem e mantêm a ação desabilitada. Falhas são apresentadas
sem detalhes internos. Blockchain permanece desabilitada e fora deste fluxo.

## Validação

O teste de integração cria dois lotes isolados, valida autenticação e papéis,
persiste e relê os campos, repete a geração sem duplicar, reconecta o Prisma,
faz logout/login, impede a troca do código e confirma payloads diferentes entre
lotes. O PNG é decodificado com `jsQR`, provando que o conteúdo lido corresponde
exatamente à URL persistida.
