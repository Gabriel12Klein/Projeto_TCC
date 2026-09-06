UPDATE "lote"
SET "wineId" = (
  SELECT "wineId"
  FROM "safra"
  WHERE "safra"."id" = "lote"."vintageId"
)
WHERE "wineId" IS NULL;
