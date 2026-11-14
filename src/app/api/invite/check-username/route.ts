import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUsername, normalizeUsername, isReservedUsername } from "@/lib/username";
import { enforceRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/check-username?name=... or ?username=...
 * Live check for username availability.
 *
 * Rules:
 * - Rate limited (60 req/min per IP)
 * - Returns ONLY { available: boolean, reason: string | null, message: string }
 * - Never returns user data
 * - "Taken" only when ANOTHER existing user has that normalized username
 * - Ignores null or empty usernames
 * - Ignores current user / current invite / unfinished records for the same email
 */
export async function GET(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "check_username",
      maxRequests: 60,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const rawUsername = (searchParams.get("name") || searchParams.get("username") || "").trim();
    const rawEmail = (searchParams.get("email") || "").trim().toLowerCase();
    const token = (searchParams.get("token") || "").trim();

    let currentEmail = rawEmail;

    // If token provided and no email, resolve invitee email
    if (token && !currentEmail) {
      try {
        const inv = await prisma.invitation.findFirst({
          where: { token },
          select: { email: true },
        });
        if (inv && inv.email) {
          currentEmail = inv.email.toLowerCase();
        }
      } catch {}
    }

    if (!rawUsername) {
      return NextResponse.json({
        available: false,
        reason: "too short",
        message: "Username is required.",
      });
    }

    if (rawUsername.length < 3) {
      return NextResponse.json({
        available: false,
        reason: "too short",
        message: "Username must be at least 3 characters long.",
      });
    }

    if (rawUsername.length > 20) {
      return NextResponse.json({
        available: false,
        reason: "too long",
        message: "Username cannot exceed 20 characters.",
      });
    }

    // Allowed characters: letters, numbers, dot, underscore
    const allowedRegex = /^[a-zA-Z0-9._]+$/;
    if (!allowedRegex.test(rawUsername) || !/[a-zA-Z0-9]/.test(rawUsername)) {
      return NextResponse.json({
        available: false,
        reason: "invalid characters",
        message: "Username can only contain letters, numbers, dot (.), and underscore (_).",
      });
    }

    const norm = normalizeUsername(rawUsername);

    if (isReservedUsername(norm)) {
      return NextResponse.json({
        available: false,
        reason: "reserved",
        message: "This username is reserved and cannot be registered.",
      });
    }

    // Query existing users with matching normalized handle or name
    // Ignore null or empty usernames
    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { normalizedUsername: norm },
          { username: norm },
          { name: { equals: norm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        normalizedUsername: true,
        name: true,
      },
    });

    const isTakenByOther = matchingUsers.some((u: any) => {
      // Must match the normalized handle
      const matchesHandle =
        (u.normalizedUsername && u.normalizedUsername.trim().toLowerCase() === norm) ||
        (u.username && u.username.trim().toLowerCase() === norm) ||
        (u.name && u.name.trim().toLowerCase() === norm);

      if (!matchesHandle) return false;

      // Ignore current user / current invite / unfinished record for the same email
      if (currentEmail && u.email && u.email.trim().toLowerCase() === currentEmail) {
        return false;
      }

      return true;
    });

    if (isTakenByOther) {
      return NextResponse.json({
        available: false,
        reason: "taken",
        message: "Username already taken",
      });
    }

    return NextResponse.json({
      available: true,
      reason: null,
      message: "Username is available",
    });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { available: false, reason: "server_error", message: "Unable to check username availability" },
      { status: 500 }
    );
  }
}

