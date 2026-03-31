import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

async function ensure() {
  console.log(`[dbEnsure] Checking database tables...`)
  try {
    const needed = ['User', 'Command']
    console.log(`[dbEnsure] Querying information_schema for tables: ${needed.join(', ')}`)
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${needed})
    `
    const existing = rows.map(r => (r.table_name || r.tableName || '').toString())
    const missing = needed.filter(n => !existing.includes(n))
    if (missing.length === 0) {
      console.log('[dbEnsure] All required tables exist.')
      return
    }

    console.log(`[dbEnsure] Missing tables: ${missing.join(', ')}.`)
    console.log('[dbEnsure] Attempting to create/migrate schema using Prisma (this may prompt)...')

    // Prefer using the project's local prisma binary if available to avoid global CLI mismatches
    const localPrisma = path.resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma')
    const prismaCmd = fs.existsSync(localPrisma) ? localPrisma : 'npx prisma'
    console.log(`[dbEnsure] Using prisma command: ${prismaCmd}`)

    // Try to push schema first (safe for dev); if migrations exist prefer migrate deploy
    try {
      console.log('[dbEnsure] Running `prisma db push`...')
        const execOpts = { stdio: 'inherit', env: { ...process.env, CI: 'true' } }
        execSync(`${prismaCmd} db push`, execOpts)
        console.log('[dbEnsure] Running `prisma generate`...')
        execSync(`${prismaCmd} generate`, execOpts)
      console.log('[dbEnsure] Prisma db push completed.')
    } catch (err) {
      const msg = err && err.message ? String(err.message) : ''
      console.warn('[dbEnsure] `prisma db push` failed:', msg)
      if (msg.includes('datasource property `url` is no longer supported') || msg.includes('Error code: P1012')) {
        console.error('[dbEnsure] Detected Prisma v7 schema validation error (P1012).')
        console.error('[dbEnsure] Solution: install a Prisma CLI that matches the project (prisma v5), or migrate your schema to Prisma v7 config format.')
        console.error('[dbEnsure] Quick fix: run `npm install` to ensure local `prisma` devDependency is installed, then re-run this script.');
        throw err
      }

      console.log('[dbEnsure] Attempting `prisma migrate deploy` as fallback...')
      try {
        const execOpts = { stdio: 'inherit', env: { ...process.env, CI: 'true' } }
        execSync(`${prismaCmd} migrate deploy`, execOpts)
        execSync(`${prismaCmd} generate`, execOpts)
        console.log('[dbEnsure] Prisma migrate deploy completed.')
      } catch (err2) {
        console.error('[dbEnsure] Prisma migrations failed:', err2 && err2.message ? err2.message : err2)
        throw err2
      }
    }
    console.log('[dbEnsure] Schema creation/migration finished.')
  } finally {
    await prisma.$disconnect()
  }
}

// If run directly, execute
const __filename = fileURLToPath(import.meta.url)
if (process.argv[1] === __filename) {
  ensure().catch(err => {
    console.error('DB ensure failed', err)
    process.exit(1)
  })
}

export default ensure
