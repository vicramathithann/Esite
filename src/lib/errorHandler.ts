/**
 * VN Mobiles - Enterprise Centralized Error Handling Subsystem
 * Complies with OWASP Top 10:2025 (A10:2025 - Mishandling of Exceptional Conditions)
 * 
 * Rules:
 * - Never leak database internal error codes, SQL statements, or stack traces to clients
 * - Standardizes error JSON across all API endpoints
 * - Records detailed server-side error traces for developers and operators
 */

import { NextResponse } from "next/server";
import { logSecurityEvent } from "@/lib/securityLogger";

export interface ErrorResponseOptions {
  route?: string;
  statusCode?: number;
  fallbackMessage?: string;
}

/**
 * Safely handles an API error, logging details on server and returning generic client JSON
 */
export function handleApiError(
  error: unknown,
  options: ErrorResponseOptions = {}
): NextResponse {
  const statusCode = options.statusCode || 500;
  const fallbackMessage = options.fallbackMessage || "An internal error occurred. Please try again later.";

  const errMessage = error instanceof Error ? error.message : String(error);
  const errStack = error instanceof Error ? error.stack : undefined;

  // Log error on server with full stack trace
  logSecurityEvent("SECURITY_EXCEPTION", statusCode >= 500 ? "ALERT" : "WARN", {
    route: options.route,
    details: {
      errorMessage: errMessage,
      stack: process.env.NODE_ENV !== "production" ? errStack : undefined,
      statusCode,
    },
  });

  // Prisma unique constraint error
  if (typeof errMessage === "string" && errMessage.includes("Unique constraint failed")) {
    return NextResponse.json(
      {
        success: false,
        error: "A record with this information already exists in the system.",
      },
      { status: 409 }
    );
  }

  // Generic production response
  return NextResponse.json(
    {
      success: false,
      error: fallbackMessage,
    },
    { status: statusCode }
  );
}

