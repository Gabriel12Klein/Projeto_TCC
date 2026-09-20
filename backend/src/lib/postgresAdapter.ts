import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

export function createPostgresAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith('postgresql://') && !connectionString?.startsWith('postgres://')) {
    throw new Error('DATABASE_URL deve usar o formato postgresql://usuario:senha@host:5432/banco.');
  }

  return new PrismaPg({ connectionString });
}
