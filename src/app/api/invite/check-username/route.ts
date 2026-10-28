import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/check-username?name=...
 * Live check for username availability during invite acceptance.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = (searchParams.get("name") || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json({
        available: false,
        message: "Username must be at least 2 characters.",
      });
    }

    const allUsers = await prisma.user.findMany({
      select: { name: true },
    });

    const isTaken = allUsers.some(
      (u: { name: string | null }) => u.name && u.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (isTaken) {
      return NextResponse.json({
        available: false,
        error: "This name is already taken",
      });
    }

    return NextResponse.json({
      available: true,
      message: "Username is available",
    });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { available: false, error: "Unable to check username availability" },
      { status: 500 }
    );
  }
}

