import { signPending, verifyToken } from '../../_lib/jwt.js';

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

export default async function handler(req, res) {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing code');
    if (!state) return res.status(400).send('Missing state');

    const parsedState = verifyToken(String(state));
    if (!parsedState || parsedState.type !== 'oauth_state' || !parsedState.nonce) {
      return res.status(400).send('Invalid state');
    }

    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const BASE_URL = resolveTrustedBaseUrl();
    if (!BASE_URL) {
      return res.status(500).send('Server misconfigured: invalid or missing BASE_URL');
    }

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: `${BASE_URL}/api/auth/discord/callback`,
      }),
    });

    if (!tokenResp.ok) {
      const txt = await tokenResp.text();
      console.error('[auth] Token exchange failed', txt);
      return res.status(500).send('Token exchange failed');
    }

    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userResp.ok) {
      const txt = await userResp.text();
      console.error('[auth] Fetch user failed', txt);
      return res.status(500).send('Failed to fetch user');
    }

    const discordUser = await userResp.json();
    const discordId = discordUser.id;
    const username =
      discordUser.discriminator && discordUser.discriminator !== '0'
        ? `${discordUser.username}#${discordUser.discriminator}`
        : discordUser.username;
    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    const token = signPending({ discordId, username, avatar, createdAt: Date.now() });
    const CLIENT_URL = process.env.CLIENT_URL || 'https://localhost:5173';
    const redirectTo = `${CLIENT_URL}?pendingToken=${encodeURIComponent(token)}`;
    return res.writeHead(302, { Location: redirectTo }).end();
  } catch (err) {
    console.error(err);
    return res.status(500).send('OAuth error');
  }
}
