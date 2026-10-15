/**
 * VN Mobiles - Enterprise Input Validation & Sanitization Subsystem
 * Complies with OWASP Top 10:2025 (A05:2025 - Injection)
 * 
 * Rules:
 * - Sanitizes strings to neutralize XSS payloads
 * - Strict regex validation for emails, phone numbers, and pincodes
 * - Type checking and length constraints on user submissions
 */

/**
 * Validates standard email address format
 */
export function isValidEmail(email: unknown): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Normalizes and validates Indian and international phone numbers
 */
export function normalizePhone(phone: unknown): string | null {
  if (!phone || typeof phone !== "string") return null;
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (cleaned.length < 8 || cleaned.length > 16) {
    return null;
  }
  return cleaned;
}

/**
 * Validates standard 6-digit Indian Postal Code
 */
export function isValidPincode(pincode: unknown): boolean {
  if (!pincode || typeof pincode !== "string") return false;
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Strips dangerous HTML script tags, event handlers, and javascript: links to prevent Stored & Reflected XSS
 */
export function sanitizeString(input: unknown, maxLength = 1000): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  const truncated = str.slice(0, maxLength);
  return truncated
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Clamps numeric values within defined bounds
 */
export function clampInt(val: unknown, min: number, max: number, defaultVal: number): number {
  const parsed = parseInt(String(val), 10);
  if (isNaN(parsed)) return defaultVal;
  return Math.max(min, Math.min(max, parsed));
}

