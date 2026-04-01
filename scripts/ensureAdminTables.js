import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureAdminTables() {
  try {
    console.log('[ensureAdminTables] Checking and creating admin-related tables...');
    
    // Create Report table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Report" (
        id text PRIMARY KEY,
        "reporterId" text NOT NULL,
        "commandId" text,
        "reportedUserId" text,
        reason text NOT NULL,
        description text,
        status text DEFAULT 'OPEN',
        "resolved" boolean DEFAULT false,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now(),
        CONSTRAINT fk_report_reporter FOREIGN KEY ("reporterId") REFERENCES "User"(id) ON DELETE CASCADE
      )
    `);
    console.log('[ensureAdminTables] ✓ Report table ready');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Report_reporterId_idx" ON "Report"("reporterId")
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"(status)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt")
    `);
    console.log('[ensureAdminTables] ✓ Created indexes');

    console.log('[ensureAdminTables] ✓ All admin tables ready');
    process.exit(0);
  } catch (err) {
    console.error('[ensureAdminTables] Error:', err.message);
    process.exit(1);
  }
}

ensureAdminTables();
