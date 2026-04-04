import { randomUUID } from 'crypto';
import { signPending } from '../_lib/jwt.js';

function resolveTrustedBaseUrl() {
  const configured = process.env.BASE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const port = process.env.PORT || 4000;
  return `http://localhost:${port}`;
}

export default function handler(req, res) {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const BASE_URL = resolveTrustedBaseUrl();
  if (!BASE_URL) {
    return res.status(500).json({ error: 'Server error' });
  }

  const state = signPending({ type: 'oauth_state', nonce: randomUUID() }, { expiresIn: '10m' });
  const redirectUri = encodeURIComponent(`${BASE_URL}/api/auth/discord/callback`);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${encodeURIComponent(state)}`;
  if (!DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET)
    console.warn('[auth] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in env');
  return res.writeHead(302, { Location: url }).end();
}
