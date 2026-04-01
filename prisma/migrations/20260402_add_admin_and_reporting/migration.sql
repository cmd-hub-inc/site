-- Migration: Add Admin roles and user reporting

-- Add suspended column to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "suspended" boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_suspended_idx" ON "User"("suspended");

-- Create AdminRole table
CREATE TABLE IF NOT EXISTS "AdminRole" (
  id text PRIMARY KEY,
  "userId" text NOT NULL UNIQUE,
  role text NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_admin_user FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminRole_role_idx" ON "AdminRole"(role);

-- Create Report table
CREATE TABLE IF NOT EXISTS "Report" (
  id text PRIMARY KEY,
  "reporterId" text NOT NULL,
  "commandId" text,
  "reportedUserId" text,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'OPEN',
  "createdAt" timestamptz DEFAULT now(),
  "updatedAt" timestamptz DEFAULT now(),
  CONSTRAINT fk_report_reporter FOREIGN KEY ("reporterId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Report_reporterId_idx" ON "Report"("reporterId");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"(status);
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");
