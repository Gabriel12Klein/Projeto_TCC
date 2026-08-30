import { Router } from 'express';
import { asyncRoute } from '../../common/http.js';
import { requireRoles } from '../auth/auth.middleware.js';
import { referenceSchema, referenceUpdateSchema } from './reference.schema.js';
import { type ReferenceKind, referenceService } from './reference.service.js';

export function createReferenceRouter(kind: ReferenceKind) {
  const router = Router();

  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const role = String(res.locals.user.role);
      res.json(await referenceService.list(kind, role === 'CUSTOMER'));
    }),
  );
  router.post(
    '/',
    requireRoles('ADMIN', 'EDITOR'),
    asyncRoute(async (req, res) => {
      res.status(201).json(await referenceService.create(kind, referenceSchema.parse(req.body)));
    }),
  );
  router.put(
    '/:id',
    requireRoles('ADMIN', 'EDITOR'),
    asyncRoute(async (req, res) => {
      res.json(await referenceService.update(kind, String(req.params.id), referenceUpdateSchema.parse(req.body)));
    }),
  );
  router.delete(
    '/:id',
    requireRoles('ADMIN', 'EDITOR'),
    asyncRoute(async (req, res) => {
      await referenceService.remove(kind, String(req.params.id));
      res.status(204).end();
    }),
  );

  return router;
}
