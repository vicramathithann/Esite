import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendLoginOtpEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, isValidEmail } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login_otp_send",
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

    // Generic response if account doesn't exist (prevents user enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, a 6-digit login code has been sent.",
        cooldown: 60,
      });
    }

    // Keep customer authentication separate from admin authentication
    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator accounts must sign in using their administrator password.",
        },
        { status: 403 }
      );
    }

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

    // Dispatch OTP via Gmail SMTP
    let emailResult = null;
    try {
      emailResult = await sendLoginOtpEmail(
        { id: user.id, name: user.name, email: user.email },
        otp
      );
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
      email: cleanEmail,
    });

    // Never return the OTP in the API response
    return NextResponse.json({
      success: true,
      message: `A 6-digit login code has been sent to ${cleanEmail}. Valid for 5 minutes.`,
      cooldown: 60,
    });
  } catch (error) {
    console.error("Login OTP send error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while requesting login code." },
      { status: 500 }
    );
  }
}

