import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminPasswordResetEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, ADMIN_EMAIL, ensureAdminUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_forgot_password_send",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Administrator email is required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();

    // STRICT ADMIN RESTRICTION: Only rrroyce20@gmail.com can trigger Admin Forgot Password
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      logSecurityEvent("ACCESS_DENIED_FORBIDDEN", "WARN", {
        email: cleanEmail,
        route: "/api/admin/auth/forgot-password/send",
        details: { attemptedEmail: cleanEmail },
      });
      return NextResponse.json(
        {
          success: false,
          error: "Admin password reset is strictly restricted to the authorized administrator account.",
        },
        { status: 403 }
      );
    }

    await ensureAdminUser();

    const admin = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Administrator account not found." },
        { status: 404 }
      );
    }

    // Cooldown check (60 seconds)
    if (admin.lastResetOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(admin.lastResetOtpSentAt).getTime()) / 1000
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

    // Generate fresh 6-digit OTP
    const otp = generateSecureOtp();
    const resetOtpHash = hashOtp(otp);
    const resetOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        resetOtpHash,
        resetOtpExpires,
        resetOtpAttempts: 0,
        lastResetOtpSentAt: new Date(),
      },
    });

    // Send email to rrroyce20@gmail.com
    const emailResult = await sendAdminPasswordResetEmail(
      { id: admin.id, email: admin.email, name: admin.name },
      otp
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch reset email. Please check SMTP configuration or try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit password recovery code has been dispatched to ${cleanEmail}.`,
      cooldown: 60,
    });
  } catch (err) {
    console.error("Admin forgot password send error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error dispatching admin password reset code." },
      { status: 500 }
    );
  }
}

