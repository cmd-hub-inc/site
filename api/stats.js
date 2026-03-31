// Simple proxy for /api/stats to avoid mixed-content (HTTP) from browser
// Vercel will serve this over HTTPS and fetch the HTTP backend server-side.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    return res.end('Method Not Allowed');
  }

  const targetBase = process.env.PROXY_TARGET || 'http://cmd-hub.devvyyxyz';

  // Guard against PROXY_TARGET pointing to this deployment
  try {
    const t = new URL(targetBase);
    const reqHost = req.headers && req.headers.host;
    if (reqHost && (t.host === reqHost || t.hostname === reqHost)) {
      res.statusCode = 502;
      return res.end('Bad Gateway: PROXY_TARGET misconfigured (points to this deployment) — configure external backend.');
    }
  } catch (e) {}

  const target = `${targetBase}/api/stats`;
  try {
    const backendRes = await fetch(target, { headers: { accept: 'application/json' } });
    const body = await backendRes.text();
    res.statusCode = backendRes.status;
    const ct = backendRes.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    return res.end(body);
  } catch (err) {
    console.error('proxy /api/stats error', err && err.message ? err.message : err);
    res.statusCode = 502;
    return res.end('Bad Gateway');
  }
}
