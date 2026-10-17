import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, ADMIN_EMAIL, createSessionToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_login_otp_verify",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawEmail = body.email;
    const rawOtp = body.otp;

    if (!rawEmail || !rawOtp) {
      return NextResponse.json(
        { success: false, error: "Administrator email and 6-digit OTP code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanOtp = String(rawOtp).trim();

    // STRICT ADMIN RESTRICTION: Only rrroyce20@gmail.com can log in via Admin OTP
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin OTP verification is restricted to the authorized administrator account.",
        },
        { status: 403 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Administrator account not found." },
        { status: 404 }
      );
    }

    // Check if an OTP was sent
    if (!admin.loginOtpHash || !admin.loginOtpExpires) {
      return NextResponse.json(
        { success: false, error: "No pending login code found. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > new Date(admin.loginOtpExpires)) {
      return NextResponse.json(
        { success: false, error: "This login code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempt limit
    const currentAttempts = admin.loginOtpAttempts || 0;
    if (currentAttempts >= 5) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new verification code." },
        { status: 429 }
      );
    }

    // Verify OTP
    const isValid = verifyOtp(cleanOtp, admin.loginOtpHash);
    if (!isValid) {
      const remaining = 4 - currentAttempts;
      await prisma.user.update({
        where: { id: admin.id },
        data: { loginOtpAttempts: { increment: 1 } },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
          remainingAttempts: Math.max(0, remaining),
        },
        { status: 400 }
      );
    }

    // Clear OTP data after successful verification
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        loginOtpHash: null,
        loginOtpExpires: null,
        loginOtpAttempts: 0,
        role: "ADMIN",
        emailVerified: true,
      },
    });

    // Create secure admin session
    const sessionToken = createSessionToken(admin);

    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = [
      `vn_session=${encodeURIComponent(sessionToken)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${30 * 24 * 60 * 60}`,
      isProduction ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; ");

    logSecurityEvent("AUTH_LOGIN_SUCCESS", "INFO", {
      userId: admin.id,
      email: cleanEmail,
      role: "ADMIN",
      route: "/api/admin/auth/login-otp/verify",
      details: { method: "OTP" },
    });

    const response = NextResponse.json({
      success: true,
      message: "Administrator authenticated successfully via OTP.",
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: "ADMIN",
        emailVerified: true,
      },
    });

    response.headers.append("Set-Cookie", cookieOptions);
    return response;
  } catch (err) {
    console.error("Admin OTP verify error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error verifying admin OTP." },
      { status: 500 }
    );
  }
}

