import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { batchCodeToProductionDate, normalizeBatchCode, toDate, toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';
const REGISTERED_BLOCKCHAIN_STATUS = 'Registrado na blockchain';

const includeVintage = {
  wine: { select: { id: true, name: true, wineType: { select: { name: true } } } },
  vintage: {
    select: {
      id: true,
      year: true,
      identifier: true,
      wine: { select: { id: true, name: true, wineType: { select: { name: true } } } },
    },
  },
  grapeLinks: { include: { grape: { select: { id: true, name: true } } } },
} as const;

function toView(batch: Prisma.BatchGetPayload<{ include: typeof includeVintage }>) {
  const grapes = batch.grapeLinks.map(({ grape }) => grape);
  return {
    id: batch.id,
    code: batch.code,
    wineId: batch.wine?.id ?? batch.vintage.wine?.id ?? '',
    wineName: batch.wine?.name ?? batch.vintage.wine?.name ?? '',
    vintageId: batch.vintage.id,
    vintageName: String(batch.vintage.year),
    grapeIds: grapes.map(({ id }) => id),
    grapes: grapes.map(({ name }) => name).join(', '),
    quantity: String(batch.quantityLiters),
    productionDate: toInputDate(batch.productionDate),
    registrationDate: batch.registrationDate ? toInputDate(batch.registrationDate) : '',
    status: batch.status,
    blockchain: batch.blockchainRef ?? '',
    qrCode: batch.qrCodePath ?? '',
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
    if (wines.length !== 1) throw new AppError(400, 'Selecione o vinho pelo identificador; o nome não é único ou não existe.');
    return wines[0].id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Selecione o vinho produzido.');
}

async function resolveVintageId(input: Record<string, unknown>, currentId?: string) {
  if (input.vintageId) return String(input.vintageId);
  if (input.vintageName) {
    const year = Number(input.vintageName);
    const vintages = await prisma.vintage.findMany({
      where: Number.isFinite(year) ? { year } : { identifier: String(input.vintageName) },
      take: 2,
    });
    if (vintages.length !== 1) throw new AppError(400, 'Selecione a safra pelo identificador; o ano não é único ou não existe.');
    return vintages[0].id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Informe a safra relacionada.');
}

async function resolveGrapeIds(vintageId: string, wineId: string) {
  const vintage = await prisma.vintage.findUnique({ where: { id: vintageId }, include: { grapeLinks: true } });
  if (!vintage) throw new AppError(400, 'A safra relacionada não foi encontrada.');
  if (vintage.wineId !== wineId) throw new AppError(400, 'A safra selecionada não pertence ao vinho deste lote.');
  if (!vintage.grapeLinks.length) throw new AppError(400, 'Cadastre as uvas da safra antes de criar o lote.');
  return vintage.grapeLinks.map(({ grapeId }) => grapeId);
}

export const batchesService = {
  async list(query = '') {
    const batches = await prisma.batch.findMany({
      where: query
        ? { OR: [{ code: { contains: query } }, { vintage: { identifier: { contains: query } } }] }
        : undefined,
      include: includeVintage,
      orderBy: { createdAt: 'desc' },
    });
    return batches.map(toView);
  },
  async create(input: Record<string, unknown>) {
    if (input.status === REGISTERED_BLOCKCHAIN_STATUS || input.blockchain || input.qrCode) throw new AppError(400, 'Blockchain e QR Code estão reservados para trabalhos futuros.');
    const code = normalizeBatchCode(String(input.code));
    const productionDate = batchCodeToProductionDate(code);
    const wineId = await resolveWineId(input);
    const vintageId = await resolveVintageId(input);
    const grapeIds = await resolveGrapeIds(vintageId, wineId);
    const batch = await prisma.$transaction(async (transaction) => {
      const created = await transaction.batch.create({
        data: {
          code,
          wineId,
          vintageId,
          quantityLiters: Number(input.quantity),
          productionDate: toDate(productionDate ?? String(input.productionDate)),
          registrationDate: null,
          status: String(input.status),
          blockchainRef: input.blockchain ? String(input.blockchain) : null,
          qrCodePath: input.qrCode ? String(input.qrCode) : null,
        },
      });
      if (grapeIds?.length) {
        await transaction.batchGrape.createMany({
          data: grapeIds.map((grapeId) => ({ batchId: created.id, grapeId })),
        });
      }
      return transaction.batch.findUniqueOrThrow({ where: { id: created.id }, include: includeVintage });
    });
    return toView(batch);
  },
  async update(id: string, input: Record<string, unknown>) {
    const current = await prisma.batch.findUniqueOrThrow({ where: { id } });
    if ((input.status === REGISTERED_BLOCKCHAIN_STATUS && current.status !== input.status) || (input.blockchain && input.blockchain !== current.blockchainRef) || (input.qrCode && input.qrCode !== current.qrCodePath)) throw new AppError(400, 'Blockchain e QR Code estão reservados para trabalhos futuros.');
    const data: Prisma.BatchUncheckedUpdateInput = {};
    if (input.wineId !== undefined || input.wineName !== undefined)
      data.wineId = await resolveWineId(input, current.wineId);
    const effectiveWineId = await resolveWineId(input, current.wineId);
    const effectiveVintageId = await resolveVintageId(input, current.vintageId);
    const grapeIds = await resolveGrapeIds(effectiveVintageId, effectiveWineId);
    if (input.code !== undefined) data.code = normalizeBatchCode(String(input.code));
    if (input.vintageId !== undefined || input.vintageName !== undefined)
      data.vintageId = await resolveVintageId(input, current.vintageId);
    if (input.quantity !== undefined) data.quantityLiters = Number(input.quantity);
    if (input.productionDate !== undefined || input.code !== undefined) {
      const effectiveCode = input.code !== undefined ? normalizeBatchCode(String(input.code)) : current.code;
      const productionDate = batchCodeToProductionDate(effectiveCode);
      if (productionDate) data.productionDate = toDate(productionDate);
    }
    if (input.status !== undefined) {
      data.status = String(input.status);
    }
    if (input.blockchain !== undefined)
      data.blockchainRef = input.blockchain ? String(input.blockchain) : null;
    if (input.qrCode !== undefined) data.qrCodePath = input.qrCode ? String(input.qrCode) : null;
    const batch = await prisma.$transaction(async (transaction) => {
      await transaction.batch.update({ where: { id }, data });
      await transaction.batchGrape.deleteMany({ where: { batchId: id } });
      await transaction.batchGrape.createMany({
        data: grapeIds.map((grapeId) => ({ batchId: id, grapeId })),
      });
      return transaction.batch.findUniqueOrThrow({ where: { id }, include: includeVintage });
    });
    return toView(batch);
  },
  async remove(id: string) {
    await prisma.batch.delete({ where: { id } });
  },
};
