/**
 * VN Mobiles - Enterprise Sliding Window In-Memory Rate Limiter
 * Complies with OWASP Top 10:2025 (A07:2025 - Authentication Failures)
 * 
 * Protects authentication, registration, password recovery, and OTP verification
 * against automated brute-force attacks and denial-of-service attempts.
 */

import { NextResponse } from "next/server";
import { getClientIp, logSecurityEvent } from "@/lib/securityLogger";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000).unref();

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

/**
 * Checks and increments rate limit for a given key
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

/**
 * Helper to rate limit incoming Next.js API requests by client IP
 */
export function enforceRateLimit(
  request: Request,
  options: RateLimitOptions
): NextResponse | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(ip, options);

  if (!result.allowed) {
    logSecurityEvent("RATE_LIMIT_EXCEEDED", "WARN", {
      ip,
      route: new URL(request.url).pathname,
      method: request.method,
      details: {
        keyPrefix: options.keyPrefix,
        current: result.current,
        limit: result.limit,
        retryAfter: result.retryAfter,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: `Too many requests. Please wait ${result.retryAfter} second${result.retryAfter === 1 ? "" : "s"} before trying again.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.retryAfter.toString(),
          "X-RateLimit-Limit": options.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.retryAfter.toString(),
        },
      }
    );
  }

  return null;
}

