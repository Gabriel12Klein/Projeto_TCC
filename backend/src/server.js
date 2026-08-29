import express from 'express';
import authRouter, { ensureSeedAdmin, requireAuth } from './modules/auth.js';
import { createCrudRouter } from './modules/crudRouter.js';

const app = express();
const port = 3001;

app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'json-local' }));
app.use('/api/auth', authRouter);
app.use('/api/vinicolas', requireAuth, createCrudRouter('vinicolas', 'vin'));
app.use('/api/safras', requireAuth, createCrudRouter('safras', 'saf'));
app.use('/api/vinhos', requireAuth, createCrudRouter('vinhos', 'vinho'));
app.use('/api/lotes', requireAuth, createCrudRouter('lotes', 'lot'));

await ensureSeedAdmin();
app.listen(port, () => console.log(`[VINUM API] http://localhost:${port}`));
