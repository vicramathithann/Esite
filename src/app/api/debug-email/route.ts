import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { checkEnvStatus, getMissingServerEnvVars, env, getBaseUrl } from "@/lib/env";
import { createMailerTransport, sendOtpEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Diagnostic route to verify environment variables and live Gmail SMTP handshake.
 * Disabled by default in production.
 */
export async function GET(request: Request) {
  // Fail closed in production unless explicitly enabled via environment variable
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEBUG_ROUTES !== "true") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const expectedKey = process.env.DEBUG_KEY;

  if (!expectedKey || !key) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Missing authentication key.",
      },
      { status: 401 }
    );
  }

  // Constant-time comparison to prevent timing leaks
  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(expectedKey);
  const isMatch =
    keyBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(keyBuffer, expectedBuffer);

  if (!isMatch) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid key.",
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
      if (searchParams.get("type") === "warranty") {
        const { sendWarrantyEmail } = await import("@/lib/mailer");
        const res = await sendWarrantyEmail(
          {
            id: "test-order-debug",
            orderNumber: "ORD58939",
            customerName: "Zara",
            customerEmail: testRecipient,
            totalAmount: 144900,
            createdAt: new Date("2026-11-04"),
          },
          [
            {
              productName: "Apple iPhone 16 Pro Max",
              productBrand: "Apple",
              selectedStorage: "128GB",
              selectedColor: "Natural Titanium",
              imeiNumber: "861234567890123",
              warrantyMonths: 12,
              warrantyStartDate: new Date("2026-11-04"),
              warrantyExpiryDate: new Date("2027-11-04"),
            },
          ],
          [],
          request,
          { forceResend: true }
        );
        testSendResult.success = res.success;
        testSendResult.messageId = res.messageId;
        testSendResult.error = res.error;
      } else {
        const sendInfo = await sendOtpEmail(testRecipient, "123456", request);
        testSendResult.success = true;
        testSendResult.messageId = sendInfo.messageId;
      }
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
