import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { toPtDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const includeWine = { wine: { select: { id: true, name: true } } } as const;

function toView(vintage: Prisma.VintageGetPayload<{ include: typeof includeWine }>) {
  return {
    id: vintage.id, identifier: vintage.identifier, wineId: vintage.wine.id,
    wineName: vintage.wine.name, year: String(vintage.year),
    observations: vintage.observations ?? '', status: vintage.status,
    createdAt: toPtDate(vintage.createdAt),
  };
}

async function resolveWineId(input: Record<string, unknown>, currentId?: string) {
  if (input.wineId) return String(input.wineId);
  if (input.wineName) {
    const wine = await prisma.wine.findFirst({ where: { name: String(input.wineName) } });
    if (!wine) throw new AppError(400, 'O vinho relacionado não foi encontrado.');
    return wine.id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Informe o vinho relacionado.');
}

export const vintagesService = {
  async list(query = '') {
    const vintages = await prisma.vintage.findMany({
      where: query ? { OR: [
        { identifier: { contains: query } }, { wine: { name: { contains: query } } },
      ] } : undefined,
      include: includeWine,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    return vintages.map(toView);
  },
  async create(input: Record<string, unknown>) {
    const wineId = await resolveWineId(input);
    const vintage = await prisma.vintage.create({
      data: {
        identifier: String(input.identifier), wineId, year: Number(input.year),
        observations: input.observations ? String(input.observations) : null,
        status: String(input.status),
      },
      include: includeWine,
    });
    return toView(vintage);
  },
  async update(id: string, input: Record<string, unknown>) {
    const current = await prisma.vintage.findUniqueOrThrow({ where: { id } });
    const data: Prisma.VintageUncheckedUpdateInput = {};
    if (input.identifier !== undefined) data.identifier = String(input.identifier);
    if (input.wineId !== undefined || input.wineName !== undefined) data.wineId = await resolveWineId(input, current.wineId);
    if (input.year !== undefined) data.year = Number(input.year);
    if (input.observations !== undefined) data.observations = input.observations ? String(input.observations) : null;
    if (input.status !== undefined) data.status = String(input.status);
    return toView(await prisma.vintage.update({ where: { id }, data, include: includeWine }));
  },
  async remove(id: string) {
    await prisma.vintage.delete({ where: { id } });
  },
};
