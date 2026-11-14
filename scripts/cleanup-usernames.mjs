/**
 * Data Clean-up Script for VN Mobiles Usernames & Orphan Accounts
 *
 * Capabilities:
 * 1. Identifies users with missing or empty usernames
 * 2. Identifies users with duplicate usernames
 * 3. Proposes unique usernames derived from name or email
 * 4. Identifies orphan half-created records (unverified, expired OTP/token, no orders)
 * 5. Supports DRY RUN (default, report only) and APPLY (--apply, writes changes)
 *
 * Usage:
 *   node scripts/cleanup-usernames.mjs          # DRY RUN: Inspects & displays counts, NO writes
 *   node scripts/cleanup-usernames.mjs --apply  # APPLY: Persists cleanup to database
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const isApply = process.argv.includes("--apply");

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "support", "vnmobiles", "vnmobile",
  "help", "security", "system", "null", "undefined", "moderator", "mod",
  "owner", "superuser", "billing", "api", "official", "staff", "team",
  "info", "contact", "orders", "warranty", "account", "auth", "login",
  "register", "signup", "signin", "guest", "anonymous", "service", "dev",
  "developer", "test", "testing",
]);

function normalizeUsername(username) {
  if (!username || typeof username !== "string") return "";
  return username.trim().toLowerCase();
}

function generateUniqueUsername(nameOrEmail, existingUsernames) {
  let base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  let clean = base.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9._]/g, "");
  if (clean.length < 3) clean = clean ? `${clean}_vn` : "user_vn";
  clean = clean.slice(0, 16);
  if (RESERVED_USERNAMES.has(clean)) clean = `user_${clean}`.slice(0, 16);

  let candidate = clean;
  let counter = 1;
  while (existingUsernames.has(candidate) || RESERVED_USERNAMES.has(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${clean.slice(0, 20 - suffix.length)}${suffix}`;
    counter++;
  }
  existingUsernames.add(candidate);
  return candidate;
}

async function runCleanup() {
  console.log("\n=======================================================");
  console.log("VN MOBILES: USERNAME DATA CLEAN-UP & ORPHAN AUDIT");
  console.log(`Mode: ${isApply ? "APPLY (WRITING TO DATABASE)" : "DRY RUN (REPORT ONLY - NO WRITES)"}`);
  console.log("=======================================================\n");

  // 1. Fetch all users
  const { data: users, error: userError } = await supabase
    .from("User")
    .select("*");

  if (userError) {
    console.error("Failed to fetch users:", userError);
    process.exit(1);
  }

  // 2. Fetch all orders to verify whether unverified users have orders
  const { data: orders } = await supabase.from("Order").select("id, userId");
  const userOrderCounts = new Map();
  (orders || []).forEach((o) => {
    if (o.userId) {
      userOrderCounts.set(o.userId, (userOrderCounts.get(o.userId) || 0) + 1);
    }
  });

  const now = new Date();
  const orphanUsers = [];
  const usersWithMissingUsername = [];
  const duplicateUsers = [];
  const validUsers = [];
  const existingSet = new Set();

  for (const user of users) {
    const rawUsername = user.username || "";
    const norm = normalizeUsername(rawUsername);
    const orderCount = userOrderCounts.get(user.id) || 0;

    // Check orphan half-created: unverified, self-signup, expired OTP/token, 0 orders
    const isUnverified = !user.emailVerified && !user.email_verified;
    const isExpired = user.otpExpires && new Date(user.otpExpires) < now;
    const isSelfSignup = user.signupSource === "self" || !user.signupSource;

    if (isUnverified && isSelfSignup && orderCount === 0 && isExpired) {
      orphanUsers.push({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        reason: "Unverified self-signup with expired verification and no orders",
      });
      continue; // Don't assign usernames to orphans scheduled for deletion
    }

    if (!norm) {
      usersWithMissingUsername.push(user);
    } else if (existingSet.has(norm)) {
      duplicateUsers.push(user);
    } else {
      existingSet.add(norm);
      validUsers.push({
        ...user,
        normalized: norm,
      });
    }
  }

  // 3. Generate proposed usernames for missing/duplicate records
  const proposedAssignments = [];

  for (const user of [...usersWithMissingUsername, ...duplicateUsers]) {
    const generated = generateUniqueUsername(user.name || user.email, existingSet);
    proposedAssignments.push({
      id: user.id,
      email: user.email,
      currentName: user.name,
      currentUsername: user.username || "<null>",
      assignedUsername: generated,
      normalizedUsername: normalizeUsername(generated),
    });
  }

  console.log("=== CLEANUP AUDIT SUMMARY & COUNTS ===");
  console.log(`Total Users Found in DB       : ${users.length}`);
  console.log(`Users with Valid Username     : ${validUsers.length}`);
  console.log(`Users Missing Username        : ${usersWithMissingUsername.length}`);
  console.log(`Duplicate Usernames Detected  : ${duplicateUsers.length}`);
  console.log(`Orphan Half-Created Records   : ${orphanUsers.length}\n`);

  if (orphanUsers.length > 0) {
    console.log("Orphan Half-Created Records Detected:");
    console.table(orphanUsers.map(u => ({
      ID: u.id.slice(0, 8) + "...",
      Email: u.email,
      Name: u.name,
      Created: u.createdAt,
      Reason: u.reason
    })));
  } else {
    console.log("✓ No orphan half-created records found.");
  }

  if (proposedAssignments.length > 0) {
    console.log("\nProposed Username Assignments:");
    console.table(proposedAssignments.map(u => ({
      ID: u.id.slice(0, 8) + "...",
      Email: u.email,
      "Current Handle": u.currentName,
      "Current Username": u.currentUsername,
      "Assigned Username": u.assignedUsername,
    })));
  } else {
    console.log("✓ All active accounts already have valid usernames.");
  }

  if (isApply) {
    console.log("\n[APPLYING CLEANUP TO DATABASE]");

    // Delete orphans
    if (orphanUsers.length > 0) {
      for (const orphan of orphanUsers) {
        const { error } = await supabase.from("User").delete().eq("id", orphan.id);
        if (error) console.error(`Error deleting orphan ${orphan.id}:`, error.message);
        else console.log(`Deleted orphan user: ${orphan.email} (${orphan.id})`);
      }
    }

    // Apply username assignments
    for (const assignment of proposedAssignments) {
      const { error } = await supabase
        .from("User")
        .update({
          username: assignment.assignedUsername,
          normalizedUsername: assignment.normalizedUsername,
          name: assignment.currentName || assignment.assignedUsername,
        })
        .eq("id", assignment.id);

      if (error) {
        console.error(`Error updating user ${assignment.id}:`, error.message);
      } else {
        console.log(`Assigned username '${assignment.assignedUsername}' to ${assignment.email}`);
      }
    }

    console.log("\n✓ Clean-up successfully applied to database.");
  } else {
    console.log("\n[DRY RUN COMPLETE] No records were modified or deleted.");
    console.log("Run with '--apply' to execute these updates.");
  }
}

runCleanup().catch(console.error);
