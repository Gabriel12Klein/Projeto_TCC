import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { User } from '../../generated/prisma/client.js';
import { AppError } from '../../common/http.js';
import { prisma } from '../../lib/prisma.js';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const ADMIN_EMAIL = 'admin@vinum.local';
const ADMIN_PASSWORD = 'Admin123!';

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function verifyPassword(password: string, user: User) {
  if (!user.passwordSalt) return bcrypt.compare(password, user.passwordHash);
  const candidate = scryptSync(password, user.passwordSalt, 64);
  const original = Buffer.from(user.passwordHash, 'hex');
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

async function upgradeLegacyPassword(password: string, user: User) {
  if (!user.passwordSalt) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 12), passwordSalt: null },
  });
}

export async function ensureSeedAdmin() {
  const current = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (current) {
    if (current.role !== 'ADMIN')
      await prisma.user.update({ where: { id: current.id }, data: { role: 'ADMIN' } });
    return;
  }
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
    },
  });
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Já existe uma conta com este e-mail.');
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'CUSTOMER',
      },
    });
    return publicUser(user);
  },

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.active || !(await verifyPassword(input.password, user))) {
      throw new AppError(401, 'E-mail ou senha inválidos.');
    }
    await upgradeLegacyPassword(input.password, user);
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const token = randomBytes(32).toString('hex');
    await prisma.session.create({
      data: {
        tokenHash: tokenHash(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    });
    return { token, user: publicUser(user) };
  },

  async authenticate(token: string) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw new AppError(401, 'Sessão expirada ou inválida.');
    }
    return publicUser(session.user);
  },

  async logout(token: string) {
    await prisma.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  },
};
