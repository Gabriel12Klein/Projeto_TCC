import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { normalizeVintageIdentifier, toPtDate, vintageIdentifierToYear } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const includeRelations = {
  wine: { select: { id: true, name: true } },
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
    status: vintage.status,
    supplier: vintage.supplier ?? '',
    createdAt: toPtDate(vintage.createdAt),
  };
}

async function resolveWineId(input: Record<string, unknown>, currentId?: string | null) {
  if (input.wineId) {
    const wine = await prisma.wine.findUnique({ where: { id: String(input.wineId) } });
    if (!wine) throw new AppError(400, 'O vinho relacionado não foi encontrado.');
    return wine.id;
  }
  if (input.wineName) {
    const wines = await prisma.wine.findMany({ where: { name: String(input.wineName) }, take: 2 });
    if (wines.length !== 1) throw new AppError(400, 'Selecione um vinho pelo identificador; o nome não é único ou não existe.');
    return wines[0].id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Selecione o vinho relacionado à safra.');
}

async function resolveGrapeIds(transaction: Prisma.TransactionClient, wineId: string) {
  const links = await transaction.wineGrape.findMany({ where: { wineId }, select: { grapeId: true } });
  if (!links.length) throw new AppError(400, 'Cadastre as uvas do vinho selecionado antes de salvar a safra.');
  return links.map(({ grapeId }) => grapeId);
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
    const identifier = normalizeVintageIdentifier(String(input.identifier));
    const derivedYear = vintageIdentifierToYear(identifier);
    const wineId = await resolveWineId(input);
    const vintage = await prisma.$transaction(async (transaction) => {
      const grapeIds = await resolveGrapeIds(transaction, wineId);
      const created = await transaction.vintage.create({
        data: {
          identifier,
          wineId,
          year: derivedYear ?? Number(input.year),
          supplier: input.supplier ? String(input.supplier) : null,
          observations: input.observations ? String(input.observations) : null,
          status: String(input.status),
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
    const wineId = await resolveWineId(input, current.wineId);
    if (input.identifier !== undefined)
      data.identifier = normalizeVintageIdentifier(String(input.identifier));
    if (input.wineId !== undefined || input.wineName !== undefined)
      data.wineId = wineId;
    if (input.year !== undefined || input.identifier !== undefined) {
      const effectiveIdentifier =
        input.identifier !== undefined
          ? normalizeVintageIdentifier(String(input.identifier))
          : current.identifier;
      const derivedYear = vintageIdentifierToYear(effectiveIdentifier);
      if (derivedYear !== null) data.year = derivedYear;
    }
    if (input.supplier !== undefined) data.supplier = input.supplier ? String(input.supplier) : null;
    if (input.observations !== undefined)
      data.observations = input.observations ? String(input.observations) : null;
    if (input.status !== undefined) {
      data.status = String(input.status);
    }

    const vintage = await prisma.$transaction(async (transaction) => {
      const grapeIds = await resolveGrapeIds(transaction, wineId);
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
    const linkedBatches = await prisma.batch.count({ where: { vintageId: id } });
    if (linkedBatches > 0) {
      throw new AppError(
        409,
        `Esta safra não pode ser excluída porque possui ${linkedBatches === 1 ? '1 lote vinculado' : `${linkedBatches} lotes vinculados`}. Exclua ou ajuste os lotes antes de tentar novamente.`,
      );
    }
    await prisma.vintage.delete({ where: { id } });
  },
};
