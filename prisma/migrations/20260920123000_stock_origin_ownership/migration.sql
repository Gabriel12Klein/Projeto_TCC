BEGIN;
ALTER TABLE usuario ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE usuario DROP CONSTRAINT "usuario_roleId_fkey";
ALTER TABLE usuario ADD CONSTRAINT "usuario_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES role(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE item_pedido DROP CONSTRAINT "item_pedido_wineId_fkey";
ALTER TABLE item_pedido ADD CONSTRAINT "item_pedido_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES vinho(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE estoque_item DROP CONSTRAINT "estoque_item_wineId_fkey";
ALTER TABLE estoque_item ADD CONSTRAINT "estoque_item_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES vinho(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentacao_estoque" ADD COLUMN "purchaseLocation" TEXT;
UPDATE "movimentacao_estoque" m SET "purchaseLocation" = p."purchaseLocation"
FROM pedido p WHERE p.id = m."orderId";

-- A purchase must never credit another customer's stock or a different wine.
CREATE FUNCTION assert_order_item_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."inventoryItemId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pedido p JOIN estoque_item e ON e.id = NEW."inventoryItemId"
    WHERE p.id = NEW."orderId" AND p."userId" = e."userId"
    AND NEW."wineId" IS NOT DISTINCT FROM e."wineId"
  ) THEN
    RAISE EXCEPTION 'Pedido e estoque devem pertencer ao mesmo cliente e vinho' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER item_pedido_owner BEFORE INSERT OR UPDATE ON item_pedido
FOR EACH ROW EXECUTE FUNCTION assert_order_item_inventory();

CREATE FUNCTION assert_movement_order_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."orderId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pedido p JOIN estoque_item e ON e.id = NEW."inventoryItemId"
    WHERE p.id = NEW."orderId" AND p."userId" = e."userId"
  ) THEN
    RAISE EXCEPTION 'Movimentação e pedido devem pertencer ao mesmo cliente' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER movimentacao_owner BEFORE INSERT OR UPDATE ON movimentacao_estoque
FOR EACH ROW EXECUTE FUNCTION assert_movement_order_owner();
COMMIT;
