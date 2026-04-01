const TARGET = process.env.PROXY_TARGET || 'http://cmd-hub.devvyyxyz';

export default async function handler(req, res) {
  // Guard against PROXY_TARGET pointing to this deployment (infinite loop)
  try {
    const t = new URL(TARGET);
    const reqHost = req.headers && req.headers.host;
    if (reqHost && (t.host === reqHost || t.hostname === reqHost)) {
      res
        .status(502)
        .end(
          'Bad Gateway: PROXY_TARGET points to this deployment — configure an external backend.',
        );
      return;
    }
  } catch (e) {}

  const targetUrl = TARGET + '/';
  try {
    const backendRes = await fetch(targetUrl, { headers: { accept: 'application/json' } });
    const body = await backendRes.text();
    res
      .status(backendRes.status)
      .setHeader('content-type', backendRes.headers.get('content-type') || 'text/plain');
    return res.end(body);
  } catch (err) {
    console.error('proxy index error', err && err.message ? err.message : err);
    res.status(502).end('Bad Gateway');
  }
}
