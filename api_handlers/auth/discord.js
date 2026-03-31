export default function handler(req, res) {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const PORT = process.env.PORT || 4000;
  const BASE_URL = process.env.BASE_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const redirectUri = encodeURIComponent(`${BASE_URL}/api/auth/discord/callback`);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify`;
  if (!DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET)
    console.warn('[auth] Missing DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET in env');
  return res.writeHead(302, { Location: url }).end();
}
