BEGIN;

-- Repair only associations supported by a unique existing relationship.
UPDATE "vinho" SET "wineryId" = (SELECT min(id) FROM "vinicola")
WHERE "wineryId" IS NULL AND (SELECT count(*) FROM "vinicola") = 1;
UPDATE "safra" s SET "wineId" = b.wine_id
FROM (SELECT "vintageId", min("wineId") AS wine_id FROM "lote"
      GROUP BY "vintageId" HAVING count(DISTINCT "wineId") = 1) b
WHERE s.id = b."vintageId" AND s."wineId" IS NULL;
UPDATE "lote" b SET "wineId" = s."wineId"
FROM "safra" s WHERE s.id = b."vintageId" AND b."wineId" IS NULL;
INSERT INTO "safra_uva" ("vintageId", "grapeId")
SELECT DISTINCT s.id, bg."grapeId" FROM "safra" s
JOIN "lote" b ON b."vintageId" = s.id
JOIN "lote_uva" bg ON bg."batchId" = b.id
WHERE NOT EXISTS (SELECT 1 FROM "safra_uva" sg WHERE sg."vintageId" = s.id);

ALTER TABLE "lote" DROP CONSTRAINT "lote_vintageId_fkey";
ALTER TABLE "lote" DROP CONSTRAINT "lote_wineId_fkey";
ALTER TABLE "safra" DROP CONSTRAINT "safra_wineId_fkey";
ALTER TABLE "vinho" DROP CONSTRAINT "vinho_typeId_fkey";
ALTER TABLE "vinho" DROP CONSTRAINT "vinho_wineryId_fkey";
ALTER TABLE "lote" ALTER COLUMN "wineId" SET NOT NULL;
ALTER TABLE "safra" ALTER COLUMN "wineId" SET NOT NULL;
ALTER TABLE "vinho" ALTER COLUMN "wineryId" SET NOT NULL, ALTER COLUMN "typeId" SET NOT NULL;
CREATE UNIQUE INDEX "safra_id_wineId_key" ON "safra"("id", "wineId");
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "vinicola"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "tipo_vinho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safra" ADD CONSTRAINT "safra_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lote" ADD CONSTRAINT "lote_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lote" ADD CONSTRAINT "lote_vintageId_wineId_fkey" FOREIGN KEY ("vintageId", "wineId") REFERENCES "safra"("id", "wineId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "vinho_uva" DROP CONSTRAINT "vinho_uva_grapeId_fkey";
ALTER TABLE "safra_uva" DROP CONSTRAINT "safra_uva_grapeId_fkey";
ALTER TABLE "lote_uva" DROP CONSTRAINT "lote_uva_grapeId_fkey";
ALTER TABLE "vinho_uva" ADD CONSTRAINT "vinho_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "safra_uva" ADD CONSTRAINT "safra_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lote_uva" ADD CONSTRAINT "lote_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimentacao_estoque" ADD COLUMN "orderId" TEXT;
UPDATE "movimentacao_estoque" m SET "orderId" = p.id FROM "pedido" p
WHERE m.reason = 'Compra registrada no pedido ' || p.id
AND EXISTS (SELECT 1 FROM "estoque_item" e WHERE e.id = m."inventoryItemId" AND e."userId" = p."userId");
CREATE INDEX "movimentacao_estoque_orderId_idx" ON "movimentacao_estoque"("orderId");
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedido"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "estoque_item_userId_wineId_key" ON "estoque_item"("userId", "wineId");

ALTER TABLE "vinho" ADD CONSTRAINT "vinho_volume_positive" CHECK ("volumeMl" > 0),
ADD CONSTRAINT "vinho_alcohol_range" CHECK ("alcoholPercentage" >= 0 AND "alcoholPercentage" <= 100);
ALTER TABLE "safra" ADD CONSTRAINT "safra_year_range" CHECK (year BETWEEN 1900 AND 2100);
ALTER TABLE "lote" ADD CONSTRAINT "lote_quantity_positive" CHECK ("quantityLiters" > 0 AND "quantityLiters" < 'Infinity'::float8);
ALTER TABLE "estoque_item" ADD CONSTRAINT "estoque_quantity_nonnegative" CHECK ("quantityBottles" >= 0);
ALTER TABLE "item_pedido" ADD CONSTRAINT "pedido_item_quantity_positive" CHECK ("quantityBottles" > 0),
ADD CONSTRAINT "pedido_item_price_nonnegative" CHECK ("unitPrice" >= 0),
ADD CONSTRAINT "pedido_item_volume_positive" CHECK ("volumeMl" > 0);
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_source_valid" CHECK (source IN ('VINICULA', 'OUTRO_LOCAL'));
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimento_type_valid" CHECK (type IN ('ENTRADA', 'CONSUMO', 'AJUSTE')),
ADD CONSTRAINT "movimento_quantity_valid" CHECK ("quantityBottles" >= 0 AND (type = 'AJUSTE' OR "quantityBottles" > 0));
COMMIT;
