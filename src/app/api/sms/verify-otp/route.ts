import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "sms_verify_otp",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: "Phone number and verification code are required." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    const cleanCode = code.trim();

    // Find the latest active OTP for this phone
    const record = await prisma.otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        code: cleanCode,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification code. Please check your SMS and try again." },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Phone number successfully verified!",
    });
  } catch (error) {
    console.error("Failed to verify OTP:", error);
    return NextResponse.json(
      { success: false, error: "Error during phone verification." },
      { status: 500 }
    );
  }
}