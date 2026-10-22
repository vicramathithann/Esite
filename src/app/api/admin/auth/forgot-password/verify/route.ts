import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

/**
 * GET: Validates whether a reset token is valid, expired, or already used
 * without modifying or consuming the token.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = (searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json({
        valid: false,
        status: "MISSING",
        error: "Missing password reset link. Please use the link sent to your email.",
      });
    }

    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL.toLowerCase() },
    });

    if (!admin || (admin.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json({
        valid: false,
        status: "INVALID",
        error: "Administrator account not found.",
      });
    }

    // Check if token matches the currently active reset token
    if (admin.resetToken && admin.resetToken === token) {
      if (admin.resetTokenExpires && new Date() > new Date(admin.resetTokenExpires)) {
        return NextResponse.json({
          valid: false,
          status: "EXPIRED",
          error: "This password reset link has expired (links are valid for 1 hour). Please request a fresh link.",
        });
      }

      const remainingMinutes = admin.resetTokenExpires
        ? Math.max(1, Math.round((new Date(admin.resetTokenExpires).getTime() - Date.now()) / (60 * 1000)))
        : 60;

      return NextResponse.json({
        valid: true,
        status: "VALID",
        email: admin.email,
        expiresInMinutes: remainingMinutes,
      });
    }

    // Check if token has already been consumed
    const usedTokens = admin.resetOtpHash ? admin.resetOtpHash.split(",").map((t) => t.trim()) : [];
    if (usedTokens.includes(token)) {
      return NextResponse.json({
        valid: false,
        status: "USED",
        error: "This password reset link has already been used. For your security, reset links can only be used once. Please request a new link if needed.",
      });
    }

    // Otherwise, token is invalid or superseded
    return NextResponse.json({
      valid: false,
      status: "INVALID",
      error: "This password reset link is invalid or has been superseded by a newer link. Please request a fresh link.",
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
 * POST: Verifies token, derives PBKDF2 hash, and updates administrator password.
 */
export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_forgot_password_verify",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawToken = body.token;
    const rawPassword = body.newPassword;
    const rawConfirm = body.confirmPassword;

    if (!rawToken || typeof rawToken !== "string" || !rawPassword) {
      return NextResponse.json(
        { success: false, error: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    const cleanToken = rawToken.trim();
    const newPassword = String(rawPassword);

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (rawConfirm && newPassword !== String(rawConfirm)) {
      return NextResponse.json(
        { success: false, error: "New password and confirm password do not match." },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL.toLowerCase() },
    });

    if (!admin || (admin.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Administrator account not found." },
        { status: 404 }
      );
    }

    // Check if token was already used
    const usedTokens = admin.resetOtpHash ? admin.resetOtpHash.split(",").map((t) => t.trim()) : [];
    if (usedTokens.includes(cleanToken)) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has already been used. For your security, reset links can only be used once. Please request a new link.",
          status: "USED",
        },
        { status: 400 }
      );
    }

    // Check if token matches active token
    if (!admin.resetToken || admin.resetToken !== cleanToken) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link is invalid or has been superseded by a newer link. Please request a fresh link.",
          status: "INVALID",
        },
        { status: 400 }
      );
    }

    // Check expiration (1 hour)
    if (!admin.resetTokenExpires || new Date() > new Date(admin.resetTokenExpires)) {
      return NextResponse.json(
        {
          success: false,
          error: "This password reset link has expired (links are valid for 1 hour). Please request a fresh link.",
          status: "EXPIRED",
        },
        { status: 400 }
      );
    }

    // Hash new password using 100,000 iterations PBKDF2
    const hashedPassword = hashPassword(newPassword);

    // Track consumed token in usedTokens history and invalidate active token
    const updatedUsedTokens = [...usedTokens, cleanToken].slice(-20).join(",");

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
        resetOtpHash: updatedUsedTokens,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
      },
    });

    logSecurityEvent("ADMIN_PASSWORD_CHANGED", "INFO", {
      userId: admin.id,
      email: admin.email,
      route: "/api/admin/auth/forgot-password/verify",
      details: { method: "RESET_LINK" },
    });

    return NextResponse.json({
      success: true,
      message: "Administrator password updated successfully! Redirecting to sign in...",
    });
  } catch (err) {
    console.error("Admin forgot password verify error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error resetting administrator password." },
      { status: 500 }
    );
  }
}
