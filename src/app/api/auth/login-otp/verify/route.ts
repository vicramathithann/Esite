import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, createSessionToken, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login_otp_verify",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, otp } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanOtp = String(otp || "").trim();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or verification code." },
        { status: 400 }
      );
    }

    // Keep customer authentication separate from admin authentication
    if (user.role === "ADMIN" || cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Administrator accounts must sign in using their administrator password." },
        { status: 403 }
      );
    }

    // Maximum 5 failed attempts allowed
    if (user.loginOtpAttempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. For your security, please request a new login code.",
          code: "TOO_MANY_ATTEMPTS",
        },
        { status: 429 }
      );
    }

    // Check expiry (5 minutes)
    if (!user.loginOtpHash || !user.loginOtpExpires || user.loginOtpExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification code has expired. Please request a new code.",
          expired: true,
        },
        { status: 410 }
      );
    }

    // Verify OTP against PBKDF2 hash
    const isValid = verifyOtp(cleanOtp, user.loginOtpHash);

    if (!isValid) {
      const newAttempts = user.loginOtpAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { loginOtpAttempts: newAttempts },
      });

      logSecurityEvent("AUTH_OTP_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login-otp/verify",
        method: "POST",
        userId: user.id,
        email: cleanEmail,
        details: { attempts: newAttempts },
      });

      const remaining = Math.max(0, 5 - newAttempts);
      return NextResponse.json(
        {
          success: false,
          error:
            remaining > 0
              ? `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Too many failed attempts. Please request a new verification code.",
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // IMPORTANT: OTP login must NEVER change or reset the user's password!
    // The user's password field is untouched.
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true, // Verification proves ownership of the email
        loginOtpHash: null,
        loginOtpExpires: null,
        loginOtpAttempts: 0,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    logSecurityEvent("AUTH_OTP_VERIFIED", "INFO", {
      ip: getClientIp(request),
      route: "/api/auth/login-otp/verify",
      method: "POST",
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    // Generate authenticated session token
    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      redirectUrl: "/user",
      message: `Welcome back, ${updatedUser.name}! Sign-in successful.`,
    });

    response.cookies.set("vn_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login OTP verify error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying login code." },
      { status: 500 }
    );
  }
}

