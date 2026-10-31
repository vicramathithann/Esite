import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyOtp,
  createSessionToken,
  ADMIN_EMAIL,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_auth_login_otp_verify",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const cleanOtp = String(body.otp || "").trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: ADMIN_EMAIL.toLowerCase() },
          { role: "ADMIN" },
        ],
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin account not found." },
        { status: 404 }
      );
    }

    if (admin.loginOtpAttempts >= 5) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new OTP." },
        { status: 429 }
      );
    }

    if (!admin.loginOtpHash || !admin.loginOtpExpires || admin.loginOtpExpires < new Date()) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 410 }
      );
    }

    const isValid = verifyOtp(cleanOtp, admin.loginOtpHash);
    if (!isValid) {
      const newAttempts = admin.loginOtpAttempts + 1;
      await prisma.user.update({
        where: { id: admin.id },
        data: { loginOtpAttempts: newAttempts },
      });
      const remaining = Math.max(0, 5 - newAttempts);
      return NextResponse.json(
        {
          success: false,
          error: remaining > 0 ? `Invalid code. ${remaining} attempt(s) remaining.` : "Too many failed attempts.",
        },
        { status: 400 }
      );
    }

    const updatedAdmin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        emailVerified: true,
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
      },
    });

    const sanitizedAdmin = {
      ...updatedAdmin,
      role: "ADMIN" as const,
    };

    const sessionToken = createSessionToken(sanitizedAdmin);
    const response = NextResponse.json({
      success: true,
      user: sanitizedAdmin,
      redirectUrl: "/admin",
      message: "Administrator verified successfully! Directing to Admin Portal...",
    });

    const cookieOpts = getSessionCookieOptions(request);
    response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, cookieOpts);
    response.cookies.set(CUSTOMER_COOKIE_NAME, sessionToken, cookieOpts);

    return response;
  } catch (err) {
    console.error("Admin OTP verify error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify admin OTP." },
      { status: 500 }
    );
  }
}
