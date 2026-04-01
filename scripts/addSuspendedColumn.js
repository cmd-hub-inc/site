import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSuspendedColumn() {
  try {
    console.log('[addSuspendedColumn] Adding suspended column to User table...');
    
    // Add suspended column if it doesn't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "suspended" boolean DEFAULT false
    `);
    console.log('[addSuspendedColumn] ✓ Added suspended column');

    // Create index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_suspended_idx" ON "User"("suspended")
    `);
    console.log('[addSuspendedColumn] ✓ Created index');

    console.log('[addSuspendedColumn] ✓ All changes applied successfully');
    process.exit(0);
  } catch (err) {
    console.error('[addSuspendedColumn] Error:', err.message);
    process.exit(1);
  }
}

addSuspendedColumn();
