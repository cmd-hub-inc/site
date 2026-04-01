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

    // For now, return a simple placeholder OG image
    // In production, you would generate an actual image using canvas or similar
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#5865F2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2E5CB8;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)"/>
        
        <!-- Command Name -->
        <text x="60" y="200" font-size="72" font-weight="bold" fill="white" font-family="Arial, sans-serif">
          ${escapeXml(command.name)}
        </text>
        
        <!-- Description -->
        <text x="60" y="280" font-size="32" fill="#E0E1E6" font-family="Arial, sans-serif">
          ${escapeXml(command.description.substring(0, 60))}${command.description.length > 60 ? '...' : ''}
        </text>
        
        <!-- Type Badge -->
        <rect x="60" y="350" width="150" height="50" rx="8" fill="#ED4245" opacity="0.8"/>
        <text x="85" y="385" font-size="20" fill="white" font-family="Arial, sans-serif">
          ${escapeXml(command.type || 'Command')}
        </text>
        
        <!-- Framework Badge -->
        ${command.framework ? `
          <rect x="240" y="350" width="180" height="50" rx="8" fill="#3BA55D" opacity="0.8"/>
          <text x="260" y="385" font-size="20" fill="white" font-family="Arial, sans-serif">
            ${escapeXml(command.framework)}
          </text>
        ` : ''}
        
        <!-- Footer -->
        <text x="60" y="600" font-size="18" fill="#80848E" font-family="Arial, sans-serif">
          Discord Commands • discord.gg/commands
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
    // Return a simple placeholder on error
    return res.status(500).send(
      `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#5865F2"/>
        <text x="600" y="315" text-anchor="middle" font-size="48" fill="white" font-family="Arial, sans-serif">
          Discord Commands
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
