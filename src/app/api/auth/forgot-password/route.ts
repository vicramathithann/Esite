import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, isValidEmail } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

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

    // Keep customer authentication separate from admin authentication
    if (user.role === "ADMIN" || cleanEmail === "rrroyce20@gmail.com") {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator accounts cannot reset password via the customer portal. Please use the dedicated Admin Portal.",
        },
        { status: 403 }
      );
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
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch password reset email. Please try again in a few moments.",
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

