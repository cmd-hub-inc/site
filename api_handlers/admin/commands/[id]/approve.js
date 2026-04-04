import prisma from '../../../_lib/prisma.js';
import { requireAdminOrFail } from '../../../_lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await requireAdminOrFail(req, res);
    if (!auth) return;

    const commandId = req.query?.id;
    if (!commandId) {
      return res.status(400).json({ error: 'Command ID required' });
    }

    // Update command approval status
    const updated = await prisma.command.update({
      where: { id: commandId },
      data: {
        approved: true,
        approvedBy: auth.user.id,
      },
    });

    return res.json({
      success: true,
      command: {
        id: updated.id,
        name: updated.name,
        approved: updated.approved,
      },
    });
  } catch (error) {
    console.error('[admin/commands/approve]', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Command not found' });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}
