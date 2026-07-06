import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Declare global typing for Prisma instance caching in development
declare global {
  var prismaGlobalInstance: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.startsWith('file:') || dbUrl.includes('.db') || dbUrl.includes('sqlite')) {
    // Initialize SQLite adapter using the config object directly
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    return new PrismaClient({ adapter });
  } else {
    // Initialize PostgreSQL adapter dynamically
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
};

const db = globalThis.prismaGlobalInstance ?? createPrismaClient();

export default db;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobalInstance = db;
}
