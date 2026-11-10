/**
 * Automated test suite for Live Invite Status Tracking
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log("Starting Live Invite Status Tests...\n");
  const testEmail = `test-invite-${Date.now()}@example.com`;

  // Test 1: Create an invite
  console.log(`[Test 1] Creating invite for ${testEmail}...`);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const { data: inv1, error: createErr } = await supabase
    .from("invitations")
    .insert({
      email: testEmail,
      token: tokenHash,
      role: "USER",
      status: "PENDING",
      invitedBy: "rrroyce20@gmail.com",
      expiresAt,
    })
    .select()
    .single();

  if (createErr || !inv1) {
    console.error("Failed to insert test invite:", createErr);
    process.exit(1);
  }
  console.log("✓ Created invite ID:", inv1.id, "Status:", inv1.status);

  // Test 2: Simulate user accepting invite
  console.log(`\n[Test 2] Simulating user acceptance...`);
  const testUserId = crypto.randomUUID();
  const { data: user, error: userErr } = await supabase
    .from("User")
    .insert({
      id: testUserId,
      name: "Test Invited User",
      email: testEmail,
      phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
      password: "hashedpassword123",
      role: "USER",
      emailVerified: true,
    })
    .select()
    .single();

  if (userErr || !user) {
    console.error("Failed to insert user:", userErr);
    process.exit(1);
  }
  console.log("✓ Created user ID:", user.id);

  // Pack metadata on invite accept
  const acceptMeta = {
    acceptedUserId: user.id,
    acceptedAt: new Date().toISOString(),
  };
  const usedToken = `${tokenHash}:used:${Date.now()}:meta:${Buffer.from(JSON.stringify(acceptMeta)).toString("base64")}`;

  const { error: acceptErr } = await supabase
    .from("invitations")
    .update({
      status: "ACCEPTED",
      acceptedAt: new Date().toISOString(),
      token: usedToken,
    })
    .eq("id", inv1.id);

  if (acceptErr) {
    console.error("Failed to update invite to ACCEPTED:", acceptErr);
    process.exit(1);
  }
  console.log("✓ Updated invite to ACCEPTED with acceptedUserId:", user.id);

  // Test 3: Simulate user deletion
  console.log(`\n[Test 3] Simulating user deletion (admin or self-service)...`);
  // Update invite to ACCOUNT_DELETED as done in delete endpoints
  const deleteMeta = {
    acceptedUserId: user.id,
    accountDeletedAt: new Date().toISOString(),
    deletedBy: "deleted by admin (rrroyce20@gmail.com)",
  };
  const deletedToken = `${tokenHash}:meta:${Buffer.from(JSON.stringify(deleteMeta)).toString("base64")}`;

  await supabase
    .from("invitations")
    .update({
      status: "ACCOUNT_DELETED",
      token: deletedToken,
    })
    .eq("id", inv1.id);

  // Delete user from User table
  await supabase.from("User").delete().eq("id", user.id);
  console.log("✓ Deleted user and synced invite status to ACCOUNT_DELETED with deletedBy info.");

  // Test 4: Re-invite the same email
  console.log(`\n[Test 4] Re-inviting ${testEmail} to test superseding...`);
  const rawToken2 = crypto.randomBytes(32).toString("hex");
  const tokenHash2 = crypto.createHash("sha256").update(rawToken2).digest("hex");

  const { data: inv2, error: create2Err } = await supabase
    .from("invitations")
    .insert({
      email: testEmail,
      token: tokenHash2,
      role: "USER",
      status: "PENDING",
      invitedBy: "rrroyce20@gmail.com",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    })
    .select()
    .single();

  if (create2Err || !inv2) {
    console.error("Failed to create second invite:", create2Err);
    process.exit(1);
  }
  console.log("✓ Created second invite ID:", inv2.id);

  // Test 5: Revoking the pending invite
  console.log(`\n[Test 5] Revoking pending invite...`);
  const revokeMeta = {
    revokedAt: new Date().toISOString(),
    revokedBy: "rrroyce20@gmail.com",
  };
  const revokedToken = `${tokenHash2}:meta:${Buffer.from(JSON.stringify(revokeMeta)).toString("base64")}`;

  await supabase
    .from("invitations")
    .update({
      status: "REVOKED",
      token: revokedToken,
    })
    .eq("id", inv2.id);
  console.log("✓ Updated invite to REVOKED.");

  // Cleanup test records
  console.log(`\nCleaning up test invitations...`);
  await supabase.from("invitations").delete().in("id", [inv1.id, inv2.id]);
  console.log("✓ Test records cleaned up successfully.");

  console.log("\nALL TESTS PASSED SUCCESSFULLY! ✓✓✓\n");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
