import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { POST as verifyOtpHandler } from "@/app/api/auth/verify-otp/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_verify_email_get",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification link." },
        { status: 404 }
      );
    }

    if (user.tokenExpires && user.tokenExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification link has expired. Please request a new verification code.",
          expired: true,
          email: user.email,
        },
        { status: 410 }
      );
    }

    // Mark user as verified and clear OTP & token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        email_verified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
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

    const isAuthorizedAdmin =
      updatedUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      (updatedUser.role || "").toUpperCase() === "ADMIN";

    const sanitizedUser = {
      ...updatedUser,
      role: isAuthorizedAdmin ? ("ADMIN" as const) : ("USER" as const),
    };

    const sessionToken = createSessionToken(sanitizedUser);
    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
      redirectUrl: isAuthorizedAdmin ? "/admin" : "/",
      message: isAuthorizedAdmin
        ? "Administrator verified successfully! Directing to Admin Portal..."
        : "Email verified successfully! You are now logged in.",
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
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify email." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_verify_email_post",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, otp, code, token } = body;

    // A. 6-Digit OTP Verification Flow -> Delegates directly to verify-otp
    if (otp !== undefined || code !== undefined) {
      const verifyReq = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify({ email, code: code || otp }),
      });
      return verifyOtpHandler(verifyReq);
    }

    // B. Token Verification Flow (from verification link POST)
    const cleanToken = token?.trim();
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: "Verification code or token is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: cleanToken },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used verification link." },
        { status: 404 }
      );
    }

    if (user.tokenExpires && user.tokenExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification link has expired. Please request a new verification email.",
          expired: true,
          email: user.email,
        },
        { status: 410 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        email_verified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
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

    const isAuthorizedAdmin =
      updatedUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      (updatedUser.role || "").toUpperCase() === "ADMIN";

    const sanitizedUser = {
      ...updatedUser,
      role: isAuthorizedAdmin ? ("ADMIN" as const) : ("USER" as const),
    };

    const sessionToken = createSessionToken(sanitizedUser);
    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
      redirectUrl: isAuthorizedAdmin ? "/admin" : "/",
      message: isAuthorizedAdmin
        ? "Administrator verified successfully! Directing to Admin Portal..."
        : "Email verified successfully! You are now logged in.",
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
    console.error("POST verify email error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying email." },
      { status: 500 }
    );
  }
}
