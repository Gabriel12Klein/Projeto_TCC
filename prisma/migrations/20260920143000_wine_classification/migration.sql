BEGIN;
CREATE TABLE classificacao (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX classificacao_active_idx ON classificacao(active);
ALTER TABLE vinho ADD COLUMN "classificationId" TEXT;
ALTER TABLE vinho ADD CONSTRAINT "vinho_classificationId_fkey"
FOREIGN KEY ("classificationId") REFERENCES classificacao(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "vinho_classificationId_idx" ON vinho("classificationId");
INSERT INTO classificacao (id,name,"updatedAt") VALUES
('classification-seco','Seco',now()),('classification-meio-seco','Meio Seco',now()),
('classification-suave','Suave',now()),('classification-nature','Nature',now()),
('classification-extra-brut','Extra Brut',now()),('classification-brut','Brut',now()),
('classification-sec','Sec',now()),('classification-demi-sec','Demi-Sec',now()),
('classification-doce','Doce',now()),('classification-moscatel','Moscatel',now())
ON CONFLICT DO NOTHING;
-- Existing wines keep NULL until their actual classification is supplied.
CREATE FUNCTION require_new_wine_classification() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."classificationId" IS NULL THEN
   RAISE EXCEPTION 'Informe a classificação do vinho' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER vinho_new_classification BEFORE INSERT ON vinho
FOR EACH ROW EXECUTE FUNCTION require_new_wine_classification();
COMMIT;
