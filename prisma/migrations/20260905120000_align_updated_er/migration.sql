-- Alinha o banco MySQL ao Diagrama ER atualizado e preserva os dados úteis.

-- A descrição complementar deixa de ser uma coluna isolada, mas seu conteúdo
-- permanece disponível na descrição principal do vinho.
UPDATE `vinho`
SET `description` = CONCAT(
  `description`,
  '\n\nInformações complementares: ',
  `informacoes_complementares`
)
WHERE `informacoes_complementares` IS NOT NULL
  AND TRIM(`informacoes_complementares`) <> '';

-- Converte a associação de imagens de 1:N para a associação opcional 1:1
-- definida no diagrama (vinho.imagem_vinho_id -> imagem_vinho.id).
ALTER TABLE `vinho`
  ADD COLUMN `imagem_vinho_id` VARCHAR(191) NULL;

UPDATE `vinho` AS `v`
JOIN `imagem_vinho` AS `i` ON `i`.`wineId` = `v`.`id`
SET `v`.`imagem_vinho_id` = `i`.`id`
WHERE `i`.`isPrimary` = 1;

ALTER TABLE `vinho`
  ADD UNIQUE INDEX `vinho_imagem_vinho_id_key` (`imagem_vinho_id`),
  ADD CONSTRAINT `vinho_imagem_vinho_id_fkey`
    FOREIGN KEY (`imagem_vinho_id`) REFERENCES `imagem_vinho` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `imagem_vinho`
  DROP FOREIGN KEY `imagem_vinho_wineId_fkey`,
  DROP INDEX `imagem_vinho_wineId_idx`,
  DROP COLUMN `wineId`;

-- Remove colunas textuais que repetiam dados já normalizados por FK/tabelas de junção.
ALTER TABLE `usuario`
  DROP COLUMN `role`;

ALTER TABLE `vinho`
  DROP COLUMN `type`,
  DROP COLUMN `grapes`,
  DROP COLUMN `informacoes_complementares`,
  DROP COLUMN `imagePath`;

-- Safra e lote possuem um único campo de status no novo diagrama.
ALTER TABLE `safra`
  DROP FOREIGN KEY `safra_statusId_fkey`,
  DROP INDEX `safra_statusId_idx`,
  DROP COLUMN `statusId`;

ALTER TABLE `lote`
  DROP FOREIGN KEY `lote_statusId_fkey`,
  DROP INDEX `lote_statusId_idx`,
  DROP COLUMN `statusId`;

DROP TABLE `status_safra`;
DROP TABLE `status_lote`;
