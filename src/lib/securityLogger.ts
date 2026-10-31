/**
 * VN Mobiles - Enterprise Security Logging & Auditing Subsystem
 * Complies with OWASP Top 10:2025 (A09:2025 - Security Logging and Alerting Failures)
 * 
 * Rules:
 * - Structured JSON output for SIEM ingestion
 * - Redacts passwords, OTPs, session secrets, and payment details
 * - Captures security context: timestamps, client IP, user-agent, route
 */

export type SecurityEventType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_LOGOUT"
  | "AUTH_REGISTER_SUCCESS"
  | "AUTH_REGISTER_FAILED"
  | "AUTH_OTP_REQUESTED"
  | "AUTH_OTP_VERIFIED"
  | "AUTH_OTP_FAILED"
  | "AUTH_PASSWORD_RESET_REQUESTED"
  | "AUTH_PASSWORD_RESET_COMPLETED"
  | "RATE_LIMIT_EXCEEDED"
  | "ACCESS_DENIED_UNAUTHENTICATED"
  | "ACCESS_DENIED_FORBIDDEN"
  | "IDOR_ATTEMPT_BLOCKED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "ADMIN_ACTION"
  | "ADMIN_INVITE_SENT"
  | "INVITATION_ACCEPTED"
  | "ADMIN_PASSWORD_CHANGED"
  | "ADMIN_PASSWORD_CHANGE_FAILED"
  | "ADMIN_PASSWORD_RESET_REQUESTED"
  | "ADMIN_PASSWORD_RESET_COMPLETED"
  | "SECURITY_EXCEPTION";

export type SecuritySeverity = "INFO" | "WARN" | "ALERT" | "CRITICAL";

export interface SecurityEventContext {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

const REDACTED_KEYS = new Set([
  "password",
  "confirmpassword",
  "newpassword",
  "oldpassword",
  "otp",
  "code",
  "token",
  "sessiontoken",
  "resettoken",
  "authorization",
  "cookie",
  "secret",
  "cardnumber",
  "cvv",
]);

/**
 * Deeply sanitizes an object to redact credentials, OTPs, and tokens
 */
export function sanitizeLogDetails(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogDetails);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeLogDetails(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Extracts the client IP from standard reverse proxy and cloudflare headers
 */
export function getClientIp(request?: Request): string {
  if (!request) return "127.0.0.1";
  const headers = request.headers;
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

/**
 * Logs a structured security event to stdout/server logs
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  context: SecurityEventContext
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    system: "VN_MOBILES_SECURITY",
    eventType,
    severity,
    ip: context.ip || "127.0.0.1",
    userId: context.userId || null,
    email: context.email ? context.email.toLowerCase() : null,
    role: context.role || "ANONYMOUS",
    route: context.route || null,
    method: context.method || null,
    userAgent: context.userAgent || null,
    details: context.details ? sanitizeLogDetails(context.details) : undefined,
  };

  const formatted = `[SECURITY][${severity}][${eventType}] ${JSON.stringify(logEntry)}`;

  if (severity === "CRITICAL" || severity === "ALERT") {
    console.error(formatted);
  } else if (severity === "WARN") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

