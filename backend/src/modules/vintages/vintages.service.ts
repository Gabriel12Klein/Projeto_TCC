import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { toPtDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const includeRelations = {
  wine: { select: { id: true, name: true } },
  statusRef: { select: { id: true, name: true } },
  grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
} as const;

type VintageWithRelations = Prisma.VintageGetPayload<{ include: typeof includeRelations }>;

function toView(vintage: VintageWithRelations) {
  const grapes = vintage.grapeLinks.map(({ grape }) => grape);
  return {
    id: vintage.id,
    identifier: vintage.identifier,
    wineId: vintage.wine?.id ?? '',
    wineName: vintage.wine?.name ?? '',
    grapeIds: grapes.map(({ id }) => id),
    grapes: grapes.map(({ name }) => name).join(', '),
    year: String(vintage.year),
    observations: vintage.observations ?? '',
    status: vintage.statusRef?.name ?? vintage.status,
    statusId: vintage.statusRef?.id ?? vintage.statusId ?? '',
    supplier: vintage.supplier ?? '',
    createdAt: toPtDate(vintage.createdAt),
  };
}

async function resolveWineId(input: Record<string, unknown>, currentId?: string | null) {
  if (input.wineId) return String(input.wineId);
  if (input.wineName) {
    const wine = await prisma.wine.findFirst({ where: { name: String(input.wineName) } });
    if (!wine) throw new AppError(400, 'O vinho relacionado não foi encontrado.');
    return wine.id;
  }
  return currentId ?? null;
}

async function resolveGrapeIds(input: Record<string, unknown>) {
  if (!Array.isArray(input.grapeIds)) return undefined;
  const grapeIds = input.grapeIds.map(String);
  const grapes = await prisma.grape.findMany({ where: { id: { in: grapeIds } } });
  if (grapes.length !== grapeIds.length) throw new AppError(400, 'Uma das uvas selecionadas não foi encontrada.');
  return grapeIds;
}

async function resolveVintageStatus(status: unknown) {
  const name = String(status ?? '').trim();
  if (!name) return null;
  const current = await prisma.vintageStatus.findUnique({ where: { name } });
  if (!current) throw new AppError(400, 'O status da safra selecionado não foi encontrado.');
  return current;
}

export const vintagesService = {
  async list(query = '') {
    const vintages = await prisma.vintage.findMany({
      where: query
        ? { OR: [{ identifier: { contains: query } }, { wine: { name: { contains: query } } }] }
        : undefined,
      include: includeRelations,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    return vintages.map(toView);
  },

  async create(input: Record<string, unknown>) {
    const wineId = await resolveWineId(input);
    const grapeIds = await resolveGrapeIds(input);
    const status = await resolveVintageStatus(input.status);
    const vintage = await prisma.$transaction(async (transaction) => {
      const created = await transaction.vintage.create({
        data: {
          identifier: String(input.identifier),
          wineId,
          year: Number(input.year),
          supplier: input.supplier ? String(input.supplier) : null,
          observations: input.observations ? String(input.observations) : null,
          status: String(input.status),
          statusId: status?.id ?? null,
        },
      });
      if (grapeIds?.length) {
        await transaction.vintageGrape.createMany({
          data: grapeIds.map((grapeId) => ({ vintageId: created.id, grapeId })),
        });
      }
      return transaction.vintage.findUniqueOrThrow({ where: { id: created.id }, include: includeRelations });
    });
    return toView(vintage);
  },

  async update(id: string, input: Record<string, unknown>) {
    const current = await prisma.vintage.findUniqueOrThrow({ where: { id } });
    const data: Prisma.VintageUncheckedUpdateInput = {};
    const grapeIds = await resolveGrapeIds(input);
    if (input.identifier !== undefined) data.identifier = String(input.identifier);
    if (input.wineId !== undefined || input.wineName !== undefined) data.wineId = await resolveWineId(input, current.wineId);
    if (input.year !== undefined) data.year = Number(input.year);
    if (input.supplier !== undefined) data.supplier = input.supplier ? String(input.supplier) : null;
    if (input.observations !== undefined) data.observations = input.observations ? String(input.observations) : null;
    if (input.status !== undefined) {
      const status = await resolveVintageStatus(input.status);
      data.status = String(input.status);
      data.statusId = status?.id ?? null;
    }

    const vintage = await prisma.$transaction(async (transaction) => {
      await transaction.vintage.update({ where: { id }, data });
      if (grapeIds !== undefined) {
        await transaction.vintageGrape.deleteMany({ where: { vintageId: id } });
        await transaction.vintageGrape.createMany({
          data: grapeIds.map((grapeId) => ({ vintageId: id, grapeId })),
        });
      }
      return transaction.vintage.findUniqueOrThrow({ where: { id }, include: includeRelations });
    });
    return toView(vintage);
  },

  async remove(id: string) {
    await prisma.vintage.delete({ where: { id } });
  },
};
