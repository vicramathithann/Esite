import { NextResponse } from "next/server";
import { requireAuth, verifyPassword, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter your current password." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    // Retrieve user's stored password hash from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404 }
      );
    }

    const isMatch = verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect. Please try again." },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been changed successfully!",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}

