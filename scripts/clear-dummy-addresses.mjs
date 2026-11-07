/**
 * One-time migration script: Safely clear dummy delivery address from existing users.
 * 
 * Rules:
 * 1. ONLY clears the address if it contains dummy data:
 *    - "Skyline Tech Park"
 *    - "560103"
 *    - "Flat 402"
 * 2. Does NOT touch real addresses.
 * 3. Dry-run mode by default; pass --apply to execute the update.
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const isApply = process.argv.includes("--apply");

async function runMigration() {
  console.log(`\n======================================================`);
  console.log(`ONE-TIME MIGRATION: CLEAR DUMMY DELIVERY ADDRESSES`);
  console.log(`Mode: ${isApply ? "APPLY (WRITES TO DB)" : "DRY RUN (REPORT ONLY)"}`);
  console.log(`======================================================\n`);

  // 1. Fetch all users
  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, email, address");

  if (error) {
    console.error("Database query failed:", error);
    process.exit(1);
  }

  console.log(`Total users in database: ${users.length}`);

  // 2. Identify users matching the dummy pattern
  const dummyMatches = users.filter((u) => {
    if (!u.address) return false;
    const lower = u.address.toLowerCase();
    return (
      lower.includes("skyline tech park") ||
      lower.includes("560103") ||
      lower.includes("flat 402")
    );
  });

  console.log(`Matching users with dummy address: ${dummyMatches.length}`);

  if (dummyMatches.length === 0) {
    console.log("No users have the dummy address stored. No records need to be modified.");
    return { affectedCount: 0 };
  }

  console.log("\nAffected users to be cleared:");
  dummyMatches.forEach((u, idx) => {
    console.log(`  ${idx + 1}. [${u.id}] ${u.name} (${u.email}) -> Current Address: "${u.address}"`);
  });

  if (!isApply) {
    console.log("\n[DRY RUN COMPLETE] To apply this change, run with --apply flag.");
    return { affectedCount: dummyMatches.length };
  }

  // 3. Clear address for matched users only
  let updatedCount = 0;
  for (const user of dummyMatches) {
    const { error: updateError } = await supabase
      .from("User")
      .update({ address: "" })
      .eq("id", user.id);

    if (updateError) {
      console.error(`Failed to clear address for user ${user.id}:`, updateError);
    } else {
      updatedCount++;
      console.log(`Cleared address for user: ${user.name} (${user.email})`);
    }
  }

  console.log(`\nMigration completed. Total records cleared: ${updatedCount}`);
  return { affectedCount: updatedCount };
}

runMigration().catch(console.error);
