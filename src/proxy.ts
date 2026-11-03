import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  inspectSessionToken,
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
} from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // =========================================================================
  // 1. All /admin Page Routes
  // =========================================================================
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Dedicated password recovery token route: allowed ONLY if token parameter is present
    if (pathname === "/admin/reset-password") {
      const token = searchParams.get("token");
      if (!token || !token.trim()) {
        const notFoundUrl = new URL("/_not-found", request.url);
        const res = NextResponse.rewrite(notFoundUrl, { status: 404 });
        res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        return res;
      }
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return res;
    }

    // Check admin session cookie
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const tokenCheck = inspectSessionToken(adminToken);

    // If no valid admin token, or token belongs to customer scope:
    // Rewrite directly to standard 404. Never redirect to /login and never reveal admin exists.
    if (!tokenCheck.valid || tokenCheck.scope === "customer") {
      const notFoundUrl = new URL("/_not-found", request.url);
      const res = NextResponse.rewrite(notFoundUrl, { status: 404 });
      res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return res;
    }

    // Pass through to Server Component layout for authoritative DB verification
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return res;
  }

  // =========================================================================
  // 2. All /api/admin API Routes
  // =========================================================================
  if (pathname.startsWith("/api/admin")) {
    // Exempt public admin authentication endpoints
    if (
      pathname === "/api/admin/auth/login-otp/send" ||
      pathname === "/api/admin/auth/login-otp/verify" ||
      pathname === "/api/admin/auth/forgot-password/verify"
    ) {
      return NextResponse.next();
    }

    // Extract admin cookie or Bearer token
    let adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!adminToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        adminToken = authHeader.slice(7).trim();
      }
    }

    // If no admin token provided, check if a customer session is calling
    if (!adminToken) {
      const customerToken = request.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
      if (customerToken) {
        const custCheck = inspectSessionToken(customerToken);
        if (custCheck.valid) {
          // Logged in as customer calling admin API -> 403 Forbidden
          return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
          );
        }
      }
      // Completely logged out -> 401 Unauthorized
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const tokenCheck = inspectSessionToken(adminToken);

    // Invalid format / expired / bad signature -> 401
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Customer token provided in admin cookie -> 403
    if (tokenCheck.scope === "customer") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Cryptographically valid: forward to route handler for authoritative database check
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

