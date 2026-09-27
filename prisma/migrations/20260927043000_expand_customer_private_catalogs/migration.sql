ALTER TABLE "outras_vinicolas"
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "stateRegion" TEXT,
  ADD COLUMN "country" TEXT;

ALTER TABLE "vinhos_externo"
  ADD COLUMN "vintageYear" INTEGER,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "characteristics" TEXT,
  ADD COLUMN "aromas" TEXT,
  ADD COLUMN "tastingNotes" TEXT,
  ADD CONSTRAINT "vinhos_externo_vintageYear_check"
    CHECK ("vintageYear" IS NULL OR "vintageYear" BETWEEN 1000 AND 9999);

ALTER TABLE "locais_de_compra"
  ADD COLUMN "neighborhood" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "stateRegion" TEXT,
  ADD COLUMN "country" TEXT;

CREATE TABLE "vinho_externo_uva" (
  "externalWineId" TEXT NOT NULL,
  "grapeId" TEXT NOT NULL,
  CONSTRAINT "vinho_externo_uva_pkey" PRIMARY KEY ("externalWineId", "grapeId"),
  CONSTRAINT "vinho_externo_uva_externalWineId_fkey" FOREIGN KEY ("externalWineId") REFERENCES "vinhos_externo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "vinho_externo_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "vinho_externo_uva_grapeId_idx" ON "vinho_externo_uva"("grapeId");
