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

it('cadastra e edita vinho com classificação sem duplicar e atualiza catálogo/resumo', async () => {
  const headers = { Authorization: 'Bearer ' + token };
  const grape = await prisma.grape.findFirstOrThrow({ where: { active: true } });
  const type = await prisma.wineType.findFirstOrThrow({ where: { active: true } });
  const before = await request(app).get('/api/admin/resumo').set(headers).expect(200);
  const payload = { name: 'Vinho de teste ' + randomUUID(), typeId: type.id, classificationId: 'classification-seco',
    grapeIds: [grape.id], volume: 750, alcohol: 12.5, description: 'Vinho isolado para validar a classificação.', status: 'Ativo' };
  await request(app).post('/api/vinhos').set(headers).send({ ...payload, classificationId: '' }).expect(400);
  await request(app).post('/api/vinhos').set(headers).send({ ...payload, classificationId: 'inexistente' }).expect(400);
  const created = await request(app).post('/api/vinhos').set(headers).send(payload).expect(201);
  try {
    expect(created.body.classification).toBe('Seco');
    const edited = await request(app).put('/api/vinhos/' + created.body.id).set(headers)
      .send({ classificationId: 'classification-brut', grapeIds: [grape.id] }).expect(200);
    expect(edited.body.id).toBe(created.body.id);
    expect(edited.body.classification).toBe('Brut');
    expect(await prisma.wineGrape.count({ where: { wineId: created.body.id } })).toBe(1);
    const catalog = await request(app).get('/api/catalog/wines/' + created.body.slug).expect(200);
    expect(catalog.body.classification).toBe('Brut');
    const after = await request(app).get('/api/admin/resumo').set(headers).expect(200);
    expect(after.body.wines).toBe(before.body.wines + 1);
    expect(after.body.classifications).toBe(await prisma.classification.count());
    await expect(prisma.classification.delete({ where: { id: 'classification-brut' } })).rejects.toThrow();
  } finally {
    await prisma.wine.delete({ where: { id: created.body.id } });
  }
});

it('mantém geração de QR Code reservada para trabalhos futuros', async () => {
  await request(app).post('/api/lotes/qualquer-id/qr-code').set('Authorization', 'Bearer ' + token).expect(501);
});
