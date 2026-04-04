import { isIP } from 'net';

const PRIVATE_V4_RANGES = [
  ['10.', 8],
  ['127.', 8],
  ['169.254.', 16],
  ['172.16.', 12],
  ['192.168.', 16],
];

function isPrivateIPv4(hostname) {
  return PRIVATE_V4_RANGES.some(([prefix]) => hostname.startsWith(prefix));
}

function isPrivateIPv6(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost') return true;

  const ipType = isIP(host);
  if (ipType === 4) return isPrivateIPv4(host);
  if (ipType === 6) return isPrivateIPv6(host);

  return host.endsWith('.local');
}

export function resolveProxyTarget(reqHost) {
  const rawTarget = process.env.PROXY_TARGET || 'http://cmd-hub.devvyyxyz';
  const isProd = process.env.NODE_ENV === 'production';
  const allowPrivate = process.env.PROXY_ALLOW_PRIVATE_TARGET === 'true';

  let target;
  try {
    target = new URL(rawTarget);
  } catch {
    return { ok: false, status: 500, message: 'Bad Gateway: PROXY_TARGET is not a valid URL.' };
  }

  if (isProd && target.protocol !== 'https:') {
    return { ok: false, status: 500, message: 'Bad Gateway: PROXY_TARGET must use HTTPS in production.' };
  }

  const normalizedReqHost = String(reqHost || '').toLowerCase();
  if (normalizedReqHost && (target.host.toLowerCase() === normalizedReqHost || target.hostname.toLowerCase() === normalizedReqHost)) {
    return {
      ok: false,
      status: 502,
      message: 'Bad Gateway: PROXY_TARGET points to this deployment, causing a proxy loop.',
    };
  }

  if (!allowPrivate && isPrivateHost(target.hostname)) {
    return {
      ok: false,
      status: 502,
      message: 'Bad Gateway: PROXY_TARGET resolves to a private/local address.',
    };
  }

  return { ok: true, target };
}

export function buildForwardHeaders(reqHeaders = {}) {
  const allowed = new Set([
    'accept',
    'accept-language',
    'content-type',
    'if-none-match',
    'if-modified-since',
    'range',
    'user-agent',
    'x-requested-with',
  ]);

  const headers = {};
  for (const [key, value] of Object.entries(reqHeaders)) {
    const lower = key.toLowerCase();
    if (allowed.has(lower)) {
      headers[lower] = value;
    }
  }

  if (process.env.PROXY_FORWARD_AUTH === 'true' && reqHeaders.authorization) {
    headers.authorization = reqHeaders.authorization;
  }

  return headers;
}

export function shouldForwardResponseHeader(name) {
  const blocked = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'set-cookie',
  ]);
  return !blocked.has(String(name || '').toLowerCase());
}
