import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOtpEmail, EmailFailureReason } from "@/lib/mailer";
import { hashPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email format").trim().toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  confirmPassword: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_register",
      maxRequests: 5,
      windowSeconds: 600,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || "Invalid registration data";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const { name, email: cleanEmail, password, confirmPassword, phone } = parseResult.data;

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify your confirm password." },
        { status: 400 }
      );
    }

    // 1. Check whether user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && (existingUser.emailVerified || (existingUser as any).email_verified)) {
      return NextResponse.json(
        { success: false, error: "An active account with this email already exists." },
        { status: 409 }
      );
    }

    const cleanPhone = phone?.trim() || existingUser?.phone || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const hashedPassword = hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 2. Generate secure 6-digit numeric OTP and SHA-256 hash
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    let user;

    if (existingUser && !(existingUser.emailVerified || (existingUser as any).email_verified)) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name.trim(),
          password: hashedPassword,
          phone: cleanPhone,
          emailVerified: false,
          verificationToken,
          tokenExpires,
          otpHash: codeHash,
          otpExpires: expiresAt,
          otpAttempts: 0,
          lastOtpSentAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password: hashedPassword,
          role: "USER",
          emailVerified: false,
          verificationToken,
          tokenExpires,
          otpHash: codeHash,
          otpExpires: expiresAt,
          otpAttempts: 0,
          lastOtpSentAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: cleanEmail,
          phone: true,
          role: true,
          emailVerified: true,
        },
      });
    }

    // 3. Store SHA-256 hash in dedicated email_otps table
    const otpPayload = {
      email: cleanEmail,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      used: false,
    };

    let otpStoreError: { message: string; details?: string; hint?: string; code?: string } | null = null;

    try {
      // Invalidate any old unused codes for this email
      await supabaseAdmin
        .from("email_otps")
        .update({ used: true })
        .eq("email", cleanEmail)
        .eq("used", false);

      const { error: otpDbError } = await supabaseAdmin.from("email_otps").insert(otpPayload);

      if (otpDbError) {
        otpStoreError = {
          message: otpDbError.message,
          details: otpDbError.details,
          hint: otpDbError.hint,
          code: otpDbError.code,
        };
      }
    } catch (err: any) {
      otpStoreError = {
        message: err?.message || String(err),
        code: err?.code,
      };
    }

    // If email_otps insert fails: print exact columns and FULL Supabase error, do NOT send email!
    if (otpStoreError) {
      console.error(
        JSON.stringify({
          event: "EMAIL_OTPS_INSERT_FAILED",
          table: "email_otps",
          columns_inserted: {
            email: cleanEmail,
            code_hash: "[SHA256_HASH_REDACTED]",
            expires_at: otpPayload.expires_at,
            attempts: otpPayload.attempts,
            used: otpPayload.used,
          },
          supabase_error: {
            message: otpStoreError.message,
            details: otpStoreError.details || null,
            hint: otpStoreError.hint || null,
            code: otpStoreError.code || null,
          },
        })
      );

      return NextResponse.json(
        {
          success: true,
          email: cleanEmail,
          user,
          emailSent: false,
          emailDeliveryFailed: true,
          reason: "OTP_STORE_FAILED",
          error: "Your account was created, but we could not store the verification code in the database. Please run the SQL migration or click Resend Code.",
          details: {
            message: otpStoreError.message,
            code: otpStoreError.code,
          },
        },
        { status: 200 }
      );
    }

    // 4. Send email OTP via Nodemailer
    let emailSent = false;
    let failureReason: EmailFailureReason = "SEND_FAILED";

    try {
      await sendOtpEmail(cleanEmail, code, request);
      emailSent = true;
    } catch (mailErr: any) {
      emailSent = false;
      failureReason = mailErr?.reason || "SEND_FAILED";
    }

    // If email dispatch failed, return created account with { emailSent: false, reason }
    if (!emailSent) {
      return NextResponse.json(
        {
          success: true,
          email: cleanEmail,
          user,
          emailSent: false,
          emailDeliveryFailed: true,
          reason: failureReason,
          error: "Your account was created, but we could not deliver the verification code to your email. Click Resend Code below.",
          message: "Your account was created, but we could not deliver the verification code to your email. Click Resend Code below.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      email: cleanEmail,
      user,
      emailSent: true,
      message: `Account created! We've sent a 6-digit verification code to ${cleanEmail}.`,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create account. Please try again.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
