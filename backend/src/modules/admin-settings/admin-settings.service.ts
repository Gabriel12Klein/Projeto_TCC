import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { AppError } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';
import { publicUser, verifyPassword } from '../auth/auth.service.js';
import type { AdminSettingsInput } from './admin-settings.schema.js';

async function currentWinery(db: Pick<typeof prisma, 'winery'> = prisma) {
  const wineries = await db.winery.findMany({ take: 2 });
  if (wineries.length !== 1) throw new AppError(409, 'O cadastro principal precisa ter exatamente uma vinícola. Nenhum cadastro foi selecionado automaticamente.');
  return wineries[0];
}

export const adminSettingsService = {
  async get(userId: string) {
    const [winery, user] = await Promise.all([
      currentWinery(),
      prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { roleRef: true } }),
    ]);
    if (user.wineryId !== winery.id || !['ADMIN', 'EDITOR'].includes(user.roleRef.name)) throw new AppError(403, 'Conta não vinculada à vinícola administradora.');
    return { winery, account: publicUser(user) };
  },
  async update(userId: string, token: string, input: AdminSettingsInput) {
    return prisma.$transaction(async tx => {
      const winery = await currentWinery(tx);
      if (winery.id !== input.wineryId) throw new AppError(409, 'O cadastro mudou. Atualize a página antes de salvar.');
      const account = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { roleRef: true } });
      if (account.wineryId !== winery.id || account.roleRef.name !== 'ADMIN') throw new AppError(403, 'Conta não vinculada à vinícola administradora.');
      const changedCredentials = input.loginEmail !== account.email || Boolean(input.newPassword);
      if (changedCredentials && (!input.currentPassword || !(await verifyPassword(input.currentPassword, account)))) {
        throw new AppError(400, 'Informe a senha atual correta para alterar o e-mail de acesso ou a senha.');
      }
      if (await tx.user.findFirst({ where: { email: input.loginEmail, id: { not: userId } } })) throw new AppError(409, 'Esse e-mail de acesso já está em uso.');
      const updatedWinery = await tx.winery.update({ where: { id: winery.id }, data: {
        name: input.name, cnpj: input.cnpj, city: input.city, state: input.state, email: input.contactEmail || null, phone: input.phone || null,
      } });
      const user = await tx.user.update({ where: { id: userId }, data: {
        name: input.accountName, email: input.loginEmail,
        ...(input.newPassword ? { passwordHash: await bcrypt.hash(input.newPassword, 12), passwordSalt: null } : {}),
      }, include: { roleRef: true } });
      if (changedCredentials) await tx.session.deleteMany({ where: { userId, tokenHash: { not: createHash('sha256').update(token).digest('hex') } } });
      return { winery: updatedWinery, account: publicUser(user) };
    }, { isolationLevel: 'Serializable', timeout: 15000 });
  },
  async summary() {
    const [wines, batches, vintages, grapes, wineTypes, wineStatuses, batchStatuses] = await prisma.$transaction([
      prisma.wine.count(), prisma.batch.count(), prisma.vintage.count(), prisma.grape.count(), prisma.wineType.count(),
      prisma.wine.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.batch.groupBy({ by: ['status'], _count: { _all: true } }),
    ], { isolationLevel: 'RepeatableRead' });
    return { wines, batches, vintages, grapes, wineTypes, wineStatuses: wineStatuses.map(s => ({ status: s.status, count: s._count._all })), batchStatuses: batchStatuses.map(s => ({ status: s.status, count: s._count._all })), updatedAt: new Date().toISOString() };
  },
};
