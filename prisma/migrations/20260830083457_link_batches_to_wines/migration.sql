-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wineId" TEXT,
    "vintageId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quantityLiters" REAL NOT NULL,
    "productionDate" DATETIME NOT NULL,
    "registrationDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "statusId" TEXT,
    "blockchainRef" TEXT,
    "qrCodePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lote_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "lote_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "safra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lote_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "status_lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_lote" ("blockchainRef", "code", "createdAt", "id", "productionDate", "qrCodePath", "quantityLiters", "registrationDate", "status", "statusId", "updatedAt", "vintageId") SELECT "blockchainRef", "code", "createdAt", "id", "productionDate", "qrCodePath", "quantityLiters", "registrationDate", "status", "statusId", "updatedAt", "vintageId" FROM "lote";
DROP TABLE "lote";
ALTER TABLE "new_lote" RENAME TO "lote";
CREATE UNIQUE INDEX "lote_code_key" ON "lote"("code");
CREATE INDEX "lote_vintageId_idx" ON "lote"("vintageId");
CREATE INDEX "lote_wineId_idx" ON "lote"("wineId");
CREATE INDEX "lote_status_idx" ON "lote"("status");
CREATE TABLE "new_safra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wineId" TEXT,
    "identifier" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "observations" TEXT,
    "status" TEXT NOT NULL,
    "statusId" TEXT,
    "supplier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "safra_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "safra_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "status_safra" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_safra" ("createdAt", "id", "identifier", "observations", "status", "statusId", "supplier", "updatedAt", "wineId", "year") SELECT "createdAt", "id", "identifier", "observations", "status", "statusId", "supplier", "updatedAt", "wineId", "year" FROM "safra";
DROP TABLE "safra";
ALTER TABLE "new_safra" RENAME TO "safra";
CREATE UNIQUE INDEX "safra_identifier_key" ON "safra"("identifier");
CREATE INDEX "safra_wineId_idx" ON "safra"("wineId");
CREATE INDEX "safra_year_idx" ON "safra"("year");
CREATE TABLE "new_tipo_vinho" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_tipo_vinho" ("active", "createdAt", "description", "id", "name", "updatedAt") SELECT "active", "createdAt", "description", "id", "name", "updatedAt" FROM "tipo_vinho";
DROP TABLE "tipo_vinho";
ALTER TABLE "new_tipo_vinho" RENAME TO "tipo_vinho";
CREATE UNIQUE INDEX "tipo_vinho_name_key" ON "tipo_vinho"("name");
CREATE TABLE "new_usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "address" TEXT,
    "phone" TEXT,
    "birthDate" TEXT,
    "street" TEXT,
    "addressNumber" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "roleId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "usuario_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_usuario" ("active", "address", "addressNumber", "age", "birthDate", "city", "country", "createdAt", "email", "id", "name", "passwordHash", "passwordSalt", "phone", "role", "roleId", "state", "street", "updatedAt") SELECT "active", "address", "addressNumber", "age", "birthDate", "city", "country", "createdAt", "email", "id", "name", "passwordHash", "passwordSalt", "phone", "role", "roleId", "state", "street", "updatedAt" FROM "usuario";
DROP TABLE "usuario";
ALTER TABLE "new_usuario" RENAME TO "usuario";
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");
CREATE TABLE "new_uva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_uva" ("active", "createdAt", "description", "id", "name", "updatedAt") SELECT "active", "createdAt", "description", "id", "name", "updatedAt" FROM "uva";
DROP TABLE "uva";
ALTER TABLE "new_uva" RENAME TO "uva";
CREATE UNIQUE INDEX "uva_name_key" ON "uva"("name");
CREATE TABLE "new_vinho" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdById" TEXT,
    "wineryId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "grapes" TEXT NOT NULL,
    "volumeMl" INTEGER NOT NULL,
    "alcoholPercentage" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "imagePath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vinho_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vinho_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "vinicola" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "vinho_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "tipo_vinho" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_vinho" ("alcoholPercentage", "createdAt", "createdById", "description", "grapes", "id", "imagePath", "name", "slug", "status", "type", "typeId", "updatedAt", "volumeMl", "wineryId") SELECT "alcoholPercentage", "createdAt", "createdById", "description", "grapes", "id", "imagePath", "name", "slug", "status", "type", "typeId", "updatedAt", "volumeMl", "wineryId" FROM "vinho";
DROP TABLE "vinho";
ALTER TABLE "new_vinho" RENAME TO "vinho";
CREATE UNIQUE INDEX "vinho_slug_key" ON "vinho"("slug");
CREATE INDEX "vinho_wineryId_idx" ON "vinho"("wineryId");
CREATE INDEX "vinho_typeId_idx" ON "vinho"("typeId");
CREATE INDEX "vinho_createdById_idx" ON "vinho"("createdById");
CREATE INDEX "vinho_status_idx" ON "vinho"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineIndex
DROP INDEX "WineImage_wineId_idx";
CREATE INDEX "imagem_vinho_wineId_idx" ON "imagem_vinho"("wineId");

-- RedefineIndex
DROP INDEX "VintageGrape_grapeId_idx";
CREATE INDEX "safra_uva_grapeId_idx" ON "safra_uva"("grapeId");

-- RedefineIndex
DROP INDEX "Session_expiresAt_idx";
CREATE INDEX "sessao_expiresAt_idx" ON "sessao"("expiresAt");

-- RedefineIndex
DROP INDEX "Session_userId_idx";
CREATE INDEX "sessao_userId_idx" ON "sessao"("userId");

-- RedefineIndex
DROP INDEX "Session_tokenHash_key";
CREATE UNIQUE INDEX "sessao_tokenHash_key" ON "sessao"("tokenHash");

-- RedefineIndex
DROP INDEX "WineGrape_grapeId_idx";
CREATE INDEX "vinho_uva_grapeId_idx" ON "vinho_uva"("grapeId");

-- RedefineIndex
DROP INDEX "Winery_cnpj_key";
CREATE UNIQUE INDEX "vinicola_cnpj_key" ON "vinicola"("cnpj");
