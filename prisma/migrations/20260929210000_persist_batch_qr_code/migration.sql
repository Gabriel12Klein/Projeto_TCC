-- Preserve the stable QR payload in PostgreSQL; historical image paths remain untouched.
ALTER TABLE "lote"
  ADD COLUMN "qrCodePayload" TEXT,
  ADD COLUMN "qrCodeGeneratedAt" TIMESTAMP(3);
