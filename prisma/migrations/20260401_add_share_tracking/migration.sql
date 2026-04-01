-- Migration: Add Share table for tracking social shares

CREATE TABLE IF NOT EXISTS "Share" (
  id text PRIMARY KEY,
  "commandId" text NOT NULL,
  "userId" text,
  platform text NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Share_commandId_idx" ON "Share"("commandId");
CREATE INDEX IF NOT EXISTS "Share_userId_idx" ON "Share"("userId");
CREATE INDEX IF NOT EXISTS "Share_platform_idx" ON "Share"(platform);
CREATE INDEX IF NOT EXISTS "Share_createdAt_idx" ON "Share"("createdAt");
