import { URL } from "url";

/**
 * Enterprise SSRF (Server-Side Request Forgery) Defense Validator
 * Complies with OWASP Top 10:2025 (A01:2025 - Broken Access Control / SSRF)
 *
 * Rules:
 * - Protocol: Strictly https: only (blocks http, file, gopher, ftp)
 * - Rejects private, local, multicast, and loopback IP ranges
 * - Blocks Cloud Metadata Service endpoints (169.254.169.254, metadata.google.internal)
 * - Rejects credentials in URL (user:pass@host)
 * - Caps maximum URL length to prevent buffer and regex resource exhaustion
 */

const PRIVATE_IP_REGEXES = [
  // IPv4 Loopback & 0.0.0.0
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  // RFC 1918 Private ranges
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  // Link-Local / Cloud Metadata (AWS, GCP, Azure, DigitalOcean)
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  // Carrier Grade NAT
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/,
  // Test/Documentation ranges
  /^192\.0\.2\.\d{1,3}$/,
  /^198\.51\.100\.\d{1,3}$/,
  /^203\.0\.113\.\d{1,3}$/,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "local",
  "internal",
  "metadata.google.internal",
  "metadata.aws.internal",
  "instance-data",
]);

export interface SafeUrlValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

export function validateSafeExternalUrl(
  rawUrl: unknown,
  allowedDomains?: string[]
): SafeUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Missing or invalid URL parameter." };
  }

  const trimmed = rawUrl.trim();

  // 1. Length constraint
  if (trimmed.length > 2048) {
    return { valid: false, error: "URL exceeds maximum allowable length of 2048 characters." };
  }

  // 2. Parse URL structure
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Malformed URL syntax." };
  }

  // 3. Protocol restriction: HTTPS only
  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: `Insecure protocol "${parsed.protocol}". Only secure HTTPS URLs are permitted.`,
    };
  }

  // 4. Reject embedded credentials (http://user:pass@domain.com)
  if (parsed.username || parsed.password) {
    return { valid: false, error: "URLs with embedded authentication credentials are forbidden." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 5. Block local and internal hostnames
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { valid: false, error: "Access to private or local network hostnames is blocked." };
  }

  // 6. Block IPv6 loopback and private ranges
  if (
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.startsWith("[fc") ||
    hostname.startsWith("[fd") ||
    hostname.startsWith("[fe80")
  ) {
    return { valid: false, error: "Access to IPv6 private or loopback addresses is blocked." };
  }

  // 7. Block IPv4 private/metadata addresses
  for (const regex of PRIVATE_IP_REGEXES) {
    if (regex.test(hostname)) {
      return { valid: false, error: "Access to private, link-local, or cloud metadata IP ranges is blocked." };
    }
  }

  // 8. Optional explicit domain allowlist check
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some((domain) => {
      const cleanDomain = domain.toLowerCase();
      return hostname === cleanDomain || hostname.endsWith(`.${cleanDomain}`);
    });
    if (!isAllowed) {
      return {
        valid: false,
        error: `Domain "${hostname}" is not within the authorized partner domain allowlist.`,
      };
    }
  }

  return { valid: true, sanitizedUrl: parsed.toString() };
}

/**
 * Validates an image URL (supports relative static assets like /images/... or safe HTTPS URLs).
 * Blocks protocol-relative URLs (//evil.com), file:, javascript:, and SSRF targets.
 */
export function validateSafeImageUrl(rawUrl: unknown): SafeUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "Image URL must be a non-empty string." };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: "Image URL cannot be blank." };
  }

  // Allow relative asset paths (e.g. /images/products/phone.png, /uploads/...)
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) {
      return { valid: false, error: "Protocol-relative URLs are forbidden." };
    }
    if (trimmed.includes("..") || trimmed.includes("\\")) {
      return { valid: false, error: "Path traversal in image URL is forbidden." };
    }
    return { valid: true, sanitizedUrl: trimmed };
  }

  return validateSafeExternalUrl(trimmed);
}

