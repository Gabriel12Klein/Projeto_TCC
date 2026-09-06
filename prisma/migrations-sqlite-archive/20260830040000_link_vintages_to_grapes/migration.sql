PRAGMA foreign_keys=OFF;

CREATE TABLE "Vintage_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wineId" TEXT,
    "identifier" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "observations" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vintage_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "Vintage_new" ("id", "wineId", "identifier", "year", "observations", "status", "createdAt", "updatedAt")
SELECT "id", "wineId", "identifier", "year", "observations", "status", "createdAt", "updatedAt"
FROM "Vintage";

DROP TABLE "Vintage";
ALTER TABLE "Vintage_new" RENAME TO "Vintage";

CREATE UNIQUE INDEX "Vintage_identifier_key" ON "Vintage"("identifier");
CREATE INDEX "Vintage_wineId_idx" ON "Vintage"("wineId");
CREATE INDEX "Vintage_year_idx" ON "Vintage"("year");

CREATE TABLE "VintageGrape" (
    "vintageId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,
    PRIMARY KEY ("vintageId", "grapeId"),
    CONSTRAINT "VintageGrape_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VintageGrape_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "Grape" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "VintageGrape_grapeId_idx" ON "VintageGrape"("grapeId");

PRAGMA foreign_keys=ON;
