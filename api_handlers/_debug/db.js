import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  const results = {
    env: {
      hasDatabase_URL: !!dbUrl,
      databaseUrl_masked: dbUrl ? dbUrl.split('@')[1] || 'hidden' : 'NOT SET',
    },
    pg_connection: null,
    prisma_connection: null,
    table_counts: null,
    errors: [],
  };

  // Test 1: Direct PostgreSQL connection
  if (!dbUrl) {
    results.errors.push('DATABASE_URL not set in environment variables');
  } else {
    const client = new Client({ connectionString: dbUrl, statement_timeout: 5000 });
    try {
      await client.connect();
      const r = await client.query('SELECT 1 AS ok');
      results.pg_connection = { ok: true, test: r.rows[0] };

      // Test 2: Count rows in main tables
      try {
        const tables = ['User', 'Command', 'Rating', 'Favorite'];
        const counts = {};
        for (const table of tables) {
          try {
            const res = await client.query(`SELECT COUNT(*) FROM "${table}"`);
            counts[table] = res.rows[0].count;
          } catch (e) {
            counts[table] = `error: ${e.message}`;
          }
        }
        results.table_counts = counts;
      } catch (e) {
        results.errors.push(`Failed to count tables: ${e.message}`);
      }

      await client.end();
    } catch (err) {
      try {
        await client.end();
      } catch {}
      results.pg_connection = { ok: false, error: String(err && err.message ? err.message : err) };
      results.errors.push(`PostgreSQL connection failed: ${err.message}`);
    }
  }

  // Test 3: Prisma connection
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    results.prisma_connection = { ok: true };

    // Try fetching actual data
    try {
      const count = await prisma.command.count();
      results.prisma_connection.command_count = count;
    } catch (e) {
      results.prisma_connection.command_count_error = e.message;
    }
  } catch (err) {
    results.prisma_connection = { ok: false, error: String(err && err.message ? err.message : err) };
    results.errors.push(`Prisma connection failed: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }

  return res.status(200).json(results);
}
