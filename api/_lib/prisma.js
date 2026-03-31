import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

if (!globalForPrisma._prisma) {
  globalForPrisma._prisma = new PrismaClient();
}

export default globalForPrisma._prisma;
