/**
 * VN Mobiles - One-time User Avatar Cleanup & Migration Script
 * 
 * Usage:
 *   Dry-run inspection:
 *     npx tsx -r dotenv/config scripts/cleanup-user-avatars.ts
 * 
 *   Execute cleanup (only after explicit confirmation):
 *     npx tsx -r dotenv/config scripts/cleanup-user-avatars.ts --confirm
 */
import { supabaseAdmin } from "../src/lib/supabase";

async function main() {
  const isConfirmed = process.argv.includes("--confirm");

  console.log("==================================================");
  console.log("VN Mobiles - Avatar Field Database & Storage Audit");
  console.log("==================================================");

  // 1. Inspect User table
  const { data: users, error: userError } = await supabaseAdmin
    .from("User")
    .select("id, name, email, avatar");

  if (userError) {
    console.error("Error reading User table:", userError);
    process.exit(1);
  }

  const allUsers = users || [];
  const affectedUsers = allUsers.filter(
    (u) => u.avatar && typeof u.avatar === "string" && u.avatar.trim() !== ""
  );

  console.log(`\n[Database Status]`);
  console.log(`- Total users registered: ${allUsers.length}`);
  console.log(`- Users with non-empty avatar column: ${affectedUsers.length}`);

  if (affectedUsers.length > 0) {
    console.log("\nAffected users list:");
    affectedUsers.forEach((u) => console.log(`  * ${u.name} (${u.email}): ${u.avatar}`));
  } else {
    console.log("  (All user avatar columns are already empty / null)");
  }

  // 2. Inspect Storage Bucket
  console.log(`\n[Storage Bucket Status]`);
  const { data: files, error: storageError } = await supabaseAdmin.storage
    .from("avatars")
    .list("", { limit: 100 });

  if (storageError) {
    console.log(`- 'avatars' bucket status: ${storageError.message}`);
  } else {
    const fileCount = files?.length || 0;
    console.log(`- 'avatars' bucket file count: ${fileCount}`);
    if (files && files.length > 0) {
      files.forEach((f) => console.log(`  * ${f.name} (size: ${f.metadata?.size || "unknown"})`));
    }
  }

  console.log(`\n[Product Images Safety Check]`);
  const { data: prodFiles, error: prodErr } = await supabaseAdmin.storage
    .from("product-images")
    .list("", { limit: 1 });

  if (prodErr) {
    console.log(`- product-images status: ${prodErr.message}`);
  } else {
    console.log(`- 'product-images' bucket is active and healthy (${prodFiles?.length || 0} items verified) - NOT TOUCHED.`);
  }

  // 3. Execution (Only if --confirm passed)
  if (isConfirmed) {
    console.log("\n[Executing Cleanup]");
    if (affectedUsers.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("User")
        .update({ avatar: null })
        .in("id", affectedUsers.map((u) => u.id));

      if (updateError) {
        console.error("Failed to nullify avatar fields:", updateError);
        process.exit(1);
      }
      console.log("✓ Successfully nullified avatar fields for all users.");
    }

    if (files && files.length > 0) {
      const pathsToDelete = files.map((f) => f.name);
      const { error: deleteFileErr } = await supabaseAdmin.storage
        .from("avatars")
        .remove(pathsToDelete);

      if (deleteFileErr) {
        console.error("Failed to delete files from avatars bucket:", deleteFileErr);
      } else {
        console.log(`✓ Deleted ${pathsToDelete.length} files from 'avatars' bucket.`);
      }
    }
    console.log("\nCleanup execution completed.");
  } else {
    console.log("\n[Notice]");
    console.log("Dry-run inspection completed. No data was modified.");
    console.log("To apply changes, run with --confirm after user approval.");
  }
}

main().catch(console.error);
