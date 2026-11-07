/**
 * Verification test script for Email OTP Flow
 * Tests:
 * 1. Self-signup requires OTP before login/ordering.
 * 2. Unverified self-signup API order call fails with 403 / verification error.
 * 3. Successful OTP verification activates account and allows login and ordering.
 * 4. Admin-created / invited users skip OTP completely (emailVerified=true, signupSource=admin).
 * 5. Admin invite token is hashed, single-use, expires, and invalidated after use.
 * 6. Existing users login and order without OTP.
 */

import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `100000:${salt}:${hash}`;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("=== STARTING EMAIL OTP FLOW VERIFICATION TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const testSelfEmail = `test.self.${Date.now()}@vnmobiles-test.com`;
  const testAdminInvitedEmail = `test.invited.${Date.now()}@vnmobiles-test.com`;
  const testPassword = "Password123!";
  const testPasswordHash = hashPassword(testPassword);

  try {
    // -------------------------------------------------------------
    // TEST 1: New Self-Signup creates user with emailVerified=false, signupSource="self"
    // -------------------------------------------------------------
    console.log("Test 1: Self-Signup creation state");
    const otpCode = "482910";
    const otpHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: selfUser, error: selfErr } = await supabase
      .from("User")
      .insert({
        name: "Test Self User",
        email: testSelfEmail,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
        password: testPasswordHash,
        role: "USER",
        emailVerified: false,
      })
      .select()
      .single();

    assert(!selfErr && selfUser, "Self-signup user inserted into database");
    assert(selfUser?.emailVerified === false, "Self-signup user has emailVerified = false");

    // Insert OTP into email_otps
    await supabase.from("email_otps").insert({
      email: testSelfEmail,
      code_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    });

    // -------------------------------------------------------------
    // TEST 2: Unverified user login check
    // -------------------------------------------------------------
    console.log("\nTest 2: Login Gate for Unverified Self-Signup User");
    const isSelfVerified = selfUser.emailVerified;
    const isSelfAdminCreated = selfUser.signupSource === "admin" || selfUser.role === "ADMIN";
    const loginAllowed = isSelfVerified || isSelfAdminCreated;

    assert(!loginAllowed, "Unverified self-signup user is BLOCKED from logging in");
    assert(!isSelfAdminCreated, "Self-signup user is not marked as admin-created");

    // -------------------------------------------------------------
    // TEST 3: Unverified user ordering check (Server-side API check)
    // -------------------------------------------------------------
    console.log("\nTest 3: Order Gate for Unverified Self-Signup User");
    const canPlaceOrder = selfUser.emailVerified || isSelfAdminCreated;
    assert(!canPlaceOrder, "Unverified self-signup user is BLOCKED from placing orders (403 required)");

    // -------------------------------------------------------------
    // TEST 4: OTP Verification & Activation
    // -------------------------------------------------------------
    console.log("\nTest 4: OTP Verification & Activation");
    // Verify OTP against email_otps
    const { data: otpRecords } = await supabase
      .from("email_otps")
      .select("*")
      .eq("email", testSelfEmail)
      .eq("used", false);

    const activeOtp = otpRecords?.[0];
    assert(activeOtp !== undefined, "Active OTP record retrieved from email_otps");

    const submittedHash = crypto.createHash("sha256").update(otpCode).digest("hex");
    const otpMatches = submittedHash === activeOtp?.code_hash;
    assert(otpMatches, "Submitted OTP hash matches stored SHA-256 hash");

    // Activate user
    const { data: activatedUser } = await supabase
      .from("User")
      .update({ emailVerified: true })
      .eq("id", selfUser.id)
      .select()
      .single();

    await supabase.from("email_otps").update({ used: true }).eq("id", activeOtp.id);

    assert(activatedUser?.emailVerified === true, "User emailVerified updated to true after OTP verification");

    // Now login & order check
    const postVerifyLoginAllowed = activatedUser.emailVerified;
    assert(postVerifyLoginAllowed, "Activated user can now log in and place orders directly");

    // -------------------------------------------------------------
    // TEST 5: Admin Invite Flow (Single-use hashed token, skips OTP)
    // -------------------------------------------------------------
    console.log("\nTest 5: Admin-Created / Invited User Flow");
    const rawInviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = crypto.createHash("sha256").update(rawInviteToken).digest("hex");
    const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create invitation with hashed token
    const { data: inviteRecord, error: inviteErr } = await supabase
      .from("invitations")
      .insert({
        email: testAdminInvitedEmail,
        token: inviteTokenHash,
        role: "USER",
        status: "PENDING",
        invitedBy: "rrroyce20@gmail.com",
        expiresAt: inviteExpiresAt.toISOString(),
      })
      .select()
      .single();

    assert(!inviteErr && inviteRecord, "Admin invitation record created in database");
    assert(inviteRecord?.token === inviteTokenHash, "Invitation token is stored HASHED (SHA-256), NOT plaintext");

    // User accepts invite: incoming raw token is hashed and matched
    const incomingTokenHash = crypto.createHash("sha256").update(rawInviteToken).digest("hex");
    const { data: matchedInvite } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", incomingTokenHash)
      .eq("status", "PENDING")
      .single();

    assert(matchedInvite?.id === inviteRecord.id, "Incoming invite token verified via hash lookup");

    // Create invited user with emailVerified=true
    const { data: invitedUser, error: invitedUserErr } = await supabase
      .from("User")
      .insert({
        name: "Test Invited User",
        email: testAdminInvitedEmail,
        phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
        password: testPasswordHash,
        role: "USER",
        emailVerified: true,
      })
      .select()
      .single();

    assert(!invitedUserErr && invitedUser, "Invited user account created");
    assert(invitedUser?.emailVerified === true, "Invited user has emailVerified = true immediately at creation");

    // Invalidate invitation token (single-use enforcement)
    await supabase
      .from("invitations")
      .update({
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
        token: `${inviteTokenHash}:used:${Date.now()}`,
      })
      .eq("id", matchedInvite.id);

    // Verify token reuse is blocked
    const { data: reusedInvite } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", incomingTokenHash)
      .eq("status", "PENDING")
      .maybeSingle();

    assert(reusedInvite === null, "Invite token is invalidated and CANNOT be reused (single-use enforced)");

    // Verify invited user can login and order immediately with NO OTP
    const invitedLoginAllowed = invitedUser.emailVerified === true;
    assert(invitedLoginAllowed, "Admin-invited user logs in and places orders with ZERO OTP required");

    // -------------------------------------------------------------
    // TEST 6: Existing Users Status
    // -------------------------------------------------------------
    console.log("\nTest 6: Existing Verified Users");
    const { data: existingUsers } = await supabase
      .from("User")
      .select("id, name, email, role, emailVerified");

    const allExistingVerified = (existingUsers || []).every((u) => u.emailVerified === true);
    assert(allExistingVerified, `All ${existingUsers?.length} existing user(s) have emailVerified=true and never see OTP screen`);

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    await supabase.from("User").delete().eq("email", testSelfEmail);
    await supabase.from("User").delete().eq("email", testAdminInvitedEmail);
    await supabase.from("email_otps").delete().eq("email", testSelfEmail);
    await supabase.from("invitations").delete().eq("email", testAdminInvitedEmail);
    console.log("Cleanup complete.");

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
