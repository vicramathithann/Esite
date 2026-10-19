import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/invite/accept
 * Finalizes account creation for an invited user.
 * Strictly assigns role = "USER".
 * Enforces Instagram-style username uniqueness across all users in the database.
 */
export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "invite_accept",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { token, name, password, confirmPassword } = body;

    // 1. Validate required inputs
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, error: "Invitation token is required." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide your name." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a password." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify your confirm password." },
        { status: 400 }
      );
    }

    // 2. Validate token and invitation status in DB
    const invitation = await prisma.invitation.findUnique({
      where: { token: token.trim() },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation link. Please ask the administrator for a new invite." },
        { status: 404 }
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This invitation has been revoked by the administrator." },
        { status: 410 }
      );
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { success: false, error: "This invitation has already been accepted and used to create an account." },
        { status: 410 }
      );
    }

    if (new Date() > invitation.expiresAt || invitation.status === "EXPIRED") {
      if (invitation.status !== "EXPIRED") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
      return NextResponse.json(
        { success: false, error: "This invitation link has expired. Invitations are valid for 48 hours." },
        { status: 410 }
      );
    }

    // 3. Username uniqueness rule (Instagram-style unique username)
    // "The Name should work like Instagram username. It must be unique across the database.
    // If the name already exists, show this error: 'This name is already taken'"
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 2 characters long." },
        { status: 400 }
      );
    }

    // Check case-insensitively across existing users
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true },
    });

    const isNameTaken = allUsers.some(
      (u) => u.name && u.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (isNameTaken) {
      return NextResponse.json(
        { success: false, error: "This name is already taken" },
        { status: 400 }
      );
    }

    // 4. Verify recipient email
    const cleanEmail = invitation.email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { success: false, error: "An active account with this email already exists on VN Mobiles." },
        { status: 409 }
      );
    }

    // 5. Generate secure unique placeholder phone number if creating fresh user
    let uniquePhone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    while (await prisma.user.findUnique({ where: { phone: uniquePhone } })) {
      uniquePhone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    }

    // 6. Hash password
    const hashedPassword = hashPassword(password);

    let newUser;
    if (existingUser && !existingUser.emailVerified) {
      // Re-activate unverified user with strictly USER role
      newUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: cleanName,
          password: hashedPassword,
          role: "USER", // STRICTLY USER!
          emailVerified: true,
          verificationToken: null,
          tokenExpires: null,
          otpHash: null,
          otpExpires: null,
        },
      });
    } else {
      // Create fresh user with strictly USER role
      newUser = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          phone: uniquePhone,
          password: hashedPassword,
          role: "USER", // STRICTLY USER!
          emailVerified: true,
        },
      });
    }

    // 7. Mark invitation as ACCEPTED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    // 8. Create session cookie and log in the user immediately
    const sessionToken = createSessionToken(newUser);

    logSecurityEvent("INVITATION_ACCEPTED", "INFO", {
      ip: getClientIp(request),
      route: "/api/invite/accept",
      userId: newUser.id,
      email: cleanEmail,
      details: {
        username: cleanName,
        invitationId: invitation.id,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: `Welcome, ${cleanName}! Your account has been created successfully.`,
      redirectUrl: "/",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: "USER",
      },
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
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while creating your account. Please try again." },
      { status: 500 }
    );
  }
}

