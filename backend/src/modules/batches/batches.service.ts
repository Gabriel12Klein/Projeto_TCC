import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { batchCodeToProductionDate, normalizeBatchCode, toDate, toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';
import QRCode from 'qrcode';
import { join } from 'node:path';
import { ensureUploadDirectory } from '../../common/files.js';
import { slugify } from '../../common/format.js';
import { networkInterfaces } from 'node:os';

const REGISTERED_BLOCKCHAIN_STATUS = 'Registrado na blockchain';

function currentRegistrationDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
}

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
    bottlingTime: batch.bottlingTime ?? '',
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
    const wine = await prisma.wine.findFirst({ where: { name: String(input.wineName) } });
    if (!wine) throw new AppError(400, 'O vinho relacionado não foi encontrado.');
    return wine.id;
  }
  return currentId ?? null;
}

async function resolveVintageId(input: Record<string, unknown>, currentId?: string) {
  if (input.vintageId) return String(input.vintageId);
  if (input.vintageName) {
    const year = Number(input.vintageName);
    const vintage = await prisma.vintage.findFirst({
      where: Number.isFinite(year) ? { year } : { identifier: String(input.vintageName) },
    });
    if (!vintage) throw new AppError(400, 'A safra relacionada não foi encontrada.');
    return vintage.id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Informe a safra relacionada.');
}

async function resolveGrapeIds(input: Record<string, unknown>) {
  if (!Array.isArray(input.grapeIds)) return undefined;
  const grapeIds = input.grapeIds.map(String);
  const grapes = await prisma.grape.findMany({ where: { id: { in: grapeIds } } });
  if (grapes.length !== grapeIds.length)
    throw new AppError(400, 'Uma das uvas selecionadas não foi encontrada.');
  return grapeIds;
}

function localNetworkAddress() {
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const network of interfaces ?? []) {
      if (network.family === 'IPv4' && !network.internal) return network.address;
    }
  }
  return 'localhost';
}

function resolvePublicAppUrl(requestOrigin?: string) {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (requestOrigin) {
    try {
      const origin = new URL(requestOrigin);
      if (!['localhost', '127.0.0.1', '::1'].includes(origin.hostname)) return origin.origin;
    } catch {
      /* usa o endereço local abaixo quando a origem não for uma URL válida */
    }
  }

  const port = process.env.FRONTEND_PORT ?? '5173';
  return `http://${localNetworkAddress()}:${port}`;
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
    const code = normalizeBatchCode(String(input.code));
    const productionDate = batchCodeToProductionDate(code);
    const wineId = await resolveWineId(input);
    const vintageId = await resolveVintageId(input);
    const grapeIds = await resolveGrapeIds(input);
    const batch = await prisma.$transaction(async (transaction) => {
      const created = await transaction.batch.create({
        data: {
          code,
          wineId,
          vintageId,
          quantityLiters: Number(input.quantity),
          productionDate: toDate(productionDate ?? String(input.productionDate)),
          bottlingTime: input.bottlingTime ? String(input.bottlingTime) : null,
          registrationDate:
            String(input.status) === REGISTERED_BLOCKCHAIN_STATUS
              ? currentRegistrationDate()
              : null,
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
    const data: Prisma.BatchUncheckedUpdateInput = {};
    if (input.wineId !== undefined || input.wineName !== undefined)
      data.wineId = await resolveWineId(input, current.wineId);
    const grapeIds = await resolveGrapeIds(input);
    if (input.code !== undefined) data.code = normalizeBatchCode(String(input.code));
    if (input.vintageId !== undefined || input.vintageName !== undefined)
      data.vintageId = await resolveVintageId(input, current.vintageId);
    if (input.quantity !== undefined) data.quantityLiters = Number(input.quantity);
    if (input.bottlingTime !== undefined) data.bottlingTime = String(input.bottlingTime);
    if (input.productionDate !== undefined || input.code !== undefined) {
      const effectiveCode = input.code !== undefined ? normalizeBatchCode(String(input.code)) : current.code;
      const productionDate = batchCodeToProductionDate(effectiveCode);
      if (productionDate) data.productionDate = toDate(productionDate);
    }
    if (input.status !== undefined) {
      data.status = String(input.status);
      if (String(input.status) === REGISTERED_BLOCKCHAIN_STATUS && !current.registrationDate) {
        data.registrationDate = currentRegistrationDate();
      }
    }
    if (input.blockchain !== undefined)
      data.blockchainRef = input.blockchain ? String(input.blockchain) : null;
    if (input.qrCode !== undefined) data.qrCodePath = input.qrCode ? String(input.qrCode) : null;
    const batch = await prisma.$transaction(async (transaction) => {
      await transaction.batch.update({ where: { id }, data });
      if (grapeIds !== undefined) {
        await transaction.batchGrape.deleteMany({ where: { batchId: id } });
        await transaction.batchGrape.createMany({
          data: grapeIds.map((grapeId) => ({ batchId: id, grapeId })),
        });
      }
      return transaction.batch.findUniqueOrThrow({ where: { id }, include: includeVintage });
    });
    return toView(batch);
  },
  async remove(id: string) {
    await prisma.batch.delete({ where: { id } });
  },
  async generateQrCode(id: string, requestOrigin?: string) {
    const batch = await prisma.batch.findUniqueOrThrow({
      where: { id },
      include: { vintage: true },
    });
    const fileName = `${slugify(batch.code)}-${batch.id}.png`;
    const publicPath = `/uploads/qrcodes/${fileName}`;
    const appUrl = resolvePublicAppUrl(requestOrigin);
    const targetUrl = `${appUrl}/consulta/lotes/${encodeURIComponent(batch.code)}`;
    await QRCode.toFile(join(ensureUploadDirectory('qrcodes'), fileName), targetUrl, {
      width: 640,
      margin: 2,
      color: { dark: '#4c151c', light: '#ffffff' },
    });
    await prisma.batch.update({ where: { id }, data: { qrCodePath: publicPath } });
    return { path: publicPath, targetUrl };
  },
};
