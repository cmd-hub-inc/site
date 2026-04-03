import fs from 'fs';
import path from 'path';
import prisma from '../api_handlers/_lib/prisma.js';

const FALLBACK_SITE_TITLE = 'CmdHub - Discord Command Library';
const FALLBACK_SITE_DESCRIPTION =
  'Discover, share, and browse Discord bot commands, collections, and creators on CmdHub.';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripControlChars(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
}

function truncate(value, max = 180) {
  const clean = stripControlChars(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function getBaseUrl(req) {
  const protoHeader = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const hostHeader =
    String(req.headers['x-forwarded-host'] || req.headers.host || 'cmd-hub.com').split(',')[0].trim();
  return `${protoHeader}://${hostHeader}`;
}

function getRequestPath(req) {
  if (typeof req.query?.path === 'string' && req.query.path.trim()) {
    return req.query.path.trim();
  }
  const raw = String(req.url || '/').split('?')[0] || '/';
  return raw === '/api/share-meta' ? '/' : raw;
}

function buildMetaBlock(meta) {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.ogType || 'website')}" />`,
    `<meta property="og:site_name" content="CmdHub" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />`,
    `<meta name="twitter:url" content="${escapeHtml(meta.url)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
  ];

  if (meta.keywords) {
    tags.push(`<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`);
  }

  return tags.join('\n    ');
}

function injectMetaIntoHtml(html, metaBlock) {
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']keywords["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '');

  return cleaned.replace('</head>', `    ${metaBlock}\n  </head>`);
}

async function getPageMeta(requestPath, baseUrl) {
  const pathname = String(requestPath || '/').split('?')[0] || '/';
  const defaultImage = `${baseUrl}/icons/icon.png`;

  const commandMatch = pathname.match(/^\/command\/([^/]+)$/);
  if (commandMatch) {
    const commandId = decodeURIComponent(commandMatch[1]);
    const command = await prisma.command.findUnique({
      where: { id: commandId },
      include: {
        author: {
          select: { username: true },
        },
      },
    });

    if (command) {
      const title = `${command.name} - CmdHub Command`;
      const description = truncate(command.description || `Discord command by ${command.author?.username || 'Unknown'}`);
      return {
        title,
        description,
        url: `${baseUrl}/command/${encodeURIComponent(command.id)}`,
        image: `${baseUrl}/api/og-image?commandId=${encodeURIComponent(command.id)}`,
        keywords: (command.tags || []).join(', '),
      };
    }
  }

  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (collectionMatch) {
    const collectionId = decodeURIComponent(collectionMatch[1]);
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        creator: {
          select: { username: true },
        },
        _count: {
          select: { collectionCommands: true },
        },
      },
    });

    if (collection) {
      const title = `${collection.name} - CmdHub Collection`;
      const commandCount = collection._count?.collectionCommands || 0;
      const descSource =
        collection.description ||
        `A collection by ${collection.creator?.username || 'Unknown'} with ${commandCount} command${commandCount === 1 ? '' : 's'}.`;

      return {
        title,
        description: truncate(descSource),
        url: `${baseUrl}/collections/${encodeURIComponent(collection.id)}`,
        image: defaultImage,
        keywords: `discord commands, collection, ${collection.name}`,
      };
    }
  }

  return {
    title: FALLBACK_SITE_TITLE,
    description: FALLBACK_SITE_DESCRIPTION,
    url: `${baseUrl}/`,
    image: defaultImage,
    keywords: 'discord commands, bot commands, cmdhub',
  };
}

export default async function handler(req, res) {
  try {
    const indexPath = path.join(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const baseUrl = getBaseUrl(req);
    const requestPath = getRequestPath(req);
    const meta = await getPageMeta(requestPath, baseUrl);
    const metaBlock = buildMetaBlock(meta);
    const html = injectMetaIntoHtml(indexHtml, metaBlock);

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).send(html);
  } catch (error) {
    console.error('[share-meta] Failed to render metadata', error && error.message ? error.message : error);
    return res.status(500).send('Failed to render page metadata');
  }
}