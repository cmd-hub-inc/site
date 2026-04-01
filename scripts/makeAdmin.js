import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userId = '664171400193638401';

async function makeAdmin() {
  try {
    console.log(`[makeAdmin] Setting user ${userId} as SUPER_ADMIN...`);
    
    // Use raw SQL to update user
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "User"
      SET "isAdmin" = true, "adminRole" = 'SUPER_ADMIN'
      WHERE id = $1
    `, userId);

    console.log(`[makeAdmin] ✓ Successfully set user ${userId} as SUPER_ADMIN`);
    process.exit(0);
  } catch (err) {
    console.error(`[makeAdmin] Error:`, err.message);
    console.error(err);
    process.exit(1);
  }
}

makeAdmin();
