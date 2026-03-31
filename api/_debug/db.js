import { Client } from 'pg';

export default async function handler(req, res) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(200).json({ ok: false, reason: 'no DATABASE_URL in env' });

  const client = new Client({ connectionString: dbUrl, statement_timeout: 5000 });
  try {
    await client.connect();
    const r = await client.query('SELECT 1 AS ok');
    await client.end();
    return res.status(200).json({ ok: true, rows: r.rows });
  } catch (err) {
    try {
      await client.end();
    } catch {}
    return res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
