import { NextResponse } from "next/server";
import { sendMsg91Sms, formatIndianMobileNumber } from "@/lib/msg91";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Expected JSON body.",
        },
        { status: 400 }
      );
    }

    const {
      mobile,
      phone,
      customerPhone,
      templateId,
      variables,
      params,
      shortUrl,
      orderId,
      alertTitle,
    } = body;

    // Support flexible mobile number property names
    const targetMobile = mobile || phone || customerPhone;

    if (!targetMobile) {
      return NextResponse.json(
        {
          success: false,
          error: "Mobile number is required (pass 'mobile' or 'phone' in JSON).",
        },
        { status: 400 }
      );
    }

    // Support flexible variable object names
    const templateVariables = variables || params || {};

    // Validate and format mobile number
    const mobileCheck = formatIndianMobileNumber(String(targetMobile));
    if (!mobileCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: mobileCheck.error,
        },
        { status: 400 }
      );
    }

    // Dispatch SMS via MSG91 Flow API
    const result = await sendMsg91Sms({
      mobile: mobileCheck.formatted,
      templateId: templateId ? String(templateId) : undefined,
      variables: typeof templateVariables === "object" && templateVariables !== null ? templateVariables : {},
      shortUrl: shortUrl ? String(shortUrl) : "0",
    });

    // Optional: Log to local SMS alert drawer for customer visibility if orderId or title provided
    if (result.success && orderId) {
      try {
        await prisma.smsAlert.create({
          data: {
            orderId: String(orderId),
            customerPhone: mobileCheck.formatted,
            alertType: "MSG91_FLOW_SMS",
            title: alertTitle || "📢 MSG91 SMS Notification",
            messageBody: `MSG91 Flow SMS sent to ${mobileCheck.formatted}. Variables: ${JSON.stringify(templateVariables)}`,
            isRead: false,
          },
        });
      } catch (logErr) {
        console.warn("[MSG91] Failed to record local SMS drawer entry:", logErr);
      }
    }

    // Return the MSG91 API response/status safely to the frontend
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          data: result.data || null,
        },
        { status: result.statusCode >= 400 && result.statusCode < 600 ? result.statusCode : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      mobile: mobileCheck.formatted,
      data: result.data || null,
    });
  } catch (error: unknown) {
    console.error("[MSG91 UNHANDLED ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process SMS request.",
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for checking MSG91 configuration status without leaking keys.
 */
export async function GET() {
  const authKey = process.env.MSG91_AUTHKEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();

  const isConfigured = Boolean(
    authKey &&
    authKey !== "your_msg91_authkey_here" &&
    templateId &&
    templateId !== "your_msg91_flow_template_id_here"
  );

  return NextResponse.json({
    success: true,
    service: "MSG91 Flow SMS Integration",
    endpoint: "https://control.msg91.com/api/v5/flow",
    configured: isConfigured,
    authKeySet: Boolean(authKey && authKey !== "your_msg91_authkey_here"),
    templateIdSet: Boolean(templateId && templateId !== "your_msg91_flow_template_id_here"),
    message: isConfigured
      ? "MSG91 SMS Gateway is configured and ready."
      : "MSG91_AUTHKEY or MSG91_TEMPLATE_ID is not configured in .env.",
  });
}
