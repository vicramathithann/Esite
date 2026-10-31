import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  hashPassword,
  ADMIN_EMAIL,
  createSessionToken,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const GENERIC_TOKEN_ERROR = "This password reset link is invalid or has expired. Please request a new link.";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z
      .string()
      .min(10, "Password must be at least 10 characters long")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol or special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  });

/**
 * Constant-time hash verification helper to prevent timing attacks.
 */
function constantTimeHashMatch(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;
  const computedHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
  if (computedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash, "utf-8"), Buffer.from(storedHash, "utf-8"));
}

/**
 * GET: Validates whether a reset token is valid and unexpired without consuming it.
 * The link itself NEVER grants access or issues session cookies.
 */
export async function GET(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_token_inspect",
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const rawToken = (searchParams.get("token") || "").trim();

    if (!rawToken) {
      return NextResponse.json({
        valid: false,
        status: "INVALID",
        error: GENERIC_TOKEN_ERROR,
      });
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Look up token in AdminPasswordResetToken table
    const tokenRecord = await prisma.adminPasswordResetToken.findFirst({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      return NextResponse.json({
        valid: false,
        status: "INVALID",
        error: GENERIC_TOKEN_ERROR,
      });
    }

    // Verify hash match in constant time
    if (!constantTimeHashMatch(rawToken, tokenRecord.tokenHash)) {
      return NextResponse.json({
        valid: false,
        status: "INVALID",
        error: GENERIC_TOKEN_ERROR,
      });
    }

    // Check if token was already used
    if (tokenRecord.usedAt) {
      return NextResponse.json({
        valid: false,
        status: "USED",
        error: "This password reset link has already been used. Please request a new link.",
      });
    }

    // Check if token is expired (15-minute validity window)
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json({
        valid: false,
        status: "EXPIRED",
        error: "This password reset link has expired. Please request a new link.",
      });
    }

    const remainingMinutes = Math.max(
      1,
      Math.round((new Date(tokenRecord.expiresAt).getTime() - Date.now()) / (60 * 1000))
    );

    return NextResponse.json({
      valid: true,
      status: "VALID",
      email: ADMIN_EMAIL,
      expiresInMinutes: remainingMinutes,
    });
  } catch (err) {
    console.error("Admin verify token GET error:", err);
    return NextResponse.json(
      { valid: false, status: "ERROR", error: "Failed to verify reset token status." },
      { status: 500 }
    );
  }
}

/**
 * POST: Verifies token, validates password policy, updates password,
 * revokes all prior admin sessions, and issues a fresh session for the current browser.
 */
export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: 5 requests per 10 minutes per IP
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_forgot_password_submit",
      maxRequests: 5,
      windowSeconds: 600,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const parseResult = resetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstIssue?.message || "Invalid input." },
        { status: 400 }
      );
    }

    const { token: rawToken, newPassword } = parseResult.data;
    const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

    // Look up token in AdminPasswordResetToken table
    const tokenRecord = await prisma.adminPasswordResetToken.findFirst({
      where: { tokenHash },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: GENERIC_TOKEN_ERROR, status: "INVALID" },
        { status: 400 }
      );
    }

    // Compare hash in constant time
    if (!constantTimeHashMatch(rawToken, tokenRecord.tokenHash)) {
      return NextResponse.json(
        { success: false, error: GENERIC_TOKEN_ERROR, status: "INVALID" },
        { status: 400 }
      );
    }

    // Reject already consumed tokens
    if (tokenRecord.usedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has already been used. Please request a new link.",
          status: "USED",
        },
        { status: 400 }
      );
    }

    // Reject expired tokens
    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has expired. Please request a new link.",
          status: "EXPIRED",
        },
        { status: 400 }
      );
    }

    // Look up and verify administrator identity
    const admin = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!admin || (admin.role || "").toUpperCase() !== "ADMIN" || admin.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: GENERIC_TOKEN_ERROR, status: "INVALID" },
        { status: 403 }
      );
    }

    // 1. Single use: Mark this token as used
    await prisma.adminPasswordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    // 2. Invalidate any other pending reset tokens for this admin
    await prisma.adminPasswordResetToken.updateMany({
      where: {
        userId: admin.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 3. Hash new password with existing PBKDF2/SHA-512 (100,000 iterations)
    const hashedPassword = hashPassword(newPassword);
    const now = new Date();

    // 4. Invalidate all prior sessions by updating tokenExpires to `now`
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        tokenExpires: now, // Tokens issued before this timestamp are rejected by requireAdmin!
        resetToken: null,
        resetTokenExpires: null,
        resetOtpHash: null,
        resetOtpExpires: null,
      },
    });

    // 5. Sync to Supabase Auth if user exists in auth.users
    try {
      await supabaseAdmin.auth.admin.updateUserById(admin.id, {
        password: newPassword,
      });
    } catch (authErr) {
      console.warn("[ADMIN_PASSWORD_RESET] Supabase Auth update notice:", authErr);
    }

    // 6. Record completion in audit log table without storing passwords or tokens
    try {
      await prisma.adminSecurityAudit.create({
        data: {
          userId: admin.id,
          action: "PASSWORD_RESET_COMPLETED",
          ipAddress: clientIp,
          userAgent: request.headers.get("user-agent") || null,
        },
      });
    } catch (auditErr) {
      console.error("[ADMIN_SECURITY_AUDIT_ERROR]", auditErr);
    }

    logSecurityEvent("ADMIN_PASSWORD_RESET_COMPLETED", "INFO", {
      userId: admin.id,
      email: admin.email,
      ip: clientIp,
      route: "/api/admin/auth/forgot-password/verify",
    });

    // 7. Issue fresh, isolated session cookie exclusively for the current browser
    const sanitizedAdmin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: "ADMIN" as const,
      emailVerified: true,
      createdAt: admin.createdAt,
    };

    const sessionToken = createSessionToken(sanitizedAdmin);
    const response = NextResponse.json({
      success: true,
      user: sanitizedAdmin,
      redirectUrl: "/admin",
      message: "Administrator password updated successfully! Directing to Admin Portal...",
    });

    const cookieOpts = getSessionCookieOptions(request);
    response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, cookieOpts);
    response.cookies.set(CUSTOMER_COOKIE_NAME, sessionToken, cookieOpts);

    return response;
  } catch (err) {
    console.error("Admin forgot password verify error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error resetting administrator password." },
      { status: 500 }
    );
  }
}
