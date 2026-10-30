import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifyOtp as verifyLegacyOtp } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const verifySchema = z
  .object({
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    code: z.string().optional(),
    otp: z.string().optional(),
  })
  .refine((data) => Boolean((data.code && data.code.trim()) || (data.otp && data.otp.trim())), {
    message: "6-digit verification code is required.",
    path: ["code"],
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = verifySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues[0]?.message || "Please enter a valid 6-digit code." },
        { status: 400 }
      );
    }

    const { email: cleanEmail } = parseResult.data;
    const cleanCode = (parseResult.data.code || parseResult.data.otp || "").trim();

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 6-digit verification code." },
        { status: 400 }
      );
    }

    // 1. Fetch user record
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email address." },
        { status: 404 }
      );
    }

    // 2. Query latest unused code from email_otps
    const { data: records, error: fetchErr } = await supabaseAdmin
      .from("email_otps")
      .select("*")
      .eq("email", cleanEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    const record = records?.[0];

    // Fallback if email_otps table doesn't have an active record: check user table legacy fields
    if (!record) {
      if (user.emailVerified) {
        return NextResponse.json({
          success: true,
          message: "Account already verified. You can sign in now.",
          alreadyVerified: true,
        });
      }

      if (user.otpHash && user.otpExpires) {
        if (new Date() > new Date(user.otpExpires)) {
          return NextResponse.json(
            { success: false, error: "Verification code has expired. Please request a new code.", expired: true },
            { status: 410 }
          );
        }
        const isLegacyValid = verifyLegacyOtp(cleanCode, user.otpHash);
        if (!isLegacyValid) {
          return NextResponse.json(
            { success: false, error: "Invalid verification code. Please check and try again." },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "No active verification code found. Please click Resend Code to request a fresh code.",
            expired: true,
          },
          { status: 400 }
        );
      }
    } else {
      // Validate active record
      if (new Date() > new Date(record.expires_at)) {
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new code.", expired: true },
          { status: 410 }
        );
      }

      if (record.attempts >= 5) {
        await supabaseAdmin.from("email_otps").update({ used: true }).eq("id", record.id);
        return NextResponse.json(
          {
            success: false,
            error: "Too many failed attempts. This code has been locked. Please request a new code.",
            expired: true,
          },
          { status: 429 }
        );
      }

      // Hash submitted code with SHA-256 and perform constant-time comparison
      const submittedHash = crypto.createHash("sha256").update(cleanCode).digest("hex");
      const storedHash = record.code_hash;

      let isMatch = false;
      if (typeof storedHash === "string" && submittedHash.length === storedHash.length) {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(submittedHash, "hex"),
          Buffer.from(storedHash, "hex")
        );
      }

      if (!isMatch) {
        const newAttempts = (record.attempts || 0) + 1;
        const isLocked = newAttempts >= 5;

        await supabaseAdmin
          .from("email_otps")
          .update({
            attempts: newAttempts,
            used: isLocked,
          })
          .eq("id", record.id);

        const remaining = Math.max(0, 5 - newAttempts);
        return NextResponse.json(
          {
            success: false,
            error: isLocked
              ? "Too many failed attempts. This code has been locked. Please request a new code."
              : `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
            remainingAttempts: remaining,
            expired: isLocked,
          },
          { status: 400 }
        );
      }

      // Code is valid: Mark used
      await supabaseAdmin.from("email_otps").update({ used: true }).eq("id", record.id);
    }

    // 3. Mark user verified in PostgreSQL User table
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        email_verified: true,
        verificationToken: null,
        tokenExpires: null,
        otpHash: null,
        otpExpires: null,
        otpAttempts: 0,
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

    // 4. Update Supabase Auth admin user if registered with Supabase Auth
    try {
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const match = authUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (match) {
        await supabaseAdmin.auth.admin.updateUserById(match.id, {
          email_confirm: true,
          user_metadata: { email_verified: true },
        });
      }
    } catch (authErr) {
      console.warn("[VERIFY-OTP] Non-fatal: Supabase Auth updateUserById notice:", authErr);
    }

    // 5. Establish authenticated session
    const isAuthorizedAdmin = (updatedUser.role || "").toUpperCase() === "ADMIN";
    const sessionToken = createSessionToken(updatedUser);

    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      redirectUrl: isAuthorizedAdmin ? "/admin" : "/",
      message: isAuthorizedAdmin
        ? "Administrator verified successfully! Directing to Admin Portal..."
        : "Email verified successfully! You are now logged in.",
    });

    response.cookies.set("vn_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error("[VERIFY-OTP ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}

