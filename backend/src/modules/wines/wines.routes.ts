import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { requireRoles } from '../auth/auth.middleware.js';
import { winesService } from './wines.service.js';
import { wineSchema, wineUpdateSchema } from './wines.schema.js';

const router = Router();
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const user = res.locals.user as { id: string; role: string };
    res.json(
      await winesService.list(
        String(req.query.q ?? '').trim(),
        user.role === 'CUSTOMER' ? user.id : undefined,
      ),
    );
  }),
);
router.post(
  '/',
  requireRoles('ADMIN', 'EDITOR'),
  asyncRoute(async (req, res) =>
    res.status(201).json(await winesService.create(wineSchema.parse(req.body), res.locals.user.id)),
  ),
);
router.put(
  '/:id',
  requireRoles('ADMIN', 'EDITOR'),
  asyncRoute(async (req, res) =>
    res.json(
      await winesService.update(
        String(req.params.id),
        wineUpdateSchema.parse(req.body),
        res.locals.user.id,
        res.locals.user.role,
      ),
    ),
  ),
);
router.delete(
  '/:id',
  requireRoles('ADMIN', 'EDITOR'),
  asyncRoute(async (req, res) => {
    await winesService.remove(String(req.params.id), res.locals.user.id, res.locals.user.role);
    res.status(204).end();
  }),
);

export default router;
