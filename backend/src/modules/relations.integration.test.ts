import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { winesService } from './wines/wines.service.js';
import { vintagesService } from './vintages/vintages.service.js';
import { batchesService } from './batches/batches.service.js';
import { batchSchema } from './batches/batches.schema.js';
import { customerService } from './customer/customer.service.js';
import { todayCivilDate } from './customer/customer.schema.js';

const tag = 'relations-' + Date.now();
let userId: string, wineryId: string, typeId: string, grapeId: string, secondGrapeId: string;
const wineIds: string[] = [];
const vintageIds: string[] = [];
const batchIds: string[] = [];
async function unusedVintageIdentifier() {
  for (let tank = 0; tank < 100; tank++) {
    const identifier = 'SF99-T' + String(tank).padStart(2, '0');
    if (!(await prisma.vintage.findUnique({ where: { identifier } }))) return identifier;
  }
  throw new Error('Nenhum identificador livre para o teste.');
}

beforeAll(async () => {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
  userId = (
    await prisma.user.create({
      data: { name: tag, email: tag + '@test.invalid', passwordHash: 'not-a-login', roleId: role.id },
    })
  ).id;
  wineryId = (await prisma.winery.findFirstOrThrow()).id;
  typeId = (await prisma.wineType.create({ data: { name: tag } })).id;
  grapeId = (await prisma.grape.create({ data: { name: tag } })).id;
  secondGrapeId = (await prisma.grape.create({ data: { name: tag + '-second' } })).id;
  for (const suffix of ['a', 'b']) {
    const wine = await winesService.create(
      {
        name: tag + suffix,
        wineryId,
        typeId,
        classificationId: 'classification-seco',
        grapeIds: suffix === 'a' ? [grapeId] : [grapeId, secondGrapeId],
        volume: 750,
        alcohol: 13.5,
        description: 'Cadastro isolado para teste de integridade.',
        status: 'Ativo',
      },
      userId,
    );
    wineIds.push(wine.id);
  }
});

