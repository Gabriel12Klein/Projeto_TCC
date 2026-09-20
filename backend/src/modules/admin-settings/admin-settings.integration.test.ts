import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

const suffix = randomUUID();
const adminEmail = `admin-menu-${suffix}@example.test`;
const clientEmail = `client-menu-${suffix}@example.test`;
const password = `Teste1!${suffix}`;
let adminToken = '';
let clientToken = '';
beforeAll(async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const winery = await prisma.winery.findFirstOrThrow();
  await prisma.user.create({ data: { name: 'Teste temporário do menu', email: adminEmail, passwordHash: await bcrypt.hash(password, 4), roleId: role.id, wineryId: winery.id } });
  await request(app).post('/api/auth/register').send({ name: 'Cliente temporário', email: clientEmail, password }).expect(201);
  adminToken = (await request(app).post('/api/auth/login').send({ email: adminEmail, password }).expect(200)).body.token;
  clientToken = (await request(app).post('/api/auth/login').send({ email: clientEmail, password }).expect(200)).body.token;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, clientEmail] } } });
  await prisma.$disconnect();
});
it('protege cadastro e resumo contra acesso anônimo e de clientes', async () => {
  for (const path of ['/api/admin/cadastro', '/api/admin/resumo']) {
    await request(app).get(path).expect(401);
    await request(app).get(path).set('Authorization', `Bearer ${clientToken}`).expect(403);
  }
  await request(app).put('/api/admin/cadastro').set('Authorization', `Bearer ${clientToken}`).send({}).expect(403);
});
it('retorna o cadastro real e as contagens reais sem modificar registros da vinícola', async () => {
  const profile = await request(app).get('/api/admin/cadastro').set('Authorization', `Bearer ${adminToken}`).expect(200);
  const wineries = await prisma.winery.findMany({ select: { id: true, name: true } });
  expect(wineries).toHaveLength(1);
  expect(profile.body.winery).toMatchObject(wineries[0]);
  expect(profile.body.account).not.toHaveProperty('passwordHash');
  const summary = await request(app).get('/api/admin/resumo').set('Authorization', `Bearer ${adminToken}`).expect(200);
  expect(summary.body.wines).toBe(await prisma.wine.count());
  expect(summary.body.batches).toBe(await prisma.batch.count());
  expect(summary.body.vintages).toBe(await prisma.vintage.count());
  expect(summary.body.grapes).toBe(await prisma.grape.count());
  expect(summary.body.wineTypes).toBe(await prisma.wineType.count());
});
