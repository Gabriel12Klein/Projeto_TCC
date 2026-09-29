import { AppError } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';
import {
  orderSchema,
  civilDateKey,
  todayCivilDate,
  type BottleEventInput,
  type BottleDiscardInput,
  type BottleListFilters,
  type ExternalWineInput,
  type OrderInput,
  type PaginationInput,
  type PrivateAddressInput,
} from './customer.schema.js';
import { Prisma } from '../../generated/prisma/client.js';

// Serialize stock changes per owner, including first insertion of a label.
async function lockInventory(transaction: Prisma.TransactionClient, userId: string) {
  await transaction.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${userId}))`;
}

async function syncActiveInventoryQuantity(
  transaction: Prisma.TransactionClient,
  userId: string,
  inventoryItemId: string,
) {
  const activeBottles = await transaction.cellarBottle.count({
    where: { userId, inventoryItemId, status: { in: ['DISPONIVEL', 'ABERTA'] } },
  });
  await transaction.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { quantityBottles: activeBottles, active: activeBottles > 0 },
  });
  return activeBottles;
}

const itemInclude = {
  wine: { select: { id: true, name: true, slug: true } },
  orderItems: { select: { order: { select: { purchaseLocation: true } } } },
  movements: { orderBy: { occurredAt: 'desc' as const } },
};

const externalWineInclude = {
  externalWinery: { select: { id: true, name: true } },
  grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
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
          typeId: true,
          wineType: { select: { id: true, name: true } },
          winery: { select: { name: true } },
          image: { select: { path: true } },
          grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
          vintages: { select: { year: true }, orderBy: { year: 'desc' as const } },
        },
      },
    },
  },
  orderItem: {
    include: {
      order: { select: { id: true, purchaseDate: true, purchaseLocation: true, source: true } },
      externalWine: { include: externalWineInclude },
    },
  },
  movements: { orderBy: { occurredAt: 'asc' as const } },
};
type BottleWithRelations = Prisma.CellarBottleGetPayload<{ include: typeof bottleInclude }>;

function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listAllBottles(userId: string, input: Partial<BottleListFilters> | string = {}) {
  const status = typeof input === 'string' ? input : input.status;
  const wineTypeId = typeof input === 'string' ? undefined : input.wineTypeId;
  const purchasedFrom = typeof input === 'string' ? undefined : input.purchasedFrom;
  const purchasedTo = typeof input === 'string' ? undefined : input.purchasedTo;
  const allowed = ['DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA'];
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
    ['DESCARTADA', 3],
  ]);
  return bottles
    .filter(
      (bottle) =>
        (!status || bottle.status === status) &&
        (!wineTypeId || bottle.inventoryItem.wine?.typeId === wineTypeId) &&
        (!purchasedFrom || civilDateKey(bottle.purchasedAt) >= civilDateKey(purchasedFrom)) &&
        (!purchasedTo || civilDateKey(bottle.purchasedAt) <= civilDateKey(purchasedTo)),
    )
    .map((bottle) => ({ ...bottle, bottleNumber: numbers.get(bottle.id) ?? 1 }))
    .sort(
      (a, b) =>
        (statusOrder.get(a.status) ?? 3) - (statusOrder.get(b.status) ?? 3) ||
        a.inventoryItem.name.localeCompare(b.inventoryItem.name, 'pt-BR') ||
        a.bottleNumber - b.bottleNumber ||
        a.purchasedAt.getTime() - b.purchasedAt.getTime() ||
        a.id.localeCompare(b.id),
    );
}

const addressData = (input: PrivateAddressInput) => ({
  name: input.name,
  street: input.street || null,
  neighborhood: input.neighborhood || null,
  city: input.city || null,
  stateRegion: input.stateRegion || null,
  country: input.country || null,
});

async function assertGrapes(grapeIds: string[]) {
  const ids = [...new Set(grapeIds)];
  const count = await prisma.grape.count({ where: { id: { in: ids }, active: true } });
  if (count !== ids.length) throw new AppError(400, 'Selecione somente uvas disponíveis no catálogo.');
  return ids;
}

function assertBottleEventDate(date: Date, purchasedAt: Date, openedAt?: Date | null) {
  const eventDate = civilDateKey(date);
  const minimum = civilDateKey(openedAt ?? purchasedAt);
  if (eventDate > todayCivilDate()) throw new AppError(400, 'A data informada não pode estar no futuro.');
  if (eventDate < minimum)
    throw new AppError(400, 'A data não pode ser anterior à compra ou à abertura da garrafa.');
}

function resolveOfficialVintageYear(wine: { vintages: { year: number }[] } | null, requestedYear?: number) {
  if (!wine) return requestedYear ?? null;
  const years = [...new Set(wine.vintages.map(({ year }) => year))];
  if (requestedYear != null) {
    if (!years.includes(requestedYear))
      throw new AppError(400, 'Selecione uma safra pertencente ao vinho oficial escolhido.');
    return requestedYear;
  }
  if (years.length === 1) return years[0];
  if (years.length > 1) throw new AppError(400, 'Selecione a safra do vinho oficial comprado.');
  return null;
}

export const customerService = {
  async listExternalWineries(userId: string) {
    return prisma.externalWinery.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  },

  async createExternalWinery(userId: string, input: PrivateAddressInput) {
    const duplicate = await prisma.externalWinery.findFirst({
      where: { userId, name: { equals: input.name, mode: 'insensitive' } },
    });
    if (duplicate) throw new AppError(409, 'Você já cadastrou uma vinícola com este nome.');
    return prisma.externalWinery.create({ data: { userId, ...addressData(input) } });
  },

  async updateExternalWinery(userId: string, id: string, input: PrivateAddressInput) {
    const record = await prisma.externalWinery.findFirst({ where: { id, userId } });
    if (!record) throw new AppError(404, 'Vinícola não encontrada.');
    const duplicate = await prisma.externalWinery.findFirst({
      where: { userId, id: { not: id }, name: { equals: input.name, mode: 'insensitive' } },
    });
    if (duplicate) throw new AppError(409, 'Você já cadastrou uma vinícola com este nome.');
    return prisma.externalWinery.update({ where: { id }, data: addressData(input) });
  },

  async removeExternalWinery(userId: string, id: string) {
    const record = await prisma.externalWinery.findFirst({
      where: { id, userId },
      include: { _count: { select: { wines: true } } },
    });
    if (!record) throw new AppError(404, 'Vinícola não encontrada.');
    if (record._count.wines)
      throw new AppError(409, 'Esta vinícola possui vinhos cadastrados e não pode ser excluída.');
    await prisma.externalWinery.delete({ where: { id } });
  },

  async listExternalWines(userId: string, externalWineryId?: string) {
    return prisma.externalWine.findMany({
      where: { userId, ...(externalWineryId ? { externalWineryId } : {}) },
      include: externalWineInclude,
      orderBy: [{ externalWinery: { name: 'asc' } }, { name: 'asc' }],
    });
  },

  async getExternalWine(userId: string, id: string) {
    const wine = await prisma.externalWine.findFirst({
      where: { id, userId },
      include: externalWineInclude,
    });
    if (!wine) throw new AppError(404, 'Vinho externo não encontrado.');
    return wine;
  },

  async createExternalWine(userId: string, input: ExternalWineInput, imagePath?: string) {
    const winery = await prisma.externalWinery.findFirst({ where: { id: input.externalWineryId, userId } });
    if (!winery) throw new AppError(400, 'Selecione uma vinícola cadastrada na sua conta.');
    const duplicate = await prisma.externalWine.findFirst({
      where: {
        userId,
        externalWineryId: winery.id,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });
    if (duplicate) throw new AppError(409, 'Este vinho já está cadastrado para a vinícola selecionada.');
    const grapeIds = await assertGrapes(input.grapeIds);
    return prisma.externalWine.create({
      data: {
        userId,
        externalWineryId: winery.id,
        name: input.name,
        vintageYear: input.vintageYear,
        description: input.description || null,
        characteristics: input.characteristics || null,
        aromas: input.aromas || null,
        tastingNotes: input.tastingNotes || null,
        imagePath: imagePath || null,
        grapeLinks: { create: grapeIds.map((grapeId) => ({ grapeId })) },
      },
      include: externalWineInclude,
    });
  },

  async updateExternalWine(userId: string, id: string, input: ExternalWineInput, imagePath?: string) {
    const [record, winery] = await Promise.all([
      prisma.externalWine.findFirst({ where: { id, userId } }),
      prisma.externalWinery.findFirst({ where: { id: input.externalWineryId, userId } }),
    ]);
    if (!record) throw new AppError(404, 'Vinho externo não encontrado.');
    if (!winery) throw new AppError(400, 'Selecione uma vinícola cadastrada na sua conta.');
    const duplicate = await prisma.externalWine.findFirst({
      where: {
        userId,
        id: { not: id },
        externalWineryId: winery.id,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });
    if (duplicate) throw new AppError(409, 'Este vinho já está cadastrado para a vinícola selecionada.');
    const grapeIds = await assertGrapes(input.grapeIds);
    return prisma.$transaction(async (transaction) => {
      await transaction.externalWineGrape.deleteMany({ where: { externalWineId: id } });
      const updated = await transaction.externalWine.update({
        where: { id },
        data: {
          externalWineryId: winery.id,
          name: input.name,
          vintageYear: input.vintageYear,
          description: input.description || null,
          characteristics: input.characteristics || null,
          aromas: input.aromas || null,
          tastingNotes: input.tastingNotes || null,
          ...(imagePath ? { imagePath } : {}),
          grapeLinks: { create: grapeIds.map((grapeId) => ({ grapeId })) },
        },
        include: externalWineInclude,
      });
      if (imagePath) {
        await Promise.all([
          transaction.inventoryItem.updateMany({
            where: { userId, externalWineId: id },
            data: { photoPath: imagePath },
          }),
          transaction.customerOrderItem.updateMany({
            where: { externalWineId: id, order: { userId } },
            data: { photoPath: imagePath },
          }),
        ]);
      }
      return updated;
    });
  },

  async removeExternalWine(userId: string, id: string) {
    const record = await prisma.externalWine.findFirst({
      where: { id, userId },
      include: { _count: { select: { orderItems: true, inventory: true } } },
    });
    if (!record) throw new AppError(404, 'Vinho externo não encontrado.');
    if (record._count.orderItems || record._count.inventory)
      throw new AppError(409, 'Este vinho já faz parte da adega e não pode ser excluído.');
    await prisma.externalWine.delete({ where: { id } });
    return record.imagePath;
  },

  async getExternalWineImagePath(userId: string, id: string) {
    const record = await prisma.externalWine.findFirst({
      where: { id, userId },
      select: { imagePath: true },
    });
    if (!record) throw new AppError(404, 'Vinho externo não encontrado.');
    return record.imagePath;
  },

  async listPurchaseLocations(userId: string) {
    return prisma.purchaseLocation.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  },

  async createPurchaseLocation(userId: string, input: PrivateAddressInput) {
    const duplicate = await prisma.purchaseLocation.findFirst({
      where: { userId, name: { equals: input.name, mode: 'insensitive' } },
    });
    if (duplicate) throw new AppError(409, 'Você já cadastrou um local de compra com este nome.');
    return prisma.purchaseLocation.create({ data: { userId, ...addressData(input) } });
  },

  async updatePurchaseLocation(userId: string, id: string, input: PrivateAddressInput) {
    const record = await prisma.purchaseLocation.findFirst({ where: { id, userId } });
    if (!record) throw new AppError(404, 'Local de compra não encontrado.');
    const duplicate = await prisma.purchaseLocation.findFirst({
      where: { userId, id: { not: id }, name: { equals: input.name, mode: 'insensitive' } },
    });
    if (duplicate) throw new AppError(409, 'Você já cadastrou um local de compra com este nome.');
    return prisma.purchaseLocation.update({ where: { id }, data: addressData(input) });
  },

  async removePurchaseLocation(userId: string, id: string) {
    const record = await prisma.purchaseLocation.findFirst({
      where: { id, userId },
      include: { _count: { select: { orders: true } } },
    });
    if (!record) throw new AppError(404, 'Local de compra não encontrado.');
    if (record._count.orders)
      throw new AppError(409, 'Este local já foi usado em uma compra e não pode ser excluído.');
    await prisma.purchaseLocation.delete({ where: { id } });
  },

  async listOrders(userId: string) {
    const query = {
      where: { userId },
      include: {
        purchaseLocationRef: { select: { id: true, name: true } },
        items: {
          include: {
            wine: { select: { id: true, name: true, slug: true } },
            externalWine: { include: { externalWinery: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: [{ purchaseDate: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }],
    };
    return prisma.customerOrder.findMany(query);
  },

  async listOrdersPage(userId: string, pagination: PaginationInput) {
    const query = {
      where: { userId },
      include: {
        purchaseLocationRef: { select: { id: true, name: true } },
        items: {
          include: {
            wine: { select: { id: true, name: true, slug: true } },
            externalWine: { include: { externalWinery: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: [{ purchaseDate: 'desc' as const }, { createdAt: 'desc' as const }, { id: 'desc' as const }],
    };
    const [items, total] = await prisma.$transaction([
      prisma.customerOrder.findMany({
        ...query,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.customerOrder.count({ where: { userId } }),
    ]);
    return paginated(items, total, pagination.page, pagination.limit);
  },

  async createOrder(userId: string, input: OrderInput, photoPath?: string) {
    input = orderSchema.parse(input);
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const purchaseLocation = input.purchaseLocationId
        ? await transaction.purchaseLocation.findFirst({
            where: { id: input.purchaseLocationId, userId },
          })
        : null;
      if (input.purchaseLocationId && !purchaseLocation)
        throw new AppError(400, 'Selecione um local de compra cadastrado na sua conta.');
      const purchaseLocationName = purchaseLocation?.name ?? input.purchaseLocation;
      if (!purchaseLocationName) throw new AppError(400, 'Selecione um local de compra.');
      const order = await transaction.customerOrder.create({
        data: {
          userId,
          source: input.source,
          purchaseDate: input.purchaseDate,
          purchaseLocationId: purchaseLocation?.id ?? null,
          purchaseLocation: purchaseLocationName,
          notes: input.notes || null,
        },
      });

      for (const item of input.items) {
        const wine = item.wineId
          ? await transaction.wine.findFirst({
              where: { id: item.wineId, status: 'PUBLISHED' },
              select: {
                id: true,
                name: true,
                winery: true,
                image: { select: { path: true } },
                vintages: { select: { year: true } },
              },
            })
          : null;
        if (item.wineId && !wine)
          throw new AppError(400, 'O vinho selecionado não foi encontrado no catálogo.');

        const externalWine = item.externalWineId
          ? await transaction.externalWine.findFirst({
              where: {
                id: item.externalWineId,
                userId,
                ...(item.externalWineryId ? { externalWineryId: item.externalWineryId } : {}),
              },
              include: { externalWinery: true },
            })
          : null;
        if (item.externalWineId && !externalWine)
          throw new AppError(400, 'O vinho externo não pertence à vinícola selecionada ou à sua conta.');

        const name = wine?.name ?? externalWine?.name ?? item.wineName;
        if (!name) throw new AppError(400, 'Informe o nome do vinho comprado.');
        const itemPhotoPath = photoPath || wine?.image?.path || externalWine?.imagePath || undefined;
        if (!wine && !externalWine && !itemPhotoPath)
          throw new AppError(400, 'Cadastre o vinho externo e sua foto antes de registrar a compra.');

        const inventory = wine
          ? await transaction.inventoryItem.findFirst({ where: { userId, wineId: wine.id } })
          : externalWine
            ? await transaction.inventoryItem.findFirst({
                where: { userId, externalWineId: externalWine.id },
              })
            : await transaction.inventoryItem.findFirst({
                where: { userId, wineId: null, externalWineId: null, name },
              });
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
                externalWineId: externalWine?.id ?? null,
                name,
                wineryName:
                  item.wineryName ?? wine?.winery?.name ?? externalWine?.externalWinery.name ?? null,
                quantityBottles: item.quantityBottles,
                photoPath: itemPhotoPath,
              },
            });

        const officialVintageYear = resolveOfficialVintageYear(wine, item.vintageYear);
        const orderItem = await transaction.customerOrderItem.create({
          data: {
            orderId: order.id,
            wineId: wine?.id ?? null,
            externalWineId: externalWine?.id ?? null,
            wineName: name,
            photoPath: itemPhotoPath,
            wineryName: item.wineryName ?? wine?.winery?.name ?? externalWine?.externalWinery.name ?? null,
            vintageYear: officialVintageYear,
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
            purchaseLocation: purchaseLocationName,
            type: 'ENTRADA',
            quantityBottles: item.quantityBottles,
            reason: `Compra registrada no pedido ${order.id}`,
          },
        });
      }

      return transaction.customerOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: {
            include: { externalWine: { include: { externalWinery: { select: { id: true, name: true } } } } },
          },
        },
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
      const purchaseLocation = input.purchaseLocationId
        ? await transaction.purchaseLocation.findFirst({ where: { id: input.purchaseLocationId, userId } })
        : null;
      if (input.purchaseLocationId && !purchaseLocation)
        throw new AppError(400, 'Selecione um local de compra cadastrado na sua conta.');
      const purchaseLocationName = purchaseLocation?.name ?? input.purchaseLocation;
      if (!purchaseLocationName) throw new AppError(400, 'Selecione um local de compra.');
      const item = input.items[0];
      const wine = item.wineId
        ? await transaction.wine.findUnique({
            where: { id: item.wineId },
            include: { winery: true, image: true, vintages: { select: { year: true } } },
          })
        : null;
      if (item.wineId && !wine) throw new AppError(400, 'O vinho selecionado não foi encontrado.');
      if (wine && wine.id !== old.wineId && wine.status !== 'PUBLISHED')
        throw new AppError(400, 'Selecione um vinho publicado no catálogo.');
      const externalWine = item.externalWineId
        ? await transaction.externalWine.findFirst({
            where: {
              id: item.externalWineId,
              userId,
              ...(item.externalWineryId ? { externalWineryId: item.externalWineryId } : {}),
            },
            include: { externalWinery: true },
          })
        : null;
      if (item.externalWineId && !externalWine)
        throw new AppError(400, 'O vinho externo não pertence à vinícola selecionada ou à sua conta.');
      const name = wine?.name ?? externalWine?.name ?? item.wineName;
      if (!name) throw new AppError(400, 'Informe o nome do rótulo.');
      const sameWine =
        (wine?.id ?? null) === old.wineId &&
        (externalWine?.id ?? null) === old.externalWineId &&
        (Boolean(wine || externalWine) || name === old.wineName);
      const officialVintageYear = resolveOfficialVintageYear(wine, item.vintageYear);
      const removedQuantity = sameWine ? old.quantityBottles - item.quantityBottles : old.quantityBottles;
      const editableBottles = await transaction.cellarBottle.findMany({
        where: { orderItemId: old.id, userId, status: 'DISPONIVEL' },
        orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      });
      const lifecycleBottles = await transaction.cellarBottle.findMany({
        where: {
          orderItemId: old.id,
          userId,
          OR: [{ openedAt: { not: null } }, { discardedAt: { not: null } }],
        },
        select: { openedAt: true, discardedAt: true },
      });
      const earliestLifecycleDate = lifecycleBottles
        .flatMap(({ openedAt, discardedAt }) => [openedAt, discardedAt])
        .filter((date): date is Date => date != null)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      if (earliestLifecycleDate && input.purchaseDate > earliestLifecycleDate)
        throw new AppError(409, 'A data da compra não pode ser posterior ao histórico de uma garrafa.');
      const bottlesToRemove = Math.max(removedQuantity, 0);
      if (editableBottles.length < bottlesToRemove)
        throw new AppError(
          409,
          'A alteração retiraria garrafas abertas, consumidas ou descartadas. Apenas garrafas disponíveis podem ser corrigidas.',
        );
      const nextPrevious = previous.quantityBottles - removedQuantity;
      if (nextPrevious < 0)
        throw new AppError(
          409,
          'A alteração retiraria garrafas já consumidas. Confira o saldo antes de reduzir ou trocar o rótulo.',
        );
      const catalogImage = wine?.image?.path ?? externalWine?.imagePath;
      const image = photoPath ?? (sameWine ? (old.photoPath ?? catalogImage) : catalogImage) ?? null;
      const wineryName =
        item.wineryName ??
        wine?.winery?.name ??
        externalWine?.externalWinery.name ??
        (sameWine ? old.wineryName : null);
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
            externalWineId: externalWine?.id ?? null,
            ...(wine || externalWine ? {} : { name }),
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
                externalWineId: externalWine?.id ?? null,
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
          externalWineId: externalWine?.id ?? null,
          wineName: name,
          wineryName,
          photoPath: image,
          quantityBottles: item.quantityBottles,
          inventoryItemId: targetId,
          vintageYear: officialVintageYear,
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
        data: { purchaseLocation: purchaseLocationName },
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
          purchaseLocationId: purchaseLocation?.id ?? null,
          purchaseLocation: purchaseLocationName,
          notes: input.notes,
        },
        include: {
          items: {
            include: { externalWine: { include: { externalWinery: { select: { id: true, name: true } } } } },
          },
        },
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

  async removeOrderItemBottles(
    userId: string,
    orderId: string,
    itemId: string,
    all: boolean,
    bottleId?: string,
  ) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const item = await transaction.customerOrderItem.findFirst({
        where: { id: itemId, orderId, order: { userId } },
        include: { bottles: { where: { userId }, orderBy: { createdAt: 'desc' } } },
      });
      if (!item) throw new AppError(404, 'Registro da adega não encontrado.');
      if (!item.bottles.length) throw new AppError(409, 'Este registro não possui garrafas para excluir.');
      const availableBottles = item.bottles.filter(({ status }) => status === 'DISPONIVEL');
      const selected = bottleId
        ? availableBottles.filter(({ id }) => id === bottleId)
        : all
          ? availableBottles
          : availableBottles.slice(0, 1);
      if (bottleId && !item.bottles.some(({ id }) => id === bottleId))
        throw new AppError(404, 'Garrafa não encontrada neste registro.');
      if (!selected.length)
        throw new AppError(409, 'Somente garrafas disponíveis podem ser excluídas da compra.');
      if (all && selected.length !== item.bottles.length)
        throw new AppError(
          409,
          'Não é possível excluir todo o registro porque há garrafas abertas, consumidas ou descartadas.',
        );
      const bottleIds = selected.map(({ id }) => id);
      await transaction.inventoryMovement.deleteMany({ where: { cellarBottleId: { in: bottleIds } } });
      await transaction.cellarBottle.deleteMany({ where: { id: { in: bottleIds }, userId } });
      const remainingQuantity = item.bottles.length - selected.length;
      if (remainingQuantity > 0) {
        await transaction.customerOrderItem.update({
          where: { id: item.id },
          data: { quantityBottles: remainingQuantity },
        });
        await transaction.inventoryMovement.updateMany({
          where: { orderId, inventoryItemId: item.inventoryItemId ?? undefined, type: 'ENTRADA' },
          data: { quantityBottles: remainingQuantity },
        });
      } else {
        await transaction.inventoryMovement.deleteMany({
          where: { orderId, inventoryItemId: item.inventoryItemId ?? undefined },
        });
        await transaction.customerOrderItem.delete({ where: { id: item.id } });
        if ((await transaction.customerOrderItem.count({ where: { orderId } })) === 0) {
          await transaction.inventoryMovement.deleteMany({ where: { orderId } });
          await transaction.customerOrder.delete({ where: { id: orderId } });
        }
      }
      if (item.inventoryItemId) {
        const [bottleCount, itemCount] = await Promise.all([
          transaction.cellarBottle.count({ where: { inventoryItemId: item.inventoryItemId, userId } }),
          transaction.customerOrderItem.count({ where: { inventoryItemId: item.inventoryItemId } }),
        ]);
        if (!bottleCount && !itemCount) {
          await transaction.inventoryMovement.deleteMany({
            where: { inventoryItemId: item.inventoryItemId },
          });
          await transaction.inventoryItem.delete({ where: { id: item.inventoryItemId } });
        } else {
          await syncActiveInventoryQuantity(transaction, userId, item.inventoryItemId);
        }
      }
      return { deletedBottles: selected.length };
    });
  },

  async removeBottle(userId: string, bottleId: string) {
    const bottle = await prisma.cellarBottle.findFirst({
      where: { id: bottleId, userId },
      select: { orderItemId: true, orderItem: { select: { orderId: true } } },
    });
    if (!bottle?.orderItemId || !bottle.orderItem)
      throw new AppError(404, 'Garrafa vinculada à compra não encontrada.');
    return customerService.removeOrderItemBottles(
      userId,
      bottle.orderItem.orderId,
      bottle.orderItemId,
      false,
      bottleId,
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

  async listBottleWineTypes(_userId: string) {
    return prisma.wineType.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  },

  async listBottlesPage(userId: string, input: BottleListFilters) {
    const { status, wineTypeId, purchasedFrom, purchasedTo, page, limit } = input;
    const allowed = ['DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA'];
    if (status && !allowed.includes(status)) throw new AppError(400, 'Informe um status de garrafa válido.');
    const where: Prisma.CellarBottleWhereInput = {
      userId,
      status: status || undefined,
      inventoryItem: wineTypeId ? { wine: { typeId: wineTypeId } } : undefined,
      purchasedAt:
        purchasedFrom || purchasedTo
          ? { gte: purchasedFrom || undefined, lte: purchasedTo || undefined }
          : undefined,
    };
    const total = await prisma.cellarBottle.count({ where });
    const statuses = status ? [status] : ['DISPONIVEL', 'ABERTA', 'CONSUMIDA', 'DESCARTADA'];
    const grouped = await prisma.cellarBottle.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    const totals = new Map(grouped.map((group) => [group.status, group._count._all]));
    let remainingSkip = (page - 1) * limit;
    let remainingTake = limit;
    const pageItems: BottleWithRelations[] = [];
    for (const currentStatus of statuses) {
      const groupTotal = totals.get(currentStatus) ?? 0;
      if (remainingSkip >= groupTotal) {
        remainingSkip -= groupTotal;
        continue;
      }
      if (!remainingTake) break;
      const items = await prisma.cellarBottle.findMany({
        where: { ...where, status: currentStatus },
        include: bottleInclude,
        orderBy: [{ inventoryItem: { name: 'asc' } }, { purchasedAt: 'asc' }, { id: 'asc' }],
        skip: remainingSkip,
        take: remainingTake,
      });
      pageItems.push(...items);
      remainingTake -= items.length;
      remainingSkip = 0;
    }
    const ids = pageItems.map(({ id }) => id);
    const numbered = ids.length
      ? await prisma.$queryRaw<{ id: string; bottleNumber: bigint }[]>(Prisma.sql`
            SELECT numbered.id, numbered."bottleNumber"
            FROM (
              SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY "inventoryItemId"
                  ORDER BY "purchasedAt" ASC, id ASC
                ) AS "bottleNumber"
              FROM "garrafa_adega"
              WHERE "userId" = ${userId}
            ) AS numbered
            WHERE numbered.id IN (${Prisma.join(ids)})
          `)
      : [];
    const numbers = new Map(numbered.map(({ id, bottleNumber }) => [id, Number(bottleNumber)]));
    return paginated(
      pageItems.map((bottle) => ({ ...bottle, bottleNumber: numbers.get(bottle.id) ?? 1 })),
      total,
      page,
      limit,
    );
  },

  async listBottles(userId: string, input: Partial<BottleListFilters> | string = {}) {
    return listAllBottles(userId, input);
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
      await syncActiveInventoryQuantity(transaction, userId, bottle.inventoryItemId);
      return transaction.cellarBottle.findUniqueOrThrow({ where: { id: bottle.id }, include: bottleInclude });
    });
  },

  async finishBottle(userId: string, bottleId: string, input: BottleEventInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const bottle = await transaction.cellarBottle.findFirst({ where: { id: bottleId, userId } });
      if (!bottle) throw new AppError(404, 'Garrafa não encontrada na sua adega.');
      if (bottle.status !== 'ABERTA')
        throw new AppError(409, 'Somente uma garrafa aberta pode ser finalizada.');
      assertBottleEventDate(input.occurredAt, bottle.purchasedAt, bottle.openedAt);
      await transaction.cellarBottle.update({
        where: { id: bottle.id },
        data: {
          status: 'CONSUMIDA',
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
      await syncActiveInventoryQuantity(transaction, userId, bottle.inventoryItemId);
      return transaction.cellarBottle.findUniqueOrThrow({ where: { id: bottle.id }, include: bottleInclude });
    });
  },

  async discardBottle(userId: string, bottleId: string, input: BottleDiscardInput) {
    return prisma.$transaction(async (transaction) => {
      await lockInventory(transaction, userId);
      const bottle = await transaction.cellarBottle.findFirst({ where: { id: bottleId, userId } });
      if (!bottle) throw new AppError(404, 'Garrafa não encontrada na sua adega.');
      if (!['DISPONIVEL', 'ABERTA'].includes(bottle.status))
        throw new AppError(409, 'Somente uma garrafa disponível ou aberta pode ser descartada.');
      assertBottleEventDate(input.occurredAt, bottle.purchasedAt, bottle.openedAt);
      await transaction.cellarBottle.update({
        where: { id: bottle.id },
        data: {
          status: 'DESCARTADA',
          discardedAt: input.occurredAt,
          discardReason: input.reason,
        },
      });
      await transaction.inventoryMovement.create({
        data: {
          inventoryItemId: bottle.inventoryItemId,
          cellarBottleId: bottle.id,
          type: 'DESCARTE',
          quantityBottles: 1,
          occurredAt: input.occurredAt,
          reason: input.reason,
        },
      });
      await syncActiveInventoryQuantity(transaction, userId, bottle.inventoryItemId);
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
      const activeBottles = await transaction.cellarBottle.count({
        where: { userId, inventoryItemId: itemId, status: { in: ['DISPONIVEL', 'ABERTA'] } },
      });
      return transaction.inventoryItem.update({
        where: { id: itemId },
        data: { quantityBottles: activeBottles, active: activeBottles > 0 },
        include: itemInclude,
      });
    });
  },
};
