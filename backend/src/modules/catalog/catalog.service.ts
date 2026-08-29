import { AppError } from '../../common/http.js';
import { toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const summarySelect = {
  id: true, name: true, slug: true, type: true, grapes: true,
  volumeMl: true, alcoholPercentage: true, description: true, imagePath: true,
} as const;

export const catalogService = {
  async list(query = '', type = '') {
    return prisma.wine.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query ? { OR: [
          { name: { contains: query } }, { grapes: { contains: query } }, { description: { contains: query } },
        ] } : {}),
        ...(type ? { type } : {}),
      },
      select: summarySelect,
      orderBy: { name: 'asc' },
    });
  },

  async findBySlug(slug: string) {
    const wine = await prisma.wine.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        winery: { select: { name: true, city: true, state: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        vintages: {
          orderBy: { year: 'desc' },
          include: { batches: { where: { status: 'Publicado' }, orderBy: { productionDate: 'desc' } } },
        },
      },
    });
    if (!wine) throw new AppError(404, 'Vinho não encontrado no catálogo.');
    return {
      id: wine.id, name: wine.name, slug: wine.slug, type: wine.type, grapes: wine.grapes,
      volumeMl: wine.volumeMl, alcoholPercentage: wine.alcoholPercentage,
      description: wine.description, imagePath: wine.imagePath,
      winery: wine.winery,
      images: wine.images.map((image) => ({ path: image.path, altText: image.altText, isPrimary: image.isPrimary })),
      vintages: wine.vintages.map((vintage) => ({
        id: vintage.id, identifier: vintage.identifier, year: vintage.year,
        observations: vintage.observations, status: vintage.status,
        batches: vintage.batches.map((batch) => ({
          code: batch.code, status: batch.status, productionDate: toInputDate(batch.productionDate),
          blockchainRef: batch.blockchainRef, qrCodePath: batch.qrCodePath,
        })),
      })),
    };
  },
};
