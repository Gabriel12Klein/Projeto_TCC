import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import multer from 'multer';
import { ensureUploadDirectory, uploadsRoot } from '../../common/files.js';
import { AppError } from '../../common/http.js';
import { asyncRoute } from '../../common/http.js';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';
import {
  bottleEventSchema,
  bottleDiscardSchema,
  bottleListFiltersSchema,
  paginationSchema,
  externalWineSchema,
  orderSchema,
  privateAddressSchema,
} from './customer.schema.js';
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
  '/vinicolas-externas',
  asyncRoute(async (_req, res) => {
    res.json(await customerService.listExternalWineries(String(res.locals.user.id)));
  }),
);
router.post(
  '/vinicolas-externas',
  asyncRoute(async (req, res) => {
    res
      .status(201)
      .json(
        await customerService.createExternalWinery(
          String(res.locals.user.id),
          privateAddressSchema.parse(req.body),
        ),
      );
  }),
);
router.put(
  '/vinicolas-externas/:id',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.updateExternalWinery(
        String(res.locals.user.id),
        String(req.params.id),
        privateAddressSchema.parse(req.body),
      ),
    );
  }),
);
router.delete(
  '/pedidos/:id/itens/:itemId/garrafas/uma',
  asyncRoute(async (req, res) => {
    await customerService.removeOrderItemBottles(
      String(res.locals.user.id),
      String(req.params.id),
      String(req.params.itemId),
      false,
    );
    res.status(204).send();
  }),
);
router.delete(
  '/pedidos/:id/itens/:itemId/garrafas',
  asyncRoute(async (req, res) => {
    await customerService.removeOrderItemBottles(
      String(res.locals.user.id),
      String(req.params.id),
      String(req.params.itemId),
      true,
    );
    res.status(204).send();
  }),
);
router.delete(
  '/vinicolas-externas/:id',
  asyncRoute(async (req, res) => {
    await customerService.removeExternalWinery(String(res.locals.user.id), String(req.params.id));
    res.status(204).send();
  }),
);

router.get(
  '/vinhos-externos',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.listExternalWines(
        String(res.locals.user.id),
        req.query.wineryId == null ? undefined : String(req.query.wineryId),
      ),
    );
  }),
);
router.get(
  '/vinhos-externos/:id',
  asyncRoute(async (req, res) => {
    res.json(await customerService.getExternalWine(String(res.locals.user.id), String(req.params.id)));
  }),
);
router.delete(
  '/estoque/garrafas/:id',
  asyncRoute(async (req, res) => {
    await customerService.removeBottle(String(res.locals.user.id), String(req.params.id));
    res.status(204).send();
  }),
);
router.post(
  '/vinhos-externos',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    try {
      if (!req.file) throw new AppError(400, 'Adicione uma foto da garrafa.');
      const payload = req.is('multipart/form-data') ? JSON.parse(req.body.payload) : req.body;
      res
        .status(201)
        .json(
          await customerService.createExternalWine(
            String(res.locals.user.id),
            externalWineSchema.parse(payload),
            `/uploads/inventory/${req.file.filename}`,
          ),
        );
    } catch (error) {
      if (req.file) await unlink(req.file.path).catch(() => undefined);
      if (error instanceof SyntaxError) throw new AppError(400, 'Os dados do vinho são inválidos.');
      throw error;
    }
  }),
);
router.put(
  '/vinhos-externos/:id',
  upload.single('photo'),
  asyncRoute(async (req, res) => {
    try {
      const userId = String(res.locals.user.id);
      const id = String(req.params.id);
      const previousImage = await customerService.getExternalWineImagePath(userId, id);
      const payload = req.is('multipart/form-data') ? JSON.parse(req.body.payload) : req.body;
      const updated = await customerService.updateExternalWine(
        userId,
        id,
        externalWineSchema.parse(payload),
        req.file ? `/uploads/inventory/${req.file.filename}` : undefined,
      );
      if (req.file && previousImage?.startsWith('/uploads/inventory/')) {
        await unlink(join(uploadsRoot, 'inventory', basename(previousImage))).catch(() => undefined);
      }
      res.json(updated);
    } catch (error) {
      if (req.file) await unlink(req.file.path).catch(() => undefined);
      if (error instanceof SyntaxError) throw new AppError(400, 'Os dados do vinho são inválidos.');
      throw error;
    }
  }),
);
router.delete(
  '/vinhos-externos/:id',
  asyncRoute(async (req, res) => {
    const imagePath = await customerService.removeExternalWine(
      String(res.locals.user.id),
      String(req.params.id),
    );
    if (imagePath?.startsWith('/uploads/inventory/')) {
      await unlink(join(uploadsRoot, 'inventory', basename(imagePath))).catch(() => undefined);
    }
    res.status(204).send();
  }),
);

router.get(
  '/locais-compra',
  asyncRoute(async (_req, res) => {
    res.json(await customerService.listPurchaseLocations(String(res.locals.user.id)));
  }),
);
router.post(
  '/locais-compra',
  asyncRoute(async (req, res) => {
    res
      .status(201)
      .json(
        await customerService.createPurchaseLocation(
          String(res.locals.user.id),
          privateAddressSchema.parse(req.body),
        ),
      );
  }),
);
router.put(
  '/locais-compra/:id',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.updatePurchaseLocation(
        String(res.locals.user.id),
        String(req.params.id),
        privateAddressSchema.parse(req.body),
      ),
    );
  }),
);
router.delete(
  '/locais-compra/:id',
  asyncRoute(async (req, res) => {
    await customerService.removePurchaseLocation(String(res.locals.user.id), String(req.params.id));
    res.status(204).send();
  }),
);

router.get(
  '/pedidos',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.listOrdersPage(String(res.locals.user.id), paginationSchema.parse(req.query)),
    );
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
router.get(
  '/estoque/garrafas',
  asyncRoute(async (req, res) => {
    const filters = bottleListFiltersSchema.parse(req.query);
    res.json(await customerService.listBottlesPage(String(res.locals.user.id), filters));
  }),
);
router.get(
  '/estoque/tipos-vinho',
  asyncRoute(async (_req, res) => {
    res.json(await customerService.listBottleWineTypes(String(res.locals.user.id)));
  }),
);
router.get(
  '/estoque/garrafas/:id',
  asyncRoute(async (req, res) => {
    res.json(await customerService.getBottle(String(res.locals.user.id), String(req.params.id)));
  }),
);
router.post(
  '/estoque/garrafas/:id/abrir',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.openBottle(
        String(res.locals.user.id),
        String(req.params.id),
        bottleEventSchema.parse(req.body),
      ),
    );
  }),
);
router.post(
  '/estoque/garrafas/:id/consumir',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.finishBottle(
        String(res.locals.user.id),
        String(req.params.id),
        bottleEventSchema.parse(req.body),
      ),
    );
  }),
);
router.post(
  '/estoque/garrafas/:id/descartar',
  asyncRoute(async (req, res) => {
    res.json(
      await customerService.discardBottle(
        String(res.locals.user.id),
        String(req.params.id),
        bottleDiscardSchema.parse(req.body),
      ),
    );
  }),
);

export default router;
