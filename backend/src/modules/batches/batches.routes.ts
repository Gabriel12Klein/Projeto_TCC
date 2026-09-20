import { Router } from 'express';
import { AppError, asyncRoute } from '../../common/http.js';
import { batchesService } from './batches.service.js';
import { batchSchema, batchUpdateSchema } from './batches.schema.js';

const router = Router();
router.get(
  '/',
  asyncRoute(async (req, res) => res.json(await batchesService.list(String(req.query.q ?? '').trim()))),
);
router.post(
  '/',
  asyncRoute(async (req, res) =>
    res.status(201).json(await batchesService.create(batchSchema.parse(req.body))),
  ),
);
router.post(
  '/:id/qr-code',
  asyncRoute(async (_req, _res) => {
    throw new AppError(501, 'QR Code está reservado para trabalhos futuros.');
  }),
);
router.put(
  '/:id',
  asyncRoute(async (req, res) =>
    res.json(await batchesService.update(String(req.params.id), batchUpdateSchema.parse(req.body))),
  ),
);
router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await batchesService.remove(String(req.params.id));
    res.status(204).end();
  }),
);

export default router;
