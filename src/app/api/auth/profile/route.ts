import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, ADMIN_EMAIL } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) {
      return auth;
    }
    const authUser = auth;

    const body = await request.json();
    const { userId, name, email, phone, address } = body;

    // Validate Name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid name (at least 2 characters)." },
        { status: 400 }
      );
    }

    // Validate Email
    const cleanEmail = (email || "").trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Validate Phone (digits only, at least 10 digits)
    const rawPhone = (phone || "").toString().trim();
    const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid phone number with at least 10 digits." },
        { status: 400 }
      );
    }

    const cleanAddress = typeof address === "string" ? address.trim() : "";

    // IDOR Protection: Regular users can only update their own profile
    const isAdmin = (authUser.role || "").toUpperCase() === "ADMIN";
    if (userId && userId !== authUser.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot modify another user's profile." },
        { status: 403 }
      );
    }

    const targetUserId = isAdmin && userId ? userId : authUser.id;

    // Protect primary administrator email from being changed accidentally
    if (
      (authUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      targetUserId === authUser.id &&
      cleanEmail !== ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        { success: false, error: "The primary administrator email cannot be altered." },
        { status: 400 }
      );
    }

    // Check email uniqueness if email has changed
    const currentTargetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { email: true, phone: true },
    });

    if (!currentTargetUser) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    if (cleanEmail !== (currentTargetUser.email || "").toLowerCase()) {
      const existingUserWithEmail = await prisma.user.findFirst({
        where: {
          email: cleanEmail,
          id: { not: targetUserId },
        },
      });
      if (existingUserWithEmail) {
        return NextResponse.json(
          { success: false, error: "This email address is already registered to another account." },
          { status: 409 }
        );
      }
    }

    // Check phone uniqueness if phone has changed
    const currentPhoneDigits = (currentTargetUser.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone !== currentPhoneDigits) {
      const existingUserWithPhone = await prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          id: { not: targetUserId },
        },
      });
      if (existingUserWithPhone) {
        return NextResponse.json(
          { success: false, error: "This phone number is already registered to another account." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        address: cleanAddress,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        emailVerified: true,
      },
    });

    const isAuthorizedAdmin =
      updated.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      (updated.role || "").toUpperCase() === "ADMIN";

    const sanitizedUser = {
      ...updated,
      role: isAuthorizedAdmin ? ("ADMIN" as const) : ("USER" as const),
    };

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      message: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ success: false, error: "Failed to update profile." }, { status: 500 });
  }
}

