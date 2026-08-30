CREATE TABLE "role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

CREATE TABLE "status_safra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "status_safra_name_key" ON "status_safra"("name");

CREATE TABLE "status_lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "status_lote_name_key" ON "status_lote"("name");

ALTER TABLE "usuario" ADD COLUMN "roleId" TEXT;
ALTER TABLE "safra" ADD COLUMN "statusId" TEXT;
ALTER TABLE "safra" ADD COLUMN "supplier" TEXT;
ALTER TABLE "lote" ADD COLUMN "statusId" TEXT;

CREATE TABLE "lote_uva" (
    "batchId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,
    PRIMARY KEY ("batchId", "grapeId"),
    CONSTRAINT "lote_uva_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "lote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lote_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "lote_uva_grapeId_idx" ON "lote_uva"("grapeId");

INSERT OR IGNORE INTO "role" ("id", "name", "description") VALUES
  ('role-admin', 'ADMIN', 'Administrador e dono da vinícola.'),
  ('role-customer', 'CUSTOMER', 'Cliente do sistema.'),
  ('role-editor', 'EDITOR', 'Editor administrativo legado.');

UPDATE "usuario"
SET "roleId" = (SELECT "id" FROM "role" WHERE "role"."name" = "usuario"."role")
WHERE "roleId" IS NULL;

INSERT OR IGNORE INTO "status_safra" ("id", "name", "description") VALUES
  ('status-safra-producao', 'Em produção', 'Safra em processamento e utilização.'),
  ('status-safra-finalizada', 'Finalizada', 'Safra concluída.');

UPDATE "safra"
SET "status" = CASE
  WHEN "status" IN ('Em andamento', 'Em produção') THEN 'Em produção'
  WHEN "status" IN ('Encerrada', 'Finalizada') THEN 'Finalizada'
  ELSE "status"
END;

UPDATE "safra"
SET "statusId" = (
  SELECT "id" FROM "status_safra" WHERE "status_safra"."name" = "safra"."status"
)
WHERE "statusId" IS NULL;

INSERT OR IGNORE INTO "status_lote" ("id", "name", "description") VALUES
  ('status-lote-pendente', 'Pendente', 'Lote ainda não registrado na blockchain.'),
  ('status-lote-registrado', 'Registrado', 'Lote registrado na blockchain.'),
  ('status-lote-publicado', 'Publicado', 'Informações do lote disponíveis para consulta.');

UPDATE "lote"
SET "statusId" = (
  SELECT "id" FROM "status_lote" WHERE "status_lote"."name" = "lote"."status"
)
WHERE "statusId" IS NULL;

INSERT OR IGNORE INTO "lote_uva" ("batchId", "grapeId")
SELECT l."id", su."grapeId"
FROM "lote" l
JOIN "safra_uva" su ON su."vintageId" = l."vintageId";
