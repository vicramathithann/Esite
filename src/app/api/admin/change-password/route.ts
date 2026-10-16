import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, verifyPassword, hashPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_change_password",
      maxRequests: 5,
      windowSeconds: 300,
    });
    if (rateLimitError) return rateLimitError;

    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }
    const adminUser = auth;

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All password fields are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Retrieve fresh user password hash from database
    const dbUser = await prisma.user.findUnique({
      where: { id: adminUser.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "Administrator account not found." },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = verifyPassword(currentPassword, dbUser.password);
    if (!isCurrentValid) {
      logSecurityEvent("ADMIN_PASSWORD_CHANGE_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/admin/change-password",
        method: "POST",
        userId: adminUser.id,
        email: adminUser.email,
        details: { reason: "Current password incorrect" },
      });
      return NextResponse.json(
        { success: false, error: "Current administrator password is incorrect." },
        { status: 401 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "New password cannot be identical to the current password." },
        { status: 400 }
      );
    }

    // Hash with PBKDF2 100,000 iterations sha512
    const hashedNewPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        password: hashedNewPassword,
      },
    });

    logSecurityEvent("ADMIN_PASSWORD_CHANGED", "INFO", {
      ip: getClientIp(request),
      route: "/api/admin/change-password",
      method: "POST",
      userId: adminUser.id,
      email: adminUser.email,
    });

    return NextResponse.json({
      success: true,
      message: "Administrator password changed successfully.",
    });
  } catch (error) {
    console.error("Admin change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update administrator password." },
      { status: 500 }
    );
  }
}

