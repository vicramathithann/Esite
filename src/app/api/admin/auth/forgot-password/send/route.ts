import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendAdminPasswordResetEmail } from "@/lib/email";
import { ADMIN_EMAIL, ensureAdminUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";
import { getAppUrl } from "@/lib/appUrl";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_forgot_password_send",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Administrator email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();

    // STRICT ADMIN RESTRICTION: Only rrroyce20@gmail.com can trigger Admin Forgot Password
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      logSecurityEvent("ACCESS_DENIED_FORBIDDEN", "WARN", {
        email: cleanEmail,
        route: "/api/admin/auth/forgot-password/send",
        details: { attemptedEmail: cleanEmail },
      });
      return NextResponse.json(
        {
          success: false,
          error: "Admin password recovery is strictly restricted to the authorized administrator account.",
        },
        { status: 403 }
      );
    }

    await ensureAdminUser();

    const admin = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Administrator account not found." },
        { status: 404 }
      );
    }

    if ((admin.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin password recovery is strictly restricted to administrator accounts." },
        { status: 403 }
      );
    }

    // Cooldown check (60 seconds)
    if (admin.lastResetOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(admin.lastResetOtpSentAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting another reset link.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Generate cryptographically secure random token (64 hex characters)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiresMinutes = 60; // 60 minutes (1 hour)
    const resetTokenExpires = new Date(Date.now() + tokenExpiresMinutes * 60 * 1000);

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        resetToken,
        resetTokenExpires,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        lastResetOtpSentAt: new Date(),
      },
    });

    const appUrl = getAppUrl(request);
    const resetLink = `${appUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch secure email with reset link
    const emailResult = await sendAdminPasswordResetEmail(
      { id: admin.id, email: admin.email, name: admin.name },
      resetLink,
      tokenExpiresMinutes
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch reset email. Please check SMTP configuration or try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A secure password reset link has been dispatched to ${cleanEmail}. Please check your inbox.`,
      cooldown: 60,
    });
  } catch (err) {
    console.error("Admin forgot password send error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error dispatching admin password reset link." },
      { status: 500 }
    );
  }
}
