-- VN Mobiles Admin Password Reset Migration Script
-- Creates AdminPasswordResetToken and AdminSecurityAudit tables with RLS and foreign key constraints

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AdminPasswordResetToken Table
CREATE TABLE IF NOT EXISTS "AdminPasswordResetToken" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt" TIMESTAMPTZ,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_admin_pw_reset_user_id" ON "AdminPasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "idx_admin_pw_reset_token_hash" ON "AdminPasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "idx_admin_pw_reset_expires_at" ON "AdminPasswordResetToken"("expiresAt");

-- Enable Row Level Security (RLS) on AdminPasswordResetToken
-- Only service role has access. No public or authenticated policies are granted.
ALTER TABLE "AdminPasswordResetToken" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AdminPasswordResetToken" ON "AdminPasswordResetToken";
CREATE POLICY "Service role full access on AdminPasswordResetToken" 
  ON "AdminPasswordResetToken" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. AdminSecurityAudit Table
CREATE TABLE IF NOT EXISTS "AdminSecurityAudit" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_admin_security_audit_user_id" ON "AdminSecurityAudit"("userId");
CREATE INDEX IF NOT EXISTS "idx_admin_security_audit_created_at" ON "AdminSecurityAudit"("createdAt");

-- Enable Row Level Security (RLS) on AdminSecurityAudit
ALTER TABLE "AdminSecurityAudit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AdminSecurityAudit" ON "AdminSecurityAudit";
CREATE POLICY "Service role full access on AdminSecurityAudit" 
  ON "AdminSecurityAudit" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

