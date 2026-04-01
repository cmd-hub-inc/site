import { createServer } from 'http';
import { parse } from 'url';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const handlersDir = path.join(process.cwd(), 'api_handlers');

function loadHandler(routePath) {
  const file = path.join(handlersDir, routePath + '.js');
  if (fs.existsSync(file)) {
    // dynamic import requires URL-ish path
    return import(file);
  }
  return null;
}

function matchHandler(reqPath) {
  // Try exact match then index. Normalize and strip leading /api prefix.
  let p = String(reqPath || '').replace(/^\//, '');
  if (p.startsWith('api/')) p = p.slice(4);
  if (!p) return 'index';
  const exact = p;
  if (fs.existsSync(path.join(handlersDir, exact + '.js'))) return exact;
  if (fs.existsSync(path.join(handlersDir, exact, 'index.js'))) return path.join(exact, 'index');

  // Try dynamic segment matching by replacing segments with [id]
  const segs = p.split('/').filter(Boolean);
  const n = segs.length;
  // Generate combinations of replacements (limit to reasonable size)
  const max = Math.min(1 << n, 1 << 10);
  for (let mask = 0; mask < max; mask++) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      parts.push(mask & (1 << i) ? '[id]' : segs[i]);
    }
    const cand = parts.join('/');
    if (fs.existsSync(path.join(handlersDir, cand + '.js'))) return cand;
    if (fs.existsSync(path.join(handlersDir, cand, 'index.js'))) return path.join(cand, 'index');
  }

  // Fallback: global catch-all handler
  if (fs.existsSync(path.join(handlersDir, '[...path].js'))) return '[...path]';
  return null;
}

export default async function handler(req, res) {
  // Add Express-style methods to raw Node.js response object
  if (!res.status) {
    res.status = function (code) {
      this.statusCode = code;
      return this;
    };
  }
  if (!res.json) {
    res.json = function (data) {
      this.setHeader('content-type', 'application/json');
      this.end(JSON.stringify(data));
      return this;
    };
  }

  // Aggressively disable caching and ETags to prevent 304 responses
  res.setHeader('cache-control', 'no-store, no-cache, no-transform, must-revalidate, private');
  res.setHeader('pragma', 'no-cache');
  res.setHeader('expires', '0');
  res.setHeader('etag', ''); // Clear any ETag
  res.setHeader('last-modified', ''); // Clear Last-Modified
  res.removeHeader('etag');
  res.removeHeader('last-modified');

  const { pathname } = parse(req.url || '/');
  const matched = matchHandler(pathname || '/');
  if (!matched) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }

  const mod = await import(path.join(handlersDir, matched + '.js'));
  if (!mod || !mod.default) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'handler_missing' }));
    return;
  }

  // Extract path parameters from URL based on matched handler pattern
  // e.g., if matched='commands/[id]' and pathname='/api/commands/my-cmd', extract id='my-cmd'
  req.query = req.query || {};
  const pathParts = (pathname || '').replace(/^\/api\/|\/$/, '').split('/').filter(Boolean);
  const handlerParts = matched.split('/').filter(Boolean);
  for (let i = 0; i < handlerParts.length; i++) {
    if (handlerParts[i].startsWith('[') && handlerParts[i].endsWith(']')) {
      const paramName = handlerParts[i].slice(1, -1).replace('...', '');
      if (paramName === 'path') {
        // Catch-all parameter: collect remaining path segments
        req.query[paramName] = pathParts.slice(i).join('/');
      } else {
        // Single segment parameter
        req.query[paramName] = pathParts[i];
      }
    }
  }

  // Express-like handler: (req, res)
  try {
    await mod.default(req, res);
  } catch (err) {
    console.error('handler error', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'handler_error' }));
  }
}
