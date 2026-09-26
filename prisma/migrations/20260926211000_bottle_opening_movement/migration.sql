ALTER TABLE "movimentacao_estoque" DROP CONSTRAINT "movimento_type_valid";
ALTER TABLE "movimentacao_estoque" ADD CONSTRAINT "movimento_type_valid"
  CHECK ("type" IN ('ENTRADA', 'CONSUMO', 'AJUSTE', 'ABERTURA'));
