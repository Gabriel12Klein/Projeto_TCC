import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

const email = randomUUID() + '@single.test';
const password = randomUUID() + 'Aa1!';
let token: string;
beforeAll(async () => {
  const winery = await prisma.winery.findFirstOrThrow();
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  await prisma.user.create({ data: { name: 'Teste interno', email, passwordHash: await bcrypt.hash(password, 4), wineryId: winery.id, roleId: role.id } });
  token = (await request(app).post('/api/auth/login').send({ email, password }).expect(200)).body.token;
});
afterAll(async () => { await prisma.user.deleteMany({ where: { email } }); await prisma.$disconnect(); });

it('recusa segunda vinícola na API e no PostgreSQL', async () => {
  await request(app).post('/api/vinicolas').set('Authorization', 'Bearer ' + token)
    .send({ name: 'Outra vinícola', cnpj: '12.345.678/0001-90', city: 'Teste', state: 'RS', email: 'teste@example.test' }).expect(409);
  await expect(prisma.winery.create({ data: { name: 'Outra', cnpj: randomUUID(), city: '', state: '' } })).rejects.toThrow();
  await expect(prisma.winery.create({ data: { name: 'Outra', singleton: false, cnpj: randomUUID(), city: '', state: '' } })).rejects.toThrow();
  expect(await prisma.winery.count()).toBe(1);
});
it('exige vínculo para administradores e impede vínculo administrativo em clientes', async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  await expect(prisma.user.create({ data: { name: 'Sem vínculo', email: randomUUID() + '@test.invalid', passwordHash: 'invalid', roleId: role.id } })).rejects.toThrow();
  const client = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  const winery = await prisma.winery.findFirstOrThrow();
  await expect(prisma.user.create({ data: { name: 'Cliente', email: randomUUID() + '@test.invalid', passwordHash: 'invalid', roleId: client.id, wineryId: winery.id } })).rejects.toThrow();
});
