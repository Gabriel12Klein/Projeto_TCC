import 'dotenv/config';
import { app } from './app.js';
import { ensureSeedAdmin } from './modules/auth.js';
import { disconnectDatabase } from './lib/prisma.js';

const port = Number(process.env.PORT ?? 3001);

await ensureSeedAdmin();
const server = app.listen(port, () => console.log(`[VINUM API] http://localhost:${port}`));

async function shutdown() {
  server.close();
  await disconnectDatabase();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
