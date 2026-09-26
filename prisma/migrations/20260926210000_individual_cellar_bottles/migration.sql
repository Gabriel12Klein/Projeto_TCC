CREATE TABLE "garrafa_adega" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "orderItemId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DISPONIVEL',
  "purchasedAt" TIMESTAMP(3) NOT NULL,
  "openedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "garrafa_adega_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "garrafa_adega_status_check" CHECK ("status" IN ('DISPONIVEL', 'ABERTA', 'CONSUMIDA')),
  CONSTRAINT "garrafa_adega_dates_check" CHECK (
    ("openedAt" IS NULL OR "openedAt" >= "purchasedAt") AND
    ("finishedAt" IS NULL OR "finishedAt" >= COALESCE("openedAt", "purchasedAt"))
  )
);

ALTER TABLE "movimentacao_estoque" ADD COLUMN "cellarBottleId" TEXT;

CREATE INDEX "garrafa_adega_userId_status_idx" ON "garrafa_adega"("userId", "status");
CREATE INDEX "garrafa_adega_userId_finishedAt_idx" ON "garrafa_adega"("userId", "finishedAt");
CREATE INDEX "garrafa_adega_inventoryItemId_idx" ON "garrafa_adega"("inventoryItemId");
CREATE INDEX "garrafa_adega_orderItemId_idx" ON "garrafa_adega"("orderItemId");
CREATE INDEX "movimentacao_estoque_cellarBottleId_idx" ON "movimentacao_estoque"("cellarBottleId");

ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "estoque_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "item_pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_cellarBottleId_fkey" FOREIGN KEY ("cellarBottleId") REFERENCES "garrafa_adega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Expand every current order item into physical bottles without modifying existing records.
WITH expanded AS (
  SELECT i."id" item_id, i."inventoryItemId" inventory_id, p."userId" user_id,
    p."purchaseDate" purchased_at, p."createdAt" order_created_at, unit.n,
    row_number() OVER (PARTITION BY i."inventoryItemId" ORDER BY p."purchaseDate", p."createdAt", i."createdAt", unit.n) inventory_rank
  FROM "item_pedido" i
  JOIN "pedido" p ON p."id" = i."orderId"
  CROSS JOIN LATERAL generate_series(1, i."quantityBottles") unit(n)
  WHERE i."inventoryItemId" IS NOT NULL
), consumption AS (
  SELECT "inventoryItemId", COALESCE(SUM("quantityBottles"), 0)::integer consumed
  FROM "movimentacao_estoque"
  WHERE "type" = 'CONSUMO' AND ("reason" IS NULL OR "reason" NOT IN ('Correção da quantidade ou do rótulo do pedido', 'Rótulo corrigido no pedido'))
  GROUP BY "inventoryItemId"
), target AS (
  SELECT e."id", e."quantityBottles" + COALESCE(c.consumed, 0) total
  FROM "estoque_item" e LEFT JOIN consumption c ON c."inventoryItemId" = e."id"
)
INSERT INTO "garrafa_adega" ("id", "userId", "inventoryItemId", "orderItemId", "status", "purchasedAt", "createdAt", "updatedAt")
SELECT 'btl_' || md5(x.item_id || ':' || x.n::text), x.user_id, x.inventory_id, x.item_id,
  'DISPONIVEL', x.purchased_at, x.order_created_at, CURRENT_TIMESTAMP
FROM expanded x JOIN target t ON t."id" = x.inventory_id
WHERE x.inventory_rank <= t.total;

-- Add private legacy bottles for balances that predate the order table.
WITH consumption AS (
  SELECT "inventoryItemId", COALESCE(SUM("quantityBottles"), 0)::integer consumed
  FROM "movimentacao_estoque"
  WHERE "type" = 'CONSUMO' AND ("reason" IS NULL OR "reason" NOT IN ('Correção da quantidade ou do rótulo do pedido', 'Rótulo corrigido no pedido'))
  GROUP BY "inventoryItemId"
), targets AS (
  SELECT e."id", e."userId", e."createdAt", e."quantityBottles" + COALESCE(c.consumed, 0) total,
    (SELECT COUNT(*) FROM "garrafa_adega" g WHERE g."inventoryItemId" = e."id") existing,
    COALESCE((SELECT MIN(m."occurredAt") FROM "movimentacao_estoque" m WHERE m."inventoryItemId" = e."id" AND m."type" = 'ENTRADA'), e."createdAt") purchased_at
  FROM "estoque_item" e LEFT JOIN consumption c ON c."inventoryItemId" = e."id"
)
INSERT INTO "garrafa_adega" ("id", "userId", "inventoryItemId", "status", "purchasedAt", "createdAt", "updatedAt")
SELECT 'btl_legacy_' || md5(t."id" || ':' || unit.n::text), t."userId", t."id", 'DISPONIVEL', t.purchased_at, t."createdAt", CURRENT_TIMESTAMP
FROM targets t CROSS JOIN LATERAL generate_series(1, GREATEST(t.total - t.existing, 0)::integer) unit(n);

-- Attribute historical consumption chronologically. The finish timestamp also represents
-- the opening timestamp when that older event was not recorded separately.
WITH consumption_units AS (
  SELECT m."inventoryItemId", m."occurredAt",
    row_number() OVER (PARTITION BY m."inventoryItemId" ORDER BY m."occurredAt", m."id", unit.n) consumption_rank
  FROM "movimentacao_estoque" m
  CROSS JOIN LATERAL generate_series(1, m."quantityBottles") unit(n)
  WHERE m."type" = 'CONSUMO' AND (m."reason" IS NULL OR m."reason" NOT IN ('Correção da quantidade ou do rótulo do pedido', 'Rótulo corrigido no pedido'))
), bottles AS (
  SELECT g."id", g."inventoryItemId",
    row_number() OVER (PARTITION BY g."inventoryItemId" ORDER BY g."purchasedAt", g."createdAt", g."id") bottle_rank
  FROM "garrafa_adega" g
)
UPDATE "garrafa_adega" g
SET "status" = 'CONSUMIDA', "openedAt" = GREATEST(g."purchasedAt", c."occurredAt"),
  "finishedAt" = GREATEST(g."purchasedAt", c."occurredAt"), "updatedAt" = CURRENT_TIMESTAMP
FROM bottles b JOIN consumption_units c ON c."inventoryItemId" = b."inventoryItemId" AND c.consumption_rank = b.bottle_rank
WHERE g."id" = b."id";
