import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { winesService } from './wines/wines.service.js';
import { vintagesService } from './vintages/vintages.service.js';
import { batchesService } from './batches/batches.service.js';
import { batchSchema } from './batches/batches.schema.js';
import { customerService } from './customer/customer.service.js';

const tag = 'relations-' + Date.now();
let userId: string, wineryId: string, typeId: string, grapeId: string, secondGrapeId: string;
const wineIds: string[] = [];
const vintageIds: string[] = [];
const batchIds: string[] = [];

beforeAll(async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  userId = (await prisma.user.create({ data: { name: tag, email: tag + '@test.invalid', passwordHash: 'not-a-login', roleId: role.id } })).id;
  wineryId = (await prisma.winery.create({ data: { name: tag, cnpj: tag, city: 'Teste', state: 'RS' } })).id;
  typeId = (await prisma.wineType.create({ data: { name: tag } })).id;
  grapeId = (await prisma.grape.create({ data: { name: tag } })).id;
  secondGrapeId = (await prisma.grape.create({ data: { name: tag + '-second' } })).id;
  for (const suffix of ['a', 'b']) {
    const wine = await winesService.create({
      name: tag + suffix, wineryId, typeId, grapeIds: suffix === 'a' ? [grapeId] : [grapeId, secondGrapeId], volume: 750,
      alcohol: 13.5, description: 'Cadastro isolado para teste de integridade.', status: 'Ativo',
    }, userId);
    wineIds.push(wine.id);
  }
});

