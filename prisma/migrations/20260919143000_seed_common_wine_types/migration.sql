INSERT INTO "tipo_vinho" ("id", "name", "description", "active", "createdAt", "updatedAt") VALUES
('wine-type-tinto', 'Tinto', 'Vinho produzido com uvas tintas, geralmente com cor, corpo e taninos mais marcantes.', true, NOW(), NOW()),
('wine-type-branco', 'Branco', 'Vinho de coloração clara, normalmente fresco, leve e elaborado com uvas brancas ou tintas sem as cascas.', true, NOW(), NOW()),
('wine-type-rose', 'Rosé', 'Vinho de coloração rosada, elaborado com contato breve entre o mosto e as cascas das uvas tintas.', true, NOW(), NOW()),
('wine-type-espumante', 'Espumante', 'Vinho que apresenta borbulhas e gás carbônico produzido naturalmente durante a elaboração.', true, NOW(), NOW()),
('wine-type-frisante', 'Frisante', 'Vinho levemente gaseificado, com menor pressão e quantidade de borbulhas que um espumante.', true, NOW(), NOW()),
('wine-type-fortificado', 'Fortificado', 'Vinho que recebe adição de aguardente vínica, apresentando maior teor alcoólico e concentração.', true, NOW(), NOW()),
('wine-type-licoroso', 'Licoroso', 'Vinho doce ou concentrado, com textura encorpada e maior intensidade de aromas e sabores.', true, NOW(), NOW()),
('wine-type-sobremesa', 'Vinho de sobremesa', 'Vinho geralmente doce, elaborado para acompanhar sobremesas, queijos e preparações delicadas.', true, NOW(), NOW()),
('wine-type-laranja', 'Vinho laranja', 'Vinho branco elaborado com contato prolongado do mosto com as cascas, adquirindo cor e estrutura.', true, NOW(), NOW()),
('wine-type-natural', 'Vinho natural', 'Vinho elaborado com mínima intervenção, priorizando uvas de cultivo responsável e poucos aditivos.', true, NOW(), NOW()),
('wine-type-organic', 'Vinho orgânico', 'Vinho produzido com uvas cultivadas sem agrotóxicos sintéticos, conforme práticas de agricultura orgânica.', true, NOW(), NOW()),
('wine-type-sem-alcool', 'Vinho sem álcool', 'Bebida elaborada a partir de vinho com remoção total ou significativa do álcool.', true, NOW(), NOW())
ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "active" = true;
