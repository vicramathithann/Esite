/**
 * One-time Database Cleanup Script: Unsets 'avatar' for all users in the Supabase User table.
 * 
 * Target Storage Bucket to delete: 'avatars'
 * Note: 'product-images' bucket is NOT touched.
 */
import { supabaseAdmin } from "../src/lib/supabase";

async function runCleanup() {
  console.log("==================================================");
  console.log("VN Mobiles - Avatar Field Database Cleanup Script");
  console.log("==================================================");

  // 1. Fetch current users with an avatar
  const { data: users, error: fetchError } = await supabaseAdmin
    .from("User")
    .select("id, name, email, avatar");

  if (fetchError) {
    console.error("Error querying users:", fetchError);
    process.exit(1);
  }

  const allUsers = users || [];
  const affectedUsers = allUsers.filter(
    (u) => u.avatar && typeof u.avatar === "string" && u.avatar.trim() !== ""
  );

  console.log(`Total users in database: ${allUsers.length}`);
  console.log(`Users currently affected (non-empty avatar): ${affectedUsers.length}`);

  if (affectedUsers.length > 0) {
    console.log("Affected users list:");
    affectedUsers.forEach((u) => console.log(`- ${u.name} (${u.email}): ${u.avatar}`));

    // 2. Unset avatar field on all affected users
    const { error: updateError } = await supabaseAdmin
      .from("User")
      .update({ avatar: null })
      .in(
        "id",
        affectedUsers.map((u) => u.id)
      );

    if (updateError) {
      console.error("Failed to unset avatar fields:", updateError);
      process.exit(1);
    }
    console.log("Successfully unset avatar field for all affected users.");
  } else {
    console.log("No users currently have non-empty avatars. Database is already clean!");
  }

  console.log("\nStorage Bucket Summary:");
  console.log("- Avatar storage bucket: 'avatars' (can be safely deleted from Supabase Storage)");
  console.log("- Product images bucket: 'product-images' (KEPT INTACT - NOT TOUCHED)");
}

runCleanup().catch(console.error);
