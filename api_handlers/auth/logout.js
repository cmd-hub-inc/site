import { clearSessionCookie } from '../_lib/utils.js';

export default function handler(req, res) {
  if (req.method !== 'POST')
    return res.setHeader('Allow', 'POST') && res.status(405).end('Method Not Allowed');
  clearSessionCookie(res);
  return res.json({ ok: true });
}
