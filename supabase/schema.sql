-- VN Mobiles Supabase PostgreSQL Schema & Seed Migration Script

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User Table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "name" TEXT NOT NULL,
  "email" TEXT UNIQUE NOT NULL,
  "phone" TEXT UNIQUE NOT NULL,
  "address" TEXT DEFAULT '',
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT,
  "tokenExpires" TIMESTAMPTZ,
  "otpHash" TEXT,
  "otpExpires" TIMESTAMPTZ,
  "otpAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastOtpSentAt" TIMESTAMPTZ,
  "loginOtpHash" TEXT,
  "loginOtpExpires" TIMESTAMPTZ,
  "loginOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastLoginOtpSentAt" TIMESTAMPTZ,
  "resetToken" TEXT,
  "resetTokenExpires" TIMESTAMPTZ,
  "resetOtpHash" TEXT,
  "resetOtpExpires" TIMESTAMPTZ,
  "resetOtpAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastResetOtpSentAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. MobileProduct Table
CREATE TABLE IF NOT EXISTS "MobileProduct" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "series" TEXT NOT NULL,
  "tagline" TEXT NOT NULL,
  "model" TEXT,
  "category" TEXT NOT NULL DEFAULT 'SMARTPHONE',
  "basePrice" INTEGER NOT NULL,
  "discountPrice" INTEGER,
  "originalPrice" INTEGER NOT NULL,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8,
  "reviewCount" INTEGER NOT NULL DEFAULT 120,
  "imageUrl" TEXT NOT NULL,
  "galleryImages" TEXT NOT NULL DEFAULT '[]',
  "colors" TEXT NOT NULL DEFAULT '[]',
  "storageOptions" TEXT NOT NULL DEFAULT '[]',
  "ram" TEXT NOT NULL,
  "display" TEXT NOT NULL,
  "displayType" TEXT,
  "processor" TEXT NOT NULL,
  "camera" TEXT NOT NULL,
  "rearCamera" TEXT,
  "frontCamera" TEXT,
  "battery" TEXT NOT NULL,
  "batteryCapacity" TEXT,
  "os" TEXT NOT NULL,
  "network5G" TEXT NOT NULL,
  "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
  "stock" INTEGER NOT NULL DEFAULT 20,
  "inStock" BOOLEAN NOT NULL DEFAULT true,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "highlightFeatures" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ProductVariant Table
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "productId" TEXT NOT NULL REFERENCES "MobileProduct"("id") ON DELETE CASCADE,
  "ram" TEXT,
  "storage" TEXT,
  "color" TEXT,
  "colorHex" TEXT,
  "price" INTEGER NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 10,
  "sku" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Order Table
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT DEFAULT '',
  "phoneVerified" BOOLEAN NOT NULL DEFAULT true,
  "customerEmail" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT '',
  "totalAmount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
  "orderStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
  "shippingCarrier" TEXT,
  "trackingNumber" TEXT,
  "estimatedDelivery" TIMESTAMPTZ,
  "shippedAt" TIMESTAMPTZ,
  "deliveredAt" TIMESTAMPTZ,
  "adminNotes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. OrderItem Table
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "productBrand" TEXT NOT NULL,
  "productImageUrl" TEXT NOT NULL,
  "selectedColor" TEXT NOT NULL,
  "selectedStorage" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "imeiNumber" TEXT NOT NULL,
  "warrantyMonths" INTEGER NOT NULL DEFAULT 12,
  "warrantyStartDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "warrantyExpiryDate" TIMESTAMPTZ NOT NULL,
  "warrantyStatus" TEXT NOT NULL DEFAULT 'ACTIVE'
);

-- 6. OrderStatusHistory Table
CREATE TABLE IF NOT EXISTS "OrderStatusHistory" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "changedBy" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Warranty Table
CREATE TABLE IF NOT EXISTS "Warranty" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "orderItemId" TEXT UNIQUE NOT NULL REFERENCES "OrderItem"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "imeiNumber" TEXT NOT NULL,
  "purchaseDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "warrantyDuration" TEXT NOT NULL DEFAULT '1 Year',
  "warrantyStartDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "warrantyExpiryDate" TIMESTAMPTZ NOT NULL,
  "warrantyStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "emailSent" BOOLEAN NOT NULL DEFAULT false,
  "reminded6MonthsAt" TIMESTAMPTZ,
  "reminded1DayAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EmailNotification Table
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

-- 9. Wishlist Table
CREATE TABLE IF NOT EXISTS "Wishlist" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "MobileProduct"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "productId")
);

-- 10. Review Table
CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "productId" TEXT NOT NULL REFERENCES "MobileProduct"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "userName" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SiteSetting Table
CREATE TABLE IF NOT EXISTS "SiteSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. invitations Table
CREATE TABLE IF NOT EXISTS "invitations" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "email" TEXT NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "invitedBy" TEXT NOT NULL DEFAULT 'rrroyce20@gmail.com',
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. mobiles Table (Catalog Alias)
CREATE TABLE IF NOT EXISTS "mobiles" (
  "id" TEXT PRIMARY KEY,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "ram" TEXT NOT NULL,
  "storage" TEXT NOT NULL,
  "price" INTEGER NOT NULL,
  "image_url" TEXT NOT NULL,
  "display_size" TEXT NOT NULL,
  "processor" TEXT NOT NULL,
  "camera" TEXT NOT NULL,
  "battery" TEXT NOT NULL,
  "operating_system" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 50,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.6,
  "reviewCount" INTEGER NOT NULL DEFAULT 180,
  "originalPrice" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on User" ON "User";
CREATE POLICY "Service role full access on User" ON "User" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "MobileProduct" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on MobileProduct" ON "MobileProduct";
CREATE POLICY "Service role full access on MobileProduct" ON "MobileProduct" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "ProductVariant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on ProductVariant" ON "ProductVariant";
CREATE POLICY "Service role full access on ProductVariant" ON "ProductVariant" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on Order" ON "Order";
CREATE POLICY "Service role full access on Order" ON "Order" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on OrderItem" ON "OrderItem";
CREATE POLICY "Service role full access on OrderItem" ON "OrderItem" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "OrderStatusHistory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on OrderStatusHistory" ON "OrderStatusHistory";
CREATE POLICY "Service role full access on OrderStatusHistory" ON "OrderStatusHistory" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "Warranty" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on Warranty" ON "Warranty";
CREATE POLICY "Service role full access on Warranty" ON "Warranty" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "EmailNotification" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on EmailNotification" ON "EmailNotification";
CREATE POLICY "Service role full access on EmailNotification" ON "EmailNotification" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "Wishlist" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on Wishlist" ON "Wishlist";
CREATE POLICY "Service role full access on Wishlist" ON "Wishlist" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on Review" ON "Review";
CREATE POLICY "Service role full access on Review" ON "Review" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on SiteSetting" ON "SiteSetting";
CREATE POLICY "Service role full access on SiteSetting" ON "SiteSetting" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on invitations" ON "invitations";
CREATE POLICY "Service role full access on invitations" ON "invitations" FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE "mobiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on mobiles" ON "mobiles";
CREATE POLICY "Service role full access on mobiles" ON "mobiles" FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public Read Access for Storefront Data
DROP POLICY IF EXISTS "Public read on MobileProduct" ON "MobileProduct";
CREATE POLICY "Public read on MobileProduct" ON "MobileProduct" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read on ProductVariant" ON "ProductVariant";
CREATE POLICY "Public read on ProductVariant" ON "ProductVariant" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read on SiteSetting" ON "SiteSetting";
CREATE POLICY "Public read on SiteSetting" ON "SiteSetting" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read on Review" ON "Review";
CREATE POLICY "Public read on Review" ON "Review" FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public read on mobiles" ON "mobiles";
CREATE POLICY "Public read on mobiles" ON "mobiles" FOR SELECT TO anon, authenticated USING (true);

-- ==========================================================================
-- SEED DATA: Site Settings
-- ==========================================================================
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showWishlist', 'true', 'Show wishlist icon in navigation and product cards') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showCompare', 'true', 'Show phone compare tool in navigation and product cards') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showDealsBanner', 'true', 'Display promotional deals banners across store') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showReviews', 'true', 'Display customer star reviews and ratings') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showDealsCountdown', 'true', 'Show flash deal timer countdown') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('showAnnouncement', 'true', 'Show top announcement ticker on all pages') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";
INSERT INTO "SiteSetting" ("key", "value", "description") VALUES ('announcementText', '🪔 Diwali Magic Begins: Get up to 30% OFF festive bestsellers & gift sets! ✨', 'Top announcement bar message') ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";

-- ==========================================================================
-- SEED DATA: Users (Admin & Initial Customers)
-- ==========================================================================
INSERT INTO "User" ("id", "name", "email", "phone", "address", "password", "role", "emailVerified", "createdAt")
VALUES ('89c80e6a-bfb3-4cc6-b257-90ccfeb94e5d', 'Store Administrator', 'rrroyce20@gmail.com', '+91 98888 77777', '', '100000:b4a2c55a9050d17d16e6c7ec39b60ab5:a1c4e4a878b286b5871041cff8cc99c4059c6555769adc1a6e318956d7800c99c2719b301174e95df5eeab11f5b56f5807c0e68171f7190723990991aa703cc3', 'ADMIN', TRUE, '2026-10-16T10:33:56.351Z')
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "emailVerified" = EXCLUDED."emailVerified";
INSERT INTO "User" ("id", "name", "email", "phone", "address", "password", "role", "emailVerified", "createdAt")
VALUES ('ea1cc739-57e2-4fc6-8d98-773498348b9a', 'Roman', 'vicrampr@gmail.com', '969974102452', '', '100000:0a8ef3201337eabf7c72076141ede153:0d7e8722b3ef027479cfc6ed10a7012bae2e3ad777932602daf61066075ec3d6da760993e9d76532eec105471a92aa06864602e06d5f0f8bf523ca3c9f24d5f2', 'USER', TRUE, '2026-10-22T06:41:18.066Z')
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "emailVerified" = EXCLUDED."emailVerified";

