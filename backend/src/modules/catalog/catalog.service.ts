import { AppError } from '../../common/http.js';
import { toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

const summarySelect = {
  id: true,
  name: true,
  slug: true,
  volumeMl: true,
  alcoholPercentage: true,
  description: true,
  characteristics: true,
  aromas: true,
  tastingNotes: true,
  pairing: true,
  wineType: { select: { name: true } },
  grapeLinks: { include: { grape: { select: { name: true } } } },
  image: { select: { path: true } },
} as const;

const publicWineSelect = {
  id: true,
  name: true,
  volumeMl: true,
  alcoholPercentage: true,
  description: true,
  characteristics: true,
  aromas: true,
  tastingNotes: true,
  pairing: true,
  wineType: { select: { name: true } },
  grapeLinks: { include: { grape: { select: { name: true } } } },
  winery: { select: { name: true, city: true, state: true } },
  image: { select: { path: true } },
} as const;

const publicBatchWhere: Prisma.BatchWhereInput = {
  status: { in: ['Publicado', 'Publicado para consulta'] },
};

function batchView(
  batch: {
    code: string;
    quantityLiters: number;
    productionDate: Date;
    bottlingTime: string | null;
  registrationDate: Date | null;
    status: string;
    blockchainRef: string | null;
    qrCodePath: string | null;
    grapeLinks: { grape: { name: string } }[];
  },
  fallbackGrapes: string[],
) {
  const grapes = batch.grapeLinks.map(({ grape }) => grape.name);
  return {
    code: batch.code,
    quantityLiters: batch.quantityLiters,
    productionDate: toInputDate(batch.productionDate),
    bottlingTime: batch.bottlingTime,
    registrationDate: batch.registrationDate ? toInputDate(batch.registrationDate) : null,
    status: batch.status,
    grapes: grapes.length ? grapes : fallbackGrapes,
    blockchainRef: batch.blockchainRef,
    qrCodePath: batch.qrCodePath,
  };
}

function vintageView(vintage: {
  id: string;
  identifier: string;
  year: number;
  observations: string | null;
  supplier: string | null;
  status: string;
  grapeLinks: { grape: { name: string } }[];
  batches: Parameters<typeof batchView>[0][];
}) {
  const grapes = vintage.grapeLinks.map(({ grape }) => grape.name);
  return {
    id: vintage.id,
    identifier: vintage.identifier,
    year: vintage.year,
    observations: vintage.observations,
    supplier: vintage.supplier,
    status: vintage.status,
    grapes,
    batches: vintage.batches.map((batch) => batchView(batch, grapes)),
  };
}

function publicWineView(wine: Prisma.WineGetPayload<{ select: typeof publicWineSelect }> | null) {
  if (!wine) return null;
  return {
    id: wine.id,
    name: wine.name,
    type: wine.wineType?.name ?? '',
    grapes: wine.grapeLinks.map(({ grape }) => grape.name),
    volumeMl: wine.volumeMl,
    alcoholPercentage: wine.alcoholPercentage,
    description: wine.description,
    characteristics: wine.characteristics,
    aromas: wine.aromas,
    tastingNotes: wine.tastingNotes,
    pairing: wine.pairing,
    imagePath: wine.image?.path ?? null,
    winery: wine.winery,
  };
}

export const catalogService = {
  async list(query = '', type = '') {
    const wines = await prisma.wine.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { description: { contains: query } },
                { grapeLinks: { some: { grape: { name: { contains: query } } } } },
              ],
            }
          : {}),
        ...(type ? { wineType: { name: type } } : {}),
      },
      select: summarySelect,
      orderBy: { name: 'asc' },
    });
    return wines.map((wine) => ({
      id: wine.id,
      name: wine.name,
      slug: wine.slug,
      type: wine.wineType?.name ?? '',
      grapes: wine.grapeLinks.map(({ grape }) => grape.name).join(', '),
      volumeMl: wine.volumeMl,
      alcoholPercentage: wine.alcoholPercentage,
      description: wine.description,
      characteristics: wine.characteristics,
      aromas: wine.aromas,
      tastingNotes: wine.tastingNotes,
      pairing: wine.pairing,
      imagePath: wine.image?.path ?? null,
    }));
  },

  async findBySlug(slug: string) {
    const wine = await prisma.wine.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        winery: { select: { name: true, city: true, state: true } },
        image: { select: { path: true } },
        vintages: {
          orderBy: { year: 'desc' },
          include: {
            grapeLinks: { include: { grape: { select: { name: true } } } },
            batches: {
              where: publicBatchWhere,
              orderBy: { productionDate: 'desc' },
              include: { grapeLinks: { include: { grape: { select: { name: true } } } } },
            },
          },
        },
        batches: {
          where: publicBatchWhere,
          orderBy: { productionDate: 'desc' },
          include: {
            grapeLinks: { include: { grape: { select: { name: true } } } },
            vintage: { include: { grapeLinks: { include: { grape: { select: { name: true } } } } } },
          },
        },
        grapeLinks: { include: { grape: { select: { name: true } } } },
        wineType: { select: { name: true } },
      },
    });
    if (!wine) throw new AppError(404, 'Vinho não encontrado no catálogo.');

    const vintageMap = new Map<string, ReturnType<typeof vintageView>>();
    for (const vintage of wine.vintages) vintageMap.set(vintage.id, vintageView(vintage));
    for (const batch of wine.batches) {
      const existing = vintageMap.get(batch.vintage.id);
      const grapes = batch.vintage.grapeLinks.map(({ grape }) => grape.name);
      const item = existing ?? {
        id: batch.vintage.id,
        identifier: batch.vintage.identifier,
        year: batch.vintage.year,
        observations: batch.vintage.observations,
        supplier: batch.vintage.supplier,
        status: batch.vintage.status,
        grapes,
        batches: [],
      };
      if (!item.batches.some((current) => current.code === batch.code)) {
        item.batches.push(batchView(batch, grapes));
      }
      vintageMap.set(item.id, item);
    }

    return {
      id: wine.id,
      name: wine.name,
      slug: wine.slug,
      type: wine.wineType?.name ?? '',
      grapes: wine.grapeLinks.map(({ grape }) => grape.name).join(', '),
      volumeMl: wine.volumeMl,
      alcoholPercentage: wine.alcoholPercentage,
      description: wine.description,
      characteristics: wine.characteristics,
      aromas: wine.aromas,
      tastingNotes: wine.tastingNotes,
      pairing: wine.pairing,
      imagePath: wine.image?.path ?? null,
      winery: wine.winery,
      vintages: [...vintageMap.values()].sort((a, b) => b.year - a.year),
    };
  },

  async findBatchByCode(code: string) {
    const batch = await prisma.batch.findFirst({
      where: { code },
      include: {
        grapeLinks: { include: { grape: { select: { name: true } } } },
        wine: { select: publicWineSelect },
        vintage: {
          include: {
            grapeLinks: { include: { grape: { select: { name: true } } } },
            wine: { select: publicWineSelect },
          },
        },
      },
    });
    if (!batch) throw new AppError(404, 'Lote não encontrado.');
    const vintageGrapes = batch.vintage.grapeLinks.map(({ grape }) => grape.name);
    const batchGrapes = batch.grapeLinks.map(({ grape }) => grape.name);
    return {
      code: batch.code,
      quantityLiters: batch.quantityLiters,
      productionDate: toInputDate(batch.productionDate),
      bottlingTime: batch.bottlingTime,
      registrationDate: batch.registrationDate ? toInputDate(batch.registrationDate) : null,
      status: batch.status,
      grapes: batchGrapes.length ? batchGrapes : vintageGrapes,
      blockchainRef: batch.blockchainRef,
      qrCodePath: batch.qrCodePath,
      wine: publicWineView(batch.wine ?? batch.vintage.wine),
      vintage: {
        identifier: batch.vintage.identifier,
        year: batch.vintage.year,
        observations: batch.vintage.observations,
        supplier: batch.vintage.supplier,
        status: batch.vintage.status,
        grapes: vintageGrapes,
      },
    };
  },
};
