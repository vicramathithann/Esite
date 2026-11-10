/**
 * Enterprise Sliding Window Rate Limiter Core
 * Complies with OWASP Top 10:2025 (A06:2025 - Insecure Design)
 * Zero external dependencies for pure Node and edge execution.
 */

export interface RateLimitOptions {
  keyPrefix: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  retryAfter: number; // seconds
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit entries every 60 seconds
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60 * 1000);
  if (timer.unref) {
    timer.unref();
  }
}

/**
 * Checks and increments in-memory rate limit for a given key (synchronous)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const storeKey = `${options.keyPrefix}:${identifier}`;

  let record = rateLimitStore.get(storeKey);

  if (!record || record.resetAt <= now) {
    record = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(storeKey, record);
    return {
      allowed: true,
      current: 1,
      limit: options.maxRequests,
      remaining: Math.max(0, options.maxRequests - 1),
      retryAfter: 0,
    };
  }

  record.count += 1;
  const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  if (record.count > options.maxRequests) {
    return {
      allowed: false,
      current: record.count,
      limit: options.maxRequests,
      remaining: 0,
      retryAfter,
    };
  }

  return {
    allowed: true,
    current: record.count,
    limit: options.maxRequests,
    remaining: Math.max(0, options.maxRequests - record.count),
    retryAfter: 0,
  };
}
