/**
 * One-time migration script: Fix existing invites whose user no longer exists
 *
 * Rules:
 * 1. Checks every invitation in `invitations` against the `User` table.
 * 2. If an invite is marked ACCEPTED but its user has been deleted, updates it to `ACCOUNT_DELETED`.
 * 3. Identifies older duplicate invitations for the same email.
 * 4. Safe dry-run mode by default; applies changes to database only with `--apply`.
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
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const isApply = process.argv.includes("--apply");

async function runInviteSync() {
  console.log(`\n======================================================`);
  console.log(`VN MOBILES - INVITATION STATUS SYNC & ORPHAN AUDIT`);
  console.log(`Mode: ${isApply ? "APPLY (WRITING TO DATABASE)" : "DRY RUN (REPORT ONLY, NO WRITES)"}`);
  console.log(`======================================================\n`);

  // 1. Fetch all invitations
  const { data: invites, error: invErr } = await supabase
    .from("invitations")
    .select("*")
    .order("createdAt", { ascending: false });

  if (invErr) {
    console.error("Failed to fetch invitations:", invErr);
    process.exit(1);
  }

  // 2. Fetch all registered users
  const { data: users, error: userErr } = await supabase
    .from("User")
    .select("id, name, email, emailVerified, role, createdAt");

  if (userErr) {
    console.error("Failed to fetch users:", userErr);
    process.exit(1);
  }

  console.log(`Found ${invites.length} total invitations in database.`);
  console.log(`Found ${users.length} registered users in database.\n`);

  const userByEmail = new Map();
  for (const u of users) {
    if (u.email) userByEmail.set(u.email.toLowerCase().trim(), u);
  }

  // Group invites by email
  const invitesByEmail = new Map();
  for (const inv of invites) {
    const em = (inv.email || "").toLowerCase().trim();
    if (!invitesByEmail.has(em)) invitesByEmail.set(em, []);
    invitesByEmail.get(em).push(inv);
  }

  const orphansToFix = [];
  const supersededInvites = [];
  const activeAccepted = [];

  for (const [email, emailInvites] of invitesByEmail.entries()) {
    const user = userByEmail.get(email);
    const newestInviteId = emailInvites[0]?.id;

    for (let i = 0; i < emailInvites.length; i++) {
      const inv = emailInvites[i];
      const isNewest = inv.id === newestInviteId;
      const status = (inv.status || "").toUpperCase();

      if (status === "ACCEPTED") {
        if (!user) {
          // Accepted, but user is deleted from User table!
          orphansToFix.push({
            id: inv.id,
            email: inv.email,
            createdAt: inv.createdAt,
            acceptedAt: inv.acceptedAt,
            reason: "User account was deleted; invite status must be ACCOUNT_DELETED",
          });
        } else if (!isNewest) {
          // User exists, but this is an older accepted invite from a previous account creation cycle
          // Check if current user was created after this invite was accepted
          const userCreated = new Date(user.createdAt).getTime();
          const inviteAccepted = new Date(inv.acceptedAt || inv.createdAt).getTime();
          if (userCreated > inviteAccepted + 60000) {
            // User was created significantly after this invite -> older deleted account!
            orphansToFix.push({
              id: inv.id,
              email: inv.email,
              createdAt: inv.createdAt,
              acceptedAt: inv.acceptedAt,
              reason: "Belonged to an earlier deleted account cycle; status must be ACCOUNT_DELETED",
            });
          } else {
            activeAccepted.push(inv);
          }
        } else {
          activeAccepted.push(inv);
        }
      } else if (status === "PENDING" && !isNewest) {
        supersededInvites.push({
          id: inv.id,
          email: inv.email,
          createdAt: inv.createdAt,
          reason: "Older pending invite superseded by newer invite",
        });
      }
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`AUDIT REPORT:`);
  console.log(`- Total invitations examined:           ${invites.length}`);
  console.log(`- Active accepted invitations:          ${activeAccepted.length}`);
  console.log(`- Orphaned accepted invites to fix:     ${orphansToFix.length}`);
  console.log(`- Older superseded pending invites:     ${supersededInvites.length}`);
  console.log(`------------------------------------------------------\n`);

  if (orphansToFix.length > 0) {
    console.log(`ORPHANED INVITES AFFECTED (User deleted):`);
    orphansToFix.forEach((item, idx) => {
      console.log(`[${idx + 1}] ID:        ${item.id}`);
      console.log(`    Email:     ${item.email}`);
      console.log(`    Sent:      ${item.createdAt}`);
      console.log(`    Accepted:  ${item.acceptedAt}`);
      console.log(`    Issue:     ${item.reason}\n`);
    });
  } else {
    console.log(`No orphaned accepted invitations found.\n`);
  }

  if (isApply && orphansToFix.length > 0) {
    console.log(`Applying updates to database...`);
    for (const item of orphansToFix) {
      const meta = {
        accountDeletedAt: new Date().toISOString(),
        deletedBy: "deleted by user or admin",
      };
      const invRow = invites.find((i) => i.id === item.id);
      const baseToken = (invRow?.token || "").split(":meta:")[0];
      const packedToken = `${baseToken}:meta:${Buffer.from(JSON.stringify(meta)).toString("base64")}`;

      const { error: updErr } = await supabase
        .from("invitations")
        .update({
          status: "ACCOUNT_DELETED",
          token: packedToken,
        })
        .eq("id", item.id);

      if (updErr) {
        console.error(`Failed to update invite ${item.id}:`, updErr);
      } else {
        console.log(`✓ Updated invite ${item.id} -> ACCOUNT_DELETED`);
      }
    }
    console.log(`\n[SUCCESS] Applied fixes to ${orphansToFix.length} invitation records.\n`);
  } else if (!isApply) {
    console.log(`[NOTE] This was a DRY RUN. No database writes were performed.`);
    console.log(`To apply updates, run: node scripts/sync-invite-statuses.mjs --apply\n`);
  }
}

runInviteSync().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
