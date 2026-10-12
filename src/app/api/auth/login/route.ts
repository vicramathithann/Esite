import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrPhone, email, phone, password, requiredRole } = body;
    const targetIdentifier = (emailOrPhone || email || phone || "").trim();

    if (!targetIdentifier || !password) {
      return NextResponse.json(
        { success: false, error: "Please provide email/phone and password." },
        { status: 400 }
      );
    }

    const query = targetIdentifier.trim();
    let cleanEmail = query.toLowerCase();

    // Optional alias mapping for default system admin shortcut
    if (cleanEmail === "admin") {
      cleanEmail = "admin@vmmobiles.in";
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { phone: query },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid login credentials. No account found for this username/email." },
        { status: 401 }
      );
    }

    const passwordMatches = verifyPassword(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: "Invalid password. Please check and try again." },
        { status: 401 }
      );
    }

    // REAL EMAIL VERIFICATION GATE:
    // Reject login if email is not verified
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          requiresVerification: true,
          email: user.email,
          error: "Please verify your email address before logging in.",
        },
        { status: 403 }
      );
    }

    if (requiredRole && user.role !== requiredRole) {
      return NextResponse.json(
        { success: false, error: `Access denied. This action requires ${requiredRole} privileges.` },
        { status: 403 }
      );
    }

    const sessionToken = createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      redirectUrl: user.role === "ADMIN" ? "/admin" : "/user",
      message: user.role === "ADMIN"
        ? "Administrator access granted! Redirecting to Admin Dashboard..."
        : `Welcome back, ${user.name}! Accessing your account...`,
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
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while logging in." },
      { status: 500 }
    );
  }
}
