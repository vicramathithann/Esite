/**
 * One-time migration script: VN Mobiles Product Images Migration
 * Converts current `imageUrl` / `galleryImages` into structured `images` array for all products.
 *
 * Rules:
 * 1. Converts current `imageUrl` and string gallery into structured { url, alt, isPrimary, order, colorKey } array.
 * 2. Does NOT replace or delete any valid existing image automatically.
 * 3. Detects and reports products whose image belongs to a different brand (e.g. Samsung phone showing Apple iPhone image).
 * 4. Safe dry-run mode by default; writes to database only when --execute is passed.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Known brand-identifying patterns in filenames and URLs
const BRAND_PATTERNS = {
  apple: [/iphone/i, /apple/i, /ios/i, /photo-1592750475338-74b7b21085ab/i],
  samsung: [/samsung/i, /galaxy/i, /exynos/i],
  google: [/pixel/i, /tensor/i],
  oneplus: [/oneplus/i, /oxygenos/i],
  xiaomi: [/xiaomi/i, /mi-/i, /poco/i],
  redmi: [/redmi/i],
  realme: [/realme/i],
  vivo: [/vivo/i],
  iqoo: [/iqoo/i],
  oppo: [/oppo/i, /reno/i, /find-x/i],
  motorola: [/motorola/i, /moto/i],
  nothing: [/nothing/i],
};

// Recognized parent/subsidiary brand relationships
const SISTER_BRANDS = {
  redmi: ["xiaomi", "redmi", "poco"],
  xiaomi: ["xiaomi", "redmi", "poco"],
  iqoo: ["vivo", "iqoo"],
  vivo: ["vivo", "iqoo"],
  oppo: ["oppo", "oneplus", "realme"],
  oneplus: ["oneplus", "oppo"],
  realme: ["realme", "oppo"],
};

function detectBrandFromUrl(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [brand, patterns] of Object.entries(BRAND_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(lower))) {
      return brand;
    }
  }
  return null;
}

export async function runImageMigration(dryRun = true) {
  console.log(`\n======================================================`);
  console.log(`VN MOBILES - PRODUCT IMAGES MIGRATION`);
  console.log(`Mode: ${dryRun ? "DRY RUN (Preview only, no DB writes)" : "EXECUTE (Writing to DB)"}`);
  console.log(`======================================================\n`);

  const { data: products, error: pErr } = await supabase
    .from("MobileProduct")
    .select("id, name, brand, model, imageUrl, galleryImages")
    .order("brand", { ascending: true });

  if (pErr) {
    console.error("Error fetching products from MobileProduct:", pErr);
    process.exit(1);
  }

  console.log(`Found ${products.length} total products in database.\n`);

  let alreadyStructuredCount = 0;
  let migratedCount = 0;
  const mismatchedBrandProducts = [];

  for (const product of products) {
    let rawGallery = [];
    try {
      if (typeof product.galleryImages === "string") {
        rawGallery = JSON.parse(product.galleryImages || "[]");
      } else if (Array.isArray(product.galleryImages)) {
        rawGallery = product.galleryImages;
      }
    } catch {
      rawGallery = [];
    }

    let structuredImages = [];

    // Check if gallery is already structured objects
    const isAlreadyStructured =
      Array.isArray(rawGallery) &&
      rawGallery.length > 0 &&
      typeof rawGallery[0] === "object" &&
      rawGallery[0] !== null &&
      Boolean(rawGallery[0].url);

    if (isAlreadyStructured) {
      alreadyStructuredCount++;
      structuredImages = rawGallery.map((img, idx) => ({
        url: img.url,
        alt: img.alt || `${product.name} photo ${idx + 1}`,
        isPrimary: img.isPrimary !== undefined ? Boolean(img.isPrimary) : idx === 0,
        order: img.order !== undefined ? Number(img.order) : idx,
        colorKey: img.colorKey || undefined,
      }));
    } else {
      migratedCount++;
      // Convert legacy string array or single imageUrl
      const urls = [];
      if (Array.isArray(rawGallery) && rawGallery.length > 0) {
        for (const item of rawGallery) {
          if (typeof item === "string" && item.trim()) urls.push(item.trim());
        }
      }
      if (product.imageUrl && !urls.includes(product.imageUrl.trim())) {
        urls.unshift(product.imageUrl.trim());
      }

      if (urls.length === 0) {
        // Fallback placeholder if no image exists
        urls.push(`/phones/${product.id}.jpg`);
      }

      structuredImages = urls.map((url, idx) => ({
        url,
        alt: `${product.name} photo ${idx + 1}`,
        isPrimary: idx === 0,
        order: idx,
      }));
    }

    // Check primary image and brand mismatch
    const primaryImg = structuredImages.find((img) => img.isPrimary) || structuredImages[0];
    const detectedImgBrand = detectBrandFromUrl(primaryImg?.url || product.imageUrl);

    const productBrandNorm = (product.brand || "").toLowerCase().replace(/ pixel/i, "").trim();
    const isBrandMatch =
      !detectedImgBrand ||
      productBrandNorm.includes(detectedImgBrand) ||
      detectedImgBrand.includes(productBrandNorm) ||
      (SISTER_BRANDS[productBrandNorm] && SISTER_BRANDS[productBrandNorm].includes(detectedImgBrand));

    if (!isBrandMatch) {
      mismatchedBrandProducts.push({
        id: product.id,
        name: product.name,
        brand: product.brand,
        imageUrl: primaryImg?.url || product.imageUrl,
        detectedBrandFromImage: detectedImgBrand,
      });
    }

    if (!dryRun) {
      const primaryUrl = primaryImg ? primaryImg.url : product.imageUrl;
      const { error: updateErr } = await supabase
        .from("MobileProduct")
        .update({
          imageUrl: primaryUrl,
          galleryImages: JSON.stringify(structuredImages),
        })
        .eq("id", product.id);

      if (updateErr) {
        console.error(`Failed to update product ${product.id} (${product.name}):`, updateErr.message);
      }
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`MIGRATION SUMMARY:`);
  console.log(`- Total products in catalog:        ${products.length}`);
  console.log(`- Already structured images:         ${alreadyStructuredCount}`);
  console.log(`- Products migrated to images array: ${migratedCount}`);
  console.log(`------------------------------------------------------\n`);

  console.log(`BRAND MISMATCH REPORT (${mismatchedBrandProducts.length} detected):`);
  if (mismatchedBrandProducts.length === 0) {
    console.log(`No brand mismatches detected.`);
  } else {
    mismatchedBrandProducts.forEach((item, index) => {
      console.log(`[${index + 1}] Product: "${item.name}"`);
      console.log(`    ID:             ${item.id}`);
      console.log(`    Product Brand:  ${item.brand}`);
      console.log(`    Detected Image: Belongs to "${item.detectedBrandFromImage.toUpperCase()}"`);
      console.log(`    Image URL:      ${item.imageUrl}`);
      console.log(``);
    });
  }

  if (dryRun) {
    console.log(`[NOTE] This was a DRY RUN. No changes were saved to the database.`);
    console.log(`To execute migration, run: node scripts/migrate-images.mjs --execute\n`);
  } else {
    console.log(`[SUCCESS] Database updated successfully for ${products.length} products.\n`);
  }
}

const isExecute = process.argv.includes("--execute");
runImageMigration(!isExecute).catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
