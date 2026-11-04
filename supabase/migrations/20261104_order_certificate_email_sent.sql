-- ==============================================================================
-- VN Mobiles: Order Certificate Email Sent Flag Migration
-- ==============================================================================

-- 1. Ensure certificateEmailSent column exists on Order table
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "certificateEmailSent" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "idx_order_certificateEmailSent" ON "Order"("certificateEmailSent");

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

