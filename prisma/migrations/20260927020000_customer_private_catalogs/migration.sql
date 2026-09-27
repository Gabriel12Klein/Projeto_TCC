-- Private customer references. Official VINUM catalog tables remain unchanged.
CREATE TABLE "outras_vinicolas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "outras_vinicolas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vinhos_externo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalWineryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vinhos_externo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "locais_de_compra" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "locais_de_compra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outras_vinicolas_userId_name_key" ON "outras_vinicolas"("userId", "name");
CREATE UNIQUE INDEX "outras_vinicolas_id_userId_key" ON "outras_vinicolas"("id", "userId");
CREATE INDEX "outras_vinicolas_userId_idx" ON "outras_vinicolas"("userId");

CREATE UNIQUE INDEX "vinhos_externo_userId_externalWineryId_name_key" ON "vinhos_externo"("userId", "externalWineryId", "name");
CREATE UNIQUE INDEX "vinhos_externo_id_userId_key" ON "vinhos_externo"("id", "userId");
CREATE INDEX "vinhos_externo_userId_idx" ON "vinhos_externo"("userId");
CREATE INDEX "vinhos_externo_externalWineryId_idx" ON "vinhos_externo"("externalWineryId");

CREATE UNIQUE INDEX "locais_de_compra_userId_name_key" ON "locais_de_compra"("userId", "name");
CREATE UNIQUE INDEX "locais_de_compra_id_userId_key" ON "locais_de_compra"("id", "userId");
CREATE INDEX "locais_de_compra_userId_idx" ON "locais_de_compra"("userId");

ALTER TABLE "outras_vinicolas"
  ADD CONSTRAINT "outras_vinicolas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vinhos_externo"
  ADD CONSTRAINT "vinhos_externo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "vinhos_externo_externalWineryId_userId_fkey" FOREIGN KEY ("externalWineryId", "userId") REFERENCES "outras_vinicolas"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "locais_de_compra"
  ADD CONSTRAINT "locais_de_compra_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pedido" ADD COLUMN "purchaseLocationId" TEXT;
ALTER TABLE "item_pedido" ADD COLUMN "externalWineId" TEXT;
ALTER TABLE "estoque_item" ADD COLUMN "externalWineId" TEXT;

CREATE INDEX "pedido_purchaseLocationId_idx" ON "pedido"("purchaseLocationId");
CREATE INDEX "item_pedido_externalWineId_idx" ON "item_pedido"("externalWineId");
CREATE UNIQUE INDEX "estoque_item_userId_externalWineId_key" ON "estoque_item"("userId", "externalWineId");
CREATE INDEX "estoque_item_externalWineId_idx" ON "estoque_item"("externalWineId");

ALTER TABLE "pedido"
  ADD CONSTRAINT "pedido_purchaseLocationId_userId_fkey" FOREIGN KEY ("purchaseLocationId", "userId") REFERENCES "locais_de_compra"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_pedido"
  ADD CONSTRAINT "item_pedido_externalWineId_fkey" FOREIGN KEY ("externalWineId") REFERENCES "vinhos_externo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "item_pedido_single_wine_source" CHECK (NOT ("wineId" IS NOT NULL AND "externalWineId" IS NOT NULL));

ALTER TABLE "estoque_item"
  ADD CONSTRAINT "estoque_item_externalWineId_userId_fkey" FOREIGN KEY ("externalWineId", "userId") REFERENCES "vinhos_externo"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "estoque_item_single_wine_source" CHECK (NOT ("wineId" IS NOT NULL AND "externalWineId" IS NOT NULL));

-- Legacy external labels and purchase-location snapshots intentionally remain
-- unlinked (new FK columns stay NULL) until the customer explicitly selects a
-- private reference. No fictitious winery or location is created.
