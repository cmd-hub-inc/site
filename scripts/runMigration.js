import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    // Read the migration SQL
    const migrationPath = path.resolve(process.cwd(), 'prisma/migrations/20260401_add_favorites_following_analytics_trending/migration.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and filter out empty statements
    const statements = sql.split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // Execute each statement
    console.log(`[migration] Running ${statements.length} SQL statements...`);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`[migration] Executing statement ${i + 1}/${statements.length}`);
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log(`[migration] Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`[migration] Error on statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    console.log('[migration] All migration statements completed successfully');

    // Update _prisma_migrations table (optional, mainly for tracking)
    const migrationName = '20260401_add_favorites_following_analytics_trending';
    try {
      const checksum = migrationName; // Simple checksum
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, execution_time)
        VALUES ('${Date.now()}', '${checksum}', NOW(), '${migrationName}', '', NULL, NOW(), 0)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('[migration] Migration marked as applied');
    } catch (trackError) {
      console.log('[migration] (Not tracking in _prisma_migrations - continuing anyway)');
    }

  } catch (error) {
    console.error('[migration] Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