afterAll(async () => {
  await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
  await prisma.vintage.deleteMany({ where: { id: { in: vintageIds } } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.wine.deleteMany({ where: { id: { in: wineIds } } });
  if (typeId) await prisma.wineType.delete({ where: { id: typeId } });
  if (grapeId) await prisma.grape.delete({ where: { id: grapeId } });
  if (secondGrapeId) await prisma.grape.delete({ where: { id: secondGrapeId } });
  await prisma.$disconnect();
});

describe('Integridade real no PostgreSQL', () => {
  it('recusa safra sem vinho', async () => {
    await expect(
      vintagesService.create({
        identifier: 'SF25-T99',
        year: 2025,
        status: 'Concluída',
        grapeIds: [grapeId],
      }),
    ).rejects.toThrow('Selecione o vinho');
  });

  it('puxa as uvas do vinho ao criar e ao trocar o vinho, ignorando a seleção manual', async () => {
    const vintage = await vintagesService.create({
      identifier: await unusedVintageIdentifier(),
      year: 2099,
      status: 'Concluída',
      wineId: wineIds[0],
    });
    vintageIds.push(vintage.id);
    expect(vintage.grapeIds).toEqual([grapeId]);
    const updated = await vintagesService.update(vintage.id, {
      wineId: wineIds[1],
      grapeIds: ['uva-manual-invalida'],
    });
    expect(updated.grapeIds.sort()).toEqual([grapeId, secondGrapeId].sort());
    const saved = await vintagesService.update(vintage.id, { grapeIds: [] });
    expect(saved.grapeIds.sort()).toEqual([grapeId, secondGrapeId].sort());
  });

  it('recusa salvar safra quando o vinho não possui uvas', async () => {
    await prisma.wineGrape.deleteMany({ where: { wineId: wineIds[1] } });
    try {
      await expect(
        vintagesService.create({
          identifier: tag + '-empty',
          year: 2025,
          status: 'Concluída',
          wineId: wineIds[1],
          grapeIds: [grapeId],
        }),
      ).rejects.toThrow('Cadastre as uvas do vinho');
    } finally {
      await prisma.wineGrape.createMany({
        data: [grapeId, secondGrapeId].map((id) => ({ wineId: wineIds[1], grapeId: id })),
      });
    }
  });

  it('protege o par vinho/safra na aplicação e diretamente no banco', async () => {
    const vintage = await prisma.vintage.create({
      data: {
        identifier: tag,
        wineId: wineIds[0],
        year: 2025,
        status: 'Concluída',
        grapeLinks: { create: { grapeId } },
      },
    });
    vintageIds.push(vintage.id);
    const input = {
      code: 'L25200',
      wineId: wineIds[1],
      vintageId: vintage.id,
      quantity: 1.5,
      productionDate: '2025-07-19',
      status: 'Aguardando registro',
    };
    await expect(batchesService.create(input)).rejects.toThrow('não pertence');
    await expect(
      prisma.batch.create({
        data: {
          code: tag,
          wineId: wineIds[1],
          vintageId: vintage.id,
          quantityLiters: 1.5,
          productionDate: new Date(),
          status: 'Aguardando registro',
        },
      }),
    ).rejects.toThrow();
    const batch = await prisma.batch.create({
      data: {
        code: tag,
        wineId: wineIds[0],
        vintageId: vintage.id,
        quantityLiters: 1.5,
        productionDate: new Date(),
        status: 'Aguardando registro',
      },
    });
    batchIds.push(batch.id);
    await expect(
      prisma.vintage.update({ where: { id: vintage.id }, data: { wineId: wineIds[1] } }),
    ).rejects.toThrow();
    await expect(prisma.wine.delete({ where: { id: wineIds[0] } })).rejects.toThrow();
    await expect(prisma.grape.delete({ where: { id: grapeId } })).rejects.toThrow();
  });

  it('não transforma 1.5 litros em 15 litros', () => {
    const base = {
      code: 'L25200',
      wineId: 'wine',
      vintageId: 'vintage',
      productionDate: '2025-07-19',
      status: 'Aguardando registro',
    };
    expect(batchSchema.parse({ ...base, quantity: 1.5 }).quantity).toBe(1.5);
    expect(batchSchema.parse({ ...base, quantity: '1,5' }).quantity).toBe(1.5);
    expect(batchSchema.parse({ ...base, quantity: '1.250,5' }).quantity).toBe(1250.5);
  });

  it('preserva safra antiga e seus lotes quando a composição atual do vinho muda', async () => {
    const oldVintage = await vintagesService.create({
      identifier: await unusedVintageIdentifier(),
      wineId: wineIds[0],
      year: 2099,
      status: 'Concluída',
    });
    vintageIds.push(oldVintage.id);
    try {
      await winesService.update(wineIds[0], { grapeIds: [secondGrapeId] }, userId, 'ADMIN');
      const edited = await vintagesService.update(oldVintage.id, {
        observations: 'Edição sem mudar composição',
        grapeIds: [secondGrapeId],
      });
      expect(edited.grapeIds).toEqual([grapeId]);
      const next = await vintagesService.create({
        identifier: await unusedVintageIdentifier(),
        wineId: wineIds[0],
        year: 2099,
        status: 'Concluída',
      });
      vintageIds.push(next.id);
      expect(next.grapeIds).toEqual([secondGrapeId]);
      const batch = await batchesService.create({
        code: 'L99200',
        wineId: wineIds[0],
        vintageId: oldVintage.id,
        quantity: 1.5,
        productionDate: '2099-07-19',
        status: 'Aguardando registro',
      });
      batchIds.push(batch.id);
      expect(batch.grapeIds).toEqual([grapeId]);
      await expect(vintagesService.update(oldVintage.id, { wineId: wineIds[1] })).rejects.toThrow(
        'lotes vinculados',
      );
    } finally {
      await winesService.update(wineIds[0], { grapeIds: [grapeId] }, userId, 'ADMIN');
    }
  });

  it('salva pedidos concorrentes em um estoque único, com movimentos vinculados', async () => {
    const currentCivilDate = new Date(`${todayCivilDate()}T12:00:00.000Z`);
    const orders = await Promise.all(
      [1, 2, 3].map(() =>
        customerService.createOrder(userId, {
          source: 'VINICULA',
          purchaseDate: currentCivilDate,
          purchaseLocation: 'Supermercado',
          items: [{ wineId: wineIds[0], vintageYear: 2099, quantityBottles: 2 }],
        }),
      ),
    );
    const stock = await prisma.inventoryItem.findMany({
      where: { userId, wineId: wineIds[0] },
      include: { movements: true },
    });
    expect(stock).toHaveLength(1);
    expect(stock[0].quantityBottles).toBe(6);
    expect(stock[0].movements).toHaveLength(3);
    expect(stock[0].movements.every((m) => orders.some((o) => o.id === m.orderId))).toBe(true);
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        customerService.registerConsumption(userId, stock[0].id, {
          quantityBottles: 4,
          occurredAt: currentCivilDate,
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stock[0].id } })).quantityBottles,
    ).toBe(2);
    await expect(
      prisma.inventoryItem.update({ where: { id: stock[0].id }, data: { quantityBottles: -1 } }),
    ).rejects.toThrow();
    await expect(customerService.removeOrder(userId, orders[0].id)).rejects.toThrow(
      'preservados como histórico',
    );
    expect(
      (await prisma.inventoryItem.findUniqueOrThrow({ where: { id: stock[0].id } })).quantityBottles,
    ).toBe(2);
    expect(await prisma.inventoryMovement.count({ where: { inventoryItemId: stock[0].id } })).toBe(7);
  });

  it('reverte pedido, item e estoque quando uma etapa da compra falha', async () => {
    const before = await Promise.all([
      prisma.customerOrder.count({ where: { userId } }),
      prisma.customerOrderItem.count({ where: { order: { userId } } }),
      prisma.inventoryItem.count({ where: { userId } }),
      prisma.inventoryMovement.count({ where: { inventoryItem: { userId } } }),
    ]);
    await expect(
      customerService.createOrder(userId, {
        source: 'VINICULA',
        purchaseDate: new Date(),
        purchaseLocation: 'Compra que deve reverter',
        items: [{ wineId: 'vinho-inexistente', quantityBottles: 2 }],
      }),
    ).rejects.toThrow('não foi encontrado');
    const after = await Promise.all([
      prisma.customerOrder.count({ where: { userId } }),
      prisma.customerOrderItem.count({ where: { order: { userId } } }),
      prisma.inventoryItem.count({ where: { userId } }),
      prisma.inventoryMovement.count({ where: { inventoryItem: { userId } } }),
    ]);
    expect(after).toEqual(before);
  });

  it('preserva rótulo legado sem pedido e só permite registrar consumo pelo cliente proprietário', async () => {
    const item = await prisma.inventoryItem.create({
      data: { userId, name: tag, wineryName: 'Origem externa', quantityBottles: 4 },
    });
    await prisma.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        type: 'ENTRADA',
        quantityBottles: 4,
        reason: 'Rótulo adicionado diretamente ao estoque',
      },
    });
    await prisma.cellarBottle.createMany({
      data: Array.from({ length: 4 }, () => ({
        userId,
        inventoryItemId: item.id,
        purchasedAt: new Date('2026-03-01T12:00:00Z'),
      })),
    });
    expect(item.wineId).toBeNull();
    const consumed = await customerService.registerConsumption(userId, item.id, {
      quantityBottles: 1,
      occurredAt: new Date('2026-03-15T12:00:00Z'),
    });
    expect(consumed.quantityBottles).toBe(3);
    await expect(
      customerService.registerConsumption('outro-usuario', item.id, {
        quantityBottles: 1,
        occurredAt: new Date(),
      }),
    ).rejects.toThrow('Item não encontrado');
    await expect(
      customerService.registerConsumption(userId, item.id, { quantityBottles: 4, occurredAt: new Date() }),
    ).rejects.toThrow('maior que o saldo');
    expect((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).quantityBottles).toBe(
      3,
    );
  });

  it('edita sem duplicar compra, preserva a data e protege saldo consumido', async () => {
    const input = {
      source: 'VINICULA' as const,
      purchaseDate: new Date('2026-01-05'),
      purchaseLocation: 'Mercado',
      items: [{ wineId: wineIds[1], quantityBottles: 5 }],
    };
    const order = await customerService.createOrder(userId, input);
    const item = order.items[0];
    const updated = await customerService.updateOrderItem(userId, order.id, item.id, {
      ...input,
      purchaseLocation: 'Supermercado',
      items: [{ wineId: wineIds[1], quantityBottles: 3 }],
    });
    expect(updated.id).toBe(order.id);
    expect(updated.purchaseDate).toEqual(input.purchaseDate);
    expect(updated.items[0].id).toBe(item.id);
    expect(updated.items[0].quantityBottles).toBe(3);
    const stock = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId! } });
    expect(stock.quantityBottles).toBe(3);
    await customerService.registerConsumption(userId, stock.id, {
      quantityBottles: 2,
      occurredAt: new Date('2026-02-10T12:00:00Z'),
    });
    await expect(
      customerService.updateOrderItem(userId, order.id, item.id, {
        ...input,
        items: [{ wineId: wineIds[1], quantityBottles: 1 }],
      }),
    ).rejects.toThrow('abertas, consumidas ou descartadas');
    expect(
      (await prisma.customerOrderItem.findUniqueOrThrow({ where: { id: item.id } })).quantityBottles,
    ).toBe(3);
    await expect(customerService.removeOrder(userId, order.id)).rejects.toThrow('preservados como histórico');
    const movements = await prisma.inventoryMovement.findMany({ where: { inventoryItemId: stock.id } });
    expect(movements.some((m) => m.type === 'CONSUMO' && m.orderId === null)).toBe(true);
    expect(movements.some((m) => m.type === 'AJUSTE' && m.orderId === order.id)).toBe(true);
  });

  it('calcula indicadores e série mensal a partir de dados reais sem misturar ajustes', async () => {
    const dashboard = await customerService.getInventoryDashboard(userId, 2026);
    const stock = await prisma.inventoryItem.aggregate({
      where: { userId },
      _sum: { quantityBottles: true },
      _count: true,
    });
    const consumed = await prisma.inventoryMovement.aggregate({
      where: { inventoryItem: { userId }, type: 'CONSUMO' },
      _sum: { quantityBottles: true },
    });
    expect(dashboard.totals.availableBottles).toBe(stock._sum.quantityBottles ?? 0);
    expect(dashboard.totals.consumedBottles).toBe(consumed._sum.quantityBottles ?? 0);
    expect(dashboard.totals.acquiredBottles).toBe(
      dashboard.totals.availableBottles + dashboard.totals.openedBottles + dashboard.totals.consumedBottles,
    );
    expect(dashboard.totals.labelCount).toBe(stock._count);
    expect(dashboard.monthlyConsumption).toHaveLength(12);
    expect(dashboard.monthlyConsumption[1].bottles).toBeGreaterThanOrEqual(2);
    expect(dashboard.monthlyConsumption[2].bottles).toBeGreaterThanOrEqual(1);
  });

  it('rejeita vínculo de pedido com estoque de outro cliente no próprio banco', async () => {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    const other = await prisma.user.create({
      data: { name: tag, email: tag + '-other@test.invalid', passwordHash: 'not-a-login', roleId: role.id },
    });
    try {
      const stock = await prisma.inventoryItem.create({
        data: { userId: other.id, name: tag, quantityBottles: 1 },
      });
      const order = await prisma.customerOrder.create({
        data: { userId, purchaseDate: new Date(), source: 'OUTRO_LOCAL' },
      });
      await expect(
        prisma.customerOrderItem.create({
          data: {
            orderId: order.id,
            wineName: tag,
            quantityBottles: 1,
            inventoryItemId: stock.id,
          },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.inventoryMovement.create({
          data: {
            orderId: order.id,
            inventoryItemId: stock.id,
            type: 'ENTRADA',
            quantityBottles: 1,
          },
        }),
      ).rejects.toThrow();
    } finally {
      await prisma.user.delete({ where: { id: other.id } });
    }
  });
});
