import { AppError } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';
import type { InventoryCreateInput, MovementInput, OrderInput } from './customer.schema.js';
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

export const customerService = {
  async listOrders(userId: string) {
    return prisma.customerOrder.findMany({
      where: { userId },
      include: { items: { include: { wine: { select: { id: true, name: true, slug: true } } } } },
      orderBy: { purchaseDate: 'desc' },
    });
  },

  async createOrder(userId: string, input: OrderInput, photoPath?: string) {
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
          ? await transaction.wine.findUnique({ where: { id: item.wineId }, select: { id: true, name: true, winery: true, image: { select: { path: true } } } })
          : null;
        if (item.wineId && !wine) throw new AppError(400, 'O vinho selecionado não foi encontrado no catálogo.');

        const name = wine?.name ?? item.wineName;
        if (!name) throw new AppError(400, 'Informe o nome do vinho comprado.');
        const itemPhotoPath = photoPath || wine?.image?.path || undefined;

        const inventory = wine
          ? await transaction.inventoryItem.findFirst({ where: { userId, wineId: wine.id } })
          : await transaction.inventoryItem.findFirst({ where: { userId, wineId: null, name } });
        const inventoryItem = inventory
          ? await transaction.inventoryItem.update({
              where: { id: inventory.id },
              data: { quantityBottles: { increment: item.quantityBottles }, photoPath: itemPhotoPath, active: true },
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

        await transaction.customerOrderItem.create({
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

  async updateOrderItem(userId: string, orderId: string, itemId: string, input: OrderInput, photoPath?: string) {
    if (input.items.length !== 1) throw new AppError(400, 'Edite um rótulo por vez.');
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const order = await transaction.customerOrder.findFirst({ where: { id: orderId, userId }, include: { items: true } });
      const old = order?.items.find((item) => item.id === itemId);
      if (!order || !old) throw new AppError(404, 'Pedido ou rótulo não encontrado.');
      const previous = old.inventoryItemId
        ? await transaction.inventoryItem.findFirst({ where: { id: old.inventoryItemId, userId } })
        : null;
      if (!previous) throw new AppError(409, 'O estoque vinculado a este pedido não foi encontrado.');
      const item = input.items[0];
      const wine = item.wineId ? await transaction.wine.findUnique({
        where: { id: item.wineId }, include: { winery: true, image: true },
      }) : null;
      if (item.wineId && !wine) throw new AppError(400, 'O vinho selecionado não foi encontrado.');
      const name = wine?.name ?? item.wineName;
      if (!name) throw new AppError(400, 'Informe o nome do rótulo.');
      const sameWine = (wine?.id ?? null) === old.wineId && (Boolean(wine) || name === old.wineName);
      const removedQuantity = sameWine ? old.quantityBottles - item.quantityBottles : old.quantityBottles;
      const nextPrevious = previous.quantityBottles - removedQuantity;
      if (nextPrevious < 0) throw new AppError(409, 'A alteração retiraria garrafas já consumidas. Confira o saldo antes de reduzir ou trocar o rótulo.');
      const image = photoPath ?? (sameWine ? old.photoPath : wine?.image?.path) ?? null;
      const wineryName = item.wineryName ?? wine?.winery?.name ?? (sameWine ? old.wineryName : null);
      await transaction.inventoryItem.update({ where: { id: previous.id }, data: {
        quantityBottles: nextPrevious, active: nextPrevious > 0,
        ...(sameWine ? { photoPath: image, wineryName, name } : {}),
      } });
      if (removedQuantity !== 0) await transaction.inventoryMovement.create({ data: {
        inventoryItemId: previous.id, orderId, purchaseLocation: input.purchaseLocation || null,
        type: removedQuantity > 0 ? 'CONSUMO' : 'ENTRADA', quantityBottles: Math.abs(removedQuantity),
        reason: 'Correção da quantidade ou do rótulo do pedido',
      } });
      let targetId = previous.id;
      if (!sameWine) {
        const target = await transaction.inventoryItem.findFirst({ where: {
          userId, wineId: wine?.id ?? null, ...(wine ? {} : { name }),
        } });
        const targetItem = target
          ? await transaction.inventoryItem.update({ where: { id: target.id }, data: {
            quantityBottles: { increment: item.quantityBottles }, active: true, photoPath: image, wineryName,
          } })
          : await transaction.inventoryItem.create({ data: {
            userId, wineId: wine?.id ?? null, name, wineryName, photoPath: image, quantityBottles: item.quantityBottles,
          } });
        targetId = targetItem.id;
        await transaction.inventoryMovement.create({ data: {
          inventoryItemId: targetId, orderId, purchaseLocation: input.purchaseLocation || null,
          type: 'ENTRADA', quantityBottles: item.quantityBottles, reason: 'Rótulo corrigido no pedido',
        } });
      }
      await transaction.customerOrderItem.update({ where: { id: itemId }, data: {
        wineId: wine?.id ?? null, wineName: name, wineryName, photoPath: image,
        quantityBottles: item.quantityBottles, inventoryItemId: targetId,
        vintageYear: item.vintageYear, volumeMl: item.volumeMl, unitPrice: item.unitPrice,
      } });
      await transaction.inventoryMovement.updateMany({ where: { orderId }, data: { purchaseLocation: input.purchaseLocation || null } });
      return transaction.customerOrder.update({ where: { id: orderId }, data: {
        source: input.source, purchaseDate: input.purchaseDate, purchaseLocation: input.purchaseLocation || null,
        notes: input.notes,
      }, include: { items: true } });
    });
  },

  async removeOrder(userId: string, orderId: string) {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.customerOrder.findFirst({ where: { id: orderId, userId }, include: { items: true } });
      if (!order) throw new AppError(404, 'Pedido não encontrado.');
      // Excluir o histórico da compra não altera garrafas nem movimentações já registradas.
      await transaction.customerOrder.delete({ where: { id: order.id } });
    });
  },

  async listInventory(userId: string) {
    return prisma.inventoryItem.findMany({ where: { userId, active: true }, include: itemInclude, orderBy: { name: 'asc' } });
  },

  async createInventoryItem(userId: string, input: InventoryCreateInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const existing = await transaction.inventoryItem.findFirst({ where: { userId, wineId: null, name: input.name } });
      const item = existing
        ? await transaction.inventoryItem.update({ where: { id: existing.id }, data: { quantityBottles: { increment: input.quantityBottles }, wineryName: input.wineryName || existing.wineryName, photoPath: input.photoPath, active: true } })
        : await transaction.inventoryItem.create({ data: { userId, name: input.name, wineryName: input.wineryName || null, photoPath: input.photoPath, quantityBottles: input.quantityBottles } });
      await transaction.inventoryMovement.create({ data: { inventoryItemId: item.id, type: 'ENTRADA', quantityBottles: input.quantityBottles, reason: 'Rótulo adicionado diretamente ao estoque' } });
      return transaction.inventoryItem.findUniqueOrThrow({ where: { id: item.id }, include: itemInclude });
    });
  },

  async addMovement(userId: string, itemId: string, input: MovementInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const item = await transaction.inventoryItem.findFirst({ where: { id: itemId, userId } });
      if (!item) throw new AppError(404, 'Item não encontrado no estoque.');
      const nextQuantity = input.type === 'CONSUMO'
        ? item.quantityBottles - input.quantityBottles
        : input.type === 'AJUSTE' ? input.quantityBottles : item.quantityBottles + input.quantityBottles;
      if (nextQuantity < 0) throw new AppError(400, 'A quantidade consumida é maior que o estoque disponível.');
      await transaction.inventoryItem.update({ where: { id: item.id }, data: { quantityBottles: nextQuantity, active: nextQuantity > 0 } });
      await transaction.inventoryMovement.create({ data: { inventoryItemId: item.id, ...input } });
      return transaction.inventoryItem.findUniqueOrThrow({ where: { id: item.id }, include: itemInclude });
    });
  },
};
