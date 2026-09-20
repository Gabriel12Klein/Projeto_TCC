import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/http.js';
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

export const wineriesService = {
  async list(query = '') {
    const wineries = await prisma.winery.findMany({
      where: query
        ? {
            OR: [{ name: { contains: query } }, { city: { contains: query } }, { cnpj: { contains: query } }],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return wineries.map(toView);
  },
  async create(_input: Record<string, unknown>) {
    throw new AppError(409, 'O VINUM possui uma única vinícola. Atualize o cadastro existente em Meu cadastro.');
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
  async remove(_id: string) {
    throw new AppError(409, 'A vinícola administradora não pode ser excluída.');
  },
};
