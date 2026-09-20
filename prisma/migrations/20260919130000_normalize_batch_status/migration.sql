UPDATE "lote" SET "status" = 'Publicado para consulta' WHERE "status" IN ('Publicado', 'Publicado para consulta');
UPDATE "lote" SET "status" = 'Registrado na blockchain' WHERE "status" IN ('Registrado', 'Registrado na blockchain');
UPDATE "lote" SET "status" = 'Aguardando registro' WHERE "status" IN ('Pendente', 'Aguardando registro');
