import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.GMAIL_APP_PASSWORD ||
  "vn-mobiles-auth-session-signing-key-2026";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    // Fallback for simple legacy test passwords if any
    return password === storedHash;
  }
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP (e.g. "482910").
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with a random salt using PBKDF2/SHA-512 to prevent plaintext storage in DB.
 */
export function hashOtp(otp: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(otp.trim(), salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a submitted OTP against the stored PBKDF2 hash.
 */
export function verifyOtp(otp: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(otp.trim(), salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
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
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return user;
}

export async function ensureAdminUser() {
  try {
    const adminEmail = "admin@vmmobiles.in";
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const hashedPassword = hashPassword("admin123");
      await prisma.user.create({
        data: {
          name: "VM Mobiles Administrator",
          email: adminEmail,
          phone: "+91 99999 00000",
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: true,
        },
      });
      console.log("Default admin account created: admin@vmmobiles.in / admin123");
    } else if (!existing.emailVerified || existing.role !== "ADMIN") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: true, role: "ADMIN" },
      });
    }
  } catch (e) {
    console.error("Error seeding admin account:", e);
  }
}
