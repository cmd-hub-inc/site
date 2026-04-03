export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

export async function fetchCommands() {
  const res = await fetch(`${API_BASE}/api/commands`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function fetchCommand(id) {
  const res = await fetch(`${API_BASE}/api/commands/${id}`);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

async function parseJsonSafe(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function throwApiError(res, fallbackMessage) {
  const payload = await parseJsonSafe(res);
  const message = payload && payload.error ? payload.error : fallbackMessage;
  throw new Error(message);
}

/**
 * Generate share URLs for all platforms
 */
export function getShareUrls(command, baseUrl = window.location.origin) {
  if (!command) return {};

  const commandUrl = `${baseUrl}/commands/${command.id}`;
  const encodedUrl = encodeURIComponent(commandUrl);
  const title = encodeURIComponent(command.name || 'Check out this command');
  const description = encodeURIComponent(command.description || 'An awesome command');

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${title}&via=DiscordCommands`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    discord: commandUrl,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
  };
}

// ========== Collections API ==========

export async function fetchCollections(userId = null, limit = 20, page = 1) {
  const params = new URLSearchParams({ limit, page });
  if (userId) params.append('userId', userId);
  const res = await fetch(`${API_BASE}/api/collections?${params}`);
  if (!res.ok) await throwApiError(res, 'Failed to fetch collections');
  return parseJsonSafe(res);
}

export async function fetchCollection(id) {
  const res = await fetch(`${API_BASE}/api/collections/${id}`);
  if (!res.ok) await throwApiError(res, 'Failed to fetch collection');
  return parseJsonSafe(res);
}

export async function createCollection(name, description = '') {
  const res = await fetch(`${API_BASE}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) await throwApiError(res, 'Failed to create collection');
  return parseJsonSafe(res);
}

export async function updateCollection(id, name, description = '') {
  const res = await fetch(`${API_BASE}/api/collections/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) await throwApiError(res, 'Failed to update collection');
  return parseJsonSafe(res);
}

export async function deleteCollection(id) {
  const res = await fetch(`${API_BASE}/api/collections/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) await throwApiError(res, 'Failed to delete collection');
  return parseJsonSafe(res);
}

export async function addCommandToCollection(collectionId, commandId) {
  const res = await fetch(`${API_BASE}/api/collections/${collectionId}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ commandId }),
  });
  if (!res.ok) await throwApiError(res, 'Failed to add command to collection');
  return parseJsonSafe(res);
}

export async function removeCommandFromCollection(collectionId, commandId) {
  const res = await fetch(`${API_BASE}/api/collections/${collectionId}/commands/${commandId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) await throwApiError(res, 'Failed to remove command from collection');
  return parseJsonSafe(res);
}

