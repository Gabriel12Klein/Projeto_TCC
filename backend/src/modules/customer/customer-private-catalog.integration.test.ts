import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { customerService } from './customer.service.js';

const suffix = randomUUID();
const password = `Privado1!${suffix}`;
const emails = [`privado-a-${suffix}@test.invalid`, `privado-b-${suffix}@test.invalid`];
let userA = '';
let userB = '';
let tokenB = '';
let officialWineId = '';
let grapeId = '';

beforeAll(async () => {
  userA = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cliente privado A', email: emails[0], password })
      .expect(201)
  ).body.id;
  userB = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Cliente privado B', email: emails[1], password })
      .expect(201)
  ).body.id;
  tokenB = (await request(app).post('/api/auth/login').send({ email: emails[1], password }).expect(200)).body
    .token;
  officialWineId = (
    await prisma.wine.findFirstOrThrow({ where: { status: 'PUBLISHED' }, select: { id: true } })
  ).id;
  grapeId = (await prisma.grape.findFirstOrThrow({ where: { active: true }, select: { id: true } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe('Catálogo privado do cliente', () => {
  it('cadastra referências, filtra por vinícola e bloqueia acesso cruzado', async () => {
    const catena = await customerService.createExternalWinery(userA, {
      name: 'Vinícola Catena Zapata',
      neighborhood: 'Centro',
      city: 'Mendoza',
      stateRegion: 'Mendoza',
      country: 'Argentina',
    });
    const secondWinery = await customerService.createExternalWinery(userA, { name: 'Outra Vinícola' });
    const dvCatena = await customerService.createExternalWine(userA, {
      name: 'DV Catena',
      externalWineryId: catena.id,
      vintageYear: 2022,
      grapeIds: [grapeId],
      description: 'Vinho externo de teste',
      characteristics: 'Encorpado',
      aromas: 'Frutas vermelhas',
      tastingNotes: 'Final persistente',
    });
    const otherWine = await customerService.createExternalWine(userA, {
      name: 'Outro vinho',
      externalWineryId: secondWinery.id,
      grapeIds: [],
    });
    const location = await customerService.createPurchaseLocation(userA, {
      name: 'Supermercado Central',
      city: 'Ijuí',
      stateRegion: 'RS',
      country: 'Brasil',
    });
    const wineryLocation = await customerService.createPurchaseLocation(userA, {
      name: catena.name,
      neighborhood: catena.neighborhood,
      city: catena.city,
      stateRegion: catena.stateRegion,
      country: catena.country,
    });
    const updatedCatena = await customerService.updateExternalWinery(userA, catena.id, {
      name: catena.name,
      neighborhood: catena.neighborhood,
      city: 'Luján de Cuyo',
      stateRegion: catena.stateRegion,
      country: catena.country,
    });
    expect(updatedCatena.id).toBe(catena.id);
    expect(updatedCatena.city).toBe('Luján de Cuyo');
    expect(
      (await customerService.listPurchaseLocations(userA)).find(({ id }) => id === wineryLocation.id)?.city,
    ).toBe('Mendoza');

    const wineryB = await customerService.createExternalWinery(userB, { name: 'Vinícola privada B' });
    const wineB = await customerService.createExternalWine(userB, {
      name: 'Vinho privado B',
      externalWineryId: wineryB.id,
      grapeIds: [],
    });
    const locationB = await customerService.createPurchaseLocation(userB, { name: 'Local privado B' });

    expect((await customerService.listExternalWines(userA, catena.id)).map(({ name }) => name)).toEqual([
      'DV Catena',
    ]);
    expect((await customerService.listExternalWines(userA, catena.id))[0]).toMatchObject({
      vintageYear: 2022,
      grapeLinks: [{ grape: { id: grapeId } }],
    });
    expect((await customerService.listExternalWines(userA)).map(({ name }) => name).sort()).toEqual([
      'DV Catena',
      'Outro vinho',
    ]);
    expect(await customerService.listExternalWines(userA, wineryB.id)).toEqual([]);
    await expect(
      customerService.createExternalWine(userA, {
        name: 'Invasão',
        externalWineryId: wineryB.id,
        grapeIds: [],
      }),
    ).rejects.toThrow('sua conta');
    await expect(
      customerService.updatePurchaseLocation(userA, locationB.id, { name: 'Alterado' }),
    ).rejects.toThrow('não encontrado');
    await request(app)
      .put(`/api/cliente/vinicolas-externas/${catena.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Tentativa cruzada' })
      .expect(404);

    await expect(
      customerService.createOrder(
        userA,
        {
          source: 'OUTRO_LOCAL',
          purchaseDate: new Date('2026-09-26T12:00:00Z'),
          purchaseLocationId: location.id,
          items: [
            {
              externalWineId: dvCatena.id,
              externalWineryId: secondWinery.id,
              quantityBottles: 1,
            },
          ],
        },
        '/uploads/inventory/teste-privado.png',
      ),
    ).rejects.toThrow('não pertence');

    await expect(
      customerService.createOrder(
        userA,
        {
          source: 'OUTRO_LOCAL',
          purchaseDate: new Date('2026-09-26T12:00:00Z'),
          purchaseLocationId: locationB.id,
          items: [{ externalWineId: wineB.id, externalWineryId: wineryB.id, quantityBottles: 1 }],
        },
        '/uploads/inventory/teste-privado.png',
      ),
    ).rejects.toThrow('local de compra');

    await expect(
      customerService.createOrder(
        userA,
        {
          source: 'OUTRO_LOCAL',
          purchaseDate: new Date('2026-09-26T12:00:00Z'),
          purchaseLocationId: location.id,
          items: [{ externalWineId: wineB.id, externalWineryId: wineryB.id, quantityBottles: 1 }],
        },
        '/uploads/inventory/teste-privado.png',
      ),
    ).rejects.toThrow('vinho externo');
    await expect(customerService.removeExternalWine(userA, wineB.id)).rejects.toThrow('não encontrado');

    const externalOrder = await customerService.createOrder(
      userA,
      {
        source: 'OUTRO_LOCAL',
        purchaseDate: new Date('2026-09-26T12:00:00Z'),
        purchaseLocationId: location.id,
        items: [{ externalWineId: dvCatena.id, externalWineryId: catena.id, quantityBottles: 1 }],
      },
      '/uploads/inventory/teste-privado.png',
    );
    expect(externalOrder.purchaseLocationId).toBe(location.id);
    expect(externalOrder.items[0].externalWineId).toBe(dvCatena.id);
    expect((await customerService.listBottles(userA))[0]).toMatchObject({
      inventoryItem: { name: 'DV Catena', wineryName: 'Vinícola Catena Zapata' },
    });

    await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-26T12:00:00Z'),
      purchaseLocationId: location.id,
      items: [{ wineId: officialWineId, quantityBottles: 1 }],
    });
    expect(await prisma.customerOrder.count({ where: { userId: userA } })).toBe(2);
    expect(otherWine.externalWineryId).toBe(secondWinery.id);
  });
});
