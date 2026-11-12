import { NextResponse } from "next/server";
import { suppressEmail } from "@/lib/bounce-handler";
import { logSecurityEvent, getClientIp } from "@/lib/securityLogger";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Universal Email Webhook Endpoint for Transactional Providers
 * Handles:
 * 1. Resend (email.bounced, email.complained)
 * 2. SendGrid (bounce, dropped, spamreport)
 * 3. Amazon SES / SNS (Bounce, Complaint notifications)
 * 4. Manual diagnostic bounce testing
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const suppressedResults: Array<{ email: string; reason: string; success: boolean }> = [];

    // Case 1: Amazon SNS Subscription Confirmation
    if (body.Type === "SubscriptionConfirmation" && body.SubscribeURL) {
      console.log(`[AWS SNS SUBSCRIPTION] Auto-confirming URL: ${body.SubscribeURL}`);
      try {
        await fetch(body.SubscribeURL);
      } catch (e) {
        console.error("[AWS SNS SUBSCRIPTION ERROR]", e);
      }
      return NextResponse.json({ message: "Subscription confirmed." });
    }

    // Case 2: Amazon SES via SNS Notification
    if (body.Type === "Notification" && body.Message) {
      let snsMessage: any = {};
      try {
        snsMessage = JSON.parse(body.Message);
      } catch {
        snsMessage = {};
      }

      const notifType = snsMessage.notificationType || snsMessage.eventType;
      if (notifType === "Bounce") {
        const bouncedRecipients = snsMessage.bounce?.bouncedRecipients || [];
        const bounceType = snsMessage.bounce?.bounceType || "Permanent";
        for (const r of bouncedRecipients) {
          const email = r.emailAddress;
          const res = await suppressEmail(
            email,
            `AWS SES Bounce: ${bounceType} (${r.diagnosticCode || "Hard bounce"})`,
            "webhook_bounce"
          );
          suppressedResults.push({ email, reason: bounceType, success: res.success });
        }
      } else if (notifType === "Complaint") {
        const complainedRecipients = snsMessage.complaint?.complainedRecipients || [];
        for (const r of complainedRecipients) {
          const email = r.emailAddress;
          const res = await suppressEmail(
            email,
            `AWS SES Spam Complaint: ${snsMessage.complaint?.complaintFeedbackType || "abuse"}`,
            "webhook_complaint"
          );
          suppressedResults.push({ email, reason: "Complaint", success: res.success });
        }
      }
    }

    // Case 3: Resend Webhooks (type: "email.bounced" | "email.complained")
    if (body.type && body.data) {
      const eventType = String(body.type).toLowerCase();
      const recipient = body.data.to?.[0] || body.data.recipient || body.data.email;

      if (recipient) {
        if (eventType.includes("bounc")) {
          const reason = body.data.bounce?.message || "Resend hard bounce";
          const res = await suppressEmail(recipient, `Resend Bounce: ${reason}`, "webhook_bounce");
          suppressedResults.push({ email: recipient, reason, success: res.success });
        } else if (eventType.includes("complain")) {
          const reason = "Resend recipient reported spam";
          const res = await suppressEmail(recipient, `Resend Complaint: ${reason}`, "webhook_complaint");
          suppressedResults.push({ email: recipient, reason, success: res.success });
        }
      }
    }

    // Case 4: SendGrid Event Webhook (Array of events)
    if (Array.isArray(body)) {
      for (const event of body) {
        const eventType = (event.event || "").toLowerCase();
        const email = event.email;
        if (!email) continue;

        if (eventType === "bounce" || eventType === "dropped") {
          const reason = event.reason || "SendGrid hard bounce / dropped";
          const res = await suppressEmail(email, `SendGrid Bounce: ${reason}`, "webhook_bounce");
          suppressedResults.push({ email, reason, success: res.success });
        } else if (eventType === "spamreport") {
          const reason = "SendGrid recipient marked as spam";
          const res = await suppressEmail(email, `SendGrid Complaint: ${reason}`, "webhook_complaint");
          suppressedResults.push({ email, reason, success: res.success });
        }
      }
    }

    // Case 5: Direct webhook payload: { email, event: "bounce" | "complaint", reason }
    if (body.email && (body.event || body.action)) {
      const action = (body.event || body.action || "bounce").toLowerCase();
      const reason = body.reason || "Manual bounce / complaint submission";
      const res = await suppressEmail(
        body.email,
        reason,
        action.includes("complain") ? "webhook_complaint" : "webhook_bounce"
      );
      suppressedResults.push({ email: body.email, reason, success: res.success });
    }

    logSecurityEvent("ADMIN_ACTION", "INFO", {
      ip: clientIp,
      route: "/api/webhooks/email",
      method: "POST",
      details: { processed: suppressedResults.length, items: suppressedResults },
    });

    return NextResponse.json({
      success: true,
      processed: suppressedResults.length,
      suppressed: suppressedResults,
    });
  } catch (error: any) {
    console.error("[EMAIL WEBHOOK ERROR]", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