afterAll(async () => {
  await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  await prisma.vintage.deleteMany({ where: { id: { in: vintageIds } } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.wine.deleteMany({ where: { id: { in: wineIds } } });
  if (wineryId) await prisma.winery.delete({ where: { id: wineryId } });
  if (typeId) await prisma.wineType.delete({ where: { id: typeId } });
  if (grapeId) await prisma.grape.delete({ where: { id: grapeId } });
  if (secondGrapeId) await prisma.grape.delete({ where: { id: secondGrapeId } });
  await prisma.$disconnect();
});

describe('Integridade real no PostgreSQL', () => {
  it('recusa safra sem vinho', async () => {
    await expect(vintagesService.create({ identifier: 'SF25-T99', year: 2025, status: 'Concluída', grapeIds: [grapeId] })).rejects.toThrow('Selecione o vinho');
  });

  it('puxa as uvas do vinho ao criar e ao trocar o vinho, ignorando a seleção manual', async () => {
    const vintage = await vintagesService.create({
      identifier: tag + '-auto', year: 2025, status: 'Concluída', wineId: wineIds[0],
    });
    vintageIds.push(vintage.id);
    expect(vintage.grapeIds).toEqual([grapeId]);
    const updated = await vintagesService.update(vintage.id, { wineId: wineIds[1], grapeIds: ['uva-manual-invalida'] });
    expect(updated.grapeIds.sort()).toEqual([grapeId, secondGrapeId].sort());
    const saved = await vintagesService.update(vintage.id, { grapeIds: [] });
    expect(saved.grapeIds.sort()).toEqual([grapeId, secondGrapeId].sort());
  });

  it('recusa salvar safra quando o vinho não possui uvas', async () => {
    await prisma.wineGrape.deleteMany({ where: { wineId: wineIds[1] } });
    try {
      await expect(vintagesService.create({
        identifier: tag + '-empty', year: 2025, status: 'Concluída', wineId: wineIds[1], grapeIds: [grapeId],
      })).rejects.toThrow('Cadastre as uvas do vinho');
    } finally {
      await prisma.wineGrape.createMany({ data: [grapeId, secondGrapeId].map((id) => ({ wineId: wineIds[1], grapeId: id })) });
    }
  });

  it('protege o par vinho/safra na aplicação e diretamente no banco', async () => {
    const vintage = await prisma.vintage.create({ data: {
      identifier: tag, wineId: wineIds[0], year: 2025, status: 'Concluída',
      grapeLinks: { create: { grapeId } },
    } });
    vintageIds.push(vintage.id);
    const input = { code: 'L25200', wineId: wineIds[1], vintageId: vintage.id, quantity: 1.5, productionDate: '2025-07-19', status: 'Aguardando registro' };
    await expect(batchesService.create(input)).rejects.toThrow('não pertence');
    await expect(prisma.batch.create({ data: {
      code: tag, wineId: wineIds[1], vintageId: vintage.id, quantityLiters: 1.5,
      productionDate: new Date(), status: 'Aguardando registro',
    } })).rejects.toThrow();
    const batch = await prisma.batch.create({ data: {
      code: tag, wineId: wineIds[0], vintageId: vintage.id, quantityLiters: 1.5,
      productionDate: new Date(), status: 'Aguardando registro',
    } });
    batchIds.push(batch.id);
    await expect(prisma.vintage.update({ where: { id: vintage.id }, data: { wineId: wineIds[1] } })).rejects.toThrow();
    await expect(prisma.wine.delete({ where: { id: wineIds[0] } })).rejects.toThrow();
    await expect(prisma.grape.delete({ where: { id: grapeId } })).rejects.toThrow();
  });

  it('não transforma 1.5 litros em 15 litros', () => {
    const base = { code: 'L25200', wineId: 'wine', vintageId: 'vintage', productionDate: '2025-07-19', status: 'Aguardando registro' };
    expect(batchSchema.parse({ ...base, quantity: 1.5 }).quantity).toBe(1.5);
    expect(batchSchema.parse({ ...base, quantity: '1,5' }).quantity).toBe(1.5);
    expect(batchSchema.parse({ ...base, quantity: '1.250,5' }).quantity).toBe(1250.5);
  });

  it('salva pedidos concorrentes em um estoque único, com movimentos vinculados', async () => {
    const orders = await Promise.all([1, 2, 3].map(() => customerService.createOrder(userId, {
      source: 'VINICULA', purchaseDate: new Date(), purchaseLocation: 'Supermercado',
      items: [{ wineId: wineIds[0], quantityBottles: 2 }],
    })));
    const stock = await prisma.inventoryItem.findMany({ where: { userId, wineId: wineIds[0] }, include: { movements: true } });
    expect(stock).toHaveLength(1);
    expect(stock[0].quantityBottles).toBe(6);
    expect(stock[0].movements).toHaveLength(3);
    expect(stock[0].movements.every((m) => orders.some((o) => o.id === m.orderId))).toBe(true);
    const results = await Promise.allSettled([1, 2].map(() => customerService.addMovement(userId, stock[0].id, { type: 'CONSUMO', quantityBottles: 4 })));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stock[0].id } })).quantityBottles).toBe(2);
    await expect(prisma.inventoryItem.update({ where: { id: stock[0].id }, data: { quantityBottles: -1 } })).rejects.toThrow();
    await customerService.removeOrder(userId, orders[0].id);
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stock[0].id } })).quantityBottles).toBe(2);
    expect(await prisma.inventoryMovement.count({ where: { inventoryItemId: stock[0].id } })).toBe(4);
  });

  it('permite rótulo externo sem pedido e ajuste absoluto do saldo', async () => {
    const item = await customerService.createInventoryItem(userId, { name: tag, wineryName: 'Origem externa', quantityBottles: 4 });
    expect(item.wineId).toBeNull();
    await customerService.addMovement(userId, item.id, { type: 'AJUSTE', quantityBottles: 1 });
    const adjusted = await customerService.addMovement(userId, item.id, { type: 'AJUSTE', quantityBottles: 0 });
    expect(adjusted.quantityBottles).toBe(0);
    expect(adjusted.active).toBe(false);
    await expect(customerService.addMovement('outro-usuario', item.id, { type: 'ENTRADA', quantityBottles: 1 })).rejects.toThrow('Item não encontrado');
  });

  it('edita sem duplicar compra, preserva a data e protege saldo consumido', async () => {
    const input = {
      source: 'VINICULA' as const, purchaseDate: new Date('2026-01-05'), purchaseLocation: 'Mercado',
      items: [{ wineId: wineIds[1], quantityBottles: 5 }],
    };
    const order = await customerService.createOrder(userId, input);
    const item = order.items[0];
    const updated = await customerService.updateOrderItem(userId, order.id, item.id, {
      ...input, purchaseLocation: 'Supermercado', items: [{ wineId: wineIds[1], quantityBottles: 3 }],
    });
    expect(updated.id).toBe(order.id);
    expect(updated.purchaseDate).toEqual(input.purchaseDate);
    expect(updated.items[0].id).toBe(item.id);
    expect(updated.items[0].quantityBottles).toBe(3);
    const stock = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId! } });
    expect(stock.quantityBottles).toBe(3);
    await customerService.addMovement(userId, stock.id, { type: 'CONSUMO', quantityBottles: 2 });
    await expect(customerService.updateOrderItem(userId, order.id, item.id, {
      ...input, items: [{ wineId: wineIds[1], quantityBottles: 1 }],
    })).rejects.toThrow('já consumidas');
    expect((await prisma.customerOrderItem.findUniqueOrThrow({ where: { id: item.id } })).quantityBottles).toBe(3);
    await customerService.removeOrder(userId, order.id);
    const movements = await prisma.inventoryMovement.findMany({ where: { inventoryItemId: stock.id } });
    expect(movements.some((m) => m.purchaseLocation === 'Supermercado' && m.orderId === null)).toBe(true);
  });

  it('rejeita vínculo de pedido com estoque de outro cliente no próprio banco', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    const other = await prisma.user.create({ data: { name: tag, email: tag + '-other@test.invalid', passwordHash: 'not-a-login', roleId: role.id } });
    try {
      const stock = await customerService.createInventoryItem(other.id, { name: tag, quantityBottles: 1 });
      const order = await prisma.customerOrder.create({ data: { userId, purchaseDate: new Date(), source: 'OUTRO_LOCAL' } });
      await expect(prisma.customerOrderItem.create({ data: {
        orderId: order.id, wineName: tag, quantityBottles: 1, inventoryItemId: stock.id,
      } })).rejects.toThrow();
      await expect(prisma.inventoryMovement.create({ data: {
        orderId: order.id, inventoryItemId: stock.id, type: 'ENTRADA', quantityBottles: 1,
      } })).rejects.toThrow();
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }
  });
});
