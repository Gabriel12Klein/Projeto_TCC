import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';

// Creates an isolated database; never resets, drops or truncates a database.
// The current installation is read-only except its normal migration/seed flow.
const currentUrl = process.env.DATABASE_URL;
assert(currentUrl, 'DATABASE_URL obrigatória.');
const isolatedUrl = new URL(currentUrl);
isolatedUrl.pathname = '/vinum_spec_validation';
assert.notEqual(new URL(currentUrl).pathname, isolatedUrl.pathname);
let current = new pg.Pool({ connectionString: currentUrl });
let isolated = new pg.Pool({ connectionString: isolatedUrl.toString() });
// Idle connections are expected to close during the deliberate container restart.
current.on('error', () => undefined);
isolated.on('error', () => undefined);
const password = `Spec1!${randomUUID()}`;
const env = { ...process.env, DATABASE_URL: isolatedUrl.toString(), ADMIN_INITIAL_EMAIL: 'spec-admin@example.test', ADMIN_INITIAL_PASSWORD: password };
function run(file: string, args: string[], childEnv = process.env) {
  const result = spawnSync(process.execPath, [resolve(file), ...args], { env: childEnv, stdio: 'inherit', timeout: 120000 });
  assert.equal(result.status, 0, `Falha em ${file}; nenhum reset foi executado.`);
}
async function fingerprints(pool: pg.Pool) {
  const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations','sessao') ORDER BY tablename")).rows;
  const result: Record<string, unknown> = {};
  for (const { tablename } of tables) {
    const name = '"' + String(tablename).replaceAll('"', '""') + '"';
    result[tablename] = (await pool.query(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '')) AS hash FROM ${name} t`)).rows[0];
  }
  return result;
}
async function schema(pool: pg.Pool) {
  const queries = [
    // Physical ordinal gaps from historical dropped columns are not schema differences.
    "SELECT table_name,column_name,column_default,is_nullable,data_type,udt_name,character_maximum_length,numeric_precision,numeric_scale,datetime_precision FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name",
    "SELECT c.relname,con.conname,con.contype,con.convalidated,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid WHERE con.connamespace='public'::regnamespace ORDER BY c.relname,con.conname",
    "SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",
    "SELECT c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal ORDER BY c.relname,t.tgname",
    "SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY p.proname",
  ];
  const result = [];
  for (const query of queries) result.push((await pool.query(query)).rows);
  return result;
}
try {
  const before = await fingerprints(current);
  run('node_modules/tsx/dist/cli.mjs', ['backend/scripts/deploy.ts']);
  run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
  run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts']);
  assert.deepEqual(await fingerprints(current), before, 'Migração/seed alterou dados existentes.');
  console.log('PASS: migrações no banco atual e dois seeds sem sobrescritas.');

  const exists = await current.query('SELECT 1 FROM pg_database WHERE datname=$1', ['vinum_spec_validation']);
  if (!exists.rowCount) {
    await current.query('CREATE DATABASE vinum_spec_validation');
    console.log('Banco isolado criado vazio: vinum_spec_validation.');
  }
  run('node_modules/tsx/dist/cli.mjs', ['backend/scripts/deploy.ts'], env);
  run('node_modules/tsx/dist/cli.mjs', ['prisma/seed.ts'], env);
  assert.deepEqual(await schema(isolated), await schema(current), 'Schema vazio difere do schema existente.');
  console.log('PASS: mesmos campos, tipos, defaults, FKs, CHECKs, índices, triggers e funções.');
  run('node_modules/vitest/vitest.mjs', ['run'], env);

  // Change the connection before importing any service that creates PrismaClient.
  process.env.DATABASE_URL = isolatedUrl.toString();
  const { app } = await import('../src/app.js');
  const { prisma } = await import('../src/lib/prisma.js');
  const { default: request } = await import('supertest');
  const { default: bcrypt } = await import('bcryptjs');
  const suffix = randomUUID();
  const email = `restart-${suffix}@example.test`;
  const adminEmail = `restart-admin-${suffix}@example.test`;
  let userId: string | undefined;
  let adminId: string | undefined;
  const winery = await prisma.winery.findFirstOrThrow();
  try {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
    adminId = (await prisma.user.create({ data: { name: 'Administrador de teste', email: adminEmail, passwordHash: await bcrypt.hash(password, 4), roleId: role.id, wineryId: winery.id } })).id;
    const adminToken = (await request(app).post('/api/auth/login').send({ email: adminEmail, password }).expect(200)).body.token;
    const hashBefore = (await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).passwordHash;
    const profileInput = { wineryId: winery.id, name: 'VINUM validação isolada', cnpj: '12.345.678/0001-90', city: 'Bento Gonçalves', state: 'RS', contactEmail: 'contato@example.test', accountName: 'Responsável teste', loginEmail: adminEmail, phone: '(54) 3000-0000', newPassword: '' };
    const updated = await request(app).put('/api/admin/cadastro').set('Authorization', `Bearer ${adminToken}`).send(profileInput).expect(200);
    assert.equal(updated.body.winery.id, winery.id);
    assert.equal(updated.body.winery.phone, profileInput.phone);
    assert.equal(await prisma.winery.count(), 1);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).passwordHash, hashBefore);
    const changedPassword = `Changed1!${randomUUID()}`;
    await request(app).put('/api/admin/cadastro').set('Authorization', `Bearer ${adminToken}`)
      .send({ ...profileInput, currentPassword: password, newPassword: changedPassword, confirmPassword: changedPassword }).expect(200);
    assert(await bcrypt.compare(changedPassword, (await prisma.user.findUniqueOrThrow({ where: { id: adminId } })).passwordHash));
    await request(app).post('/api/auth/login').send({ email: adminEmail, password }).expect(401);
    await request(app).post('/api/auth/login').send({ email: adminEmail, password: changedPassword }).expect(200);
    console.log('PASS: edição real de vinícola/admin no mesmo ID; senha vazia preservada e nova senha segura.');

    userId = (await request(app).post('/api/auth/register').send({ name: 'Cliente persistência', email, password }).expect(201)).body.id;
    const token = (await request(app).post('/api/auth/login').send({ email, password }).expect(200)).body.token;
    const profile = { name: 'Cliente persistência', birthDate: '1990-05-10', phone: '(54) 90000-0000', street: 'Rua Teste', addressNumber: '10', city: 'Bento Gonçalves', state: 'RS', country: 'Brasil' };
    await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send(profile).expect(200);
    const order = await request(app).post('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify({ source: 'OUTRO_LOCAL', purchaseDate: '2026-09-20', purchaseLocation: 'Mercado isolado', items: [{ wineName: 'Rótulo persistência', quantityBottles: 2 }] }))
      .attach('photo', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7ioAAAAASUVORK5CYII=', 'base64'), { filename: 'persistencia.png', contentType: 'image/png' }).expect(201);
    const { unlink } = await import('node:fs/promises');
    const { uploadsRoot } = await import('../src/common/files.js');
    const { basename, join } = await import('node:path');
    const photoPath = order.body.items[0].photoPath as string;
    try {
      const realBeforeRestart = await fingerprints(current);
      const testBeforeRestart = await fingerprints(isolated);
      await prisma.$disconnect();
      if (process.argv.includes('--restart')) {
        await current.end();
        await isolated.end();
        current = new pg.Pool({ connectionString: currentUrl });
        isolated = new pg.Pool({ connectionString: isolatedUrl.toString() });
        const restart = spawnSync('docker', ['compose', 'restart', 'postgres', 'pgadmin'], { stdio: 'inherit', timeout: 60000 });
        assert.equal(restart.status, 0);
        // Wait for readiness via pg_isready, never delete/recreate the volume.
        const ready = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'for i in $(seq 1 30); do pg_isready -U vinum -d vinum && exit 0; sleep 1; done; exit 1'], { stdio: 'inherit', timeout: 35000 });
        assert.equal(ready.status, 0);
      }
      assert.deepEqual(await fingerprints(current), realBeforeRestart);
      assert.deepEqual(await fingerprints(isolated), testBeforeRestart);
      await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(200);
      const login = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
      const headers = { Authorization: `Bearer ${login.body.token}` };
      const me = (await request(app).get('/api/auth/me').set(headers).expect(200)).body;
      for (const [key, value] of Object.entries(profile)) assert.equal(me[key], value);
      const orders = (await request(app).get('/api/cliente/pedidos').set(headers).expect(200)).body;
      assert.equal(orders[0].id, order.body.id);
      assert.equal((await request(app).get('/api/cliente/estoque').set(headers).expect(200)).body[0].quantityBottles, 2);
      await request(app).get(photoPath).set(headers).expect(200);
      const account = (await request(app).get('/api/admin/cadastro').set('Authorization', `Bearer ${adminToken}`).expect(200)).body;
      assert.equal(account.winery.phone, profileInput.phone);
      console.log(`PASS: ${process.argv.includes('--restart') ? 'restart de PostgreSQL/pgAdmin, ' : ''}fingerprints intactos; perfil, pedido, estoque, foto e cadastro administrativo persistentes após novo login.`);
    } finally {
      await unlink(join(uploadsRoot, 'inventory', basename(photoPath)));
    }
  } finally {
    // Only records created by this script in the explicitly isolated database.
    if (userId) await prisma.user.delete({ where: { id: userId } });
    if (adminId) await prisma.user.delete({ where: { id: adminId } });
    const { id, createdAt, updatedAt, ...original } = winery;
    await prisma.winery.update({ where: { id }, data: { ...original, createdAt, updatedAt } });
    await prisma.$disconnect();
  }
  assert.deepEqual(await fingerprints(current), before, 'Os dados reais foram modificados.');
  console.log('PASS FINAL: dados reais preservados integralmente; banco isolado mantido, sem DROP/RESET.');
} finally {
  await current.end();
  await isolated.end();
}
