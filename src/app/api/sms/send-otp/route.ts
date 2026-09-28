import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
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

    const messageBody = `[VM Mobiles Security] Your mobile verification OTP is ${code}. Valid for 10 minutes. Use this code to authenticate your phone for device warranty registration & expiry alerts on VM Mobiles.in.`;

    const smsAlert = await prisma.smsAlert.create({
      data: {
        customerPhone: cleanPhone,
        alertType: "OTP_VERIFICATION",
        title: "🔐 Phone Verification OTP",
        messageBody,
        isRead: false,
      },
    });

    // Optional: Dispatch real SMS via MSG91 if configured in environment
    const authKey = process.env.MSG91_AUTHKEY?.trim();
    if (authKey && authKey !== "your_msg91_authkey_here") {
      try {
        const { sendMsg91Sms } = await import("@/lib/msg91");
        await sendMsg91Sms({
          mobile: cleanPhone,
          variables: {
            otp: code,
          },
        });
      } catch (msg91Err) {
        console.warn("[MSG91 OTP Dispatch Warn]", msg91Err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent via SMS to ${cleanPhone}`,
      otp: code,
      smsAlert,
    });
  } catch (error) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch verification SMS." },
      { status: 500 }
    );
  }
}