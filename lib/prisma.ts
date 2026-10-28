import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Pastikan DATABASE_URL terbaca dari .env atau .env.local jika belum ada di process.env
if (!process.env.DATABASE_URL) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch {
    // Abaikan jika dotenv gagal dimuat di edge / browser context
  }
}

// Fallback connection string Supabase default jika environment variable belum terinjeksi
const DEFAULT_DATABASE_URL =
  'postgresql://postgres.hraspfuwergplhxfwtpd:porsikita123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const resolvedDatabaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

// Tetapkan ke process.env agar evaluasi env("DATABASE_URL") di schema.prisma tidak gagal
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDatabaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export default prisma;

