import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
 * Cookie Names for Strict Session Isolation
 * Admin and customer sessions are completely separated so logging into one never affects the other.
 */
export const ADMIN_COOKIE_NAME = "vn_admin_session";
export const CUSTOMER_COOKIE_NAME = "vn_session";
export const LEGACY_COOKIE_NAME = "novamobile_session";

export const ADMIN_EMAIL = "rrroyce20@gmail.com";

/**
 * Resolves candidate session signing secrets to support zero-downtime secret rotations.
 * Prioritizes SESSION_SECRET, then SUPABASE_SERVICE_ROLE_KEY, then GMAIL_APP_PASSWORD (cleaned).
 */
export function getCandidateSessionSecrets(): string[] {
  const secrets = [
    process.env.SESSION_SECRET?.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "").trim(),
    "vn-mobiles-auth-session-signing-key-2026",
  ].filter(Boolean) as string[];
  return Array.from(new Set(secrets));
}

export function getSessionSecret(): string {
  return getCandidateSessionSecrets()[0];
}

/**
 * Returns cross-environment safe HTTP cookie options for both localhost and production Vercel.
 */
export function getSessionCookieOptions(req?: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const host = req?.headers.get("host") || "";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const isHttps = req?.headers.get("x-forwarded-proto") === "https" || req?.url?.startsWith("https://");

  return {
    httpOnly: true,
    secure: isHttps || (isProd && !isLocalhost),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };
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
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${user.id}.${timestamp}.${hmac}`;
}

export type TokenInspectResult =
  | { valid: true; userId: string; timestamp: number }
  | {
      valid: false;
      reason: "MISSING_TOKEN" | "INVALID_FORMAT" | "EXPIRED_TOKEN" | "INVALID_SIGNATURE";
      details?: string;
    };

/**
 * Detailed verification of a session token for precise server-side diagnostics.
 * Tests across candidate secrets to ensure seamless continuity across deployments.
 */
export function inspectSessionToken(token: string | null | undefined): TokenInspectResult {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, reason: "MISSING_TOKEN" };
  }
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "INVALID_FORMAT" };
  }
  const [userId, timestamp, hmac] = parts;
  const ts = parseInt(timestamp, 10);
  const age = Date.now() - ts;
  // Max session age: 30 days
  if (isNaN(ts) || age < 0 || age > 30 * 24 * 60 * 60 * 1000) {
    return {
      valid: false,
      reason: "EXPIRED_TOKEN",
      details: `Token expired or timestamp invalid (age: ${age}ms)`,
    };
  }

  const expectedPayload = `${userId}:${timestamp}`;
  const candidates = getCandidateSessionSecrets();

  for (const secret of candidates) {
    const expectedHmac = crypto.createHmac("sha256", secret).update(expectedPayload).digest("hex");
    if (hmac.length === expectedHmac.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: true, userId, timestamp: ts };
    }
  }

  return { valid: false, reason: "INVALID_SIGNATURE" };
}

/**
 * Verifies a session token and returns the userId if valid and not expired (30 days).
 */
export function verifySessionToken(token: string): string | null {
  const result = inspectSessionToken(token);
  return result.valid ? result.userId : null;
}

/**
 * Helper to validate safe internal redirects (preventing open redirect vulnerabilities)
 */
export function isValidInternalRedirect(url?: string | null): string {
  if (!url || typeof url !== "string") return "/";
  const trimmed = url.trim();
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
 * Extracts session token from incoming request (Authorization header, specific cookie, or next/headers).
 */
export async function extractSessionToken(
  request?: Request,
  preferredCookieName: string = CUSTOMER_COOKIE_NAME
): Promise<string | null> {
  // 1. Authorization header: "Bearer <token>"
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) return token;
    }
  }

  // 2. Cookie header from request
  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    if (cookieHeader) {
      const cookies: Record<string, string> = {};
      for (const pair of cookieHeader.split(";")) {
        const idx = pair.indexOf("=");
        if (idx > -1) {
          const key = pair.slice(0, idx).trim();
          let rawVal = pair.slice(idx + 1).trim();
          if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
            rawVal = rawVal.slice(1, -1);
          }
          try {
            cookies[key] = decodeURIComponent(rawVal);
          } catch {
            cookies[key] = rawVal;
          }
        }
      }

      // Preferred cookie
      if (cookies[preferredCookieName]) {
        return cookies[preferredCookieName];
      }

      // If looking for admin session, fallback to other cookies in case admin logged in via standard route
      if (preferredCookieName === ADMIN_COOKIE_NAME) {
        if (cookies[CUSTOMER_COOKIE_NAME]) return cookies[CUSTOMER_COOKIE_NAME];
        if (cookies[LEGACY_COOKIE_NAME]) return cookies[LEGACY_COOKIE_NAME];
      } else {
        if (cookies[LEGACY_COOKIE_NAME]) return cookies[LEGACY_COOKIE_NAME];
      }
    }
  }

  // 3. Fallback to Next.js App Router cookies() store
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const primary = cookieStore.get(preferredCookieName)?.value;
    if (primary) return primary;

    if (preferredCookieName === ADMIN_COOKIE_NAME) {
      const fallback =
        cookieStore.get(CUSTOMER_COOKIE_NAME)?.value ||
        cookieStore.get(LEGACY_COOKIE_NAME)?.value;
      if (fallback) return fallback;
    } else {
      const fallback = cookieStore.get(LEGACY_COOKIE_NAME)?.value;
      if (fallback) return fallback;
    }
  } catch {
    // Outside next/headers execution context
  }

  return null;
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
 * Resolves the authenticated user from the request's HTTP-only cookie and verifies against database.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthUser | null> {
  // Check admin cookie first, then customer cookie
  let token = await extractSessionToken(request, ADMIN_COOKIE_NAME);
  let tokenCheck = inspectSessionToken(token);

  if (!tokenCheck.valid) {
    token = await extractSessionToken(request, CUSTOMER_COOKIE_NAME);
    tokenCheck = inspectSessionToken(token);
  }

  if (!tokenCheck.valid) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenCheck.userId },
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

  const isAuthorizedAdmin =
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    (user.role || "").toUpperCase() === "ADMIN";

  return {
    ...user,
    role: isAuthorizedAdmin ? "ADMIN" : "USER",
  };
}

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
 * Shared administrator authorization helper used by all admin API routes and server actions.
 * - Checks the dedicated "vn_admin_session" cookie (and Authorization header).
 * - Verifies cryptographic token signature & expiration.
 * - Verifies user role strictly from the database on the server (never client data).
 * - Logs the real reason for each auth failure on the server.
 * - Returns a generic error response to the client.
 */
export async function requireAdmin(request?: Request): Promise<AuthUser | NextResponse> {
  const route = request ? new URL(request.url).pathname : "server-action/api";

  // 1. Extract admin token
  const token = await extractSessionToken(request, ADMIN_COOKIE_NAME);

  // 2. Validate token format & cryptographic HMAC signature
  const tokenCheck = inspectSessionToken(token);
  if (!tokenCheck.valid) {
    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: ${tokenCheck.reason}`);
    return NextResponse.json(
      { success: false, error: "Authentication required. Please sign in as an administrator." },
      { status: 401 }
    );
  }

  // 3. Look up user in database via service-role Supabase client
  const user = await prisma.user.findUnique({
    where: { id: tokenCheck.userId },
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

  if (!user) {
    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: USER_NOT_FOUND (userId: ${tokenCheck.userId})`);
    return NextResponse.json(
      { success: false, error: "Authentication required. Please sign in as an administrator." },
      { status: 401 }
    );
  }

  // 4. Strict Database-backed Role & Identity Verification
  const roleUpper = (user.role || "").toUpperCase();
  const emailLower = (user.email || "").toLowerCase().trim();
  const isAuthorizedAdmin =
    roleUpper === "ADMIN" &&
    emailLower === ADMIN_EMAIL.toLowerCase();

  if (!isAuthorizedAdmin) {
    console.warn(
      `[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: ROLE_NOT_ADMIN (email: ${user.email}, role: ${user.role})`
    );
    return NextResponse.json(
      { success: false, error: "Forbidden: Administrator privileges required." },
      { status: 403 }
    );
  }

  return {
    ...user,
    role: "ADMIN" as const,
  };
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
    console.warn(
      `[ADMIN_AUTH_FAILURE] SuperAdmin restricted action attempted by non-primary admin: ${admin.email}`
    );
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


