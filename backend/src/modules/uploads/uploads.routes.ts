import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { ensureUploadDirectory } from '../../common/files.js';
import { AppError, asyncRoute } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const storage = multer.diskStorage({
  destination: ensureUploadDirectory('wines'),
  filename: (_req, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)),
});

const router = Router();

router.post('/wines/:wineId', upload.single('image'), asyncRoute(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Envie uma imagem JPEG, PNG ou WebP de até 5 MB.');
  const wineId = String(req.params.wineId);
  await prisma.wine.findUniqueOrThrow({ where: { id: wineId } });
  const path = `/uploads/wines/${req.file.filename}`;
  const image = await prisma.$transaction(async (transaction) => {
    await transaction.wineImage.updateMany({ where: { wineId }, data: { isPrimary: false } });
    const created = await transaction.wineImage.create({
      data: { wineId, path, altText: req.body.altText || null, isPrimary: true },
    });
    await transaction.wine.update({ where: { id: wineId }, data: { imagePath: path } });
    return created;
  });
  res.status(201).json({ id: image.id, path: image.path, isPrimary: image.isPrimary });
}));

export default router;
