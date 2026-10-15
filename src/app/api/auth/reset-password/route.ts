import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyOtp, createSessionToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_reset_password",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, otp, token, newPassword, confirmPassword } = body;

    // Password validation
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a new password." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify and re-enter." },
        { status: 400 }
      );
    }

    let targetUserId: string | null = null;

    // Method A: Direct link token validation
    const cleanToken = (token || "").trim();
    if (cleanToken) {
      const user = await prisma.user.findFirst({
        where: { resetToken: cleanToken },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Invalid or already used password reset link." },
          { status: 400 }
        );
      }

      if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: "Password reset link has expired. Please request a new password reset.",
            expired: true,
          },
          { status: 410 }
        );
      }

      targetUserId = user.id;
    }
    // Method B: 6-Digit OTP verification
    else {
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
          { success: false, error: "Please enter the 6-digit reset code sent to your email." },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: "Invalid email or reset code." },
          { status: 400 }
        );
      }

      // Check max failed verification attempts
      if (user.resetOtpAttempts >= 5) {
        return NextResponse.json(
          {
            success: false,
            error: "Too many failed attempts. For your security, please request a new reset code.",
            code: "TOO_MANY_ATTEMPTS",
          },
          { status: 429 }
        );
      }

      // Check OTP expiry (15 minutes)
      if (!user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) {
        return NextResponse.json(
          {
            success: false,
            error: "Password reset code has expired. Please request a new code.",
            expired: true,
          },
          { status: 410 }
        );
      }

      // Verify OTP against stored PBKDF2 hash
      const isValid = verifyOtp(cleanOtp, user.resetOtpHash);

      if (!isValid) {
        const newAttempts = user.resetOtpAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: { resetOtpAttempts: newAttempts },
        });

        const remaining = Math.max(0, 5 - newAttempts);
        return NextResponse.json(
          {
            success: false,
            error:
              remaining > 0
                ? `Invalid reset code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
                : "Too many failed attempts. Please request a new reset code.",
            remainingAttempts: remaining,
          },
          { status: 400 }
        );
      }

      targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "Invalid password reset request." },
        { status: 400 }
      );
    }

    // Hash the new password securely
    const hashedPassword = hashPassword(newPassword);

    // Update password and invalidate all reset tokens and OTP hashes (single-use enforcement)
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        emailVerified: true, // Proved ownership of the registered email address
        resetToken: null,
        resetTokenExpires: null,
        resetOtpHash: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
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

    logSecurityEvent("AUTH_PASSWORD_RESET_COMPLETED", "INFO", {
      ip: getClientIp(request),
      route: "/api/auth/reset-password",
      method: "POST",
      userId: updatedUser.id,
      email: updatedUser.email,
    });

    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      redirectUrl: updatedUser.role === "ADMIN" ? "/admin" : "/",
      message: "Your password has been successfully reset. You are now logged in.",
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
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while resetting your password." },
      { status: 500 }
    );
  }
}

