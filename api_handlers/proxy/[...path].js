// Catch-all proxy for /api/proxy/* — forwards requests server-side to avoid mixed-content
// Usage: fetch('/api/proxy/path/to/resource') from the browser

export default async function handler(req, res) {
  const targetBase = process.env.PROXY_TARGET || 'http://cmd-hub.devvyyxyz';

  // Prevent proxy loops: if PROXY_TARGET points back to this deployment, abort early
  try {
    const t = new URL(targetBase);
    const reqHost = req.headers && req.headers.host;
    if (reqHost && (t.host === reqHost || t.hostname === reqHost)) {
      res.statusCode = 502;
      res.end(
        'Bad Gateway: PROXY_TARGET is misconfigured (points to this deployment), causing a proxy loop. Set PROXY_TARGET to your external backend.'
      );
      return;
    }
  } catch (e) {
    // ignore URL parse errors; fetch will surface helpful error
  }

  try {
    // Build target URL by removing the /api/proxy prefix
    const incomingUrl = new URL(req.url, `http://${req.headers.host}`);
    const proxiedPath = incomingUrl.pathname.replace(/^\/api\/proxy/, '') || '/';
    const targetUrl = `${targetBase}${proxiedPath}${incomingUrl.search || ''}`;

    // Clone headers and remove hop-by-hop headers
    const headers = { ...(req.headers || {}) };
    delete headers.host;
    delete headers['content-length'];
    delete headers.connection;

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
      redirect: 'manual',
    });

    // Forward status and headers
    res.statusCode = backendRes.status;
    backendRes.headers.forEach((val, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, val);
    });

    const data = await backendRes.arrayBuffer();
    res.end(Buffer.from(data));
  } catch (err) {
    console.error('proxy error', err && err.message ? err.message : err);
    res.statusCode = 502;
    res.end('Bad Gateway');
  }
}
