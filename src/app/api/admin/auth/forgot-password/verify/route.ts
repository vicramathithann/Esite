import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtp, hashPassword, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_forgot_password_verify",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawEmail = body.email;
    const rawOtp = body.otp;
    const rawPassword = body.newPassword;

    if (!rawEmail || !rawOtp || !rawPassword) {
      return NextResponse.json(
        { success: false, error: "Email, 6-digit verification code, and new password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanOtp = String(rawOtp).trim();
    const newPassword = String(rawPassword);

    // STRICT ADMIN RESTRICTION: Only rrroyce20@gmail.com
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin password reset is restricted to the authorized administrator account.",
        },
        { status: 403 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
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

    // Check pending reset OTP
    if (!admin.resetOtpHash || !admin.resetOtpExpires) {
      return NextResponse.json(
        { success: false, error: "No pending password reset request found. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > new Date(admin.resetOtpExpires)) {
      return NextResponse.json(
        { success: false, error: "This password recovery code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check attempt limit
    const currentAttempts = admin.resetOtpAttempts || 0;
    if (currentAttempts >= 5) {
      return NextResponse.json(
        { success: false, error: "Too many failed attempts. Please request a new recovery code." },
        { status: 429 }
      );
    }

    // Verify OTP
    const isValid = verifyOtp(cleanOtp, admin.resetOtpHash);
    if (!isValid) {
      const remaining = 4 - currentAttempts;
      await prisma.user.update({
        where: { id: admin.id },
        data: { resetOtpAttempts: { increment: 1 } },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Invalid recovery code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
          remainingAttempts: Math.max(0, remaining),
        },
        { status: 400 }
      );
    }

    // Hash new password using 100,000 iterations PBKDF2
    const hashedPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetOtpHash: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    logSecurityEvent("ADMIN_PASSWORD_CHANGED", "INFO", {
      userId: admin.id,
      email: cleanEmail,
      route: "/api/admin/auth/forgot-password/verify",
    });

    return NextResponse.json({
      success: true,
      message: "Administrator password updated successfully. You can now sign in with your new password.",
    });
  } catch (err) {
    console.error("Admin forgot password verify error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error resetting administrator password." },
      { status: 500 }
    );
  }
}

