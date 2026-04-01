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
