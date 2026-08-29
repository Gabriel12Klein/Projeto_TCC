import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { authService } from './auth.service.js';
import { requireAuth } from './auth.middleware.js';
import { loginSchema, registerSchema } from './auth.schema.js';

const router = Router();

router.post('/register', asyncRoute(async (req, res) => {
  res.status(201).json(await authService.register(registerSchema.parse(req.body)));
}));
router.post('/login', asyncRoute(async (req, res) => {
  res.json(await authService.login(loginSchema.parse(req.body)));
}));
router.get('/me', requireAuth, (req, res) => res.json(res.locals.user));
router.post('/logout', requireAuth, asyncRoute(async (_req, res) => {
  await authService.logout(String(res.locals.token));
  res.json({ ok: true });
}));

export default router;
