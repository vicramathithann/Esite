import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUsername, normalizeUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/check-username?name=... or ?username=...
 * Live check for username availability during invite acceptance.
 * Enforces:
 * 1. 3 to 20 characters
 * 2. Letters, numbers, dot, underscore
 * 3. Reserved username blocking
 * 4. Case-insensitive uniqueness
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = (searchParams.get("name") || searchParams.get("username") || "").trim();

    if (!rawUsername) {
      return NextResponse.json({
        available: false,
        error: "Username is required.",
      });
    }

    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error,
      });
    }

    const normalized = validation.normalized || normalizeUsername(rawUsername);

    // Check case-insensitively across existing users
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { normalizedUsername: normalized },
          { username: rawUsername },
          { name: rawUsername },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        available: false,
        error: "Username already taken",
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

