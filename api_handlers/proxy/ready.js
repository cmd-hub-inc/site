import { resolveProxyTarget } from './_security.js';

export default async function handler(req, res) {
  const target = resolveProxyTarget(req.headers && req.headers.host);
  if (!target.ok) {
    res.status(target.status).end(target.message);
    return;
  }

  const targetUrl = `${target.target.origin}/api/ready`;
  try {
    const backendRes = await fetch(targetUrl, { headers: { accept: 'application/json' } });
    const body = await backendRes.text();
    res
      .status(backendRes.status)
      .setHeader('content-type', backendRes.headers.get('content-type') || 'application/json');
    return res.end(body);
  } catch (err) {
    console.error('proxy ready error', err && err.message ? err.message : err);
    res.status(502).end('Bad Gateway');
  }
}
