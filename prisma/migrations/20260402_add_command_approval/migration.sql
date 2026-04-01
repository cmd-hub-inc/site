-- Migration: Add command approval columns

ALTER TABLE "Command"
ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false;

ALTER TABLE "Command"
ADD COLUMN IF NOT EXISTS "approvedBy" text;

ALTER TABLE "Command"
ADD COLUMN IF NOT EXISTS "approvalReason" text;

CREATE INDEX IF NOT EXISTS "Command_approved_idx" ON "Command"("approved");
