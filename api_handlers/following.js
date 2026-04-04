/**
 * User following system handler
 */

import prisma from './_lib/prisma.js';
import { requireAuthOrFail } from './_lib/utils.js';
import { deleteCache } from './_lib/cache.js';
import { logError, logInfo } from './_lib/logger.js';

/**
 * Get user's followers
 */
export async function getFollowers(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: { select: { id: true, username: true, avatar: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = followers.map((f) => ({ ...f.follower, followedAt: f.createdAt }));
    return res.json(result);
  } catch (error) {
    logError('Failed to get followers', error, { userId: req.params.userId });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get users that the user is following
 */
export async function getFollowing(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: { select: { id: true, username: true, avatar: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = following.map((f) => ({ ...f.following, followedAt: f.createdAt }));
    return res.json(result);
  } catch (error) {
    logError('Failed to get following', error, { userId: req.params.userId });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Follow a user
 */
export async function followUser(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { userId } = req.params || req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Prevent self-following
    if (userId === session.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create follow relationship
    const follow = await prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId: session.id, followingId: userId },
      },
      update: {},
      create: { followerId: session.id, followingId: userId },
    });

    logInfo('User followed', { followerId: session.id, followingId: userId });

    return res.status(201).json(follow);
  } catch (error) {
    logError('Failed to follow user', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { userId } = req.params || req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Delete follow relationship
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.id, followingId: userId } },
    });

    if (!follow) {
      return res.status(404).json({ error: 'Not following this user' });
    }

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: session.id, followingId: userId } },
    });

    logInfo('User unfollowed', { followerId: session.id, followingId: userId });

    return res.json({ success: true });
  } catch (error) {
    logError('Failed to unfollow user', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Check if following a user
 */
export async function isFollowing(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.id, followingId: userId } },
    });

    return res.json({ isFollowing: !!follow });
  } catch (error) {
    logError('Failed to check following status', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Get commands from users you follow
 */
export async function getFollowingFeed(req, res) {
  const session = requireAuthOrFail(req, res);
  if (!session) return;

  try {
    // Get list of users being followed
    const following = await prisma.follow.findMany({
      where: { followerId: session.id },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Get commands from followed users
    const commands = await prisma.command.findMany({
      where: { authorId: { in: followingIds } },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json(commands);
  } catch (error) {
    logError('Failed to get following feed', error, { userId: session.id });
    return res.status(500).json({ error: 'Server error' });
  }
}

export default {
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowingFeed,
};
