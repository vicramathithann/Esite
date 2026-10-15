import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, ensureAdminUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

const GENERIC_LOGIN_ERROR = "Invalid email/phone or password. Please check and try again.";
const DUMMY_PBKDF2_HASH = "100000:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

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

    if (cleanEmail === "admin@vmmobiles.in") {
      await ensureAdminUser();
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
      // Timing attack mitigation: run constant-time hash calculation
      verifyPassword(password, DUMMY_PBKDF2_HASH);
      logSecurityEvent("AUTH_LOGIN_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
        email: cleanEmail,
        details: { reason: "User not found" },
      });
      return NextResponse.json(
        { success: false, error: GENERIC_LOGIN_ERROR },
        { status: 401 }
      );
    }

    const passwordMatches = verifyPassword(password, user.password);
    if (!passwordMatches) {
      logSecurityEvent("AUTH_LOGIN_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
        userId: user.id,
        email: user.email,
        details: { reason: "Password mismatch" },
      });
      return NextResponse.json(
        { success: false, error: GENERIC_LOGIN_ERROR },
        { status: 401 }
      );
    }

    // REAL EMAIL VERIFICATION GATE:
    // Reject login if email is not verified
    if (!user.emailVerified) {
      logSecurityEvent("AUTH_LOGIN_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
        userId: user.id,
        email: user.email,
        details: { reason: "Email unverified" },
      });
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
      logSecurityEvent("ACCESS_DENIED_FORBIDDEN", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
        userId: user.id,
        email: user.email,
        details: { requiredRole, actualRole: user.role },
      });
      return NextResponse.json(
        { success: false, error: `Access denied. This action requires ${requiredRole} privileges.` },
        { status: 403 }
      );
    }

    logSecurityEvent("AUTH_LOGIN_SUCCESS", "INFO", {
      ip: getClientIp(request),
      route: "/api/auth/login",
      method: "POST",
      userId: user.id,
      email: user.email,
      role: user.role,
    });

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
