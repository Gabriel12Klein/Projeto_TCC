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
let tokenB = '';
let wineId = '';

beforeAll(async () => {
  userA = (
    await request(app).post('/api/auth/register').send({ name: 'Excluir A', email: emails[0], password })
  ).body.id;
  await request(app).post('/api/auth/register').send({ name: 'Excluir B', email: emails[1], password });
  tokenB = (await request(app).post('/api/auth/login').send({ email: emails[1], password })).body.token;
  wineId = (await prisma.wine.findFirstOrThrow({ where: { status: 'PUBLISHED' }, select: { id: true } })).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

describe('Exclusão real de garrafas por compra', () => {
  it('reduz somente a compra de origem e preserva unidades com histórico', async () => {
    const purchaseA = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-27T12:00:00Z'),
      purchaseLocation: 'Loja A',
      items: [{ wineId, quantityBottles: 10 }],
    });
    const purchaseB = await customerService.createOrder(userA, {
      source: 'VINICULA',
      purchaseDate: new Date('2026-09-27T12:00:00Z'),
      purchaseLocation: 'Loja B',
      items: [{ wineId, quantityBottles: 5 }],
    });
    const itemA = purchaseA.items[0];
    const bottlesA = await prisma.cellarBottle.findMany({
      where: { orderItemId: itemA.id },
      orderBy: { id: 'asc' },
    });
    expect(bottlesA).toHaveLength(10);
    await customerService.removeBottle(userA, bottlesA[2].id);
    expect(await prisma.cellarBottle.findUnique({ where: { id: bottlesA[2].id } })).toBeNull();
    const afterSingleDelete = await customerService.listOrders(userA);
    expect(afterSingleDelete.find(({ id }) => id === purchaseA.id)?.items[0].quantityBottles).toBe(9);
    expect(afterSingleDelete.find(({ id }) => id === purchaseB.id)?.items[0].quantityBottles).toBe(5);

    await customerService.openBottle(userA, bottlesA[0].id, {
      occurredAt: new Date('2026-09-27T13:00:00Z'),
    });
    await customerService.finishBottle(userA, bottlesA[0].id, {
      occurredAt: new Date('2026-09-27T14:00:00Z'),
    });
    await customerService.openBottle(userA, bottlesA[1].id, { occurredAt: new Date('2026-09-27T13:00:00Z') });

    await expect(customerService.removeBottle(userA, bottlesA[0].id)).rejects.toThrow(
      'Somente garrafas disponíveis',
    );
    await expect(customerService.removeBottle(userA, bottlesA[1].id)).rejects.toThrow(
      'Somente garrafas disponíveis',
    );
    await request(app)
      .delete(`/api/cliente/pedidos/${purchaseA.id}/itens/${itemA.id}/garrafas`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await expect(customerService.removeOrderItemBottles(userA, purchaseA.id, itemA.id, true)).rejects.toThrow(
      'há garrafas abertas, consumidas ou descartadas',
    );
    expect(await prisma.customerOrder.findUnique({ where: { id: purchaseA.id } })).not.toBeNull();

    const itemB = purchaseB.items[0];
    await customerService.removeOrderItemBottles(userA, purchaseB.id, itemB.id, true);
    expect(await prisma.customerOrder.findUnique({ where: { id: purchaseB.id } })).toBeNull();
    const remaining = await customerService.listOrders(userA);
    expect(remaining.map(({ id }) => id)).toContain(purchaseA.id);
    expect(remaining.find(({ id }) => id === purchaseA.id)?.items[0].quantityBottles).toBe(9);
    expect((await customerService.getInventoryDashboard(userA, 2026)).totals).toMatchObject({
      acquiredBottles: 9,
      availableBottles: 7,
      openedBottles: 1,
      consumedBottles: 1,
    });
  });
});
