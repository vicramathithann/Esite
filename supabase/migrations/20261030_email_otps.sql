-- ==============================================================================
-- VN Mobiles: Create or Alter email_otps & User Verification Migration
-- ==============================================================================

-- 1. Create email_otps table if it does not exist
CREATE TABLE IF NOT EXISTS public.email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ensure all columns exist with exact types matching backend code
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS code_hash TEXT;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 3. Create index for fast ordered queries by email and creation time
CREATE INDEX IF NOT EXISTS idx_email_otps_email_created_at
ON public.email_otps (email, created_at DESC);

-- 4. Enable Row Level Security (RLS) with NO public policies
-- With RLS enabled and no permissive policies created, anon/authenticated public
-- access is blocked. Only the backend using SUPABASE_SERVICE_ROLE_KEY can read/write.
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Drop any accidental public policies so anon users cannot view codes
DROP POLICY IF EXISTS "Public access to email_otps" ON public.email_otps;
DROP POLICY IF EXISTS "Anon insert email_otps" ON public.email_otps;
DROP POLICY IF EXISTS "Anon select email_otps" ON public.email_otps;

-- 5. User table verification columns (assumed table: public."User")
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;

-- 6. Crucial: Tell PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
