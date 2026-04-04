export function normalizeServerErrorPayload(statusCode, payload) {
  if (statusCode !== 500) return payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  if (!Object.prototype.hasOwnProperty.call(payload, 'error')) return payload;

  return {
    ...payload,
    error: 'Server error',
  };
}

export function installServerErrorJsonGuard(res) {
  if (!res || typeof res.json !== 'function') return;
  if (res.__serverErrorJsonGuardInstalled) return;

  const originalJson = res.json.bind(res);
  res.json = (payload) => originalJson(normalizeServerErrorPayload(res.statusCode, payload));
  res.__serverErrorJsonGuardInstalled = true;
}