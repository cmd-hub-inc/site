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

export function getNewsReadToken(newsItem) {
  const id = newsItem && newsItem.id ? String(newsItem.id) : '';
  const publishedAt = newsItem && newsItem.publishedAt ? String(newsItem.publishedAt) : '';
  return `${id}:${publishedAt}`;
}

export function isNewsRead(newsItem, user) {
  return getReadNewsIds(user).has(getNewsReadToken(newsItem));
}

export function markNewsAsRead(newsItem, user) {
  if (typeof window === 'undefined') return;
  const ids = getReadNewsIds(user);
  ids.add(getNewsReadToken(newsItem));
  window.localStorage.setItem(getStorageKey(user), JSON.stringify(Array.from(ids)));
}

export function markAllNewsAsRead(newsItems, user) {
  if (typeof window === 'undefined') return;
  const ids = (newsItems || []).map((item) => getNewsReadToken(item));
  window.localStorage.setItem(getStorageKey(user), JSON.stringify(ids));
}

export function getUnreadNewsCount(newsItems, user) {
  const readIds = getReadNewsIds(user);
  return (newsItems || []).filter((item) => !readIds.has(getNewsReadToken(item))).length;
}
