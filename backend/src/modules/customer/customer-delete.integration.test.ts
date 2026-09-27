import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { prisma } from '../../lib/prisma.js';
import { customerService } from './customer.service.js';

const suffix = randomUUID();
const password = `Excluir1!${suffix}`;
const emails = [`excluir-a-${suffix}@test.invalid`, `excluir-b-${suffix}@test.invalid`];
let userA = '';
let _userB = '';
let tokenB = '';
let wineId = '';

beforeAll(async () => {
  userA = (
    await request(app).post('/api/auth/register').send({ name: 'Excluir A', email: emails[0], password })
  ).body.id;
  _userB = (
    await request(app).post('/api/auth/register').send({ name: 'Excluir B', email: emails[1], password })
  ).body.id;
  tokenB = (await request(app).post('/api/auth/login').send({ email: emails[1], password })).body.token;
  wineId = (await prisma.wine.findFirstOrThrow({ where: { status: 'PUBLISHED' }, select: { id: true } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe('Exclusão real de garrafas por compra', () => {
  it('remove uma unidade ou somente todas as unidades da compra selecionada', async () => {
    const purchaseA = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-27T12:00:00Z'),
      purchaseLocation: 'Loja A',
      items: [{ wineId, quantityBottles: 5 }],
    });
    const purchaseB = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-27T12:00:00Z'),
      purchaseLocation: 'Loja B',
      items: [{ wineId, quantityBottles: 2 }],
    });
    const itemA = purchaseA.items[0];
    const bottlesA = await prisma.cellarBottle.findMany({
      where: { orderItemId: itemA.id },
      orderBy: { id: 'asc' },
    });
    await customerService.openBottle(userA, bottlesA[0].id, { occurredAt: new Date('2026-09-27T13:00:00Z') });
    await customerService.finishBottle(userA, bottlesA[0].id, {
      occurredAt: new Date('2026-09-27T14:00:00Z'),
    });
    await customerService.openBottle(userA, bottlesA[1].id, { occurredAt: new Date('2026-09-27T13:00:00Z') });

    await customerService.removeBottle(userA, bottlesA[0].id);
    expect(await prisma.cellarBottle.findUnique({ where: { id: bottlesA[0].id } })).toBeNull();
    expect(await prisma.inventoryMovement.count({ where: { cellarBottleId: bottlesA[0].id } })).toBe(0);
    expect(
      (await customerService.listOrders(userA)).find(({ id }) => id === purchaseA.id)?.items[0]
        .quantityBottles,
    ).toBe(4);

    await customerService.removeOrderItemBottles(userA, purchaseA.id, itemA.id, false);
    expect(
      (await customerService.listOrders(userA)).find(({ id }) => id === purchaseA.id)?.items[0]
        .quantityBottles,
    ).toBe(3);
    await request(app)
      .delete(`/api/cliente/pedidos/${purchaseA.id}/itens/${itemA.id}/garrafas`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await customerService.removeOrderItemBottles(userA, purchaseA.id, itemA.id, true);
    expect(await prisma.customerOrder.findUnique({ where: { id: purchaseA.id } })).toBeNull();
    expect(await prisma.cellarBottle.count({ where: { orderItemId: itemA.id } })).toBe(0);
    const remaining = await customerService.listOrders(userA);
    expect(remaining.map(({ id }) => id)).toContain(purchaseB.id);
    expect(remaining.find(({ id }) => id === purchaseB.id)?.items[0].quantityBottles).toBe(2);
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toMatchObject({
      acquiredBottles: 2,
      availableBottles: 2,
      openedBottles: 0,
      consumedBottles: 0,
    });
  });
});
