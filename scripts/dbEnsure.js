import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

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

    // Try to push schema first (safe for dev); if migrations exist prefer migrate deploy
    try {
      console.log('[dbEnsure] Running `prisma db push`...')
      execSync('npx prisma db push', { stdio: 'inherit' })
      console.log('[dbEnsure] Running `prisma generate`...')
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('[dbEnsure] Prisma db push completed.')
    } catch (err) {
      console.warn('[dbEnsure] `prisma db push` failed:', err && err.message ? err.message : err)
      console.log('[dbEnsure] Attempting `prisma migrate deploy` as fallback...')
      try {
        execSync('npx prisma migrate deploy', { stdio: 'inherit' })
        execSync('npx prisma generate', { stdio: 'inherit' })
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
