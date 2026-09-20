import type { Prisma } from '../../generated/prisma/client.js';
import { slugify, wineStatusToDatabase, wineStatusToView } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/http.js';

const includeReferences = {
  wineType: { select: { id: true, name: true } },
  grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
  image: { select: { path: true } },
} as const;

type WineWithReferences = Prisma.WineGetPayload<{ include: typeof includeReferences }>;

function toView(wine: WineWithReferences) {
  const grapes = wine.grapeLinks.map(({ grape }) => grape);
  return {
    id: wine.id,
    wineryId: wine.wineryId ?? '',
    name: wine.name,
    slug: wine.slug,
    type: wine.wineType?.name ?? '',
    typeId: wine.wineType?.id ?? wine.typeId ?? '',
    grapes: grapes.map(({ name }) => name).join(', '),
    grapeIds: grapes.map(({ id }) => id),
    volume: String(wine.volumeMl),
    alcohol: String(wine.alcoholPercentage).replace('.', ','),
    description: wine.description,
    characteristics: wine.characteristics ?? '',
    aromas: wine.aromas ?? '',
    tastingNotes: wine.tastingNotes ?? '',
    pairing: wine.pairing ?? '',
    imageName: wine.image?.path ?? '',
    status: wineStatusToView(wine.status),
    createdAt: wine.createdAt.toISOString(),
  };
}

async function resolveReferences(
  input: Record<string, unknown>,
  fallback?: { typeId: string | null; grapeIds: string[] },
) {
  const typeId = input.typeId ? String(input.typeId) : (fallback?.typeId ?? '');
  if (!typeId) throw new AppError(400, 'Selecione o tipo do vinho.');
  if (!(await prisma.wineType.findUnique({ where: { id: typeId } }))) {
    throw new AppError(400, 'O tipo de vinho selecionado não foi encontrado.');
  }

  const grapeIds = Array.isArray(input.grapeIds) ? input.grapeIds.map(String) : fallback?.grapeIds;
  if (!grapeIds?.length) throw new AppError(400, 'Selecione pelo menos uma uva.');
  const grapes = await prisma.grape.findMany({ where: { id: { in: grapeIds } } });
  if (grapes.length !== grapeIds.length) {
    throw new AppError(400, 'Uma das uvas selecionadas não foi encontrada.');
  }
  return { typeId, grapeIds };
}

async function assertCanManage(id: string, userId: string, role: string) {
  if (role === 'ADMIN' || role === 'EDITOR') return;
  const wine = await prisma.wine.findUnique({ where: { id }, select: { createdById: true } });
  if (!wine) throw new AppError(404, 'Vinho não encontrado.');
  if (wine.createdById !== userId) {
    throw new AppError(403, 'Você só pode alterar ou excluir vinhos cadastrados por você.');
  }
}

async function resolveWinery(input: unknown) {
  if (input) {
    const winery = await prisma.winery.findUnique({ where: { id: String(input) } });
    if (!winery) throw new AppError(400, 'A vinícola selecionada não foi encontrada.');
    return winery.id;
  }
  const wineries = await prisma.winery.findMany({ take: 2, select: { id: true } });
  if (wineries.length !== 1) throw new AppError(400, 'Selecione a vinícola do vinho.');
  return wineries[0].id;
}

export const winesService = {
  async list(query = '', createdById?: string) {
    const wines = await prisma.wine.findMany({
      where: query
        ? {
            ...(createdById ? { createdById } : {}),
            OR: [
              { name: { contains: query } },
              { wineType: { name: { contains: query } } },
              { grapeLinks: { some: { grape: { name: { contains: query } } } } },
            ],
          }
        : createdById
          ? { createdById }
          : undefined,
      orderBy: { createdAt: 'desc' },
      include: includeReferences,
    });
    return wines.map(toView);
  },

  async create(input: Record<string, unknown>, createdById: string) {
    const name = String(input.name);
    const references = await resolveReferences(input);
    const data: Prisma.WineUncheckedCreateInput = {
      name,
      createdById,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      wineryId: await resolveWinery(input.wineryId),
      typeId: references.typeId,
      volumeMl: Math.round(Number(input.volume)),
      alcoholPercentage: Number(input.alcohol),
      description: String(input.description),
      characteristics: input.characteristics ? String(input.characteristics) : null,
      aromas: input.aromas ? String(input.aromas) : null,
      tastingNotes: input.tastingNotes ? String(input.tastingNotes) : null,
      pairing: input.pairing ? String(input.pairing) : null,
      status: wineStatusToDatabase(String(input.status)),
    };
    const wine = await prisma.$transaction(async (transaction) => {
      const created = await transaction.wine.create({ data });
      await transaction.wineGrape.createMany({
        data: references.grapeIds.map((grapeId) => ({ wineId: created.id, grapeId })),
      });
      return transaction.wine.findUniqueOrThrow({ where: { id: created.id }, include: includeReferences });
    });
    return toView(wine);
  },

  async update(id: string, input: Record<string, unknown>, userId: string, role: string) {
    await assertCanManage(id, userId, role);
    const data: Prisma.WineUncheckedUpdateInput = {};
    const hasReferenceChange = input.typeId !== undefined || input.grapeIds !== undefined;
    const currentReferences = hasReferenceChange
      ? await prisma.wine.findUniqueOrThrow({
          where: { id },
          select: { typeId: true, grapeLinks: { select: { grapeId: true } } },
        })
      : null;
    const references = currentReferences
      ? await resolveReferences(input, {
          typeId: currentReferences.typeId,
          grapeIds: currentReferences.grapeLinks.map(({ grapeId }) => grapeId),
        })
      : null;
    if (input.name !== undefined) data.name = String(input.name);
    if (input.wineryId !== undefined) data.wineryId = await resolveWinery(input.wineryId);
    if (references && input.typeId !== undefined) data.typeId = references.typeId;
    if (input.volume !== undefined) data.volumeMl = Math.round(Number(input.volume));
    if (input.alcohol !== undefined) data.alcoholPercentage = Number(input.alcohol);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.characteristics !== undefined)
      data.characteristics = input.characteristics ? String(input.characteristics) : null;
    if (input.aromas !== undefined) data.aromas = input.aromas ? String(input.aromas) : null;
    if (input.tastingNotes !== undefined)
      data.tastingNotes = input.tastingNotes ? String(input.tastingNotes) : null;
    if (input.pairing !== undefined) data.pairing = input.pairing ? String(input.pairing) : null;
    if (input.status !== undefined) data.status = wineStatusToDatabase(String(input.status));
    const wine = await prisma.$transaction(async (transaction) => {
      await transaction.wine.update({ where: { id }, data });
      if (references && input.grapeIds !== undefined) {
        await transaction.wineGrape.deleteMany({ where: { wineId: id } });
        await transaction.wineGrape.createMany({
          data: references.grapeIds.map((grapeId) => ({ wineId: id, grapeId })),
        });
      }
      return transaction.wine.findUniqueOrThrow({ where: { id }, include: includeReferences });
    });
    return toView(wine);
  },

  async remove(id: string, userId: string, role: string) {
    await assertCanManage(id, userId, role);
    const wine = await prisma.wine.findUniqueOrThrow({ where: { id }, select: { imageId: true } });
    await prisma.$transaction(async (transaction) => {
      await transaction.wine.delete({ where: { id } });
      if (wine.imageId) await transaction.wineImage.delete({ where: { id: wine.imageId } });
    });
  },
};
