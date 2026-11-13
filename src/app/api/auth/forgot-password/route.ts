import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, sendAdminPasswordResetEmail } from "@/lib/email";
import {
  generateSecureOtp,
  hashOtp,
  ADMIN_EMAIL,
  ensureAdminUser,
  findUserByUsernameOrEmail,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { getBaseUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const GENERIC_SUCCESS_MESSAGE = "If this account is registered, you will receive instructions shortly.";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: 3 requests per hour (3600s) per IP
    const ipRateLimitError = enforceRateLimit(request, {
      keyPrefix: "forgot_pw_ip",
      maxRequests: 3,
      windowSeconds: 3600,
    });
    if (ipRateLimitError) return ipRateLimitError;

    const body = await request.json().catch(() => ({}));
    const rawIdentifier = body.identifier || body.usernameOrEmail || body.email;

    if (!rawIdentifier || typeof rawIdentifier !== "string" || rawIdentifier.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Username or email address is required." },
        { status: 400 }
      );
    }

    if (rawIdentifier.length > 254) {
      return NextResponse.json(
        { success: false, error: "Input is too long." },
        { status: 400 }
      );
    }

    const cleanIdentifier = rawIdentifier.trim();

    // Database lookup for user account by normalized username or email
    const user = await findUserByUsernameOrEmail(cleanIdentifier);

    // Case 1: Unknown account -> Anti-enumeration silent success (do nothing)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
        cooldown: 60,
      });
    }

    const cleanEmail = user.email.toLowerCase();

    // Rate limit: 3 requests per hour (3600s) per registered email
    const emailRateLimitError = enforceRateLimit(request, {
      keyPrefix: `forgot_pw_email_${cleanEmail}`,
      maxRequests: 3,
      windowSeconds: 3600,
    });
    if (emailRateLimitError) return emailRateLimitError;

    // Enforce 60-second cooldown between resend requests for existing user
    if (user.lastResetOtpSentAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(user.lastResetOtpSentAt).getTime()) / 1000
      );
      if (elapsedSeconds < 60) {
        const remainingSeconds = 60 - elapsedSeconds;
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting another reset code.`,
            cooldown: remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    const isAdmin =
      (user.role || "").toUpperCase() === "ADMIN" &&
      cleanEmail === ADMIN_EMAIL.toLowerCase();

    // Case 2: ADMIN -> Send secure password reset LINK (NO 6-digit code)
    if (isAdmin) {
      await ensureAdminUser();

      // Invalidate any earlier unused reset tokens for this admin
      try {
        await prisma.adminPasswordResetToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: new Date(),
          },
        });
      } catch (err) {
        console.warn("[ADMIN_FORGOT_PW] Notice invalidating prior tokens:", err);
      }

      // Generate secure 32-byte URL-safe token (64 hex characters)
      const rawToken = crypto.randomBytes(32).toString("hex");

      // Compute SHA-256 hash to store in DB (raw token never stored)
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // Expires in 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      try {
        await prisma.adminPasswordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
            ipAddress: clientIp,
          },
        });

        await prisma.adminSecurityAudit.create({
          data: {
            userId: user.id,
            action: "PASSWORD_RESET_REQUESTED",
            ipAddress: clientIp,
            userAgent: request.headers.get("user-agent") || null,
          },
        });
      } catch (dbErr) {
        console.error("[ADMIN_FORGOT_PW_DB_ERROR]", dbErr);
      }

      // Update cooldown timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastResetOtpSentAt: new Date(),
        },
      });

      // Construct reset link
      const baseUrl = getBaseUrl(request);
      const resetLink = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(rawToken)}`;

      // Await send email and log full provider errors
      try {
        const emailResult = await sendAdminPasswordResetEmail(
          { id: user.id, email: user.email, name: user.name },
          resetLink,
          15
        );
        if (!emailResult.success) {
          console.error("[ADMIN_RESET_EMAIL_ERROR] Email gateway failure:", emailResult.error);
        }
      } catch (emailErr) {
        console.error("[ADMIN_RESET_EMAIL_EXCEPTION] Could not dispatch reset email:", emailErr);
      }

      logSecurityEvent("ADMIN_PASSWORD_RESET_REQUESTED", "INFO", {
        userId: user.id,
        email: cleanEmail,
        ip: clientIp,
        route: "/api/auth/forgot-password",
      });

      // Same generic response as customer and unknown email
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
        cooldown: 60,
      });
    }

    // Case 3: CUSTOMER -> Send existing 6-digit recovery code
    const otp = generateSecureOtp();
    const resetOtpHash = hashOtp(otp);
    const resetToken = crypto.randomBytes(32).toString("hex");
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtpHash,
        resetOtpExpires: otpExpiresAt,
        resetOtpAttempts: 0,
        lastResetOtpSentAt: new Date(),
        resetToken,
        resetTokenExpires: tokenExpiresAt,
      },
    });

    try {
      const emailResult = await sendPasswordResetEmail(
        { id: user.id, name: user.name, email: user.email },
        otp,
        resetToken
      );
      if (!emailResult?.success) {
        console.error(`[CUSTOMER_RESET_EMAIL_ERROR] Could not send OTP to ${user.email}:`, emailResult?.error);
      }
    } catch (emailErr) {
      console.error("[CUSTOMER_RESET_EMAIL_EXCEPTION] Could not dispatch reset email:", emailErr);
    }

    logSecurityEvent("AUTH_PASSWORD_RESET_REQUESTED", "INFO", {
      ip: clientIp,
      route: "/api/auth/forgot-password",
      method: "POST",
      userId: user.id,
      email: cleanEmail,
    });

    // Same generic response
    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
      cooldown: 60,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing password recovery." },
      { status: 500 }
    );
  }
}
