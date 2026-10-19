import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/verify?token=...
 * Verifies that an invitation token exists, is valid, unexpired, and not yet accepted.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = (searchParams.get("token") || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Invitation token is required.",
        },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "Invalid invitation link. Please verify the URL or ask the administrator for a new invite.",
        },
        { status: 404 }
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "This invitation has been revoked by the administrator.",
        },
        { status: 410 }
      );
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "This invitation has already been accepted and used to create an account.",
        },
        { status: 410 }
      );
    }

    // Expiry check
    if (new Date() > invitation.expiresAt || invitation.status === "EXPIRED") {
      if (invitation.status !== "EXPIRED") {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }

      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: "This invitation link has expired. Invitations are valid for 48 hours.",
        },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("Error verifying invitation token:", error);
    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: "Internal server error verifying invitation.",
      },
      { status: 500 }
    );
  }
}

