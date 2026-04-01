/**
 * Client-side meta tag generation utilities
 * Generates OpenGraph and Twitter meta tags for social sharing
 */

/**
 * Generate meta tags for a command
 */
export function getCommandMetaTags(command, baseUrl = window.location.origin) {
  if (!command) return [];

  const commandUrl = `${baseUrl}/commands/${command.id}`;
  const imageUrl = `${baseUrl}/api/og-image?commandId=${encodeURIComponent(command.id)}`;

  return [
    // Basic meta tags
    { name: 'description', content: command.description || `Check out ${command.name}` },
    { name: 'keywords', content: (command.tags || []).join(', ') },

    // OpenGraph tags
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: commandUrl },
    { property: 'og:title', content: command.name },
    { property: 'og:description', content: command.description || `Discord command: ${command.name}` },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:site_name', content: 'Discord Commands' },

    // Twitter Card tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: commandUrl },
    { name: 'twitter:title', content: command.name },
    { name: 'twitter:description', content: command.description || `Discord command: ${command.name}` },
    { name: 'twitter:image', content: imageUrl },

    // Additional meta
    { name: 'author', content: command.author?.username || 'Unknown' },
    { property: 'article:published_time', content: command.createdAt },
    { property: 'article:modified_time', content: command.updatedAt },
  ];
}

/**
 * Generate meta tags for a creator/profile
 */
export function getCreatorMetaTags(creator, commandCount = 0, baseUrl = window.location.origin) {
  if (!creator) return [];

  const profileUrl = `${baseUrl}/creators/${creator.id}`;

  return [
    // Basic meta tags
    { name: 'description', content: `${creator.username} - Created ${commandCount} Discord commands` },

    // OpenGraph tags
    { property: 'og:type', content: 'profile' },
    { property: 'og:url', content: profileUrl },
    { property: 'og:title', content: creator.username },
    { property: 'og:description', content: `Created ${commandCount} Discord commands` },
    { property: 'og:image', content: creator.avatar || `${baseUrl}/default-avatar.png` },
    { property: 'og:profile:username', content: creator.username },

    // Twitter Card
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:url', content: profileUrl },
    { name: 'twitter:title', content: creator.username },
    { name: 'twitter:description', content: `Created ${commandCount} Discord commands` },
    { name: 'twitter:image', content: creator.avatar || `${baseUrl}/default-avatar.png` },
  ];
}

/**
 * Format meta tags as React Helmet compatible array
 */
export function formatHelmetMetaTags(metaTags = []) {
  return metaTags.map((tag) => {
    if (tag.property) {
      return { ...tag, 'og-property': tag.property };
    }
    return tag;
  });
}
