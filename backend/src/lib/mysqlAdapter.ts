import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function connectionOptions() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl?.startsWith('mysql://')) {
    throw new Error('DATABASE_URL deve usar o formato mysql://usuario:senha@host:3306/banco.');
  }

  const url = new URL(rawUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
  };
}

export function createMysqlAdapter() {
  return new PrismaMariaDb(connectionOptions());
}
