import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    // 1. Try authenticated session cookie first
    let user = await getAuthenticatedUser(request);

    // 2. Fallback to userId query parameter if provided
    if (!user) {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get("userId");
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            emailVerified: true,
            createdAt: true,
          },
        });
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Fetch me error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
