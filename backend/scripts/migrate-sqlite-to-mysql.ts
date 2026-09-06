import 'dotenv/config';
import Database from 'better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createMysqlAdapter } from '../src/lib/mysqlAdapter.js';

type Row = Record<string, unknown>;

const sqlite = new Database('dev.db', { readonly: true });
const prisma = new PrismaClient({ adapter: createMysqlAdapter() });

function rows(table: string) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all() as Row[];
}

function date(value: unknown) {
  return new Date(String(value));
}

function bool(value: unknown) {
  return Boolean(Number(value));
}

async function main() {
  const roles = rows('role');
  const users = rows('usuario');
  const wineries = rows('vinicola');
  const wineTypes = rows('tipo_vinho');
  const grapes = rows('uva');
  const wines = rows('vinho');
  const wineGrapes = rows('vinho_uva');
  const wineImages = rows('imagem_vinho');
  const vintages = rows('safra');
  const vintageGrapes = rows('safra_uva');
  const batches = rows('lote');
  const batchGrapes = rows('lote_uva');
  const sessions = rows('sessao');

  await prisma.role.createMany({
    data: roles.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.user.createMany({
    data: users.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      age: row.age == null ? null : Number(row.age),
      address: row.address == null ? null : String(row.address),
      phone: row.phone == null ? null : String(row.phone),
      birthDate: row.birthDate == null ? null : String(row.birthDate),
      street: row.street == null ? null : String(row.street),
      addressNumber: row.addressNumber == null ? null : String(row.addressNumber),
      city: row.city == null ? null : String(row.city),
      state: row.state == null ? null : String(row.state),
      country: row.country == null ? null : String(row.country),
      email: String(row.email),
      passwordHash: String(row.passwordHash),
      passwordSalt: row.passwordSalt == null ? null : String(row.passwordSalt),
      roleId:
        row.roleId == null
          ? ((roles.find((role) => String(role.name) === String(row.role))?.id as string | undefined) ?? null)
          : String(row.roleId),
      active: bool(row.active),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.winery.createMany({
    data: wineries.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      cnpj: String(row.cnpj),
      city: String(row.city),
      state: String(row.state),
      email: row.email == null ? null : String(row.email),
      walletAddress: row.walletAddress == null ? null : String(row.walletAddress),
      status: String(row.status),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.wineType.createMany({
    data: wineTypes.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      active: bool(row.active),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.grape.createMany({
    data: grapes.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: row.description == null ? null : String(row.description),
      active: bool(row.active),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.wine.createMany({
    data: wines.map((row) => ({
      id: String(row.id),
      createdById: row.createdById == null ? null : String(row.createdById),
      wineryId: row.wineryId == null ? null : String(row.wineryId),
      typeId:
        row.typeId == null
          ? String(wineTypes.find((type) => String(type.name) === String(row.type))?.id ?? '') || null
          : String(row.typeId),
      name: String(row.name),
      slug: String(row.slug),
      volumeMl: Number(row.volumeMl),
      alcoholPercentage: Number(row.alcoholPercentage),
      description:
        row.informacoes_complementares == null
          ? String(row.description)
          : `${String(row.description)}\n\nInformações complementares: ${String(row.informacoes_complementares)}`,
      characteristics: row.caracteristicas == null ? null : String(row.caracteristicas),
      aromas: row.aromas == null ? null : String(row.aromas),
      tastingNotes: row.notas_degustacao == null ? null : String(row.notas_degustacao),
      pairing: row.harmonizacao == null ? null : String(row.harmonizacao),
      status: String(row.status),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.wineGrape.createMany({
    data: wineGrapes.map((row) => ({ wineId: String(row.wineId), grapeId: String(row.grapeId) })),
    skipDuplicates: true,
  });

  await prisma.wineImage.createMany({
    data: wineImages.map((row) => ({
      id: String(row.id),
      path: String(row.path),
      altText: row.altText == null ? null : String(row.altText),
      isPrimary: bool(row.isPrimary),
      createdAt: date(row.createdAt),
    })),
    skipDuplicates: true,
  });

  for (const image of wineImages.filter((row) => bool(row.isPrimary))) {
    await prisma.wine.update({
      where: { id: String(image.wineId) },
      data: { imageId: String(image.id) },
    });
  }

  await prisma.vintage.createMany({
    data: vintages.map((row) => ({
      id: String(row.id),
      wineId: row.wineId == null ? null : String(row.wineId),
      identifier: String(row.identifier),
      year: Number(row.year),
      observations: row.observations == null ? null : String(row.observations),
      status: String(row.status),
      supplier: row.supplier == null ? null : String(row.supplier),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.vintageGrape.createMany({
    data: vintageGrapes.map((row) => ({ vintageId: String(row.vintageId), grapeId: String(row.grapeId) })),
    skipDuplicates: true,
  });

  await prisma.batch.createMany({
    data: batches.map((row) => ({
      id: String(row.id),
      wineId: row.wineId == null ? null : String(row.wineId),
      vintageId: String(row.vintageId),
      code: String(row.code),
      quantityLiters: Number(row.quantityLiters),
      productionDate: date(row.productionDate),
      bottlingTime: row.hora_envase == null ? null : String(row.hora_envase),
      registrationDate: date(row.registrationDate),
      status: String(row.status),
      blockchainRef: row.blockchainRef == null ? null : String(row.blockchainRef),
      qrCodePath: row.qrCodePath == null ? null : String(row.qrCodePath),
      createdAt: date(row.createdAt),
      updatedAt: date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  await prisma.batchGrape.createMany({
    data: batchGrapes.map((row) => ({ batchId: String(row.batchId), grapeId: String(row.grapeId) })),
    skipDuplicates: true,
  });

  await prisma.session.createMany({
    data: sessions.map((row) => ({
      id: String(row.id),
      tokenHash: String(row.tokenHash),
      userId: String(row.userId),
      expiresAt: date(row.expiresAt),
      createdAt: date(row.createdAt),
    })),
    skipDuplicates: true,
  });

  console.log(
    `Migração concluída: ${users.length} usuários, ${wines.length} vinhos, ${vintages.length} safras e ${batches.length} lotes.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
