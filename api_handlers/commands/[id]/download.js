import prisma from '../../_lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.setHeader('Allow', 'POST') && res.status(405).end('Method Not Allowed');
  const { id } = req.query;
  try {
    const updated = await prisma.command.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ ok: true, downloads: updated.downloads });
  } catch (err) {
    console.error('download increment error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'failed' });
  }
}
