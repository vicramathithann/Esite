/**
 * VN Mobiles Username Management & Normalization Utility
 *
 * Rules:
 * 1. Allowed characters: letters (a-z, A-Z), numbers (0-9), dot (.), underscore (_)
 * 2. Length: 3 to 20 characters
 * 3. Normalization: lowercase, trimmed
 * 4. Comparison: case-insensitive against normalized index
 * 5. Block reserved names (admin, support, vnmobiles, system, etc.)
 */

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "vnmobiles",
  "vnmobile",
  "help",
  "security",
  "system",
  "null",
  "undefined",
  "moderator",
  "mod",
  "owner",
  "superuser",
  "billing",
  "api",
  "official",
  "staff",
  "team",
  "info",
  "contact",
  "orders",
  "warranty",
  "account",
  "auth",
  "login",
  "register",
  "signup",
  "signin",
  "guest",
  "anonymous",
  "service",
  "dev",
  "developer",
  "test",
  "testing",
]);

/**
 * Normalizes a username by trimming and converting to lowercase.
 */
export function normalizeUsername(username: string | null | undefined): string {
  if (!username || typeof username !== "string") return "";
  return username.trim().toLowerCase();
}

/**
 * Checks if a normalized username is reserved.
 */
export function isReservedUsername(username: string | null | undefined): boolean {
  const norm = normalizeUsername(username);
  if (!norm) return false;
  return RESERVED_USERNAMES.has(norm);
}

/**
 * Validates a username according to project security and length rules.
 */
export function validateUsername(username: string | null | undefined): {
  valid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required." };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long." };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: "Username cannot exceed 20 characters." };
  }

  // Allowed characters: letters, numbers, dot, underscore
  const allowedRegex = /^[a-zA-Z0-9._]+$/;
  if (!allowedRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, dot (.), and underscore (_).",
    };
  }

  // Must contain at least one letter or number (cannot be purely dots and underscores)
  if (!/[a-zA-Z0-9]/.test(trimmed)) {
    return {
      valid: false,
      error: "Username must contain at least one alphanumeric character.",
    };
  }

  const normalized = trimmed.toLowerCase();

  if (isReservedUsername(normalized)) {
    return {
      valid: false,
      error: "This username is reserved and cannot be registered.",
    };
  }

  return { valid: true, normalized };
}

/**
 * Generates a valid, sanitized, unique username from a display name or email.
 */
export function generateUniqueUsername(
  nameOrEmail: string,
  existingUsernames: Set<string>
): string {
  let base = "";
  if (nameOrEmail.includes("@")) {
    base = nameOrEmail.split("@")[0];
  } else {
    base = nameOrEmail;
  }

  // Replace spaces, hyphens, special chars with underscore
  let clean = base
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9._]/g, "");

  if (clean.length < 3) {
    clean = clean ? `${clean}_vn` : "user_vn";
  }

  // Truncate to maximum 16 chars to allow room for numeric suffixes
  clean = clean.slice(0, 16);

  if (isReservedUsername(clean)) {
    clean = `user_${clean}`.slice(0, 16);
  }

  let candidate = clean;
  let counter = 1;

  while (existingUsernames.has(candidate) || isReservedUsername(candidate)) {
    const suffix = `_${counter}`;
    candidate = `${clean.slice(0, 20 - suffix.length)}${suffix}`;
    counter++;
  }

  existingUsernames.add(candidate);
  return candidate;
}

/**
 * Masks an email address for safe public/semi-public display:
 * e.g. "rrroyce20@gmail.com" -> "r*****0@gmail.com"
 * e.g. "alex@example.com"    -> "a***x@example.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "";
  }

  const [localPart, domain] = email.trim().toLowerCase().split("@");
  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const asteriskCount = Math.min(5, Math.max(1, localPart.length - 2));
  const maskedLocal = `${firstChar}${"*".repeat(asteriskCount)}${lastChar}`;

  return `${maskedLocal}@${domain}`;
}
