import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { vintagesService } from './vintages.service.js';
import { vintageSchema, vintageUpdateSchema } from './vintages.schema.js';

const router = Router();
router.get('/', asyncRoute(async (req, res) => res.json(await vintagesService.list(String(req.query.q ?? '').trim()))));
router.post('/', asyncRoute(async (req, res) => res.status(201).json(await vintagesService.create(vintageSchema.parse(req.body)))));
router.put('/:id', asyncRoute(async (req, res) => res.json(await vintagesService.update(String(req.params.id), vintageUpdateSchema.parse(req.body)))));
router.delete('/:id', asyncRoute(async (req, res) => {
  await vintagesService.remove(String(req.params.id));
  res.status(204).end();
}));

export default router;
