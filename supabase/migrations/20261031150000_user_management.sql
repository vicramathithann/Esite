-- VN Mobiles User Management & Security Directory Migration Script
-- Adds directory status & password-change flags to User, plus UserPasswordResetToken and UserAuditLog tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add missing security and directory columns to "User" table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastResetEmailSentAt" TIMESTAMPTZ;

-- 2. UserPasswordResetToken Table (Dedicated single-use reset tokens with SHA-256 hash storage)
CREATE TABLE IF NOT EXISTS "UserPasswordResetToken" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_pw_reset_user_id" ON "UserPasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "idx_user_pw_reset_token_hash" ON "UserPasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "idx_user_pw_reset_expires_at" ON "UserPasswordResetToken"("expiresAt");

-- Enable Row Level Security (RLS) on UserPasswordResetToken
ALTER TABLE "UserPasswordResetToken" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on UserPasswordResetToken" ON "UserPasswordResetToken";
CREATE POLICY "Service role full access on UserPasswordResetToken" 
  ON "UserPasswordResetToken" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. UserAuditLog Table (Full audit logging of administrative user operations)
CREATE TABLE IF NOT EXISTS "UserAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "adminEmail" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetUserEmail" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB DEFAULT '{}'::jsonb,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_audit_log_target_user" ON "UserAuditLog"("targetUserId");
CREATE INDEX IF NOT EXISTS "idx_user_audit_log_admin_email" ON "UserAuditLog"("adminEmail");
CREATE INDEX IF NOT EXISTS "idx_user_audit_log_created_at" ON "UserAuditLog"("createdAt");

-- Enable Row Level Security (RLS) on UserAuditLog
ALTER TABLE "UserAuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on UserAuditLog" ON "UserAuditLog";
CREATE POLICY "Service role full access on UserAuditLog" 
  ON "UserAuditLog" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

