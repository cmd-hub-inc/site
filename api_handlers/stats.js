import prisma from './_lib/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end('Method Not Allowed');
  }

  try {
    const commandsCount = await prisma.command.count();
    const agg = await prisma.command.aggregate({ _sum: { downloads: true } });
    const totalDownloads = agg && agg._sum && agg._sum.downloads ? Number(agg._sum.downloads) : 0;
    const frameworksRes =
      await prisma.$queryRaw`SELECT COUNT(DISTINCT framework) as count FROM "Command"`;
    let frameworksCount = 0;
    try {
      if (Array.isArray(frameworksRes) && frameworksRes.length) {
        const v =
          frameworksRes[0].count || frameworksRes[0].COUNT || frameworksRes[0].count_distinct || 0;
        frameworksCount = Number(v);
      } else if (frameworksRes && typeof frameworksRes === 'object') {
        frameworksCount = Number(frameworksRes.count || 0);
      }
    } catch (e) {
      frameworksCount = 0;
    }

    return res.json({
      commands: commandsCount,
      downloads: totalDownloads,
      frameworks: frameworksCount,
    });
  } catch (err) {
    console.error('stats error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
}
