import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({
    success: true,
    message: "Admin session terminated successfully.",
  });

  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getSessionCookieOptions(request),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET(request: Request) {
  return POST(request);
}

