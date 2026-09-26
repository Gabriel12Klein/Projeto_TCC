BEGIN;

-- Correções de pedido alteram o saldo, mas não representam consumo nem uma
-- nova aquisição. Preserva os registros e os separa das métricas do dashboard.
UPDATE "movimentacao_estoque"
SET "type" = 'AJUSTE'
WHERE "reason" IN (
  'Correção da quantidade ou do rótulo do pedido',
  'Rótulo corrigido no pedido'
)
AND "type" IN ('ENTRADA', 'CONSUMO');

-- Suporta o recorte por item do cliente, tipo de movimento e período mensal.
CREATE INDEX "movimentacao_estoque_inventoryItemId_type_occurredAt_idx"
ON "movimentacao_estoque"("inventoryItemId", "type", "occurredAt");

COMMIT;
