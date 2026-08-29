import express from 'express';
import authRouter from './modules/auth/auth.routes.js';
import { requireAuth, requireRoles } from './modules/auth/auth.middleware.js';
import { errorHandler, notFoundHandler } from './common/http.js';
import wineriesRouter from './modules/wineries/wineries.routes.js';
import winesRouter from './modules/wines/wines.routes.js';
import vintagesRouter from './modules/vintages/vintages.routes.js';
import batchesRouter from './modules/batches/batches.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'prisma-sqlite' }));
app.use('/api/auth', authRouter);
app.use('/api/vinicolas', requireAuth, requireRoles('ADMIN', 'EDITOR'), wineriesRouter);
app.use('/api/vinhos', requireAuth, requireRoles('ADMIN', 'EDITOR'), winesRouter);
app.use('/api/safras', requireAuth, requireRoles('ADMIN', 'EDITOR'), vintagesRouter);
app.use('/api/lotes', requireAuth, requireRoles('ADMIN', 'EDITOR'), batchesRouter);
app.use(notFoundHandler);
app.use(errorHandler);
