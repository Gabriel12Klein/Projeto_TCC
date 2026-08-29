import type { Prisma, Wine } from '../../generated/prisma/client.js';
import { slugify, wineStatusToDatabase, wineStatusToView } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

function toView(wine: Wine) {
  return {
    id: wine.id,
    wineryId: wine.wineryId ?? '',
    name: wine.name,
    slug: wine.slug,
    type: wine.type,
    grapes: wine.grapes,
    volume: String(wine.volumeMl),
    alcohol: String(wine.alcoholPercentage).replace('.', ','),
    description: wine.description,
    imageName: wine.imagePath ?? '',
    status: wineStatusToView(wine.status),
    createdAt: wine.createdAt.toISOString(),
  };
}

export const winesService = {
  async list(query = '') {
    const wines = await prisma.wine.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { type: { contains: query } },
              { grapes: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return wines.map(toView);
  },
  async create(input: Record<string, unknown>) {
    const name = String(input.name);
    const data: Prisma.WineUncheckedCreateInput = {
      name,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      wineryId: input.wineryId ? String(input.wineryId) : null,
      type: String(input.type),
      grapes: String(input.grapes),
      volumeMl: Math.round(Number(input.volume)),
      alcoholPercentage: Number(input.alcohol),
      description: String(input.description),
      imagePath: input.imageName ? String(input.imageName) : null,
      status: wineStatusToDatabase(String(input.status)),
    };
    return toView(await prisma.wine.create({ data }));
  },
  async update(id: string, input: Record<string, unknown>) {
    const data: Prisma.WineUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = String(input.name);
    if (input.wineryId !== undefined) data.wineryId = input.wineryId ? String(input.wineryId) : null;
    if (input.type !== undefined) data.type = String(input.type);
    if (input.grapes !== undefined) data.grapes = String(input.grapes);
    if (input.volume !== undefined) data.volumeMl = Math.round(Number(input.volume));
    if (input.alcohol !== undefined) data.alcoholPercentage = Number(input.alcohol);
    if (input.description !== undefined) data.description = String(input.description);
    if (input.imageName !== undefined) data.imagePath = input.imageName ? String(input.imageName) : null;
    if (input.status !== undefined) data.status = wineStatusToDatabase(String(input.status));
    return toView(await prisma.wine.update({ where: { id }, data }));
  },
  async remove(id: string) {
    await prisma.wine.delete({ where: { id } });
  },
};
