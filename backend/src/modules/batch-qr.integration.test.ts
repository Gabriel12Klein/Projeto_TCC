import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jsQRModule from 'jsqr';
import { PNG } from 'pngjs';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { batchesService } from './batches/batches.service.js';

const adminEmail = `${randomUUID()}@qr-admin.test`;
const customerEmail = `${randomUUID()}@qr-customer.test`;
const password = `${randomUUID()}Aa1!`;
const createdBatchIds: string[] = [];
let adminToken = '';
let customerToken = '';
let wineId = '';
let vintageId = '';

async function unusedBatchCode(offset = 0) {
  for (let index = offset; index < 10_000; index += 1) {
    const year = 70 + (Math.floor(index / 366) % 30);
    const day = (index % 366) + 1;
    const code = `L${year}${String(day).padStart(3, '0')}`;
    if (!(await prisma.batch.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new Error('Não foi possível reservar um código de lote para o teste.');
}

async function createBatch(offset = 0) {
  const code = await unusedBatchCode(offset);
  const batch = await prisma.batch.create({
    data: {
      code,
      wineId,
      vintageId,
      quantityLiters: 12,
      productionDate: new Date('2026-09-29T12:00:00Z'),
      status: 'Publicado para consulta no banco de dados',
    },
  });
  createdBatchIds.push(batch.id);
  return batch;
}

function binaryParser(response: any, callback: (error: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', callback);
}

function decodeQr(image: Buffer) {
  const png = PNG.sync.read(image);
  const pixels = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength);
  const decode = jsQRModule as unknown as (
    data: Uint8ClampedArray,
    width: number,
    height: number,
  ) => { data: string } | null;
  return decode(pixels, png.width, png.height)?.data;
}

beforeAll(async () => {
  const winery = await prisma.winery.findFirstOrThrow();
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  const wine = await prisma.wine.findFirstOrThrow({
    where: { status: 'PUBLISHED', vintages: { some: {} } },
    include: { vintages: { take: 1, orderBy: { year: 'desc' } } },
  });
  wineId = wine.id;
  vintageId = wine.vintages[0].id;
  await prisma.user.createMany({
    data: [
      {
        name: 'Admin QR',
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 4),
        wineryId: winery.id,
        roleId: adminRole.id,
      },
      {
        name: 'Cliente QR',
        email: customerEmail,
        passwordHash: await bcrypt.hash(password, 4),
        roleId: customerRole.id,
      },
    ],
  });
  adminToken = (await request(app).post('/api/auth/login').send({ email: adminEmail, password })).body.token;
  customerToken = (await request(app).post('/api/auth/login').send({ email: customerEmail, password })).body
    .token;
});

afterAll(async () => {
  await prisma.batch.deleteMany({ where: { id: { in: createdBatchIds } } });
  await prisma.user.deleteMany({ where: { email: { in: [adminEmail, customerEmail] } } });
  await prisma.$disconnect();
});

describe('QR Code persistente de lote', () => {
  it('gera, decodifica, persiste e recupera o mesmo QR sem duplicar', async () => {
    const first = await createBatch(2000);
    const second = await createBatch(3000);
    const expected = `http://vinum.test/consulta/lotes/${first.code}`;
    const previousUrl = process.env.PUBLIC_APP_URL;
    process.env.PUBLIC_APP_URL = 'http://vinum.test';
    try {
      await request(app).post(`/api/lotes/${first.id}/qr-code`).expect(401);
      await request(app)
        .post(`/api/lotes/${first.id}/qr-code`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      const generated = await request(app)
        .post(`/api/lotes/${first.id}/qr-code`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(generated.body).toMatchObject({
        path: `/api/catalog/batches/${first.code}/qr-code`,
        targetUrl: expected,
        created: true,
      });
      const stored = await prisma.batch.findUniqueOrThrow({ where: { id: first.id } });
      expect(stored.qrCodePayload).toBe(expected);
      expect(stored.qrCodePath).toBe(generated.body.path);
      expect(stored.qrCodeGeneratedAt).not.toBeNull();

      const image = await request(app)
        .get(generated.body.path)
        .buffer(true)
        .parse(binaryParser)
        .expect('Content-Type', /image\/png/)
        .expect(200);
      expect(decodeQr(image.body as Buffer)).toBe(expected);

      const repeated = await request(app)
        .post(`/api/lotes/${first.id}/qr-code`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Origin', 'http://outro-endereco.test')
        .expect(200);
      expect(repeated.body).toMatchObject({
        path: generated.body.path,
        targetUrl: generated.body.targetUrl,
        generatedAt: generated.body.generatedAt,
        created: false,
      });

      await prisma.$disconnect();
      const afterRestart = await request(app)
        .get(generated.body.path)
        .buffer(true)
        .parse(binaryParser)
        .expect(200);
      expect(afterRestart.body).toEqual(image.body);
      expect(decodeQr(afterRestart.body as Buffer)).toBe(expected);

      const other = await request(app)
        .post(`/api/lotes/${second.id}/qr-code`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(other.body.targetUrl).not.toBe(generated.body.targetUrl);

      await request(app)
        .put(`/api/lotes/${first.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: await unusedBatchCode(4000) })
        .expect(409);
      const edited = await request(app)
        .put(`/api/lotes/${first.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 18 })
        .expect(200);
      expect(edited.body.qrCode).toBe(generated.body.path);

      await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${adminToken}`).expect(200);
      adminToken = (
        await request(app).post('/api/auth/login').send({ email: adminEmail, password }).expect(200)
      ).body.token;
      const listed = await request(app)
        .get(`/api/lotes?q=${first.code}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(listed.body[0]).toMatchObject({ qrCode: generated.body.path });
      expect(listed.body[0].qrCodeGeneratedAt).toBe(generated.body.generatedAt);
    } finally {
      if (previousUrl === undefined) delete process.env.PUBLIC_APP_URL;
      else process.env.PUBLIC_APP_URL = previousUrl;
    }
  });

  it('não persiste dados parciais quando a renderização falha', async () => {
    const batch = await createBatch(5000);
    await expect(
      batchesService.generateQrCode(batch.id, 'http://vinum.test', async () => {
        throw new Error('falha técnica simulada');
      }),
    ).rejects.toThrow('Não foi possível gerar o QR Code. Tente novamente.');
    expect(await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).toMatchObject({
      qrCodePath: null,
      qrCodePayload: null,
      qrCodeGeneratedAt: null,
    });
    await request(app).get(`/api/catalog/batches/${batch.code}/qr-code`).expect(404);
  });
});
