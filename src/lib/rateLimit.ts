/**
 * VN Mobiles - Enterprise Sliding Window & Distributed Rate Limiter
 * Complies with OWASP Top 10:2025 (A06:2025 - Insecure Design & A07:2025 - Authentication Failures)
 * 
 * Protects authentication, registration, password recovery, order tracking, and OTP verification
 * against automated brute-force attacks and denial-of-service attempts.
 * 
 * Features:
 * - Local high-speed sliding-window in-memory store for development and zero-latency local checks
 * - Upstash Redis REST API distributed rate limiter for serverless Vercel lambdas (stateless synchronization)
 * - Automatic failover to local memory if distributed store is unreachable
 */

import { NextResponse } from "next/server";
import { getClientIp, logSecurityEvent } from "./securityLogger";
import { checkRateLimit, RateLimitOptions, RateLimitResult } from "./rateLimitCore";
export { checkRateLimit, type RateLimitOptions, type RateLimitResult };

/**
 * Distributed rate limiter using Upstash Redis REST API.
 * Automatically falls back to in-memory check if Redis is not configured or errors.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Fallback to local memory if Redis credentials are not provided
  if (!redisUrl || !redisToken) {
    return checkRateLimit(identifier, options);
  }

  const key = `ratelimit:${options.keyPrefix}:${identifier}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    // Atomic INCR + EXPIRE via Upstash REST pipeline
    const response = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, options.windowSeconds, "NX"],
      ]),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstash returned status ${response.status}`);
    }

    const data = await response.json();
    const current = typeof data?.[0]?.result === "number" ? data[0].result : 1;
    const allowed = current <= options.maxRequests;
    const remaining = Math.max(0, options.maxRequests - current);

    return {
      allowed,
      current,
      limit: options.maxRequests,
      remaining,
      retryAfter: allowed ? 0 : options.windowSeconds,
    };
  } catch (err) {
    // Fail-open to local sliding-window store so Redis outages never block legitimate users
    console.warn("[RATE_LIMIT_WARNING] Distributed rate limiter error, falling back to local memory:", err);
    return checkRateLimit(identifier, options);
  }
}

/**
 * Helper to rate limit incoming Next.js API requests by client IP (synchronous)
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

/**
 * Async helper to enforce distributed rate limiting on incoming Next.js API requests
 */
export async function enforceDistributedRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const result = await checkDistributedRateLimit(ip, options);

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
        distributed: true,
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

