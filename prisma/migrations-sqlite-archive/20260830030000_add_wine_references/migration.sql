CREATE TABLE "WineType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "WineType_name_key" ON "WineType"("name");

CREATE TABLE "Grape" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Grape_name_key" ON "Grape"("name");

CREATE TABLE "WineGrape" (
    "wineId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,
    PRIMARY KEY ("wineId", "grapeId"),
    CONSTRAINT "WineGrape_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WineGrape_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "Grape" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WineGrape_grapeId_idx" ON "WineGrape"("grapeId");

ALTER TABLE "Wine" ADD COLUMN "typeId" TEXT;
CREATE INDEX "Wine_typeId_idx" ON "Wine"("typeId");

INSERT OR IGNORE INTO "WineType" ("id", "name", "description") VALUES
  ('wine-type-tinto', 'Tinto', 'Vinhos de coloração escura e perfil encorpado.'),
  ('wine-type-branco', 'Branco', 'Vinhos leves, frescos e de coloração clara.'),
  ('wine-type-rose', 'Rosé', 'Vinhos delicados de coloração rosada.'),
  ('wine-type-espumante', 'Espumante', 'Vinhos com gás carbônico e borbulhas.'),
  ('wine-type-brut', 'Brut', 'Espumantes de perfil seco.');

INSERT OR IGNORE INTO "Grape" ("id", "name") VALUES
  ('grape-cabernet-sauvignon', 'Cabernet Sauvignon'),
  ('grape-merlot', 'Merlot'),
  ('grape-malbec', 'Malbec'),
  ('grape-chardonnay', 'Chardonnay'),
  ('grape-pinot-noir', 'Pinot Noir'),
  ('grape-grenache', 'Grenache'),
  ('grape-sauvignon-blanc', 'Sauvignon Blanc'),
  ('grape-syrah', 'Syrah');

UPDATE "Wine"
SET "typeId" = (
  SELECT "id" FROM "WineType" WHERE lower("WineType"."name") = lower("Wine"."type") LIMIT 1
)
WHERE "typeId" IS NULL;

INSERT OR IGNORE INTO "WineGrape" ("wineId", "grapeId")
SELECT w."id", g."id"
FROM "Wine" w
JOIN "Grape" g
  ON lower(',' || replace(w."grapes", ', ', ',') || ',') LIKE '%,' || lower(g."name") || ',%';
