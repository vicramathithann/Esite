import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { requireAuth, ADMIN_EMAIL } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { isOrderCancelled, isOrderDelivered } from "@/lib/orderStatus";
import { sendAccountDeletionOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const requestBodySchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),
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
  if (!origin || !host) return true; // Direct/same-site fallback
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
    const parsed = requestBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." },
        { status: 400 }
      );
    }

    // 5. Ensure submitted email matches authenticated session user (case-insensitive & trimmed)
    if (parsed.data.email !== authUser.email.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "The provided email address does not match your registered account email." },
        { status: 400 }
      );
    }

    // 6. Block deletion if the user has active orders in progress or transit
    const userOrders = await prisma.order.findMany({
      where: {
        OR: [
          { userId: authUser.id },
          { customerEmail: authUser.email.trim().toLowerCase() },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
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

    // 7. Rate Limit: Maximum 3 OTP requests per hour per user and per IP
    const clientIp = getClientIp(request);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [userReqs, ipReqs] = await Promise.all([
      supabaseAdmin
        .from("AccountDeletionRequest")
        .select("id", { count: "exact", head: true })
        .eq("userId", authUser.id)
        .gte("createdAt", oneHourAgo),
      supabaseAdmin
        .from("AccountDeletionRequest")
        .select("id", { count: "exact", head: true })
        .eq("ipAddress", clientIp)
        .gte("createdAt", oneHourAgo),
    ]);

    if ((userReqs.count ?? 0) >= 3 || (ipReqs.count ?? 0) >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many deletion requests. For your security, please wait 1 hour before requesting another code.",
        },
        { status: 429 }
      );
    }

    // 8. Invalidate any existing active OTPs for this user (only 1 active OTP at a time)
    await supabaseAdmin
      .from("AccountDeletionRequest")
      .update({ usedAt: new Date().toISOString() })
      .eq("userId", authUser.id)
      .is("usedAt", null);

    // 9. Generate cryptographically secure 6-digit numeric OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString("hex");
    const otpHash = crypto.createHash("sha256").update(`${otp}:${salt}`).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 10. Persist hashed OTP record in database using elevated service role
    const { error: insertErr } = await supabaseAdmin
      .from("AccountDeletionRequest")
      .insert({
        id: crypto.randomUUID(),
        userId: authUser.id,
        otpHash,
        salt,
        expiresAt,
        attempts: 0,
        createdAt: new Date().toISOString(),
        ipAddress: clientIp,
      });

    if (insertErr) {
      console.error("[AccountDeletionRequest] Failed to save deletion OTP record:", insertErr);
      return NextResponse.json(
        { success: false, error: "Failed to generate security code. Please try again." },
        { status: 500 }
      );
    }

    // 11. Send OTP email via existing Gmail SMTP gateway
    await sendAccountDeletionOtpEmail(
      { id: authUser.id, name: authUser.name, email: authUser.email },
      otp
    );

    // Log masked email for audit trail without leaking full PII
    const maskedEmail = authUser.email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => `${first}***${domain}`);
    console.log(`[AccountDeletion] Deletion OTP sent to user ${maskedEmail} from IP ${clientIp}`);

    return NextResponse.json({
      success: true,
      message: "A 6-digit verification code has been sent to your registered email.",
    });
  } catch (error: any) {
    console.error("[AccountDeletion] Error requesting deletion OTP:", error?.message || error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

