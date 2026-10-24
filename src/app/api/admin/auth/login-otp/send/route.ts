import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAdminLoginOtpEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_auth_login_otp_send",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

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

    // Cooldown check (60s)
    if (admin.lastLoginOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(admin.lastLoginOtpSentAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new admin OTP.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    const otp = generateSecureOtp();
    const loginOtpHash = hashOtp(otp);
    const loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        loginOtpHash,
        loginOtpExpires,
        loginOtpAttempts: 0,
        lastLoginOtpSentAt: new Date(),
      },
    });

    const emailResult = await sendAdminLoginOtpEmail(
      { id: admin.id, name: admin.name, email: ADMIN_EMAIL },
      otp
    );

    if (!emailResult || !emailResult.success) {
      return NextResponse.json(
        { success: false, error: "Failed to deliver Admin OTP via email. Check Gmail SMTP settings." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A secure 6-digit Admin Login OTP has been dispatched to ${ADMIN_EMAIL}.`,
      cooldown: 60,
    });
  } catch (err) {
    console.error("Admin OTP send error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch admin verification OTP." },
      { status: 500 }
    );
  }
}
