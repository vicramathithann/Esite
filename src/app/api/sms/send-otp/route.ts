import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "sms_send_otp",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { phone } = body;

    if (!phone || phone.trim().length < 8) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid mobile number." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpVerification.create({
      data: {
        phone: cleanPhone,
        code,
        verified: false,
        expiresAt,
      },
    });

    const messageBody = `[VN Mobiles Security] Your mobile verification OTP is ${code}. Valid for 10 minutes. Use this code to authenticate your phone for device warranty registration & expiry alerts on VN Mobiles.in.`;

    await prisma.smsAlert.create({
      data: {
        customerPhone: cleanPhone,
        alertType: "OTP_VERIFICATION",
        title: "🔐 Phone Verification OTP",
        messageBody,
        isRead: false,
      },
    });

    logSecurityEvent("AUTH_OTP_REQUESTED", "INFO", {
      ip: getClientIp(request),
      route: "/api/sms/send-otp",
      method: "POST",
      details: { phone: cleanPhone.slice(-4) },
    });

    // CRITICAL FIX: Never return the OTP or messageBody containing the OTP in the JSON response
    return NextResponse.json({
      success: true,
      message: `OTP sent via SMS to ${cleanPhone}`,
    });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch verification SMS." },
      { status: 500 }
    );
  }
}