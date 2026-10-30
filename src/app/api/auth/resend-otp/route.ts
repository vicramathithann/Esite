import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const resendSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = resendSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || "Valid email is required." },
        { status: 400 }
      );
    }

    const { email: cleanEmail } = parseResult.data;

    // 1. Check if user exists and is not already verified
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, emailVerified: true, lastOtpSentAt: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "Your email address is already verified. You can log in directly.",
        alreadyVerified: true,
      });
    }

    // 2. Check 60-second cooldown per email
    const { data: latestCodes } = await supabaseAdmin
      .from("email_otps")
      .select("created_at")
      .eq("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    const latestRecordDate = latestCodes?.[0]?.created_at
      ? new Date(latestCodes[0].created_at)
      : user.lastOtpSentAt
      ? new Date(user.lastOtpSentAt)
      : null;

    if (latestRecordDate) {
      const elapsedSeconds = Math.floor((Date.now() - latestRecordDate.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remaining} second${remaining === 1 ? "" : "s"} before requesting a new code.`,
            cooldown: remaining,
          },
          { status: 429 }
        );
      }
    }

    // 3. Check rate limit: Max 5 sends per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourlyCount } = await supabaseAdmin
      .from("email_otps")
      .select("*", { count: "exact", head: true })
      .eq("email", cleanEmail)
      .gte("created_at", oneHourAgo);

    if (typeof hourlyCount === "number" && hourlyCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit reached: Maximum 5 verification codes per hour. Please wait a while before trying again.",
          cooldown: 60,
        },
        { status: 429 }
      );
    }

    // 4. Invalidate all previous unused codes for this email
    await supabaseAdmin
      .from("email_otps")
      .update({ used: true })
      .eq("email", cleanEmail)
      .eq("used", false);

    // 5. Generate new cryptographically secure 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 6. Store hash in email_otps
    const { error: insertErr } = await supabaseAdmin.from("email_otps").insert({
      email: cleanEmail,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      used: false,
    });

    if (insertErr) {
      console.warn("[RESEND-OTP] Warning: Failed to insert into email_otps table:", insertErr.message);
    }

    // Update User table timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash: codeHash,
        otpExpires: expiresAt,
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
      },
    });

    // 7. Send the email
    try {
      await sendOtpEmail(cleanEmail, code);
    } catch (mailErr: any) {
      const reason = mailErr?.reason || "SEND_FAILED";
      console.error(`[RESEND-OTP FAILED] Reason: ${reason}`, mailErr);
      return NextResponse.json(
        {
          success: false,
          emailSent: false,
          reason,
          error: "Failed to dispatch verification code via email. Please check your connection and try again.",
          cooldown: 60,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      cooldown: 60,
      message: `A new 6-digit verification code has been dispatched to ${cleanEmail}.`,
    });
  } catch (error: any) {
    console.error("[RESEND-OTP EXCEPTION]", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend verification code. Please try again." },
      { status: 500 }
    );
  }
}

