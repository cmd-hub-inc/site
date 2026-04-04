import { createServer } from 'http';
import { parse } from 'url';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { rateLimiters } from '../api_handlers/_lib/rateLimiter.js';
import { installServerErrorJsonGuard } from '../api_handlers/_lib/errorResponses.js';

const handlersDir = path.join(process.cwd(), 'api_handlers');
const handlerExistsCache = new Map();
const routeMatchCache = new Map();

function runMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const done = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    try {
      middleware(req, res, (err) => {
        if (err) return reject(err);
        done(true);
      });
      if (res.writableEnded) {
        done(false);
      }
    } catch (err) {
      reject(err);
    }
  });
}

function pickRateLimiter(routePath) {
  if (!routePath) return rateLimiters.api;
  if (routePath.startsWith('auth/')) return rateLimiters.auth;
  if (routePath.startsWith('commands/') || routePath === 'commands') return rateLimiters.read;
  if (routePath.includes('/rate')) return rateLimiters.rating;
  return rateLimiters.api;
}

function loadHandler(routePath) {
  const file = path.join(handlersDir, routePath + '.js');
  if (fs.existsSync(file)) {
    // dynamic import requires URL-ish path
    return import(file);
  }
  return null;
}

function handlerPathExists(routePath) {
  if (handlerExistsCache.has(routePath)) {
    return handlerExistsCache.get(routePath);
  }

  const exists =
    fs.existsSync(path.join(handlersDir, routePath + '.js')) ||
    fs.existsSync(path.join(handlersDir, routePath, 'index.js'));
  handlerExistsCache.set(routePath, exists);
  return exists;
}

function matchHandler(reqPath) {
  // Try exact match then index. Normalize and strip leading /api prefix.
  let p = String(reqPath || '').replace(/^\//, '');
  if (p.startsWith('api/')) p = p.slice(4);

  if (routeMatchCache.has(p)) {
    return routeMatchCache.get(p);
  }

  if (!p) return 'index';
  const exact = p;
  if (handlerPathExists(exact)) {
    const matched = fs.existsSync(path.join(handlersDir, exact + '.js'))
      ? exact
      : path.join(exact, 'index');
    routeMatchCache.set(p, matched);
    return matched;
  }

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
    if (handlerPathExists(cand)) {
      const matched = fs.existsSync(path.join(handlersDir, cand + '.js'))
        ? cand
        : path.join(cand, 'index');
      routeMatchCache.set(p, matched);
      return matched;
    }
  }

  // Fallback: global catch-all handler
  if (handlerPathExists('[...path]')) {
    routeMatchCache.set(p, '[...path]');
    return '[...path]';
  }
  routeMatchCache.set(p, null);
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
  installServerErrorJsonGuard(res);

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

  // Apply rate limiting in serverless mode to mirror the Express server protections.
  req.ip =
    req.ip ||
    (req.headers['x-forwarded-for'] && String(req.headers['x-forwarded-for']).split(',')[0].trim()) ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '';
  const limiter = pickRateLimiter(matched);
  const canProceed = await runMiddleware(limiter, req, res);
  if (!canProceed || res.writableEnded) {
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
