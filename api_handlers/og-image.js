/**
 * OG Image generation endpoint
 * Generates OpenGraph images for Discord commands
 */

import prisma from './_lib/prisma.js';
import { logError, logInfo } from './_lib/logger.js';
import { deleteCache } from './_lib/cache.js';

/**
 * Generate a simple OG image for a command
 * Returns a PNG image with command details
 */
export default async function ogImage(req, res) {
  try {
    const { commandId } = req.query;

    if (!commandId) {
      return res.status(400).json({ error: 'Command ID is required' });
    }

    // Fetch command
    const command = await prisma.command.findUnique({
      where: { id: String(commandId) },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        framework: true,
      },
    });

    if (!command) {
      return res.status(404).json({ error: 'Command not found' });
    }

    // Generate a square avatar-sized OG image for Discord embeds
    // 512x512 prevents stretching and displays as an avatar in Discord
    const svg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#5865F2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2E5CB8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" fill="url(#grad)"/>
        
        <!-- Command Name (centered, larger text for square format) -->
        <text x="256" y="160" font-size="48" font-weight="bold" fill="white" font-family="Arial, sans-serif" text-anchor="middle">
          ${escapeXml(command.name.substring(0, 20))}
        </text>
        
        <!-- Description (centered) -->
        <text x="256" y="220" font-size="18" fill="#E0E1E6" font-family="Arial, sans-serif" text-anchor="middle">
          ${escapeXml(command.description.substring(0, 40))}
        </text>
        
        <!-- Type Badge -->
        <rect x="156" y="270" width="100" height="40" rx="6" fill="#ED4245" opacity="0.8"/>
        <text x="206" y="300" font-size="16" fill="white" font-family="Arial, sans-serif" text-anchor="middle">
          ${escapeXml(command.type || 'Command')}
        </text>
        
        <!-- Framework Badge -->
        ${command.framework ? `
          <rect x="306" y="270" width="100" height="40" rx="6" fill="#3BA55D" opacity="0.8"/>
          <text x="356" y="300" font-size="16" fill="white" font-family="Arial, sans-serif" text-anchor="middle">
            ${escapeXml(command.framework)}
          </text>
        ` : ''}
        
        <!-- Footer -->
        <text x="256" y="480" font-size="14" fill="#80848E" font-family="Arial, sans-serif" text-anchor="middle">
          CmdHub
        </text>
      </svg>
    `;

    // Set headers for image response
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="og-${command.id}.svg"`);

    return res.send(svg);
  } catch (error) {
    logError('Failed to generate OG image', error);
    // Return a simple placeholder on error (square format)
    return res.status(500).send(
      `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="#5865F2"/>
        <text x="256" y="256" text-anchor="middle" font-size="40" fill="white" font-family="Arial, sans-serif" dy=".3em">
          CmdHub
        </text>
      </svg>`,
    );
  }
}

/**
 * Escape special characters for XML/SVG
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
