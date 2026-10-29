import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, sendAdminPasswordResetEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, isValidEmail, ADMIN_EMAIL, ensureAdminUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { getAppUrl } from "@/lib/appUrl";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_forgot_password",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Anti-enumeration protection: return generic success message if account does not exist
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been sent.",
        cooldown: 60,
      });
    }

    // -------------------------------------------------------------
    // ADMIN RECOVERY: Strict Email-Only Recovery for rrroyce20@gmail.com
    // -------------------------------------------------------------
    if (cleanEmail === ADMIN_EMAIL.toLowerCase() || (user && user.role === "ADMIN")) {
      if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
        return NextResponse.json(
          { success: false, error: "Admin recovery is strictly restricted to the authorized administrator account." },
          { status: 403 }
        );
      }

      await ensureAdminUser();
      const admin = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!admin || (admin.role || "").toUpperCase() !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Administrator account not found." },
          { status: 404 }
        );
      }

      // Enforce 60-second cooldown
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

      // Generate cryptographically secure token (64 hex characters, valid for 60 minutes)
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiresMinutes = 60;
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

      const emailResult = await sendAdminPasswordResetEmail(
        { id: admin.id, email: admin.email, name: admin.name },
        resetLink,
        tokenExpiresMinutes
      );

      if (!emailResult.success) {
        return NextResponse.json(
          { success: false, error: "Failed to dispatch admin reset email. Please try again in a few moments." },
          { status: 500 }
        );
      }

      logSecurityEvent("AUTH_PASSWORD_RESET_REQUESTED", "INFO", {
        userId: admin.id,
        email: cleanEmail,
        route: "/api/auth/forgot-password",
      });

      return NextResponse.json({
        success: true,
        adminRecovery: true,
        message: `A secure password reset link has been dispatched to ${cleanEmail}. Please check your inbox.`,
        cooldown: 60,
      });
    }

    // Rate-limiting: Enforce 60-second cooldown between reset requests
    if (user.lastResetOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(user.lastResetOtpSentAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting another reset code.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Generate fresh 6-digit OTP with 5-minute expiry
    const otp = generateSecureOtp();
    const resetOtpHash = hashOtp(otp);
    const resetToken = crypto.randomBytes(32).toString("hex");
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes strictly as required
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for direct links

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash,
        resetOtpExpires: otpExpiresAt,
        resetOtpAttempts: 0, // Reset failed attempt count
        lastResetOtpSentAt: new Date(),
        resetToken,
        resetTokenExpires: tokenExpiresAt,
      },
    });

    // Send password reset email via Gmail SMTP
    let emailResult = null;
    try {
      emailResult = await sendPasswordResetEmail(
        { id: user.id, name: user.name, email: user.email },
        otp,
        resetToken
      );
    } catch (emailErr) {
      console.error("[PASSWORD RESET EMAIL ERROR] Could not dispatch reset email:", emailErr);
    }

    if (!emailResult || !emailResult.success) {
      console.error(`[FORGOT PASSWORD EMAIL FAILED] Could not send OTP to ${user.email}:`, emailResult?.error || "Unknown error");
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch password reset email. Please try again in a few moments.",
          providerError: emailResult?.error,
          cooldown: 60,
        },
        { status: 502 }
      );
    }

    logSecurityEvent("AUTH_PASSWORD_RESET_REQUESTED", "INFO", {
      ip: getClientIp(request),
      route: "/api/auth/forgot-password",
      method: "POST",
      userId: user.id,
      email: cleanEmail,
    });

    // Never return the OTP or reset token in response
    return NextResponse.json({
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Check your inbox for the 6-digit code or reset link.`,
      cooldown: 60,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing password reset." },
      { status: 500 }
    );
  }
}

