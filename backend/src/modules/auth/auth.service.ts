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

function publicUser(user: User & { roleRef?: { name: string } | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.roleRef?.name ?? user.role,
    age: user.age,
    address: user.address,
    phone: user.phone,
    birthDate: user.birthDate,
    street: user.street,
    addressNumber: user.addressNumber,
    city: user.city,
    state: user.state,
    country: user.country,
  };
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
  const [adminRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: { description: 'Administrador e dono da vinícola.' },
      create: { id: 'role-admin', name: 'ADMIN', description: 'Administrador e dono da vinícola.' },
    }),
    prisma.role.upsert({
      where: { name: 'CUSTOMER' },
      update: { description: 'Cliente do sistema.' },
      create: { id: 'role-customer', name: 'CUSTOMER', description: 'Cliente do sistema.' },
    }),
    prisma.role.upsert({
      where: { name: 'EDITOR' },
      update: { description: 'Editor administrativo legado.' },
      create: { id: 'role-editor', name: 'EDITOR', description: 'Editor administrativo legado.' },
    }),
  ]);
  const current = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (current) {
    if (current.role !== 'ADMIN' || current.roleId !== adminRole.id)
      await prisma.user.update({ where: { id: current.id }, data: { role: 'ADMIN', roleId: adminRole.id } });
    return;
  }
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: 'ADMIN',
      roleId: adminRole.id,
    },
  });
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Já existe uma conta com este e-mail.');
    const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: 'CUSTOMER',
        roleId: customerRole.id,
      },
    });
    return publicUser(user);
  },

  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { roleRef: true } });
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

  async updateProfile(
    userId: string,
    input: {
      name: string;
      age: number | null;
      birthDate: string | null;
      street: string | null;
      addressNumber: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      phone: string | null;
      newPassword?: string;
    },
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        age: input.age,
        birthDate: input.birthDate || null,
        street: input.street || null,
        addressNumber: input.addressNumber || null,
        city: input.city || null,
        state: input.state || null,
        country: input.country || null,
        phone: input.phone || null,
        ...(input.newPassword
          ? { passwordHash: await bcrypt.hash(input.newPassword, 12), passwordSalt: null }
          : {}),
      },
    });
    return publicUser(user);
  },

  async authenticate(token: string) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: { include: { roleRef: true } } },
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
