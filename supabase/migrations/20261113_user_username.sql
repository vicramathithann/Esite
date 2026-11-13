-- ==============================================================================
-- VN Mobiles: User Username & Normalized Unique Handle Migration
-- ==============================================================================

-- 1. Ensure username and normalizedUsername columns exist on User table
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "normalizedUsername" TEXT;

-- 2. Create unique index on normalizedUsername for strict case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS "User_normalizedUsername_key" ON public."User"("normalizedUsername");

-- 3. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
