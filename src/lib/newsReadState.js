const STORAGE_PREFIX = 'cmdhub:news:read:';

function getStorageKey(user) {
  const userId = user && user.id ? String(user.id) : 'guest';
  return `${STORAGE_PREFIX}${userId}`;
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getReadNewsIds(user) {
  if (typeof window === 'undefined') return new Set();
  const raw = window.localStorage.getItem(getStorageKey(user));
  return new Set(safeParseArray(raw));
}

export function isNewsRead(newsId, user) {
  return getReadNewsIds(user).has(String(newsId));
}

export function markNewsAsRead(newsId, user) {
  if (typeof window === 'undefined') return;
  const ids = getReadNewsIds(user);
  ids.add(String(newsId));
  window.localStorage.setItem(getStorageKey(user), JSON.stringify(Array.from(ids)));
}

export function markAllNewsAsRead(newsItems, user) {
  if (typeof window === 'undefined') return;
  const ids = (newsItems || []).map((item) => String(item.id));
  window.localStorage.setItem(getStorageKey(user), JSON.stringify(ids));
}

export function getUnreadNewsCount(newsItems, user) {
  const readIds = getReadNewsIds(user);
  return (newsItems || []).filter((item) => !readIds.has(String(item.id))).length;
}
