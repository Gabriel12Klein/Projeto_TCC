import 'dotenv/config';
import { app } from './app.js';
import { ensureSeedAdmin } from './modules/auth/auth.service.js';
import { ensureSeedStatuses } from './modules/statuses/status.service.js';
import { disconnectDatabase } from './lib/prisma.js';

const port = Number(process.env.PORT ?? 3001);

await ensureSeedAdmin();
await ensureSeedStatuses();
const server = app.listen(port, '0.0.0.0', () => console.log(`[VINUM API] http://localhost:${port}`));

async function shutdown() {
  server.close();
  await disconnectDatabase();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
