import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = body;

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
        { success: false, error: "Please enter the valid 6-digit recovery code." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or recovery code." },
        { status: 400 }
      );
    }

    // Check maximum 5 failed attempts
    if (user.resetOtpAttempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. For your security, please request a new recovery code.",
          code: "TOO_MANY_ATTEMPTS",
        },
        { status: 429 }
      );
    }

    // Check expiry (5 minutes)
    if (!user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Recovery code has expired (5-minute limit). Please request a new code.",
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
              ? `Invalid recovery code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Too many failed attempts. Please request a new recovery code.",
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // Single-use: consume and invalidate the OTP hash
    // Generate a fresh resetToken so the user can optionally update password if they choose "Yes"
    const freshResetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes window for the user prompt

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        resetToken: freshResetToken,
        resetTokenExpires: tokenExpires,
      },
    });

    // IMPORTANT: Password is NEVER changed here!
    return NextResponse.json({
      success: true,
      message: "Recovery code verified successfully.",
      email: user.email,
      token: freshResetToken,
    });
  } catch (error) {
    console.error("Forgot password OTP verify error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying recovery code." },
      { status: 500 }
    );
  }
}

