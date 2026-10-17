import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully. Administrative and user sessions terminated.",
  });

  const isProduction = process.env.NODE_ENV === "production";

  // Expire vn_session cookie
  response.cookies.set("vn_session", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  // Expire legacy novamobile_session cookie if present
  response.cookies.set("novamobile_session", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET() {
  return POST();
}

