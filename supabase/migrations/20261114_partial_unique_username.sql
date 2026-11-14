-- Migration: Partial unique index for User username and normalizedUsername
-- Ensures null or empty usernames do NOT conflict with each other.

-- 1. Ensure columns exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "normalizedUsername" TEXT;

-- 2. Populate any existing accounts missing username from name
UPDATE "User"
SET "username" = lower(trim("name")),
    "normalizedUsername" = lower(trim("name"))
WHERE ("username" IS NULL OR trim("username") = '')
  AND "name" IS NOT NULL
  AND trim("name") <> '';

-- 3. Drop any earlier non-partial indexes if present
DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "User_normalizedUsername_key";
DROP INDEX IF EXISTS "User_username_partial_unique";
DROP INDEX IF EXISTS "User_normalizedUsername_partial_unique";

-- 4. Create partial unique indexes (ignoring NULL and empty strings)
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_partial_unique"
  ON public."User" ("username")
  WHERE "username" IS NOT NULL AND "username" <> '';

CREATE UNIQUE INDEX IF NOT EXISTS "User_normalizedUsername_partial_unique"
  ON public."User" ("normalizedUsername")
  WHERE "normalizedUsername" IS NOT NULL AND "normalizedUsername" <> '';

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
