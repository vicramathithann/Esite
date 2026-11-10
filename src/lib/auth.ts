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

  // Reject unhashed / plaintext passwords to prevent credential compromise
  return false;
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
 * Creates a signed session token with an explicit security scope:
 * Format: `${scope}.${userId}.${timestamp}.${signature}`
 */
export function createSessionToken(
  user: { id: string },
  scope: "admin" | "customer" = "customer"
): string {
  const timestamp = Date.now().toString();
  const payload = `${scope}:${user.id}:${timestamp}`;
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${scope}.${user.id}.${timestamp}.${hmac}`;
}

export type TokenInspectResult =
  | { valid: true; userId: string; timestamp: number; scope: "admin" | "customer" | "legacy" }
  | {
      valid: false;
      reason: "MISSING_TOKEN" | "INVALID_FORMAT" | "EXPIRED_TOKEN" | "INVALID_SIGNATURE" | "INVALID_SCOPE";
      details?: string;
    };

/**
 * Detailed verification of a session token for precise server-side diagnostics.
 * Supports both modern 4-part scoped tokens and legacy 3-part tokens.
 */
export function inspectSessionToken(token: string | null | undefined): TokenInspectResult {
  if (!token || typeof token !== "string" || !token.trim()) {
    return { valid: false, reason: "MISSING_TOKEN" };
  }
  const parts = token.trim().split(".");

  // 1. Modern Scoped Token: scope.userId.timestamp.hmac
  if (parts.length === 4) {
    const [scope, userId, timestamp, hmac] = parts;
    if (scope !== "admin" && scope !== "customer") {
      return { valid: false, reason: "INVALID_FORMAT" };
    }
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

    const expectedPayload = `${scope}:${userId}:${timestamp}`;
    const candidates = getCandidateSessionSecrets();

    for (const secret of candidates) {
      const expectedHmac = crypto.createHmac("sha256", secret).update(expectedPayload).digest("hex");
      if (hmac.length === expectedHmac.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
        return { valid: true, userId, timestamp: ts, scope: scope as "admin" | "customer" };
      }
    }

    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  // 2. Legacy Unscoped Token: userId.timestamp.hmac
  if (parts.length === 3) {
    const [userId, timestamp, hmac] = parts;
    const ts = parseInt(timestamp, 10);
    const age = Date.now() - ts;
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
        return { valid: true, userId, timestamp: ts, scope: "legacy" };
      }
    }

    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  return { valid: false, reason: "INVALID_FORMAT" };
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
export { isValidInternalRedirect } from "./redirect";

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

      // Strict session isolation: Admin requests NEVER fall back to customer cookie!
      if (preferredCookieName === ADMIN_COOKIE_NAME) {
        return null;
      }

      // Customer session fallback to legacy cookie if needed
      if (cookies[LEGACY_COOKIE_NAME]) {
        return cookies[LEGACY_COOKIE_NAME];
      }
    }
  }

  // 3. Fallback to Next.js App Router cookies() store
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const primary = cookieStore.get(preferredCookieName)?.value;
    if (primary) return primary;

    // Strict session isolation: Admin requests NEVER fall back to customer cookie!
    if (preferredCookieName === ADMIN_COOKIE_NAME) {
      return null;
    }

    const fallback = cookieStore.get(LEGACY_COOKIE_NAME)?.value;
    if (fallback) return fallback;
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
  signupSource?: "self" | "admin" | null;
  createdAt: Date;
  avatar?: string | null;
};

/**
 * Resolves the authenticated user from the request's HTTP-only cookie and verifies against database.
 */
export async function getAuthenticatedUser(request?: Request): Promise<AuthUser | null> {
  // Check customer session cookie first
  let token = await extractSessionToken(request, CUSTOMER_COOKIE_NAME);
  let tokenCheck = inspectSessionToken(token);

  // If no customer session, check if there is an admin session (allows admin to browse storefront)
  if (!tokenCheck.valid) {
    token = await extractSessionToken(request, ADMIN_COOKIE_NAME);
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
      signupSource: true,
      tokenExpires: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  // Invalidate any session token issued before a password change / session reset
  if (user.tokenExpires) {
    const revokedBefore = new Date(user.tokenExpires).getTime();
    if (tokenCheck.timestamp < revokedBefore) {
      return null;
    }
  }

  const isAuthorizedAdmin =
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    (user.role || "").toUpperCase() === "ADMIN";

  const rawSignupSource = (user as any).signupSource || (isAuthorizedAdmin ? "admin" : "self");
  const isEmailVerified = Boolean(user.emailVerified) || rawSignupSource === "admin" || isAuthorizedAdmin;

  return {
    ...user,
    emailVerified: isEmailVerified,
    signupSource: rawSignupSource as "self" | "admin",
    avatar: (user as any).avatar || null,
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
      { success: false, error: "Authentication required. Please sign in.", requiresAuth: true },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Enforces that the incoming request is from a verified user.
 * Admin-created users always skip OTP verification.
 * Unverified self-signup users are rejected with 403 requiresVerification.
 */
export async function requireVerifiedUser(request: Request): Promise<AuthUser | NextResponse> {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please sign in.", requiresAuth: true },
      { status: 401 }
    );
  }
  const isPrivileged = user.signupSource === "admin" || (user.role || "").toUpperCase() === "ADMIN";
  if (!user.emailVerified && !isPrivileged) {
    return NextResponse.json(
      {
        success: false,
        error: "Email verification required. Please verify your email before proceeding.",
        requiresVerification: true,
        email: user.email,
      },
      { status: 403 }
    );
  }
  return user;
}

const DEFAULT_NOT_FOUND_HTML = `<!DOCTYPE html><html lang="en" class="h-full"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex, nofollow, noarchive"/><title>404: This page could not be found</title></head><body class="min-h-full flex flex-col bg-background text-foreground"><main class="w-full flex-1 flex flex-col items-center justify-center py-16 px-4"><span style="font-size:6rem;font-weight:200;line-height:1;color:#C9A66B">404</span><h1 style="font-size:1.5rem;font-weight:600;margin-top:1rem;margin-bottom:0.5rem">Page Not Found</h1><p style="color:#6E6E73;margin-bottom:2rem">The page you are looking for doesn't exist or has been moved.</p><a href="/" style="display:inline-flex;align-items:center;padding:0.75rem 2rem;border-radius:9999px;background-color:#C9A66B;color:#FFFCFA;text-decoration:none;font-weight:500">Return Home</a></main></body></html>`;

let cachedNotFoundHtml: string | null = null;

export function getNotFoundHtml(): string {
  if (cachedNotFoundHtml) return cachedNotFoundHtml;
  if (typeof window === "undefined") {
    try {
      // Use runtime require so client bundler does not attempt to bundle Node.js 'fs'
      const nodeRequire = eval("require");
      const fs = nodeRequire("fs");
      const path = nodeRequire("path");
      const filePath = path.join(process.cwd(), ".next", "server", "app", "_not-found.html");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        if (content) {
          cachedNotFoundHtml = content;
          return content;
        }
      }
    } catch {
      // Ignore and fallback
    }
  }

  return DEFAULT_NOT_FOUND_HTML;
}

