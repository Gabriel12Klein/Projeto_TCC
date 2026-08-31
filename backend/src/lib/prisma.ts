import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { createMysqlAdapter } from './mysqlAdapter.js';

export const prisma = new PrismaClient({ adapter: createMysqlAdapter() });

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
