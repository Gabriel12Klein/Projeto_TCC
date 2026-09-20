import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// Historical demo migration references an account that only existed on the
// original workstation. Preserve its checksum, but do not import demo records
// into new installations. Existing databases use the ordinary migration path.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  const run = (args: string[]) => {
    const result = spawnSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), ...args, '--config', 'prisma.config.ts'], {
      stdio: 'inherit', env: process.env,
    });
    if (result.status !== 0) throw new Error('Falha ao aplicar migrações. Nenhum reset foi executado.');
  };
  if (rows.length === 0) {
    const migrationTable = await pool.query("SELECT to_regclass('public._prisma_migrations') AS name");
    const alreadyMarked = migrationTable.rows[0].name
      ? (await pool.query("SELECT 1 FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL", ['20260919150000_seed_sample_wine_and_vintage'])).rowCount
      : 0;
    if (!alreadyMarked) {
      console.log('Banco vazio: registrando como dispensada somente a importação histórica de demonstração.');
      run(['migrate', 'resolve', '--applied', '20260919150000_seed_sample_wine_and_vintage']);
    }
  }
  run(['migrate', 'deploy']);
} finally {
  await pool.end();
}
