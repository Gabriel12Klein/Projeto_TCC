import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../backend/src/generated/prisma/client.js';

type JsonRecord = Record<string, unknown>;
type LegacyStore = {
  users: JsonRecord[];
  vinicolas: JsonRecord[];
  vinhos: JsonRecord[];
  safras: JsonRecord[];
  lotes: JsonRecord[];
};

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

function text(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(text(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function date(value: unknown) {
  const raw = text(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const storePath = resolve('backend/data/store.json');
  const store = JSON.parse(await readFile(storePath, 'utf8')) as LegacyStore;

  for (const user of store.users) {
    const email = text(user.email).toLowerCase();
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        id: text(user.id), name: text(user.name), email,
        passwordHash: text(user.passwordHash), passwordSalt: text(user.salt) || null,
        role: 'ADMIN', createdAt: date(user.createdAt),
      },
    });
  }

  for (const winery of store.vinicolas) {
    await prisma.winery.upsert({
      where: { cnpj: text(winery.cnpj) },
      update: {},
      create: {
        id: text(winery.id), name: text(winery.name), cnpj: text(winery.cnpj),
        city: text(winery.city), state: text(winery.state), email: text(winery.email) || null,
        walletAddress: text(winery.wallet) || null, status: text(winery.status, 'Ativa'),
        createdAt: date(winery.createdAt),
      },
    });
  }

  for (const wine of store.vinhos) {
    const name = text(wine.name);
    await prisma.wine.upsert({
      where: { id: text(wine.id) },
      update: {},
      create: {
        id: text(wine.id), name, slug: `${slugify(name)}-${text(wine.id)}`,
        type: text(wine.type), grapes: text(wine.grapes),
        volumeMl: Math.round(number(wine.volume, 750)),
        alcoholPercentage: number(wine.alcohol), description: text(wine.description),
        status: text(wine.status) === 'Ativo' ? 'PUBLISHED' : text(wine.status) === 'Inativo' ? 'ARCHIVED' : 'DRAFT',
        createdAt: date(wine.createdAt),
      },
    });
  }

  for (const vintage of store.safras) {
    const wineId = text(vintage.wineId);
    if (!wineId) continue;
    await prisma.vintage.upsert({
      where: { identifier: text(vintage.identifier) },
      update: {},
      create: {
        id: text(vintage.id), wineId, identifier: text(vintage.identifier),
        year: Math.round(number(vintage.year)), observations: text(vintage.observations) || null,
        status: text(vintage.status), createdAt: date(vintage.createdAt),
      },
    });
  }

  for (const batch of store.lotes) {
    const vintageId = text(batch.vintageId);
    if (!vintageId) continue;
    await prisma.batch.upsert({
      where: { code: text(batch.code) },
      update: {},
      create: {
        id: text(batch.id), vintageId, code: text(batch.code),
        quantityLiters: number(batch.quantity), productionDate: date(batch.productionDate),
        registrationDate: date(batch.registrationDate), status: text(batch.status),
        blockchainRef: text(batch.blockchain) || null, qrCodePath: text(batch.qrCode) || null,
      },
    });
  }

  const [users, wineries, wines, vintages, batches] = await Promise.all([
    prisma.user.count(), prisma.winery.count(), prisma.wine.count(),
    prisma.vintage.count(), prisma.batch.count(),
  ]);
  console.log({ users, wineries, wines, vintages, batches });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
