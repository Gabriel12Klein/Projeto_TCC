import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { winesService } from './wines.service.js';
import { wineSchema, wineUpdateSchema } from './wines.schema.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => res.json(await winesService.list(String(req.query.q ?? '').trim()))));
router.post('/', asyncRoute(async (req, res) => res.status(201).json(await winesService.create(wineSchema.parse(req.body)))));
router.put('/:id', asyncRoute(async (req, res) => res.json(await winesService.update(String(req.params.id), wineUpdateSchema.parse(req.body)))));
router.delete('/:id', asyncRoute(async (req, res) => {
  await winesService.remove(String(req.params.id));
  res.status(204).end();
}));

export default router;
