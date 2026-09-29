import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { customerService } from './customer.service.js';
import { civilDateKey, todayCivilDate } from './customer.schema.js';

const suffix = randomUUID();
const emailA = `dashboard-a-${suffix}@test.invalid`;
const emailB = `dashboard-b-${suffix}@test.invalid`;
const emailC = `dashboard-c-${suffix}@test.invalid`;
const password = `Painel1!${suffix}`;
let userA = '';
let userB = '';
let userC = '';
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
  userC = (
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dashboard C', email: emailC, password })
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
  await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB, emailC] } } });
  await prisma.$disconnect();
});

describe('Pedidos, estoque e dashboard por cliente', () => {
  it('pagina compras e garrafas após ordenar e filtrar, sem cruzar clientes', async () => {
    expect(await customerService.listOrdersPage(userC, { page: 1, limit: 10 })).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    const orderIds = Array.from({ length: 21 }, (_, index) => `page-order-${suffix}-${index + 1}`);
    await prisma.customerOrder.createMany({
      data: orderIds.map((id, index) => ({
        id,
        userId: userC,
        source: 'VINICULA',
        purchaseDate: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T12:00:00Z`),
        purchaseLocation: 'Teste de paginação',
      })),
    });
    await prisma.customerOrderItem.createMany({
      data: orderIds.map((orderId, index) => ({
        id: `page-item-${suffix}-${index + 1}`,
        orderId,
        wineId: wineA,
        wineName: `Compra paginada ${index + 1}`,
        quantityBottles: 1,
      })),
    });
    const orders10 = await customerService.listOrdersPage(userC, { page: 1, limit: 10 });
    expect(orders10).toMatchObject({ total: 21, page: 1, limit: 10, totalPages: 3 });
    expect(orders10.items).toHaveLength(10);
    expect((await customerService.listOrdersPage(userC, { page: 2, limit: 10 })).items).toHaveLength(10);
    expect((await customerService.listOrdersPage(userC, { page: 3, limit: 10 })).items).toHaveLength(1);
    expect(await customerService.listOrdersPage(userC, { page: 2, limit: 20 })).toMatchObject({
      total: 21,
      totalPages: 2,
      page: 2,
      limit: 20,
    });

    const inventory = await prisma.inventoryItem.create({
      data: {
        userId: userC,
        wineId: wineA,
        name: 'Estoque paginado',
        wineryName: 'VINUM',
        quantityBottles: 13,
      },
    });
    await prisma.cellarBottle.createMany({
      data: Array.from({ length: 25 }, (_, index) => ({
        id: `page-bottle-${suffix}-${index + 1}`,
        userId: userC,
        inventoryItemId: inventory.id,
        status: index < 12 ? 'CONSUMIDA' : 'DISPONIVEL',
        purchasedAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T12:00:00Z`),
        finishedAt: index < 12 ? new Date('2026-02-01T12:00:00Z') : null,
      })),
    });
    const bottles10 = await customerService.listBottlesPage(userC, { page: 1, limit: 10 });
    expect(bottles10).toMatchObject({ total: 25, page: 1, limit: 10, totalPages: 3 });
    expect(bottles10.items).toHaveLength(10);
    expect((await customerService.listBottlesPage(userC, { page: 2, limit: 10 })).items).toHaveLength(10);
    expect((await customerService.listBottlesPage(userC, { page: 3, limit: 10 })).items).toHaveLength(5);
    expect(await customerService.listBottlesPage(userC, { page: 1, limit: 20 })).toMatchObject({
      total: 25,
      totalPages: 2,
    });
    expect(await customerService.listBottlesPage(userC, { page: 1, limit: 50 })).toMatchObject({
      total: 25,
      totalPages: 1,
    });
    const typeId = (await prisma.wine.findUniqueOrThrow({ where: { id: wineA }, select: { typeId: true } }))
      .typeId;
    const filtered = await customerService.listBottlesPage(userC, {
      page: 1,
      limit: 10,
      status: 'CONSUMIDA',
      wineTypeId: typeId,
      purchasedFrom: new Date('2026-01-05T12:00:00Z'),
      purchasedTo: new Date('2026-01-10T12:00:00Z'),
    });
    expect(filtered).toMatchObject({ total: 6, totalPages: 1 });
    expect(filtered.items).toHaveLength(6);
    expect((await customerService.listBottlesPage(userA, { page: 1, limit: 100 })).total).toBe(0);
  });

  it('executa a matriz funcional obrigatória com dados reais', async () => {
    const orderA = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-01-05T12:00:00Z'),
      purchaseLocation: 'Loja A',
      items: [{ wineId: wineA, quantityBottles: 6 }],
    });
    const stockA = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: userA, wineId: wineA } });
    expect(await customerService.getInventoryDashboard(userA, 2026)).toMatchObject({
      totals: {
        acquiredBottles: 6,
        consumedBottles: 0,
        availableBottles: 6,
        openedBottles: 0,
        labelCount: 1,
      },
    });

    const firstBottles = await customerService.listBottles(userA);
    expect(firstBottles).toHaveLength(6);
    expect(firstBottles.map((bottle) => bottle.bottleNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(firstBottles.every((bottle) => bottle.status === 'DISPONIVEL')).toBe(true);
    const opened = await customerService.openBottle(userA, firstBottles[0].id, {
      occurredAt: new Date('2026-01-10T12:00:00Z'),
    });
    expect(opened.status).toBe('ABERTA');
    expect(opened.openedAt).toEqual(new Date('2026-01-10T12:00:00Z'));
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals.openedBottles).toBe(1);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stockA.id } })).quantityBottles).toBe(
      6,
    );
    await customerService.finishBottle(userA, firstBottles[0].id, {
      occurredAt: new Date('2026-01-15T12:00:00Z'),
    });
    await customerService.openBottle(userA, firstBottles[1].id, {
      occurredAt: new Date('2026-01-14T12:00:00Z'),
    });
    await customerService.finishBottle(userA, firstBottles[1].id, {
      occurredAt: new Date('2026-01-15T12:00:00Z'),
    });
    const consumedBottle = await customerService.getBottle(userA, firstBottles[0].id);
    expect(consumedBottle.status).toBe('CONSUMIDA');
    expect(consumedBottle.finishedAt).toEqual(new Date('2026-01-15T12:00:00Z'));
    await expect(
      customerService.openBottle(userA, firstBottles[0].id, { occurredAt: new Date() }),
    ).rejects.toThrow('disponível');
    const orderedAfterConsumption = await customerService.listBottles(userA);
    expect(orderedAfterConsumption.map((bottle) => bottle.status)).toEqual([
      'DISPONIVEL',
      'DISPONIVEL',
      'DISPONIVEL',
      'DISPONIVEL',
      'CONSUMIDA',
      'CONSUMIDA',
    ]);
    expect(orderedAfterConsumption.slice(0, 4).map((bottle) => bottle.bottleNumber)).toEqual([3, 4, 5, 6]);
    expect(orderedAfterConsumption.slice(4).map((bottle) => bottle.bottleNumber)).toEqual([1, 2]);
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toEqual({
      acquiredBottles: 6,
      consumedBottles: 2,
      availableBottles: 4,
      openedBottles: 0,
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
      openedBottles: 0,
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
      openedBottles: 0,
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
      openedBottles: 0,
      labelCount: 3,
    });
    expect(await prisma.wine.count({ where: { name: externalName } })).toBe(0);
    expect(await prisma.winery.count()).toBe(wineriesBefore);

    const wineAType = await prisma.wine.findUniqueOrThrow({
      where: { id: wineA },
      select: { typeId: true },
    });
    expect(
      await customerService.listBottles(userA, {
        purchasedFrom: new Date('2026-01-20T12:00:00Z'),
        purchasedTo: new Date('2026-02-02T12:00:00Z'),
      }),
    ).toHaveLength(7);
    expect(
      await customerService.listBottles(userA, {
        purchasedFrom: new Date('2026-01-05T12:00:00Z'),
        purchasedTo: new Date('2026-01-05T12:00:00Z'),
      }),
    ).toHaveLength(6);
    expect(
      await customerService.listBottles(userA, { purchasedFrom: new Date('2026-02-02T12:00:00Z') }),
    ).toHaveLength(7);
    expect(
      await customerService.listBottles(userA, { purchasedTo: new Date('2026-01-05T12:00:00Z') }),
    ).toHaveLength(6);
    const combinedFilters = await customerService.listBottles(userA, {
      status: 'DISPONIVEL',
      wineTypeId: wineAType.typeId,
      purchasedFrom: new Date('2026-01-05T12:00:00Z'),
      purchasedTo: new Date('2026-01-20T12:00:00Z'),
    });
    expect(combinedFilters).toHaveLength(7);
    expect(combinedFilters.every((bottle) => bottle.inventoryItem.wine?.typeId === wineAType.typeId)).toBe(
      true,
    );
    const wineTypes = await customerService.listBottleWineTypes(userA);
    expect(wineTypes.map(({ id }) => id)).toContain(wineAType.typeId);
    expect(await customerService.listBottleWineTypes(userB)).toEqual(wineTypes);

    const filteredResponse = await request(app)
      .get(
        `/api/cliente/estoque/garrafas?status=DISPONIVEL&wineTypeId=${wineAType.typeId}&purchasedFrom=2026-01-05&purchasedTo=2026-01-20`,
      )
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(filteredResponse.body).toMatchObject({ total: 7, page: 1, limit: 10, totalPages: 1 });
    expect(filteredResponse.body.items).toHaveLength(7);
    await request(app)
      .get('/api/cliente/estoque/garrafas?purchasedFrom=2026-01-21&purchasedTo=2026-01-20')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);
    expect(
      (await request(app).get('/api/cliente/estoque/tipos-vinho').set('Authorization', `Bearer ${tokenA}`))
        .body,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: wineAType.typeId })]));

    const stockB = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: userA, wineId: wineB } });
    const movementsBefore = await prisma.inventoryMovement.count({ where: { inventoryItemId: stockB.id } });
    await expect(
      customerService.registerConsumption(userA, stockB.id, {
        quantityBottles: 5,
        occurredAt: new Date('2026-02-10T12:00:00Z'),
      }),
    ).rejects.toThrow('maior que o saldo');
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
      openedBottles: 0,
      labelCount: 3,
    });

    expect((await customerService.getInventoryDashboard(userB, 2026)).totals).toEqual({
      acquiredBottles: 0,
      consumedBottles: 0,
      availableBottles: 0,
      openedBottles: 0,
      labelCount: 0,
    });
    expect(await customerService.listOrders(userB)).toEqual([]);
    expect(await customerService.listInventory(userB)).toEqual([]);
    await expect(customerService.getBottle(userB, firstBottles[0].id)).rejects.toThrow('não encontrada');
    await expect(
      customerService.discardBottle(userB, firstBottles[2].id, {
        occurredAt: new Date('2026-03-20T12:00:00Z'),
        reason: 'Tentativa fora da conta proprietária',
      }),
    ).rejects.toThrow('não encontrada');
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

  it('mantém três unidades crescentes e reaplica a ordem por status em nova carga', async () => {
    await customerService.createOrder(userB, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-26T12:00:00Z'),
      purchaseLocation: 'Teste controlado',
      items: [{ wineId: wineA, quantityBottles: 3 }],
    });
    const initial = await customerService.listBottles(userB);
    expect(initial.map((bottle) => bottle.bottleNumber)).toEqual([1, 2, 3]);
    expect(initial.map((bottle) => bottle.status)).toEqual(['DISPONIVEL', 'DISPONIVEL', 'DISPONIVEL']);

    const second = initial[1];
    await customerService.openBottle(userB, second.id, {
      occurredAt: new Date('2026-09-26T13:00:00Z'),
    });
    expect((await customerService.listBottles(userB, 'ABERTA')).map((bottle) => bottle.id)).toEqual([
      second.id,
    ]);
    expect((await customerService.listBottles(userB)).map((bottle) => bottle.bottleNumber)).toEqual([
      1, 3, 2,
    ]);

    await customerService.finishBottle(userB, second.id, {
      occurredAt: new Date('2026-09-26T14:00:00Z'),
    });
    const reloaded = await customerService.listBottles(userB);
    expect(reloaded.map((bottle) => bottle.bottleNumber)).toEqual([1, 3, 2]);
    expect(reloaded.map((bottle) => bottle.status)).toEqual(['DISPONIVEL', 'DISPONIVEL', 'CONSUMIDA']);
    expect((await customerService.getBottle(userB, second.id)).status).toBe('CONSUMIDA');

    const discarded = await customerService.discardBottle(userB, initial[0].id, {
      occurredAt: new Date('2026-09-26T15:00:00Z'),
      reason: 'Rolha danificada durante o armazenamento',
    });
    expect(discarded).toMatchObject({
      status: 'DESCARTADA',
      discardReason: 'Rolha danificada durante o armazenamento',
    });
    expect((await customerService.listBottles(userB, 'DESCARTADA')).map((bottle) => bottle.id)).toEqual([
      initial[0].id,
    ]);
    await customerService.openBottle(userB, initial[2].id, {
      occurredAt: new Date('2026-09-26T15:00:00Z'),
    });
    const discardedAfterOpening = await customerService.discardBottle(userB, initial[2].id, {
      occurredAt: new Date('2026-09-26T16:00:00Z'),
      reason: 'Vinho oxidado depois da abertura',
    });
    expect(discardedAfterOpening.openedAt).toEqual(new Date('2026-09-26T15:00:00Z'));
    expect(discardedAfterOpening.discardedAt).toEqual(new Date('2026-09-26T16:00:00Z'));
    await expect(
      customerService.finishBottle(userB, discardedAfterOpening.id, {
        occurredAt: new Date('2026-09-26T17:00:00Z'),
      }),
    ).rejects.toThrow('Somente uma garrafa aberta');
    await expect(
      customerService.discardBottle(userB, second.id, {
        occurredAt: new Date('2026-09-26T17:00:00Z'),
        reason: 'Não pode descartar uma garrafa consumida',
      }),
    ).rejects.toThrow('disponível ou aberta');
    expect((await customerService.listBottles(userB)).map((bottle) => bottle.status)).toEqual([
      'CONSUMIDA',
      'DESCARTADA',
      'DESCARTADA',
    ]);
    expect((await customerService.getInventoryDashboard(userB, 2026)).totals).toMatchObject({
      acquiredBottles: 3,
      availableBottles: 0,
      openedBottles: 0,
      consumedBottles: 1,
    });
    expect((await customerService.getInventoryDashboard(userB, 2026)).monthlyConsumption[8]).toEqual({
      month: 9,
      bottles: 1,
    });
    expect(
      (await prisma.inventoryItem.findFirstOrThrow({ where: { userId: userB, wineId: wineA } }))
        .quantityBottles,
    ).toBe(0);
  });

  it('aplica as regras por dia civil sem bloquear a data atual', async () => {
    const currentKey = todayCivilDate();
    const current = new Date(`${currentKey}T12:00:00.000Z`);
    const previous = new Date(current);
    previous.setUTCDate(previous.getUTCDate() - 1);
    const beforePurchase = new Date(previous);
    beforePurchase.setUTCDate(beforePurchase.getUTCDate() - 1);
    const next = new Date(current);
    next.setUTCDate(next.getUTCDate() + 1);

    const order = await customerService.createOrder(userB, {
      source: 'VINICULA',
      purchaseDate: previous,
      purchaseLocation: 'Teste de datas civis',
      items: [{ wineId: wineB, quantityBottles: 3 }],
    });
    const bottles = await prisma.cellarBottle.findMany({
      where: { orderItemId: order.items[0].id },
      orderBy: { id: 'asc' },
    });

    const openedOnPurchase = await customerService.openBottle(userB, bottles[0].id, {
      occurredAt: previous,
    });
    expect(civilDateKey(openedOnPurchase.openedAt!)).toBe(civilDateKey(previous));
    const finishedOnPurchase = await customerService.finishBottle(userB, bottles[0].id, {
      occurredAt: previous,
    });
    expect(civilDateKey(finishedOnPurchase.finishedAt!)).toBe(civilDateKey(previous));

    await customerService.openBottle(userB, bottles[1].id, { occurredAt: current });
    await expect(
      customerService.finishBottle(userB, bottles[1].id, { occurredAt: previous }),
    ).rejects.toThrow('anterior à compra ou à abertura');
    const finishedToday = await customerService.finishBottle(userB, bottles[1].id, {
      occurredAt: current,
    });
    expect(civilDateKey(finishedToday.finishedAt!)).toBe(currentKey);

    await expect(customerService.openBottle(userB, bottles[2].id, { occurredAt: next })).rejects.toThrow(
      'não pode estar no futuro',
    );
    await expect(
      customerService.discardBottle(userB, bottles[2].id, {
        occurredAt: beforePurchase,
        reason: 'Data anterior à compra',
      }),
    ).rejects.toThrow('anterior à compra ou à abertura');
    await expect(
      customerService.discardBottle(userB, bottles[2].id, {
        occurredAt: next,
        reason: 'Data futura',
      }),
    ).rejects.toThrow('não pode estar no futuro');

    const oldOrder = await customerService.createOrder(userB, {
      source: 'VINICULA',
      purchaseDate: new Date('2000-01-01T12:00:00.000Z'),
      purchaseLocation: 'Teste sem intervalo máximo',
      items: [{ wineId: wineB, quantityBottles: 1 }],
    });
    const oldBottle = await prisma.cellarBottle.findFirstOrThrow({
      where: { orderItemId: oldOrder.items[0].id },
    });
    await expect(
      customerService.openBottle(userB, oldBottle.id, { occurredAt: current }),
    ).resolves.toMatchObject({
      status: 'ABERTA',
    });
    await expect(
      customerService.discardBottle(userB, oldBottle.id, {
        occurredAt: previous,
        reason: 'Antes da abertura',
      }),
    ).rejects.toThrow('anterior à compra ou à abertura');
    await expect(
      customerService.discardBottle(userB, oldBottle.id, {
        occurredAt: current,
        reason: 'Descarte no mesmo dia da abertura',
      }),
    ).resolves.toMatchObject({ status: 'DESCARTADA' });
  });
});
