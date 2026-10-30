import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { requireAuth, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { isOrderCancelled, isOrderDelivered } from "@/lib/orderStatus";
import { sendAccountDeletionConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const confirmBodySchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // 1. Enforce same-origin CSRF protection
    if (!verifyOrigin(request)) {
      return NextResponse.json(
        { success: false, error: "Invalid request origin. Request forbidden." },
        { status: 403 }
      );
    }

    // 2. Enforce active user session
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const authUser = authResult;

    // 3. Block self-deletion for administrative accounts
    if (
      (authUser.role || "").toUpperCase() === "ADMIN" ||
      authUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator accounts cannot be self-deleted. Please contact another system administrator from the admin portal.",
        },
        { status: 403 }
      );
    }

    // 4. Validate request payload with Zod
    const body = await request.json().catch(() => null);
    const parsed = confirmBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid verification code." },
        { status: 400 }
      );
    }

    // 5. Retrieve the latest active deletion request for this user
    const { data: records, error: fetchErr } = await supabaseAdmin
      .from("AccountDeletionRequest")
      .select("*")
      .eq("userId", authUser.id)
      .is("usedAt", null)
      .order("createdAt", { ascending: false })
      .limit(1);

    if (fetchErr || !records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active verification code found. Please request a new code." },
        { status: 400 }
      );
    }

    const record = records[0];

    // 6. Enforce maximum 5 wrong attempts
    if ((record.attempts || 0) >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. This verification code has been invalidated. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // 7. Enforce 10-minute expiry
    if (new Date(record.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 8. Constant-time comparison of submitted OTP against stored salt & hash
    const computedHash = crypto
      .createHash("sha256")
      .update(`${parsed.data.otp}:${record.salt}`)
      .digest("hex");

    const isMatch =
      computedHash.length === record.otpHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(computedHash, "hex"),
        Buffer.from(record.otpHash, "hex")
      );

    if (!isMatch) {
      const nextAttempts = (record.attempts || 0) + 1;
      if (nextAttempts >= 5) {
        await supabaseAdmin
          .from("AccountDeletionRequest")
          .update({
            attempts: nextAttempts,
            usedAt: new Date().toISOString(), // Invalidate code upon hitting 5 attempts
          })
          .eq("id", record.id);

        return NextResponse.json(
          {
            success: false,
            error: "Incorrect verification code. Maximum attempts exceeded. This code has been invalidated.",
          },
          { status: 400 }
        );
      }

      await supabaseAdmin
        .from("AccountDeletionRequest")
        .update({ attempts: nextAttempts })
        .eq("id", record.id);

      const remaining = 5 - nextAttempts;
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        },
        { status: 400 }
      );
    }

    // 9. Single-use: Mark OTP as used immediately to prevent race conditions & double-spend
    await supabaseAdmin
      .from("AccountDeletionRequest")
      .update({ usedAt: new Date().toISOString() })
      .eq("id", record.id);

    // 10. Secondary check: Block if any orders became active during verification
    const userOrders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: authUser.id },
          { customerEmail: authUser.email.trim().toLowerCase() },
        ],
      },
      select: {
        id: true,
        orderStatus: true,
      },
    });

    const hasActiveOrders = userOrders.some(
      (order: { orderStatus?: string | null }) =>
        !isOrderCancelled(order.orderStatus) && !isOrderDelivered(order.orderStatus)
    );

    if (hasActiveOrders) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete account while you have active orders in progress or transit. Please wait until your orders are delivered or cancel them before proceeding.",
        },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const userIdHash = crypto.createHash("sha256").update(authUser.id).digest("hex");
    const anonymizedEmail = `deleted-${authUser.id.substring(0, 8)}@deleted.vnmobiles.in`;

    // 11. Execute Account Deletion & Anonymization
    // First attempt the atomic PostgreSQL RPC function
    let deletionSuccess = false;
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("delete_user_account", {
        p_user_id: authUser.id,
        p_ip_address: clientIp,
      });

      if (!rpcError && rpcResult && rpcResult.success) {
        deletionSuccess = true;
      } else if (rpcError) {
        console.warn("[AccountDeletion] RPC delete_user_account failed, using fallback:", rpcError.message);
      }
    } catch (rpcEx) {
      console.warn("[AccountDeletion] RPC call threw, using fallback:", rpcEx);
    }

    // Fallback: If RPC is not installed or failed, execute server-side steps
    if (!deletionSuccess) {
      // a. Anonymize Orders
      await supabaseAdmin
        .from("Order")
        .update({
          customerName: "Deleted Customer",
          customerEmail: anonymizedEmail,
          customerPhone: "0000000000",
          address: "Redacted (Account Deleted)",
          city: "Redacted",
          state: "Redacted",
          pincode: "000000",
          userId: null,
        })
        .or(`userId.eq.${authUser.id},customerEmail.eq.${authUser.email.trim().toLowerCase()}`);

      // b. Anonymize Warranties
      await supabaseAdmin
        .from("Warranty")
        .update({
          customerName: "Deleted Customer",
          customerEmail: anonymizedEmail,
          userId: null,
        })
        .or(`userId.eq.${authUser.id},customerEmail.eq.${authUser.email.trim().toLowerCase()}`);

      // c. Anonymize Reviews
      await supabaseAdmin
        .from("Review")
        .update({
          userName: "Anonymous Customer",
          userId: null,
        })
        .eq("userId", authUser.id);

      // d. Anonymize Email Notifications
      await supabaseAdmin
        .from("EmailNotification")
        .update({
          recipientName: "Deleted Customer",
          recipientEmail: anonymizedEmail,
          userId: null,
        })
        .or(`userId.eq.${authUser.id},recipientEmail.eq.${authUser.email.trim().toLowerCase()}`);

      // e. Delete Wishlist items
      await supabaseAdmin.from("Wishlist").delete().eq("userId", authUser.id);

      // f. Delete pending OTP records
      await supabaseAdmin.from("AccountDeletionRequest").delete().eq("userId", authUser.id);

      // g. Record non-identifying Audit Log
      await supabaseAdmin.from("AccountDeletionAudit").insert({
        id: crypto.randomUUID(),
        userIdHash,
        deletedAt: new Date().toISOString(),
        ipAddress: clientIp,
        reason: "Self-service customer account deletion",
      });

      // h. Delete User Profile
      const { error: userDeleteErr } = await supabaseAdmin
        .from("User")
        .delete()
        .eq("id", authUser.id);

      if (userDeleteErr) {
        console.error("[AccountDeletion] Fallback failed to delete User profile:", userDeleteErr);
        return NextResponse.json(
          { success: false, error: "Failed to complete account deletion. Please try again." },
          { status: 500 }
        );
      }
    }

    // 12. If Supabase Auth is enabled, delete from auth.users (gracefully ignores if not used)
    try {
      if ((supabaseAdmin as any).auth?.admin?.deleteUser) {
        await (supabaseAdmin as any).auth.admin.deleteUser(authUser.id);
      }
    } catch {
      // Supabase Auth not active for this account, continue
    }

    // 13. Send final confirmation email before closing
    try {
      await sendAccountDeletionConfirmationEmail({
        name: authUser.name,
        email: authUser.email,
      });
    } catch (emailErr) {
      console.warn("[AccountDeletion] Could not send confirmation email:", emailErr);
    }

    const maskedEmail = authUser.email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => `${first}***${domain}`);
    console.log(`[AccountDeletion] Account successfully deleted for ${maskedEmail} (Hash: ${userIdHash.substring(0, 8)}...)`);

    // 14. Terminate sessions and clear HTTP-only cookies
    const response = NextResponse.json({
      success: true,
      message: "Your account has been deleted successfully.",
    });

    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set("vn_session", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    response.cookies.set("novamobile_session", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: any) {
    console.error("[AccountDeletion] Error confirming deletion:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while deleting your account." },
      { status: 500 }
    );
  }
}

