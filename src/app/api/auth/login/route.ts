import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSessionToken,
  findUserByUsernameOrEmail,
  ADMIN_EMAIL,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

const GENERIC_LOGIN_ERROR = "Invalid username/email or password.";
const DUMMY_PBKDF2_HASH = "100000:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "auth_login",
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: GENERIC_LOGIN_ERROR },
        { status: 400 }
      );
    }

    const { identifier, usernameOrEmail, emailOrPhone, email, phone, password, requiredRole } = body;
    const rawTarget = identifier ?? usernameOrEmail ?? emailOrPhone ?? email ?? phone;

    // Strict validation: target must be string between 1 and 100 chars, no objects/operators
    if (typeof rawTarget !== "string" || !rawTarget.trim() || rawTarget.length > 100) {
      return NextResponse.json(
        { success: false, error: "Please enter your username or email and password." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || !password || password.length > 128) {
      return NextResponse.json(
        { success: false, error: "Please enter your username or email and password." },
        { status: 400 }
      );
    }

    const targetIdentifier = rawTarget.trim();

    // Enforce rate limiting per account identifier
    const accountRateLimitError = enforceRateLimit(request, {
      keyPrefix: `auth_login_acc_${targetIdentifier.toLowerCase()}`,
      maxRequests: 5,
      windowSeconds: 60,
    });
    if (accountRateLimitError) return accountRateLimitError;

    // Find user by username or email
    const user = await findUserByUsernameOrEmail(targetIdentifier);

    if (!user) {
      // Timing attack mitigation: run constant-time hash calculation
      verifyPassword(password, DUMMY_PBKDF2_HASH);
      logSecurityEvent("AUTH_LOGIN_FAILED", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
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

    // Strict RBAC: Only rrroyce20@gmail.com can obtain ADMIN privileges
    const isActuallyAdmin =
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      (user.role || "").toUpperCase() === "ADMIN";
    const effectiveRole = isActuallyAdmin ? "ADMIN" : "USER";

    const userSignupSource = (user as any).signupSource;
    const isAdminCreatedUser = userSignupSource === "admin" || isActuallyAdmin;

    // LOGIN VERIFICATION CHECK:
    // 1. If emailVerified = true -> proceed straight in
    // 2. If user is admin-created (signupSource === 'admin') -> NEVER ask for OTP, proceed straight in
    // 3. If emailVerified = false and signupSource = 'self' -> send to OTP verification
    if (!user.emailVerified) {
      if (isAdminCreatedUser) {
        // Admin-created users skip OTP completely; ensure database record is verified
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        }).catch(() => {});
        user.emailVerified = true;
      } else {
        logSecurityEvent("AUTH_LOGIN_FAILED", "WARN", {
          ip: getClientIp(request),
          route: "/api/auth/login",
          method: "POST",
          userId: user.id,
          email: user.email,
          details: { reason: "Email unverified (self-registered user)" },
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
    }

    if (requiredRole && effectiveRole !== requiredRole) {
      logSecurityEvent("ACCESS_DENIED_FORBIDDEN", "WARN", {
        ip: getClientIp(request),
        route: "/api/auth/login",
        method: "POST",
        userId: user.id,
        email: user.email,
        details: { requiredRole, actualRole: effectiveRole },
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
      role: effectiveRole,
    });

    const sessionToken = createSessionToken(user, isActuallyAdmin ? "admin" : "customer");
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: effectiveRole,
        emailVerified: user.emailVerified,
        signupSource: isAdminCreatedUser ? "admin" : "self",
        createdAt: user.createdAt,
        mustChangePassword: Boolean((user as any).mustChangePassword),
      },
      mustChangePassword: Boolean((user as any).mustChangePassword),
      redirectUrl: isActuallyAdmin ? "/admin" : "/user",
      message: isActuallyAdmin
        ? "Administrator access granted! Redirecting to Admin Dashboard..."
        : `Welcome back, ${user.name}! Accessing your account...`,
    });

    const cookieOpts = getSessionCookieOptions(request);

    if (isActuallyAdmin) {
      // Strict Admin Session: ONLY sets dedicated vn_admin_session cookie
      // Never touches or overwrites vn_session, keeping customer and admin sessions isolated
      response.cookies.set(ADMIN_COOKIE_NAME, sessionToken, cookieOpts);
    } else {
      // Strict Customer Session: ONLY sets vn_session (and legacy), never touches vn_admin_session
      response.cookies.set(CUSTOMER_COOKIE_NAME, sessionToken, cookieOpts);
      response.cookies.set(LEGACY_COOKIE_NAME, sessionToken, cookieOpts);
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while logging in." },
      { status: 500 }
    );
  }
}
