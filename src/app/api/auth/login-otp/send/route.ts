import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLoginOtpEmail, sendAdminLoginOtpEmail } from "@/lib/email";
import {
  generateSecureOtp,
  hashOtp,
  ADMIN_EMAIL,
  findUserByUsernameOrEmail,
} from "@/lib/auth";
import { maskEmail } from "@/lib/username";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login_otp_send",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const rawIdentifier = body.identifier || body.usernameOrEmail || body.email;

    if (!rawIdentifier || typeof rawIdentifier !== "string" || rawIdentifier.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Username or email is required." },
        { status: 400 }
      );
    }

    if (rawIdentifier.length > 254) {
      return NextResponse.json(
        { success: false, error: "Input is too long." },
        { status: 400 }
      );
    }

    const cleanIdentifier = rawIdentifier.trim();

    // Rate limit per account identifier to prevent SMS/email bombing
    const accountRateLimitError = enforceRateLimit(request, {
      keyPrefix: `auth_login_otp_send_acc_${cleanIdentifier.toLowerCase()}`,
      maxRequests: 3,
      windowSeconds: 60,
    });
    if (accountRateLimitError) return accountRateLimitError;

    // Resolve user account by either normalized username or email
    const user = await findUserByUsernameOrEmail(cleanIdentifier);

    // Generic response if account doesn't exist (prevents user enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a code has been sent to its registered email.",
        cooldown: 60,
        maskedEmail: cleanIdentifier.includes("@") ? maskEmail(cleanIdentifier) : null,
      });
    }

    const isAdmin =
      user.role === "ADMIN" || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    // Enforce 60-second cooldown between OTP requests
    if (user.lastLoginOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(user.lastLoginOtpSentAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new login code.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Generate fresh 6-digit OTP with 5-minute expiry
    const otp = generateSecureOtp();
    const loginOtpHash = hashOtp(otp);
    const loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginOtpHash,
        loginOtpExpires,
        loginOtpAttempts: 0, // Reset failed verification attempts
        lastLoginOtpSentAt: new Date(),
      },
    });

    // Dispatch OTP strictly to registered email: Admin receives dedicated Admin OTP, User receives User OTP
    let emailResult = null;
    try {
      if (isAdmin) {
        emailResult = await sendAdminLoginOtpEmail(
          { id: user.id, name: user.name, email: ADMIN_EMAIL },
          otp
        );
      } else {
        emailResult = await sendLoginOtpEmail(
          { id: user.id, name: user.name, email: user.email },
          otp
        );
      }
    } catch (emailErr) {
      console.error("[LOGIN OTP DISPATCH ERROR] Could not send OTP email:", emailErr);
    }

    if (!emailResult || !emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch login code via email. Please check your connection and try again.",
          cooldown: 60,
        },
        { status: 502 }
      );
    }

    logSecurityEvent("AUTH_OTP_REQUESTED", "INFO", {
      ip: getClientIp(request),
      route: "/api/auth/login-otp/send",
      method: "POST",
      userId: user.id,
      email: user.email,
    });

    // Return neutral message with masked email strictly for verification UX
    return NextResponse.json({
      success: true,
      message: "If an account exists, a code has been sent to its registered email.",
      cooldown: 60,
      maskedEmail: maskEmail(user.email),
    });
  } catch (error) {
    console.error("Login OTP send error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while requesting login code." },
      { status: 500 }
    );
  }
}

