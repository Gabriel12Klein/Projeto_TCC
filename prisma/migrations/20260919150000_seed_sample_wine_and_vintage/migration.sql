INSERT INTO "vinho" (
  "id", "createdById", "typeId", "name", "slug", "volumeMl", "alcoholPercentage",
  "description", "caracteristicas", "aromas", "notas_degustacao", "harmonizacao",
  "status", "createdAt", "updatedAt"
)
SELECT
  'wine-vinum-reserva-2024',
  'usr-1787705598172-cba1c5',
  t."id",
  'Vinum Reserva Cabernet Merlot',
  'vinum-reserva-cabernet-merlot',
  750,
  14.2,
  'Vinho tinto encorpado e equilibrado, elaborado para expressar a identidade da vinícola e a qualidade das uvas selecionadas.',
  'Cor rubi intensa, corpo médio para encorpado, taninos maduros, boa acidez e final persistente.',
  'Aromas de frutas negras maduras, ameixa, cassis, especiarias e leves notas de baunilha.',
  'Na boca apresenta equilíbrio entre fruta, acidez e taninos, com final longo e agradável.',
  'Harmoniza com carnes assadas, massas com molhos intensos, risotos, queijos curados e pratos da culinária brasileira.',
  'PUBLISHED',
  NOW(),
  NOW()
FROM "tipo_vinho" t
WHERE t."name" = 'Tinto'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "vinho_uva" ("wineId", "grapeId")
SELECT 'wine-vinum-reserva-2024', "id" FROM "uva" WHERE "name" IN ('Cabernet Sauvignon', 'Merlot')
ON CONFLICT DO NOTHING;

INSERT INTO "safra" (
  "id", "wineId", "identifier", "year", "observations", "status", "supplier", "createdAt", "updatedAt"
)
VALUES (
  'vintage-vinum-reserva-2024',
  'wine-vinum-reserva-2024',
  'SF24-T01',
  2024,
  'Safra com excelente maturação das uvas, boa concentração de aromas e equilíbrio entre acidez e taninos.',
  'Concluída',
  'Vinum Vinícola',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "safra_uva" ("vintageId", "grapeId")
SELECT 'vintage-vinum-reserva-2024', "id" FROM "uva" WHERE "name" IN ('Cabernet Sauvignon', 'Merlot')
ON CONFLICT DO NOTHING;
