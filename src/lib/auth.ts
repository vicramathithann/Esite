import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.GMAIL_APP_PASSWORD ||
  "vn-mobiles-auth-session-signing-key-2026";

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  return `${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }
  const parts = storedHash.split(":");

  // Format 1 (Modern): iterations:salt:hash
  if (parts.length === 3) {
    const [iterStr, salt, originalHash] = parts;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || iterations <= 0 || !salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    return hash.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  }

  // Format 2 (Legacy): salt:hash (check 100,000 iterations first, then fallback to 1,000)
  if (parts.length === 2) {
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) return false;
    // Check with 100,000 iterations
    const hash100k = crypto.pbkdf2Sync(password, salt, 100000, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    if (hash100k.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash100k), Buffer.from(originalHash))) {
      return true;
    }
    // Check with legacy 1,000 iterations
    const hash1k = crypto.pbkdf2Sync(password, salt, 1000, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    if (hash1k.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash1k), Buffer.from(originalHash))) {
      return true;
    }
    return false;
  }

  // Fallback for simple legacy test passwords if any
  return password === storedHash;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP (e.g. "482910").
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with a random salt using PBKDF2/SHA-512 (100,000 iterations) to prevent plaintext storage in DB.
 */
export function hashOtp(otp: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(otp.trim(), salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
  return `${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Verifies a submitted OTP against the stored PBKDF2 hash (supports both 100,000 and legacy 1,000 iterations).
 */
export function verifyOtp(otp: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }
  const parts = storedHash.split(":");
  if (parts.length === 3) {
    const [iterStr, salt, originalHash] = parts;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || iterations <= 0 || !salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(otp.trim(), salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    return hash.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  }
  if (parts.length === 2) {
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) return false;
    const hash100k = crypto.pbkdf2Sync(otp.trim(), salt, 100000, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    if (hash100k.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash100k), Buffer.from(originalHash))) {
      return true;
    }
    const hash1k = crypto.pbkdf2Sync(otp.trim(), salt, 1000, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
    if (hash1k.length === originalHash.length && crypto.timingSafeEqual(Buffer.from(hash1k), Buffer.from(originalHash))) {
      return true;
    }
  }
  return false;
}

/**
 * Validates whether the given string is a valid email address format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Creates a signed session token: `${userId}.${timestamp}.${signature}`
 */
export function createSessionToken(user: { id: string }): string {
  const timestamp = Date.now().toString();
  const payload = `${user.id}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${user.id}.${timestamp}.${hmac}`;
}

/**
 * Verifies a session token and returns the userId if valid and not expired (30 days).
 */
export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, timestamp, hmac] = parts;
  const age = Date.now() - parseInt(timestamp, 10);
  // Max session age: 30 days
  if (isNaN(age) || age < 0 || age > 30 * 24 * 60 * 60 * 1000) {
    return null;
  }
  const expectedPayload = `${userId}:${timestamp}`;
  const expectedHmac = crypto.createHmac("sha256", SESSION_SECRET).update(expectedPayload).digest("hex");
  if (hmac.length === expectedHmac.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
    return userId;
  }
  return null;
}

/**
 * Helper to validate safe internal redirects (preventing open redirect vulnerabilities)
 */
export function isValidInternalRedirect(url?: string | null): string {
  if (!url || typeof url !== "string") return "/";
  const trimmed = url.trim();
  // Must start with '/' but not '//' or '/\' and must not contain protocol schemes
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes("://")
  ) {
    return trimmed;
  }
  return "/";
}

/**
 * Resolves the authenticated user from the request's HTTP-only cookie and verifies against database.
 */
export const ADMIN_EMAIL = "rrroyce20@gmail.com";

export async function getAuthenticatedUser(request?: Request) {
  let userId: string | null = null;

  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k, decodeURIComponent(v.join("="))];
      })
    );

    const sessionCookie = cookies["vn_session"] || cookies["novamobile_session"];
    if (sessionCookie) {
      userId = verifySessionToken(sessionCookie);
    }
  }

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  // Strict RBAC: Admin strictly if email matches ADMIN_EMAIL and role is ADMIN
  const isAuthorizedAdmin =
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    (user.role || "").toUpperCase() === "ADMIN";

  return {
    ...user,
    role: isAuthorizedAdmin ? "ADMIN" : "USER",
  };
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
};

/**
 * Enforces that the incoming request has a valid authenticated session cookie.
 * Returns the Authenticated User object, or a 401 Unauthorized NextResponse.
 */
export async function requireAuth(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please sign in." },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Enforces that the incoming request is from an authenticated user with administrative privileges.
 * Strictly verifies role === 'ADMIN' AND user.email === ADMIN_EMAIL.
 * Returns the Authenticated Admin User object, or a 401/403 NextResponse.
 */
export async function requireAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please sign in as an administrator." },
      { status: 401 }
    );
  }
  const isAuthorizedAdmin =
    (user.role || "").toUpperCase() === "ADMIN" &&
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!isAuthorizedAdmin) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Administrator privileges required." },
      { status: 403 }
    );
  }
  return user;
}

/**
 * Enforces that the incoming request is strictly from the primary superadministrator (rrroyce20@gmail.com).
 * Used for high-privilege operations such as user deletion, warranty registry deletion, and password overrides.
 */
export async function requireMainAdmin(request: Request): Promise<AuthUser | NextResponse> {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) {
    return admin;
  }
  if (admin.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: "Forbidden: Superadministrator privileges required. Only rrroyce20@gmail.com can perform this action." },
      { status: 403 }
    );
  }
  return admin;
}

export async function ensureAdminUser() {
  try {
    const adminEmail = ADMIN_EMAIL.toLowerCase();

    // Demote any non-rrroyce20 admin accounts to USER
    await prisma.user.updateMany({
      where: {
        role: "ADMIN",
        email: { not: adminEmail },
      },
      data: {
        role: "USER",
      },
    });

    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const hashedPassword = hashPassword("#^UdEV3raUgpEPK5");
      await prisma.user.create({
        data: {
          name: "VN Mobiles Administrator",
          email: adminEmail,
          phone: "+91 98888 77777",
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: true,
        },
      });
      console.log(`Administrator account initialized: ${adminEmail}`);
    } else if (!existing.emailVerified || existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: true, role: "ADMIN" },
      });
    }
  } catch (e) {
    console.error("Error ensuring admin account:", e);
  }
}

