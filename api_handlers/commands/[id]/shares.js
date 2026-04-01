/**
 * Share tracking endpoint for specific commands
 * GET /api/commands/:id/shares - Get share statistics
 * POST /api/commands/:id/shares - Track a share event
 */

import handler from '../../shares.js';

export default async function shares(req, res) {
  if (req.method === 'GET') {
    return handler.getCommandShares(req, res);
  }

  if (req.method === 'POST') {
    // Add commandId from route param
    req.body = req.body || {};
    req.body.commandId = req.query.id;
    return handler.trackShare(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
