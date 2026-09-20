import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { createPostgresAdapter } from './postgresAdapter.js';

export const prisma = new PrismaClient({ adapter: createPostgresAdapter() });

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
