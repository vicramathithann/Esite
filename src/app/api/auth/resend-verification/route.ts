import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUserVerificationEmail, sendAdminVerificationEmail } from "@/lib/email";
import { generateSecureOtp, hashOtp, ADMIN_EMAIL } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_resend_verification",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email." },
        { status: 404 }
      );
    }

    const isAdmin = user.role === "ADMIN" || email === ADMIN_EMAIL.toLowerCase();

    if (user.emailVerified && !isAdmin) {
      return NextResponse.json({
        success: true,
        message: "Your email is already verified. You can log in directly.",
        alreadyVerified: true,
      });
    }

    // Rate-limiting: Enforce 60-second cooldown between OTP requests
    if (user.lastOtpSentAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(user.lastOtpSentAt).getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting a new code.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    // Invalidate previous OTP & token and generate fresh 5-minute code
    const otp = generateSecureOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpires,
        otpAttempts: 0, // Reset failed attempt counter
        lastOtpSentAt: new Date(),
        verificationToken: newToken,
        tokenExpires: newExpires,
      },
    });

    // Send verification email through Gmail SMTP: Admin uses dedicated admin template, User uses user template
    let emailResult = null;
    try {
      if (isAdmin) {
        emailResult = await sendAdminVerificationEmail(
          { id: user.id, name: user.name, email: ADMIN_EMAIL },
          newToken,
          otp
        );
      } else {
        emailResult = await sendUserVerificationEmail(
          { id: user.id, name: user.name, email: user.email },
          newToken,
          otp
        );
      }
    } catch (emailErr) {
      console.error("[EMAIL DISPATCH ERROR] Could not send verification email:", emailErr);
    }

    if (!emailResult || !emailResult.success) {
      console.error(`[RESEND VERIFICATION EMAIL FAILED] Could not send OTP to ${email}:`, emailResult?.error || "Unknown error");
      return NextResponse.json(
        {
          success: false,
          error: "Failed to dispatch verification code via email. Please check your connection and try again.",
          providerError: emailResult?.error,
          cooldown: 60,
        },
        { status: 502 }
      );
    }

    // Do NOT return the OTP or token in the public JSON response
    return NextResponse.json({
      success: true,
      message: `A new 6-digit verification code has been dispatched to ${email}.`,
      cooldown: 60,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend verification email." },
      { status: 500 }
    );
  }
}
