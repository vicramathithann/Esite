import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    const body = await request.json();
    const { userId, name, phone } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Name is required." }, { status: 400 });
    }

    // IDOR Protection: Regular users can only update their own profile
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";
    if (userId && userId !== authUser.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot modify another user's profile." },
        { status: 403 }
      );
    }

    const targetUserId = isAdmin && userId ? userId : authUser.id;

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: name.trim(),
        ...(phone ? { phone: phone.trim() } : {}),
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

    return NextResponse.json({ success: true, user: updated, message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}

