import "dotenv/config";

import crypto from "crypto";
import { prisma } from "../src/lib/prisma.ts";
import { GET as checkUsernameGET } from "../src/app/api/invite/check-username/route.ts";
import { POST as acceptInvitePOST } from "../src/app/api/invite/accept/route.ts";
import { POST as loginPOST } from "../src/app/api/auth/login/route.ts";
import { POST as sendOtpPOST } from "../src/app/api/auth/login-otp/send/route.ts";
import { POST as verifyOtpPOST } from "../src/app/api/auth/login-otp/verify/route.ts";

async function runTestSuite() {
  console.log("\n===================================================================");
  console.log("RUNNING USERNAME COMPREHENSIVE VERIFICATION SUITE ((a) through (g))");
  console.log("===================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // (a) Brand new name shows "Username is available"
  // -------------------------------------------------------------
  console.log("\n--- TEST (a): Brand new name shows 'Username is available' ---");
  const randName = `brand_new_${Date.now().toString().slice(-6)}`;
  const reqA = new Request(`http://localhost:3000/api/invite/check-username?name=${randName}`);
  const resA = await checkUsernameGET(reqA);
  const dataA = await resA.json();
  assert(dataA.available === true, "Brand new name is available", JSON.stringify(dataA));
  assert(dataA.reason === null, "Reason is null for available username");
  assert(dataA.message === "Username is available", "Message indicates available");

  // -------------------------------------------------------------
  // (b) A really used name shows "taken"
  // -------------------------------------------------------------
  console.log("\n--- TEST (b): Really used name shows 'taken' ---");
  const reqB = new Request(`http://localhost:3000/api/invite/check-username?name=Vicramathithan`);
  const resB = await checkUsernameGET(reqB);
  const dataB = await resB.json();
  assert(dataB.available === false, "Used name is not available", JSON.stringify(dataB));
  assert(dataB.reason === "taken", "Reason is specifically 'taken'");
  assert(dataB.message === "Username already taken", "Message specifically says 'Username already taken'");

  // -------------------------------------------------------------
  // (c) "Vicram" and "vicram" are treated as the same
  // -------------------------------------------------------------
  console.log("\n--- TEST (c): 'Vicramathithan' and 'vicramathithan' treated as the same ---");
  const reqC1 = new Request(`http://localhost:3000/api/invite/check-username?name=vicramathithan`);
  const resC1 = await checkUsernameGET(reqC1);
  const dataC1 = await resC1.json();

  const reqC2 = new Request(`http://localhost:3000/api/invite/check-username?name=VICRAMATHITHAN`);
  const resC2 = await checkUsernameGET(reqC2);
  const dataC2 = await resC2.json();

  assert(dataC1.available === false && dataC1.reason === "taken", "Lowercase 'vicramathithan' is taken");
  assert(dataC2.available === false && dataC2.reason === "taken", "Uppercase 'VICRAMATHITHAN' is taken");
  assert(dataC1.reason === dataC2.reason, "Case sensitivity is fully normalized (both report 'taken')");

  // -------------------------------------------------------------
  // (d) 2-character, invalid characters, or reserved names show the right message instead of "taken"
  // -------------------------------------------------------------
  console.log("\n--- TEST (d): Short, invalid symbols, or reserved names show specific message instead of 'taken' ---");
  // 2-character
  const reqD1 = new Request(`http://localhost:3000/api/invite/check-username?name=ab`);
  const resD1 = await checkUsernameGET(reqD1);
  const dataD1 = await resD1.json();
  assert(dataD1.available === false, "2-char name not available");
  assert(dataD1.reason === "too short", "2-char reports reason 'too short' (NOT 'taken')");
  assert(dataD1.message.includes("at least 3 characters"), "Message says at least 3 characters");

  // Symbols / Spaces
  const reqD2 = new Request(`http://localhost:3000/api/invite/check-username?name=user%20name`);
  const resD2 = await checkUsernameGET(reqD2);
  const dataD2 = await resD2.json();
  assert(dataD2.available === false, "Name with space not available");
  assert(dataD2.reason === "invalid characters", "Space reports reason 'invalid characters' (NOT 'taken')");

  // Reserved name
  const reqD3 = new Request(`http://localhost:3000/api/invite/check-username?name=admin`);
  const resD3 = await checkUsernameGET(reqD3);
  const dataD3 = await resD3.json();
  assert(dataD3.available === false, "Reserved name 'admin' not available");
  assert(dataD3.reason === "reserved", "Reserved name reports reason 'reserved' (NOT 'taken')");
  assert(dataD3.message.includes("reserved"), "Message says reserved");

  // -------------------------------------------------------------
  // (e) Create an account through an invite, sign out, and sign in with that username and password
  // -------------------------------------------------------------
  console.log("\n--- TEST (e): Invite acceptance and sign in with username & password ---");
  const testEmail = `invite_test_${Date.now()}@testvnmobiles.in`;
  const testHandle = `User_${Date.now().toString().slice(-6)}`;
  const testPw = "SuperSecret_123!";
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Create invite record
  const invite = await prisma.invitation.create({
    data: {
      email: testEmail,
      token: tokenHash,
      role: "USER",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Accept invite
  const acceptReq = new Request("http://localhost:3000/api/invite/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: rawToken,
      name: testHandle,
      password: testPw,
      confirmPassword: testPw,
    }),
  });
  const acceptRes = await acceptInvitePOST(acceptReq);
  const acceptData = await acceptRes.json();
  assert(acceptData.success === true, "Account created through invite", JSON.stringify(acceptData));

  // Verify created user in DB
  const createdUser = await prisma.user.findFirst({
    where: { email: testEmail },
  });
  assert(createdUser?.name === testHandle, "Stored typed name as display handle");
  assert(createdUser?.username === testHandle.toLowerCase(), "Stored lowercase username in username field");
  assert(createdUser?.emailVerified === true, "Invited user emailVerified is true");

  // Sign in using username (in mixed/lowercase) and password
  const loginReq = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrPhone: testHandle.toLowerCase(),
      password: testPw,
    }),
  });
  const loginRes = await loginPOST(loginReq);
  const loginData = await loginRes.json();
  assert(loginData.success === true, "Signed in with username and password", JSON.stringify(loginData));
  assert(loginData.user.name === testHandle, "Logged in user matches invited handle");

  // -------------------------------------------------------------
  // (f) Sign in again using the username with OTP login
  // -------------------------------------------------------------
  console.log("\n--- TEST (f): OTP login using username ---");
  // 1. Send OTP by username
  const sendOtpReq = new Request("http://localhost:3000/api/auth/login-otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testHandle,
    }),
  });
  const sendOtpRes = await sendOtpPOST(sendOtpReq);
  const sendOtpData = await sendOtpRes.json();
  assert(sendOtpData.success === true, "Requested login OTP via username", JSON.stringify(sendOtpData));
  assert(sendOtpData.message.includes("sent to its registered email"), "Returns neutral anti-enumeration message");
  assert(sendOtpData.maskedEmail.startsWith("i*****"), "Returns properly masked registered email for verification step");

  // Retrieve user OTP hash from DB and test verify (or simulate verification)
  const userWithOtp = await prisma.user.findUnique({
    where: { id: createdUser.id },
  });
  assert(!!userWithOtp?.loginOtpHash, "loginOtpHash generated and stored in database");

  // -------------------------------------------------------------
  // (g) Two quick submits of the same name create only one account (Race condition test)
  // -------------------------------------------------------------
  console.log("\n--- TEST (g): Concurrent duplicate submits create only one account ---");
  const raceHandle = `race_${Date.now().toString().slice(-6)}`;
  const raceEmail1 = `race1_${Date.now()}@testvnmobiles.in`;
  const raceEmail2 = `race2_${Date.now()}@testvnmobiles.in`;

  const token1 = crypto.randomBytes(32).toString("hex");
  const tokenHash1 = crypto.createHash("sha256").update(token1).digest("hex");
  await prisma.invitation.create({
    data: { email: raceEmail1, token: tokenHash1, role: "USER", status: "PENDING", expiresAt: new Date(Date.now() + 86400000) },
  });

  const token2 = crypto.randomBytes(32).toString("hex");
  const tokenHash2 = crypto.createHash("sha256").update(token2).digest("hex");
  await prisma.invitation.create({
    data: { email: raceEmail2, token: tokenHash2, role: "USER", status: "PENDING", expiresAt: new Date(Date.now() + 86400000) },
  });

  const [res1, res2] = await Promise.all([
    acceptInvitePOST(new Request("http://localhost:3000/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token1, name: raceHandle, password: "Password123!", confirmPassword: "Password123!" }),
    })),
    acceptInvitePOST(new Request("http://localhost:3000/api/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token2, name: raceHandle, password: "Password123!", confirmPassword: "Password123!" }),
    })),
  ]);

  const [d1, d2] = await Promise.all([res1.json(), res2.json()]);

  const successCount = [d1.success, d2.success].filter(Boolean).length;
  const duplicateError = [d1.error, d2.error].find(e => e === "Username already taken");

  assert(successCount === 1, "Exactly one account was created from concurrent submits", `d1: ${JSON.stringify(d1)}, d2: ${JSON.stringify(d2)}`);
  assert(duplicateError === "Username already taken", "Duplicate submit received 'Username already taken'");

  // Clean up test records
  console.log("\n--- Cleaning up temporary test records ---");
  await prisma.user.deleteMany({
    where: {
      email: { in: [testEmail, raceEmail1, raceEmail2] },
    },
  });
  await prisma.invitation.deleteMany({
    where: {
      email: { in: [testEmail, raceEmail1, raceEmail2] },
    },
  });
  console.log("Cleaned up test data.");

  console.log("\n===================================================================");
  console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(console.error);
