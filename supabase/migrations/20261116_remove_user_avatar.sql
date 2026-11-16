-- ==============================================================================
-- VN Mobiles: Remove User Profile Avatar Column Migration
-- ==============================================================================

-- 1. Nullify any avatar values if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'avatar'
  ) THEN
    UPDATE public."User" SET "avatar" = NULL;
    ALTER TABLE public."User" DROP COLUMN "avatar";
  END IF;
END $$;

-- 2. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
