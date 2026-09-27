import { AppError } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';
import { orderSchema, type BottleEventInput, type OrderInput } from './customer.schema.js';
import type { Prisma } from '../../generated/prisma/client.js';

// Serialize stock changes per owner, including first insertion of a label.
async function lockInventory(transaction: Prisma.TransactionClient, userId: string) {
  await transaction.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${userId}))`;
}

const itemInclude = {
  wine: { select: { id: true, name: true, slug: true } },
  orderItems: { select: { order: { select: { purchaseLocation: true } } } },
  movements: { orderBy: { occurredAt: 'desc' as const } },
};

const bottleInclude = {
  inventoryItem: {
    include: {
      wine: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          volumeMl: true,
          winery: { select: { name: true } },
          image: { select: { path: true } },
        },
      },
    },
  },
  orderItem: {
    include: { order: { select: { id: true, purchaseDate: true, purchaseLocation: true, source: true } } },
  },
  movements: { orderBy: { occurredAt: 'asc' as const } },
};

function assertBottleEventDate(date: Date, purchasedAt: Date, openedAt?: Date | null) {
  const minimum = openedAt ?? purchasedAt;
  if (date < minimum)
    throw new AppError(400, 'A data não pode ser anterior à compra ou à abertura da garrafa.');
}

export const customerService = {
  async listOrders(userId: string) {
    return prisma.customerOrder.findMany({
      where: { userId },
      include: { items: { include: { wine: { select: { id: true, name: true, slug: true } } } } },
      orderBy: { purchaseDate: 'desc' },
    });
  },

  async createOrder(userId: string, input: OrderInput, photoPath?: string) {
    input = orderSchema.parse(input);
    if (input.items.some((item) => !item.wineId) && !photoPath)
      throw new AppError(400, 'Envie a foto do rótulo externo.');
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const order = await transaction.customerOrder.create({
        data: {
          userId,
          source: input.source,
          purchaseDate: input.purchaseDate,
          purchaseLocation: input.purchaseLocation || null,
          notes: input.notes || null,
        },
      });

      for (const item of input.items) {
        const wine = item.wineId
          ? await transaction.wine.findFirst({
              where: { id: item.wineId, status: 'PUBLISHED' },
              select: { id: true, name: true, winery: true, image: { select: { path: true } } },
            })
          : null;
        if (item.wineId && !wine)
          throw new AppError(400, 'O vinho selecionado não foi encontrado no catálogo.');

        const name = wine?.name ?? item.wineName;
        if (!name) throw new AppError(400, 'Informe o nome do vinho comprado.');
        const itemPhotoPath = photoPath || wine?.image?.path || undefined;

        const inventory = wine
          ? await transaction.inventoryItem.findFirst({ where: { userId, wineId: wine.id } })
          : await transaction.inventoryItem.findFirst({ where: { userId, wineId: null, name } });
        const inventoryItem = inventory
          ? await transaction.inventoryItem.update({
              where: { id: inventory.id },
              data: {
                quantityBottles: { increment: item.quantityBottles },
                photoPath: itemPhotoPath,
                active: true,
              },
            })
          : await transaction.inventoryItem.create({
              data: {
                userId,
                wineId: wine?.id ?? null,
                name,
                wineryName: item.wineryName ?? wine?.winery?.name ?? null,
                quantityBottles: item.quantityBottles,
                photoPath: itemPhotoPath,
              },
            });

        const orderItem = await transaction.customerOrderItem.create({
          data: {
            orderId: order.id,
            wineId: wine?.id ?? null,
            wineName: name,
            photoPath: itemPhotoPath,
            wineryName: item.wineryName ?? wine?.winery?.name ?? null,
            vintageYear: item.vintageYear ?? null,
            quantityBottles: item.quantityBottles,
            volumeMl: item.volumeMl ?? null,
            unitPrice: item.unitPrice ?? null,
            inventoryItemId: inventoryItem.id,
          },
        });
        await transaction.cellarBottle.createMany({
          data: Array.from({ length: item.quantityBottles }, () => ({
            userId,
            inventoryItemId: inventoryItem.id,
            orderItemId: orderItem.id,
            purchasedAt: input.purchaseDate,
          })),
        });
        await transaction.inventoryMovement.create({
          data: {
            inventoryItemId: inventoryItem.id,
            orderId: order.id,
            purchaseLocation: input.purchaseLocation || null,
            type: 'ENTRADA',
            quantityBottles: item.quantityBottles,
            reason: `Compra registrada no pedido ${order.id}`,
          },
        });
      }

      return transaction.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: true },
      });
    });
  },

  async updateOrderItem(
    userId: string,
    orderId: string,
    itemId: string,
    input: OrderInput,
    photoPath?: string,
  ) {
    input = orderSchema.parse(input);
    if (input.items.length !== 1) throw new AppError(400, 'Edite um rótulo por vez.');
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const order = await transaction.customerOrder.findFirst({
        where: { id: orderId, userId },
        include: { items: true },
      });
      const old = order?.items.find((item) => item.id === itemId);
      if (!order || !old) throw new AppError(404, 'Pedido ou rótulo não encontrado.');
      const previous = old.inventoryItemId
        ? await transaction.inventoryItem.findFirst({ where: { id: old.inventoryItemId, userId } })
        : null;
      if (!previous) throw new AppError(409, 'O estoque vinculado a este pedido não foi encontrado.');
      const item = input.items[0];
      const wine = item.wineId
        ? await transaction.wine.findUnique({
            where: { id: item.wineId },
            include: { winery: true, image: true },
          })
        : null;
      if (item.wineId && !wine) throw new AppError(400, 'O vinho selecionado não foi encontrado.');
      if (wine && wine.id !== old.wineId && wine.status !== 'PUBLISHED')
        throw new AppError(400, 'Selecione um vinho publicado no catálogo.');
      const name = wine?.name ?? item.wineName;
      if (!name) throw new AppError(400, 'Informe o nome do rótulo.');
      const sameWine = (wine?.id ?? null) === old.wineId && (Boolean(wine) || name === old.wineName);
      const removedQuantity = sameWine ? old.quantityBottles - item.quantityBottles : old.quantityBottles;
      const editableBottles = await transaction.cellarBottle.findMany({
        where: { orderItemId: old.id, userId, status: 'DISPONIVEL' },
        orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      });
      const earliestLifecycleEvent = await transaction.cellarBottle.findFirst({
        where: { orderItemId: old.id, userId, NOT: { openedAt: null } },
        orderBy: { openedAt: 'asc' },
        select: { openedAt: true },
      });
      if (earliestLifecycleEvent?.openedAt && input.purchaseDate > earliestLifecycleEvent.openedAt)
        throw new AppError(409, 'A data da compra não pode ser posterior à abertura de uma garrafa.');
      const bottlesToRemove = Math.max(removedQuantity, 0);
      if (editableBottles.length < bottlesToRemove)
        throw new AppError(
          409,
          'A alteração retiraria garrafas abertas ou consumidas. Apenas garrafas disponíveis podem ser corrigidas.',
        );
      const nextPrevious = previous.quantityBottles - removedQuantity;
      if (nextPrevious < 0)
        throw new AppError(
          409,
          'A alteração retiraria garrafas já consumidas. Confira o saldo antes de reduzir ou trocar o rótulo.',
        );
      const image = photoPath ?? (sameWine ? old.photoPath : wine?.image?.path) ?? null;
      if (!wine && !image) throw new AppError(400, 'Envie a foto do rótulo externo.');
      const wineryName = item.wineryName ?? wine?.winery?.name ?? (sameWine ? old.wineryName : null);
      await transaction.inventoryItem.update({
        where: { id: previous.id },
        data: {
          quantityBottles: nextPrevious,
          active: nextPrevious > 0,
          ...(sameWine ? { photoPath: image, wineryName, name } : {}),
        },
      });
      if (removedQuantity !== 0)
        await transaction.inventoryMovement.create({
          data: {
            inventoryItemId: previous.id,
            orderId,
            purchaseLocation: input.purchaseLocation || null,
            type: 'AJUSTE',
            quantityBottles: Math.abs(removedQuantity),
            reason: `Correção da quantidade ou do rótulo do pedido (${removedQuantity > 0 ? 'redução' : 'aumento'})`,
          },
        });
      if (bottlesToRemove > 0) {
        await transaction.cellarBottle.deleteMany({
          where: { id: { in: editableBottles.slice(0, bottlesToRemove).map(({ id }) => id) } },
        });
      }
      let targetId = previous.id;
      if (!sameWine) {
        const target = await transaction.inventoryItem.findFirst({
          where: {
            userId,
            wineId: wine?.id ?? null,
            ...(wine ? {} : { name }),
          },
        });
        const targetItem = target
          ? await transaction.inventoryItem.update({
              where: { id: target.id },
              data: {
                quantityBottles: { increment: item.quantityBottles },
                active: true,
                photoPath: image,
                wineryName,
              },
            })
          : await transaction.inventoryItem.create({
              data: {
                userId,
                wineId: wine?.id ?? null,
                name,
                wineryName,
                photoPath: image,
                quantityBottles: item.quantityBottles,
              },
            });
        targetId = targetItem.id;
        await transaction.inventoryMovement.create({
          data: {
            inventoryItemId: targetId,
            orderId,
            purchaseLocation: input.purchaseLocation || null,
            type: 'AJUSTE',
            quantityBottles: item.quantityBottles,
            reason: 'Rótulo corrigido no pedido (aumento)',
          },
        });
      }
      await transaction.customerOrderItem.update({
        where: { id: itemId },
        data: {
          wineId: wine?.id ?? null,
          wineName: name,
          wineryName,
          photoPath: image,
          quantityBottles: item.quantityBottles,
          inventoryItemId: targetId,
          vintageYear: item.vintageYear,
          volumeMl: item.volumeMl,
          unitPrice: item.unitPrice,
        },
      });
      const bottlesToAdd = sameWine ? Math.max(-removedQuantity, 0) : item.quantityBottles;
      if (bottlesToAdd > 0) {
        await transaction.cellarBottle.createMany({
          data: Array.from({ length: bottlesToAdd }, () => ({
            userId,
            inventoryItemId: targetId,
            orderItemId: old.id,
            purchasedAt: input.purchaseDate,
          })),
        });
      }
      await transaction.inventoryMovement.updateMany({
        where: { orderId },
        data: { purchaseLocation: input.purchaseLocation || null },
      });
      await transaction.cellarBottle.updateMany({
        where: { orderItemId: old.id, userId },
        data: { purchasedAt: input.purchaseDate },
      });
      return transaction.customerOrder.update({
        where: { id: orderId },
        data: {
          source: input.source,
          purchaseDate: input.purchaseDate,
          purchaseLocation: input.purchaseLocation || null,
          notes: input.notes,
        },
        include: { items: true },
      });
    });
  },

  async removeOrder(userId: string, orderId: string) {
    const order = await prisma.customerOrder.findFirst({
      where: { id: orderId, userId },
      select: { id: true },
    });
    if (!order) throw new AppError(404, 'Pedido não encontrado.');
    throw new AppError(
      409,
      'Pedidos que alimentam a adega são preservados como histórico. Edite o pedido para corrigir seus dados.',
    );
  },

  async listInventory(userId: string) {
    return prisma.inventoryItem.findMany({
      where: { userId },
      include: itemInclude,
      orderBy: { name: 'asc' },
    });
  },

  async getInventoryDashboard(userId: string, requestedYear?: number) {
    const bottles = await prisma.cellarBottle.findMany({
      where: { userId },
      select: { status: true, finishedAt: true, inventoryItemId: true },
      orderBy: { finishedAt: 'asc' },
    });
    const consumption = bottles.filter(
      (bottle): bottle is typeof bottle & { finishedAt: Date } =>
        bottle.status === 'CONSUMIDA' && bottle.finishedAt != null,
    );
    const currentYear = new Date().getUTCFullYear();
    const years = [...new Set(consumption.map((bottle) => bottle.finishedAt.getUTCFullYear()))].sort(
      (a, b) => b - a,
    );
    if (!years.length) years.push(currentYear);
    const selectedYear = requestedYear ?? years[0];
    if (!years.includes(selectedYear)) years.push(selectedYear);
    years.sort((a, b) => b - a);
    const availableBottles = bottles.filter((bottle) => bottle.status === 'DISPONIVEL').length;
    const openedBottles = bottles.filter((bottle) => bottle.status === 'ABERTA').length;
    const consumedBottles = consumption.length;
    const monthlyConsumption = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, bottles: 0 }));
    for (const bottle of consumption) {
      if (bottle.finishedAt.getUTCFullYear() === selectedYear) {
        monthlyConsumption[bottle.finishedAt.getUTCMonth()].bottles += 1;
      }
    }
    return {
      totals: {
        acquiredBottles: bottles.length,
        consumedBottles,
        availableBottles,
        openedBottles,
        labelCount: new Set(bottles.map((bottle) => bottle.inventoryItemId)).size,
      },
      selectedYear,
      years,
      monthlyConsumption,
    };
  },

  async listBottles(userId: string, status?: string) {
    const allowed = ['DISPONIVEL', 'ABERTA', 'CONSUMIDA'];
    if (status && !allowed.includes(status)) throw new AppError(400, 'Informe um status de garrafa válido.');
    const bottles = await prisma.cellarBottle.findMany({
      where: { userId },
      include: bottleInclude,
      orderBy: [{ purchasedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    const totalsByItem = new Map<string, number>();
    const ordered = [...bottles].sort(
      (a, b) => a.purchasedAt.getTime() - b.purchasedAt.getTime() || a.id.localeCompare(b.id),
    );
    const numbers = new Map<string, number>();
    for (const bottle of ordered) {
      const next = (totalsByItem.get(bottle.inventoryItemId) ?? 0) + 1;
      totalsByItem.set(bottle.inventoryItemId, next);
      numbers.set(bottle.id, next);
    }
    const statusOrder = new Map([
      ['DISPONIVEL', 0],
      ['ABERTA', 1],
      ['CONSUMIDA', 2],
    ]);
    return bottles
      .filter((bottle) => !status || bottle.status === status)
      .map((bottle) => ({ ...bottle, bottleNumber: numbers.get(bottle.id) ?? 1 }))
      .sort(
        (a, b) =>
          (statusOrder.get(a.status) ?? 3) - (statusOrder.get(b.status) ?? 3) ||
          a.inventoryItem.name.localeCompare(b.inventoryItem.name, 'pt-BR') ||
          a.bottleNumber - b.bottleNumber ||
          a.purchasedAt.getTime() - b.purchasedAt.getTime() ||
          a.id.localeCompare(b.id),
      );
  },

  async getBottle(userId: string, bottleId: string) {
    const bottle = await prisma.cellarBottle.findFirst({
      where: { id: bottleId, userId },
      include: bottleInclude,
    });
    if (!bottle) throw new AppError(404, 'Garrafa não encontrada na sua adega.');
    return bottle;
  },

  async openBottle(userId: string, bottleId: string, input: BottleEventInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const bottle = await transaction.cellarBottle.findFirst({ where: { id: bottleId, userId } });
      if (!bottle) throw new AppError(404, 'Garrafa não encontrada na sua adega.');
      if (bottle.status !== 'DISPONIVEL')
        throw new AppError(409, 'Somente uma garrafa disponível pode ser aberta.');
      assertBottleEventDate(input.occurredAt, bottle.purchasedAt);
      await transaction.inventoryItem.update({
        where: { id: bottle.inventoryItemId },
        data: { quantityBottles: { decrement: 1 } },
      });
      await transaction.cellarBottle.update({
        where: { id: bottle.id },
        data: { status: 'ABERTA', openedAt: input.occurredAt },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryItemId: bottle.inventoryItemId,
          cellarBottleId: bottle.id,
          type: 'ABERTURA',
          quantityBottles: 1,
          occurredAt: input.occurredAt,
          reason: 'Garrafa aberta pelo cliente',
        },
      });
      const available = await transaction.cellarBottle.count({
        where: { inventoryItemId: bottle.inventoryItemId, status: 'DISPONIVEL' },
      });
      await transaction.inventoryItem.update({
        where: { id: bottle.inventoryItemId },
        data: { quantityBottles: available, active: available > 0 },
      });
      return transaction.cellarBottle.findUniqueOrThrow({ where: { id: bottle.id }, include: bottleInclude });
    });
  },

  async finishBottle(userId: string, bottleId: string, input: BottleEventInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const bottle = await transaction.cellarBottle.findFirst({ where: { id: bottleId, userId } });
      if (!bottle) throw new AppError(404, 'Garrafa não encontrada na sua adega.');
      if (bottle.status === 'CONSUMIDA')
        throw new AppError(409, 'Esta garrafa já foi consumida e permanece no histórico.');
      assertBottleEventDate(input.occurredAt, bottle.purchasedAt, bottle.openedAt);
      await transaction.cellarBottle.update({
        where: { id: bottle.id },
        data: {
          status: 'CONSUMIDA',
          openedAt: bottle.openedAt ?? input.occurredAt,
          finishedAt: input.occurredAt,
        },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryItemId: bottle.inventoryItemId,
          cellarBottleId: bottle.id,
          type: 'CONSUMO',
          quantityBottles: 1,
          occurredAt: input.occurredAt,
          reason: 'Consumo finalizado pelo cliente',
        },
      });
      const available = await transaction.cellarBottle.count({
        where: { inventoryItemId: bottle.inventoryItemId, status: 'DISPONIVEL' },
      });
      await transaction.inventoryItem.update({
        where: { id: bottle.inventoryItemId },
        data: { quantityBottles: available, active: available > 0 },
      });
      return transaction.cellarBottle.findUniqueOrThrow({ where: { id: bottle.id }, include: bottleInclude });
    });
  },

  // Kept as a service-level compatibility bridge for older integrations. The public API
  // uses the individual bottle endpoints above.
  async registerConsumption(
    userId: string,
    itemId: string,
    input: { quantityBottles: number; occurredAt: Date },
  ) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const item = await transaction.inventoryItem.findFirst({ where: { id: itemId, userId } });
      if (!item) throw new AppError(404, 'Item não encontrado na adega.');
      const bottles = await transaction.cellarBottle.findMany({
        where: { userId, inventoryItemId: itemId, status: 'DISPONIVEL' },
        orderBy: [{ purchasedAt: 'asc' }, { id: 'asc' }],
        take: input.quantityBottles,
      });
      if (bottles.length !== input.quantityBottles)
        throw new AppError(400, 'A quantidade consumida é maior que o saldo disponível.');
      for (const bottle of bottles) {
        assertBottleEventDate(input.occurredAt, bottle.purchasedAt);
        await transaction.cellarBottle.update({
          where: { id: bottle.id },
          data: { status: 'CONSUMIDA', openedAt: input.occurredAt, finishedAt: input.occurredAt },
        });
        await transaction.inventoryMovement.create({
          data: {
            inventoryItemId: itemId,
            cellarBottleId: bottle.id,
            type: 'CONSUMO',
            quantityBottles: 1,
            occurredAt: input.occurredAt,
            reason: 'Consumo finalizado pelo cliente',
          },
        });
      }
      const available = await transaction.cellarBottle.count({
        where: { inventoryItemId: itemId, status: 'DISPONIVEL' },
      });
      return transaction.inventoryItem.update({
        where: { id: itemId },
        data: { quantityBottles: available, active: available > 0 },
        include: itemInclude,
      });
    });
  },
};
