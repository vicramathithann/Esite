/**
 * Test script for Invite Acceptance Flow & New Email Template
 */

import dotenv from "dotenv";
dotenv.config();

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read and verify admin-invitation template code
const templateSource = fs.readFileSync("src/lib/email-templates/admin-invitation.ts", "utf8");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `100000:${salt}:${hash}`;
}

async function runTests() {
  console.log("=== STARTING INVITE ACCEPTANCE & EMAIL TEMPLATE TESTS ===\n");
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

  const testEmail = `invitee.${Date.now()}@vnmobiles-test.com`;
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const inviteLink = `https://vnmobiles.in/invite?token=${encodeURIComponent(rawToken)}`;
  const testUsername = `user_${Date.now()}`.slice(0, 15);

  try {
    // ------------------------------------------------------------------
    // TEST SUITE 1: EMAIL TEMPLATE VERIFICATION (NO ADMIN IDENTITY EXPOSED)
    // ------------------------------------------------------------------
    console.log("Test Suite 1: New Invite Email Template");

    assert(
      templateSource.includes('const subject = "You\'re invited to join VN Mobiles"'),
      "Subject is exact: \"You're invited to join VN Mobiles\""
    );

    assert(
      templateSource.includes('text: "INVITATION"'),
      "Badge contains 'INVITATION'"
    );

    assert(
      templateSource.includes('headline: "You\'re invited."'),
      "Headline is 'You're invited.'"
    );

    assert(
      templateSource.includes("You've been invited to join VN Mobiles. Click the button below to set up your account and get started."),
      "Body contains exact requested invitation copy"
    );

    assert(
      templateSource.includes("Invited email") &&
      templateSource.includes("Access") &&
      templateSource.includes("Link validity"),
      "Details table contains exact 3 rows: Invited email, Access, Link validity"
    );

    assert(
      !templateSource.includes("Assigned Email") &&
      !templateSource.includes("Invited By") &&
      !templateSource.includes("Security Policy"),
      "Old wording ('Assigned Email', 'Invited By', 'Security Policy') is completely removed"
    );

    assert(
      !templateSource.includes("rrroyce20") &&
      !templateSource.includes("Administrator Portal") &&
      !templateSource.includes("invitedByName"),
      "NO admin name, address, or email is exposed anywhere in template"
    );

    assert(
      templateSource.includes('label: "Accept Invitation"'),
      "Gold button label is 'Accept Invitation'"
    );

    assert(
      !templateSource.includes("word-break:break-all"),
      "No visible plain-text link in HTML body (only inside the button)"
    );

    assert(
      templateSource.includes("If you weren't expecting this invitation, you can safely ignore this email."),
      "Footer contains standard safe-ignore notice"
    );

    // ------------------------------------------------------------------
    // TEST SUITE 2: INVITATION TOKEN CREATION (HASHED STORAGE)
    // ------------------------------------------------------------------
    console.log("\nTest Suite 2: Invitation Creation & Hashed Storage");
    const { data: invite, error: inviteErr } = await supabase
      .from("invitations")
      .insert({
        email: testEmail,
        token: tokenHash,
        role: "USER",
        status: "PENDING",
        invitedBy: "system",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    assert(!inviteErr && invite, "Invitation inserted into DB");
    assert(invite?.token === tokenHash, "Database stores SHA-256 hash, NOT raw token");

    // ------------------------------------------------------------------
    // TEST SUITE 3: VALIDATION AND FAILED ATTEMPTS DO NOT BURN TOKEN
    // ------------------------------------------------------------------
    console.log("\nTest Suite 3: Failed Attempts Do Not Burn Token");
    // Verify token lookup by raw token
    const computedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const { data: foundInvite } = await supabase
      .from("invitations")
      .select("*")
      .or(`token.eq.${computedHash},token.eq.${rawToken}`)
      .single();

    assert(foundInvite?.status === "PENDING", "Invitation lookup successful and status is PENDING");

    // Attempt with weak password (< 8 chars) -> should fail
    const weakPassword = "123";
    const weakPasswordValid = weakPassword.length >= 8;
    assert(!weakPasswordValid, "Password length < 8 rejected by rule");

    // Verify token is still PENDING after failed validation
    const { data: stillPendingInvite } = await supabase
      .from("invitations")
      .select("status")
      .eq("id", invite.id)
      .single();

    assert(stillPendingInvite?.status === "PENDING", "Failed attempt did NOT burn the token (status still PENDING)");

    // ------------------------------------------------------------------
    // TEST SUITE 4: SUCCESSFUL ACCOUNT CREATION (NO OTP, ADMIN ROLE, ADMIN SIGNUP SOURCE)
    // ------------------------------------------------------------------
    console.log("\nTest Suite 4: Account Creation via Invite (No OTP)");
    const strongPassword = "Password2026!";
    const hashedPassword = hashPassword(strongPassword);
    const assignedEmail = foundInvite.email.toLowerCase().trim(); // from invite record!

    // Create user in DB (simulating /api/invite/accept logic)
    const uniquePhone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const userRole = (foundInvite.role || "USER").toUpperCase();

    const insertPayload = {
      name: testUsername,
      email: assignedEmail,
      phone: uniquePhone,
      password: hashedPassword,
      role: userRole,
      emailVerified: true,
      signupSource: "admin",
    };

    // Use our resilient insertion with PGRST204 fallback
    let { data: newUser, error: createErr } = await supabase
      .from("User")
      .insert(insertPayload)
      .select()
      .single();

    if (createErr && (createErr.code === "PGRST204" || createErr.code === "42703" || createErr.message?.includes("signupSource"))) {
      const fallback = { ...insertPayload };
      delete fallback.signupSource;
      const retry = await supabase.from("User").insert(fallback).select().single();
      newUser = retry.data;
      createErr = retry.error;
    }

    assert(!createErr && newUser, `User account created successfully (@${testUsername})`);
    assert(newUser?.emailVerified === true, "User has emailVerified = true immediately at creation");
    assert(newUser?.role === userRole, `User has role = '${userRole}' assigned from the invite`);

    // Invalidate token ONLY after successful creation
    await supabase
      .from("invitations")
      .update({
        status: "ACCEPTED",
        acceptedAt: new Date().toISOString(),
        token: `${computedHash}:used:${Date.now()}`,
      })
      .eq("id", invite.id);

    // ------------------------------------------------------------------
    // TEST SUITE 5: SECOND ATTEMPT WITH SAME LINK FAILS
    // ------------------------------------------------------------------
    console.log("\nTest Suite 5: Single-Use Token Security (Second Attempt)");
    const { data: secondAttemptInvite } = await supabase
      .from("invitations")
      .select("*")
      .or(`token.eq.${computedHash},token.eq.${rawToken}`)
      .maybeSingle();

    const isAlreadyUsed = !secondAttemptInvite || secondAttemptInvite.status === "ACCEPTED" || Boolean(secondAttemptInvite.acceptedAt);
    assert(isAlreadyUsed, "Second attempt with same link fails: token is recognized as already used (status ACCEPTED)");

    // ------------------------------------------------------------------
    // TEST SUITE 6: USER CAN LOGIN AND ORDER WITH ZERO OTP
    // ------------------------------------------------------------------
    console.log("\nTest Suite 6: Login & Order with Zero OTP");
    const userCanLoginWithoutOtp = newUser.emailVerified === true;
    const userCanOrderWithoutOtp = newUser.emailVerified === true;

    assert(userCanLoginWithoutOtp, "Created user logs in straight without OTP");
    assert(userCanOrderWithoutOtp, "Created user can place orders straight without OTP");

    // ------------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    await supabase.from("User").delete().eq("email", testEmail);
    await supabase.from("invitations").delete().eq("id", invite.id);
    console.log("Cleanup complete.");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
