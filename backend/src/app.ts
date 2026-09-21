import express from 'express';
import { join } from 'node:path';
import { prisma } from './lib/prisma.js';
import { AppError, asyncRoute } from './common/http.js';
import { uploadsRoot } from './common/files.js';
import authRouter from './modules/auth/auth.routes.js';
import { requireAuth, requireRoles } from './modules/auth/auth.middleware.js';
import { errorHandler, notFoundHandler } from './common/http.js';
import wineriesRouter from './modules/wineries/wineries.routes.js';
import winesRouter from './modules/wines/wines.routes.js';
import vintagesRouter from './modules/vintages/vintages.routes.js';
import batchesRouter from './modules/batches/batches.routes.js';
import catalogRouter from './modules/catalog/catalog.routes.js';
import uploadsRouter from './modules/uploads/uploads.routes.js';
import customerRouter from './modules/customer/customer.routes.js';
import adminSettingsRouter from './modules/admin-settings/admin-settings.routes.js';
import { createReferenceRouter } from './modules/references/reference.routes.js';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
// Customer uploads are private even when their URL is known.
app.use('/uploads/inventory', requireAuth, requireRoles('CUSTOMER'), asyncRoute(async (req, res, next) => {
  const photoPath = `/uploads/inventory${req.path}`;
  const userId = String(res.locals.user.id);
  const [stock, order] = await Promise.all([
    prisma.inventoryItem.findFirst({ where: { userId, photoPath }, select: { id: true } }),
    prisma.customerOrderItem.findFirst({ where: { photoPath, order: { userId } }, select: { id: true } }),
  ]);
  if (!stock && !order) throw new AppError(404, 'Foto não encontrada.');
  res.setHeader('Cache-Control', 'private, no-store');
  next();
}), express.static(join(uploadsRoot, 'inventory'), { fallthrough: false, cacheControl: false, dotfiles: 'deny' }));
// Do not expose the upload root: encoded paths must not bypass private routing.
for (const folder of ['wines', 'qrcodes']) {
  app.use(`/uploads/${folder}`, express.static(join(uploadsRoot, folder), { fallthrough: false, maxAge: '1h', dotfiles: 'deny' }));
}
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'prisma-postgresql' }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/uploads', requireAuth, requireRoles('ADMIN', 'EDITOR'), uploadsRouter);
app.use('/api/tipos-vinho', requireAuth, createReferenceRouter('wineType'));
app.use('/api/uvas', requireAuth, createReferenceRouter('grape'));
app.use('/api/classificacoes', requireAuth, createReferenceRouter('classification'));
app.use('/api/vinicolas', requireAuth, requireRoles('ADMIN', 'EDITOR'), wineriesRouter);
app.use('/api/vinhos', requireAuth, winesRouter);
app.use('/api/safras', requireAuth, requireRoles('ADMIN', 'EDITOR'), vintagesRouter);
app.use('/api/lotes', requireAuth, requireRoles('ADMIN', 'EDITOR'), batchesRouter);
app.use('/api/cliente', customerRouter);
app.use('/api/admin', adminSettingsRouter);
app.use(notFoundHandler);
app.use(errorHandler);
