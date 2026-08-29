import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { toDate, toInputDate } from '../../common/format.js';
import { prisma } from '../../lib/prisma.js';

const includeVintage = { vintage: { select: { id: true, year: true, identifier: true } } } as const;

function toView(batch: Prisma.BatchGetPayload<{ include: typeof includeVintage }>) {
  return {
    id: batch.id, code: batch.code, vintageId: batch.vintage.id,
    vintageName: String(batch.vintage.year), quantity: String(batch.quantityLiters),
    productionDate: toInputDate(batch.productionDate), registrationDate: toInputDate(batch.registrationDate),
    status: batch.status, blockchain: batch.blockchainRef ?? '', qrCode: batch.qrCodePath ?? '',
  };
}

async function resolveVintageId(input: Record<string, unknown>, currentId?: string) {
  if (input.vintageId) return String(input.vintageId);
  if (input.vintageName) {
    const year = Number(input.vintageName);
    const vintage = await prisma.vintage.findFirst({ where: Number.isFinite(year) ? { year } : { identifier: String(input.vintageName) } });
    if (!vintage) throw new AppError(400, 'A safra relacionada não foi encontrada.');
    return vintage.id;
  }
  if (currentId) return currentId;
  throw new AppError(400, 'Informe a safra relacionada.');
}

export const batchesService = {
  async list(query = '') {
    const batches = await prisma.batch.findMany({
      where: query ? { OR: [
        { code: { contains: query } }, { vintage: { identifier: { contains: query } } },
      ] } : undefined,
      include: includeVintage,
      orderBy: { createdAt: 'desc' },
    });
    return batches.map(toView);
  },
  async create(input: Record<string, unknown>) {
    const vintageId = await resolveVintageId(input);
    return toView(await prisma.batch.create({
      data: {
        code: String(input.code), vintageId, quantityLiters: Number(input.quantity),
        productionDate: toDate(String(input.productionDate)), registrationDate: toDate(String(input.registrationDate)),
        status: String(input.status), blockchainRef: input.blockchain ? String(input.blockchain) : null,
        qrCodePath: input.qrCode ? String(input.qrCode) : null,
      },
      include: includeVintage,
    }));
  },
  async update(id: string, input: Record<string, unknown>) {
    const current = await prisma.batch.findUniqueOrThrow({ where: { id } });
    const data: Prisma.BatchUncheckedUpdateInput = {};
    if (input.code !== undefined) data.code = String(input.code);
    if (input.vintageId !== undefined || input.vintageName !== undefined) data.vintageId = await resolveVintageId(input, current.vintageId);
    if (input.quantity !== undefined) data.quantityLiters = Number(input.quantity);
    if (input.productionDate !== undefined) data.productionDate = toDate(String(input.productionDate));
    if (input.registrationDate !== undefined) data.registrationDate = toDate(String(input.registrationDate));
    if (input.status !== undefined) data.status = String(input.status);
    if (input.blockchain !== undefined) data.blockchainRef = input.blockchain ? String(input.blockchain) : null;
    if (input.qrCode !== undefined) data.qrCodePath = input.qrCode ? String(input.qrCode) : null;
    return toView(await prisma.batch.update({ where: { id }, data, include: includeVintage }));
  },
  async remove(id: string) {
    await prisma.batch.delete({ where: { id } });
  },
};
