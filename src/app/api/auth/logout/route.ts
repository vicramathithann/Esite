import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  CUSTOMER_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope"); // "admin" | "customer" | "all"

  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  const clearOpts = {
    ...getSessionCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  };

  if (scope === "admin") {
    // Only clear admin session
    response.cookies.set(ADMIN_COOKIE_NAME, "", clearOpts);
  } else if (scope === "all") {
    // Clear both
    response.cookies.set(ADMIN_COOKIE_NAME, "", clearOpts);
    response.cookies.set(CUSTOMER_COOKIE_NAME, "", clearOpts);
    response.cookies.set(LEGACY_COOKIE_NAME, "", clearOpts);
  } else {
    // Standard customer logout - does NOT affect admin session
    response.cookies.set(CUSTOMER_COOKIE_NAME, "", clearOpts);
    response.cookies.set(LEGACY_COOKIE_NAME, "", clearOpts);
  }

  return response;
}

export async function GET(request: Request) {
  return POST(request);
}

