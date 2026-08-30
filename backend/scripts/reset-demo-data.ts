import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

const ADMIN_PASSWORD = 'Admin123!';
const CUSTOMER_PASSWORD = 'Cliente123!';

async function main() {
  const result = await prisma.$transaction(async (database) => {
    // Remove dados operacionais e de demonstração, respeitando as relações.
    await database.session.deleteMany();
    await database.batchGrape.deleteMany();
    await database.batch.deleteMany();
    await database.vintageGrape.deleteMany();
    await database.vintage.deleteMany();
    await database.wineImage.deleteMany();
    await database.wineGrape.deleteMany();
    await database.wine.deleteMany();
    await database.winery.deleteMany();
    await database.user.deleteMany();

    // Roles, tipos de vinho e uvas são referências necessárias para novos cadastros.
    await database.role.deleteMany();
    await database.vintageStatus.deleteMany();
    await database.batchStatus.deleteMany();

    await database.role.createMany({
      data: [
        { id: 'role-admin', name: 'ADMIN', description: 'Administrador e dono da vinícola.' },
        { id: 'role-customer', name: 'CUSTOMER', description: 'Cliente do sistema.' },
      ],
    });

    await database.user.createMany({
      data: [
        {
          id: 'user-admin',
          name: 'Administrador',
          email: 'admin@vinum.local',
          passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
          role: 'ADMIN',
          roleId: 'role-admin',
        },
        {
          id: 'user-customer',
          name: 'Cliente',
          email: 'cliente@vinum.local',
          passwordHash: await bcrypt.hash(CUSTOMER_PASSWORD, 12),
          role: 'CUSTOMER',
          roleId: 'role-customer',
        },
      ],
    });

    await database.vintageStatus.createMany({
      data: [
        { id: 'status-safra-producao', name: 'Em processamento', description: 'Safra recebida e em processamento pela vinícola.' },
        { id: 'status-safra-finalizada', name: 'Concluída', description: 'Processamento da safra encerrado.' },
      ],
    });

    await database.batchStatus.createMany({
      data: [
        { id: 'status-lote-pendente', name: 'Aguardando registro', description: 'Lote ainda não foi registrado na blockchain.' },
        { id: 'status-lote-registrado', name: 'Registrado na blockchain', description: 'Lote registrado na blockchain.' },
        { id: 'status-lote-publicado', name: 'Publicado para consulta', description: 'Informações do lote disponíveis para consulta.' },
      ],
    });

    const [users, wineries, wines, vintages, batches, grapes, wineTypes, vintageStatuses, batchStatuses] = await Promise.all([
      database.user.count(),
      database.winery.count(),
      database.wine.count(),
      database.vintage.count(),
      database.batch.count(),
      database.grape.count(),
      database.wineType.count(),
      database.vintageStatus.count(),
      database.batchStatus.count(),
    ]);

    return { users, wineries, wines, vintages, batches, grapes, wineTypes, vintageStatuses, batchStatuses };
  });

  console.log('Banco limpo:', result);
  console.log('Admin: admin@vinum.local / Admin123!');
  console.log('Cliente: cliente@vinum.local / Cliente123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
