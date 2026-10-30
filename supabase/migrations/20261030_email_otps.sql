-- ==============================================================================
-- VN Mobiles: Email OTPs & User Verification Migration
-- ==============================================================================

-- 1. Create email_otps table
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index on (email, created_at DESC) for fast lookup of latest codes
CREATE INDEX IF NOT EXISTS idx_email_otps_email_created_at
ON public.email_otps (email, created_at DESC);

-- 3. Enable Row Level Security (RLS) with NO public policies
-- With RLS enabled and no permissive policies created, anon/authenticated public
-- access is blocked. Only the backend using SUPABASE_SERVICE_ROLE_KEY can read/write.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- 4. User profile table column migration
-- The assumed table name is public."User" (from supabase/schema.sql)
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;

