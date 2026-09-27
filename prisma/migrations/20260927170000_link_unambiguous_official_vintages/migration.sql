-- Backfill only purchases whose official wine has one unambiguous vintage year.
-- Wines with no vintage or more than one distinct year remain untouched.
WITH "single_vintage" AS (
  SELECT "wineId", MIN("year") AS "year"
  FROM "safra"
  WHERE "wineId" IS NOT NULL
  GROUP BY "wineId"
  HAVING COUNT(DISTINCT "year") = 1
)
UPDATE "item_pedido" AS "item"
SET "vintageYear" = "single_vintage"."year"
FROM "single_vintage"
WHERE "item"."wineId" = "single_vintage"."wineId"
  AND "item"."vintageYear" IS NULL;
