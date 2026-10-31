import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, hashPassword, ADMIN_EMAIL } from "@/lib/auth";
import { sendAdminPasswordResetLinkEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

/**
 * Helper to record audit logs in UserAuditLog, AdminSecurityAudit, and structured server logs
 */
async function recordAuditLog({
  adminEmail,
  targetUserId,
  targetUserEmail,
  action,
  details,
  request,
}: {
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  action: string;
  details?: Record<string, unknown>;
  request: Request;
}) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  // 1. Structured Security Logger
  logSecurityEvent("ADMIN_ACTION", "INFO", {
    userId: targetUserId,
    email: targetUserEmail,
    role: "ADMIN",
    route: `/api/admin/users/${targetUserId}/password`,
    method: "POST",
    ip: ipAddress,
    userAgent,
    details: {
      action,
      adminEmail,
      ...details,
    },
  });

  // 2. Best-effort database audit table insertions
  try {
    await supabaseAdmin.from("UserAuditLog").insert({
      adminEmail,
      targetUserId,
      targetUserEmail,
      action,
      details: details || {},
      ipAddress,
      userAgent,
    });
  } catch {
    // Graceful fallback if migration not yet applied in remote Supabase
  }

  try {
    await supabaseAdmin.from("AdminSecurityAudit").insert({
      userId: targetUserId,
      action: `${action} (by ${adminEmail})`,
      ipAddress,
      userAgent,
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Generates a cryptographically strong 12-character random temporary password
 */
function generateStrongTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + numbers + symbols;

  let pwd = "";
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += numbers[crypto.randomInt(0, numbers.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 4; i < 12; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // Shuffle the password
  return pwd
    .split("")
    .sort(() => crypto.randomInt(-1, 2))
    .join("");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastResetEmailSentAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    // Protection: Primary Administrator credentials cannot be altered via customer controls
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || (user.role || "").toUpperCase() === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator credentials cannot be modified via customer management. Use Admin Portal settings.",
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // ACTION 1: Set Temporary Password
    // =========================================================================
    if (action === "SET_TEMP_PASSWORD") {
      const finalPassword =
        typeof newPassword === "string" && newPassword.trim().length >= 6
          ? newPassword.trim()
          : generateStrongTemporaryPassword();

      // Hash password using PBKDF2/SHA-512 (100,000 iterations). Plaintext is NEVER stored in database.
      const hashedPassword = hashPassword(finalPassword);

      // Invalidate existing sessions and set mustChangePassword flag
      const updateData: Record<string, any> = {
        password: hashedPassword,
        emailVerified: true,
        resetToken: null,
        resetTokenExpires: null,
        resetOtpHash: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        tokenExpires: new Date(), // Revoke any active session tokens
      };

      try {
        // Attempt update with mustChangePassword
        await supabaseAdmin.from("User").update({
          ...updateData,
          mustChangePassword: true,
        }).eq("id", user.id);
      } catch {
        // Fallback if mustChangePassword column is pending migration
        await supabaseAdmin.from("User").update(updateData).eq("id", user.id);
      }

      await recordAuditLog({
        adminEmail: auth.email,
        targetUserId: user.id,
        targetUserEmail: user.email,
        action: "ADMIN_SET_TEMPORARY_PASSWORD",
        details: { targetUserName: user.name },
        request,
      });

      return NextResponse.json({
        success: true,
        temporaryPassword: finalPassword,
        message: `Temporary password successfully set for ${user.name} (${user.email}).`,
      });
    }

    // =========================================================================
    // ACTION 2: Send Password Reset Link Email (Cryptographically Secure 32-Byte Token)
    // =========================================================================
    if (action === "SEND_RESET_LINK" || action === "FORCE_RESET_EMAIL") {
      // Rate-limiting check: At most 1 reset email per user every 2 minutes
      if (user.lastResetEmailSentAt) {
        const lastSent = new Date(user.lastResetEmailSentAt).getTime();
        const diffMs = Date.now() - lastSent;
        const cooldownMs = 2 * 60 * 1000; // 2 minutes

        if (diffMs < cooldownMs) {
          const waitSecs = Math.ceil((cooldownMs - diffMs) / 1000);
          return NextResponse.json(
            {
              success: false,
              error: `A reset link was sent recently. Please wait ${waitSecs} second${waitSecs === 1 ? "" : "s"} before requesting another.`,
            },
            { status: 429 }
          );
        }
      }

      // Generate 32-byte cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      // Compute SHA-256 hash for secure storage
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      // 30-minute expiration
      const tokenExpires = new Date(Date.now() + 30 * 60 * 1000);
      const now = new Date();

      // Store in User table
      try {
        await supabaseAdmin.from("User").update({
          resetToken: tokenHash,
          resetTokenExpires: tokenExpires,
          lastResetEmailSentAt: now,
          resetOtpHash: null,
          resetOtpExpires: null,
          resetOtpAttempts: 0,
        }).eq("id", user.id);
      } catch (err: any) {
        console.error("Failed to update reset token on User:", err);
      }

      // Also record in UserPasswordResetToken if table exists
      try {
        await supabaseAdmin.from("UserPasswordResetToken").insert({
          userId: user.id,
          tokenHash,
          expiresAt: tokenExpires,
          ipAddress: getClientIp(request),
        });
      } catch {
        // Non-blocking if table is pending migration
      }

      const originUrl = getAppUrl(request);

      // Dispatch password reset email via shared email helper
      const emailResult = await sendAdminPasswordResetLinkEmail(
        { id: user.id, name: user.name, email: user.email },
        rawToken,
        30, // 30 minutes expiry
        originUrl
      );

      if (!emailResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: emailResult.error || "Failed to dispatch password reset email via SMTP.",
          },
          { status: 500 }
        );
      }

      await recordAuditLog({
        adminEmail: auth.email,
        targetUserId: user.id,
        targetUserEmail: user.email,
        action: "ADMIN_SENT_PASSWORD_RESET_LINK",
        details: { targetUserName: user.name, expiresInMinutes: 30 },
        request,
      });

      return NextResponse.json({
        success: true,
        message: `Password reset link sent to ${user.email} (valid for 30 minutes).`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported actions: SET_TEMP_PASSWORD, SEND_RESET_LINK." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin user password management error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update password settings." },
      { status: 500 }
    );
  }
}
