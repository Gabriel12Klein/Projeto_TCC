BEGIN;
ALTER TABLE vinicola ADD COLUMN singleton BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vinicola ADD CONSTRAINT vinicola_singleton_true CHECK (singleton);
CREATE UNIQUE INDEX vinicola_singleton_key ON vinicola(singleton);
ALTER TABLE vinicola ADD COLUMN phone TEXT;
INSERT INTO vinicola (id, name, cnpj, city, state, "updatedAt")
SELECT 'winery-vinum', 'Vinum', '', '', '', now() WHERE NOT EXISTS (SELECT 1 FROM vinicola);
ALTER TABLE usuario ADD COLUMN "wineryId" TEXT;
ALTER TABLE usuario ADD CONSTRAINT "usuario_wineryId_fkey" FOREIGN KEY ("wineryId") REFERENCES vinicola(id) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "usuario_wineryId_idx" ON usuario("wineryId");
UPDATE usuario u SET "wineryId" = (SELECT id FROM vinicola)
FROM role r WHERE r.id = u."roleId" AND r.name IN ('ADMIN','EDITOR');
UPDATE vinicola v SET phone = u.phone FROM usuario u JOIN role r ON r.id=u."roleId"
WHERE r.name='ADMIN' AND u."wineryId"=v.id AND u.phone IS NOT NULL
AND (SELECT count(*) FROM usuario a JOIN role ar ON ar.id=a."roleId" WHERE ar.name='ADMIN')=1;
CREATE FUNCTION assert_user_winery_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE role_name TEXT;
BEGIN
  SELECT name INTO role_name FROM role WHERE id=NEW."roleId";
  IF (role_name IN ('ADMIN','EDITOR') AND NEW."wineryId" IS NULL)
     OR (role_name='CUSTOMER' AND NEW."wineryId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Papel e vínculo com a vinícola são incompatíveis' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER usuario_winery_role BEFORE INSERT OR UPDATE ON usuario
FOR EACH ROW EXECUTE FUNCTION assert_user_winery_role();
COMMIT;
