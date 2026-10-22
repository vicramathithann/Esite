import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, ADMIN_EMAIL } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanToken = (body.token || "").trim();

    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: "Recovery authorization token is required." },
        { status: 400 }
      );
    }

    // Look up user by single-use recovery reset token
    const user = await prisma.user.findFirst({
      where: { resetToken: cleanToken },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or already used recovery session. Please request a new recovery code." },
        { status: 400 }
      );
    }

    // Check expiration (15 minutes window for the choice dialog)
    if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: "Recovery session has expired. Please request a new code.",
          expired: true,
        },
        { status: 410 }
      );
    }

    // Customer authentication separation
    if (user.role === "ADMIN" || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Administrator accounts must sign in using the Admin Portal." },
        { status: 403 }
      );
    }

    // SINGLE-USE CONSUMPTION:
    // Invalidate resetToken immediately to prevent replay attacks / multiple session creation
    // Existing password is strictly UNCHANGED!
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: null,
        resetTokenExpires: null,
        resetOtpHash: null,
        resetOtpExpires: null,
        resetOtpAttempts: 0,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Create session token through existing authentication system
    const sessionToken = createSessionToken(updatedUser);
    const response = NextResponse.json({
      success: true,
      user: updatedUser,
      redirectUrl: "/",
      message: `Welcome back, ${updatedUser.name}! Logging you in with your existing password...`,
    });

    response.cookies.set("vn_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Forgot password continue error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while continuing with existing password." },
      { status: 500 }
    );
  }
}

