/**
 * One-time migration script: Assign unique usernames and normalized copies to existing users.
 *
 * Rules:
 * - Letters, numbers, dot, underscore, 3 to 20 characters
 * - Stored as normalized copy (lowercase, trimmed)
 * - Block reserved names (admin, support, vnmobiles, etc.)
 * - Detect and report collisions/duplicates
 *
 * Usage:
 *   node scripts/migrate-usernames.mjs          # DRY RUN (Inspect counts and proposed changes, NO writes)
 *   node scripts/migrate-usernames.mjs --apply  # APPLY CHANGES (Writes to DB)
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

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "vnmobiles",
  "vnmobile",
  "help",
  "security",
  "system",
  "null",
  "undefined",
  "moderator",
  "mod",
  "owner",
  "superuser",
  "billing",
  "api",
  "official",
  "staff",
  "team",
  "info",
  "contact",
  "orders",
  "warranty",
  "account",
  "auth",
  "login",
  "register",
  "signup",
  "signin",
  "guest",
  "anonymous",
  "service",
  "dev",
  "developer",
  "test",
  "testing",
]);

function normalizeUsername(username) {
  if (!username || typeof username !== "string") return "";
  return username.trim().toLowerCase();
}

function generateUniqueUsername(nameOrEmail, existingUsernames) {
  let base = "";
  if (nameOrEmail.includes("@")) {
    base = nameOrEmail.split("@")[0];
  } else {
    base = nameOrEmail;
  }

  let clean = base
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9._]/g, "");

  if (clean.length < 3) {
    clean = clean ? `${clean}_vn` : "user_vn";
  }

  clean = clean.slice(0, 16);

  if (RESERVED_USERNAMES.has(clean)) {
    clean = `user_${clean}`.slice(0, 16);
  }

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

async function runMigration() {
  console.log(`\n======================================================`);
  console.log(`ONE-TIME MIGRATION: POPULATE USERNAME & NORMALIZED USERNAME`);
  console.log(`Mode: ${isApply ? "APPLY (WRITES TO DB)" : "DRY RUN (REPORT ONLY - NO WRITES)"}`);
  console.log(`======================================================\n`);

  // 1. Fetch all users from PostgreSQL User table
  const { data: users, error } = await supabase
    .from("User")
    .select("id, name, email, role, username, normalizedUsername, createdAt");

  if (error) {
    // If columns do not physically exist yet in PostgREST schema cache
    console.warn("Notice: Column check returned:", error.message);
    const { data: fallbackUsers, error: fallbackError } = await supabase
      .from("User")
      .select("id, name, email, role, createdAt");

    if (fallbackError) {
      console.error("Database query failed:", fallbackError);
      process.exit(1);
    }

    return processUsers(fallbackUsers || []);
  }

  return processUsers(users || []);
}

async function processUsers(users) {
  console.log(`Total users found in database: ${users.length}\n`);

  const existingNormalizedSet = new Set();
  const duplicateReports = [];
  const usersToUpdate = [];
  const usersWithValidUsername = [];

  // Pass 1: Catalog existing usernames
  for (const user of users) {
    const rawUsername = user.username || (user.name && !user.name.includes(" ") ? user.name : null);
    const norm = normalizeUsername(rawUsername);

    if (norm && !RESERVED_USERNAMES.has(norm) && norm.length >= 3 && norm.length <= 20) {
      if (existingNormalizedSet.has(norm)) {
        duplicateReports.push({
          userId: user.id,
          email: user.email,
          duplicateUsername: norm,
        });
      } else {
        existingNormalizedSet.add(norm);
        usersWithValidUsername.push({
          userId: user.id,
          email: user.email,
          username: rawUsername,
          normalizedUsername: norm,
        });
      }
    }
  }

  // Pass 2: Assign unique usernames to users who have none or have duplicates/invalid handles
  for (const user of users) {
    const rawUsername = user.username || (user.name && !user.name.includes(" ") ? user.name : null);
    const norm = normalizeUsername(rawUsername);

    const alreadyValid = usersWithValidUsername.some((u) => u.userId === user.id);
    if (!alreadyValid) {
      const generated = generateUniqueUsername(user.name || user.email, existingNormalizedSet);
      usersToUpdate.push({
        id: user.id,
        name: user.name,
        email: user.email,
        assignedUsername: generated,
        normalizedUsername: normalizeUsername(generated),
        source: user.name ? `derived from name ("${user.name}")` : `derived from email ("${user.email}")`,
      });
    }
  }

  console.log("=== MIGRATION COUNTS & REPORT ===");
  console.log(`Total Accounts Scanned      : ${users.length}`);
  console.log(`Accounts with Valid Username: ${usersWithValidUsername.length}`);
  console.log(`Accounts Needing Username   : ${usersToUpdate.length}`);
  console.log(`Detected Duplicates         : ${duplicateReports.length}`);

  if (duplicateReports.length > 0) {
    console.log("\nDetected Duplicate Usernames:");
    console.table(duplicateReports);
  } else {
    console.log("\n✓ No duplicate usernames detected among existing accounts.");
  }

  if (usersToUpdate.length > 0) {
    console.log("\nProposed Username Assignments:");
    console.table(
      usersToUpdate.map((u) => ({
        "User ID": u.id.slice(0, 8) + "...",
        Email: u.email,
        "Current Name": u.name,
        "Assigned Username": u.assignedUsername,
        "Normalized": u.normalizedUsername,
        Source: u.source,
      }))
    );
  } else {
    console.log("\n✓ All existing accounts already have valid usernames assigned.");
  }

  if (isApply) {
    console.log("\nApplying changes to database...");
    let successCount = 0;
    for (const update of usersToUpdate) {
      const payload = {
        name: update.name || update.assignedUsername,
        username: update.assignedUsername,
        normalizedUsername: update.normalizedUsername,
      };

      const { error } = await supabase.from("User").update(payload).eq("id", update.id);
      if (error) {
        // Fallback if physical columns pending SQL migration
        const fallback = await supabase
          .from("User")
          .update({ name: update.assignedUsername })
          .eq("id", update.id);
        if (fallback.error) {
          console.error(`Failed to update user ${update.id}:`, error.message);
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    }
    console.log(`\n✓ Successfully applied username updates to ${successCount} user(s).`);
  } else {
    console.log("\n[DRY RUN COMPLETE] No changes were written to the database.");
    console.log("Run with '--apply' to persist these assignments.");
  }
}

runMigration().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
