-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
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
    "roleId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessao" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinicola" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "email" TEXT,
    "walletAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vinicola_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinho" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "wineryId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "volumeMl" INTEGER NOT NULL,
    "alcoholPercentage" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "caracteristicas" TEXT,
    "aromas" TEXT,
    "notas_degustacao" TEXT,
    "harmonizacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "imagem_vinho_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_vinho" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_vinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uva" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinho_uva" (
    "wineId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,

    CONSTRAINT "vinho_uva_pkey" PRIMARY KEY ("wineId","grapeId")
);

-- CreateTable
CREATE TABLE "imagem_vinho" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagem_vinho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safra" (
    "id" TEXT NOT NULL,
    "wineId" TEXT,
    "identifier" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "observations" TEXT,
    "status" TEXT NOT NULL,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safra_uva" (
    "vintageId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,

    CONSTRAINT "safra_uva_pkey" PRIMARY KEY ("vintageId","grapeId")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" TEXT NOT NULL,
    "wineId" TEXT,
    "vintageId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "quantityLiters" DOUBLE PRECISION NOT NULL,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "registrationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "blockchainRef" TEXT,
    "qrCodePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote_uva" (
    "batchId" TEXT NOT NULL,
    "grapeId" TEXT NOT NULL,

    CONSTRAINT "lote_uva_pkey" PRIMARY KEY ("batchId","grapeId")
);

-- CreateTable
CREATE TABLE "pedido" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'VINICULA',
    "status" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pedido" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "wineId" TEXT,
    "wineName" TEXT NOT NULL,
    "wineryName" TEXT,
    "vintageYear" INTEGER,
    "quantityBottles" INTEGER NOT NULL,
    "volumeMl" INTEGER,
    "unitPrice" DECIMAL(10,2),
    "inventoryItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_item" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wineId" TEXT,
    "name" TEXT NOT NULL,
    "wineryName" TEXT,
    "quantityBottles" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoque_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacao_estoque" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityBottles" INTEGER NOT NULL,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_roleId_idx" ON "usuario"("roleId");

-- CreateIndex
CREATE INDEX "usuario_email_idx" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sessao_tokenHash_key" ON "sessao"("tokenHash");

-- CreateIndex
CREATE INDEX "sessao_userId_idx" ON "sessao"("userId");

-- CreateIndex
CREATE INDEX "sessao_expiresAt_idx" ON "sessao"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "vinicola_cnpj_key" ON "vinicola"("cnpj");

-- CreateIndex
CREATE INDEX "vinicola_name_idx" ON "vinicola"("name");

-- CreateIndex
CREATE INDEX "vinicola_status_idx" ON "vinicola"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vinho_slug_key" ON "vinho"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "vinho_imagem_vinho_id_key" ON "vinho"("imagem_vinho_id");

-- CreateIndex
CREATE INDEX "vinho_wineryId_idx" ON "vinho"("wineryId");

-- CreateIndex
CREATE INDEX "vinho_typeId_idx" ON "vinho"("typeId");

-- CreateIndex
CREATE INDEX "vinho_createdById_idx" ON "vinho"("createdById");

-- CreateIndex
CREATE INDEX "vinho_status_idx" ON "vinho"("status");

-- CreateIndex
CREATE INDEX "vinho_name_idx" ON "vinho"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_vinho_name_key" ON "tipo_vinho"("name");

-- CreateIndex
CREATE INDEX "tipo_vinho_active_idx" ON "tipo_vinho"("active");

-- CreateIndex
CREATE UNIQUE INDEX "uva_name_key" ON "uva"("name");

-- CreateIndex
CREATE INDEX "uva_active_idx" ON "uva"("active");

-- CreateIndex
CREATE INDEX "vinho_uva_grapeId_idx" ON "vinho_uva"("grapeId");

-- CreateIndex
CREATE INDEX "imagem_vinho_isPrimary_idx" ON "imagem_vinho"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "safra_identifier_key" ON "safra"("identifier");

-- CreateIndex
CREATE INDEX "safra_wineId_idx" ON "safra"("wineId");

-- CreateIndex
CREATE INDEX "safra_year_idx" ON "safra"("year");

-- CreateIndex
CREATE INDEX "safra_status_idx" ON "safra"("status");

-- CreateIndex
CREATE INDEX "safra_uva_grapeId_idx" ON "safra_uva"("grapeId");

-- CreateIndex
CREATE UNIQUE INDEX "lote_code_key" ON "lote"("code");

-- CreateIndex
CREATE INDEX "lote_vintageId_idx" ON "lote"("vintageId");

-- CreateIndex
CREATE INDEX "lote_wineId_idx" ON "lote"("wineId");

-- CreateIndex
CREATE INDEX "lote_status_idx" ON "lote"("status");

-- CreateIndex
CREATE INDEX "lote_productionDate_idx" ON "lote"("productionDate");

-- CreateIndex
CREATE INDEX "lote_uva_grapeId_idx" ON "lote_uva"("grapeId");

-- CreateIndex
CREATE INDEX "pedido_userId_idx" ON "pedido"("userId");

-- CreateIndex
CREATE INDEX "pedido_status_idx" ON "pedido"("status");

-- CreateIndex
CREATE INDEX "pedido_purchaseDate_idx" ON "pedido"("purchaseDate");

-- CreateIndex
CREATE INDEX "item_pedido_orderId_idx" ON "item_pedido"("orderId");

-- CreateIndex
CREATE INDEX "item_pedido_wineId_idx" ON "item_pedido"("wineId");

-- CreateIndex
CREATE INDEX "item_pedido_inventoryItemId_idx" ON "item_pedido"("inventoryItemId");

-- CreateIndex
CREATE INDEX "estoque_item_userId_idx" ON "estoque_item"("userId");

-- CreateIndex
CREATE INDEX "estoque_item_wineId_idx" ON "estoque_item"("wineId");

-- CreateIndex
CREATE INDEX "estoque_item_active_idx" ON "estoque_item"("active");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_inventoryItemId_idx" ON "movimentacao_estoque"("inventoryItemId");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_type_idx" ON "movimentacao_estoque"("type");

-- CreateIndex
CREATE INDEX "movimentacao_estoque_occurredAt_idx" ON "movimentacao_estoque"("occurredAt");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES "vinicola"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "tipo_vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho" ADD CONSTRAINT "vinho_imagem_vinho_id_fkey" FOREIGN KEY ("imagem_vinho_id") REFERENCES "imagem_vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho_uva" ADD CONSTRAINT "vinho_uva_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinho_uva" ADD CONSTRAINT "vinho_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safra" ADD CONSTRAINT "safra_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safra_uva" ADD CONSTRAINT "safra_uva_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "safra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safra_uva" ADD CONSTRAINT "safra_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "safra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote_uva" ADD CONSTRAINT "lote_uva_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote_uva" ADD CONSTRAINT "lote_uva_grapeId_fkey" FOREIGN KEY ("grapeId") REFERENCES "uva"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "item_pedido_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "estoque_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_item" ADD CONSTRAINT "estoque_item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_item" ADD CONSTRAINT "estoque_item_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "vinho"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimentacao_estoque_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "estoque_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
