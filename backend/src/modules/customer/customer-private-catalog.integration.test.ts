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
let tokenA = '';
let tokenB = '';
let officialWineId = '';
let officialVintageYear = 0;
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
  tokenA = (await request(app).post('/api/auth/login').send({ email: emails[0], password }).expect(200)).body
    .token;
  tokenB = (await request(app).post('/api/auth/login').send({ email: emails[1], password }).expect(200)).body
    .token;
  const officialWines = await prisma.wine.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, vintages: { select: { year: true } } },
  });
  const officialWine = officialWines.find(
    ({ vintages }) => new Set(vintages.map(({ year }) => year)).size === 1,
  );
  if (!officialWine) throw new Error('O teste requer um vinho oficial com uma única safra.');
  officialWineId = officialWine.id;
  officialVintageYear = officialWine.vintages[0].year;
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
      street: 'Rua Cobos',
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
      street: 'Rua do Comércio',
      city: 'Ijuí',
      stateRegion: 'RS',
      country: 'Brasil',
    });
    const wineryLocation = await customerService.createPurchaseLocation(userA, {
      name: catena.name,
      street: catena.street,
      neighborhood: catena.neighborhood,
      city: catena.city,
      stateRegion: catena.stateRegion,
      country: catena.country,
    });
    const updatedCatena = await customerService.updateExternalWinery(userA, catena.id, {
      name: catena.name,
      street: 'Rua Nova da Vinícola',
      neighborhood: catena.neighborhood,
      city: 'Luján de Cuyo',
      stateRegion: catena.stateRegion,
      country: catena.country,
    });
    expect(updatedCatena.id).toBe(catena.id);
    expect(updatedCatena.city).toBe('Luján de Cuyo');
    expect(updatedCatena.street).toBe('Rua Nova da Vinícola');
    expect(
      (await customerService.listPurchaseLocations(userA)).find(({ id }) => id === wineryLocation.id)?.city,
    ).toBe('Mendoza');
    expect(
      (await customerService.listPurchaseLocations(userA)).find(({ id }) => id === wineryLocation.id)?.street,
    ).toBe('Rua Cobos');

    const wineryB = await customerService.createExternalWinery(userB, { name: 'Vinícola privada B' });
    const wineB = await customerService.createExternalWine(userB, {
      name: 'Vinho privado B',
      externalWineryId: wineryB.id,
      grapeIds: [],
    });
    const locationB = await customerService.createPurchaseLocation(userB, { name: 'Local privado B' });

    expect(await customerService.getExternalWine(userA, dvCatena.id)).toMatchObject({
      id: dvCatena.id,
      description: 'Vinho externo de teste',
      characteristics: 'Encorpado',
      aromas: 'Frutas vermelhas',
      tastingNotes: 'Final persistente',
    });
    const fullDetails = await request(app)
      .get(`/api/cliente/vinhos-externos/${dvCatena.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(fullDetails.body).toMatchObject({
      id: dvCatena.id,
      name: 'DV Catena',
      vintageYear: 2022,
      externalWinery: { id: catena.id, name: 'Vinícola Catena Zapata' },
      grapeLinks: [{ grape: { id: grapeId } }],
      description: 'Vinho externo de teste',
      characteristics: 'Encorpado',
      aromas: 'Frutas vermelhas',
      tastingNotes: 'Final persistente',
      imagePath: null,
    });
    const sparseDetails = await request(app)
      .get(`/api/cliente/vinhos-externos/${otherWine.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(sparseDetails.body).toMatchObject({
      id: otherWine.id,
      vintageYear: null,
      description: null,
      characteristics: null,
      aromas: null,
      tastingNotes: null,
      imagePath: null,
      grapeLinks: [],
    });
    await expect(customerService.getExternalWine(userB, dvCatena.id)).rejects.toThrow('não encontrado');
    await request(app)
      .get(`/api/cliente/vinhos-externos/${dvCatena.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    const [wineriesB, winesB, locationsB, grapesB] = await Promise.all([
      request(app)
        .get('/api/cliente/vinicolas-externas')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200),
      request(app).get('/api/cliente/vinhos-externos').set('Authorization', `Bearer ${tokenB}`).expect(200),
      request(app).get('/api/cliente/locais-compra').set('Authorization', `Bearer ${tokenB}`).expect(200),
      request(app).get('/api/uvas').set('Authorization', `Bearer ${tokenB}`).expect(200),
    ]);
    expect(wineriesB.body.map(({ name }: { name: string }) => name)).toEqual(['Vinícola privada B']);
    expect(winesB.body.map(({ name }: { name: string }) => name)).toEqual(['Vinho privado B']);
    expect(locationsB.body.map(({ name }: { name: string }) => name)).toEqual(['Local privado B']);
    expect(grapesB.body.some(({ id }: { id: string }) => id === grapeId)).toBe(true);

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
      orderItem: {
        externalWine: {
          id: dvCatena.id,
          vintageYear: 2022,
          description: 'Vinho externo de teste',
          grapeLinks: [{ grape: { id: grapeId } }],
        },
      },
    });

    await expect(
      customerService.createOrder(userA, {
        source: 'VINICULA',
        purchaseDate: new Date('2026-09-26T12:00:00Z'),
        purchaseLocationId: location.id,
        items: [{ wineId: officialWineId, vintageYear: officialVintageYear + 100, quantityBottles: 1 }],
      }),
    ).rejects.toThrow('pertencente ao vinho oficial');
    const officialOrder = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-26T12:00:00Z'),
      purchaseLocationId: location.id,
      items: [{ wineId: officialWineId, quantityBottles: 1 }],
    });
    expect(officialOrder.items[0].vintageYear).toBe(officialVintageYear);
    const additionalVintage = await prisma.vintage.create({
      data: {
        wineId: officialWineId,
        identifier: `safra-adicional-${suffix}`,
        year: officialVintageYear + 1,
        status: 'Teste',
      },
    });
    try {
      await expect(
        customerService.createOrder(userA, {
          source: 'VINICULA',
          purchaseDate: new Date('2026-09-26T12:00:00Z'),
          purchaseLocationId: location.id,
          items: [{ wineId: officialWineId, quantityBottles: 1 }],
        }),
      ).rejects.toThrow('Selecione a safra');
    } finally {
      await prisma.vintage.delete({ where: { id: additionalVintage.id } });
    }
    expect(await prisma.customerOrder.count({ where: { userId: userA } })).toBe(2);
    expect(otherWine.externalWineryId).toBe(secondWinery.id);

    const disposableWinery = await customerService.createExternalWinery(userA, {
      name: 'Vinícola descartável',
    });
    const disposableWine = await customerService.createExternalWine(userA, {
      name: 'Vinho descartável',
      externalWineryId: disposableWinery.id,
      grapeIds: [],
    });
    const disposableLocation = await customerService.createPurchaseLocation(userA, {
      name: 'Local descartável',
    });
    await customerService.removeExternalWine(userA, disposableWine.id);
    await customerService.removeExternalWinery(userA, disposableWinery.id);
    await customerService.removePurchaseLocation(userA, disposableLocation.id);
    expect(await prisma.externalWine.findUnique({ where: { id: disposableWine.id } })).toBeNull();
    expect(await prisma.externalWinery.findUnique({ where: { id: disposableWinery.id } })).toBeNull();
    expect(await prisma.purchaseLocation.findUnique({ where: { id: disposableLocation.id } })).toBeNull();
  });
});
