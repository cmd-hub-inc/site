import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function ensure() {
  console.log(`[dbEnsure] Checking database tables...`);
  try {
    const needed = ['User', 'Command', 'Favorite', 'Rating', 'Report', 'News'];
    const aliases = { Favorite: ['Favorite', 'Favourite'] };
    const queryTables = ['User', 'Command', 'Favorite', 'Favourite', 'Rating', 'Report', 'News'];
    console.log(`[dbEnsure] Querying information_schema for tables: ${queryTables.join(', ')}`);
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${queryTables})
    `;
    const existing = rows.map((r) => (r.table_name || r.tableName || '').toString());
    const missing = needed.filter((n) => {
      const acceptable = aliases[n] || [n];
      return !acceptable.some((name) => existing.includes(name));
    });
    if (missing.length === 0) {
      console.log('[dbEnsure] All required tables exist.');
      // Ensure News table exists for admin publishing flows.
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "News" (
            "id" text PRIMARY KEY,
            "title" text NOT NULL,
            "content" text NOT NULL,
            "hideAuthor" boolean NOT NULL DEFAULT false,
            "published" boolean NOT NULL DEFAULT false,
            "publishedAt" timestamptz,
            "createdBy" text NOT NULL,
            "createdAt" timestamptz DEFAULT now(),
            "updatedAt" timestamptz DEFAULT now(),
            CONSTRAINT fk_news_author FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE
          )
        `);
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "hideAuthor" boolean NOT NULL DEFAULT false`,
        );
      } catch (newsErr) {
        console.warn(
          '[dbEnsure] Failed to ensure News table:',
          newsErr && newsErr.message ? newsErr.message : newsErr,
        );
      }

      // Ensure required columns exist (in case schema changed without migration)
      try {
        const colRows = await prisma.$queryRaw`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Command' AND column_name = 'uploadCategory'
        `;
        const hasUploadCategory = Array.isArray(colRows) && colRows.length > 0;
        if (!hasUploadCategory) {
          console.log(
            '[dbEnsure] Detected missing column "uploadCategory" on Command — adding it.',
          );
          try {
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "Command" ADD COLUMN IF NOT EXISTS "uploadCategory" text DEFAULT 'Framework'`,
            );
            console.log('[dbEnsure] Added uploadCategory column to Command.');
          } catch (acol) {
            console.warn(
              '[dbEnsure] Failed to add uploadCategory column:',
              acol && acol.message ? acol.message : acol,
            );
          }
        }
      } catch (colErr) {
        console.warn(
          '[dbEnsure] Failed to check/add Command.uploadCategory column:',
          colErr && colErr.message ? colErr.message : colErr,
        );
      }

      // Ensure Report table columns exist (schema drift guard).
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "commandId" text`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "userId" text`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "reportType" text DEFAULT 'other'`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolved" boolean DEFAULT false`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedBy" text`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolutionNote" text`,
        );
        await prisma.$executeRawUnsafe(
          `ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "resolvedAt" timestamptz`,
        );
      } catch (reportErr) {
        console.warn(
          '[dbEnsure] Failed to ensure Report columns:',
          reportErr && reportErr.message ? reportErr.message : reportErr,
        );
      }

      // If commands table exists but is empty, seed mock data for dev convenience
      try {
        const cmdCount = await prisma.command.count();
        if (cmdCount === 0) {
          console.log('[dbEnsure] Commands table empty — seeding mock commands...');
          try {
            const mockPath = path.resolve(process.cwd(), 'src', 'data', 'mockCommands.js');
            const { MOCK_COMMANDS } = await import(`file://${mockPath}`);
            for (const m of MOCK_COMMANDS) {
              const authorId =
                m.author && m.author.id
                  ? String(m.author.id)
                  : `author-${Math.random().toString(36).slice(2, 8)}`;
              try {
                await prisma.user.upsert({
                  where: { id: authorId },
                  create: {
                    id: authorId,
                    username: m.author && m.author.username ? m.author.username : 'unknown',
                  },
                  update: {
                    username: m.author && m.author.username ? m.author.username : 'unknown',
                  },
                });
              } catch (uerr) {
                console.warn(
                  '[dbEnsure] Failed to upsert user for seed:',
                  uerr && uerr.message ? uerr.message : uerr,
                );
              }
              try {
                await prisma.command.create({
                  data: {
                    id: m.id ? String(m.id) : undefined,
                    name: m.name,
                    description: m.description || '',
                    type: m.type || '',
                    framework: m.framework || '',
                    version: m.version || '',
                    tags: m.tags || [],
                    githubUrl: m.githubUrl || null,
                    websiteUrl: m.websiteUrl || null,
                    downloads: m.downloads || 0,
                    rating: typeof m.rating === 'number' ? m.rating : 0,
                    ratingCount: m.ratingCount || 0,
                    favourites: m.favourites || 0,
                    views: m.views || 0,
                    changelog: m.changelog || null,
                    rawData: m.rawData ? String(m.rawData) : '{}',
                    authorId: authorId,
                  },
                });
              } catch (cerr) {
                console.warn(
                  '[dbEnsure] Failed to create command during seed:',
                  cerr && cerr.message ? cerr.message : cerr,
                );
              }
            }
            console.log('[dbEnsure] Mock seeding completed.');
          } catch (impErr) {
            console.warn(
              '[dbEnsure] Failed to import/mock-seed:',
              impErr && impErr.message ? impErr.message : impErr,
            );
          }
        }
      } catch (countErr) {
        console.warn(
          '[dbEnsure] Failed to check command count for seeding:',
          countErr && countErr.message ? countErr.message : countErr,
        );
      }
      return;
    }

    console.log(`[dbEnsure] Missing tables: ${missing.join(', ')}.`);
    console.log('[dbEnsure] Attempting to create/migrate schema using Prisma (this may prompt)...');

    // Try programmatic creation first to avoid CLI hangs (useful in dev without Docker)
    try {
      console.log('[dbEnsure] Attempting programmatic table creation via Prisma client...');
      // Create User table (id as text so external IDs like Discord IDs can be used)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          id text PRIMARY KEY,
          username text NOT NULL,
          avatar text,
          "createdAt" timestamptz DEFAULT now()
        )
      `);

      // Create Command table with a foreign key to User
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Command" (
          id text PRIMARY KEY,
          name text NOT NULL UNIQUE,
          description text NOT NULL,
          type text NOT NULL,
          framework text NOT NULL,
          version text NOT NULL,
          tags text[] DEFAULT '{}'::text[],
          "githubUrl" text,
          "websiteUrl" text,
          downloads integer DEFAULT 0,
          rating double precision DEFAULT 0,
          "ratingCount" integer DEFAULT 0,
          favourites integer DEFAULT 0,
          views integer DEFAULT 0,
          changelog text,
          "rawData" text NOT NULL,
          "uploadCategory" text DEFAULT 'Framework',
          "createdAt" timestamptz DEFAULT now(),
          "updatedAt" timestamptz DEFAULT now(),
          "authorId" text NOT NULL,
          CONSTRAINT fk_author FOREIGN KEY ("authorId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);

      // Create Favorite join table for user favorites
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Favorite" (
          "userId" text NOT NULL,
          "commandId" text NOT NULL,
          "createdAt" timestamptz DEFAULT now(),
          PRIMARY KEY ("userId", "commandId"),
          CONSTRAINT fk_favorite_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          CONSTRAINT fk_favorite_command FOREIGN KEY ("commandId") REFERENCES "Command"(id) ON DELETE CASCADE
        )
      `);

      // Create Follow table for follow/unfollow feature
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Follow" (
          "followerId" text NOT NULL,
          "followingId" text NOT NULL,
          "createdAt" timestamptz DEFAULT now(),
          PRIMARY KEY ("followerId", "followingId"),
          CONSTRAINT fk_follow_follower FOREIGN KEY ("followerId") REFERENCES "User"(id) ON DELETE CASCADE,
          CONSTRAINT fk_follow_following FOREIGN KEY ("followingId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);

      // Create Rating table for per-user ratings
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Rating" (
          "userId" text NOT NULL,
          "commandId" text NOT NULL,
          value integer NOT NULL,
          "createdAt" timestamptz DEFAULT now(),
          PRIMARY KEY ("userId", "commandId"),
          CONSTRAINT fk_rating_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
          CONSTRAINT fk_rating_command FOREIGN KEY ("commandId") REFERENCES "Command"(id) ON DELETE CASCADE
        )
      `);

      // Create Report table for moderation
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Report" (
          "id" text PRIMARY KEY,
          "reporterId" text NOT NULL,
          "commandId" text,
          "userId" text,
          "reason" text NOT NULL,
          "reportType" text DEFAULT 'other',
          "resolved" boolean DEFAULT false,
          "resolvedBy" text,
          "resolutionNote" text,
          "createdAt" timestamptz DEFAULT now(),
          "resolvedAt" timestamptz,
          CONSTRAINT fk_report_reporter FOREIGN KEY ("reporterId") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);

      // Create News table for admin-published updates
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "News" (
          "id" text PRIMARY KEY,
          "title" text NOT NULL,
          "content" text NOT NULL,
          "hideAuthor" boolean NOT NULL DEFAULT false,
          "published" boolean NOT NULL DEFAULT false,
          "publishedAt" timestamptz,
          "createdBy" text NOT NULL,
          "createdAt" timestamptz DEFAULT now(),
          "updatedAt" timestamptz DEFAULT now(),
          CONSTRAINT fk_news_author FOREIGN KEY ("createdBy") REFERENCES "User"(id) ON DELETE CASCADE
        )
      `);

      console.log('[dbEnsure] Programmatic table creation completed.');
      // Seed mock data if Commands table is empty (useful for local dev)
      try {
        const cmdCount = await prisma.command.count();
        if (cmdCount === 0) {
          console.log('[dbEnsure] No commands found — seeding mock commands into DB...');
          try {
            const mockPath = path.resolve(process.cwd(), 'src', 'data', 'mockCommands.js');
            const { MOCK_COMMANDS } = await import(`file://${mockPath}`);
            for (const m of MOCK_COMMANDS) {
              const authorId =
                m.author && m.author.id
                  ? String(m.author.id)
                  : `author-${Math.random().toString(36).slice(2, 8)}`;
              try {
                await prisma.user.upsert({
                  where: { id: authorId },
                  create: {
                    id: authorId,
                    username: m.author && m.author.username ? m.author.username : 'unknown',
                  },
                  update: {
                    username: m.author && m.author.username ? m.author.username : 'unknown',
                  },
                });
              } catch (uerr) {
                console.warn(
                  '[dbEnsure] Failed to upsert user for seed:',
                  uerr && uerr.message ? uerr.message : uerr,
                );
              }

              try {
                // create via prisma then update uploadCategory (Prisma client may not know new column)
                const created = await prisma.command.create({
                  data: {
                    id: m.id ? String(m.id) : undefined,
                    name: m.name,
                    description: m.description || '',
                    type: m.type || '',
                    framework: m.framework || '',
                    version: m.version || '',
                    tags: m.tags || [],
                    githubUrl: m.githubUrl || null,
                    websiteUrl: m.websiteUrl || null,
                    downloads: m.downloads || 0,
                    rating: typeof m.rating === 'number' ? m.rating : 0,
                    ratingCount: m.ratingCount || 0,
                    favourites: m.favourites || 0,
                    views: m.views || 0,
                    changelog: m.changelog || null,
                    rawData: m.rawData ? String(m.rawData) : '{}',
                    authorId: authorId,
                  },
                });
                const uploadCat = m.uploadCategory || 'Framework';
                try {
                  await prisma.$executeRawUnsafe(
                    `UPDATE "Command" SET "uploadCategory" = ${
                      uploadCat ? `'${String(uploadCat).replace(/'/g, "''")}'` : "'Framework'"
                    } WHERE id = '${String(created.id).replace(/'/g, "''")}'`,
                  );
                } catch (uerr) {
                  // ignore update errors
                }
              } catch (cerr) {
                console.warn(
                  '[dbEnsure] Failed to create command during seed:',
                  cerr && cerr.message ? cerr.message : cerr,
                );
              }
            }
            console.log('[dbEnsure] Mock seeding completed.');
          } catch (impErr) {
            console.warn(
              '[dbEnsure] Failed to import/mock-seed:',
              impErr && impErr.message ? impErr.message : impErr,
            );
          }
        }
      } catch (countErr) {
        console.warn(
          '[dbEnsure] Failed to check command count for seeding:',
          countErr && countErr.message ? countErr.message : countErr,
        );
      }
      return;
    } catch (progErr) {
      console.warn(
        '[dbEnsure] Programmatic creation failed:',
        progErr && progErr.message ? progErr.message : progErr,
      );
      // fall through to CLI-based methods
    }

    // Prefer using the project's local prisma binary if available to avoid global CLI mismatches
    const localPrisma = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
    );
    const prismaCmd = fs.existsSync(localPrisma) ? localPrisma : 'npx prisma';
    console.log(`[dbEnsure] Using prisma command: ${prismaCmd}`);

    // Try to push schema first (safe for dev); if migrations exist prefer migrate deploy
    try {
      console.log('[dbEnsure] Running `prisma db push`...');
      const execOpts = { stdio: 'inherit', env: { ...process.env, CI: 'true' } };
      execSync(`${prismaCmd} db push`, execOpts);
      console.log('[dbEnsure] Running `prisma generate`...');
      execSync(`${prismaCmd} generate`, execOpts);
      console.log('[dbEnsure] Prisma db push completed.');
    } catch (err) {
      const msg = err && err.message ? String(err.message) : '';
      console.warn('[dbEnsure] `prisma db push` failed:', msg);
      if (
        msg.includes('datasource property `url` is no longer supported') ||
        msg.includes('Error code: P1012')
      ) {
        console.error('[dbEnsure] Detected Prisma v7 schema validation error (P1012).');
        console.error(
          '[dbEnsure] Solution: install a Prisma CLI that matches the project (prisma v5), or migrate your schema to Prisma v7 config format.',
        );
        console.error(
          '[dbEnsure] Quick fix: run `npm install` to ensure local `prisma` devDependency is installed, then re-run this script.',
        );
        throw err;
      }

      console.log('[dbEnsure] Attempting `prisma migrate deploy` as fallback...');
      try {
        const execOpts = { stdio: 'inherit', env: { ...process.env, CI: 'true' } };
        execSync(`${prismaCmd} migrate deploy`, execOpts);
        execSync(`${prismaCmd} generate`, execOpts);
        console.log('[dbEnsure] Prisma migrate deploy completed.');
      } catch (err2) {
        console.error(
          '[dbEnsure] Prisma migrations failed:',
          err2 && err2.message ? err2.message : err2,
        );
        throw err2;
      }
    }
    console.log('[dbEnsure] Schema creation/migration finished.');
  } finally {
    await prisma.$disconnect();
  }
}

// If run directly, execute
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  ensure().catch((err) => {
    console.error('DB ensure failed', err);
    process.exit(1);
  });
}

export default ensure;
