import { AppError } from '../../common/http.js';
import { toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const summarySelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  grapes: true,
  volumeMl: true,
  alcoholPercentage: true,
  description: true,
  characteristics: true,
  aromas: true,
  tastingNotes: true,
  pairing: true,
  additionalInfo: true,
  imagePath: true,
} as const;

const publicWineSelect = {
  id: true,
  name: true,
  type: true,
  grapes: true,
  volumeMl: true,
  alcoholPercentage: true,
  description: true,
  characteristics: true,
  aromas: true,
  tastingNotes: true,
  pairing: true,
  additionalInfo: true,
  imagePath: true,
  wineType: { select: { name: true } },
  grapeLinks: { include: { grape: { select: { name: true } } } },
  winery: { select: { name: true, city: true, state: true } },
  images: true,
} as const;

function batchView(batch: {
  code: string;
  quantityLiters: number;
  productionDate: Date;
  bottlingTime: string | null;
  registrationDate: Date;
  status: string;
  statusRef: { name: string } | null;
  blockchainRef: string | null;
  qrCodePath: string | null;
  grapeLinks: { grape: { name: string } }[];
}, fallbackGrapes: string[]) {
  return {
    code: batch.code,
    quantityLiters: batch.quantityLiters,
    productionDate: toInputDate(batch.productionDate),
    bottlingTime: batch.bottlingTime,
    registrationDate: toInputDate(batch.registrationDate),
    status: batch.statusRef?.name ?? batch.status,
    grapes: batch.grapeLinks.map(({ grape }) => grape.name).length
      ? batch.grapeLinks.map(({ grape }) => grape.name)
      : fallbackGrapes,
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
  statusRef: { name: string } | null;
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
    status: vintage.statusRef?.name ?? vintage.status,
    grapes,
    batches: vintage.batches.map((batch) => batchView(batch, grapes)),
  };
}

function publicWineView(wine: {
  id: string;
  name: string;
  type: string;
  grapes: string;
  volumeMl: number;
  alcoholPercentage: number;
  description: string;
  characteristics: string | null;
  aromas: string | null;
  tastingNotes: string | null;
  pairing: string | null;
  additionalInfo: string | null;
  imagePath: string | null;
  wineType: { name: string } | null;
  grapeLinks: { grape: { name: string } }[];
  winery: { name: string; city: string; state: string } | null;
  images: { path: string; altText: string | null; isPrimary: boolean }[];
} | null) {
  if (!wine) return null;
  const grapes = wine.grapeLinks.map(({ grape }) => grape.name);
  return {
    id: wine.id,
    name: wine.name,
    type: wine.wineType?.name ?? wine.type,
    grapes: grapes.length ? grapes : wine.grapes.split(',').map((item) => item.trim()).filter(Boolean),
    volumeMl: wine.volumeMl,
    alcoholPercentage: wine.alcoholPercentage,
    description: wine.description,
    characteristics: wine.characteristics,
    aromas: wine.aromas,
    tastingNotes: wine.tastingNotes,
    pairing: wine.pairing,
    additionalInfo: wine.additionalInfo,
    imagePath: wine.imagePath,
    winery: wine.winery,
    images: wine.images,
  };
}

export const catalogService = {
  async list(query = '', type = '') {
    return prisma.wine.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { grapes: { contains: query } },
                { description: { contains: query } },
              ],
            }
          : {}),
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
          include: {
            statusRef: { select: { name: true } },
            grapeLinks: { include: { grape: { select: { name: true } } } },
            batches: {
              where: { status: 'Publicado' },
              orderBy: { productionDate: 'desc' },
              include: {
                statusRef: { select: { name: true } },
                grapeLinks: { include: { grape: { select: { name: true } } } },
              },
            },
          },
        },
        batches: {
          where: { status: 'Publicado' },
          orderBy: { productionDate: 'desc' },
          include: {
            statusRef: { select: { name: true } },
            grapeLinks: { include: { grape: { select: { name: true } } } },
            vintage: {
              include: {
                statusRef: { select: { name: true } },
                grapeLinks: { include: { grape: { select: { name: true } } } },
              },
            },
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
        status: batch.vintage.statusRef?.name ?? batch.vintage.status,
        grapes,
        batches: [],
      };
      if (!item.batches.some((current) => current.code === batch.code)) {
        item.batches.push(batchView(batch, grapes));
      }
      vintageMap.set(item.id, item);
    }

    const wineGrapes = wine.grapeLinks.map(({ grape }) => grape.name);
    return {
      id: wine.id,
      name: wine.name,
      slug: wine.slug,
      type: wine.wineType?.name ?? wine.type,
      grapes: wineGrapes.length ? wineGrapes.join(', ') : wine.grapes,
      volumeMl: wine.volumeMl,
      alcoholPercentage: wine.alcoholPercentage,
      description: wine.description,
      characteristics: wine.characteristics,
      aromas: wine.aromas,
      tastingNotes: wine.tastingNotes,
      pairing: wine.pairing,
      additionalInfo: wine.additionalInfo,
      imagePath: wine.imagePath,
      winery: wine.winery,
      images: wine.images.map((image) => ({
        path: image.path,
        altText: image.altText,
        isPrimary: image.isPrimary,
      })),
      vintages: [...vintageMap.values()].sort((a, b) => b.year - a.year),
    };
  },

  async findBatchByCode(code: string) {
    const batch = await prisma.batch.findFirst({
      where: { code },
      include: {
        statusRef: { select: { name: true } },
        grapeLinks: { include: { grape: { select: { name: true } } } },
        wine: { select: publicWineSelect },
        vintage: {
          include: {
            statusRef: { select: { name: true } },
            grapeLinks: { include: { grape: { select: { name: true } } } },
            wine: { select: publicWineSelect },
          },
        },
      },
    });
    if (!batch) throw new AppError(404, 'Lote não encontrado.');
    const vintageGrapes = batch.vintage.grapeLinks.map(({ grape }) => grape.name);
    return {
      code: batch.code,
      quantityLiters: batch.quantityLiters,
      productionDate: toInputDate(batch.productionDate),
      bottlingTime: batch.bottlingTime,
      registrationDate: toInputDate(batch.registrationDate),
      status: batch.statusRef?.name ?? batch.status,
      grapes: batch.grapeLinks.map(({ grape }) => grape.name).length
        ? batch.grapeLinks.map(({ grape }) => grape.name)
        : vintageGrapes,
      blockchainRef: batch.blockchainRef,
      qrCodePath: batch.qrCodePath,
      wine: publicWineView(batch.wine ?? batch.vintage.wine),
      vintage: {
        identifier: batch.vintage.identifier,
        year: batch.vintage.year,
        observations: batch.vintage.observations,
        supplier: batch.vintage.supplier,
        status: batch.vintage.statusRef?.name ?? batch.vintage.status,
        grapes: vintageGrapes,
      },
    };
  },
};
