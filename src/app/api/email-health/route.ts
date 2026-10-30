import { NextResponse } from "next/server";
import { verifySmtpConnection, getGmailCredentials } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Temporary diagnostic endpoint for validating email delivery readiness on Vercel Production.
 *
 * Checks:
 * 1. Required environment variables (reports only missing variable names, never values)
 * 2. Live SMTP connection handshake via Nodemailer verify()
 * 3. Database connection and EmailNotification audit table accessibility
 *
 * NOTE: Delete this file or restrict access after production email delivery is verified.
 */
export async function GET() {
  const credentials = getGmailCredentials();
  const requiredEnvVars = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const configured: string[] = [];
  const missing: string[] = [];

  if (credentials.user) {
    configured.push("GMAIL_USER");
  } else {
    missing.push("GMAIL_USER");
  }

  if (credentials.pass) {
    configured.push("GMAIL_APP_PASSWORD");
  } else {
    missing.push("GMAIL_APP_PASSWORD");
  }

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar] && process.env[envVar]!.trim().length > 0) {
      configured.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  // 1. Check SMTP Handshake
  let smtpStatus: {
    connected: boolean;
    host: string;
    port: number;
    userConfigured: boolean;
    message?: string;
    error?: string;
    code?: string;
    rawError?: any;
  } = {
    connected: false,
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    userConfigured: Boolean(credentials.user && credentials.pass),
  };

  try {
    const smtpCheck = await verifySmtpConnection();
    smtpStatus.connected = smtpCheck.success;
    smtpStatus.message = smtpCheck.message;
    smtpStatus.error = smtpCheck.error;
    smtpStatus.code = smtpCheck.code;
    smtpStatus.rawError = smtpCheck.rawError;
  } catch (err: unknown) {
    smtpStatus.connected = false;
    smtpStatus.error = err instanceof Error ? err.message : String(err);
  }

  // 2. Check Database & Email Audit Log table
  let dbStatus = {
    connected: false,
    emailLogsTableAvailable: false,
    totalLogsRecorded: 0,
    error: undefined as string | undefined,
  };

  try {
    const logCount = await prisma.emailNotification.count();
    dbStatus.connected = true;
    dbStatus.emailLogsTableAvailable = true;
    dbStatus.totalLogsRecorded = logCount;
  } catch (dbErr: unknown) {
    dbStatus.connected = false;
    dbStatus.error = dbErr instanceof Error ? dbErr.message : String(dbErr);
  }

  const isHealthy = missing.length === 0 && smtpStatus.connected && dbStatus.connected;
  const isDegraded = !isHealthy && dbStatus.connected;

  return NextResponse.json(
    {
      status: isHealthy ? "HEALTHY" : isDegraded ? "DEGRADED" : "UNHEALTHY",
      timestamp: new Date().toISOString(),
      environment: {
        configured,
        missing,
      },
      smtp: smtpStatus,
      database: dbStatus,
      notice: "This is a temporary diagnostic endpoint. Delete or protect src/app/api/email-health/route.ts after testing.",
    },
    { status: isHealthy ? 200 : 503 }
  );
}

