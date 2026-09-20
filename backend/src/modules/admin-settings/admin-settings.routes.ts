import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { requireAuth, requireRoles } from '../auth/auth.middleware.js';
import { adminSettingsSchema } from './admin-settings.schema.js';
import { adminSettingsService } from './admin-settings.service.js';

const router = Router();
router.use(requireAuth, requireRoles('ADMIN', 'EDITOR'));
router.get('/resumo', asyncRoute(async (_req, res) => { res.json(await adminSettingsService.summary()); }));
router.get('/cadastro', asyncRoute(async (_req, res) => { res.json(await adminSettingsService.get(String(res.locals.user.id))); }));
router.put('/cadastro', requireRoles('ADMIN'), asyncRoute(async (req, res) => {
  res.json(await adminSettingsService.update(String(res.locals.user.id), String(res.locals.token), adminSettingsSchema.parse(req.body)));
}));
export default router;
