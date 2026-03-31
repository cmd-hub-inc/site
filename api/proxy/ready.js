const TARGET = process.env.PROXY_TARGET || 'http://cmd-hub.devvyy.xyz';

export default async function handler(req, res) {
  const targetUrl = TARGET + '/api/ready';
  try {
    const backendRes = await fetch(targetUrl, { headers: { accept: 'application/json' } });
    const body = await backendRes.text();
    res.status(backendRes.status).setHeader('content-type', backendRes.headers.get('content-type') || 'application/json');
    return res.end(body);
  } catch (err) {
    console.error('proxy ready error', err && err.message ? err.message : err);
    res.status(502).end('Bad Gateway');
  }
}
