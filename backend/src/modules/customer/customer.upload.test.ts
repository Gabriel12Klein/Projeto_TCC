import { randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';
import { unlink } from 'node:fs/promises';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { uploadsRoot } from '../../common/files.js';

const email = `pedido-foto-${randomUUID()}@vinum.local`;
let token: string;
let photoPath: string | undefined;
beforeAll(async () => {
  const password = `Teste1!${randomUUID()}`;
  await request(app).post('/api/auth/register').send({ name: 'Teste de foto do pedido', email, password }).expect(201);
  const login = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  token = login.body.token;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  if (photoPath?.startsWith('/uploads/inventory/')) await unlink(join(uploadsRoot, 'inventory', basename(photoPath)));
  await prisma.$disconnect();
});

it('salva foto e local no pedido e compartilha a foto com o estoque', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7ioAAAAASUVORK5CYII=', 'base64');
  const result = await request(app).post('/api/cliente/pedidos')
    .set('Authorization', `Bearer ${token}`)
    .field('payload', JSON.stringify({ source: 'OUTRO_LOCAL', purchaseDate: '2026-09-20', purchaseLocation: 'Mercado de teste', items: [{ wineName: 'Rótulo de teste', quantityBottles: 3 }] }))
    .attach('photo', png, { filename: 'teste.png', contentType: 'image/png' }).expect(201);
  photoPath = result.body.items[0].photoPath;
  expect(result.body.purchaseLocation).toBe('Mercado de teste');
  expect(photoPath).toMatch(/^\/uploads\/inventory\/.+\.png$/);
  const stock = await request(app).get('/api/cliente/estoque').set('Authorization', `Bearer ${token}`).expect(200);
  expect(stock.body[0]).toMatchObject({ photoPath, quantityBottles: 3 });
  expect(stock.body[0].orderItems).toEqual([{ order: { purchaseLocation: 'Mercado de teste' } }]);
  const history = await request(app).get('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`).expect(200);
  expect(history.body[0].purchaseLocation).toBe('Mercado de teste');
  expect(history.body[0].items[0].photoPath).toBe(photoPath);
  await request(app).get(photoPath!).expect(200);
});

it('rejeita arquivo de formato inválido sem cadastrar pedido', async () => {
  const before = await request(app).get('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`);
  await request(app).post('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`)
    .attach('photo', Buffer.from('arquivo'), { filename: 'teste.txt', contentType: 'text/plain' }).expect(400);
  const after = await request(app).get('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`);
  expect(after.body.length).toBe(before.body.length);
});

it('atualiza o pedido pela API preservando foto, data e identificação', async () => {
  const history = await request(app).get('/api/cliente/pedidos').set('Authorization', `Bearer ${token}`).expect(200);
  const order = history.body[0];
  const item = order.items[0];
  const edited = await request(app).put(`/api/cliente/pedidos/${order.id}/itens/${item.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ source: 'OUTRO_LOCAL', purchaseDate: order.purchaseDate, purchaseLocation: 'Mercado corrigido',
      items: [{ wineName: item.wineName, quantityBottles: 2 }] }).expect(200);
  expect(edited.body.id).toBe(order.id);
  expect(edited.body.items[0]).toMatchObject({ id: item.id, photoPath, quantityBottles: 2 });
  expect(edited.body.purchaseDate).toBe(order.purchaseDate);
  const stock = await request(app).get('/api/cliente/estoque').set('Authorization', `Bearer ${token}`).expect(200);
  expect(stock.body[0].quantityBottles).toBe(2);
  await request(app).delete(`/api/cliente/pedidos/${order.id}`).set('Authorization', `Bearer ${token}`).expect(204);
  const remaining = await request(app).get('/api/cliente/estoque').set('Authorization', `Bearer ${token}`).expect(200);
  expect(remaining.body[0].quantityBottles).toBe(2);
  expect(remaining.body[0].movements.some((m: { purchaseLocation?: string }) => m.purchaseLocation === 'Mercado corrigido')).toBe(true);
});
