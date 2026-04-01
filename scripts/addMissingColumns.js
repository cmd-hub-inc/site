import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingColumns() {
  try {
    console.log('[addMissingColumns] Adding missing Command columns...');
    
    // Add approved column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Command"
      ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false
    `);
    console.log('[addMissingColumns] ✓ Added approved column');

    // Add approvedBy column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Command"
      ADD COLUMN IF NOT EXISTS "approvedBy" text
    `);
    console.log('[addMissingColumns] ✓ Added approvedBy column');

    // Add approvalReason column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Command"
      ADD COLUMN IF NOT EXISTS "approvalReason" text
    `);
    console.log('[addMissingColumns] ✓ Added approvalReason column');

    // Add index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Command_approved_idx" ON "Command"("approved")
    `);
    console.log('[addMissingColumns] ✓ Created index');

    console.log('[addMissingColumns] ✓ All missing columns added successfully');
    process.exit(0);
  } catch (err) {
    console.error('[addMissingColumns] Error:', err.message);
    process.exit(1);
  }
}

addMissingColumns();
