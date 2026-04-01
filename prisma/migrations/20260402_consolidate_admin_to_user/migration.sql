-- Migration: Move admin roles to User table and remove AdminRole table

-- Add admin columns to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "isAdmin" boolean DEFAULT false;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "adminRole" text;

-- Create index on isAdmin
CREATE INDEX IF NOT EXISTS "User_isAdmin_idx" ON "User"("isAdmin");

-- Drop the AdminRole table if it exists
DROP TABLE IF EXISTS "AdminRole" CASCADE;
