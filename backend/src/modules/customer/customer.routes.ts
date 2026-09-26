import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import multer from 'multer';
import { ensureUploadDirectory } from '../../common/files.js';
import { AppError } from '../../common/http.js';
import { asyncRoute } from '../../common/http.js';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';
import { consumptionSchema, orderSchema } from './customer.schema.js';
import { customerService } from './customer.service.js';

const router = Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: ensureUploadDirectory('inventory'),
    filename: (_req, file, callback) =>
      callback(
        null,
        `${randomUUID()}.${file.mimetype === 'image/jpeg' ? 'jpg' : file.mimetype === 'image/webp' ? 'webp' : 'png'}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(file.mimetype))
      return callback(new AppError(400, 'Envie uma imagem JPG, PNG ou WebP.'));
    callback(null, true);
  },
});
router.use(requireAuth, requireRoles('CUSTOMER'));

router.get(
  '/pedidos',
  asyncRoute(async (_req, res) => {
    res.json(await customerService.listOrders(String(res.locals.user.id)));
  }),
);
router.post(
  '/pedidos',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    try {
      let payload = req.body;
      if (req.is('multipart/form-data')) {
        try {
          payload = JSON.parse(req.body.payload);
        } catch {
          throw new AppError(400, 'Os dados do pedido são inválidos.');
        }
      }
      const input = orderSchema.parse(payload);
      if (req.file && input.items.length !== 1)
        throw new AppError(400, 'Envie uma foto para um rótulo por vez.');
      const order = await customerService.createOrder(
        String(res.locals.user.id),
        input,
        req.file ? `/uploads/inventory/${req.file.filename}` : undefined,
      );
      res.status(201).json(order);
    } catch (error) {
      if (req.file) await unlink(req.file.path).catch(() => undefined);
      throw error;
    }
  }),
);
router.delete(
  '/pedidos/:id',
  asyncRoute(async (req, res) => {
    await customerService.removeOrder(String(res.locals.user.id), String(req.params.id));
    res.status(204).send();
  }),
);
router.put(
  '/pedidos/:id/itens/:itemId',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    try {
      let payload = req.body;
      if (req.is('multipart/form-data')) {
        try {
          payload = JSON.parse(req.body.payload);
        } catch {
          throw new AppError(400, 'Os dados do pedido são inválidos.');
        }
      }
      res.json(
        await customerService.updateOrderItem(
          String(res.locals.user.id),
          String(req.params.id),
          String(req.params.itemId),
          orderSchema.parse(payload),
          req.file ? `/uploads/inventory/${req.file.filename}` : undefined,
        ),
      );
    } catch (error) {
      if (req.file) await unlink(req.file.path).catch(() => undefined);
      throw error;
    }
  }),
);
router.get(
  '/estoque',
  asyncRoute(async (_req, res) => {
    res.json(await customerService.listInventory(String(res.locals.user.id)));
  }),
);
router.get(
  '/estoque/resumo',
  asyncRoute(async (req, res) => {
    const year = req.query.year == null ? undefined : Number(req.query.year);
    if (year != null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      throw new AppError(400, 'Informe um ano válido para consultar o consumo.');
    }
    res.json(await customerService.getInventoryDashboard(String(res.locals.user.id), year));
  }),
);
router.post(
  '/estoque/:id/consumos',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.registerConsumption(
        String(res.locals.user.id),
        String(req.params.id),
        consumptionSchema.parse(req.body),
      ),
    );
  }),
);

export default router;
