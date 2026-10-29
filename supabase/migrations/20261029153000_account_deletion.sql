-- VN Mobiles Account Deletion Migration Script
-- Adds AccountDeletionRequest, AccountDeletionAudit tables, RLS policies, FK constraints, and atomic RPC function

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. AccountDeletionRequest Table
CREATE TABLE IF NOT EXISTS "AccountDeletionRequest" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "otpHash" TEXT NOT NULL,
  "salt" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "usedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_account_deletion_user_id" ON "AccountDeletionRequest"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_created_at" ON "AccountDeletionRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_ip" ON "AccountDeletionRequest"("ipAddress");

-- Enable Row Level Security (RLS) on AccountDeletionRequest
-- Only service role has access. No public or authenticated policies are granted.
ALTER TABLE "AccountDeletionRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AccountDeletionRequest" ON "AccountDeletionRequest";
CREATE POLICY "Service role full access on AccountDeletionRequest" 
  ON "AccountDeletionRequest" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 2. AccountDeletionAudit Table
-- Stores non-identifying audit record (userId hash, timestamp, IP) without personal data
CREATE TABLE IF NOT EXISTS "AccountDeletionAudit" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userIdHash" TEXT NOT NULL,
  "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "reason" TEXT DEFAULT 'Self-service customer account deletion'
);

CREATE INDEX IF NOT EXISTS "idx_account_deletion_audit_hash" ON "AccountDeletionAudit"("userIdHash");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_audit_deleted_at" ON "AccountDeletionAudit"("deletedAt");

-- Enable Row Level Security (RLS) on AccountDeletionAudit
ALTER TABLE "AccountDeletionAudit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AccountDeletionAudit" ON "AccountDeletionAudit";
CREATE POLICY "Service role full access on AccountDeletionAudit" 
  ON "AccountDeletionAudit" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 3. Foreign Key Safeguards for Anonymization
-- Ensure dependent tables permit NULL userIds so order & warranty obligations are retained when user profile is deleted

-- Order.userId -> SET NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'userId') THEN
    ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
    ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
    ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Warranty.userId -> SET NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Warranty' AND column_name = 'userId') THEN
    ALTER TABLE "Warranty" ALTER COLUMN "userId" DROP NOT NULL;
    ALTER TABLE "Warranty" DROP CONSTRAINT IF EXISTS "Warranty_userId_fkey";
    ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- EmailNotification.userId -> SET NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'EmailNotification' AND column_name = 'userId') THEN
    ALTER TABLE "EmailNotification" ALTER COLUMN "userId" DROP NOT NULL;
    ALTER TABLE "EmailNotification" DROP CONSTRAINT IF EXISTS "EmailNotification_userId_fkey";
    ALTER TABLE "EmailNotification" ADD CONSTRAINT "EmailNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Review.userId -> SET NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Review' AND column_name = 'userId') THEN
    ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;
    ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
    ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Atomic PostgreSQL Function for Account Deletion (RPC)
CREATE OR REPLACE FUNCTION delete_user_account(
  p_user_id TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_active_orders_count INTEGER;
  v_user_email TEXT;
  v_anonymized_email TEXT;
BEGIN
  -- 1. Find the target user
  SELECT * INTO v_user FROM "User" WHERE "id" = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User account not found');
  END IF;

  -- 2. Prevent admin self-deletion
  IF UPPER(COALESCE(v_user.role, 'USER')) = 'ADMIN' OR LOWER(TRIM(v_user.email)) = 'rrroyce20@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator accounts cannot be self-deleted.');
  END IF;

  v_user_email := LOWER(TRIM(v_user.email));
  v_anonymized_email := 'deleted-' || SUBSTRING(MD5(p_user_id) FROM 1 FOR 8) || '@deleted.vnmobiles.in';

  -- 3. Check for active orders in progress or transit
  SELECT COUNT(*) INTO v_active_orders_count
  FROM "Order"
  WHERE ("userId" = p_user_id OR LOWER(TRIM("customerEmail")) = v_user_email)
    AND UPPER(TRIM("orderStatus")) NOT IN (
      'DELIVERED', 
      'CANCELLED', 
      'CANCEL', 
      'REFUNDED', 
      'REFUND_INITIATED'
    );

  IF v_active_orders_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot delete account while you have active orders in progress or transit. Please wait until your orders are delivered or cancel them before proceeding.'
    );
  END IF;

  -- 4. Anonymize Orders (preserve orderNumber, totalAmount, paymentMethod, items for tax & accounting)
  UPDATE "Order"
  SET "customerName" = 'Deleted Customer',
      "customerEmail" = v_anonymized_email,
      "customerPhone" = '0000000000',
      "address" = 'Redacted (Account Deleted)',
      "city" = 'Redacted',
      "state" = 'Redacted',
      "pincode" = '000000',
      "userId" = NULL
  WHERE ("userId" = p_user_id OR LOWER(TRIM("customerEmail")) = v_user_email);

  -- 5. Anonymize Warranties
  UPDATE "Warranty"
  SET "customerName" = 'Deleted Customer',
      "customerEmail" = v_anonymized_email,
      "userId" = NULL
  WHERE ("userId" = p_user_id OR LOWER(TRIM("customerEmail")) = v_user_email);

  -- 6. Anonymize Reviews (author name anonymized)
  UPDATE "Review"
  SET "userName" = 'Anonymous Customer',
      "userId" = NULL
  WHERE "userId" = p_user_id;

  -- 7. Anonymize EmailNotification logs
  UPDATE "EmailNotification"
  SET "userId" = NULL,
      "recipientName" = 'Deleted Customer',
      "recipientEmail" = v_anonymized_email
  WHERE "userId" = p_user_id OR LOWER(TRIM("recipientEmail")) = v_user_email;

  -- 8. Delete Wishlist items
  DELETE FROM "Wishlist" WHERE "userId" = p_user_id;

  -- 9. Delete pending AccountDeletionRequest records
  DELETE FROM "AccountDeletionRequest" WHERE "userId" = p_user_id;

  -- 10. Record non-identifying Audit Log
  INSERT INTO "AccountDeletionAudit" ("id", "userIdHash", "deletedAt", "ipAddress", "reason")
  VALUES (
    uuid_generate_v4()::text,
    encode(digest(p_user_id, 'sha256'), 'hex'),
    NOW(),
    p_ip_address,
    'Self-service customer account deletion'
  );

  -- 11. Delete the user profile row
  DELETE FROM "User" WHERE "id" = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Your account has been deleted successfully.'
  );
END;
$$;

-- 5. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

