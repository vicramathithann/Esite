/**
 * One-time migration script: Ensure all existing users and admin-created users
 * have emailVerified = true so they are never asked for OTP verification again.
 *
 * Usage:
 *   node scripts/migrate-email-verified.mjs          # Dry-run (inspect only)
 *   node scripts/migrate-email-verified.mjs --apply  # Apply changes to database
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
  console.error("Missing Supabase credentials in environment (.env)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const isApply = process.argv.includes("--apply");
const ADMIN_EMAIL = "rrroyce20@gmail.com";

async function runMigration() {
  console.log(`\n======================================================`);
  console.log(`ONE-TIME MIGRATION: VERIFY EXISTING USERS & ADMIN ACCOUNTS`);
  console.log(`Mode: ${isApply ? "APPLY (WRITES TO DB)" : "DRY RUN (REPORT ONLY)"}`);
  console.log(`======================================================\n`);

  // 1. Fetch all users from PostgreSQL User table
  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, email, role, emailVerified, createdAt");

  if (error) {
    console.error("Database query failed:", error);
    process.exit(1);
  }

  console.log(`Total users found in database: ${users.length}\n`);

  // 2. Identify existing users needing emailVerified = true
  const usersToVerify = [];
  const alreadyVerified = [];

  for (const user of users) {
    const isVerified = Boolean(user.emailVerified);
    const isAdmin =
      (user.role || "").toUpperCase() === "ADMIN" ||
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (!isVerified) {
      usersToVerify.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentStatus: "UNVERIFIED (emailVerified: false)",
        targetStatus: "VERIFIED (emailVerified: true)",
        isAdmin,
      });
    } else {
      alreadyVerified.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentStatus: "ALREADY VERIFIED (emailVerified: true)",
        isAdmin,
      });
    }
  }

  console.log(`--- CURRENT USER STATUS SUMMARY ---`);
  users.forEach((u, i) => {
    const isVer = Boolean(u.emailVerified);
    console.log(
      `  ${i + 1}. [${u.id}] ${u.name} <${u.email}> | Role: ${u.role} | Verified: ${isVer ? "YES" : "NO"}`
    );
  });
  console.log(`-----------------------------------\n`);

  console.log(`Users already verified: ${alreadyVerified.length}`);
  console.log(`Users requiring verification update: ${usersToVerify.length}`);

  if (usersToVerify.length === 0) {
    console.log(`\nAll ${users.length} existing user(s) are already marked emailVerified = true.`);
    console.log(`No records need modification.`);
    return {
      totalUsers: users.length,
      alreadyVerifiedCount: alreadyVerified.length,
      affectedCount: 0,
    };
  }

  console.log(`\nAffected records to update (${usersToVerify.length}):`);
  usersToVerify.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.name} (${u.email}) -> set emailVerified = true`);
  });

  if (!isApply) {
    console.log(`\n[DRY RUN COMPLETE] To apply this update, re-run with --apply`);
    return {
      totalUsers: users.length,
      alreadyVerifiedCount: alreadyVerified.length,
      affectedCount: usersToVerify.length,
    };
  }

  // 3. Apply updates to the database
  let updatedCount = 0;
  for (const u of usersToVerify) {
    const { error: updateError } = await supabase
      .from("User")
      .update({
        emailVerified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
      })
      .eq("id", u.id);

    if (updateError) {
      console.error(`Failed to update user ${u.id} (${u.email}):`, updateError);
    } else {
      updatedCount++;
      console.log(`Successfully verified user: ${u.name} (${u.email})`);
    }
  }

  console.log(`\nMigration completed successfully. Updated ${updatedCount} record(s).`);
  return {
    totalUsers: users.length,
    alreadyVerifiedCount: alreadyVerified.length,
    affectedCount: updatedCount,
  };
}

runMigration().catch(console.error);
