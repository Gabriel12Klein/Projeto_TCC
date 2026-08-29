import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { wineriesService } from './wineries.service.js';
import { winerySchema, wineryUpdateSchema } from './wineries.schema.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json(await wineriesService.list(String(req.query.q ?? '').trim()));
  }),
);
router.post(
  '/',
  asyncRoute(async (req, res) => {
    res.status(201).json(await wineriesService.create(winerySchema.parse(req.body)));
  }),
);
router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    res.json(await wineriesService.update(String(req.params.id), wineryUpdateSchema.parse(req.body)));
  }),
);
router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    await wineriesService.remove(String(req.params.id));
    res.status(204).end();
  }),
);

export default router;
