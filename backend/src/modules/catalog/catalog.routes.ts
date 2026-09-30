import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { catalogService } from './catalog.service.js';

const router = Router();

router.get(
  '/batches/:code/qr-code',
  asyncRoute(async (req, res) => {
    const image = await catalogService.batchQrCode(String(req.params.code));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.send(image);
  }),
);

router.get(
  '/batches/:code',
  asyncRoute(async (req, res) => {
    res.json(await catalogService.findBatchByCode(String(req.params.code)));
  }),
);

router.get(
  '/wines',
  asyncRoute(async (req, res) => {
    res.json(
      await catalogService.list(
        String(req.query.q ?? '').trim(),
        String(req.query.type ?? '').trim(),
        String(req.query.classification ?? '').trim(),
      ),
    );
  }),
);
router.get(
  '/filters',
  asyncRoute(async (_req, res) => {
    res.json(await catalogService.filterOptions());
  }),
);
router.get(
  '/wines/:slug',
  asyncRoute(async (req, res) => {
    res.json(await catalogService.findBySlug(String(req.params.slug)));
  }),
);

export default router;
