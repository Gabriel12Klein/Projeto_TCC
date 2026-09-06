import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createMysqlAdapter } from '../src/lib/mysqlAdapter.js';

const prisma = new PrismaClient({ adapter: createMysqlAdapter() });

const ADMIN_PASSWORD = 'Admin123!';
const CUSTOMER_PASSWORD = 'Cliente123!';

async function main() {
  const result = await prisma.$transaction(async (database) => {
    await database.session.deleteMany();
    await database.batchGrape.deleteMany();
    await database.batch.deleteMany();
    await database.vintageGrape.deleteMany();
    await database.vintage.deleteMany();
    await database.wineGrape.deleteMany();
    await database.wine.deleteMany();
    await database.wineImage.deleteMany();
    await database.winery.deleteMany();
    await database.user.deleteMany();
    await database.role.deleteMany();

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
          roleId: 'role-admin',
        },
        {
          id: 'user-customer',
          name: 'Cliente',
          email: 'cliente@vinum.local',
          passwordHash: await bcrypt.hash(CUSTOMER_PASSWORD, 12),
          roleId: 'role-customer',
        },
      ],
    });

    const [users, wineries, wines, vintages, batches, grapes, wineTypes] = await Promise.all([
      database.user.count(),
      database.winery.count(),
      database.wine.count(),
      database.vintage.count(),
      database.batch.count(),
      database.grape.count(),
      database.wineType.count(),
    ]);

    return { users, wineries, wines, vintages, batches, grapes, wineTypes };
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
