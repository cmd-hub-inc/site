import prisma from '../_lib/prisma.js';
import { requireAuthOrFail, getSessionFromReq } from '../_lib/utils.js';

export default async function handler(req, res) {
  const session = getSessionFromReq(req);
  if (!session || !session.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { period = '30days' } = req.query;
    
    // Determine date range
    let daysBack = 30;
    if (period === '7days') daysBack = 7;
    else if (period === 'alltime') daysBack = 36500; // ~100 years
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get all commands for this creator
    const commands = await prisma.command.findMany({
      where: { authorId: session.id },
      include: { 
        ratings: { where: { createdAt: { gte: cutoffDate } } },
        favorites: { where: { createdAt: { gte: cutoffDate } } },
      }
    });

    if (!commands.length) {
      return res.json({
        stats: {
          totalViews: 0,
          totalDownloads: 0,
          totalFavorites: 0,
          totalShares: 0,
          totalRatings: 0,
          uniqueUsers: 0,
          averageRating: 0,
          peakHour: null,
          peakDayOfWeek: null,
        },
        commands: [],
        topPerformers: [],
      });
    }

    const commandIds = commands.map(c => c.id);

    // Get shares for this period
    const shares = await prisma.share.findMany({
      where: {
        commandId: { in: commandIds },
        createdAt: { gte: cutoffDate }
      }
    });

    // Try to get events, but gracefully handle if table doesn't exist yet
    let events = [];
    try {
      events = await prisma.event.findMany({
        where: {
          commandId: { in: commandIds },
          createdAt: { gte: cutoffDate }
        }
      });
    } catch (e) {
      // Event table may not exist yet - use fallback counts from command totals
      console.log('Event table not available, using command totals');
    }

    // Calculate aggregate stats
    const eventsByType = {
      view: events.filter(e => e.type === 'view').length,
      download: events.filter(e => e.type === 'download').length,
    };

    const totalFavorites = commands.reduce((sum, cmd) => sum + cmd.favorites.length, 0);
    const totalShares = shares.length;
    const totalRatings = commands.reduce((sum, cmd) => sum + cmd.ratings.length, 0);

    // Calculate unique users
    const uniqueUserIds = new Set();
    commands.forEach(cmd => {
      cmd.favorites.forEach(fav => uniqueUserIds.add(fav.userId));
      cmd.ratings.forEach(rating => uniqueUserIds.add(rating.userId));
    });
    shares.forEach(share => {
      if (share.userId) uniqueUserIds.add(share.userId);
    });
    events.forEach(event => {
      if (event.userId) uniqueUserIds.add(event.userId);
    });

    // Calculate average rating
    const allRatings = commands.flatMap(cmd => cmd.ratings);
    const averageRating = allRatings.length > 0
      ? (allRatings.reduce((sum, r) => sum + r.value, 0) / allRatings.length)
      : 0;

    // Calculate peak hour and peak day of week
    const peakHour = calculatePeakHour(commands, shares, events);
    const peakDayOfWeek = calculatePeakDayOfWeek(commands, shares, events);

    // Build per-command analytics
    const commandAnalytics = commands.map(cmd => {
      const cmdEvents = events.filter(e => e.commandId === cmd.id);
      const cmdShares = shares.filter(s => s.commandId === cmd.id);
      const cmdFavs = cmd.favorites;
      const cmdRatings = cmd.ratings;

      const views = cmdEvents.filter(e => e.type === 'view').length;
      const downloads = cmdEvents.filter(e => e.type === 'download').length;
      const cmdAvgRating = cmdRatings.length > 0
        ? cmdRatings.reduce((sum, r) => sum + r.value, 0) / cmdRatings.length
        : 0;

      return {
        id: cmd.id,
        name: cmd.name,
        description: cmd.description,
        views: views || cmd.views, // Fall back to total views if events not tracked
        downloads: downloads || cmd.downloads, // Fall back to total downloads if events not tracked
        favorites: cmdFavs.length,
        shares: cmdShares.length,
        ratings: cmdRatings.length,
        averageRating: Math.round(cmdAvgRating * 100) / 100,
        engagement: views + downloads + cmdFavs.length + cmdShares.length + cmdRatings.length,
      };
    });

    // Sort for top performers
    const topPerformers = [...commandAnalytics]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    return res.json({
      stats: {
        totalViews: eventsByType.view || commands.reduce((sum, cmd) => sum + cmd.views, 0),
        totalDownloads: eventsByType.download || commands.reduce((sum, cmd) => sum + cmd.downloads, 0),
        totalFavorites,
        totalShares,
        totalRatings,
        uniqueUsers: uniqueUserIds.size,
        averageRating: Math.round(averageRating * 100) / 100,
        peakHour,
        peakDayOfWeek,
      },
      commands: commandAnalytics,
      topPerformers,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

function calculatePeakHour(commands, shares, events) {
  const hours = {};
  
  // Count events by hour
  events.forEach(event => {
    const hour = new Date(event.createdAt).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });

  shares.forEach(share => {
    const hour = new Date(share.createdAt).getHours();
    hours[hour] = (hours[hour] || 0) + 1;
  });

  commands.forEach(cmd => {
    cmd.favorites.forEach(fav => {
      const hour = new Date(fav.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
    cmd.ratings.forEach(rating => {
      const hour = new Date(rating.createdAt).getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });
  });

  if (Object.keys(hours).length === 0) return null;

  const peakHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0][0];
  return `${peakHour}:00 - ${(Number(peakHour) + 1) % 24}:00`;
}

function calculatePeakDayOfWeek(commands, shares, events) {
  const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  events.forEach(event => {
    const dayOfWeek = new Date(event.createdAt).getDay();
    const dayName = dayNames[dayOfWeek];
    days[dayName]++;
  });

  shares.forEach(share => {
    const dayOfWeek = new Date(share.createdAt).getDay();
    const dayName = dayNames[dayOfWeek];
    days[dayName]++;
  });

  commands.forEach(cmd => {
    cmd.favorites.forEach(fav => {
      const dayOfWeek = new Date(fav.createdAt).getDay();
      const dayName = dayNames[dayOfWeek];
      days[dayName]++;
    });
    cmd.ratings.forEach(rating => {
      const dayOfWeek = new Date(rating.createdAt).getDay();
      const dayName = dayNames[dayOfWeek];
      days[dayName]++;
    });
  });

  const peakDay = Object.entries(days).sort((a, b) => b[1] - a[1])[0][0];
  return peakDay;
}
