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
  console.log('   VN MOBILES - FORGOT PASSWORD SUCCESS FLOW VERIFICATION       ');
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

  const testEmail = 'success_flow_customer@vnmobiles.in';
  await prisma.user.deleteMany({ where: { email: testEmail } });

  const originalPassword = 'InitialSecurePassword2026!';
  const originalPasswordHash = hashPassword(originalPassword);

  const testUser = await prisma.user.create({
    data: {
      name: 'Success Flow Tester',
      email: testEmail,
      phone: '+91 97777 66666',
      password: originalPasswordHash,
      role: 'USER',
      emailVerified: true,
    },
  });
  console.log(`Created test customer: ${testEmail} (id: ${testUser.id})\n`);

  try {
    // --- SECTION 1: "NO, CONTINUE WITH EXISTING PASSWORD" ---
    console.log('--- TEST GROUP 1: "NO, CONTINUE WITH EXISTING PASSWORD" ---');

    // 1. Request recovery code
    const reqCodeRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      reqCodeRes.statusCode === 200 && reqCodeRes.body.success === true,
      'Recovery code requested successfully'
    );

    // Mock receiving the OTP
    const otp1 = '839201';
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        resetOtpHash: hashPassword(otp1),
        resetOtpAttempts: 0,
        resetOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // 2. Verify OTP -> generates recovery token
    const verifyOtpRes1 = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: testEmail,
      otp: otp1,
    });
    assert(
      verifyOtpRes1.statusCode === 200 && !!verifyOtpRes1.body.token,
      'Recovery OTP verified, issuing single-use authorization token'
    );
    const token1 = verifyOtpRes1.body.token;

    // 3. User chooses "No, Continue with Existing Password"
    const continueRes = await makeRequest('/api/auth/forgot-password/continue', 'POST', {
      token: token1,
    });
    assert(
      continueRes.statusCode === 200 && continueRes.body.success === true,
      'Calling /api/auth/forgot-password/continue succeeds with HTTP 200'
    );
    assert(
      continueRes.headers['set-cookie'] && continueRes.headers['set-cookie'][0].includes('vn_session='),
      'Session cookie (vn_session) is automatically issued upon continuing'
    );
    assert(
      continueRes.body.user && continueRes.body.user.email === testEmail,
      'User session object returned with correct customer details'
    );

    // 4. Verify password in DB is 100% UNCHANGED
    const userAfterContinue = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      userAfterContinue.password === originalPasswordHash,
      'CRITICAL: User password in database remains 100% UNCHANGED'
    );

    // 5. Verify the issued session allows accessing protected endpoints (/api/auth/me) with no second login prompt
    const sessionCookie1 = continueRes.headers['set-cookie'][0].split(';')[0];
    const meRes = await makeRequest('/api/auth/me', 'GET', null, sessionCookie1);
    assert(
      meRes.statusCode === 200 && meRes.body.user && meRes.body.user.email === testEmail,
      'User is authenticated and accesses the application immediately (no second login prompt)'
    );

    // 6. SINGLE-USE CHECK: Attempt to reuse token1 to create another session
    const reuseContinueRes = await makeRequest('/api/auth/forgot-password/continue', 'POST', {
      token: token1,
    });
    assert(
      reuseContinueRes.statusCode === 400 && reuseContinueRes.body.error.includes('already used'),
      'Single-use enforcement: Token cannot be reused to create additional sessions'
    );

    // Also attempt reset-password with token1
    const reuseResetRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: token1,
      newPassword: 'HackedPassword123!',
      confirmPassword: 'HackedPassword123!',
    });
    assert(
      reuseResetRes.statusCode === 400,
      'Single-use enforcement: Used recovery token cannot be reused for password reset'
    );


    // --- SECTION 2: "YES, UPDATE PASSWORD" ---
    console.log('\n--- TEST GROUP 2: "YES, UPDATE PASSWORD" ---');

    // 1. Request a fresh recovery code
    // Clear cooldown for test user
    await prisma.user.update({
      where: { id: testUser.id },
      data: { lastResetOtpSentAt: null },
    });

    const reqCodeRes2 = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      reqCodeRes2.statusCode === 200,
      'Fresh recovery code requested successfully'
    );

    const otp2 = '654321';
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        resetOtpHash: hashPassword(otp2),
        resetOtpAttempts: 0,
        resetOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // 2. Verify OTP
    const verifyOtpRes2 = await makeRequest('/api/auth/forgot-password/verify-otp', 'POST', {
      email: testEmail,
      otp: otp2,
    });
    const token2 = verifyOtpRes2.body.token;

    // 3. User chooses "Yes, Update Password" and submits new password
    const newPasswordChoice = 'BrandNewCustomPassword2026!';
    const resetRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: token2,
      newPassword: newPasswordChoice,
      confirmPassword: newPasswordChoice,
    });
    assert(
      resetRes.statusCode === 200 && resetRes.body.success === true,
      'Reset password succeeds with HTTP 200'
    );
    assert(
      resetRes.headers['set-cookie'] && resetRes.headers['set-cookie'][0].includes('vn_session='),
      'Reset password automatically issues session cookie (vn_session)'
    );

    // 4. Verify user can access application with the session cookie from reset
    const sessionCookie2 = resetRes.headers['set-cookie'][0].split(';')[0];
    const meRes2 = await makeRequest('/api/auth/me', 'GET', null, sessionCookie2);
    assert(
      meRes2.statusCode === 200 && meRes2.body.user && meRes2.body.user.email === testEmail,
      'User accesses application directly after password update'
    );

    // 5. Verify user can also log in using the newly updated password via regular login
    const regularLoginNewPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: newPasswordChoice,
    });
    assert(
      regularLoginNewPass.statusCode === 200 && regularLoginNewPass.body.success === true,
      'User can also sign in normally using the new password'
    );

    // 6. Verify old password is rejected
    const regularLoginOldPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: originalPassword,
    });
    assert(
      regularLoginOldPass.statusCode === 401,
      'Old password is now rejected'
    );

    // 7. SINGLE-USE CHECK for token2
    const reuseToken2Res = await makeRequest('/api/auth/reset-password', 'POST', {
      token: token2,
      newPassword: 'AnotherPassword999!',
      confirmPassword: 'AnotherPassword999!',
    });
    assert(
      reuseToken2Res.statusCode === 400,
      'Single-use enforcement: Token cannot be reused after password update'
    );

    const reuseContinueToken2 = await makeRequest('/api/auth/forgot-password/continue', 'POST', {
      token: token2,
    });
    assert(
      reuseContinueToken2.statusCode === 400,
      'Single-use enforcement: Token cannot be used to create sessions after password update'
    );

    // --- SECTION 3: REGRESSION CHECKS ---
    console.log('\n--- TEST GROUP 3: REGRESSION CHECKS ---');
    const adminLoginRes = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: 'admin',
      password: 'admin123',
    });
    assert(
      adminLoginRes.statusCode === 200 && adminLoginRes.body.user.role === 'ADMIN',
      'Admin password authentication remains intact and unchanged'
    );

  } finally {
    // Cleanup temporary test customer
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log(`\nCleaned up test customer: ${testEmail}`);
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

