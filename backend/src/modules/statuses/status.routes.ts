import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { type StatusKind, statusService } from './status.service.js';

export function createStatusRouter(kind: StatusKind) {
  const router = Router();
  router.get('/', asyncRoute(async (_req, res) => res.json(await statusService.list(kind))));
  return router;
}
