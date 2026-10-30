import { NextResponse } from "next/server";
import { checkEnvStatus, getMissingServerEnvVars, env, getBaseUrl } from "@/lib/env";
import { createMailerTransport, sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Temporary diagnostic route to verify environment variables and live Gmail SMTP handshake.
 *
 * Usage:
 * - GET /api/debug-email?key=vn_debug_2026
 *   (or your custom process.env.DEBUG_KEY)
 *
 * Optional live test send:
 * - GET /api/debug-email?key=vn_debug_2026&to=your-email@example.com
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const expectedKey = process.env.DEBUG_KEY || "vn_debug_2026";

  if (!key || key !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        error: `Unauthorized: Missing or invalid secret key parameter. Usage: /api/debug-email?key=${expectedKey}`,
      },
      { status: 401 }
    );
  }

  const envCheck = checkEnvStatus();
  const missingRequired = getMissingServerEnvVars();
  const testRecipient = searchParams.get("to")?.trim();
  const resolvedBaseUrl = getBaseUrl(request);

  let smtpStatus: {
    verified: boolean;
    message?: string;
    error?: string;
    code?: string;
    response?: string;
    responseCode?: number;
    command?: string;
  };

  try {
    const transporter = createMailerTransport();
    await transporter.verify();
    smtpStatus = {
      verified: true,
      message: `Nodemailer successfully authenticated with Gmail as ${env.GMAIL_USER}`,
    };
  } catch (err: any) {
    smtpStatus = {
      verified: false,
      message: "SMTP handshake failed.",
      error: err?.message || String(err),
      code: err?.code,
      response: err?.response,
      responseCode: err?.responseCode,
      command: err?.command,
    };
  }

  let testSendResult: {
    attempted: boolean;
    success?: boolean;
    recipient?: string;
    messageId?: string;
    error?: string;
  } = { attempted: false };

  if (testRecipient && smtpStatus.verified) {
    testSendResult.attempted = true;
    testSendResult.recipient = testRecipient;
    try {
      const sendInfo = await sendOtpEmail(testRecipient, "123456", request);
      testSendResult.success = true;
      testSendResult.messageId = sendInfo.messageId;
    } catch (sendErr: any) {
      testSendResult.success = false;
      testSendResult.error = sendErr?.message || String(sendErr);
    }
  }

  const isHealthy = missingRequired.length === 0 && smtpStatus.verified && (!testSendResult.attempted || testSendResult.success);

  return NextResponse.json(
    {
      success: isHealthy,
      temporaryDiagnosticRoute: true,
      notice: "Delete this route once verified in production.",
      resolvedBaseUrl,
      requiredEnvVars: {
        GMAIL_USER: envCheck.GMAIL_USER,
        GMAIL_APP_PASSWORD: envCheck.GMAIL_APP_PASSWORD,
        NEXT_PUBLIC_SUPABASE_URL: envCheck.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: envCheck.SUPABASE_SERVICE_ROLE_KEY,
      },
      optionalEnvVars: {
        NEXT_PUBLIC_APP_URL: envCheck.NEXT_PUBLIC_APP_URL,
      },
      missingRequiredEnvVars: missingRequired,
      smtp: smtpStatus,
      testSend: testSendResult,
    },
    { status: isHealthy ? 200 : 500 }
  );
}
