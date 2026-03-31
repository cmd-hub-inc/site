import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_change_me';

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
