import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAdminToUser() {
  try {
    console.log('[migrateAdminToUser] Starting migration...');
    
    // Add columns to User table if they don't exist
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "isAdmin" boolean DEFAULT false
    `);
    console.log('[migrateAdminToUser] ✓ Added isAdmin column');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "adminRole" text
    `);
    console.log('[migrateAdminToUser] ✓ Added adminRole column');

    // Create index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_isAdmin_idx" ON "User"("isAdmin")
    `);
    console.log('[migrateAdminToUser] ✓ Created index');

    // Try to migrate data from AdminRole table if it exists
    try {
      const adminUsers = await prisma.$queryRawUnsafe(`
        SELECT "AdminRole"."userId", "AdminRole"."role" 
        FROM "AdminRole"
      `);
      
      if (Array.isArray(adminUsers) && adminUsers.length > 0) {
        console.log(`[migrateAdminToUser] Migrating ${adminUsers.length} admin users...`);
        
        for (const admin of adminUsers) {
          await prisma.user.update({
            where: { id: admin.userId },
            data: {
              isAdmin: true,
              adminRole: admin.role
            }
          });
        }
        console.log('[migrateAdminToUser] ✓ Migrated admin users');
      }
    } catch (e) {
      console.log('[migrateAdminToUser] AdminRole table does not exist or is empty, skipping migration');
    }

    // Drop the AdminRole table
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "AdminRole" CASCADE`);
      console.log('[migrateAdminToUser] ✓ Dropped AdminRole table');
    } catch (e) {
      console.log('[migrateAdminToUser] Could not drop AdminRole table (may not exist)');
    }

    console.log('[migrateAdminToUser] ✓ Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('[migrateAdminToUser] Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrateAdminToUser();
