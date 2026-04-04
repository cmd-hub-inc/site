import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const rawSessionSecret = process.env.SESSION_SECRET;

if (isProd && !rawSessionSecret) {
  throw new Error('SESSION_SECRET is required in production');
}

if (!isProd && !rawSessionSecret) {
  console.warn('[auth] SESSION_SECRET is not set; using insecure development fallback secret');
}

const SESSION_SECRET = rawSessionSecret || 'dev_insecure_local_secret_change_me';

export function signPending(payload, opts = {}) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: opts.expiresIn || '10m' });
}

export function signSession(payload, opts = {}) {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: opts.expiresIn || '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch (e) {
    return null;
  }
}
