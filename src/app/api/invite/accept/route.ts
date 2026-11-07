import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

/**
 * POST /api/invite/accept
 * Finalizes account creation for an invited user.
 * Assigns role strictly from the invitation record.
 * Sets emailVerified = true and signupSource = "admin".
 * Enforces single-use token security (burns token ONLY after successful creation).
 */
export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "invite_accept",
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => ({}));
    const { token, name, password, confirmPassword } = body;

    // 1. Validate required inputs
    const cleanToken = (token || "").trim();
    if (!cleanToken) {
      return NextResponse.json(
        { success: false, error: "Invitation token is required." },
        { status: 400 }
      );
    }

    const cleanName = (name || "").trim();
    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a password." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match. Please verify your confirm password." },
        { status: 400 }
      );
    }

    // 2. Validate token and invitation status in DB (supports SHA-256 hashed and legacy plain tokens)
    const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          { token: tokenHash },
          { token: cleanToken },
        ],
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation link. Please ask for a new invite." },
        { status: 404 }
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This invitation has been revoked. Please ask for a new invite." },
        { status: 410 }
      );
    }

    if (invitation.status === "ACCEPTED" || invitation.acceptedAt || invitation.token?.includes(":used:")) {
      return NextResponse.json(
        { success: false, error: "This invitation link has already been used. Please sign in or ask for a new invite." },
        { status: 410 }
      );
    }

    if (new Date() > new Date(invitation.expiresAt) || invitation.status === "EXPIRED") {
      if (invitation.status !== "EXPIRED") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
      return NextResponse.json(
        { success: false, error: "This invitation link has expired. Please ask for a new invite." },
        { status: 410 }
      );
    }

    // 3. Email strictly comes from the invitation record, never from the form
    const cleanEmail = invitation.email.toLowerCase().trim();
    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation: no email address is assigned to this invite." },
        { status: 400 }
      );
    }

    // 4. Username uniqueness check across all users
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
    });

    const isNameTaken = allUsers.some(
      (u: { id: string; name: string | null; email: string }) =>
        u.name &&
        u.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        u.email.toLowerCase() !== cleanEmail
    );

    if (isNameTaken) {
      return NextResponse.json(
        { success: false, error: "Username already taken" },
        { status: 400 }
      );
    }

    // 5. Check if verified account already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { success: false, error: "Account already exists, please sign in" },
        { status: 409 }
      );
    }

    // 6. Role assigned strictly from the invitation record (e.g. USER, ADMIN)
    const userRole = (invitation.role || "USER").toUpperCase();

    // 7. Generate safe unique placeholder phone number if creating fresh user
    let uniquePhone = existingUser?.phone || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    while (
      !existingUser &&
      (await prisma.user.findUnique({ where: { phone: uniquePhone } }))
    ) {
      uniquePhone = `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    }

    // 8. Hash password using PBKDF2/SHA-512 (100,000 iterations)
    const hashedPassword = hashPassword(password);

    // 9. Create or update user record
    // Admin-invited users must be created with emailVerified = true, signupSource = "admin", and role from invite
    let newUser;
    if (existingUser && !existingUser.emailVerified) {
      // Clean up / activate half-created unverified user record from earlier failed attempt
      newUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: cleanName,
          password: hashedPassword,
          role: userRole,
          emailVerified: true,
          signupSource: "admin",
          verificationToken: null,
          tokenExpires: null,
          otpHash: null,
          otpExpires: null,
          otpAttempts: 0,
        },
      });
    } else {
      // Create fresh user record with role from invite
      newUser = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          phone: uniquePhone,
          password: hashedPassword,
          role: userRole,
          emailVerified: true,
          signupSource: "admin",
        },
      });
    }

    // 10. Mark invitation as ACCEPTED and invalidate token ONLY after user creation succeeds
    // In the event of a user creation failure above, execution jumps to catch, so failed attempts DO NOT burn the token!
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        token: `${tokenHash}:used:${Date.now()}`,
      },
    });

    // 11. Create session cookie and log the user in immediately
    const sessionToken = createSessionToken(newUser, userRole === "ADMIN" ? "admin" : "customer");

    logSecurityEvent("INVITATION_ACCEPTED", "INFO", {
      ip: getClientIp(request),
      route: "/api/invite/accept",
      userId: newUser.id,
      email: cleanEmail,
      details: {
        username: cleanName,
        role: userRole,
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
        role: userRole,
        emailVerified: true,
        signupSource: "admin",
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
  } catch (error: any) {
    // Log the full detailed error server-side (never exposed to the client)
    console.error("[INVITE_ACCEPT_ERROR] Unexpected error during invite acceptance:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
    });

    // Detect unique conflict errors from database
    const errText = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
    if (errText.includes("user_email_key") || errText.includes("email")) {
      return NextResponse.json(
        { success: false, error: "Account already exists, please sign in" },
        { status: 409 }
      );
    }
    if (errText.includes("user_name_key") || errText.includes("name") || errText.includes("username")) {
      return NextResponse.json(
        { success: false, error: "Username already taken" },
        { status: 400 }
      );
    }

    // Clean, user-safe error message
    return NextResponse.json(
      { success: false, error: "Unable to create your account at this moment. Please try again or contact support." },
      { status: 500 }
    );
  }
}
