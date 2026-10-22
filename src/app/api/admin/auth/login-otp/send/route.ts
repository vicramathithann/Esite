import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminLoginOtpEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, ADMIN_EMAIL, ensureAdminUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_login_otp_send",
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

    // STRICT ADMIN RESTRICTION: Only rrroyce20@gmail.com can receive Admin Login OTP
    if (cleanEmail !== ADMIN_EMAIL.toLowerCase()) {
      logSecurityEvent("ACCESS_DENIED_FORBIDDEN", "WARN", {
        email: cleanEmail,
        route: "/api/admin/auth/login-otp/send",
        details: { attemptedEmail: cleanEmail },
      });
      return NextResponse.json(
        {
          success: false,
          error: "Admin OTP login is strictly restricted to the authorized administrator account.",
        },
        { status: 403 }
      );
    }

    // Ensure the admin account exists in database
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

    if ((admin.role || "").toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Admin OTP login is strictly restricted to administrator accounts." },
        { status: 403 }
      );
    }

    // Cooldown check (60 seconds)
    if (admin.lastLoginOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(admin.lastLoginOtpSentAt).getTime()) / 1000
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

    // Generate fresh 6-digit OTP
    const otp = generateSecureOtp();
    const loginOtpHash = hashOtp(otp);
    const loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        loginOtpHash,
        loginOtpExpires,
        loginOtpAttempts: 0,
        lastLoginOtpSentAt: new Date(),
      },
    });

    // Send email to rrroyce20@gmail.com
    const emailResult = await sendAdminLoginOtpEmail(
      { id: admin.id, email: admin.email, name: admin.name },
      otp
    );

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch email. Please check SMTP configuration or try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit login verification code has been dispatched to ${cleanEmail}.`,
      cooldown: 60,
    });
  } catch (err) {
    console.error("Admin OTP send error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error dispatching admin login OTP." },
      { status: 500 }
    );
  }
}

