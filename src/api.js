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
