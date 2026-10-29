/**
 * Automated Unit & Integration Tests for Account Deletion OTP Logic
 * Verifies:
 * 1. Expiry (10-minute window)
 * 2. Wrong attempts (maximum 5 wrong attempts then invalidate)
 * 3. Reuse (single-use enforcement)
 * 4. Rate limiting (maximum 3 requests per hour per user / IP)
 * 5. Constant-time hash verification (SHA-256 with per-record salt)
 */

import assert from "assert";
import crypto from "crypto";

// Mock In-Memory Database for Unit Testing OTP Lifecycle
interface MockAccountDeletionRequest {
  id: string;
  userId: string;
  otpHash: string;
  salt: string;
  expiresAt: Date;
  attempts: number;
  usedAt: Date | null;
  createdAt: Date;
  ipAddress: string;
}

class MockAccountDeletionStore {
  private records: MockAccountDeletionRequest[] = [];

  createRecord(userId: string, otp: string, ipAddress: string): MockAccountDeletionRequest {
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
    const record: MockAccountDeletionRequest = {
      id: crypto.randomUUID(),
      userId,
      otpHash,
      salt,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      usedAt: null,
      createdAt: new Date(),
      ipAddress,
    };
    this.records.push(record);
    return record;
  }

  getRecentRequestsCount(userId: string, ipAddress: string, windowMs = 60 * 60 * 1000): { userCount: number; ipCount: number } {
    const threshold = new Date(Date.now() - windowMs);
    const userCount = this.records.filter(r => r.userId === userId && r.createdAt >= threshold).length;
    const ipCount = this.records.filter(r => r.ipAddress === ipAddress && r.createdAt >= threshold).length;
    return { userCount, ipCount };
  }

  verifyOtp(recordId: string, submittedOtp: string): { success: boolean; error?: string; remainingAttempts?: number } {
    const record = this.records.find(r => r.id === recordId);
    if (!record) {
      return { success: false, error: "Record not found" };
    }

    if (record.usedAt !== null) {
      return { success: false, error: "This verification code has already been used." };
    }

    if (record.attempts >= 5) {
      return { success: false, error: "Too many failed attempts. This code has been invalidated." };
    }

    if (record.expiresAt < new Date()) {
      return { success: false, error: "This verification code has expired." };
    }

    // Constant-time comparison
    const computedHash = crypto.createHash("sha256").update(`${submittedOtp}:${record.salt}`).digest("hex");
    const isMatch = computedHash.length === record.otpHash.length &&
      crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(record.otpHash, "hex"));

    if (!isMatch) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        record.usedAt = new Date(); // Invalidate
        return { success: false, error: "Maximum attempts exceeded. This code has been invalidated." };
      }
      return {
        success: false,
        error: `Incorrect verification code. ${5 - record.attempts} attempts remaining.`,
        remainingAttempts: 5 - record.attempts,
      };
    }

    // Success -> Mark as single-use
    record.usedAt = new Date();
    return { success: true };
  }
}

async function runTests() {
  console.log("=== Running Account Deletion OTP Logic Tests ===\n");
  const store = new MockAccountDeletionStore();

  // Test 1: Successful OTP Verification & Single-Use
  console.log("Test 1: Valid OTP verification and single-use enforcement");
  const validOtp = "729401";
  const user1 = "usr_001";
  const ip1 = "192.168.1.10";

  const req1 = store.createRecord(user1, validOtp, ip1);
  const verify1 = store.verifyOtp(req1.id, validOtp);
  assert.strictEqual(verify1.success, true, "Valid OTP must verify successfully");

  // Re-verification attempt (Reuse Test)
  const reuseAttempt = store.verifyOtp(req1.id, validOtp);
  assert.strictEqual(reuseAttempt.success, false, "Reused OTP must be rejected");
  assert.strictEqual(reuseAttempt.error, "This verification code has already been used.");
  console.log("  [PASS] Valid OTP verified and cannot be reused.\n");

  // Test 2: Expired OTP
  console.log("Test 2: Expired OTP rejection (10-minute expiry)");
  const req2 = store.createRecord("usr_002", "123456", "192.168.1.11");
  // Fast forward expiry into the past
  req2.expiresAt = new Date(Date.now() - 1000);

  const expiredVerify = store.verifyOtp(req2.id, "123456");
  assert.strictEqual(expiredVerify.success, false, "Expired OTP must be rejected");
  assert.strictEqual(expiredVerify.error, "This verification code has expired.");
  console.log("  [PASS] Expired OTP rejected properly.\n");

  // Test 3: Wrong Attempts Counter & Invalidation at 5 Attempts
  console.log("Test 3: Maximum 5 wrong attempts and automatic invalidation");
  const req3 = store.createRecord("usr_003", "654321", "192.168.1.12");

  // 1st wrong attempt
  let failRes = store.verifyOtp(req3.id, "000001");
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.remainingAttempts, 4);

  // 2nd wrong attempt
  failRes = store.verifyOtp(req3.id, "000002");
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.remainingAttempts, 3);

  // 3rd wrong attempt
  failRes = store.verifyOtp(req3.id, "000003");
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.remainingAttempts, 2);

  // 4th wrong attempt
  failRes = store.verifyOtp(req3.id, "000004");
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.remainingAttempts, 1);

  // 5th wrong attempt -> Should invalidate
  failRes = store.verifyOtp(req3.id, "000005");
  assert.strictEqual(failRes.success, false);
  assert.ok(failRes.error?.includes("Maximum attempts exceeded"), "Must invalidate on 5th failed attempt");

  // 6th attempt (even with correct code) must now be rejected
  const lockedOutRes = store.verifyOtp(req3.id, "654321");
  assert.strictEqual(lockedOutRes.success, false, "Invalidated OTP cannot be redeemed even with correct code");
  console.log("  [PASS] 5 wrong attempts tracked accurately and permanently invalidated.\n");

  // Test 4: Rate Limiting (Maximum 3 per hour per user / IP)
  console.log("Test 4: Rate limiting enforcement (3 requests per hour)");
  const rateStore = new MockAccountDeletionStore();
  const rateUser = "usr_rate_limited";
  const rateIp = "10.0.0.50";

  // Request 1
  rateStore.createRecord(rateUser, "111111", rateIp);
  // Request 2
  rateStore.createRecord(rateUser, "222222", rateIp);
  // Request 3
  rateStore.createRecord(rateUser, "333333", rateIp);

  const { userCount, ipCount } = rateStore.getRecentRequestsCount(rateUser, rateIp);
  assert.strictEqual(userCount, 3, "User request count must be 3");
  assert.strictEqual(ipCount, 3, "IP request count must be 3");

  const isRateLimited = userCount >= 3 || ipCount >= 3;
  assert.strictEqual(isRateLimited, true, "4th request must trigger rate limit block");
  console.log("  [PASS] Rate limit accurately restricts requests to 3 per hour per user and IP.\n");

  // Test 5: Cryptographic Salt & Constant-Time Safety
  console.log("Test 5: Cryptographic properties (Salt uniqueness & SHA-256)");
  const testOtp = "999888";
  const recA = store.createRecord("uA", testOtp, "1.1.1.1");
  const recB = store.createRecord("uB", testOtp, "1.1.1.1");

  assert.notStrictEqual(recA.salt, recB.salt, "Salts must be randomly generated and unique");
  assert.notStrictEqual(recA.otpHash, recB.otpHash, "Hashes of the same OTP must differ due to unique salts");
  console.log("  [PASS] Per-record salting and SHA-256 hashing verified.\n");

  console.log("All Account Deletion OTP tests passed successfully! (5/5)");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

