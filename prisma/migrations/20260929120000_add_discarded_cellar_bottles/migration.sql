ALTER TABLE "garrafa_adega"
  ADD COLUMN "discardedAt" TIMESTAMP(3),
  ADD COLUMN "discardReason" TEXT;

ALTER TABLE "garrafa_adega" DROP CONSTRAINT "garrafa_adega_status_check";
ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_status_check"
  CHECK ("status" IN ('DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA'));

ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_discard_check" CHECK (
  ("status" = 'DESCARTADA' AND "discardedAt" IS NOT NULL AND NULLIF(BTRIM("discardReason"), '') IS NOT NULL)
  OR
  ("status" <> 'DESCARTADA' AND "discardedAt" IS NULL AND "discardReason" IS NULL)
);

ALTER TABLE "garrafa_adega" ADD CONSTRAINT "garrafa_adega_discard_date_check"
  CHECK ("discardedAt" IS NULL OR "discardedAt" >= COALESCE("openedAt", "purchasedAt"));

ALTER TABLE "movimentacao_estoque" DROP CONSTRAINT "movimento_type_valid";
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimento_type_valid"
  CHECK ("type" IN ('ENTRADA', 'CONSUMO', 'AJUSTE', 'ABERTURA', 'DESCARTE'));