-- ==========================================================================
-- SEED DATA: Mobile Products (70 catalog devices)
-- ==========================================================================
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-16-pro-max', 'Apple iPhone 16 Pro Max', 'Apple', 'Desert Titanium', 'The ultimate iPhone. Forged in grade 5 titanium with thinner borders, A18 Pro chip, 48MP Fusion camera with Camera Control button, and unmat', NULL, 'SMARTPHONE',
  144900, NULL, 159900, 4.9, 380,
  '/phones/iphone-16-pro-max.jpg', '["/phones/iphone-16-pro-max.jpg"]', '[{"name":"Desert Titanium","hex":"#cfb9a5"},{"name":"Natural Titanium","hex":"#9e9a95"},{"name":"White Titanium","hex":"#e3e4e5"},{"name":"Black Titanium","hex":"#3b3a38"}]', '[{"size":"256GB","price":144900},{"size":"512GB","price":164900},{"size":"1TB","price":184900}]', '8GB', '6.9-inch Super Retina XDR OLED 120Hz ProMotion',
  NULL, 'Apple A18 Pro (3nm) with 6-core GPU & Apple Intelligence', '48MP Fusion + 48MP Ultra-Wide + 12MP 5x Telephoto | 12MP TrueDepth', NULL, NULL,
  '4685 mAh, 25W MagSafe Wireless & USB-C 3.0', NULL, 'iOS 18 with Apple Intelligence', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, TRUE, '["Grade 5 Titanium frame with Camera Control sensor button","Apple A18 Pro chip with 6-core GPU & hardware ray tracing","48MP Fusion camera with 4K 120 fps Dolby Vision recording","Industry-leading battery life up to 33 hours video playback"]', '2026-09-08T05:26:22.836Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-16-pro', 'Apple iPhone 16 Pro', 'Apple', 'Natural Titanium', 'Pro performance in a compact 6.3-inch titanium chassis. Features 5x optical telephoto, 48MP Ultra-wide macro, and dedicated Camera Control.', NULL, 'SMARTPHONE',
  119900, NULL, 129900, 4.8, 290,
  '/phones/iphone-16-pro.jpg', '["/phones/iphone-16-pro.jpg"]', '[{"name":"Natural Titanium","hex":"#9e9a95"},{"name":"Desert Titanium","hex":"#cfb9a5"},{"name":"Black Titanium","hex":"#3b3a38"}]', '[{"size":"128GB","price":119900},{"size":"256GB","price":129900},{"size":"512GB","price":149900}]', '8GB', '6.3-inch Super Retina XDR OLED 120Hz ProMotion',
  NULL, 'Apple A18 Pro (3nm) with Neural Engine', '48MP Fusion + 48MP Ultra-Wide + 12MP 5x Telephoto', NULL, NULL,
  '3582 mAh, MagSafe & Qi2 Wireless', NULL, 'iOS 18 with Apple Intelligence', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, TRUE, '["Compact 6.3-inch ProMotion display with ultra-thin bezels","5x tetraprism optical zoom now standard on Pro","A18 Pro silicon built for private Apple Intelligence","Studio-quality 4-mic array with Audio Mix sound studio"]', '2026-09-08T05:26:22.851Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-16-plus', 'Apple iPhone 16 Plus', 'Apple', 'Ultramarine', 'Big screen, massive battery life, and vibrant color-infused back glass.', NULL, 'SMARTPHONE',
  89999, NULL, 99900, 4.7, 210,
  '/phones/iphone-16-plus.jpg', '["/phones/iphone-16-plus.jpg"]', '[{"name":"Ultramarine","hex":"#445582"}]', '[{"size":"128GB","price":89999}]', '8GB', '6.7-inch Super Retina XDR OLED, Dynamic Island',
  NULL, 'Apple A18 (3nm) with 5-core GPU', '48MP Fusion 2x Optical + 12MP Ultra-Wide with Macro', NULL, NULL,
  '4674 mAh, All-day plus battery life', NULL, 'iOS 18', 'Dual 5G SIM (SA/NSA)', 12,
  36, TRUE, TRUE, '["Large 6.7-inch display"]', '2026-09-08T05:26:22.864Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-16', 'Apple iPhone 16', 'Apple', 'Teal', 'Meet iPhone 16. Designed with Apple Intelligence, customizable Action button, Camera Control, and aerospace-grade aluminum with color-infuse', NULL, 'SMARTPHONE',
  79900, NULL, 89900, 4.8, 340,
  '/phones/iphone-16.jpg', '["/phones/iphone-16.jpg"]', '[{"name":"Teal","hex":"#87a5a3"},{"name":"Ultramarine","hex":"#445582"},{"name":"Pink","hex":"#d88898"},{"name":"White","hex":"#fafafa"},{"name":"Black","hex":"#1f2022"}]', '[{"size":"128GB","price":79900},{"size":"256GB","price":89900}]', '8GB', '6.1-inch Super Retina XDR OLED, Dynamic Island',
  NULL, 'Apple A18 (3nm)', '48MP Fusion 2x Telephoto + 12MP Ultra-Wide Macro', NULL, NULL,
  '3561 mAh, Fast charge 50% in 30 mins', NULL, 'iOS 18', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Customizable Action button and new Camera Control","Next-generation Photographic Styles with real-time tone controls","Latest A18 chip with 30% faster CPU than iPhone 15","Ceramic Shield 2x tougher than any other smartphone glass"]', '2026-09-08T05:26:22.878Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-15', 'Apple iPhone 15', 'Apple', 'Blue', 'Dynamic Island, 48MP Main camera, and durable color-infused glass design with USB-C universal connector.', NULL, 'SMARTPHONE',
  58999, NULL, 69900, 4.7, 650,
  '/phones/iphone-15.jpg', '["/phones/iphone-15.jpg"]', '[{"name":"Blue","hex":"#d3e0e6"},{"name":"Black","hex":"#2b2b2d"},{"name":"Green","hex":"#dbe4d5"}]', '[{"size":"128GB","price":58999},{"size":"256GB","price":68999}]', '6GB', '6.1-inch Super Retina XDR OLED, Dynamic Island',
  NULL, 'Apple A16 Bionic (4nm)', '48MP Main with 2x Telephoto + 12MP Ultra-Wide', NULL, NULL,
  '3349 mAh, USB-C Charging', NULL, 'iOS 17 (Upgradable to iOS 18)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Dynamic Island bubbles up alerts and Live Activities","Super-high-resolution 48MP photos with 2x optical-quality zoom","USB-C connector charges your iPhone, Mac, and iPad with one cable","A16 Bionic chip powers computational photography"]', '2026-09-08T05:26:22.892Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-s24-ultra', 'Samsung Galaxy S24 Ultra', 'Samsung', 'Titanium Gray', 'The apex of Android flagships with built-in S-Pen, titanium shield, anti-reflective Corning Gorilla Armor, and Galaxy AI live translate & Ci', NULL, 'SMARTPHONE',
  129999, NULL, 139999, 4.8, 420,
  '/phones/samsung-galaxy-s24-ultra.jpg', '["/phones/samsung-galaxy-s24-ultra.jpg"]', '[{"name":"Titanium Gray","hex":"#7a7876"},{"name":"Titanium Black","hex":"#32302e"},{"name":"Titanium Violet","hex":"#5b5063"},{"name":"Titanium Yellow","hex":"#d8ceab"}]', '[{"size":"256GB","price":129999},{"size":"512GB","price":139999},{"size":"1TB","price":159999}]', '12GB', '6.8-inch Dynamic AMOLED 2X 120Hz Flat, Gorilla Armor anti-reflective',
  NULL, 'Snapdragon 8 Gen 3 for Galaxy (4nm)', '200MP OIS + 50MP 5x Periscope + 10MP 3x + 12MP Ultra-wide', NULL, NULL,
  '5000 mAh, 45W Fast Wired + 15W Wireless', NULL, 'Android 14, One UI 6.1 (7 Years OS Updates)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, TRUE, '["Corning Gorilla Armor reduces 75% reflections on flat 6.8\" AMOLED","Quad Telephoto system with 50MP 5x optical zoom & 100x Space Zoom","Integrated S-Pen stylus for precision notes and drawing","Galaxy AI suite with generative photo editing and live call translation"]', '2026-09-08T05:26:22.912Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-z-fold-6', 'Samsung Galaxy Z Fold 6', 'Samsung', 'Silver Shadow', 'Ultra-slim foldable power. Lighter, brighter, and tougher with IP48 water/dust resistance, Dual Screen Interpreter, and desktop-level multit', NULL, 'SMARTPHONE',
  164999, NULL, 179999, 4.8, 150,
  '/phones/samsung-galaxy-z-fold-6.png', '["/phones/samsung-galaxy-z-fold-6.png"]', '[{"name":"Silver Shadow","hex":"#b5b7b9"},{"name":"Navy","hex":"#1e293b"},{"name":"Pink","hex":"#eed5d9"}]', '[{"size":"256GB","price":164999},{"size":"512GB","price":176999}]', '12GB', '7.6-inch Dynamic AMOLED 2X 120Hz Foldable + 6.3-inch Cover Screen',
  NULL, 'Snapdragon 8 Gen 3 for Galaxy (4nm)', '50MP Dual Pixel OIS + 10MP 3x Telephoto + 12MP Ultra-wide', NULL, NULL,
  '4400 mAh, 25W Fast Charging', NULL, 'Android 14, One UI 6.1.1 (7 Years OS Updates)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, TRUE, '["Zero-gap dual rail FlexHinge with Armor Aluminum frame","Dual screen interpreter translates face-to-face across both displays","Snapdragon 8 Gen 3 with 1.6x larger vapor chamber for ray-traced gaming","7 years of major Android OS and security upgrades guaranteed"]', '2026-09-08T05:26:22.931Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-s24', 'Samsung Galaxy S24', 'Samsung', 'Onyx Black', 'Compact flagship perfection. One-handed 6.2-inch LTPO AMOLED display with uniform bezels, Armor Aluminum 2, and full Galaxy AI capabilities.', NULL, 'SMARTPHONE',
  74999, NULL, 79999, 4.7, 310,
  '/phones/samsung-galaxy-s24.jpg', '["/phones/samsung-galaxy-s24.jpg"]', '[{"name":"Onyx Black","hex":"#222222"},{"name":"Marble Gray","hex":"#d2d2d4"},{"name":"Cobalt Violet","hex":"#494254"}]', '[{"size":"128GB","price":74999},{"size":"256GB","price":79999}]', '8GB', '6.2-inch Dynamic AMOLED 2X 1-120Hz LTPO, 2600 nits',
  NULL, 'Exynos 2400 Deca-Core / Snapdragon 8 Gen 3 (4nm)', '50MP Dual Pixel OIS + 10MP 3x + 12MP Ultra-wide', NULL, NULL,
  '4000 mAh, 25W Fast Charging', NULL, 'Android 14, One UI 6.1', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Pocket-friendly 167g lightweight build with satin Armor Aluminum","1-120Hz LTPO Dynamic AMOLED 2X with Vision Booster up to 2600 nits","50MP high-res camera with 2x and 3x optical quality zoom","Full suite of Galaxy AI: Circle to Search, Note Assist, Photo Assist"]', '2026-09-08T05:26:22.948Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-s23-fe', 'Samsung Galaxy S23 FE', 'Samsung', 'Mint', 'Flagship DNA at an accessible price. Premium aluminum frame, Gorilla Glass 5, IP68 water resistance, and dedicated 3x telephoto zoom lens.', NULL, 'SMARTPHONE',
  39999, NULL, 59999, 4.6, 510,
  '/phones/samsung-galaxy-s23-fe.jpg', '["/phones/samsung-galaxy-s23-fe.jpg"]', '[{"name":"Mint","hex":"#a4cbb7"},{"name":"Graphite","hex":"#353839"},{"name":"Purple","hex":"#7a6279"}]', '[{"size":"128GB","price":39999},{"size":"256GB","price":44999}]', '8GB', '6.4-inch Dynamic AMOLED 2X 120Hz FHD+',
  NULL, 'Samsung Exynos 2200 (4nm)', '50MP OIS + 8MP 3x Telephoto + 12MP Ultra-wide', NULL, NULL,
  '4500 mAh, 25W Fast Charging', NULL, 'Android 14, One UI 6.1 with Galaxy AI', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["True 3x optical zoom telephoto camera with Nightography","Galaxy AI update brought Circle to Search and Live Translate","IP68 dust and water resistance with aluminum frame","Dynamic AMOLED 2X with Adaptive 120Hz refresh"]', '2026-09-08T05:26:22.965Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-a55-5g', 'Samsung Galaxy A55 5G', 'Samsung', 'Awesome Iceblue', 'Metal frame premium design meets Knox Vault security. Powered by Exynos 1480 with AMD GPU and vibrant 6.6-inch Super AMOLED screen.', NULL, 'SMARTPHONE',
  36999, NULL, 42999, 4.6, 390,
  '/phones/samsung-galaxy-a55-5g.jpg', '["/phones/samsung-galaxy-a55-5g.jpg"]', '[{"name":"Awesome Iceblue","hex":"#b4d3e8"},{"name":"Awesome Navy","hex":"#232d3f"},{"name":"Awesome Lilac","hex":"#d5cce6"}]', '[{"size":"128GB","price":36999},{"size":"256GB","price":39999}]', '8GB / 12GB', '6.6-inch FHD+ Super AMOLED 120Hz, Gorilla Glass Victus+',
  NULL, 'Samsung Exynos 1480 with AMD Xclipse 530 GPU', '50MP OIS + 12MP Ultra-wide + 5MP Macro | 32MP Selfie', NULL, NULL,
  '5000 mAh, 25W Fast Charging', NULL, 'Android 14, One UI 6.1 (4 OS Upgrades)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Solid metallic frame with Corning Gorilla Glass Victus+ front & back","Hardware-isolated Samsung Knox Vault security for biometrics & PINs","Big 5000mAh battery with up to 2 days of real-world usage","IP67 dust and water resistance rating"]', '2026-09-08T05:26:22.982Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-a35-5g', 'Samsung Galaxy A35 5G', 'Samsung', 'Awesome Navy', 'Vibrant Infinity-O Super AMOLED 120Hz display with Key Island design, 50MP OIS camera, and IP67 water resistance.', NULL, 'SMARTPHONE',
  27999, NULL, 33999, 4.5, 280,
  '/phones/samsung-galaxy-a35-5g.jpg', '["/phones/samsung-galaxy-a35-5g.jpg"]', '[{"name":"Awesome Navy","hex":"#232d3f"},{"name":"Awesome Iceblue","hex":"#b4d3e8"},{"name":"Awesome Lemon","hex":"#f0e68c"}]', '[{"size":"128GB","price":27999},{"size":"256GB","price":30999}]', '8GB', '6.6-inch FHD+ Super AMOLED 120Hz Infinity-O',
  NULL, 'Samsung Exynos 1380 5G (5nm)', '50MP OIS + 8MP Ultra-wide + 5MP Macro', NULL, NULL,
  '5000 mAh, 25W Fast Charging', NULL, 'Android 14, One UI 6.1', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["6.6-inch Super AMOLED display with 1000 nits high-brightness mode","50MP main sensor with optical image stabilization (OIS)","4 generations of Android OS updates and 5 years of security patches","IP67 water and dust resistance"]', '2026-09-08T05:26:22.999Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-m15-5g', 'Samsung Galaxy M15 5G', 'Samsung', 'Celestial Blue', 'The segment''s only Super AMOLED display paired with a massive 6000mAh battery for unmatched multi-day endurance.', NULL, 'SMARTPHONE',
  12499, NULL, 15999, 4.4, 680,
  '/phones/samsung-galaxy-m15-5g.jpg', '["/phones/samsung-galaxy-m15-5g.jpg"]', '[{"name":"Celestial Blue","hex":"#6389a8"},{"name":"Stone Grey","hex":"#4b515d"},{"name":"Blue Topaz","hex":"#35688f"}]', '[{"size":"128GB","price":12499}]', '6GB', '6.5-inch Super AMOLED 90Hz FHD+ Display',
  NULL, 'MediaTek Dimensity 6100+ 5G (6nm)', '50MP Main + 5MP Ultra-Wide + 2MP Macro | 13MP Selfie', NULL, NULL,
  '6000 mAh Monster Battery, 25W Fast Charging', NULL, 'Android 14, One UI 6.0', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Segment-leading 6.5-inch Super AMOLED display with rich colors","Massive 6000mAh battery lasting over 2 full days of heavy use","MediaTek Dimensity 6100+ with 10 5G bands support","4 OS updates & 5 years security patches promised"]', '2026-09-08T05:26:23.020Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'google-pixel-9-pro-xl', 'Google Pixel Pixel 9 Pro XL', 'Google Pixel', 'Obsidian', 'Google''s pinnacle AI smartphone. Tensor G4 chip with 16GB RAM for Gemini Nano multimodal intelligence, iconic camera bar with 30x Super Res ', NULL, 'SMARTPHONE',
  124999, NULL, 134999, 4.8, 190,
  '/phones/google-pixel-9-pro-xl.jpg', '["/phones/google-pixel-9-pro-xl.jpg"]', '[{"name":"Obsidian","hex":"#222325"},{"name":"Porcelain","hex":"#f0eee9"},{"name":"Hazel","hex":"#7d8471"},{"name":"Rose Quartz","hex":"#e7d0d0"}]', '[{"size":"256GB","price":124999},{"size":"512GB","price":139999}]', '16GB', '6.8-inch Super Actua LTPO OLED 1-120Hz, 3000 nits peak',
  NULL, 'Google Tensor G4 with Titan M2 Coprocessor', '50MP Octa PD + 48MP Quad PD 5x Telephoto + 48MP Ultra-wide with Macro Focus', NULL, NULL,
  '5060 mAh, 37W Fast Wired + Fast Qi Wireless', NULL, 'Android 14 (7 Years OS, Security & Pixel Drops)', 'Dual 5G SIM (SA/NSA)', 12,
  19, TRUE, TRUE, '["Google Tensor G4 built with DeepMind to run Gemini Nano on-device","Pro triple camera with 8K Video Boost and Night Sight Video","Add Me feature merges photos so everyone is in the group picture","7 full years of Android OS updates, Pixel Feature Drops, and security"]', '2026-09-08T05:26:23.040Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'google-pixel-9-pro', 'Google Pixel Pixel 9 Pro', 'Google Pixel', 'Hazel', 'All the pro cameras and Gemini AI capabilities of the XL in a compact, hand-friendly 6.3-inch design with silky matte glass and polished met', NULL, 'SMARTPHONE',
  109999, NULL, 119999, 4.8, 160,
  '/phones/google-pixel-9-pro.jpg', '["/phones/google-pixel-9-pro.jpg"]', '[{"name":"Hazel","hex":"#7d8471"},{"name":"Porcelain","hex":"#f0eee9"},{"name":"Obsidian","hex":"#222325"}]', '[{"size":"128GB","price":109999},{"size":"256GB","price":119999}]', '16GB', '6.3-inch Super Actua LTPO OLED 1-120Hz, 3000 nits',
  NULL, 'Google Tensor G4 with Titan M2', '50MP + 48MP 5x Telephoto + 48MP Ultra-wide | 42MP Dual PD Selfie', NULL, NULL,
  '4700 mAh, 27W Fast Charging', NULL, 'Android 14 (7 Years Updates)', 'Dual 5G SIM (SA/NSA)', 12,
  19, TRUE, TRUE, '["Compact 6.3-inch Super Actua display with pro 5x telephoto camera","Pixel Studio generative AI image creator built directly into the phone","42MP ultra-wide front camera with autofocus for crisp 4K selfies","Guaranteed 7 years of Android OS and security upgrades"]', '2026-09-08T05:26:23.062Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'google-pixel-9', 'Google Pixel Pixel 9', 'Google Pixel', 'Peony', 'Completely redesigned with satin metal and glossy glass back. Upgraded with 12GB RAM for snappy on-device AI, Magic Editor, and 48MP Ultra-w', NULL, 'SMARTPHONE',
  79999, NULL, 84999, 4.7, 220,
  '/phones/google-pixel-9.jpg', '["/phones/google-pixel-9.jpg"]', '[{"name":"Peony","hex":"#f1abb8"},{"name":"Wintergreen","hex":"#c4d8c8"},{"name":"Porcelain","hex":"#f0eee9"},{"name":"Obsidian","hex":"#222325"}]', '[{"size":"128GB","price":79999},{"size":"256GB","price":89999}]', '12GB', '6.3-inch Actua OLED 60-120Hz, 2700 nits peak',
  NULL, 'Google Tensor G4 with 12GB RAM', '50MP Octa PD Main + 48MP Quad PD Ultra-wide with Macro', NULL, NULL,
  '4700 mAh, 27W Fast Charging', NULL, 'Android 14 with Gemini', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["New modern industrial design with polished glass and satin edges","Upgraded 48MP ultra-wide sensor delivers stunning macro shots","Generative Magic Editor lets you reimagine backgrounds and lighting","7 years of Pixel drops and software updates"]', '2026-09-08T05:26:23.083Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'google-pixel-8a', 'Google Pixel Pixel 8a', 'Google Pixel', 'Bay Blue', 'The AI bargain. Premium matte composite back, rounded corners, Tensor G3 silicon, Best Take, Audio Magic Eraser, and 7 years of flagship sup', NULL, 'SMARTPHONE',
  42999, NULL, 52999, 4.6, 430,
  '/phones/google-pixel-8a.jpg', '["/phones/google-pixel-8a.jpg"]', '[{"name":"Bay Blue","hex":"#8db5df"},{"name":"Aloe Green","hex":"#bad6b7"},{"name":"Obsidian","hex":"#222325"}]', '[{"size":"128GB","price":42999},{"size":"256GB","price":47999}]', '8GB', '6.1-inch Actua OLED 120Hz, Corning Gorilla Glass 3',
  NULL, 'Google Tensor G3 with Titan M2', '64MP Quad PD Main OIS + 13MP Ultra-Wide | 13MP Selfie', NULL, NULL,
  '4492 mAh, 18W Fast Charging + Wireless Qi', NULL, 'Android 14 (7 Years OS Updates)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Best Take feature combines similar group shots into one perfect photo","Audio Magic Eraser cleans background street noise and wind from videos","Smooth 120Hz refresh rate Actua display with 2000 nits peak brightness","Full 7-year software update roadmap identical to flagship models"]', '2026-09-08T05:26:23.105Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-13', 'OnePlus OnePlus 13', 'OnePlus', 'Midnight Black', 'Next-generation powerhouse. Powered by Snapdragon 8 Elite, massive 6000mAh Glacier battery, IP68/IP69 water resistance, and triple 50MP Hass', NULL, 'SMARTPHONE',
  69999, NULL, 76999, 4.9, 140,
  '/phones/oneplus-13.jpg', '["/phones/oneplus-13.jpg"]', '[{"name":"Midnight Black","hex":"#1c1d1f"},{"name":"Arctic Dawn White","hex":"#f2f4f7"},{"name":"Emerald Green","hex":"#1f4339"}]', '[{"size":"256GB","price":69999},{"size":"512GB","price":76999}]', '16GB', '6.82-inch 2K Oriental LTPO OLED 120Hz, DisplayMate A++',
  NULL, 'Snapdragon 8 Elite (3nm) Oryon CPU up to 4.32GHz', '50MP Sony LYT-808 OIS + 50MP Periscope 3x + 50MP Ultra-wide Hasselblad', NULL, NULL,
  '6000 mAh Glacier Silicon-Carbon Battery, 100W SuperVOOC + 50W AIRVOOC', NULL, 'OxygenOS 15 based on Android 15', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Snapdragon 8 Elite octa-core CPU breaking Antutu 3 Million mark","Huge 6000mAh Silicon-Carbon battery with 100W flash charging","IP68 + IP69 dual certified against high-pressure hot water jets","New micro-curved 2K Oriental display readable even with wet hands"]', '2026-09-08T05:26:23.130Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-12', 'OnePlus OnePlus 12', 'OnePlus', 'Flowy Emerald', 'Flagship all-rounder with 4th Gen Hasselblad camera, revolutionary 4500 nits display, Dual Cryo-velocity vapor chamber, and blazing 100W cha', NULL, 'SMARTPHONE',
  64999, NULL, 69999, 4.8, 380,
  '/phones/oneplus-12.jpg', '["/phones/oneplus-12.jpg"]', '[{"name":"Flowy Emerald","hex":"#2b5e48"},{"name":"Silky Black","hex":"#202224"}]', '[{"size":"256GB","price":64999},{"size":"512GB","price":69999}]', '12GB', '6.82-inch 2K 120Hz ProXDR Display, 4500 nits',
  NULL, 'Snapdragon 8 Gen 3 (4nm) with Dual Cryo-velocity VC', '50MP Sony LYT-808 OIS + 64MP 3x Periscope Telephoto + 48MP Ultra-wide Hasselblad', NULL, NULL,
  '5400 mAh, 100W SuperVOOC Wired + 50W AIRVOOC Wireless', NULL, 'OxygenOS 14 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Sony LYT-808 sensor delivers exceptional dynamic range with Hasselblad color","Omni-bearing Dual Cryo-velocity VC cooling (9140 mm²) keeps frame rates locked","5400mAh battery charges to 100% in just 26 minutes","Aqua Touch allows reliable screen inputs in pouring rain"]', '2026-09-08T05:26:23.152Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-12r', 'OnePlus OnePlus 12R', 'OnePlus', 'Cool Blue', 'The performance flagship. Features the largest battery in any OnePlus phone, Snapdragon 8 Gen 2 gaming chip, 1.5K 4th Gen LTPO display, and ', NULL, 'SMARTPHONE',
  39999, NULL, 42999, 4.7, 520,
  '/phones/oneplus-12r.jpg', '["/phones/oneplus-12r.jpg"]', '[{"name":"Cool Blue","hex":"#6fa1d2"},{"name":"Iron Gray","hex":"#3b3d40"}]', '[{"size":"128GB","price":39999},{"size":"256GB","price":42999}]', '8GB / 16GB', '6.78-inch 1.5K LTPO4 AMOLED 1-120Hz, 4500 nits peak',
  NULL, 'Snapdragon 8 Gen 2 (4nm)', '50MP Sony IMX890 OIS + 8MP Ultra-wide + 2MP Macro', NULL, NULL,
  '5500 mAh, 100W SuperVOOC', NULL, 'OxygenOS 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Snapdragon 8 Gen 2 flagship chip with Trinity Engine optimization","Massive 5500mAh battery delivers up to 2 days of endurance","World-first 4th Gen LTPO 1-120Hz screen adjusts refresh in 1ms","100W fast charging recharges the entire 5500mAh cell in 26 minutes"]', '2026-09-08T05:26:23.170Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-nord-4', 'OnePlus OnePlus Nord 4 5G', 'OnePlus', 'Mercurial Silver', 'The only all-metal unibody smartphone in the 5G era. Precision crafted from single aluminum plate with Snapdragon 7+ Gen 3 and 100W charging', NULL, 'SMARTPHONE',
  29999, NULL, 32999, 4.6, 310,
  '/phones/oneplus-nord-4.jpg', '["/phones/oneplus-nord-4.jpg"]', '[{"name":"Mercurial Silver","hex":"#c8ccd0"},{"name":"Oasis Green","hex":"#7da88e"},{"name":"Obsidian Midnight","hex":"#1f2124"}]', '[{"size":"128GB","price":29999},{"size":"256GB","price":32999}]', '8GB / 12GB', '6.74-inch 1.5K 120Hz Ultra-bright AMOLED, 2150 nits',
  NULL, 'Snapdragon 7+ Gen 3 5G (4nm)', '50MP Sony LYT-600 OIS + 8MP Ultra-wide | 16MP Selfie', NULL, NULL,
  '5500 mAh, 100W SuperVOOC Fast Charging', NULL, 'OxygenOS 14.1 (4 OS Upgrades Guaranteed)', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Sleek 7.99mm full-metal unibody chassis with nano-etched textures","Snapdragon 7+ Gen 3 chip sharing Cortex-X4 architecture with 8 Gen 3","5500mAh battery keeps over 80% health after 4 years of daily charges","4 major Android OS updates & 6 years of security patches"]', '2026-09-08T05:26:23.186Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-nord-ce4-lite', 'OnePlus OnePlus Nord CE4 Lite 5G', 'OnePlus', 'Mega Blue', 'Segment-shattering 2100 nits AMOLED screen with Aqua Touch, Sony LYT-600 OIS camera, 5500mAh battery, and 80W flash charging in the box.', NULL, 'SMARTPHONE',
  17999, NULL, 20999, 4.5, 450,
  '/phones/oneplus-nord-ce4-lite.jpg', '["/phones/oneplus-nord-ce4-lite.jpg"]', '[{"name":"Mega Blue","hex":"#1c60be"},{"name":"Super Silver","hex":"#d8dce2"}]', '[{"size":"128GB","price":17999}]', '8GB', '6.67-inch AMOLED 120Hz, 2100 nits peak, Aqua Touch',
  NULL, 'Qualcomm Snapdragon 695 5G (6nm)', '50MP Sony LYT-600 OIS + 2MP Depth Camera', NULL, NULL,
  '5500 mAh, 80W SuperVOOC + 5W Reverse Charging', NULL, 'OxygenOS 14 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Class-leading 2100 nits peak brightness 120Hz AMOLED display","Sony LYT-600 50MP sensor with optical image stabilization (OIS)","Huge 5500mAh battery with 80W charging reaching full in 52 mins","300% Ultra Volume Mode dual stereo speakers & 3.5mm audio jack"]', '2026-09-08T05:26:23.209Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'xiaomi-14-ultra', 'Xiaomi Xiaomi 14 Ultra', 'Xiaomi', 'White Photography Edition', 'The camera milestone. 1-inch Sony LYT-900 sensor with variable stepless aperture, Quad 50MP Leica Summilux lenses, and professional 8K all-c', NULL, 'SMARTPHONE',
  99999, NULL, 119999, 4.8, 180,
  '/phones/xiaomi-14-ultra.jpg', '["/phones/xiaomi-14-ultra.jpg"]', '[{"name":"White Vegan Leather","hex":"#f0ede8"},{"name":"Black Vegan Leather","hex":"#222325"}]', '[{"size":"512GB","price":99999}]', '16GB', '6.73-inch WQHD+ 120Hz LTPO AMOLED, 3000 nits',
  NULL, 'Snapdragon 8 Gen 3 (4nm) with Dual-Channel IceLoop', 'Leica Quad 50MP: 1-inch LYT-900 Stepless f/1.63-f/4.0 + 50MP 3.2x Tele + 50MP 5x Periscope + 50MP Ultra-wide', NULL, NULL,
  '5000 mAh, 90W HyperCharge + 80W Wireless', NULL, 'Xiaomi HyperOS based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, TRUE, '["1-inch Sony LYT-900 sensor with mechanical 1024-step variable aperture","Quad 50MP Leica optics covering 12mm to 120mm focal lengths","Dual-Channel IceLoop cooling pump separates SoC and camera cooling","Titanium-like Xiaomi Shield Glass with 10x higher drop resistance"]', '2026-09-08T05:26:23.237Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'xiaomi-14', 'Xiaomi Xiaomi 14', 'Xiaomi', 'Jade Green', 'Compact flagship mastery. 6.36-inch 1.5K screen with 1.61mm razor bezels, Leica 75mm floating telephoto macro lens, and 90W charging.', NULL, 'SMARTPHONE',
  59999, NULL, 69999, 4.7, 260,
  '/phones/xiaomi-14.jpg', '["/phones/xiaomi-14.jpg"]', '[{"name":"Jade Green","hex":"#5a7a67"},{"name":"Black","hex":"#202124"},{"name":"White","hex":"#f5f5f7"}]', '[{"size":"512GB","price":59999}]', '12GB', '6.36-inch 1.5K LTPO AMOLED 1-120Hz, 3000 nits, ultra-narrow 1.61mm bezels',
  NULL, 'Snapdragon 8 Gen 3 (4nm)', 'Leica Triple 50MP: Light Fusion 900 OIS + 50MP 75mm Floating Telephoto + 50MP Ultra-wide', NULL, NULL,
  '4610 mAh, 90W Wired + 50W Wireless HyperCharge', NULL, 'Xiaomi HyperOS', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Compact 6.36-inch design with symmetrical 1.61mm ultra-thin borders","Leica 75mm floating telephoto focuses from 10cm macro to infinity","Snapdragon 8 Gen 3 flagship platform with IceLoop thermal system","90W wired HyperCharge tops up from 0 to 100% in 31 minutes"]', '2026-09-08T05:26:23.259Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'redmi-note-13-pro-plus', 'Redmi Redmi Note 13 Pro+ 5G', 'Redmi', 'Fusion Purple', 'Redmi''s first IP68 rated curved screen smartphone. Packs a 200MP OIS camera with 4x lossless sensor zoom and 120W charging.', NULL, 'SMARTPHONE',
  30999, NULL, 35999, 4.6, 580,
  '/phones/redmi-note-13-pro-plus.jpg', '["/phones/redmi-note-13-pro-plus.jpg"]', '[{"name":"Fusion Purple Vegan Leather","hex":"#9b8ba9"},{"name":"Fusion Black","hex":"#242528"},{"name":"Fusion White","hex":"#f0f0f2"}]', '[{"size":"256GB","price":30999},{"size":"512GB","price":33999}]', '8GB / 12GB', '6.67-inch 1.5K 120Hz 3D Curved AMOLED, Gorilla Glass Victus',
  NULL, 'MediaTek Dimensity 7200-Ultra (4nm)', '200MP Samsung ISOCELL HP3 OIS + 8MP Ultra-wide + 2MP Macro', NULL, NULL,
  '5000 mAh, 120W HyperCharge (19 mins full)', NULL, 'Xiaomi HyperOS', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["200MP main camera with in-sensor 4x lossless zoom and OIS","Flagship 120W HyperCharge recharges full 5000mAh battery in 19 mins","IP68 dust and water resistance with 3D curved 1.5K AMOLED display","Corning Gorilla Glass Victus with in-display heart rate detection"]', '2026-09-08T05:26:23.281Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'redmi-13c-5g', 'Redmi Redmi 13C 5G', 'Redmi', 'Starfrost Green', 'India''s accessible 5G superstar. Star Trail design with 50MP AI Dual Camera, smooth 90Hz display, and 5000mAh battery.', NULL, 'SMARTPHONE',
  10499, NULL, 13999, 4.4, 720,
  '/phones/redmi-13c-5g.jpg', '["/phones/redmi-13c-5g.jpg"]', '[{"name":"Starfrost Green","hex":"#385e50"},{"name":"Starlight Black","hex":"#1a1a1a"},{"name":"Startrail Silver","hex":"#d1d5db"}]', '[{"size":"128GB","price":10499}]', '4GB / 6GB', '6.74-inch HD+ 90Hz Dynamic Refresh, Corning Gorilla Glass',
  NULL, 'MediaTek Dimensity 6100+ 5G (6nm)', '50MP f/1.8 AI Dual Camera | 5MP Selfie', NULL, NULL,
  '5000 mAh, 18W Fast Charging', NULL, 'MIUI 14 based on Android 13', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["MediaTek Dimensity 6100+ processor with Antutu 400K+ benchmark","50MP AI primary camera with portrait and night shooting modes","Massive 5000mAh battery with Type-C 18W charging support","Dual 5G SIM standby with side-mounted fingerprint unlock"]', '2026-09-08T05:26:23.303Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'realme-gt-6', 'Realme Realme GT 6', 'Realme', 'Fluid Silver', 'The AI flagship killer. World-record 6000 nits 8T LTPO display, Snapdragon 8s Gen 3 chip, Sony LYT-808 optics, and 120W charge.', NULL, 'SMARTPHONE',
  40999, NULL, 44999, 4.7, 340,
  '/phones/realme-gt-6.jpg', '["/phones/realme-gt-6.jpg"]', '[{"name":"Fluid Silver","hex":"#c0c4c8"},{"name":"Razor Green","hex":"#233d31"}]', '[{"size":"256GB","price":40999},{"size":"512GB","price":44999}]', '8GB / 12GB / 16GB', '6.78-inch 1.5K 8T LTPO 120Hz, 6000 nits peak brightness',
  NULL, 'Snapdragon 8s Gen 3 (4nm) with Iceberg Vapor Cooling', '50MP Sony LYT-808 OIS + 50MP 2x Telephoto + 8MP Ultra-wide', NULL, NULL,
  '5500 mAh, 120W SUPERVOOC (50% in 10 mins)', NULL, 'Realme UI 5.0 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Record-breaking 6000 nits peak brightness display with SGS eye protection","Snapdragon 8s Gen 3 processor achieves over 1.6 Million Antutu score","Sony LYT-808 50MP sensor with HyperTone image engine","120W SUPERVOOC recharges 5500mAh cell to 50% in just 10 minutes"]', '2026-09-08T05:26:23.322Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'realme-12-pro-5g', 'Realme Realme 12 Pro+ 5G', 'Realme', 'Submarine Blue', 'Luxury watch design by Ollivier Saveo. Flagship 64MP periscope telephoto lens with 120x SuperZoom and Sony IMX890 sensor.', NULL, 'SMARTPHONE',
  29999, NULL, 34999, 4.6, 460,
  '/phones/realme-12-pro-5g.jpg', '["/phones/realme-12-pro-5g.jpg"]', '[{"name":"Submarine Blue","hex":"#1f3b5c"},{"name":"Navigator Beige","hex":"#d8cca3"}]', '[{"size":"256GB","price":29999}]', '8GB / 12GB', '6.7-inch FHD+ 120Hz Curved OLED, 2160Hz PWM Dimming',
  NULL, 'Snapdragon 7s Gen 2 (4nm)', '64MP Periscope Portrait 3x OIS + 50MP Sony IMX890 OIS + 8MP Ultra-wide', NULL, NULL,
  '5000 mAh, 67W SUPERVOOC', NULL, 'Realme UI 5.0', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Omni-directional 64MP periscope telephoto camera with 3x optical & 120x digital zoom","Swiss luxury watch inspired fluted bezel and premium vegan leather finish","Sony IMX890 50MP OIS sensor for crisp nighttime portrait shots","120Hz curved AMOLED display with 2160Hz high-frequency eye protection"]', '2026-09-08T05:26:23.340Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'realme-narzo-70x-5g', 'Realme Realme Narzo 70x 5G', 'Realme', 'Ice Blue', 'Fastest charging 5G phone under 12K. 45W SUPERVOOC, smooth 120Hz FHD+ display, IP54 dust and splash proof rating, and stereo speakers.', NULL, 'SMARTPHONE',
  11999, NULL, 14999, 4.5, 610,
  '/phones/realme-narzo-70x-5g.jpg', '["/phones/realme-narzo-70x-5g.jpg"]', '[{"name":"Ice Blue","hex":"#a4c4de"},{"name":"Forest Green","hex":"#3b5c47"}]', '[{"size":"128GB","price":11999}]', '6GB', '6.72-inch FHD+ 120Hz Ultra Smooth Display',
  NULL, 'MediaTek Dimensity 6100+ 5G (6nm)', '50MP AI Primary Camera + 2MP Depth | 8MP Selfie', NULL, NULL,
  '5000 mAh, 45W SUPERVOOC Fast Charge', NULL, 'Realme UI 5.0 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Class-leading 45W SUPERVOOC charges 50% in approximately 30 minutes","Silky smooth 120Hz FHD+ screen with dynamic refresh rate switching","IP54 dust and splash water protection with Rainwater Smart Touch","Dual stereo speakers with Hi-Res audio certification"]', '2026-09-08T05:26:23.362Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-x100-pro', 'Vivo Vivo X100 Pro', 'Vivo', 'Asteroid Black', 'Co-engineered with Zeiss. Features the revolutionary Zeiss APO certified floating telephoto lens, 1-inch main sensor, and 4K cinematic portr', NULL, 'SMARTPHONE',
  89999, NULL, 96999, 4.8, 190,
  '/phones/vivo-x100-pro.jpg', '["/phones/vivo-x100-pro.jpg"]', '[{"name":"Asteroid Black","hex":"#1f2022"},{"name":"Sunset Orange","hex":"#e26d36"}]', '[{"size":"512GB","price":89999}]', '16GB', '6.78-inch 1.5K LTPO AMOLED 120Hz, 3000 nits, Zeiss T*',
  NULL, 'MediaTek Dimensity 9300 (4nm) + Vivo V3 Imaging Chip', '50MP 1-inch Sony IMX989 OIS + 50MP Zeiss APO Floating Telephoto + 50MP Ultra-wide', NULL, NULL,
  '5400 mAh BlueVolt Battery, 100W FlashCharge + 50W Wireless', NULL, 'Funtouch OS 14 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  55, TRUE, TRUE, '["Zeiss APO floating periscope camera achieves true chromatic aberration correction","1-inch Sony IMX989 sensor with Zeiss T* anti-reflective optical lens coating","Vivo V3 6nm custom imaging chip enables 4K Movie Portrait video","5400mAh high-density BlueVolt battery with 100W dual-cell flash charging"]', '2026-09-08T05:26:23.375Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-v40-pro-5g', 'Vivo Vivo V40 Pro 5G', 'Vivo', 'Ganges Blue', 'All 50MP Zeiss Quad-Camera setup with Smart Aura Light. Ultra-slim 7.58mm 3D curved body housing a mammoth 5500mAh BlueVolt battery and IP68', NULL, 'SMARTPHONE',
  49999, NULL, 54999, 4.7, 320,
  '/phones/vivo-v40-pro-5g.jpg', '["/phones/vivo-v40-pro-5g.jpg"]', '[{"name":"Ganges Blue","hex":"#3a6b88"},{"name":"Titanium Grey","hex":"#72777f"}]', '[{"size":"256GB","price":49999},{"size":"512GB","price":54999}]', '8GB / 12GB', '6.78-inch 1.5K 120Hz 3D Curved AMOLED, 4500 nits peak',
  NULL, 'MediaTek Dimensity 9200+ (4nm)', 'Zeiss 50MP Sony IMX921 OIS + 50MP 2x Telephoto + 50MP Ultra-wide + 50MP Group Selfie', NULL, NULL,
  '5500 mAh BlueVolt Battery, 80W FlashCharge', NULL, 'Funtouch OS 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Quad 50MP Zeiss camera system including 50MP autofocus front selfie lens","Smart Aura Light portrait system dynamically adjusts color temperature","Slim 7.58mm curved body with IP68/IP69 dual water resistance","MediaTek Dimensity 9200+ flagship grade silicon with Antutu 1.5M+"]', '2026-09-08T05:26:23.390Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-t3-5g', 'Vivo Vivo T3 5G', 'Vivo', 'Cosmic Blue', 'Fastest phone in the segment with 734K+ Antutu score. Vibrant 120Hz AMOLED display, Sony OIS camera, and stereo speakers.', NULL, 'SMARTPHONE',
  19999, NULL, 22999, 4.5, 480,
  '/phones/vivo-t3-5g.jpg', '["/phones/vivo-t3-5g.jpg"]', '[{"name":"Cosmic Blue","hex":"#224270"},{"name":"Crystal Flake","hex":"#b4d8e8"}]', '[{"size":"128GB","price":19999},{"size":"256GB","price":21999}]', '8GB', '6.67-inch FHD+ AMOLED 120Hz, 1800 nits, In-display Fingerprint',
  NULL, 'MediaTek Dimensity 7200 5G (4nm)', '50MP Sony IMX882 OIS + 2MP Bokeh Camera | 16MP Selfie', NULL, NULL,
  '5000 mAh, 44W FlashCharge', NULL, 'Funtouch OS 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["MediaTek Dimensity 7200 4nm processor leading performance under ₹20,000","Sony IMX882 50MP OIS sensor for super-steady night photos and 4K video","Ultra-bright 1800 nits 120Hz AMOLED panel with in-display fingerprint sensor","Dual stereo speakers with audio booster"]', '2026-09-08T05:26:23.407Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'motorola-edge-50-ultra', 'Motorola Motorola Edge 50 Ultra', 'Motorola', 'Nordic Wood', 'Handcrafted real wood back edition. World''s first Pantone validated camera and display, 144Hz pOLED, 125W charging, and IP68 underwater prot', NULL, 'SMARTPHONE',
  59999, NULL, 64999, 4.7, 160,
  '/phones/motorola-edge-50-ultra.jpg', '["/phones/motorola-edge-50-ultra.jpg"]', '[{"name":"Nordic Wood","hex":"#ba9f83"},{"name":"Peach Fuzz Pantone","hex":"#fdb597"},{"name":"Forest Grey Vegan Leather","hex":"#3c4342"}]', '[{"size":"512GB","price":59999}]', '16GB', '6.7-inch 1.5K Super HD pOLED 144Hz Pantone Validated',
  NULL, 'Snapdragon 8s Gen 3 (4nm) with Moto AI', '50MP OIS + 64MP 3x Periscope OIS + 50MP Ultra-wide/Macro | 50MP Selfie', NULL, NULL,
  '4500 mAh, 125W TurboPower + 50W Wireless Charging', NULL, 'Hello UI based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Genuine FSC-certified real wood back finish infused with subtle fragrance","Triple 50MP/64MP camera system with Pantone validated colors and skin tones","144Hz 1.5K curved pOLED display with Gorilla Glass Victus","125W wired TurboPower plus 50W wireless charging capability"]', '2026-09-08T05:26:23.423Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'motorola-edge-50-pro', 'Motorola Motorola Edge 50 Pro', 'Motorola', 'Luxe Lavender', 'Segment''s most stylish curved phone. Silicone vegan leather, aluminum frame, 125W wired + 50W wireless charging, and 50MP f/1.4 camera.', NULL, 'SMARTPHONE',
  31999, NULL, 36999, 4.6, 380,
  '/phones/motorola-edge-50-pro.jpg', '["/phones/motorola-edge-50-pro.jpg"]', '[{"name":"Luxe Lavender","hex":"#a49bb5"},{"name":"Moonlight Pearl Handcrafted","hex":"#eae6df"},{"name":"Black Beauty","hex":"#232427"}]', '[{"size":"256GB","price":31999}]', '12GB', '6.7-inch 1.5K 144Hz 3D Curved pOLED, 2000 nits peak',
  NULL, 'Snapdragon 7 Gen 3 (4nm)', '50MP f/1.4 OIS + 10MP 3x Telephoto + 13MP Ultra-wide/Macro | 50MP Autofocus Selfie', NULL, NULL,
  '4500 mAh, 125W TurboPower + 50W Wireless', NULL, 'Hello UI based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["True 144Hz 1.5K curved pOLED with 100% DCI-P3 color gamut","50MP primary sensor with widest-in-segment f/1.4 aperture for low light","Rare in segment 50W wireless charging support + 125W wired charging","IP68 underwater protection with aircraft-grade aluminum frame"]', '2026-09-08T05:26:23.442Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'moto-g34-5g', 'Motorola Motorola Moto G34 5G', 'Motorola', 'Ocean Green', 'India''s most affordable Snapdragon 5G. Vegan leather luxury with 120Hz display, clean ad-free software, and Moto Gestures.', NULL, 'SMARTPHONE',
  11999, NULL, 14999, 4.5, 520,
  '/phones/moto-g34-5g.jpg', '["/phones/moto-g34-5g.jpg"]', '[{"name":"Ocean Green Vegan Leather","hex":"#2b585c"},{"name":"Charcoal Black","hex":"#1f2122"},{"name":"Ice Blue","hex":"#a2c1db"}]', '[{"size":"128GB","price":11999}]', '8GB', '6.5-inch HD+ 120Hz Display with Dolby Atmos stereo',
  NULL, 'Snapdragon 695 5G (6nm)', '50MP Quad Pixel + 2MP Macro | 16MP Selfie', NULL, NULL,
  '5000 mAh, 20W TurboPower', NULL, 'Android 14 Clean UI', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Qualcomm Snapdragon 695 5G processor with 13 5G bands","Premium soft vegan leather finish on back panel","Smooth 120Hz display with stereo speakers tuned by Dolby Atmos","Clean pure Android 14 interface with zero bloatware or adware"]', '2026-09-08T05:26:23.461Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'nothing-phone-2a-plus', 'Nothing Nothing Phone (2a) Plus', 'Nothing', 'Metallic Grey', 'Upgraded metallic finish with iconic Glyph lighting. Dimensity 7350 Pro 5G chip, triple 50MP camera setup (including 50MP selfie), and clean', NULL, 'SMARTPHONE',
  27999, NULL, 29999, 4.7, 220,
  '/phones/nothing-phone-2a-plus.jpg', '["/phones/nothing-phone-2a-plus.jpg"]', '[{"name":"Metallic Grey","hex":"#63676c"},{"name":"Metallic Black","hex":"#222326"}]', '[{"size":"256GB","price":27999}]', '8GB / 12GB', '6.7-inch Flexible AMOLED 120Hz, 1300 nits, Glyph Interface',
  NULL, 'MediaTek Dimensity 7350 Pro 5G (4nm)', '50MP Samsung GN9 OIS + 50MP Ultra-wide | 50MP 4K Selfie', NULL, NULL,
  '5000 mAh, 50W Fast Charging', NULL, 'Nothing OS 2.6 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Iconic Glyph Interface with programmable LED light strips for notifications & timer","Triple 50MP camera system with 4K recording on both front and rear lenses","Dimensity 7350 Pro co-engineered with Nothing for 10% faster graphics","Distinctive transparent design with premium metallic circuit finish"]', '2026-09-08T05:26:23.476Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'nothing-phone-2a', 'Nothing Nothing Phone (2a)', 'Nothing', 'White Transparent', 'Fresh design perspective. Transparent back showing the phone''s internal architecture, symmetrical bezels, dual 50MP cameras, and Glyph light', NULL, 'SMARTPHONE',
  23999, NULL, 25999, 4.6, 440,
  '/phones/nothing-phone-2a.jpg', '["/phones/nothing-phone-2a.jpg"]', '[{"name":"White","hex":"#f2f3f5"},{"name":"Black","hex":"#1f2022"},{"name":"Special Edition (Red/Yellow/Blue)","hex":"#e0d7c7"}]', '[{"size":"128GB","price":23999},{"size":"256GB","price":25999}]', '8GB', '6.7-inch Flexible AMOLED 30-120Hz, symmetrical 2.1mm bezels',
  NULL, 'MediaTek Dimensity 7200 Pro 5G (4nm)', '50MP OIS + 50MP Ultra-Wide | 32MP Selfie', NULL, NULL,
  '5000 mAh, 45W Fast Charging', NULL, 'Nothing OS 2.6', 'Dual 5G SIM (SA/NSA)', 12,
  19, TRUE, FALSE, '["Transparent casing exposes the phone''s camera module and ribbon cables","Custom 4nm Dimensity 7200 Pro delivers power and exceptional efficiency","3-part Glyph Interface acts as flash, volume meter, and timer","Clean Nothing OS with bespoke widgets, monochrome icons, and no bloatware"]', '2026-09-08T05:26:23.489Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iqoo-12-5g', 'iQOO iQOO 12 5G', 'iQOO', 'Legend White', 'BMW M Motorsport Legend Edition. Powered by Snapdragon 8 Gen 3 with dedicated Q1 gaming chip for 144fps game frame interpolation and 64MP pe', NULL, 'SMARTPHONE',
  52999, NULL, 59999, 4.8, 310,
  '/phones/iqoo-12-5g.jpg', '["/phones/iqoo-12-5g.jpg"]', '[{"name":"Legend White (BMW M Motorsport)","hex":"#f4f5f8"},{"name":"Alpha Black","hex":"#1c1d1f"}]', '[{"size":"256GB","price":52999},{"size":"512GB","price":57999}]', '12GB / 16GB', '6.78-inch 1.5K LTPO AMOLED 144Hz, 3000 nits, 2160Hz PWM',
  NULL, 'Snapdragon 8 Gen 3 (4nm) + Supercomputing Chip Q1', '50MP Astrography Camera OIS + 64MP 3x Periscope Telephoto + 50MP Ultra-wide', NULL, NULL,
  '5000 mAh, 120W FlashCharge in the box', NULL, 'Funtouch OS 14 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Snapdragon 8 Gen 3 with Supercomputing Chip Q1 enabling 144fps gaming","64MP Periscope Telephoto camera with 3x optical and 100x digital zoom","BMW M Motorsport tri-color stripe with porcelain enamel glass finish","120W FlashCharge juices the battery from 0 to 100% in just 27 minutes"]', '2026-09-08T05:26:23.505Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iqoo-z9-5g', 'iQOO iQOO Z9 5G', 'iQOO', 'Brushed Green', 'Segment''s performance champion with 730K+ Antutu benchmark. Sony OIS 50MP camera, 1800 nits AMOLED screen, and brushed textured design.', NULL, 'SMARTPHONE',
  19999, NULL, 24999, 4.5, 490,
  '/phones/iqoo-z9-5g.jpg', '["/phones/iqoo-z9-5g.jpg"]', '[{"name":"Brushed Green","hex":"#3b6d57"},{"name":"Graphene Blue","hex":"#26354a"}]', '[{"size":"128GB","price":19999},{"size":"256GB","price":21999}]', '8GB', '6.67-inch FHD+ 120Hz AMOLED, 1800 nits peak',
  NULL, 'MediaTek Dimensity 7200 5G (4nm)', '50MP Sony IMX882 OIS + 2MP Bokeh Camera', NULL, NULL,
  '5000 mAh, 44W FlashCharge', NULL, 'Funtouch OS 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["Dimensity 7200 4nm architecture provides leading gaming performance in class","Sony IMX882 sensor with 4K recording and Optical Image Stabilization","Dual stereo speakers with 300% volume mode for immersive gaming audio","Ultra-slim 7.83mm lightweight body with brushed metallic back pattern"]', '2026-09-08T05:26:23.519Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oppo-find-x7-ultra', 'Oppo Oppo Find X7 Ultra', 'Oppo', 'Ocean Blue', 'The world''s first smartphone with dual periscope telephoto cameras. Quad 50MP camera system tuned by Hasselblad with 1-inch Sony LYT-900 sen', NULL, 'SMARTPHONE',
  79999, NULL, 89999, 4.8, 140,
  '/phones/oppo-find-x7-ultra.jpg', '["/phones/oppo-find-x7-ultra.jpg"]', '[{"name":"Ocean Blue Leather","hex":"#2b547e"},{"name":"Sepia Brown Leather","hex":"#70483c"}]', '[{"size":"512GB","price":79999}]', '16GB', '6.82-inch 2K LTPO AMOLED 120Hz, 4500 nits peak, Dolby Vision',
  NULL, 'Snapdragon 8 Gen 3 (4nm)', 'Quad 50MP Main: 1-inch LYT-900 OIS + 50MP 3x Periscope + 50MP 6x Periscope + 50MP Ultra-wide Hasselblad', NULL, NULL,
  '5000 mAh, 100W SuperVOOC + 50W AirVOOC', NULL, 'ColorOS 14 based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["World-first Dual Periscope zoom system (65mm 3x and 135mm 6x lenses)","Sony LYT-900 1-inch main sensor with exceptional dynamic range","Hasselblad Master Camera System with natural color calibration","Dual-material design combining premium tailored leather and glass"]', '2026-09-08T05:26:23.534Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oppo-reno-12-pro', 'Oppo Oppo Reno 12 Pro 5G', 'Oppo', 'Sunset Gold', 'AI Portrait Expert. All-around Armour body with Splash Touch, dual 50MP Sony portrait cameras, and integrated GenAI Studio tools.', NULL, 'SMARTPHONE',
  36999, NULL, 40999, 4.6, 320,
  '/phones/oppo-reno-12-pro.jpg', '["/phones/oppo-reno-12-pro.jpg"]', '[{"name":"Sunset Gold","hex":"#e2b87f"},{"name":"Space Brown","hex":"#463836"}]', '[{"size":"256GB","price":36999},{"size":"512GB","price":39999}]', '12GB', '6.7-inch Quad-Curved Infinite View AMOLED 120Hz',
  NULL, 'MediaTek Dimensity 7300-Energy 5G (4nm)', '50MP Sony LYT-600 OIS + 50MP 2x Telephoto Portrait + 8MP Ultra-wide | 50MP Autofocus Selfie', NULL, NULL,
  '5000 mAh, 80W SuperVOOC Flash Charge', NULL, 'ColorOS 14.1 with AI Portrait Suite', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["GenAI features including AI Eraser 2.0, AI Best Face, and AI Studio avatars","High-strength sponge bionic cushioning structure survives extreme drops","Dual 50MP portrait camera setup with dedicated telephoto sensor","Splash Touch allows flawless touchscreen navigation with wet fingers"]', '2026-09-08T05:26:23.547Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'sony-xperia-1-vi', 'Sony Sony Xperia 1 VI', 'Sony', 'Platinum Silver', 'Pro photography engineering by Alpha camera makers. Features world-first true optical continuous zoom lens (85mm to 170mm), dedicated physic', NULL, 'SMARTPHONE',
  139999, NULL, 149999, 4.7, 95,
  '/phones/sony-xperia-1-vi.jpg', '["/phones/sony-xperia-1-vi.jpg"]', '[{"name":"Platinum Silver","hex":"#cfd2d6"},{"name":"Black","hex":"#222325"}]', '[{"size":"256GB","price":139999}]', '12GB', '6.5-inch FHD+ LTPO OLED 1-120Hz Powered by BRAVIA, 240Hz Touch',
  NULL, 'Snapdragon 8 Gen 3 (4nm) with vapor chamber cooling', '48MP Exmor T for mobile + 12MP 85-170mm True Optical Continuous Zoom Telephoto + 12MP Zeiss T*', NULL, NULL,
  '5000 mAh, 30W Fast Charging + Qi Wireless', NULL, 'Android 14 (3 OS Upgrades, 4 Years Security)', 'Dual 5G SIM (SA/NSA)', 12,
  19, TRUE, TRUE, '["Continuous optical zoom from 85mm to 170mm without digital degradation","Dedicated physical two-stage camera shutter button with tactile knurling","Exmor T for mobile stacked transistor sensor captures incredible night detail","Full-stage front stereo speakers and 3.5mm gold-plated headphone jack"]', '2026-09-08T05:26:23.560Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'asus-rog-phone-8-pro', 'Asus Asus ROG Phone 8 Pro', 'Asus', 'Phantom Black', 'The ultimate gaming phone transformed into a sleek daily flagship. AniMe Matrix programmable mini-LED back display, ultrasonic AirTrigger sh', NULL, 'SMARTPHONE',
  94999, NULL, 104999, 4.8, 130,
  '/phones/asus-rog-phone-8-pro.jpg', '["/phones/asus-rog-phone-8-pro.jpg"]', '[{"name":"Phantom Black with AniMe Matrix","hex":"#1a1b1e"}]', '[{"size":"512GB","price":94999}]', '16GB', '6.78-inch Samsung Flexible AMOLED 165Hz LTPO, 2500 nits',
  NULL, 'Snapdragon 8 Gen 3 (4nm) with GameCool 8 cooling system', '50MP Sony IMX890 with 6-Axis Gimbal Stabilizer + 32MP 3x OIS + 13MP Ultra-wide', NULL, NULL,
  '5500 mAh, 65W HyperCharge + 15W Qi Wireless', NULL, 'ROG UI based on Android 14', 'Dual 5G SIM (SA/NSA)', 12,
  19, TRUE, TRUE, '["AniMe Vision customizable 341 mini-LED display on rear glass","AirTrigger ultrasonic shoulder triggers simulate physical console buttons","Built-in 6-Axis Hybrid Gimbal Stabilizer 3.0 keeps video rock-steady","IP68 dust and water resistance in a redesigned 8.9mm slim form factor"]', '2026-09-08T05:26:23.572Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'nokia-g42-5g', 'Nokia Nokia G42 5G', 'Nokia', 'So Purple', 'QuickFix DIY repairable smartphone. Built with 65% recycled plastic, 3-day battery life, clean stock Android experience, and 50MP AI camera.', NULL, 'SMARTPHONE',
  12999, NULL, 15999, 4.4, 390,
  '/phones/nokia-g42-5g.jpg', '["/phones/nokia-g42-5g.jpg"]', '[{"name":"So Purple","hex":"#7a5c8e"},{"name":"So Grey","hex":"#4a4c50"}]', '[{"size":"128GB","price":12999}]', '6GB', '6.56-inch HD+ 90Hz, Corning Gorilla Glass 3',
  NULL, 'Qualcomm Snapdragon 480+ 5G (8nm)', '50MP AI Triple Camera + 2MP Depth + 2MP Macro | 8MP Selfie', NULL, NULL,
  '5000 mAh, 3-Day Battery Life, 20W Fast Charging', NULL, 'Android 14 Pure Clean OS with zero bloatware', 'Dual 5G SIM (SA/NSA)', 12,
  20, TRUE, FALSE, '["QuickFix repairability lets users easily swap screen or battery via iFixit guides","Massive 5000mAh battery delivers up to 3 days of battery life per charge","OZO 3D audio recording captures true spatial sound","Clean stock Android 14 with guaranteed monthly security updates"]', '2026-09-08T05:26:23.586Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  '88be9664-ba5a-4d9c-8f2e-0c48bfd0c8de', 'Google Pixel Pixel 9 Pro Fold', 'Google Pixel', 'Google Pixel', 'Google revolutionary foldable with Gemini AI built-in and advanced triple camera', NULL, 'SMARTPHONE',
  172999, NULL, 189999, 4.8, 120,
  '/phones/google-pixel-9-pro.jpg', '["/phones/google-pixel-9-pro.jpg"]', '[{"name":"Obsidian Black","hex":"#333333","inStock":true}]', '[{"size":"512GB","priceDiff":0}]', '16GB', '6.7" OLED 120Hz',
  NULL, 'Flagship Octa-Core Processor', '50MP Main OIS + Ultra-wide', NULL, NULL,
  '5000 mAh, Fast Charging', NULL, 'Android 14', 'Dual 5G', 12,
  19, TRUE, FALSE, '["6.7\" OLED 120Hz","Flagship Octa-Core Processor","50MP Main OIS + Ultra-wide"]', '2026-09-12T10:58:32.710Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-s26-ultra', 'Samsung Galaxy S26 Ultra', 'Samsung', 'Titanium Silver Shadow', 'Samsung''s 2026 definitive AI flagship. Snapdragon 8 Elite Gen 2, 200MP Quad Telephoto with 100x Space Zoom, built-in S-Pen, and Gorilla Armor 2.', 'Galaxy S26 Ultra', 'SMARTPHONE',
  134999, NULL, 144999, 4.9, 420,
  '/phones/samsung-galaxy-s26-ultra.jpg', '["/phones/samsung-galaxy-s26-ultra.jpg"]', '[{"name":"Titanium Silver Shadow","hex":"#8e9094"},{"name":"Titanium Black","hex":"#2b2b2c"},{"name":"Titanium Amber","hex":"#c89650"},{"name":"Titanium Violet","hex":"#695a79"}]', '[{"size":"256GB","price":134999},{"size":"512GB","price":149999},{"size":"1TB","price":169999}]', '12GB / 16GB', '6.8-inch Dynamic AMOLED 2X QHD+ 1-120Hz LTPO, 3200 nits, Anti-Reflective Gorilla Armor 2',
  NULL, 'Qualcomm Snapdragon 8 Elite Gen 2 for Galaxy (3nm)', '200MP OIS (F1.7) + 50MP Periscope (5x) + 50MP Telephoto (3x) + 50MP Ultra-Wide | 12MP Dual Pixel AF', NULL, NULL,
  '5200 mAh, 65W Wired Fast Charging, 25W Fast Wireless, Reverse Wireless', NULL, 'One UI 8.5 based on Android 16 (7 Generations OS Upgrades)', 'Dual 5G SIM (SA/NSA)', 12,
  45, TRUE, TRUE, '["Snapdragon 8 Elite Gen 2 (3nm) with custom NPU for on-device Galaxy AI","200MP Quad Telephoto Camera setup with 100x Space Zoom and 8K 60fps video","Anti-Reflective Corning Gorilla Armor 2 QHD+ 120Hz LTPO display with 3200 nits","Integrated S-Pen stylus with air actions and 7 years of Android OS upgrades"]', '2026-10-19T07:44:09.124Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-18-pro-max', 'Apple iPhone 18 Pro Max', 'Apple', 'Cosmic Titanium', 'Apple''s 2026 crown jewel. Powered by the A20 Pro 2nm architecture, 48MP Pro Fusion Gen 3 triple camera, 3500 nits ProMotion display, and Apple Intelligence 2.0.', 'iPhone 18 Pro Max', 'SMARTPHONE',
  159900, NULL, 169900, 4.9, 510,
  '/phones/iphone-18-pro-max.jpg', '["/phones/iphone-18-pro-max.jpg"]', '[{"name":"Cosmic Titanium","hex":"#444954"},{"name":"Desert Gold","hex":"#cfb9a5"},{"name":"Natural Titanium","hex":"#9e9a95"},{"name":"Space Black","hex":"#232426"}]', '[{"size":"256GB","price":159900},{"size":"512GB","price":179900},{"size":"1TB","price":199900},{"size":"2TB","price":224900}]', '12GB Unified Memory', '6.9-inch Super Retina XDR OLED 120Hz ProMotion, 3500 nits, Under-Display Face ID',
  NULL, 'Apple A20 Pro (2nm) with 6-core GPU & Apple Intelligence 2.0', '48MP Fusion Gen 3 OIS + 48MP Ultra-Wide + 48MP 5x Tetraprism Periscope Telephoto | 24MP Center Stage', NULL, NULL,
  '4850 mAh, 35W MagSafe 2 & USB-C 4.0 Thunderbolt', NULL, 'iOS 20 with Apple Intelligence 2.0', 'Dual 5G SIM (SA/NSA)', 12,
  41, TRUE, TRUE, '["Apple A20 Pro 2nm silicon with 6-core GPU and hardware-accelerated ray tracing","All-48MP Pro Triple Camera with 5x Tetraprism optical zoom and 4K 120fps Dolby Vision","6.9-inch 3500-nit ProMotion Display with Under-Display Face ID technology","Grade 5 Titanium unibody chassis with enhanced Camera Control touch sensor"]', '2026-10-19T07:44:09.137Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iphone-18-pro', 'Apple iPhone 18 Pro', 'Apple', 'Natural Titanium', 'Compact powerhouse with A20 Pro 2nm chip, all-48MP triple camera system, and ultra-bright 6.3-inch ProMotion display.', 'iPhone 18 Pro', 'SMARTPHONE',
  134900, NULL, 144900, 4.8, 390,
  '/phones/iphone-18-pro.jpg', '["/phones/iphone-18-pro.jpg"]', '[{"name":"Natural Titanium","hex":"#9e9a95"},{"name":"Cosmic Titanium","hex":"#444954"},{"name":"White Titanium","hex":"#e3e4e5"},{"name":"Space Black","hex":"#232426"}]', '[{"size":"128GB","price":134900},{"size":"256GB","price":144900},{"size":"512GB","price":164900},{"size":"1TB","price":184900}]', '12GB Unified Memory', '6.3-inch Super Retina XDR OLED 120Hz ProMotion, 3500 nits peak, Ceramic Shield 2',
  NULL, 'Apple A20 Pro (2nm) with 6-core GPU & Neural Engine', '48MP Fusion Gen 3 + 48MP Ultra-Wide + 48MP 5x Periscope Telephoto | 24MP Center Stage', NULL, NULL,
  '3750 mAh, 30W MagSafe & Qi2 Wireless', NULL, 'iOS 20 with Apple Intelligence 2.0', 'Dual 5G SIM (SA/NSA)', 12,
  35, TRUE, TRUE, '["Apple A20 Pro 2nm processor with Pro hardware ray tracing","Full 48MP Triple Pro Camera with 5x optical periscope zoom","Compact 6.3-inch ProMotion 120Hz display with 3500 nits peak brightness","Grade 5 Titanium frame with dedicated Action and Camera Control buttons"]', '2026-10-19T07:44:09.151Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-x300-ultra', 'Vivo X300 Ultra', 'Vivo', 'Zeiss Master Edition', 'Professional mobile photography titan. 200MP Zeiss APO Periscope + 1-inch Sony LYT-900 sensor with Snapdragon 8 Elite and BlueOcean 6000mAh battery.', 'X300 Ultra', 'SMARTPHONE',
  99999, NULL, 109999, 4.9, 280,
  '/phones/vivo-x300-ultra.jpg', '["/phones/vivo-x300-ultra.jpg"]', '[{"name":"Titanium Dune","hex":"#b59e7a"},{"name":"Eclipse Black","hex":"#1c1d1f"},{"name":"Moonlight White","hex":"#ebebeb"}]', '[{"size":"256GB","price":99999},{"size":"512GB","price":109999},{"size":"1TB","price":124999}]', '16GB / 24GB LPDDR5X', '6.78-inch 2K LTPO AMOLED, 1-120Hz, 4500 nits peak, Zeiss Master Color',
  NULL, 'Qualcomm Snapdragon 8 Elite (3nm) + Vivo V4 Pro Imaging NPU', '200MP Zeiss APO Periscope Telephoto (1/1.4" OIS) + 50MP Sony LYT-900 1-inch OIS + 50MP Ultra-Wide | 50MP Eye AF', NULL, NULL,
  '6000 mAh BlueOcean Silicon-Carbon, 100W FlashCharge, 50W Wireless', NULL, 'Funtouch OS 16 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  30, TRUE, TRUE, '["200MP Zeiss APO Periscope Telephoto with 100x zoom and floating lens elements","Sony LYT-900 1-inch primary camera sensor with f/1.75 physical aperture","Snapdragon 8 Elite flagship silicon with custom Vivo V4 Pro imaging NPU","6000mAh BlueOcean Silicon-Carbon battery with 100W wired and 50W wireless flash charging"]', '2026-10-19T07:44:09.165Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oppo-find-x9-ultra', 'OPPO Find X9 Ultra', 'Oppo', 'Hasselblad Quad Periscope', 'World''s premier Quad 50MP Hasselblad camera system with dual periscope telephotos, Snapdragon 8 Elite, and 5850mAh Glacier battery.', 'Find X9 Ultra', 'SMARTPHONE',
  94999, NULL, 104999, 4.8, 250,
  '/phones/oppo-find-x9-ultra.jpg', '["/phones/oppo-find-x9-ultra.jpg"]', '[{"name":"Desert Brown Vegan Leather","hex":"#8b5a2b"},{"name":"Ocean Blue","hex":"#2b4c7e"},{"name":"Obsidian Black","hex":"#1f2022"}]', '[{"size":"512GB","price":94999},{"size":"1TB","price":109999}]', '16GB LPDDR5X', '6.82-inch Quad-Curved AMOLED, 120Hz LTPO, 4500 nits, Dolby Vision',
  NULL, 'Qualcomm Snapdragon 8 Elite (3nm) with MariSilicon X3 NPU', 'Quad 50MP: 50MP Sony LYT-900 1-inch OIS + 50MP 3x Periscope + 50MP 6x Periscope + 50MP Ultra-Wide | 32MP RGBW', NULL, NULL,
  '5850 mAh Glacier Battery, 100W SUPERVOOC, 50W AIRVOOC Wireless', NULL, 'ColorOS 16 based on Android 16', 'Dual 5G SIM (SA/NSA)', 12,
  28, TRUE, TRUE, '["Dual Periscope Quad 50MP Hasselblad Camera setup with 3x & 6x optical lenses","1-inch Sony LYT-900 main sensor with Optical Image Stabilization","5850mAh Glacier battery with 100W SUPERVOOC + 50W wireless charging","6.82-inch Quad-Curved 120Hz LTPO display with 4500 nits peak brightness"]', '2026-10-19T07:44:09.178Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-z-fold-8-ultra', 'Samsung Galaxy Z Fold 8 Ultra', 'Samsung', 'Titanium Fold Edition', 'Ultra-slim foldable perfection. 8.0-inch creaseless inner display, 200MP pro camera, titanium frame, and Snapdragon 8 Elite for Galaxy.', 'Galaxy Z Fold 8 Ultra', 'SMARTPHONE',
  174999, NULL, 189999, 4.9, 210,
  '/phones/samsung-galaxy-z-fold-8-ultra.png', '["/phones/samsung-galaxy-z-fold-8-ultra.png"]', '[{"name":"Titanium Crafted Black","hex":"#1f2124"},{"name":"Titanium Silver","hex":"#9aa0a6"},{"name":"Titanium Navy","hex":"#1c2833"}]', '[{"size":"512GB","price":174999},{"size":"1TB","price":194999}]', '16GB LPDDR5X', '8.0-inch Dynamic AMOLED 2X 120Hz LTPO Inner (2800 nits) + 6.5-inch Outer AMOLED 120Hz',
  NULL, 'Qualcomm Snapdragon 8 Elite for Galaxy (3nm)', '200MP OIS (Main) + 12MP Ultra-Wide + 50MP 5x Periscope Telephoto | 10MP Cover + 4MP UDC', NULL, NULL,
  '4800 mAh Dual-cell, 45W Wired, 15W Wireless, IP48 Water/Dust', NULL, 'One UI 8.5 Fold Edition (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  18, TRUE, TRUE, '["Ultra-thin 8.0-inch creaseless Dynamic AMOLED 2X folding display","200MP flagship camera sensor on a foldable device","Armor Titanium frame with zero-gap waterdrop hinge mechanism","Galaxy AI multi-window productivity with S-Pen stylus support"]', '2026-10-19T07:44:09.190Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-x-fold-6', 'Vivo X Fold 6', 'Vivo', 'Zeiss Carbon Fold', 'Record-setting 8.9mm folded thickness. Zeiss Triple 50MP with periscope zoom, 5700mAh semi-solid silicon battery, and Snapdragon 8 Elite.', 'X Fold 6', 'SMARTPHONE',
  159999, NULL, 169999, 4.8, 175,
  '/phones/vivo-x-fold-6.jpg', '["/phones/vivo-x-fold-6.jpg"]', '[{"name":"Feather White","hex":"#f5f5f7"},{"name":"Solar Black","hex":"#18181b"},{"name":"Titanium Grey","hex":"#71717a"}]', '[{"size":"512GB","price":159999},{"size":"1TB","price":174999}]', '16GB LPDDR5X', '8.03-inch 2K+ E7 AMOLED 120Hz LTPO Folding + 6.53-inch FHD+ 120Hz Outer',
  NULL, 'Qualcomm Snapdragon 8 Elite (3nm)', '50MP Zeiss OIS Main + 64MP 3x Periscope Telephoto OIS + 50MP Ultra-Wide | Dual 32MP', NULL, NULL,
  '5700 mAh Semi-Solid Silicon-Carbon, 100W FlashCharge, 50W Wireless', NULL, 'Funtouch OS 16 Fold (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  22, TRUE, TRUE, '["World''s slimmest high-battery fold at under 9mm folded thickness","Zeiss camera optics with 64MP 3x periscope telephoto sensor","5700mAh semi-solid silicon-carbon battery with 100W flash charging","Carbon fiber zero-crease teardrop hinge mechanism"]', '2026-10-19T07:44:09.203Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'motorola-edge-70-pro-plus', 'Motorola Edge 70 Pro+', 'Motorola', 'Pantone Edition', 'Flagship performance at mid-range pricing. MediaTek Dimensity 9400, 144Hz 1.5K pOLED, triple 50MP cameras, and 125W TurboPower.', 'Edge 70 Pro+', 'SMARTPHONE',
  44999, NULL, 49999, 4.8, 195,
  '/phones/motorola-edge-70-pro-plus.jpg', '["/phones/motorola-edge-70-pro-plus.jpg"]', '[{"name":"Pantone Marshmallow","hex":"#ece8df"},{"name":"Black Oyster","hex":"#212326"},{"name":"Luxe Lavender","hex":"#8a7fa3"}]', '[{"size":"256GB","price":44999},{"size":"512GB","price":49999}]', '12GB / 16GB', '6.7-inch 1.5K pOLED 144Hz, HDR10+, 10-bit Color, Pantone Validated',
  NULL, 'MediaTek Dimensity 9400 (3nm)', '50MP OIS Main + 50MP Ultra-Wide Macro + 50MP 3x Telephoto OIS | 50MP Quad Pixel', NULL, NULL,
  '5000 mAh, 125W TurboPower, 50W Wireless, IP68 Waterproof', NULL, 'Hello UI on Android 16 (4 OS Updates)', 'Dual 5G SIM (SA/NSA)', 12,
  32, TRUE, TRUE, '["MediaTek Dimensity 9400 flagship 3nm chipset with ray tracing","All-50MP Triple Camera with 3x optical telephoto lens and 4K 60fps","144Hz 1.5K curved pOLED with Pantone Color validation","125W TurboPower wired + 50W wireless charging with IP68 rating"]', '2026-10-19T07:44:09.216Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'oneplus-nord-6', 'OnePlus Nord 6', 'OnePlus', 'Metallic Unibody', 'All-metal unibody craftsmanship, Snapdragon 7+ Gen 4, 50MP Sony LYT-700 OIS camera, and 100W SUPERVOOC charging.', 'Nord 6', 'SMARTPHONE',
  32999, NULL, 35999, 4.7, 340,
  '/phones/oneplus-nord-6.jpg', '["/phones/oneplus-nord-6.jpg"]', '[{"name":"Mercurial Silver","hex":"#c0c4c8"},{"name":"Obsidian Midnight","hex":"#1e2022"},{"name":"Oasis Green","hex":"#4a6e5d"}]', '[{"size":"128GB","price":32999},{"size":"256GB","price":36999}]', '8GB / 12GB LPDDR5X', '6.74-inch 1.5K AMOLED 120Hz, 2600 nits, Aqua Touch 2.0',
  NULL, 'Qualcomm Snapdragon 7+ Gen 4 (4nm)', '50MP Sony LYT-700 OIS + 8MP Ultra-Wide + 2MP Macro | 16MP EIS Selfie', NULL, NULL,
  '5500 mAh, 100W SUPERVOOC Fast Charge', NULL, 'OxygenOS 16 based on Android 16 (4 Years OS)', 'Dual 5G SIM (SA/NSA)', 12,
  50, TRUE, FALSE, '["All-metal slim unibody design with physical alert slider","Qualcomm Snapdragon 7+ Gen 4 processor with Cryo-velocity VC cooling","50MP Sony LYT-700 camera with Optical Image Stabilization","5500mAh battery with 100W SUPERVOOC 0-100% in 28 mins"]', '2026-10-19T07:44:09.230Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iqoo-15r-neo-10', 'iQOO 15R / Neo 10', 'iQOO', 'Speed Edition', 'Gaming supremacy. Snapdragon 8 Gen 3 paired with Supercomputing Chip Q2, 144Hz 1.5K LTPO AMOLED, and monster 6100mAh battery with 120W charge.', '15R (Neo 10)', 'SMARTPHONE',
  39999, NULL, 44999, 4.8, 310,
  '/phones/iqoo-15r-neo-10.jpg', '["/phones/iqoo-15r-neo-10.jpg"]', '[{"name":"Track Orange","hex":"#e65100"},{"name":"Conqueror Black","hex":"#191a1d"},{"name":"Rally Blue","hex":"#1565c0"}]', '[{"size":"256GB","price":39999},{"size":"512GB","price":44999}]', '12GB / 16GB LPDDR5X', '6.78-inch 1.5K 144Hz 8T LTPO AMOLED, 3000Hz Instant Touch, 4500 nits',
  NULL, 'Qualcomm Snapdragon 8 Gen 3 (4nm) + Supercomputing Chip Q2', '50MP Sony IMX921 OIS + 8MP Ultra-Wide | 16MP HD Selfie', NULL, NULL,
  '6100 mAh Dual-Cell, 120W FlashCharge (0-100% in 25 mins)', NULL, 'Funtouch OS 16 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  45, TRUE, TRUE, '["Qualcomm Snapdragon 8 Gen 3 flagship platform with 6K VC vapor chamber","Supercomputing Chip Q2 for 144 FPS game frame interpolation","Massive 6100mAh dual-cell battery with 120W FlashCharge","1.5K 144Hz 8T LTPO display with 4500 nits peak brightness"]', '2026-10-19T07:44:09.243Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'nothing-phone-4a-pro', 'Nothing Phone (4a) Pro', 'Nothing', 'Glyph Matrix', 'Transparent design icon with upgraded Glyph Interface 3.0, Dimensity 7350 Pro, dual 50MP cameras with 2.5x telephoto, and symmetrical bezels.', 'Phone (4a) Pro', 'SMARTPHONE',
  34999, NULL, 38999, 4.8, 290,
  '/phones/nothing-phone-4a-pro.jpg', '["/phones/nothing-phone-4a-pro.jpg"]', '[{"name":"Glyph White","hex":"#f2f3f5"},{"name":"Dark Smoke","hex":"#1e2024"},{"name":"Special Yellow Accent","hex":"#facc15"}]', '[{"size":"256GB","price":34999},{"size":"512GB","price":39999}]', '8GB / 12GB', '6.7-inch Flexible AMOLED 120Hz, 2400 nits, 100% Symmetrical 1.9mm Bezels',
  NULL, 'MediaTek Dimensity 7350 Pro 5G (4nm)', '50MP Sony OIS Main + 50MP 2.5x Telephoto & Ultra-Wide Dual Sensor | 32MP 4K Selfie', NULL, NULL,
  '5200 mAh, 65W Fast Charge, Glyph Interface 3.0', NULL, 'Nothing OS 3.5 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  35, TRUE, TRUE, '["Iconic transparent aesthetic with customizable Glyph Matrix lighting","50MP Dual Camera setup with 2.5x dedicated optical telephoto","Dimensity 7350 Pro 5G with clean bloatware-free Nothing OS 3.5","6.7-inch flexible AMOLED with razor-thin symmetrical 1.9mm bezels"]', '2026-10-19T07:44:09.257Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-a37', 'Samsung Galaxy A37 5G', 'Samsung', 'Awesome Series', 'Everyday excellence. Exynos 1580 4nm, 50MP OIS camera, 6.6-inch Super AMOLED 120Hz, and IP67 water resistance.', 'Galaxy A37', 'SMARTPHONE',
  27999, NULL, 30999, 4.6, 220,
  '/phones/samsung-galaxy-a37.jpg', '["/phones/samsung-galaxy-a37.jpg"]', '[{"name":"Awesome Iceblue","hex":"#90caf9"},{"name":"Awesome Lilac","hex":"#ce93d8"},{"name":"Awesome Navy","hex":"#1a237e"}]', '[{"size":"128GB","price":27999},{"size":"256GB","price":31999}]', '8GB', '6.6-inch Super AMOLED FHD+ 120Hz, Vision Booster, 1600 nits',
  NULL, 'Samsung Exynos 1580 (4nm) Octa-core', '50MP OIS Main + 8MP Ultra-Wide + 5MP Macro | 13MP Selfie', NULL, NULL,
  '5000 mAh, 35W Fast Charging, IP67 Dust/Water', NULL, 'One UI 8 (Android 16) with 5 Years OS Updates', 'Dual 5G SIM (SA/NSA)', 12,
  40, TRUE, FALSE, '["50MP OIS camera with AI Nightography enhancement","6.6-inch Super AMOLED 120Hz display with Vision Booster","IP67 dust and water resistance rating for worry-free usage","Guaranteed 5 generations of Android OS updates and security patches"]', '2026-10-19T07:44:09.272Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-a57', 'Samsung Galaxy A57 5G', 'Samsung', 'Metal Frame Edition', 'Premium mid-range standard. Exynos 1680 with AMD RDNA graphics, metal frame, 50MP OIS, Samsung Knox Vault, and 5200mAh battery.', 'Galaxy A57', 'SMARTPHONE',
  36999, NULL, 41999, 4.7, 260,
  '/phones/samsung-galaxy-a57.jpg', '["/phones/samsung-galaxy-a57.jpg"]', '[{"name":"Awesome Iceblue","hex":"#81d4fa"},{"name":"Awesome Lemon","hex":"#fff59d"},{"name":"Awesome Charcoal","hex":"#263238"}]', '[{"size":"128GB","price":36999},{"size":"256GB","price":41999}]', '8GB / 12GB', '6.6-inch Super AMOLED FHD+ 120Hz, Corning Gorilla Glass Victus+, 2000 nits',
  NULL, 'Samsung Exynos 1680 (4nm) with AMD Xclipse 540 GPU', '50MP OIS (1/1.56") + 12MP Ultra-Wide + 5MP Macro | 32MP 4K Selfie', NULL, NULL,
  '5200 mAh, 45W Fast Charging, Metal Frame, IP67', NULL, 'One UI 8 (Android 16) with Knox Vault Security', 'Dual 5G SIM (SA/NSA)', 12,
  35, TRUE, FALSE, '["Solid metal frame with Gorilla Glass Victus+ front and back","Exynos 1680 with AMD RDNA graphics architecture for smooth gaming","50MP OIS flagship-grade main camera sensor with 4K 60fps recording","45W fast charging with Samsung Knox Vault hardware-level security"]', '2026-10-19T07:44:09.297Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'vivo-v80-5g', 'Vivo V80 5G', 'Vivo', 'Zeiss Portrait Studio', 'Master of portraits. Dimensity 8400, Zeiss 50MP dual cameras, Studio-grade Aura Light, 5500mAh BlueOcean battery, and IP69 rating.', 'V80 5G', 'SMARTPHONE',
  38999, NULL, 42999, 4.7, 210,
  '/phones/vivo-v80-5g.jpg', '["/phones/vivo-v80-5g.jpg"]', '[{"name":"Lotus Purple","hex":"#b388ff"},{"name":"Ganges Blue","hex":"#4fc3f7"},{"name":"Titanium Grey","hex":"#455a64"}]', '[{"size":"256GB","price":38999},{"size":"512GB","price":43999}]', '8GB / 12GB', '6.78-inch 1.5K 3D Curved AMOLED 120Hz, Zeiss Natural Color, 4500 nits',
  NULL, 'MediaTek Dimensity 8400 (4nm)', '50MP Zeiss OIS Main + 50MP Zeiss Ultra-Wide + Studio Smart Aura Light | 50MP Eye AF', NULL, NULL,
  '5500 mAh BlueOcean, 80W FlashCharge, IP68/IP69 Water/Dust', NULL, 'Funtouch OS 16 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  38, TRUE, FALSE, '["Zeiss All-50MP dual camera system with Studio Aura Light","50MP Eye-AF front camera with wide group-selfie angle","Extreme durability with dual IP68 and IP69 waterproof ratings","5500mAh BlueOcean battery with 80W FlashCharge"]', '2026-10-19T07:44:09.312Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'motorola-edge-70-pro', 'Motorola Edge 70 Pro', 'Motorola', 'Ultra Slim Curve', 'Ultra-slim ergonomic curve with Snapdragon 8s Gen 3, triple 50MP cameras, 144Hz pOLED, and 125W TurboPower.', 'Edge 70 Pro', 'SMARTPHONE',
  39999, NULL, 44999, 4.7, 230,
  '/phones/motorola-edge-70-pro.jpg', '["/phones/motorola-edge-70-pro.jpg"]', '[{"name":"Pantone Luxe Lavender","hex":"#8a7fa3"},{"name":"Black Beauty","hex":"#1a1a1d"},{"name":"Vanilla Cream","hex":"#fdfbf7"}]', '[{"size":"256GB","price":39999},{"size":"512GB","price":44999}]', '12GB', '6.7-inch 1.5K pOLED 144Hz, HDR10+, Pantone SkinTone Validated',
  NULL, 'Qualcomm Snapdragon 8s Gen 3 (4nm)', '50MP OIS Main + 50MP Ultra-Wide Macro + 10MP 3x Telephoto OIS | 50MP Auto-Focus', NULL, NULL,
  '4700 mAh, 125W TurboPower, 15W Wireless, IP68', NULL, 'Hello UI (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  35, TRUE, FALSE, '["Qualcomm Snapdragon 8s Gen 3 flagship silicon","50MP Triple camera system with 3x optical telephoto zoom","144Hz 1.5K curved pOLED with Pantone Color validation","125W TurboPower charging 0-100% in 18 minutes"]', '2026-10-19T07:44:09.325Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'google-pixel-10a', 'Google Pixel 10a', 'Google Pixel', 'Gemini AI Assistant', 'The smartest phone in its class. Google Tensor G5 chip (3nm TSMC), Gemini AI built-in, class-leading 64MP camera, and 7 years of feature drops.', 'Pixel 10a', 'SMARTPHONE',
  44999, NULL, 49999, 4.8, 275,
  '/phones/google-pixel-10a.jpg', '["/phones/google-pixel-10a.jpg"]', '[{"name":"Porcelain","hex":"#f4f1ea"},{"name":"Obsidian","hex":"#202124"},{"name":"Aloe","hex":"#c8e6c9"},{"name":"Bay Blue","hex":"#81d4fa"}]', '[{"size":"128GB","price":44999},{"size":"256GB","price":49999}]', '8GB LPDDR5X', '6.2-inch Actua OLED 120Hz (60-120Hz), 2000 nits peak, Gorilla Glass 7i',
  NULL, 'Google Tensor G5 (3nm TSMC) + Titan M3 Security Co-processor', '64MP Quad PD Main OIS + 13MP Ultra-Wide 120° FOV | 13MP Ultra-Wide', NULL, NULL,
  '4600 mAh, 30W Fast Wired, Qi Wireless Charging, IP67', NULL, 'Clean Android 16 with 7 Years OS & Security Updates', 'Dual 5G SIM (SA/NSA)', 12,
  30, TRUE, TRUE, '["Google Tensor G5 3nm TSMC processor with Titan M3 security","Industry-leading Pixel camera tuning with Magic Editor & Best Take","7 years of guaranteed OS updates, feature drops, and security fixes","Compact 6.2-inch 120Hz Actua OLED display with 2000 nits brightness"]', '2026-10-19T07:44:09.338Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'motorola-edge-70-fusion', 'Motorola Edge 70 Fusion', 'Motorola', 'Endless Edge', 'Flagship curve under ₹25K. Snapdragon 7s Gen 3, Sony LYTIA 700C 50MP OIS, 144Hz 3D curved pOLED, and genuine IP68 underwater protection.', 'Edge 70 Fusion', 'SMARTPHONE',
  23999, NULL, 26999, 4.7, 380,
  '/phones/motorola-edge-70-fusion.jpg', '["/phones/motorola-edge-70-fusion.jpg"]', '[{"name":"Marshmallow Blue","hex":"#b0bec5"},{"name":"Forest Green Vegan Leather","hex":"#2e7d32"},{"name":"Hot Pink","hex":"#f06292"}]', '[{"size":"128GB","price":23999},{"size":"256GB","price":26999}]', '8GB / 12GB', '6.67-inch FHD+ 144Hz Endless Edge 3D Curved pOLED, 1600 nits',
  NULL, 'Qualcomm Snapdragon 7s Gen 3 (4nm)', '50MP Sony LYTIA 700C OIS + 13MP Ultra-Wide Macro | 32MP Quad Pixel 4K', NULL, NULL,
  '5200 mAh, 68W TurboPower, IP68 Water/Dust Resistance', NULL, 'Hello UI on Android 16', 'Dual 5G SIM (SA/NSA)', 12,
  50, TRUE, TRUE, '["Sony LYTIA 700C 50MP OIS flagship sensor with 4K recording","144Hz Endless Edge 3D curved pOLED display with HDR10+","IP68 underwater protection (1.5m for 30 minutes)","68W TurboPower charging with 5200mAh battery"]', '2026-10-19T07:44:09.352Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'realme-p4-power', 'Realme P4 Power / P4R', 'Realme', 'Power Edition', 'Battery behemoth. Massive 6000mAh battery with 67W SUPERVOOC, Dimensity 7050 Ultra 5G, 120Hz AMOLED, and Rainwater Smart Touch.', 'P4 Power (P4R)', 'SMARTPHONE',
  18999, NULL, 21999, 4.6, 290,
  '/phones/realme-p4-power.jpg', '["/phones/realme-p4-power.jpg"]', '[{"name":"Phoenix Gold","hex":"#ffb74d"},{"name":"Peacock Green","hex":"#00897b"},{"name":"Midnight Navy","hex":"#0d47a1"}]', '[{"size":"128GB","price":18999},{"size":"256GB","price":21999}]', '8GB / 12GB', '6.67-inch FHD+ 120Hz AMOLED, 2000 nits peak, Rainwater Smart Touch',
  NULL, 'MediaTek Dimensity 7050 Ultra 5G (6nm)', '50MP Sony OIS Main + 2MP Portrait Depth | 16MP AI Selfie', NULL, NULL,
  '6000 mAh Monster Battery, 67W SUPERVOOC Fast Charge', NULL, 'Realme UI 7.0 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  60, TRUE, FALSE, '["6000mAh high-density battery with 67W SUPERVOOC charging","120Hz AMOLED display with 2000 nits peak brightness","Sony 50MP camera with Optical Image Stabilization","7-layer 3D VC cooling system for sustained gaming"]', '2026-10-19T07:44:09.364Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'moto-g37-power', 'Moto G37 Power', 'Motorola', 'Marathon Power', 'Unstoppable battery life. 6000mAh battery, Dimensity 6300 5G, 120Hz display with stereo speakers and Dolby Atmos at an incredible budget price.', 'Moto G37 Power', 'SMARTPHONE',
  12999, NULL, 14999, 4.5, 320,
  '/phones/moto-g37-power.jpg', '["/phones/moto-g37-power.jpg"]', '[{"name":"Ocean Green","hex":"#66bb6a"},{"name":"Ice Blue","hex":"#80d8ff"},{"name":"Charcoal Grey","hex":"#37474f"}]', '[{"size":"128GB","price":12999}]', '6GB / 8GB', '6.56-inch HD+ 120Hz IPS LCD, Stereo Speakers with Dolby Atmos',
  NULL, 'MediaTek Dimensity 6300 5G (6nm)', '50MP Quad Pixel Main + 2MP Macro Sensor | 16MP Selfie', NULL, NULL,
  '6000 mAh Powerhouse, 33W TurboPower Charger in box', NULL, 'Clean Android 16 with Moto Gestures', 'Dual 5G SIM (SA/NSA)', 12,
  65, TRUE, FALSE, '["6000mAh marathon battery lasting up to 3 days per charge","5G connectivity with MediaTek Dimensity 6300 processor","Stereo speakers with Dolby Atmos spatial audio","Clean bloatware-free Android 16 with signature Moto Gestures"]', '2026-10-19T07:44:09.378Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-f70-pro', 'Samsung Galaxy F70 Pro 5G', 'Samsung', 'Flipkart F-Series', 'Gaming and endurance powerhouse. Exynos 1480 with AMD Xclipse 530 GPU, 6.7-inch Super AMOLED+ 120Hz, and 6000mAh battery.', 'Galaxy F70 Pro', 'SMARTPHONE',
  24999, NULL, 28999, 4.6, 240,
  '/phones/samsung-galaxy-f70-pro.jpg', '["/phones/samsung-galaxy-f70-pro.jpg"]', '[{"name":"Cyber Black","hex":"#212121"},{"name":"Neon Green","hex":"#76ff03"},{"name":"Laser Blue","hex":"#00b0ff"}]', '[{"size":"128GB","price":24999},{"size":"256GB","price":27999}]', '8GB', '6.7-inch Super AMOLED Plus FHD+ 120Hz, 1500 nits, Gorilla Glass 5',
  NULL, 'Samsung Exynos 1480 with AMD Xclipse 530 GPU (4nm)', '50MP OIS Main + 8MP Ultra-Wide + 2MP Macro | 32MP 4K Selfie Camera', NULL, NULL,
  '6000 mAh Monster Battery, 45W Fast Charging', NULL, 'One UI 8 (Android 16) with Voice Focus', 'Dual 5G SIM (SA/NSA)', 12,
  45, TRUE, FALSE, '["Exynos 1480 4nm processor with AMD RDNA GPU gaming graphics","6000mAh battery supporting 45W super-fast charging","6.7-inch Super AMOLED Plus 120Hz vivid screen","50MP OIS camera with 4K recording front & rear"]', '2026-10-19T07:44:09.444Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'samsung-galaxy-m47', 'Samsung Galaxy M47 5G', 'Samsung', 'Monster Series', 'Unmatched endurance. 6000mAh battery, 50MP No Shake OIS camera, 6.6-inch Super AMOLED 120Hz, and Knox Security.', 'Galaxy M47', 'SMARTPHONE',
  19999, NULL, 23999, 4.6, 280,
  '/phones/samsung-galaxy-m47.jpg', '["/phones/samsung-galaxy-m47.jpg"]', '[{"name":"Moonlight Silver","hex":"#cfd8dc"},{"name":"Thunder Black","hex":"#263238"},{"name":"Denim Blue","hex":"#1565c0"}]', '[{"size":"128GB","price":19999},{"size":"256GB","price":22999}]', '6GB / 8GB', '6.6-inch FHD+ Super AMOLED 120Hz, 1200 nits, Gorilla Glass Victus',
  NULL, 'Qualcomm Snapdragon 6 Gen 1 (4nm)', '50MP OIS No Shake Cam + 8MP Ultra-Wide + 2MP Depth | 16MP Selfie', NULL, NULL,
  '6000 mAh Monster Battery, 25W Fast Charging', NULL, 'One UI 8 (Android 16) with 4 OS upgrades', 'Dual 5G SIM (SA/NSA)', 12,
  55, TRUE, FALSE, '["6000mAh battery for 2+ days of heavy usage","50MP No Shake Cam with hardware Optical Image Stabilization","Vibrant 6.6-inch Super AMOLED 120Hz display with Gorilla Glass Victus","Samsung Knox Security with Secure Folder and Alt-Z privacy"]', '2026-10-19T07:44:09.467Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'redmi-note-17-pro', 'Redmi Note 17 Pro 5G', 'Redmi', 'SuperNote Edition', 'The flagship killer SuperNote. 200MP OIS camera, MediaTek Dimensity 7300-Ultra, 1.5K CrystalRes 120Hz AMOLED, 90W HyperCharge, and IP68 protection.', 'Note 17 Pro', 'SMARTPHONE',
  26999, NULL, 29999, 4.7, 410,
  '/phones/redmi-note-17-pro.jpg', '["/phones/redmi-note-17-pro.jpg"]', '[{"name":"Titanium Silver","hex":"#b0bec5"},{"name":"Midnight Black","hex":"#1e2022"},{"name":"Aurora Green","hex":"#26a69a"}]', '[{"size":"128GB","price":26999},{"size":"256GB","price":29999}]', '8GB / 12GB', '6.67-inch 1.5K CrystalRes AMOLED 120Hz, Dolby Vision, Gorilla Glass Victus 2',
  NULL, 'MediaTek Dimensity 7300-Ultra 5G (4nm)', '200MP Samsung HP3 OIS (1/1.4") + 8MP Ultra-Wide + 2MP Macro | 16MP AI Selfie', NULL, NULL,
  '5500 mAh, 90W HyperCharge (0-100% in 22 mins), IP68 Water Resistance', NULL, 'Xiaomi HyperOS 2.0 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  45, TRUE, TRUE, '["200MP Samsung HP3 OIS camera with 4x in-sensor lossless zoom","90W HyperCharge 5500mAh battery 0-100% in 22 mins","1.5K CrystalRes AMOLED with Dolby Vision & HDR10+","IP68 flagship dust and water resistance rating"]', '2026-10-19T07:44:09.479Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'redmi-note-15', 'Redmi Note 15 5G', 'Redmi', 'Classic Note', 'Affordable brilliance. Qualcomm Snapdragon 4 Gen 3, 120Hz FHD+ AMOLED, 50MP AI dual camera, and 5100mAh battery with 45W charging.', 'Note 15', 'SMARTPHONE',
  15999, NULL, 18999, 4.5, 350,
  '/phones/redmi-note-15.jpg', '["/phones/redmi-note-15.jpg"]', '[{"name":"Prism Blue","hex":"#64b5f6"},{"name":"Arctic White","hex":"#fafafa"},{"name":"Stealth Black","hex":"#212121"}]', '[{"size":"128GB","price":15999},{"size":"256GB","price":17999}]', '6GB / 8GB', '6.67-inch FHD+ 120Hz AMOLED, 1800 nits, Low Blue Light Certified',
  NULL, 'Qualcomm Snapdragon 4 Gen 3 (4nm)', '50MP Dual AI Camera + 2MP Depth | 13MP Selfie', NULL, NULL,
  '5100 mAh, 45W Turbo Charging in box', NULL, 'Xiaomi HyperOS 2.0 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  60, TRUE, FALSE, '["Qualcomm Snapdragon 4 Gen 3 efficient 4nm architecture","6.67-inch FHD+ 120Hz AMOLED display with 1800 nits brightness","50MP AI Dual camera with Night Mode 2.0","45W fast charger included in retail box"]', '2026-10-19T07:44:09.491Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'tecno-spark-50s-5g', 'Tecno Spark 50 / Spark 50S 5G', 'Tecno', 'Spark Dynamic', 'Ultra-affordable 5G with style. MediaTek Dimensity 6300, 120Hz Dynamic Port Display, 50MP AI Dual Camera, and 5000mAh battery under ₹11,000.', 'Spark 50 / 50S', 'SMARTPHONE',
  10999, NULL, 12999, 4.4, 190,
  '/phones/tecno-spark-50s-5g.jpg', '["/phones/tecno-spark-50s-5g.jpg"]', '[{"name":"Nebula Purple","hex":"#7e57c2"},{"name":"Galaxy Black","hex":"#212121"},{"name":"Meta Blue","hex":"#29b6f6"}]', '[{"size":"128GB","price":10999}]', '6GB / 8GB (with Memory Fusion)', '6.6-inch HD+ 120Hz Dynamic Port Display with Interactive Notifications',
  NULL, 'MediaTek Dimensity 6300 5G (6nm)', '50MP AI Dual Camera with Dual Flash | 8MP Glowing Selfie with Dual LED Flash', NULL, NULL,
  '5000 mAh, 18W Fast Charging', NULL, 'HiOS 15 based on Android 16', 'Dual 5G SIM (SA/NSA)', 12,
  50, TRUE, FALSE, '["Fast 5G speeds under ₹11,000 with Dimensity 6300","120Hz smooth display with Dynamic Port interactive animations","50MP AI dual camera with dual LED flash","Dual stereo speakers with DTS sound processing"]', '2026-10-19T07:44:09.505Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'nothing-phone-4b', 'Nothing Phone (4b)', 'Nothing', 'Essential Glyph', 'The entry point to Nothing design. Dimensity 7200 Ultra, Essential Glyph lighting, 50MP OIS camera, and transparent back under ₹22,000.', 'Phone (4b)', 'SMARTPHONE',
  21999, NULL, 24999, 4.7, 260,
  '/phones/nothing-phone-4b.jpg', '["/phones/nothing-phone-4b.jpg"]', '[{"name":"Milk White","hex":"#f8f9fa"},{"name":"Dark Ash","hex":"#2b2d30"}]', '[{"size":"128GB","price":21999},{"size":"256GB","price":24999}]', '6GB / 8GB', '6.7-inch 120Hz AMOLED, 1300 nits, Transparent Back Design',
  NULL, 'MediaTek Dimensity 7200 Ultra 5G (4nm)', '50MP Main OIS + 8MP Ultra-Wide | 16MP Selfie', NULL, NULL,
  '5000 mAh, 45W Fast Charging, Essential Glyph Interface', NULL, 'Nothing OS 3.0 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  45, TRUE, TRUE, '["Unique transparent industrial design with Essential Glyph lights","50MP OIS main camera with 4K recording","MediaTek Dimensity 7200 Ultra 5G processor","Nothing OS 3.0 clean aesthetic with zero pre-installed bloatware"]', '2026-10-19T07:44:09.518Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";
