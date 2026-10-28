import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireMainAdmin, hashPassword, ADMIN_EMAIL } from "@/lib/auth";
import { sendAdminPasswordResetLinkEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMainAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const { action, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    // Strict Separation: Administrator credentials cannot be altered via customer management
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || user.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Administrator credentials cannot be modified via customer account controls." },
        { status: 403 }
      );
    }

    // 1. Admin sets a temporary password
    if (action === "SET_TEMP_PASSWORD") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: "Temporary password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // Hash password using PBKDF2/SHA-512 (100,000 iterations). Plaintext is never stored.
      const hashedPassword = hashPassword(newPassword.trim());

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: true,
          resetToken: null,
          resetTokenExpires: null,
          resetOtpHash: null,
          resetOtpExpires: null,
          resetOtpAttempts: 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Temporary password updated successfully for ${user.name} (${user.email}).`,
      });
    }

    // 2. Admin forces a password reset email with pure secure direct link (no OTP)
    if (action === "FORCE_RESET_EMAIL") {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // Valid for 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpires: tokenExpires,
          resetOtpHash: null,
          resetOtpExpires: null,
          resetOtpAttempts: 0,
        },
      });

      const originUrl = getAppUrl(request);

      const emailResult = await sendAdminPasswordResetLinkEmail(
        { id: user.id, name: user.name, email: user.email },
        resetToken,
        60,
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

      return NextResponse.json({
        success: true,
        message: `Secure password reset link sent to ${user.email} (valid for 1 hour).`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported actions: SET_TEMP_PASSWORD, FORCE_RESET_EMAIL." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin user password management error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update password settings." },
      { status: 500 }
    );
  }
}
