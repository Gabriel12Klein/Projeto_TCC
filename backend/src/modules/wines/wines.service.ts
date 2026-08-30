import type { Prisma } from '../../generated/prisma/client.js';
import { slugify, wineStatusToDatabase, wineStatusToView } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/http.js';

const includeReferences = {
  wineType: { select: { id: true, name: true } },
  grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
} as const;

type WineWithReferences = Prisma.WineGetPayload<{ include: typeof includeReferences }>;

function toView(wine: WineWithReferences) {
  const grapeLinks = wine.grapeLinks.map(({ grape }) => grape);
  return {
    id: wine.id,
    wineryId: wine.wineryId ?? '',
    name: wine.name,
    slug: wine.slug,
    type: wine.wineType?.name ?? wine.type,
    typeId: wine.wineType?.id ?? wine.typeId ?? '',
    grapes: grapeLinks.length ? grapeLinks.map(({ name }) => name).join(', ') : wine.grapes,
    grapeIds: grapeLinks.map(({ id }) => id),
    volume: String(wine.volumeMl),
    alcohol: String(wine.alcoholPercentage).replace('.', ','),
    description: wine.description,
    characteristics: wine.characteristics ?? '',
    aromas: wine.aromas ?? '',
    tastingNotes: wine.tastingNotes ?? '',
    pairing: wine.pairing ?? '',
    additionalInfo: wine.additionalInfo ?? '',
    imageName: wine.imagePath ?? '',
    status: wineStatusToView(wine.status),
    createdAt: wine.createdAt.toISOString(),
  };
}

async function resolveReferences(input: Record<string, unknown>) {
  let typeId = input.typeId ? String(input.typeId) : '';
  let typeName = input.type ? String(input.type).trim() : '';
  if (typeId) {
    const type = await prisma.wineType.findUnique({ where: { id: typeId } });
    if (!type) throw new AppError(400, 'O tipo de vinho selecionado não foi encontrado.');
    typeName = type.name;
  }

  const grapeIds = Array.isArray(input.grapeIds) ? input.grapeIds.map(String) : undefined;
  let grapeNames: string[] = [];
  if (grapeIds) {
    const grapes = await prisma.grape.findMany({ where: { id: { in: grapeIds } } });
    if (grapes.length !== grapeIds.length) throw new AppError(400, 'Uma das uvas selecionadas não foi encontrada.');
    const byId = new Map(grapes.map((grape) => [grape.id, grape.name]));
    grapeNames = grapeIds.map((id) => byId.get(id) ?? '').filter(Boolean);
  }
  return { typeId: typeId || null, typeName, grapeIds, grapeNames };
}

async function assertCanManage(id: string, userId: string, role: string) {
  if (role === 'ADMIN' || role === 'EDITOR') return;
  const wine = await prisma.wine.findUnique({ where: { id }, select: { createdById: true } });
  if (!wine) throw new AppError(404, 'Vinho não encontrado.');
  if (wine.createdById !== userId)
    throw new AppError(403, 'Você só pode alterar ou excluir vinhos cadastrados por você.');
}

export const winesService = {
  async list(query = '', createdById?: string) {
    const wines = await prisma.wine.findMany({
      where: query
        ? {
            ...(createdById ? { createdById } : {}),
            OR: [
              { name: { contains: query } },
              { type: { contains: query } },
              { wineType: { name: { contains: query } } },
              { grapes: { contains: query } },
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
      wineryId: input.wineryId ? String(input.wineryId) : null,
      type: references.typeName,
      typeId: references.typeId,
      grapes: references.grapeNames.length ? references.grapeNames.join(', ') : String(input.grapes ?? ''),
      volumeMl: Math.round(Number(input.volume)),
      alcoholPercentage: Number(input.alcohol),
      description: String(input.description),
      characteristics: input.characteristics ? String(input.characteristics) : null,
      aromas: input.aromas ? String(input.aromas) : null,
      tastingNotes: input.tastingNotes ? String(input.tastingNotes) : null,
      pairing: input.pairing ? String(input.pairing) : null,
      additionalInfo: input.additionalInfo ? String(input.additionalInfo) : null,
      imagePath: input.imageName ? String(input.imageName) : null,
      status: wineStatusToDatabase(String(input.status)),
    };
    const wine = await prisma.$transaction(async (transaction) => {
      const created = await transaction.wine.create({ data });
      if (references.grapeIds?.length) {
        await transaction.wineGrape.createMany({
          data: references.grapeIds.map((grapeId) => ({ wineId: created.id, grapeId })),
        });
      }
      return transaction.wine.findUniqueOrThrow({ where: { id: created.id }, include: includeReferences });
    });
    return toView(wine);
  },
  async update(id: string, input: Record<string, unknown>, userId: string, role: string) {
    await assertCanManage(id, userId, role);
    const data: Prisma.WineUncheckedUpdateInput = {};
    const hasTypeChange = input.typeId !== undefined || input.type !== undefined;
    const hasGrapeChange = input.grapeIds !== undefined;
    const references = hasTypeChange || hasGrapeChange ? await resolveReferences(input) : null;
    if (input.name !== undefined) data.name = String(input.name);
    if (input.wineryId !== undefined) data.wineryId = input.wineryId ? String(input.wineryId) : null;
    if (references && hasTypeChange) {
      data.type = references.typeName;
      data.typeId = references.typeId;
    }
    if (references && hasGrapeChange) data.grapes = references.grapeNames.join(', ');
    else if (input.grapes !== undefined) data.grapes = String(input.grapes);
    if (input.volume !== undefined) data.volumeMl = Math.round(Number(input.volume));
    if (input.alcohol !== undefined) data.alcoholPercentage = Number(input.alcohol);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.characteristics !== undefined) data.characteristics = input.characteristics ? String(input.characteristics) : null;
    if (input.aromas !== undefined) data.aromas = input.aromas ? String(input.aromas) : null;
    if (input.tastingNotes !== undefined) data.tastingNotes = input.tastingNotes ? String(input.tastingNotes) : null;
    if (input.pairing !== undefined) data.pairing = input.pairing ? String(input.pairing) : null;
    if (input.additionalInfo !== undefined) data.additionalInfo = input.additionalInfo ? String(input.additionalInfo) : null;
    if (input.imageName !== undefined) data.imagePath = input.imageName ? String(input.imageName) : null;
    if (input.status !== undefined) data.status = wineStatusToDatabase(String(input.status));
    const wine = await prisma.$transaction(async (transaction) => {
      await transaction.wine.update({ where: { id }, data });
      if (references && hasGrapeChange) {
        await transaction.wineGrape.deleteMany({ where: { wineId: id } });
        await transaction.wineGrape.createMany({
          data: (references.grapeIds ?? []).map((grapeId) => ({ wineId: id, grapeId })),
        });
      }
      return transaction.wine.findUniqueOrThrow({ where: { id }, include: includeReferences });
    });
    return toView(wine);
  },
  async remove(id: string, userId: string, role: string) {
    await assertCanManage(id, userId, role);
    await prisma.wine.delete({ where: { id } });
  },
};
