import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { customerService } from './customer.service.js';

const suffix = randomUUID();
const emailA = `dashboard-a-${suffix}@test.invalid`;
const emailB = `dashboard-b-${suffix}@test.invalid`;
const password = `Painel1!${suffix}`;
let userA = '';
let userB = '';
let tokenA = '';
let wineA = '';
let wineB = '';

beforeAll(async () => {
  userA = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dashboard A', email: emailA, password })
      .expect(201)
  ).body.id;
  userB = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dashboard B', email: emailB, password })
      .expect(201)
  ).body.id;
  tokenA = (await request(app).post('/api/auth/login').send({ email: emailA, password }).expect(200)).body
    .token;
  const wines = await prisma.wine.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true },
    take: 2,
    orderBy: { id: 'asc' },
  });
  if (wines.length < 2) throw new Error('O teste dirigido requer dois vinhos publicados.');
  [wineA, wineB] = wines.map((wine) => wine.id);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
  await prisma.$disconnect();
});

describe('Pedidos, estoque e dashboard por cliente', () => {
  it('executa a matriz funcional obrigatória com dados reais', async () => {
    const orderA = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-01-05T12:00:00Z'),
      purchaseLocation: 'Loja A',
      items: [{ wineId: wineA, quantityBottles: 6 }],
    });
    const stockA = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: userA, wineId: wineA } });
    expect(await customerService.getInventoryDashboard(userA, 2026)).toMatchObject({
      totals: { acquiredBottles: 6, consumedBottles: 0, availableBottles: 6, labelCount: 1 },
    });

    await customerService.registerConsumption(userA, stockA.id, {
      quantityBottles: 2,
      occurredAt: new Date('2026-01-15T12:00:00Z'),
    });
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toEqual({
      acquiredBottles: 6,
      consumedBottles: 2,
      availableBottles: 4,
      labelCount: 1,
    });

    await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-01-20T12:00:00Z'),
      purchaseLocation: 'Loja A',
      items: [{ wineId: wineA, quantityBottles: 3 }],
    });
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toEqual({
      acquiredBottles: 9,
      consumedBottles: 2,
      availableBottles: 7,
      labelCount: 1,
    });
    expect(await prisma.inventoryItem.count({ where: { userId: userA, wineId: wineA } })).toBe(1);

    await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-02-02T12:00:00Z'),
      purchaseLocation: 'Loja B',
      items: [{ wineId: wineB, quantityBottles: 4 }],
    });
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toEqual({
      acquiredBottles: 13,
      consumedBottles: 2,
      availableBottles: 11,
      labelCount: 2,
    });

    const externalName = `Rótulo privado ${suffix}`;
    const wineriesBefore = await prisma.winery.count();
    await customerService.createOrder(
      userA,
      {
        source: 'OUTRO_LOCAL',
        purchaseDate: new Date('2026-02-03T12:00:00Z'),
        purchaseLocation: 'Loja externa',
        items: [{ wineName: externalName, quantityBottles: 3 }],
      },
      '/uploads/inventory/teste-dirigido.png',
    );
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toEqual({
      acquiredBottles: 16,
      consumedBottles: 2,
      availableBottles: 14,
      labelCount: 3,
    });
    expect(await prisma.wine.count({ where: { name: externalName } })).toBe(0);
    expect(await prisma.winery.count()).toBe(wineriesBefore);

    const stockB = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: userA, wineId: wineB } });
    const movementsBefore = await prisma.inventoryMovement.count({ where: { inventoryItemId: stockB.id } });
    await expect(
      customerService.registerConsumption(userA, stockB.id, {
        quantityBottles: 5,
        occurredAt: new Date('2026-02-10T12:00:00Z'),
      }),
    ).rejects.toThrow('maior que o estoque');
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stockB.id } })).quantityBottles).toBe(
      4,
    );
    expect(await prisma.inventoryMovement.count({ where: { inventoryItemId: stockB.id } })).toBe(
      movementsBefore,
    );

    await customerService.registerConsumption(userA, stockA.id, {
      quantityBottles: 5,
      occurredAt: new Date('2026-02-15T12:00:00Z'),
    });
    await customerService.registerConsumption(userA, stockB.id, {
      quantityBottles: 1,
      occurredAt: new Date('2026-03-15T12:00:00Z'),
    });
    const dashboard = await customerService.getInventoryDashboard(userA, 2026);
    expect(dashboard.monthlyConsumption.slice(0, 3)).toEqual([
      { month: 1, bottles: 2 },
      { month: 2, bottles: 5 },
      { month: 3, bottles: 1 },
    ]);
    expect(dashboard.totals).toEqual({
      acquiredBottles: 16,
      consumedBottles: 8,
      availableBottles: 8,
      labelCount: 3,
    });

    expect((await customerService.getInventoryDashboard(userB, 2026)).totals).toEqual({
      acquiredBottles: 0,
      consumedBottles: 0,
      availableBottles: 0,
      labelCount: 0,
    });
    expect(await customerService.listOrders(userB)).toEqual([]);
    expect(await customerService.listInventory(userB)).toEqual([]);
    await expect(
      customerService.registerConsumption(userB, stockA.id, {
        quantityBottles: 1,
        occurredAt: new Date('2026-03-20T12:00:00Z'),
      }),
    ).rejects.toThrow('Item não encontrado');

    expect(await customerService.getInventoryDashboard(userA, 2026)).toEqual(dashboard);
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${tokenA}`).expect(200);
    await request(app)
      .get('/api/cliente/estoque/resumo?year=2026')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(401);
    tokenA = (await request(app).post('/api/auth/login').send({ email: emailA, password }).expect(200)).body
      .token;
    const afterLogin = await request(app)
      .get('/api/cliente/estoque/resumo?year=2026')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(afterLogin.body).toEqual(dashboard);

    const beforeFailure = await Promise.all([
      prisma.customerOrder.count({ where: { userId: userA } }),
      prisma.customerOrderItem.count({ where: { order: { userId: userA } } }),
      prisma.inventoryItem.count({ where: { userId: userA } }),
      prisma.inventoryMovement.count({ where: { inventoryItem: { userId: userA } } }),
    ]);
    await expect(
      customerService.createOrder(userA, {
        source: 'VINICULA',
        purchaseDate: new Date(),
        purchaseLocation: 'Falha transacional',
        items: [{ wineId: 'vinho-inexistente', quantityBottles: 2 }],
      }),
    ).rejects.toThrow('não foi encontrado');
    expect(
      await Promise.all([
        prisma.customerOrder.count({ where: { userId: userA } }),
        prisma.customerOrderItem.count({ where: { order: { userId: userA } } }),
        prisma.inventoryItem.count({ where: { userId: userA } }),
        prisma.inventoryMovement.count({ where: { inventoryItem: { userId: userA } } }),
      ]),
    ).toEqual(beforeFailure);
    expect(orderA.items[0].inventoryItemId).toBe(stockA.id);
  });
});