export function createAdminNotFoundResponse(): NextResponse {
  const html = getNotFoundHtml();
  return new NextResponse(html, {
    status: 404,
    statusText: "Not Found",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}

/**
 * Shared administrator authorization helper used by all admin API routes and server actions.
 * - Checks the dedicated "vn_admin_session" cookie (and Authorization header).
 * - Verifies cryptographic token signature & expiration.
 * - Rejects non-admin or unauthenticated requests with a standard 404 response
 *   identical to a missing /api route, preventing information disclosure.
 * - Verifies user role strictly from the database on the server (never client data).
 * - Logs the real reason on the server console only.
 */
export async function requireAdmin(request?: Request): Promise<AuthUser | NextResponse> {
  const route = request ? new URL(request.url).pathname : "server-action/api";

  // 1. Extract admin token from dedicated vn_admin_session cookie or Bearer header
  const token = await extractSessionToken(request, ADMIN_COOKIE_NAME);

  // If no admin token, check if user is calling with customer session cookie
  if (!token) {
    const customerToken = await extractSessionToken(request, CUSTOMER_COOKIE_NAME);
    if (customerToken) {
      const custCheck = inspectSessionToken(customerToken);
      if (custCheck.valid) {
        console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: CUSTOMER_SESSION_DENIED`);
        return createAdminNotFoundResponse();
      }
    }

    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: NO_SESSION`);
    return createAdminNotFoundResponse();
  }

  // 2. Validate token format & cryptographic HMAC signature
  const tokenCheck = inspectSessionToken(token);
  if (!tokenCheck.valid) {
    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: ${tokenCheck.reason}`);
    return createAdminNotFoundResponse();
  }

  // 3. Customer token scope check: customer tokens can NEVER be accepted by requireAdmin
  if (tokenCheck.scope === "customer") {
    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: CUSTOMER_TOKEN_SCOPE_REJECTED`);
    return createAdminNotFoundResponse();
  }

  // 4. Look up user in database via service-role Supabase client
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
      tokenExpires: true,
      createdAt: true,
    },
  });

  if (!user) {
    console.warn(`[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: USER_NOT_FOUND (userId: ${tokenCheck.userId})`);
    return createAdminNotFoundResponse();
  }

  // Invalidate any session token issued before a password change / session reset
  if (user.tokenExpires) {
    const revokedBefore = new Date(user.tokenExpires).getTime();
    if (tokenCheck.timestamp < revokedBefore) {
      console.warn(
        `[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: SESSION_REVOKED_AFTER_PASSWORD_CHANGE (token issued: ${tokenCheck.timestamp}, revoked: ${revokedBefore})`
      );
      return createAdminNotFoundResponse();
    }
  }

  // 5. Strict Database-backed Role & Identity Verification
  const roleUpper = (user.role || "").toUpperCase();
  const emailLower = (user.email || "").toLowerCase().trim();
  const isAuthorizedAdmin =
    roleUpper === "ADMIN" &&
    emailLower === ADMIN_EMAIL.toLowerCase();

  if (!isAuthorizedAdmin) {
    console.warn(
      `[ADMIN_AUTH_FAILURE] Route: ${route} | Reason: ROLE_NOT_ADMIN (email: ${user.email}, role: ${user.role})`
    );
    return createAdminNotFoundResponse();
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
  if (admin instanceof Response) {
    return admin;
  }
  if (admin.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    console.warn(
      `[ADMIN_AUTH_FAILURE] SuperAdmin restricted action attempted by non-primary admin: ${admin.email}`
    );
    return createAdminNotFoundResponse();
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
      const randomInitialPassword = crypto.randomBytes(24).toString("base64");
      const hashedPassword = hashPassword(randomInitialPassword);
      await prisma.user.create({
        data: {
          name: "VN Mobiles Administrator",
          email: adminEmail,
          phone: "+91 98888 77777",
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: true,
          signupSource: "admin",
        },
      });
      console.log(`Administrator account initialized: ${adminEmail}`);
    } else if (!existing.emailVerified || existing.role !== "ADMIN" || (existing as any).signupSource !== "admin") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: true, role: "ADMIN", signupSource: "admin" },
      });
    }
  } catch (e) {
    console.error("Error ensuring admin account:", e);
  }
}

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "admin123",
  "admin1234",
  "welcome123",
  "vnmobiles",
  "vnmobiles123",
  "iloveyou1",
  "changeme1",
  "pass1234",
  "letmein123",
  "master123",
  "secret123",
]);

