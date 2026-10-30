import { NextResponse } from "next/server";
import { getGmailCredentials, createTransporter } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Temporary diagnostic route for verifying Gmail SMTP & environment in Vercel Production.
 *
 * Usage:
 * - GET /api/debug-email
 *   Checks env var presence (booleans only, secrets never exposed) and verifies SMTP handshake.
 * - GET /api/debug-email?to=your-email@example.com
 *   Attempts to send a live test message and returns full Nodemailer diagnostics.
 *
 * NOTE: This endpoint is temporary for deployment verification. Delete or restrict once verified.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testRecipient = searchParams.get("to")?.trim();

  const { user, pass } = getGmailCredentials();

  // Environment variable definitions (Booleans only - values are NEVER revealed)
  const envStatus = {
    GMAIL_USER: Boolean(user),
    GMAIL_APP_PASSWORD: Boolean(pass),
    GMAIL_APP_PASSWORD_LENGTH: pass ? pass.length : 0,
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NODE_ENV: process.env.NODE_ENV || "unknown",
    VERCEL: Boolean(process.env.VERCEL),
    VERCEL_ENV: process.env.VERCEL_ENV || "unknown",
  };

  // If credentials missing, return immediate clear diagnostics
  if (!user || !pass) {
    const missing: string[] = [];
    if (!user) missing.push("GMAIL_USER");
    if (!pass) missing.push("GMAIL_APP_PASSWORD");

    return NextResponse.json(
      {
        success: false,
        message: `Missing required environment variable(s): ${missing.join(", ")}. Please configure them in Vercel Project Settings > Environment Variables.`,
        isTemporaryDiagnosticEndpoint: true,
        env: envStatus,
        smtp: {
          verified: false,
          error: "Missing Gmail credentials in environment variables.",
          code: "MISSING_ENV",
        },
      },
      { status: 500 }
    );
  }

  const transporter = createTransporter();
  if (!transporter) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to initialize Nodemailer transporter with service: 'gmail'.",
        isTemporaryDiagnosticEndpoint: true,
        env: envStatus,
        smtp: {
          verified: false,
          error: "Transporter initialization failed.",
          code: "INIT_FAILED",
        },
      },
      { status: 500 }
    );
  }

  // 1. Run transporter.verify()
  let smtpResult: {
    verified: boolean;
    service: string;
    sender: string;
    message?: string;
    error?: string;
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
  };

  try {
    await transporter.verify();
    smtpResult = {
      verified: true,
      service: "gmail",
      sender: user,
      message: `Nodemailer successfully connected and authenticated with Gmail service as ${user}.`,
    };
  } catch (verifyErr: any) {
    smtpResult = {
      verified: false,
      service: "gmail",
      sender: user,
      message: "SMTP handshake / authentication failed with Gmail.",
      error: verifyErr?.message || String(verifyErr),
      code: verifyErr?.code,
      command: verifyErr?.command,
      response: verifyErr?.response,
      responseCode: verifyErr?.responseCode,
    };
  }

  // 2. Optional test send if ?to=<address> is passed
  let testSendResult: {
    attempted: boolean;
    success?: boolean;
    recipient?: string;
    messageId?: string;
    error?: string;
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
  } = {
    attempted: false,
  };

  if (testRecipient) {
    testSendResult.attempted = true;
    testSendResult.recipient = testRecipient;

    try {
      const sendInfo = await transporter.sendMail({
        from: `"VN Mobiles Diagnostic" <${user}>`,
        to: testRecipient,
        subject: `[Diagnostic Test] VN Mobiles Vercel Delivery Test - ${new Date().toISOString()}`,
        text: `Hello!\n\nThis is an automated test email confirming that the Gmail SMTP transport is operational on Vercel Production.\n\nTimestamp: ${new Date().toISOString()}\nService: gmail\nSender: ${user}\nEnvironment: ${process.env.VERCEL_ENV || process.env.NODE_ENV || "production"}\n\nYou can now delete the /api/debug-email endpoint.\n\nVN Mobiles Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background-color: #FFFFFF;">
            <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 18px; font-weight: 700;">VN Mobiles Mail Gateway Test</h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #374151;">
              This diagnostic email confirms that <strong>Nodemailer</strong> via <strong>Gmail service</strong> is delivering messages successfully from your Vercel deployment.
            </p>
            <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 0 0 16px 0; font-size: 13px; line-height: 1.8; color: #4B5563;">
              <div><strong>Status:</strong> <span style="color: #059669; font-weight: 600;">DELIVERED</span></div>
              <div><strong>Transport:</strong> service: "gmail"</div>
              <div><strong>Authenticated Sender:</strong> ${user}</div>
              <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
              <div><strong>Environment:</strong> ${process.env.VERCEL_ENV || process.env.NODE_ENV || "production"}</div>
            </div>
            <p style="margin: 0; font-size: 12px; color: #6B7280;">
              Once verified, remember to remove or restrict the <code>/api/debug-email</code> endpoint.
            </p>
          </div>
        `,
      });

      testSendResult.success = true;
      testSendResult.messageId = sendInfo.messageId;
      testSendResult.response = sendInfo.response;
    } catch (sendErr: any) {
      testSendResult.success = false;
      testSendResult.error = sendErr?.message || String(sendErr);
      testSendResult.code = sendErr?.code;
      testSendResult.command = sendErr?.command;
      testSendResult.response = sendErr?.response;
      testSendResult.responseCode = sendErr?.responseCode;
    }
  }

  const isOverallSuccess = smtpResult.verified && (!testSendResult.attempted || testSendResult.success);

  return NextResponse.json(
    {
      success: isOverallSuccess,
      isTemporaryDiagnosticEndpoint: true,
      env: envStatus,
      smtp: smtpResult,
      testSend: testSendResult,
    },
    { status: isOverallSuccess ? 200 : 500 }
  );
}

