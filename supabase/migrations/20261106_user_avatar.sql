-- ==============================================================================
-- VN Mobiles: User Profile Avatar Migration
-- ==============================================================================

-- 1. Ensure avatar column exists on User table
ALTER TABLE IF EXISTS public."User" ADD COLUMN IF NOT EXISTS "avatar" TEXT DEFAULT '';

-- 2. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

