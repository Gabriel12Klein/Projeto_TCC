import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { catalogService } from './catalog.service.js';

const router = Router();

router.get(
  '/wines',
  asyncRoute(async (req, res) => {
    res.json(
      await catalogService.list(String(req.query.q ?? '').trim(), String(req.query.type ?? '').trim()),
    );
  }),
);
router.get(
  '/wines/:slug',
  asyncRoute(async (req, res) => {
    res.json(await catalogService.findBySlug(String(req.params.slug)));
  }),
);

export default router;
