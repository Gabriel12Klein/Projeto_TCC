import express from 'express';
import authRouter, { requireAuth } from './modules/auth.js';
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
app.use('/api/vinicolas', requireAuth, wineriesRouter);
app.use('/api/vinhos', requireAuth, winesRouter);
app.use('/api/safras', requireAuth, vintagesRouter);
app.use('/api/lotes', requireAuth, batchesRouter);
app.use(notFoundHandler);
app.use(errorHandler);
