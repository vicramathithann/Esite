import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env, getMissingServerEnvVars } from "@/lib/env";

export type EmailFailureReason = "MISSING_ENV" | "EAUTH" | "ETIMEDOUT" | "SEND_FAILED";

export class MailerError extends Error {
  reason: EmailFailureReason;
  code?: string;
  response?: string;
  responseCode?: number;
  command?: string;

  constructor(
    message: string,
    reason: EmailFailureReason,
    details?: { code?: string; response?: string; responseCode?: number; command?: string }
  ) {
    super(message);
    this.name = "MailerError";
    this.reason = reason;
    this.code = details?.code;
    this.response = details?.response;
    this.responseCode = details?.responseCode;
    this.command = details?.command;
  }
}

/**
 * Creates Nodemailer transporter on demand inside the function execution context.
 * Never creates the transport at module import time.
 */
export function createMailerTransport(): Transporter {
  const missing = getMissingServerEnvVars();
  if (missing.includes("GMAIL_USER") || missing.includes("GMAIL_APP_PASSWORD")) {
    throw new MailerError(
      `Missing required Gmail environment variable(s): ${missing.filter((k) => k.startsWith("GMAIL")).join(", ")}`,
      "MISSING_ENV"
    );
  }

  let user = "";
  let pass = "";
  try {
    user = env.GMAIL_USER;
    pass = env.GMAIL_APP_PASSWORD;
  } catch (envErr: any) {
    throw new MailerError(envErr?.message || "Missing Gmail environment variables", "MISSING_ENV");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

function classifyMailerError(err: unknown): MailerError {
  if (err instanceof MailerError) {
    return err;
  }

  const errObj = typeof err === "object" && err !== null ? (err as Record<string, any>) : {};
  const code = errObj.code || (errObj.errno ? String(errObj.errno) : undefined);
  const response = errObj.response || "";
  const responseCode = typeof errObj.responseCode === "number" ? errObj.responseCode : undefined;
  const command = errObj.command || "";
  const rawMessage = err instanceof Error ? err.message : String(err);

  const upperCode = (code || "").toUpperCase();
  const upperMsg = rawMessage.toUpperCase();

  let reason: EmailFailureReason = "SEND_FAILED";

  if (
    upperCode === "MISSING_ENV" ||
    upperMsg.includes("MISSING REQUIRED") ||
    upperMsg.includes("GMAIL_USER") ||
    upperMsg.includes("GMAIL_APP_PASSWORD")
  ) {
    reason = "MISSING_ENV";
  } else if (
    upperCode === "EAUTH" ||
    upperMsg.includes("EAUTH") ||
    upperMsg.includes("535") ||
    upperMsg.includes("534") ||
    upperMsg.includes("AUTHENTICATION") ||
    upperMsg.includes("USERNAME AND PASSWORD NOT ACCEPTED")
  ) {
    reason = "EAUTH";
  } else if (
    upperCode === "ETIMEDOUT" ||
    upperCode === "ESOCKETTIMEDOUT" ||
    upperCode === "ECONNECTION" ||
    upperCode === "ECONNREFUSED" ||
    upperCode === "ECONNRESET" ||
    upperMsg.includes("TIMEOUT") ||
    upperMsg.includes("TIMEDOUT")
  ) {
    reason = "ETIMEDOUT";
  }

  return new MailerError(rawMessage, reason, { code, response, responseCode, command });
}

/**
 * Sends a 6-digit verification OTP email to the user.
 * Strictly awaits delivery and throws a typed MailerError on failure.
 */
export async function sendOtpEmail(to: string, code: string): Promise<{ messageId: string }> {
  const cleanTo = to.trim().toLowerCase();
  const cleanCode = code.trim();

  let transporter: Transporter;
  try {
    transporter = createMailerTransport();
  } catch (initErr) {
    const error = classifyMailerError(initErr);
    console.error("[MAILER INIT FAILED]", {
      to: cleanTo,
      reason: error.reason,
      message: error.message,
    });
    throw error;
  }

  const senderAddress = env.GMAIL_USER;
  const siteUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  const plainText = [
    "VN Mobiles - Verification Code",
    "",
    "Thank you for registering with VN Mobiles.",
    "",
    `Your 6-digit verification code: ${cleanCode}`,
    "",
    "This code expires in 5 minutes.",
    "If you did not request this verification code, please ignore this email.",
    "",
    `VN Mobiles India | ${siteUrl}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VN Mobiles Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f5f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #111827 0%, #1f2937 100%); text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">VN Mobiles</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #9ca3af;">Account Security Verification</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                Please use the following 6-digit verification code to complete your registration:
              </p>
              <!-- OTP Box -->
              <div style="background-color: #f9fafb; border: 2px dashed #C9A66B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827;">
                  ${cleanCode}
                </div>
              </div>
              <!-- Notice -->
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #b45309; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 10px 14px; font-weight: 500;">
                ⏱ This code expires in <strong>5 minutes</strong>.
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                If you did not request this code, no action is required and you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
              © ${new Date().getFullYear()} VN Mobiles. All rights reserved.<br>
              <a href="${siteUrl}" style="color: #6b7280; text-decoration: underline;">Visit Store</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const mailOptions = {
    from: `"VN Mobiles" <${senderAddress}>`,
    to: cleanTo,
    subject: `Your VN Mobiles Verification Code: ${cleanCode}`,
    text: plainText,
    html,
    headers: {
      "X-Mailer": "VN Mobiles Verification Mailer",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { messageId: info.messageId };
  } catch (err: unknown) {
    const error = classifyMailerError(err);
    console.error("[MAILER ERROR] Failed to send OTP email:", {
      to: cleanTo,
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      reason: error.reason,
    });
    throw error;
  }
}

/**
 * Validates the SMTP connection with Gmail servers.
 */
export async function verifyMailerConnection(): Promise<{ success: boolean; message: string }> {
  const transporter = createMailerTransport();
  await transporter.verify();
  return { success: true, message: "SMTP connection verified successfully." };
}

export default sendOtpEmail;

