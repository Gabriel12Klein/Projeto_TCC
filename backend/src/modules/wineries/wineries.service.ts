import { prisma } from '../../lib/prisma.js';
import type { Prisma, Winery } from '../../generated/prisma/client.js';

function toView(winery: Winery) {
  return {
    id: winery.id,
    name: winery.name,
    cnpj: winery.cnpj,
    city: winery.city,
    state: winery.state,
    email: winery.email ?? '',
    wallet: winery.walletAddress ?? '',
    status: winery.status,
    createdAt: winery.createdAt.toISOString(),
  };
}

function toDatabase(input: Record<string, unknown>): Prisma.WineryUncheckedCreateInput {
  return {
    name: String(input.name),
    cnpj: String(input.cnpj),
    city: String(input.city),
    state: String(input.state),
    email: input.email ? String(input.email) : null,
    walletAddress: input.wallet ? String(input.wallet) : null,
    status: input.status ? String(input.status) : 'Ativa',
  };
}

export const wineriesService = {
  async list(query = '') {
    const wineries = await prisma.winery.findMany({
      where: query ? { OR: [
        { name: { contains: query } }, { city: { contains: query } }, { cnpj: { contains: query } },
      ] } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return wineries.map(toView);
  },
  async create(input: Record<string, unknown>) {
    return toView(await prisma.winery.create({ data: toDatabase(input) }));
  },
  async update(id: string, input: Record<string, unknown>) {
    const data: Prisma.WineryUpdateInput = {};
    if (input.name !== undefined) data.name = String(input.name);
    if (input.cnpj !== undefined) data.cnpj = String(input.cnpj);
    if (input.city !== undefined) data.city = String(input.city);
    if (input.state !== undefined) data.state = String(input.state);
    if (input.email !== undefined) data.email = input.email ? String(input.email) : null;
    if (input.wallet !== undefined) data.walletAddress = input.wallet ? String(input.wallet) : null;
    if (input.status !== undefined) data.status = String(input.status);
    return toView(await prisma.winery.update({ where: { id }, data }));
  },
  async remove(id: string) {
    await prisma.winery.delete({ where: { id } });
  },
};
