// Catch-all proxy for /api/proxy/* — forwards requests server-side to avoid mixed-content
// Usage: fetch('/api/proxy/path/to/resource') from the browser

import {
  buildForwardHeaders,
  resolveProxyTarget,
  shouldForwardResponseHeader,
} from './_security.js';

export default async function handler(req, res) {
  const target = resolveProxyTarget(req.headers && req.headers.host);
  if (!target.ok) {
    res.statusCode = target.status;
    res.end(target.message);
    return;
  }

  try {
    // Build target URL by removing the /api/proxy prefix
    const incomingUrl = new URL(req.url || '/', 'http://localhost');
    const proxiedPath = incomingUrl.pathname.replace(/^\/api\/proxy/, '') || '/';
    const targetUrl = `${target.target.origin}${proxiedPath}${incomingUrl.search || ''}`;

    // Only forward a safe header subset. Credentials are never proxied unless explicitly enabled.
    const headers = buildForwardHeaders(req.headers || {});

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
      if (!shouldForwardResponseHeader(key)) return;
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
