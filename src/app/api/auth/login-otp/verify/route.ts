import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyOtp,
  createSessionToken,
  ADMIN_EMAIL,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  getSessionCookieOptions,
  findUserByUsernameOrEmail,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login_otp_verify",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const rawIdentifier = body.identifier || body.usernameOrEmail || body.email;
    const rawOtp = body.otp;

    if (!rawIdentifier || typeof rawIdentifier !== "string" || rawIdentifier.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Username or email is required." },
        { status: 400 }
      );
    }

    const cleanIdentifier = rawIdentifier.trim();
    const cleanOtp = String(rawOtp || "").trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    const user = await findUserByUsernameOrEmail(cleanIdentifier);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username/email or verification code." },
        { status: 400 }
      );
    }

    // Maximum 5 failed attempts allowed
    if ((user.loginOtpAttempts || 0) >= 5) {
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
    if (!user.loginOtpHash || !user.loginOtpExpires || new Date(user.loginOtpExpires) < new Date()) {
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
      const newAttempts = (user.loginOtpAttempts || 0) + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { loginOtpAttempts: newAttempts },
      });

      logSecurityEvent("AUTH_OTP_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login-otp/verify",
        method: "POST",
        userId: user.id,
        email: user.email,
        details: { attempts: newAttempts },
      });

      const remaining = Math.max(0, 5 - newAttempts);
      return NextResponse.json(
        {
          success: false,
          error:
            remaining > 0
              ? `Invalid username/email or verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Too many failed attempts. Please request a new verification code.",
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // IMPORTANT: OTP login must NEVER change or reset the user's password!
    // If an unverified user signs in via OTP, mark their email as verified automatically.
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

    const isMainAdmin =
      updatedUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      (user.role || "").toUpperCase() === "ADMIN";

    const sanitizedRole: "ADMIN" | "USER" = isMainAdmin ? "ADMIN" : "USER";

    const sanitizedUser = {
      ...updatedUser,
      role: sanitizedRole,
    };

    // Generate authenticated session token with explicit scope & rotation
    const sessionToken = createSessionToken(sanitizedUser, isMainAdmin ? "admin" : "customer");
    const response = NextResponse.json({
      success: true,
      user: sanitizedUser,
      redirectUrl: isMainAdmin ? "/admin" : "/user",
      message: isMainAdmin
        ? "Welcome back, Administrator! Directing to Admin Portal..."
        : `Welcome back, ${updatedUser.name}! Sign-in successful.`,
    });

    const cookieOpts = getSessionCookieOptions(request);
    if (isMainAdmin) {
      // Strict Admin Session: ONLY sets vn_admin_session
      response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, cookieOpts);
    } else {
      // Strict Customer Session: ONLY sets vn_session (and legacy)
      response.cookies.set(CUSTOMER_COOKIE_NAME, sessionToken, cookieOpts);
      response.cookies.set(LEGACY_COOKIE_NAME, sessionToken, cookieOpts);
    }

    return response;
  } catch (error) {
    console.error("Login OTP verify error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying login code." },
      { status: 500 }
    );
  }
}

