import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isValidEmail } from "@/lib/auth";
import { sendUserInvitationEmail } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLogger";
import { getAppUrl } from "@/lib/appUrl";
import { isEmailSuppressed } from "@/lib/bounce-handler";

export const dynamic = "force-dynamic";

export type DerivedInviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "ACCOUNT_DELETED"
  | "SUPERSEDED"
  | "BOUNCED";

/**
 * GET /api/admin/invites
 * Retrieves all invitations with server-derived status (single source of truth).
 * Cross-references with User table to ensure deleted users never show as "Account Active".
 * Strictly restricted to administrators.
 */
export async function GET(request: Request) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    // 1. Fetch all invitations ordered by createdAt desc
    const rawInvites = await prisma.invitation.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all registered users to cross-reference active status
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const userById = new Map<string, any>();
    const userByEmail = new Map<string, any>();
    for (const u of allUsers) {
      if (u.id) userById.set(u.id, u);
      if (u.email) userByEmail.set(u.email.toLowerCase().trim(), u);
    }

    // 3. Group by email to identify the latest invite per recipient
    const latestInviteByEmail = new Map<string, string>(); // email -> newest invite id
    for (const inv of rawInvites) {
      const emailKey = (inv.email || "").toLowerCase().trim();
      if (!latestInviteByEmail.has(emailKey)) {
        latestInviteByEmail.set(emailKey, inv.id);
      }
    }

    const now = new Date();

    // 4. Derive single-source-of-truth status for each invite
    const enrichedInvites = await Promise.all(
      rawInvites.map(async (inv: any) => {
        const emailKey = (inv.email || "").toLowerCase().trim();
        const isLatest = latestInviteByEmail.get(emailKey) === inv.id;
        const storedStatus = (inv.status || "PENDING").toUpperCase();

        let effectiveStatus: DerivedInviteStatus = "PENDING";
        let statusReason: string | null = null;
        let linkedUser: any = null;

        // Check if a linked user exists (by acceptedUserId or email)
        if (inv.acceptedUserId && userById.has(inv.acceptedUserId)) {
          linkedUser = userById.get(inv.acceptedUserId);
        } else if (userByEmail.has(emailKey)) {
          linkedUser = userByEmail.get(emailKey);
        }

        // Check if email has hard bounced or is marked undeliverable
        const isBounced =
          storedStatus === "BOUNCED" ||
          (storedStatus === "PENDING" && (await isEmailSuppressed(emailKey)));

        if (isBounced) {
          effectiveStatus = "BOUNCED";
          statusReason = "Email bounced / marked undeliverable";
        } else if (storedStatus === "ACCOUNT_DELETED") {
          effectiveStatus = "ACCOUNT_DELETED";
          statusReason = inv.deletedBy
            ? `${inv.deletedBy}`
            : "User account was deleted";
        } else if (storedStatus === "REVOKED") {
          effectiveStatus = "REVOKED";
          statusReason = inv.revokedBy
            ? `Revoked by ${inv.revokedBy}`
            : "Cancelled by administrator";
        } else if (storedStatus === "ACCEPTED" || inv.acceptedAt || inv.token?.includes(":used:")) {
          // If accepted, check whether linked user actually exists in the database
          if (linkedUser) {
            effectiveStatus = "ACCEPTED";
            statusReason = `Account active (${linkedUser.name})`;
          } else {
            // User no longer exists in DB! Derived status MUST be ACCOUNT_DELETED
            effectiveStatus = "ACCOUNT_DELETED";
            statusReason = "User account was deleted";

            // Asynchronously sync DB record so it stays persisted
            if (storedStatus !== "ACCOUNT_DELETED") {
              const meta = {
                acceptedUserId: inv.acceptedUserId || null,
                accountDeletedAt: inv.accountDeletedAt || new Date().toISOString(),
                deletedBy: inv.deletedBy || "deleted",
              };
              const baseToken = (inv.token || "").split(":meta:")[0];
              const packedToken = `${baseToken}:meta:${Buffer.from(JSON.stringify(meta)).toString("base64")}`;
              prisma.invitation.update({
                where: { id: inv.id },
                data: {
                  status: "ACCOUNT_DELETED",
                  token: packedToken,
                },
              }).catch(() => {});
            }
          }
        } else if (storedStatus === "PENDING") {
          const isExpired = new Date(inv.expiresAt) < now;
          if (isExpired) {
            effectiveStatus = "EXPIRED";
            statusReason = "Past 48-hour expiration date";
          } else if (!isLatest) {
            // Older pending invite for an email that has a newer invite sent
            effectiveStatus = "SUPERSEDED";
            statusReason = "Superseded by a newer invitation";
          } else {
            effectiveStatus = "PENDING";
            statusReason = "Awaiting registration";
          }
        } else if (storedStatus === "EXPIRED") {
          effectiveStatus = "EXPIRED";
          statusReason = "Past 48-hour expiration date";
        } else {
          effectiveStatus = "PENDING";
        }

        // Mask token so raw secrets are never sent to the client
        return {
          id: inv.id,
          email: inv.email,
          role: inv.role || "USER",
          status: storedStatus,
          effectiveStatus,
          statusReason,
          isLatest,
          invitedBy: inv.invitedBy || "Admin",
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt || null,
          acceptedUserId: inv.acceptedUserId || linkedUser?.id || null,
          revokedAt: inv.revokedAt || null,
          revokedBy: inv.revokedBy || null,
          accountDeletedAt: inv.accountDeletedAt || null,
          deletedBy: inv.deletedBy || null,
          linkedUser: linkedUser
            ? {
                id: linkedUser.id,
                name: linkedUser.name,
                email: linkedUser.email,
                role: linkedUser.role,
                createdAt: linkedUser.createdAt,
              }
            : null,
        };
      })
    );

    // 5. Compute summary statistics
    const totalSent = enrichedInvites.length;
    const pendingCount = enrichedInvites.filter((i) => i.effectiveStatus === "PENDING").length;
    const acceptedCount = enrichedInvites.filter((i) => i.effectiveStatus === "ACCEPTED").length;
    const deletedOrRevokedCount = enrichedInvites.filter(
      (i) => i.effectiveStatus === "ACCOUNT_DELETED" || i.effectiveStatus === "REVOKED"
    ).length;
    const acceptanceRate =
      totalSent > 0 ? Math.round((acceptedCount / totalSent) * 100) : 0;

    return NextResponse.json({
      success: true,
      invites: enrichedInvites,
      metrics: {
        totalSent,
        pendingCount,
        acceptedCount,
        deletedOrRevokedCount,
        acceptanceRate,
      },
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
 * If resending or re-inviting, supersedes previous invites for this email.
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;
    const admin = adminOrResponse;

    // 1. Rate limit invites per admin: 20 per hour (3600s)
    const adminRateLimitError = enforceRateLimit(request, {
      keyPrefix: `admin_invites_quota_${admin.id || admin.email}`,
      maxRequests: 20,
      windowSeconds: 3600,
    });
    if (adminRateLimitError) {
      return NextResponse.json(
        { success: false, error: "Invitation rate limit reached (max 20 per hour). Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
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

    // 2. Cooldown: Block resends to the same recipient within 60 seconds
    const recentInvite = await prisma.invitation.findFirst({
      where: {
        email: cleanEmail,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentInvite) {
      return NextResponse.json(
        { success: false, error: "An invitation was recently sent to this address. Please wait 60 seconds before sending another." },
        { status: 429 }
      );
    }

    // 3. Suppression check: Stop resending to hard bounced or complained addresses
    const isSuppressed = await isEmailSuppressed(cleanEmail);
    if (isSuppressed) {
      return NextResponse.json(
        { success: false, error: "This email address is marked as undeliverable due to a prior bounce or spam complaint." },
        { status: 400 }
      );
    }

    // Check if an active account already exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { success: false, error: `An active account with ${cleanEmail} already exists on VN Mobiles.` },
        { status: 409 }
      );
    }

    // Mark any existing pending invitations for this email as superseded / revoked
    const existingPending = await prisma.invitation.findMany({
      where: { email: cleanEmail, status: "PENDING" },
    });

    for (const oldInv of existingPending) {
      const meta = {
        revokedAt: new Date().toISOString(),
        revokedBy: admin.email,
        reason: "Superseded by new invitation",
      };
      const baseToken = (oldInv.token || "").split(":meta:")[0];
      const packedToken = `${baseToken}:meta:${Buffer.from(JSON.stringify(meta)).toString("base64")}`;
      await prisma.invitation.update({
        where: { id: oldInv.id },
        data: {
          status: "REVOKED",
          token: packedToken,
        },
      });
    }

    // Generate 64-character secure random token and compute SHA-256 hash for database storage
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresInHours = 48; // Valid for 48 hours
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invite = await prisma.invitation.create({
      data: {
        email: cleanEmail,
        token: tokenHash,
        role: "USER", // STRICTLY USER! Role comes from server configuration only
        status: "PENDING",
        invitedBy: admin.email,
        expiresAt,
      },
    });

    // Construct site URL and direct invite link using raw token (returned only once on creation)
    const siteUrl = getAppUrl(request);
    const inviteLink = `${siteUrl}/invite?token=${encodeURIComponent(rawToken)}`;

    // Dispatch invitation email
    const emailResult = await sendUserInvitationEmail({
      recipientEmail: cleanEmail,
      inviteLink,
      role: invite.role,
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

    try {
      await prisma.userAuditLog.create({
        data: {
          adminEmail: admin.email,
          targetUserEmail: cleanEmail,
          action: "INVITATION_SENT",
          details: { expiresInHours },
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Invitation successfully dispatched to ${cleanEmail}.`,
      inviteLink,
      inviteId: invite.id,
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
    const admin = adminOrResponse;

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

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { success: false, error: "Cannot revoke an invitation that has already been accepted." },
        { status: 400 }
      );
    }

    const meta = {
      revokedAt: new Date().toISOString(),
      revokedBy: admin.email,
    };
    const baseToken = (invitation.token || "").split(":meta:")[0];
    const packedToken = `${baseToken}:meta:${Buffer.from(JSON.stringify(meta)).toString("base64")}`;

    await prisma.invitation.update({
      where: { id },
      data: {
        status: "REVOKED",
        token: packedToken,
      },
    });

    logSecurityEvent("ADMIN_ACTION", "INFO", {
      userId: admin.id,
      email: admin.email,
      route: "/api/admin/invites",
      method: "DELETE",
      details: {
        action: "INVITATION_REVOKED",
        invitationId: id,
        email: invitation.email,
      },
    });

    try {
      await prisma.userAuditLog.create({
        data: {
          adminEmail: admin.email,
          targetUserEmail: invitation.email,
          action: "INVITATION_REVOKED",
          details: { invitationId: id },
        },
      });
    } catch {}

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
