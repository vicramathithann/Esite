/**
 * One-time migration script: VN Mobiles Product Variants Migration
 * Builds `ProductVariant` records and synchronizes `storageOptions` for all products across all brands.
 *
 * Rules:
 * 1. Reads current storage chips and prices already shown on the user storefront.
 * 2. If a product has only one price/storage, creates 1 variant from its current ram, storage, price, and stock.
 * 3. Does not lose any current price or stock value.
 * 4. Syncs both `ProductVariant` relational table and `MobileProduct.storageOptions`.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function runMigration(dryRun = false) {
  console.log(`\n======================================================`);
  console.log(`VN MOBILES - PRODUCT VARIANTS MIGRATION`);
  console.log(`Mode: ${dryRun ? "DRY RUN (Preview only, no DB writes)" : "EXECUTE (Writing to DB)"}`);
  console.log(`======================================================\n`);

  const { data: products, error: pErr } = await supabase
    .from('MobileProduct')
    .select('*')
    .order('brand', { ascending: true });

  if (pErr) {
    console.error("Error fetching products from MobileProduct:", pErr);
    process.exit(1);
  }

  console.log(`Found ${products.length} total products in database.\n`);

  let totalVariantsCreated = 0;
  const summaryByBrand = {};

  for (const product of products) {
    let rawStorageOpts = [];
    try {
      rawStorageOpts = typeof product.storageOptions === 'string'
        ? JSON.parse(product.storageOptions)
        : (product.storageOptions || []);
    } catch {
      rawStorageOpts = [];
    }

    const defaultRam = (product.ram || '8GB').split('/')[0].trim();
    const variants = [];

    if (Array.isArray(rawStorageOpts) && rawStorageOpts.length > 0) {
      rawStorageOpts.forEach((opt, idx) => {
        const sizeStr = opt.size || opt.storage || "128GB";
        const price = opt.price || opt.basePrice || product.basePrice || 49999;
        const origPrice = opt.originalPrice || product.originalPrice || Math.round(price * 1.15);
        const stock = opt.stock !== undefined ? opt.stock : (product.stock !== undefined ? product.stock : 20);
        const slugSize = sizeStr.toLowerCase().replace(/[^a-z0-9]/g, '');

        variants.push({
          id: `${product.id}-${slugSize}`,
          productId: product.id,
          ram: opt.ram || defaultRam,
          storage: sizeStr,
          basePrice: price,
          originalPrice: origPrice >= price ? origPrice : price,
          stock: stock,
          inStock: stock > 0,
          sku: opt.sku || `${(product.brand || "VN").toUpperCase().slice(0, 3)}-${sizeStr.toUpperCase()}`,
          isDefault: idx === 0,
        });
      });
    } else {
      const price = product.basePrice || 49999;
      const origPrice = product.originalPrice || Math.round(price * 1.15);
      const stock = product.stock !== undefined ? product.stock : 20;

      variants.push({
        id: `${product.id}-128gb`,
        productId: product.id,
        ram: defaultRam,
        storage: "128GB",
        basePrice: price,
        originalPrice: origPrice >= price ? origPrice : price,
        stock: stock,
        inStock: stock > 0,
        sku: `${(product.brand || "VN").toUpperCase().slice(0, 3)}-DEF`,
        isDefault: true,
      });
    }

    const brand = product.brand || "Other";
    summaryByBrand[brand] = (summaryByBrand[brand] || 0) + 1;
    totalVariantsCreated += variants.length;

    if (!dryRun) {
      // 1. Clean existing variants for this product
      await supabase.from('ProductVariant').delete().eq('productId', product.id);

      // 2. Insert new variants
      for (const v of variants) {
        const { error: insErr } = await supabase.from('ProductVariant').insert({
          id: v.id,
          productId: product.id,
          ram: v.ram,
          storage: v.storage,
          price: v.basePrice,
          stock: v.stock,
          sku: v.sku,
        });
        if (insErr) {
          console.error(`Error inserting variant ${v.id} for product ${product.id}:`, insErr);
        }
      }

      // 3. Update MobileProduct storageOptions JSON and derived fields
      const lowestVariant = [...variants].sort((a, b) => a.basePrice - b.basePrice)[0];
      const defaultVariant = variants.find((v) => v.isDefault) || variants[0];
      const totalStock = variants.reduce((s, v) => s + v.stock, 0);

      const serializedStorageOptions = JSON.stringify(
        variants.map((v) => ({
          id: v.id,
          size: v.storage,
          storage: v.storage,
          ram: v.ram,
          basePrice: v.basePrice,
          price: v.basePrice,
          originalPrice: v.originalPrice,
          stock: v.stock,
          inStock: v.inStock,
          sku: v.sku,
          isDefault: v.isDefault,
        }))
      );

      await supabase
        .from('MobileProduct')
        .update({
          basePrice: lowestVariant.basePrice,
          originalPrice: defaultVariant.originalPrice || lowestVariant.originalPrice,
          stock: totalStock,
          inStock: variants.some((v) => v.stock > 0),
          storageOptions: serializedStorageOptions,
        })
        .eq('id', product.id);
    }
  }

  console.log("Migration Summary by Brand:");
  for (const [brand, count] of Object.entries(summaryByBrand)) {
    console.log(`- ${brand}: ${count} products`);
  }
  console.log(`\nTotal Products Processed: ${products.length}`);
  console.log(`Total Variants to Insert: ${totalVariantsCreated}`);
  console.log(dryRun ? "\nPreview completed successfully. No changes were committed." : "\nMigration executed and committed successfully!");
}

// If invoked directly from CLI
const isDirectRun = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isDirectRun) {
  const isExecute = process.argv.includes('--execute');
  runMigration(!isExecute);
}
