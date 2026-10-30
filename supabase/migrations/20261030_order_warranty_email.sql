-- ==============================================================================
-- VN Mobiles: Order Warranty Email & Idempotency Migration
-- ==============================================================================

-- 1. Ensure warrantyNumber column exists on Warranty table with unique index
ALTER TABLE "Warranty" ADD COLUMN IF NOT EXISTS "warrantyNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_warranty_warrantyNumber" ON "Warranty"("warrantyNumber");

-- 2. Ensure warrantyEmailSentAt column exists on Order table for fast idempotency
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "warrantyEmailSentAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "idx_order_warrantyEmailSentAt" ON "Order"("warrantyEmailSentAt");

-- 3. Ensure EmailNotification table and columns exist
CREATE TABLE IF NOT EXISTS "EmailNotification" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientName" TEXT,
  "emailType" TEXT NOT NULL,
  "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL,
  "productName" TEXT,
  "templateId" TEXT,
  "subject" TEXT NOT NULL,
  "contentSummary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "recipientEmail" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "emailType" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "orderId" TEXT REFERENCES "Order"("id") ON DELETE SET NULL;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "productName" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "contentSummary" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'SENT';
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER DEFAULT 0;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMPTZ;
ALTER TABLE "EmailNotification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS "idx_email_notification_order_type" ON "EmailNotification"("orderId", "emailType", "status");
CREATE INDEX IF NOT EXISTS "idx_email_notification_recipient" ON "EmailNotification"("recipientEmail");

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

