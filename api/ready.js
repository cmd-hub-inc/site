import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  try {
    const needed = ['User', 'Command'];
    const rows = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${needed})
    `;
    const existing = rows.map((r) => (r.table_name || r.tableName || '').toString());
    const missing = needed.filter((n) => !existing.includes(n));
    if (missing.length === 0) return res.status(200).json({ ok: true });
    return res.status(503).json({ ok: false, missing });
  } catch (e) {
    console.warn('ready check failed', e && e.message ? e.message : e);
    return res.status(503).json({ ok: false, error: 'db_unreachable' });
  }
}
