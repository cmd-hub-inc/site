import prisma from '../_lib/prisma.js';
import { requireAdminOrFail } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
  try {
    const auth = await requireAdminOrFail(req, res);
    if (!auth) return;

    const section = req.query?.section || 'overview';
    const filter = req.query?.filter || 'all';

    // Fetch different data based on section
    switch (section) {
      case 'overview': {
        const totalUsers = await prisma.user.count();
        const totalCommands = await prisma.command.count();
        const pendingCommands = await prisma.command.count({ where: { approved: false } });
        const suspendedUsers = await prisma.user.count({ where: { suspended: true } });

        return res.json({
          section: 'overview',
          stats: {
            totalUsers,
            totalCommands,
            pendingCommands,
            suspendedUsers,
          },
        });
      }

      case 'commands': {
        let where = {};
        if (filter === 'pending') {
          where.approved = false;
        } else if (filter === 'approved') {
          where.approved = true;
        }

        const commands = await prisma.command.findMany({
          where,
          include: {
            author: { select: { username: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        return res.json({
          section: 'commands',
          filter,
          commands: commands.map((cmd) => ({
            id: cmd.id,
            name: cmd.name,
            author: cmd.author.username,
            approved: cmd.approved,
            createdAt: cmd.createdAt,
            downloads: cmd.downloads,
            rating: cmd.rating,
          })),
        });
      }

      case 'users': {
        const users = await prisma.user.findMany({
          where:
            filter === 'suspended'
              ? { suspended: true }
              : filter === 'admin'
                ? { isAdmin: true }
                : {},
          select: {
            id: true,
            username: true,
            isAdmin: true,
            suspended: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        return res.json({
          section: 'users',
          filter,
          users,
        });
      }

      default:
        return res
          .status(400)
          .json({ error: 'Invalid section', valid: ['overview', 'commands', 'users'] });
    }
  } catch (error) {
    console.error('[admin/data]', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
