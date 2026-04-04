import { requireAdminOrFail } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
  try {
    const auth = await requireAdminOrFail(req, res);
    if (!auth) return;

    // Return admin info
    return res.json({
      isAdmin: true,
      role: auth.user.adminRole || 'SUPER_ADMIN',
      userId: auth.user.id,
    });
  } catch (error) {
    console.error('[admin/info]', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