INSERT INTO "MobileProduct" (
  "id", "name", "brand", "series", "tagline", "model", "category",
  "basePrice", "discountPrice", "originalPrice", "rating", "reviewCount",
  "imageUrl", "galleryImages", "colors", "storageOptions", "ram", "display",
  "displayType", "processor", "camera", "rearCamera", "frontCamera",
  "battery", "batteryCapacity", "os", "network5G", "warrantyMonths",
  "stock", "inStock", "isFeatured", "highlightFeatures", "createdAt"
) VALUES (
  'iqoo-z11-z10r', 'iQOO Z11 / iQOO Z10R', 'iQOO', 'Turbo Performance', 'Segment-first gaming performance. Dimensity 7200, 50MP Sony IMX882 OIS camera, 120Hz Ultra Vision AMOLED, and 44W FlashCharge.', 'Z11 / Z10R', 'SMARTPHONE',
  17999, NULL, 20999, 4.6, 280,
  '/phones/iqoo-z11-z10r.jpg', '["/phones/iqoo-z11-z10r.jpg"]', '[{"name":"Brushed Green","hex":"#388e3c"},{"name":"Graphene Black","hex":"#1e2022"}]', '[{"size":"128GB","price":17999},{"size":"256GB","price":19999}]', '6GB / 8GB LPDDR4X', '6.67-inch 120Hz Ultra Vision AMOLED, 1800 nits, HDR10+',
  NULL, 'MediaTek Dimensity 7200 5G (4nm)', '50MP Sony IMX882 OIS + 2MP Bokeh Sensor | 16MP Selfie', NULL, NULL,
  '5500 mAh, 44W FlashCharge in box', NULL, 'Funtouch OS 16 (Android 16)', 'Dual 5G SIM (SA/NSA)', 12,
  50, TRUE, FALSE, '["MediaTek Dimensity 7200 4nm processor with 730K+ AnTuTu score","Sony IMX882 50MP sensor with 4K OIS video stabilization","120Hz Ultra Vision AMOLED with 1800 nits peak brightness","5500mAh large capacity battery with 44W FlashCharge"]', '2026-10-19T07:44:09.532Z'
) ON CONFLICT ("id") DO UPDATE SET "basePrice" = EXCLUDED."basePrice", "stock" = EXCLUDED."stock", "inStock" = EXCLUDED."inStock";



-- ==========================================================================
-- 14. Account Deletion & Audit Tables
-- ==========================================================================

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

ALTER TABLE "AccountDeletionRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AccountDeletionRequest" ON "AccountDeletionRequest";
CREATE POLICY "Service role full access on AccountDeletionRequest" 
  ON "AccountDeletionRequest" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS "AccountDeletionAudit" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "userIdHash" TEXT NOT NULL,
  "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "reason" TEXT DEFAULT 'Self-service customer account deletion'
);

CREATE INDEX IF NOT EXISTS "idx_account_deletion_audit_hash" ON "AccountDeletionAudit"("userIdHash");

ALTER TABLE "AccountDeletionAudit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on AccountDeletionAudit" ON "AccountDeletionAudit";
CREATE POLICY "Service role full access on AccountDeletionAudit" 
  ON "AccountDeletionAudit" 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Atomic PostgreSQL Function for Account Deletion (RPC)
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
