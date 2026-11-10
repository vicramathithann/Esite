/**
 * Prototype Pollution Defense Helper
 * Complies with OWASP Top 10:2025 (A08:2025 - Software and Data Integrity Failures)
 *
 * Protects deep object merges, request body parsing, and deserialization from
 * malicious property injection (__proto__, constructor, prototype).
 */

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Recursively checks whether an object or array contains prototype pollution keys.
 */
export function containsPrototypePollution(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => containsPrototypePollution(item));
  }

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      return true;
    }
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === "object" && val !== null) {
      if (containsPrototypePollution(val)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Deeply sanitizes an object by recursively stripping prototype pollution keys.
 */
export function sanitizePrototype<T>(obj: T): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePrototype(item)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      cleanObj[key] = typeof value === "object" && value !== null ? sanitizePrototype(value) : value;
    }
  }

  return cleanObj as T;
}
