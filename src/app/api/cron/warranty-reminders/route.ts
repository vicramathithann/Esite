import { NextResponse } from "next/server";
import { checkAndDispatchWarrantyReminders } from "@/lib/email";
import { enforceRateLimit } from "@/lib/rateLimit";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";
import { getAuthenticatedUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const rateLimitError = enforceRateLimit(request, {
      keyPrefix: "cron_warranty_reminders",
      maxRequests: 30,
      windowSeconds: 60,
    });
    if (rateLimitError) return rateLimitError;

    // Strictly enforce CRON_SECRET authorization check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing or invalid CRON_SECRET authorization header." },
        { status: 401 }
      );
    }

    const result = await checkAndDispatchWarrantyReminders();

    logSecurityEvent("ADMIN_ACTION", "INFO", {
      ip: getClientIp(request),
      route: "/api/cron/warranty-reminders",
      method: "POST",
      details: result,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
      message: `Warranty reminder scan complete: dispatched ${result.reminders6mSent} 6-month notice(s), ${result.reminders1dSent} 1-day notice(s), marked ${result.expiredMarked} expired.`,
    });
  } catch (error) {
    console.error("Warranty reminders cron error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process warranty reminders." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}