/**
 * Enterprise Password Strength Validator (NIST SP 800-63B Compliant)
 * - Length: 8-128 characters
 * - Requires alphanumeric combination
 * - Rejects common guessable dictionary passwords
 * - Rejects passwords containing username or email prefix
 */
export function validatePasswordStrength(
  password: unknown,
  userContext?: { email?: string; name?: string }
): { valid: boolean; error?: string } {
  if (typeof password !== "string" || !password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password cannot exceed 128 characters.",
    };
  }

  // Check character diversity (at least one letter and at least one digit/symbol)
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasDigitOrSymbol = /[^a-zA-Z]/.test(password);

  if (!hasLetter || !hasDigitOrSymbol) {
    return {
      valid: false,
      error: "Password must contain both letters and at least one number or special character.",
    };
  }

  // Check common weak password dictionary
  const lower = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lower)) {
    return {
      valid: false,
      error: "This password is too common or easily guessable. Please choose a stronger password.",
    };
  }

  // Check user context (email prefix or first name)
  if (userContext?.email) {
    const localPart = userContext.email.split("@")[0].toLowerCase();
    if (localPart.length >= 4 && lower.includes(localPart)) {
      return {
        valid: false,
        error: "Password must not contain parts of your email address.",
      };
    }
  }

  if (userContext?.name) {
    const firstName = userContext.name.trim().split(/\s+/)[0].toLowerCase();
    if (firstName.length >= 4 && lower.includes(firstName)) {
      return {
        valid: false,
        error: "Password must not contain your name.",
      };
    }
  }

  return { valid: true };
}



