BEGIN;

UPDATE movimentacao_estoque AS movement
SET reason = CASE
  WHEN movement.reason = 'Rótulo corrigido no pedido'
    THEN movement.reason || ' (aumento)'
  WHEN movement.reason = 'Correção da quantidade ou do rótulo do pedido'
    AND EXISTS (
      SELECT 1
      FROM item_pedido AS order_item
      WHERE order_item."orderId" = movement."orderId"
        AND order_item."inventoryItemId" = movement."inventoryItemId"
        AND order_item."quantityBottles" > COALESCE((
          SELECT SUM(entry."quantityBottles")
          FROM movimentacao_estoque AS entry
          WHERE entry."orderId" = movement."orderId"
            AND entry."inventoryItemId" = movement."inventoryItemId"
            AND entry.type = 'ENTRADA'
        ), 0)
    )
    THEN movement.reason || ' (aumento)'
  ELSE movement.reason || ' (redução)'
END
WHERE movement.type = 'AJUSTE'
  AND movement.reason IN (
    'Correção da quantidade ou do rótulo do pedido',
    'Rótulo corrigido no pedido'
  );

COMMIT;
