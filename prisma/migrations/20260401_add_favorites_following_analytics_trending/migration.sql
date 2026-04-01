-- Migration: Add Favorite, Follow, CommandAnalytics, and TrendingCommand tables
-- Adds support for favorites, user following, analytics tracking, and trending computation

-- Create Favorite table
CREATE TABLE IF NOT EXISTS "Favorite" (
  "userId" text NOT NULL,
  "commandId" text NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  PRIMARY KEY ("userId", "commandId"),
  CONSTRAINT fk_favorite_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_command FOREIGN KEY ("commandId") REFERENCES "Command"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId");
CREATE INDEX IF NOT EXISTS "Favorite_createdAt_idx" ON "Favorite"("createdAt");

-- Create Follow table
CREATE TABLE IF NOT EXISTS "Follow" (
  "followerId" text NOT NULL,
  "followingId" text NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  PRIMARY KEY ("followerId", "followingId"),
  CONSTRAINT fk_follow_follower FOREIGN KEY ("followerId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_follow_following FOREIGN KEY ("followingId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX IF NOT EXISTS "Follow_createdAt_idx" ON "Follow"("createdAt");

-- Create CommandAnalytics table
CREATE TABLE IF NOT EXISTS "CommandAnalytics" (
  id text PRIMARY KEY,
  "commandId" text NOT NULL UNIQUE,
  views integer DEFAULT 0,
  downloads integer DEFAULT 0,
  favorites integer DEFAULT 0,
  ratings integer DEFAULT 0,
  "updatedAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_analytics_command FOREIGN KEY ("commandId") REFERENCES "Command"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CommandAnalytics_updatedAt_idx" ON "CommandAnalytics"("updatedAt");

-- Create TrendingCommand table
CREATE TABLE IF NOT EXISTS "TrendingCommand" (
  id text PRIMARY KEY,
  "commandId" text NOT NULL,
  rank integer NOT NULL,
  "timeWindow" text NOT NULL,
  score double precision NOT NULL,
  "computedAt" timestamptz DEFAULT now(),
  CONSTRAINT uq_trending_command_window UNIQUE ("commandId", "timeWindow")
);

CREATE INDEX IF NOT EXISTS "TrendingCommand_rank_idx" ON "TrendingCommand"(rank);
CREATE INDEX IF NOT EXISTS "TrendingCommand_timeWindow_idx" ON "TrendingCommand"("timeWindow");

-- Add User username uniqueness if not already present
-- (This may already exist from schema, but included for safety)
-- ALTER TABLE "User" 
-- ADD CONSTRAINT uq_user_username UNIQUE ("username");

-- Create indexes on Command for filtering and sorting
CREATE INDEX IF NOT EXISTS "Command_authorId_idx" ON "Command"("authorId");
CREATE INDEX IF NOT EXISTS "Command_type_idx" ON "Command"(type);
CREATE INDEX IF NOT EXISTS "Command_framework_idx" ON "Command"(framework);
CREATE INDEX IF NOT EXISTS "Command_downloads_idx" ON "Command"(downloads);
CREATE INDEX IF NOT EXISTS "Command_rating_idx" ON "Command"(rating);

-- Add index on User createdAt if not present
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
