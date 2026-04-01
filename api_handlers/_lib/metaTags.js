/**
 * Open Graph and Meta Tags utilities
 */

/**
 * Generate meta tags for a command detail page
 */
export function getCommandMetaTags(command, baseUrl = 'https://cmd-hub.com') {
  const commandUrl = `${baseUrl}/command/${encodeURIComponent(command.id)}`;
  const ogImageUrl = `${baseUrl}/api/og-image?commandId=${encodeURIComponent(command.id)}`;
  
  return {
    title: `${command.name} - Command Hub`,
    description: command.description.substring(0, 160),
    metaTags: [
      // Standard meta tags
      { name: 'description', content: command.description.substring(0, 160) },
      { name: 'keywords', content: command.tags.join(', ') },
      
      // Open Graph tags
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: `${command.name} - Command Hub` },
      { property: 'og:description', content: command.description.substring(0, 160) },
      { property: 'og:url', content: commandUrl },
      { property: 'og:image', content: ogImageUrl },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:site_name', content: 'Command Hub' },
      
      // Twitter Card tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${command.name} - Command Hub` },
      { name: 'twitter:description', content: command.description.substring(0, 160) },
      { name: 'twitter:image', content: ogImageUrl },
      
      // Additional meta tags
      { name: 'author', content: command.author?.username || 'Command Hub' },
      { property: 'article:published_time', content: command.createdAt.toISOString() },
      { property: 'article:modified_time', content: command.updatedAt.toISOString() },
    ],
    canonicalUrl: commandUrl,
  };
}

/**
 * Generate meta tags for a creator/user profile
 */
export function getCreatorMetaTags(creator, commandCount = 0, baseUrl = 'https://cmd-hub.com') {
  const profileUrl = `${baseUrl}/profile/${encodeURIComponent(creator.id)}`;
  
  return {
    title: `${creator.username} - Command Hub Creator`,
    description: `Creator of ${commandCount} commands on Command Hub. Explore all commands by ${creator.username}.`,
    metaTags: [
      { name: 'description', content: `Creator of ${commandCount} commands on Command Hub.` },
      { name: 'keywords', content: `${creator.username}, command hub, developer, creator` },
      
      // Open Graph
      { property: 'og:type', content: 'profile' },
      { property: 'og:title', content: `${creator.username} - Command Hub` },
      { property: 'og:description', content: `Creator of ${commandCount} commands on Command Hub.` },
      { property: 'og:url', content: profileUrl },
      { property: 'og:image', content: creator.avatar || `${baseUrl}/default-avatar.png` },
      { property: 'profile:username', content: creator.username },
      
      // Twitter
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: `${creator.username} - Command Hub` },
      { name: 'twitter:description', content: `Creator of ${commandCount} commands on Command Hub.` },
      { name: 'twitter:image', content: creator.avatar || `${baseUrl}/default-avatar.png` },
    ],
    canonicalUrl: profileUrl,
  };
}

/**
 * Generate social share URLs for different platforms
 */
export function getShareUrls(command, baseUrl = 'https://cmd-hub.com') {
  const commandUrl = `${baseUrl}/command/${encodeURIComponent(command.id)}`;
  const encodedUrl = encodeURIComponent(commandUrl);
  const encodedText = encodeURIComponent(`Check out "${command.name}" - ${command.description.substring(0, 100)}`);
  
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    discord: commandUrl, // Users can paste in Discord
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedText}`,
  };
}

/**
 * Extract meta tags for helmet
 */
export function formatHelmetMetaTags(metaTags) {
  return metaTags.reduce((acc, tag) => {
    if (tag.property) {
      acc[tag.property] = tag.content;
    } else if (tag.name) {
      acc[tag.name] = tag.content;
    }
    return acc;
  }, {});
}
