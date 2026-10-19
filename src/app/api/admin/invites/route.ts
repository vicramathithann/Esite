import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isValidEmail } from "@/lib/auth";
import { sendUserInvitationEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/invites
 * Retrieves all sent invitations. Strictly restricted to store administrators.
 */
export async function GET(request: Request) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const invites = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      invites,
    });
  } catch (error) {
    console.error("Failed to fetch invites:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error fetching invitations." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/invites
 * Generates and dispatches a new invitation email. Strictly restricted to administrators.
 */
export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "admin_invites_send",
      maxRequests: 20,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;
    const admin = adminOrResponse;

    const body = await request.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Recipient email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Check if an account already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { success: false, error: `An active account with ${cleanEmail} already exists on VN Mobiles.` },
        { status: 409 }
      );
    }

    // Invalidate any existing pending invitations for this email
    await prisma.invitation.updateMany({
      where: { email: cleanEmail, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    // Generate 64-character secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresInHours = 48; // Valid for 48 hours
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.invitation.create({
      data: {
        email: cleanEmail,
        token,
        role: "USER", // STRICTLY USER!
        status: "PENDING",
        invitedBy: admin.email,
        expiresAt,
      },
    });

    // Construct site URL and direct invite link
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    const detectedOrigin = host ? `${protocol}://${host}` : null;
    const siteUrl = (detectedOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const inviteLink = `${siteUrl}/invite?token=${encodeURIComponent(token)}`;

    // Dispatch professional invitation email
    const emailResult = await sendUserInvitationEmail({
      recipientEmail: cleanEmail,
      inviteLink,
      invitedBy: admin.email,
      expiresInHours,
    });

    if (!emailResult.success) {
      console.warn(`[INVITE EMAIL WARNING] Failed to deliver to ${cleanEmail}: ${emailResult.error}`);
    }

    logSecurityEvent("ADMIN_INVITE_SENT", "INFO", {
      userId: admin.id,
      email: admin.email,
      route: "/api/admin/invites",
      details: { invitedEmail: cleanEmail },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation successfully dispatched to ${cleanEmail}.`,
      inviteLink,
      invite,
    });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error creating invitation." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invites
 * Revokes a pending invitation. Strictly restricted to administrators.
 */
export async function DELETE(request: Request) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Invitation ID is required." },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found." },
        { status: 404 }
      );
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({
      success: true,
      message: `Invitation for ${invitation.email} has been revoked.`,
    });
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error revoking invitation." },
      { status: 500 }
    );
  }
}

