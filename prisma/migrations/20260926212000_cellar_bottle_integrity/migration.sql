CREATE FUNCTION assert_cellar_bottle_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "estoque_item" e
    WHERE e."id" = NEW."inventoryItemId" AND e."userId" = NEW."userId"
  ) THEN
    RAISE EXCEPTION 'Garrafa e estoque devem pertencer ao mesmo cliente' USING ERRCODE = '23514';
  END IF;
  IF NEW."orderItemId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "item_pedido" i
    JOIN "pedido" p ON p."id" = i."orderId"
    WHERE i."id" = NEW."orderItemId"
      AND i."inventoryItemId" = NEW."inventoryItemId"
      AND p."userId" = NEW."userId"
  ) THEN
    RAISE EXCEPTION 'Garrafa, pedido e estoque devem pertencer ao mesmo cliente e rótulo' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER garrafa_adega_owner BEFORE INSERT OR UPDATE ON "garrafa_adega"
FOR EACH ROW EXECUTE FUNCTION assert_cellar_bottle_owner();

CREATE FUNCTION assert_movement_bottle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."cellarBottleId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "garrafa_adega" g
    WHERE g."id" = NEW."cellarBottleId" AND g."inventoryItemId" = NEW."inventoryItemId"
  ) THEN
    RAISE EXCEPTION 'Movimentação e garrafa devem pertencer ao mesmo item da adega' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER movimentacao_garrafa BEFORE INSERT OR UPDATE ON "movimentacao_estoque"
FOR EACH ROW EXECUTE FUNCTION assert_movement_bottle();
