import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { app } from '../../app.js';
import { uploadsRoot } from '../../common/files.js';
import { prisma } from '../../lib/prisma.js';

const suffix = randomUUID();
const emails = [`foto-vinho-a-${suffix}@test.invalid`, `foto-vinho-b-${suffix}@test.invalid`];
const password = `Foto1!${suffix}`;
let tokenA = '';
let tokenB = '';
let imagePath = '';

beforeAll(async () => {
  for (const [index, email] of emails.entries()) {
    await request(app)
      .post('/api/auth/register')
      .send({ name: `Cliente foto ${index + 1}`, email, password })
      .expect(201);
  }
  tokenA = (await request(app).post('/api/auth/login').send({ email: emails[0], password }).expect(200)).body
    .token;
  tokenB = (await request(app).post('/api/auth/login').send({ email: emails[1], password }).expect(200)).body
    .token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  if (imagePath.startsWith('/uploads/inventory/')) {
    await unlink(join(uploadsRoot, 'inventory', basename(imagePath))).catch(() => undefined);
  }
  await prisma.$disconnect();
});

it('salva a foto no vinho externo e a reutiliza na compra sem novo upload', async () => {
  const authorization = { Authorization: `Bearer ${tokenA}` };
  const winery = await request(app)
    .post('/api/cliente/vinicolas-externas')
    .set(authorization)
    .send({ name: 'Vinícola da foto' })
    .expect(201);
  const location = await request(app)
    .post('/api/cliente/locais-compra')
    .set(authorization)
    .send({ name: 'Loja da foto' })
    .expect(201);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7ioAAAAASUVORK5CYII=',
    'base64',
  );
  const wine = await request(app)
    .post('/api/cliente/vinhos-externos')
    .set(authorization)
    .field(
      'payload',
      JSON.stringify({ name: 'Rótulo com foto', externalWineryId: winery.body.id, grapeIds: [] }),
    )
    .attach('photo', png, { filename: 'rotulo.png', contentType: 'image/png' })
    .expect(201);

  imagePath = wine.body.imagePath;
  expect(imagePath).toMatch(/^\/uploads\/inventory\/.+\.png$/);
  await request(app).get(imagePath).set(authorization).expect(200);
  await request(app).get(imagePath).set('Authorization', `Bearer ${tokenB}`).expect(404);

  const order = await request(app)
    .post('/api/cliente/pedidos')
    .set(authorization)
    .send({
      source: 'OUTRO_LOCAL',
      purchaseDate: '2026-09-27',
      purchaseLocationId: location.body.id,
      items: [
        {
          externalWineId: wine.body.id,
          externalWineryId: winery.body.id,
          quantityBottles: 2,
        },
      ],
    })
    .expect(201);

  expect(order.body.items[0].photoPath).toBe(imagePath);
  const inventory = await request(app).get('/api/cliente/estoque').set(authorization).expect(200);
  expect(inventory.body[0]).toMatchObject({ photoPath: imagePath, quantityBottles: 2 });
});
