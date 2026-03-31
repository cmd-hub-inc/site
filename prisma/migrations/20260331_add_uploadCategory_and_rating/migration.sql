-- Migration: add uploadCategory column to Command and create Rating table
-- Generated manually to match programmatic DDL used by scripts/dbEnsure.js

ALTER TABLE "Command"
ADD COLUMN IF NOT EXISTS "uploadCategory" text DEFAULT 'Framework';

CREATE TABLE IF NOT EXISTS "Rating" (
  "userId" text NOT NULL,
  "commandId" text NOT NULL,
  value integer NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  PRIMARY KEY ("userId", "commandId"),
  CONSTRAINT fk_rating_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_command FOREIGN KEY ("commandId") REFERENCES "Command"(id) ON DELETE CASCADE
);
