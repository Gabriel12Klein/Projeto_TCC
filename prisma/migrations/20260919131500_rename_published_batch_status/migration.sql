UPDATE "lote"
SET "status" = 'Publicado para consulta no banco de dados'
WHERE "status" IN ('Publicado', 'Publicado para consulta', 'Publicado para consulta no banco de dados');
