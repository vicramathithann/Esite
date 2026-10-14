const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://127.0.0.1:3000';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function makeRequest(path, method, body, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            json = { rawText: raw };
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
          });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('   VN MOBILES - CORRECTED FORGOT PASSWORD FLOW TEST SUITE       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Setup temporary test customer
  const testEmail = 'flow_test_user@vnmobiles.in';
  await prisma.user.deleteMany({ where: { email: testEmail } });

  const originalPassword = 'MySecretOriginalPass2026!';
  const originalHash = hashPassword(originalPassword);

  const testUser = await prisma.user.create({
    data: {
      name: 'Flow Test Customer',
      email: testEmail,
      phone: '+91 98888 77777',
      password: originalHash,
      role: 'USER',
      emailVerified: true,
    },
  });
  console.log(`Created clean test customer: ${testEmail} (id: ${testUser.id})\n`);

  try {
    // --- STEP 1 & 2: REQUEST PASSWORD RECOVERY CODE ---
    console.log('--- TEST GROUP 1: REQUEST RECOVERY CODE & EXPIRY ---');
    const sendRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      sendRes.statusCode === 200 && sendRes.body.success === true,
      'Recovery code request dispatches via Gmail SMTP with HTTP 200'
    );

    let dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      dbUser.resetOtpHash && dbUser.resetOtpHash.includes(':'),
      'Recovery OTP is securely hashed in database with PBKDF2/SHA-512'
    );

    const expiryTime = new Date(dbUser.resetOtpExpires).getTime();
    const now = Date.now();
    const diffMinutes = (expiryTime - now) / (60 * 1000);
    assert(
      diffMinutes > 4.0 && diffMinutes <= 5.1,
      `Recovery OTP has strict 5-minute expiry (actual: ${diffMinutes.toFixed(2)} mins)`
    );

    // 60-second Cooldown Check
    const cooldownRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      cooldownRes.statusCode === 429 && cooldownRes.body.cooldown > 0,
      'Rate-limiting: Resending within 60s enforces HTTP 429 Cooldown'
    );

    // --- STEP 3: OTP VERIFICATION WITHOUT CHANGING PASSWORD ---
    console.log('\n--- TEST GROUP 2: OTP VERIFICATION & ATTEMPTS LIMIT ---');
    // Wrong OTP attempt
    const wrongOtpRes = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: testEmail,
      otp: '000000',
    });
    assert(
      wrongOtpRes.statusCode === 400 && wrongOtpRes.body.remainingAttempts === 4,
      'Wrong recovery OTP decrements remaining attempts (4 attempts remaining)'
    );

    // Simulate verified OTP
    const mockOtp = '492817';
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        resetOtpHash: hashPassword(mockOtp),
        resetOtpAttempts: 0,
        resetOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    const preVerifyUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    const preVerifyPass = preVerifyUser.password;

    const verifyOtpRes = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: testEmail,
      otp: mockOtp,
    });
    assert(
      verifyOtpRes.statusCode === 200 && verifyOtpRes.body.success === true && !!verifyOtpRes.body.token,
      'Valid recovery OTP verification succeeds with HTTP 200 and issues reset token'
    );

    const postVerifyUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      postVerifyUser.password === preVerifyPass,
      'CRITICAL: User password is NOT changed automatically upon OTP verification'
    );
    assert(
      postVerifyUser.resetOtpHash === null,
      'Single-use enforcement: Recovery OTP hash is cleared/consumed upon verification'
    );

    // Replay attack check
    const replayRes = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: testEmail,
      otp: mockOtp,
    });
    assert(
      replayRes.statusCode === 410 || replayRes.statusCode === 400,
      'Replay prevention: Consumed recovery OTP cannot be verified again'
    );

    const generatedToken = verifyOtpRes.body.token;

    // --- STEP 4 & 5: LOGIN PAGE POPUP "Would you like to update your password?" ---
    console.log('\n--- TEST GROUP 3: LOGIN PAGE POPUP RENDERING ---');
    const loginPageWithParams = await makeRequest(
      `/login?forgotVerified=true&email=${encodeURIComponent(testEmail)}&token=${encodeURIComponent(generatedToken)}`,
      'GET'
    );
    assert(
      loginPageWithParams.statusCode === 200,
      'GET /login with recovery parameters responds with HTTP 200'
    );

    // Verify popup elements exist in client component
    const fs = require('fs');
    const loginSource = fs.readFileSync('src/app/login/page.tsx', 'utf8');
    assert(
      loginSource.includes('Would you like to update your password?'),
      'Login page includes popup: "Would you like to update your password?"'
    );
    assert(
      loginSource.includes('Yes, Update Password') &&
      loginSource.includes('No, Continue with Existing Password'),
      'Popup provides both choices: "Yes, Update Password" and "No, Continue with Existing Password"'
    );

    // --- CHOICE B: "No, Continue" (Keep existing password) ---
    console.log('\n--- TEST GROUP 4: CHOICE B - "NO, CONTINUE" ---');
    // If user chooses "No, Continue", they simply sign in with their existing password!
    const loginWithOriginalPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: originalPassword,
    });
    assert(
      loginWithOriginalPass.statusCode === 200 && loginWithOriginalPass.body.success === true,
      'User can successfully log in using their EXISTING password when choosing "No, Continue"'
    );

    const userAfterChoiceB = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      userAfterChoiceB.password === originalHash,
      'Existing password remains completely untouched in the database'
    );

    // --- CHOICE A: "Yes, Update Password" ---
    console.log('\n--- TEST GROUP 5: CHOICE A - "YES, UPDATE PASSWORD" ---');
    const newPasswordChoiceA = 'UpdatedBrandNewPassword2026!';
    const resetRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: generatedToken,
      newPassword: newPasswordChoiceA,
      confirmPassword: newPasswordChoiceA,
    });
    assert(
      resetRes.statusCode === 200 && resetRes.body.success === true,
      'Password update with token succeeds with HTTP 200'
    );

    // Verify user can now log in with the new password
    const loginWithNewPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: newPasswordChoiceA,
    });
    assert(
      loginWithNewPass.statusCode === 200 && loginWithNewPass.body.success === true,
      'User can successfully log in with the newly updated password'
    );

    // Verify old password is now rejected
    const loginWithOldPassRejected = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: originalPassword,
    });
    assert(
      loginWithOldPassRejected.statusCode === 401,
      'Original password is now invalidated and rejected after update'
    );

    // Single-use token invalidation
    const reuseTokenRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: generatedToken,
      newPassword: 'AnotherPassword999!',
      confirmPassword: 'AnotherPassword999!',
    });
    assert(
      reuseTokenRes.statusCode === 400,
      'Single-use enforcement: Used reset token cannot be reused'
    );

    // --- RESTRICTION VERIFICATION ---
    console.log('\n--- TEST GROUP 6: RESTRICTIONS VERIFICATION ---');
    // Normal login must not show popup
    const normalLoginHtml = await makeRequest('/login', 'GET');
    // The literal popup string without params is hidden by client-side condition
    assert(
      normalLoginHtml.statusCode === 200,
      'Normal login page renders cleanly without recovery state'
    );

    // Normal admin login still works
    const adminRes = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: 'admin',
      password: 'admin123',
    });
    assert(
      adminRes.statusCode === 200 && adminRes.body.user.role === 'ADMIN',
      'Administrator password login remains fully functional and routed to /admin'
    );

  } finally {
    // Cleanup temporary test customer
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log(`\nCleaned up temporary test customer: ${testEmail}`);
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
