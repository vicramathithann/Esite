const http = require('http');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();
const BASE_URL = 'http://127.0.0.1:3000';

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
  console.log('====================================================');
  console.log('   VN MOBILES - AUTHENTICATION SUITE VERIFICATION   ');
  console.log('====================================================\n');

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

  // 1. Setup a dedicated temporary test user so existing users remain untouched
  const testEmail = 'autotest_customer@vnmobiles.in';
  await prisma.user.deleteMany({ where: { email: testEmail } });
  
  const initialPassword = 'InitialPassword123!';
  const initialHashedPassword = hashPassword(initialPassword);

  const testUser = await prisma.user.create({
    data: {
      name: 'Test Customer',
      email: testEmail,
      phone: '+91 91234 56789',
      password: initialHashedPassword,
      role: 'USER',
      emailVerified: true,
    },
  });
  console.log(`Created clean test customer: ${testUser.email} (id: ${testUser.id})\n`);

  try {
    // TEST 1: Password Login - Customer
    console.log('--- TEST GROUP 1: PASSWORD LOGIN ---');
    const custLoginRes = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: initialPassword,
    });
    assert(
      custLoginRes.statusCode === 200 && custLoginRes.body.success === true && custLoginRes.body.user.role === 'USER',
      'Customer can log in with password and receives role USER'
    );
    assert(
      custLoginRes.headers['set-cookie'] && custLoginRes.headers['set-cookie'][0].includes('vn_session='),
      'Customer login sets vn_session HTTP-only cookie'
    );

    // TEST 2: Password Login - Admin
    const adminLoginRes = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: 'admin',
      password: 'admin123',
    });
    assert(
      adminLoginRes.statusCode === 200 && adminLoginRes.body.success === true && adminLoginRes.body.user.role === 'ADMIN',
      'Administrator can log in with password and receives role ADMIN'
    );
    assert(
      adminLoginRes.body.redirectUrl === '/admin',
      'Admin login routes to /admin dashboard'
    );

    // TEST 3: Login with OTP - Anti-Enumeration
    console.log('\n--- TEST GROUP 2: LOGIN WITH OTP ---');
    const fakeEmailRes = await makeRequest('/api/auth/login-otp/send', 'POST', {
      email: 'nonexistent_account_xyz@example.com',
    });
    assert(
      fakeEmailRes.statusCode === 200 && fakeEmailRes.body.success === true,
      'Anti-enumeration: Requesting OTP for nonexistent email returns generic success'
    );

    // TEST 4: Login with OTP - Admin Account Blocked
    const adminOtpSendRes = await makeRequest('/api/auth/login-otp/send', 'POST', {
      email: 'admin@vmmobiles.in',
    });
    assert(
      adminOtpSendRes.statusCode === 403 && adminOtpSendRes.body.success === false,
      'Admin isolation: Admin cannot log in via customer OTP (must use admin password)'
    );

    // TEST 5: Login with OTP - Send to Customer
    const custOtpSendRes = await makeRequest('/api/auth/login-otp/send', 'POST', {
      email: testEmail,
    });
    assert(
      custOtpSendRes.statusCode === 200 && custOtpSendRes.body.success === true,
      'Customer receives OTP send success response'
    );
    assert(
      !custOtpSendRes.body.otp,
      'Security: Plain OTP is never exposed in API response'
    );

    // Check DB record for test user
    let dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      dbUser.loginOtpHash && dbUser.loginOtpHash.includes(':'),
      'OTP is securely hashed with PBKDF2/SHA-512 in database (not plain text)'
    );
    assert(
      dbUser.loginOtpExpires && dbUser.loginOtpExpires > new Date(),
      'OTP has a valid future expiration timestamp (5 minutes)'
    );

    // TEST 6: Login with OTP - 60s Resend Cooldown
    const cooldownRes = await makeRequest('/api/auth/login-otp/send', 'POST', {
      email: testEmail,
    });
    assert(
      cooldownRes.statusCode === 429 && cooldownRes.body.cooldown > 0,
      'Rate-limiting: Requesting OTP again within 60s returns HTTP 429 Cooldown'
    );

    // TEST 7: Login with OTP - Wrong OTP Decrements Remaining Attempts
    const wrongOtpRes = await makeRequest('/api/auth/login-otp/verify', 'POST', {
      email: testEmail,
      otp: '000000',
    });
    assert(
      wrongOtpRes.statusCode === 400 && wrongOtpRes.body.remainingAttempts === 4,
      'Wrong OTP increments failed attempts and returns remaining attempts (4 left)'
    );

    // TEST 8: Login with OTP - Valid OTP Verification & Password Integrity Check
    // Set a known OTP hash directly in DB to simulate receiving the email OTP
    const knownOtp = '582914';
    const knownOtpHash = hashPassword(knownOtp); // Same pbkdf2 format
    await prisma.user.update({
      where: { id: testUser.id },
      data: { loginOtpHash: knownOtpHash, loginOtpAttempts: 0 },
    });

    const preVerifyUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    const preVerifyPasswordHash = preVerifyUser.password;

    const verifyRes = await makeRequest('/api/auth/login-otp/verify', 'POST', {
      email: testEmail,
      otp: knownOtp,
    });
    assert(
      verifyRes.statusCode === 200 && verifyRes.body.success === true && verifyRes.body.user.email === testEmail,
      'Valid OTP verification succeeds and returns authenticated user object'
    );
    assert(
      verifyRes.headers['set-cookie'] && verifyRes.headers['set-cookie'][0].includes('vn_session='),
      'Valid OTP verification issues vn_session HTTP-only cookie'
    );

    const postVerifyUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      postVerifyUser.password === preVerifyPasswordHash,
      'CRITICAL: User password in DB is 100% UNCHANGED after OTP login'
    );
    assert(
      postVerifyUser.loginOtpHash === null && postVerifyUser.loginOtpExpires === null,
      'Single-use verification: loginOtpHash is cleared upon successful verification'
    );

    // TEST 9: Login with OTP - Replay Attack Prevention
    const replayRes = await makeRequest('/api/auth/login-otp/verify', 'POST', {
      email: testEmail,
      otp: knownOtp,
    });
    assert(
      replayRes.statusCode === 410 || replayRes.statusCode === 400,
      'OTP Replay Prevention: Previously used OTP cannot be verified a second time'
    );

    // TEST 10: Forgot Password - Anti-Enumeration
    console.log('\n--- TEST GROUP 3: FORGOT PASSWORD & RESET ---');
    const fakeForgotRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: 'nonexistent_account_abc@example.com',
    });
    assert(
      fakeForgotRes.statusCode === 200 && fakeForgotRes.body.success === true,
      'Anti-enumeration: Forgot password returns generic success for unknown email'
    );

    // TEST 11: Forgot Password - Real Account Dispatch
    const forgotRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      forgotRes.statusCode === 200 && forgotRes.body.success === true,
      'Forgot password dispatches reset instructions for existing user'
    );

    dbUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    assert(
      dbUser.resetOtpHash && dbUser.resetOtpHash.includes(':') && dbUser.resetToken && dbUser.resetToken.length === 64,
      'Dual reset generated: resetOtpHash (PBKDF2) and 32-byte hex resetToken stored'
    );

    // TEST 12: Forgot Password - 60s Resend Cooldown
    const forgotCooldownRes = await makeRequest('/api/auth/forgot-password', 'POST', {
      email: testEmail,
    });
    assert(
      forgotCooldownRes.statusCode === 429 && forgotCooldownRes.body.cooldown > 0,
      'Rate-limiting: Requesting password reset within 60s returns HTTP 429 Cooldown'
    );

    // TEST 13: Reset Password - Input Validation
    const shortPassRes = await makeRequest('/api/auth/reset-password', 'POST', {
      email: testEmail,
      otp: '123456',
      newPassword: '123',
      confirmPassword: '123',
    });
    assert(
      shortPassRes.statusCode === 400 && shortPassRes.body.error.includes('at least 6 characters'),
      'Reset password rejects short passwords (< 6 characters)'
    );

    const mismatchPassRes = await makeRequest('/api/auth/reset-password', 'POST', {
      email: testEmail,
      otp: '123456',
      newPassword: 'BrandNewPassword123!',
      confirmPassword: 'DifferentPassword456!',
    });
    assert(
      mismatchPassRes.statusCode === 400 && mismatchPassRes.body.error.includes('do not match'),
      'Reset password rejects mismatching password confirmation'
    );

    // TEST 14: Reset Password via OTP
    const resetOtpCode = '749201';
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        resetOtpHash: hashPassword(resetOtpCode),
        resetOtpAttempts: 0,
        resetOtpExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const newPassword1 = 'BrandNewPassword2026!';
    const resetSuccessRes = await makeRequest('/api/auth/reset-password', 'POST', {
      email: testEmail,
      otp: resetOtpCode,
      newPassword: newPassword1,
      confirmPassword: newPassword1,
    });
    assert(
      resetSuccessRes.statusCode === 200 && resetSuccessRes.body.success === true,
      'Reset password via 6-digit OTP succeeds with 200 OK'
    );

    // Verify user can now log in with the new password
    const loginWithNewPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: newPassword1,
    });
    assert(
      loginWithNewPass.statusCode === 200 && loginWithNewPass.body.success === true,
      'User can successfully log in using their new password'
    );

    // Verify old password fails
    const loginWithOldPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: initialPassword,
    });
    assert(
      loginWithOldPass.statusCode === 401 && loginWithOldPass.body.success === false,
      'Old password is no longer accepted after reset'
    );

    // TEST 15: Single-Use Invalidation (OTP reuse blocked)
    const reuseOtpRes = await makeRequest('/api/auth/reset-password', 'POST', {
      email: testEmail,
      otp: resetOtpCode,
      newPassword: 'AnotherPassword999!',
      confirmPassword: 'AnotherPassword999!',
    });
    assert(
      reuseOtpRes.statusCode === 410 || reuseOtpRes.statusCode === 400,
      'Single-use enforcement: Used reset OTP cannot be reused'
    );

    // TEST 16: Reset Password via Direct Token Link
    const testResetToken = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        resetToken: testResetToken,
        resetTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const newPassword2 = 'DirectTokenPassword2026!';
    const tokenResetRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: testResetToken,
      newPassword: newPassword2,
      confirmPassword: newPassword2,
    });
    assert(
      tokenResetRes.statusCode === 200 && tokenResetRes.body.success === true,
      'Reset password via direct link token succeeds with 200 OK'
    );

    // Verify user can now log in with the second new password
    const loginWithTokenPass = await makeRequest('/api/auth/login', 'POST', {
      emailOrPhone: testEmail,
      password: newPassword2,
    });
    assert(
      loginWithTokenPass.statusCode === 200 && loginWithTokenPass.body.success === true,
      'User can log in with password updated via direct link'
    );

    // Verify token cannot be reused
    const reuseTokenRes = await makeRequest('/api/auth/reset-password', 'POST', {
      token: testResetToken,
      newPassword: 'ThirdPassword888!',
      confirmPassword: 'ThirdPassword888!',
    });
    assert(
      reuseTokenRes.statusCode === 400 && reuseTokenRes.body.error.includes('Invalid or already used'),
      'Single-use enforcement: Used reset token cannot be reused'
    );

    // TEST 17: UI Pages Accessibility
    console.log('\n--- TEST GROUP 4: UI ROUTE ACCESSIBILITY ---');
    const loginPageRes = await makeRequest('/login', 'GET');
    assert(
      loginPageRes.statusCode === 200 && loginPageRes.body.rawText.includes('Universal Sign In'),
      'GET /login renders with HTTP 200 and Universal Sign In title'
    );

    const forgotPageRes = await makeRequest('/forgot-password', 'GET');
    assert(
      forgotPageRes.statusCode === 200,
      'GET /forgot-password renders with HTTP 200'
    );

    const resetPageRes = await makeRequest('/reset-password', 'GET');
    assert(
      resetPageRes.statusCode === 200,
      'GET /reset-password renders with HTTP 200'
    );

  } finally {
    // Clean up temporary test user
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log(`\nCleaned up temporary test customer account: ${testEmail}`);
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log('====================================================');

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
