import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { isOrderCancelled } from "@/lib/orderStatus";
import { getAppUrl } from "@/lib/appUrl";

/**
 * Gmail SMTP Email Gateway Integration (Backend Only)
 * 
 * Uses Nodemailer with Gmail SMTP:
 * Host: smtp.gmail.com
 * Port: 465 (Secure TLS)
 * 
 * Credentials are read strictly from server-side environment variables:
 * - GMAIL_USER
 * - GMAIL_APP_PASSWORD
 * 
 * Never hardcode or expose credentials to client-side code.
 */

export interface SendEmailOptions {
  userId?: string | null;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  emailType: "EMAIL_VERIFICATION" | "ORDER_CONFIRMATION" | "ORDER_STATUS" | "WARRANTY_NOTIFICATION" | "WARRANTY_REMINDER_6M" | "WARRANTY_REMINDER_1D" | "LOGIN_OTP" | "PASSWORD_RESET" | "ACCOUNT_DELETION_OTP" | "ACCOUNT_DELETED";
  orderId?: string | null;
  productName?: string | null;
  templateId?: string;
  variables?: Record<string, string | number | undefined>;
  contentSummary?: string;
  html?: string;
  text?: string;
}

export interface EmailSendResult {
  success: boolean;
  status: "SENT" | "FAILED";
  statusCode?: number;
  message: string;
  notificationId?: string;
  error?: string;
}

export function createTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER?.trim();
  // Strip all whitespace & spaces (Google displays App Passwords as 4 groups of 4: "abcd efgh ijkl mnop")
  const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();

  if (!user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // Serverless timeouts: prevent hanging executions in Vercel Lambdas
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000,     // 15s socket timeout
  });
}

// In serverless environments, create fresh or verify connections to avoid stale socket reuse
export function getTransporter(): Transporter | null {
  return createTransporter();
}

/**
 * Validates the live SMTP connection with Google Mail servers without sending an email.
 * Used by the /api/email-health diagnostic endpoint.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message?: string; error?: string; code?: string }> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "").trim();

  if (!user || !pass) {
    const missing: string[] = [];
    if (!user) missing.push("GMAIL_USER");
    if (!pass) missing.push("GMAIL_APP_PASSWORD");
    return {
      success: false,
      error: `Missing required environment variable(s): ${missing.join(", ")}`,
      code: "MISSING_CREDENTIALS",
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "Could not initialize nodemailer transporter.",
      code: "INIT_FAILED",
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection verified successfully with smtp.gmail.com as ${user}`,
    };
  } catch (err: unknown) {
    const errObj = (typeof err === "object" && err !== null) ? (err as Record<string, any>) : {};
    const code = errObj.code || (errObj.errno ? String(errObj.errno) : "UNKNOWN");
    const response = errObj.response || "";
    const message = err instanceof Error ? err.message : String(err);

    console.error(`[SMTP VERIFY ERROR] Code: ${code} | Response: ${response} | Message: ${message}`);
    return {
      success: false,
      code,
      error: `[${code}] ${message}${response ? ` (${response})` : ""}`,
    };
  }
}

/**
 * Sends a transactional email using Gmail SMTP and records
 * an audit entry in the EmailNotification table.
 */
export async function sendGmailEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const cleanRecipientEmail = options.recipientEmail.trim().toLowerCase();
  const recipientName = options.recipientName.trim();
  const userEmail = process.env.GMAIL_USER?.trim();

  // 1. Create initial audit record in DB with PENDING status
  let notificationRecord: { id: string } | null = null;
  try {
    let validUserId: string | null = null;
    if (options.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { id: true },
      });
      if (userExists) {
        validUserId = userExists.id;
      }
    }

    notificationRecord = await prisma.emailNotification.create({
      data: {
        userId: validUserId,
        recipientEmail: cleanRecipientEmail,
        recipientName,
        emailType: options.emailType,
        orderId: options.orderId || null,
        productName: options.productName || null,
        templateId: options.templateId || null,
        subject: options.subject,
        contentSummary: options.contentSummary || options.subject,
        status: "PENDING",
      },
    });
  } catch (dbErr) {
    console.error("[EMAIL AUDIT DB ERROR] Failed to record pending email:", dbErr);
  }

  // 2. Validate Gmail SMTP credentials
  const transporter = getTransporter();
  if (!transporter || !userEmail) {
    const errorMsg = "Gmail SMTP credentials (GMAIL_USER or GMAIL_APP_PASSWORD) are missing in environment variables.";
    console.error(`[GMAIL SMTP ERROR] ${errorMsg}`);

    if (notificationRecord) {
      await prisma.emailNotification.update({
        where: { id: notificationRecord.id },
        data: {
          status: "FAILED",
          errorMessage: errorMsg,
        },
      });
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: errorMsg,
      error: errorMsg,
      notificationId: notificationRecord?.id,
    };
  }

  // 3. Dispatch email via Nodemailer
  try {
    // Support custom sender / domain or fallback to authenticated Gmail account
    const customFrom = process.env.EMAIL_FROM?.trim();
    const fromAddress = customFrom || `"VN Mobiles" <${userEmail}>`;
    const replyTo = process.env.EMAIL_REPLY_TO?.trim() || userEmail;

    // Standard RFC deliverability headers - strictly NO artificial high-priority spam markers
    const deliverabilityHeaders: Record<string, string> = {
      "X-Mailer": "VN Mobiles Transactional Mailer",
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
    };

    // RFC 8058 compliant List-Unsubscribe for recurring notification types
    if (
      options.emailType === "WARRANTY_REMINDER_6M" ||
      options.emailType === "WARRANTY_REMINDER_1D" ||
      options.emailType === "ORDER_STATUS"
    ) {
      const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");
      deliverabilityHeaders["List-Unsubscribe"] = `<mailto:${replyTo}?subject=Unsubscribe-Notification>, <${siteUrl}/account/profile>`;
      deliverabilityHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }

    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${cleanRecipientEmail}>`,
      replyTo,
      subject: options.subject,
      text: options.text || options.contentSummary || options.subject,
      html: options.html,
      headers: deliverabilityHeaders,
    };

    console.log(`[GMAIL SMTP] Dispatching ${options.emailType} to ${cleanRecipientEmail} via smtp.gmail.com:465`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[GMAIL SMTP SUCCESS] Message sent. MessageId: ${info.messageId}`);

    if (notificationRecord) {
      await prisma.emailNotification.update({
        where: { id: notificationRecord.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      });
    }

    return {
      success: true,
      status: "SENT",
      statusCode: 200,
      message: "Email delivered successfully via Gmail SMTP.",
      notificationId: notificationRecord?.id,
    };
  } catch (err: unknown) {
    const errObj = (typeof err === "object" && err !== null) ? (err as Record<string, any>) : {};
    const errorCode = errObj.code || (errObj.errno ? String(errObj.errno) : "PROVIDER_ERROR");
    const errorResponse = errObj.response || "";
    const rawErrorMessage = err instanceof Error ? err.message : "Unknown error while sending email via Gmail SMTP.";
    const detailedErrorMessage = `[${errorCode}] ${rawErrorMessage}${errorResponse ? ` (${errorResponse})` : ""}`;

    console.error(
      `[GMAIL SMTP ERROR] Delivery failed to ${cleanRecipientEmail}:\n` +
      `  Error Code: ${errorCode}\n` +
      `  SMTP Response: ${errorResponse || "None"}\n` +
      `  Message: ${rawErrorMessage}`
    );

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "FAILED",
            errorMessage: detailedErrorMessage,
          },
        });
      } catch (logErr) {
        console.error("[EMAIL AUDIT DB UPDATE ERROR]", logErr);
      }
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: detailedErrorMessage,
      error: detailedErrorMessage,
      notificationId: notificationRecord?.id,
    };
  }
}

/**
 * Shared, compliant transactional email footer with physical address,
 * support links, and legal disclaimers to ensure high inbox placement.
 */
export function getEmailFooterHtml(options?: { showNotificationPreferences?: boolean }): string {
  const currentYear = new Date().getFullYear();
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 24px 32px; text-align: center; font-size: 11px; line-height: 1.6; color: #6B7280;">
      <tr>
        <td align="center">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #374151; font-size: 12px;">VN Mobiles India</p>
          <p style="margin: 0 0 8px 0; color: #6B7280;">
            Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100, India
          </p>
          <p style="margin: 0 0 10px 0;">
            <a href="${siteUrl}/account" style="color: #4B5563; text-decoration: underline; margin: 0 8px;">Your Account</a> &bull;
            <a href="${siteUrl}/orders" style="color: #4B5563; text-decoration: underline; margin: 0 8px;">Track Orders</a> &bull;
            <a href="mailto:support@vnmobiles.in" style="color: #4B5563; text-decoration: underline; margin: 0 8px;">Customer Support</a>
          </p>
          ${options?.showNotificationPreferences ? `
          <p style="margin: 0 0 8px 0; font-size: 10px; color: #9CA3AF;">
            You received this warranty notification because you purchased a smartphone with active Device Shield coverage on VN Mobiles.
            To manage notification preferences, visit your <a href="${siteUrl}/account/profile" style="color: #6B7280; text-decoration: underline;">Notification Settings</a>.
          </p>` : `
          <p style="margin: 0 0 8px 0; font-size: 10px; color: #9CA3AF;">
            This is an automated transactional message regarding your order or account activity on VN Mobiles.
          </p>`}
          <p style="margin: 0; font-size: 10px; color: #9CA3AF;">
            &copy; ${currentYear} VN Mobiles India. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function getEmailFooterText(options?: { showNotificationPreferences?: boolean }): string {
  const currentYear = new Date().getFullYear();
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");

  return [
    "",
    "---",
    "VN Mobiles India",
    "Electronics City Phase 1, Hosur Road, Bengaluru, Karnataka 560100, India",
    `Customer Support: support@vnmobiles.in | Your Account: ${siteUrl}/account`,
    options?.showNotificationPreferences
      ? `Manage warranty notifications: ${siteUrl}/account/profile`
      : "This is an automated transactional message regarding your order or account on VN Mobiles.",
    `(c) ${currentYear} VN Mobiles India. All rights reserved.`,
  ].join("\n");
}

// Backward-compatible alias for existing callers
export const sendMsg91Email = sendGmailEmail;
export const sendEmail = sendGmailEmail;

/**
 * Sends User Email Verification message with unique 5-minute OTP for VN Mobiles.
 * 
 * Optimized for high inbox deliverability:
 * - Direct, transactional content without spam trigger words
 * - Clean, standard HTML layout with high text-to-code ratio
 * - Identical plain-text representation
 * - Clear 5-minute expiry warning and security notice
 */

export type OtpEmailPurpose = 
  | "EMAIL_VERIFICATION" 
  | "PASSWORD_RESET" 
  | "LOGIN_OTP" 
  | "ACCOUNT_DELETION_OTP";

export interface SendOtpOptions {
  userId?: string | null;
  name: string;
  email: string;
  otp: string;
  purpose: OtpEmailPurpose;
  token?: string;
  expiresInMinutes?: number;
}

/**
 * ONE shared email helper for all OTP flows (signup, resend code, forgot password, delete account).
 * Guarantees identical deliverability, styling, error logging, and audit tracking.
 * Strictly avoids logging or storing the plain OTP in EmailNotification.
 */
export async function sendOtpEmail(options: SendOtpOptions): Promise<EmailSendResult> {
  const codeDisplay = (options.otp || "").slice(0, 6);
  const cleanEmail = options.email.trim().toLowerCase();
  const cleanName = options.name?.trim() || "Customer";
  const minutes = options.expiresInMinutes || (options.purpose === "ACCOUNT_DELETION_OTP" ? 10 : 5);
  const digits = codeDisplay.padEnd(6, "•").split("");

  let subject = "Your VN Mobiles verification code";
  let title = "Verification Code";
  let description = "Please enter the 6-digit code below to proceed with your request:";
  let securityWarning = "If you did not request this verification code, please ignore this email. Your account remains secure.";

  if (options.purpose === "EMAIL_VERIFICATION") {
    subject = "Your VN Mobiles verification code";
    title = "Verify Your Account";
    description = "Welcome to VN Mobiles! Please enter the 6-digit verification code below to verify your email address:";
    securityWarning = "If you did not create an account with VN Mobiles, please disregard this email.";
  } else if (options.purpose === "PASSWORD_RESET") {
    subject = "Reset your VN Mobiles password";
    title = "Password Reset Code";
    description = "We received a request to reset the password for your VN Mobiles account. Use this 6-digit code to proceed:";
    securityWarning = "If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged.";
  } else if (options.purpose === "LOGIN_OTP") {
    subject = "Your VN Mobiles Login Code";
    title = "Login Verification Code";
    description = "Use this 6-digit security code to sign in to your VN Mobiles account:";
    securityWarning = "If you did not attempt to sign in, please update your account password immediately.";
  } else if (options.purpose === "ACCOUNT_DELETION_OTP") {
    subject = "Action Required: Verification Code to Delete Your VN Mobiles Account";
    title = "⚠️ Account Deletion Authorization";
    description = "We received a request to permanently delete your VN Mobiles customer account. Use this code to authorize deletion:";
    securityWarning = "WARNING: Entering this code will permanently delete your account, saved preferences, and wishlist. If you did not request this, change your password immediately.";
  }

  const plainText = [
    subject,
    "",
    `Dear ${cleanName},`,
    "",
    description,
    "",
    `Verification Code: ${codeDisplay}`,
    "",
    `This code expires in ${minutes} minutes.`,
    "",
    securityWarning,
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.05);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, #C9A66B 0%, #E5CBA2 50%, #C9A66B 100%);"></td>
          </tr>
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <div style="font-size:16px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;">VN MOBILES</div>
                    <div style="font-size:10px;font-weight:700;color:#8C6226;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">SECURITY VERIFICATION</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:10px;font-weight:700;padding:4px 10px;border-radius:9999px;">
                      ⏱ ${minutes} min expiry
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 32px 36px;">
              <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;color:#0F172A;letter-spacing:-0.2px;">
                ${title}
              </h2>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
                Hello <strong>${cleanName}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
                ${description}
              </p>
              <div style="background-color:#FAF8F5;border:1px solid #EBE4D6;border-radius:14px;padding:24px 20px;text-align:center;margin:0 0 24px 0;">
                <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#8C6226;letter-spacing:1.8px;margin-bottom:16px;">
                  YOUR 6-DIGIT CODE
                </div>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                  <tr>
                    ${digits.map((digit) => `
                      <td style="padding:0 3px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td align="center" valign="middle" style="width:44px;height:52px;background-color:#FFFFFF;border:2px solid #D8CABB;border-radius:10px;font-size:24px;font-weight:800;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-align:center;vertical-align:middle;box-shadow:0 2px 4px rgba(140,98,38,0.06);">
                              ${digit}
                            </td>
                          </tr>
                        </table>
                      </td>
                    `).join("")}
                  </tr>
                </table>
                <div style="margin-top:14px;font-size:11px;color:#cf222e;font-weight:600;">
                  Expires in ${minutes} minutes &bull; Single-use only
                </div>
              </div>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;font-size:12px;line-height:1.6;color:#64748B;">
                <strong>Security Notice:</strong> ${securityWarning}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Explicitly avoid storing plain OTPs in the database contentSummary
  return sendGmailEmail({
    userId: options.userId,
    recipientName: cleanName,
    recipientEmail: cleanEmail,
    subject,
    emailType: options.purpose,
    contentSummary: `Security verification code dispatched for ${options.purpose}. Valid for ${minutes} minutes.`,
    text: plainText,
    html,
  });
}

export async function sendUserVerificationEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  _token?: string,
  otp?: string
): Promise<EmailSendResult> {
  const codeDisplay = (otp || "").slice(0, 6);

  const plainText = [
    "Your VN Mobiles verification code",
    "",
    `Hi ${user.name},`,
    "",
    "You recently requested a verification code for your VN Mobiles account.",
    "",
    `Verification Code: ${codeDisplay}`,
    "",
    "This code expires in 5 minutes.",
    "",
    "If you did not request this verification code, please ignore this email. No changes have been made to your account.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your VN Mobiles verification code</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#24292f;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:500px;background-color:#ffffff;border:1px solid #d0d7de;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #f0f2f5;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#1f2328;letter-spacing:-0.2px;">VN Mobiles</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#24292f;">
                Hi <strong>${user.name}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#57606a;">
                You recently requested a verification code for your VN Mobiles account. Please enter the following code to complete your verification:
              </p>
              <div style="background-color:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#57606a;letter-spacing:1px;margin-bottom:6px;">Verification Code</div>
                <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#1f2328;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${codeDisplay}</div>
                <div style="margin-top:8px;font-size:12px;color:#cf222e;font-weight:600;">Expires in 5 minutes</div>
              </div>
              <p style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#57606a;">
                If you did not request this verification code, please ignore this email. No changes have been made to your account.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "Your VN Mobiles verification code",
    emailType: "EMAIL_VERIFICATION",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends User Invitation Email with a secure registration link.
 */
export async function sendUserInvitationEmail(options: {
  recipientEmail: string;
  inviteLink: string;
  invitedBy?: string;
  expiresInHours?: number;
}): Promise<EmailSendResult> {
  const expiresInHours = options.expiresInHours || 48;
  const plainText = [
    "You're Invited to Join VN Mobiles",
    "",
    "Hello,",
    "",
    "You have been invited by the store administration to create an account on VN Mobiles.",
    "",
    "Click the link below to select your unique username and complete your registration:",
    options.inviteLink,
    "",
    `• Valid for ${expiresInHours} hours`,
    "• Single Use Only",
    "",
    "If you were not expecting this invitation, you can safely ignore this email.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join VN Mobiles</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:540px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.06),0 8px 10px -6px rgba(15,23,42,0.03);">
          
          <!-- Top Gold Accent Line -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, #C9A66B 0%, #E5CBA2 50%, #C9A66B 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:36px;height:36px;background-color:#0F172A;border:1px solid #C9A66B;border-radius:10px;text-align:center;vertical-align:middle;color:#C9A66B;font-weight:800;font-size:14px;letter-spacing:-0.5px;">
                          VN
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;">VN MOBILES</div>
                          <div style="font-size:10px;font-weight:700;color:#8C6226;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">OFFICIAL INVITATION</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 12px;border-radius:9999px;">
                      ✨ EXCLUSIVE ACCESS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 36px 24px 36px;">
              <h2 style="margin:0 0 10px 0;font-size:20px;font-weight:700;color:#0F172A;letter-spacing:-0.2px;">
                You&apos;re Invited!
              </h2>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
                You have been personally invited to create a member account on <strong>VN Mobiles</strong>.
              </p>
              <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:#64748B;">
                Click the secure registration button below to choose your unique username, establish your password, and start exploring verified smartphones with Device Shield warranty coverage:
              </p>

              <!-- Action Card -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:26px 20px;text-align:center;margin:0 0 24px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto;">
                  <tr>
                    <td align="center">
                      <a href="${options.inviteLink}" target="_blank" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;border:1px solid #C9A66B;padding:14px 32px;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 4px 6px -1px rgba(15,23,42,0.15);letter-spacing:0.2px;">
                        🚀 Accept Invitation & Register &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Status Badges -->
                <div style="display:inline-block;">
                  <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;margin-right:6px;">
                    ⏱ Valid for ${expiresInHours} hours
                  </span>
                  <span style="display:inline-block;background-color:#F1F5F9;border:1px solid #E2E8F0;color:#475569;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;">
                    🔒 Single Use Only
                  </span>
                </div>
              </div>

              <!-- Fallback Direct URL Box -->
              <div style="background-color:#FFFFFF;border:1px dashed #CBD5E1;border-radius:10px;padding:14px;margin:0 0 24px 0;">
                <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:6px;">
                  Button not opening? Copy and paste this link in your browser:
                </div>
                <div style="font-size:11px;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;color:#0F172A;word-break:break-all;background-color:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid #E2E8F0;user-select:all;-webkit-user-select:all;">
                  ${options.inviteLink}
                </div>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748B;">
                If you were not expecting this invitation, no action is needed. Your email will not receive any further messages.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    recipientName: "Invited Member",
    recipientEmail: options.recipientEmail,
    subject: "You're Invited to Join VN Mobiles",
    emailType: "EMAIL_VERIFICATION",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends User Login Verification Code (OTP) via Gmail SMTP for VN Mobiles.
 */
export async function sendLoginOtpEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  otp: string
): Promise<EmailSendResult> {
  const codeDisplay = (otp || "").slice(0, 6);
  const digits = codeDisplay.padEnd(6, "•").split("");

  const plainText = [
    `Dear ${user.name || "Customer"},`,
    "",
    `${codeDisplay} is the OTP to login to your VN Mobiles account. OTP is valid for next 5 mins.`,
    "",
    "If you did not attempt to sign in, no action is needed. Your account remains protected.",
    "",
    "Regards,",
    "VN Mobiles Team",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP for VN Mobiles Login</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:520px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.05),0 8px 10px -6px rgba(15,23,42,0.03);">
          
          <!-- Top Gold Accent Line -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, #C9A66B 0%, #E5CBA2 50%, #C9A66B 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:36px;height:36px;background-color:#0F172A;border:1px solid #C9A66B;border-radius:10px;text-align:center;vertical-align:middle;color:#C9A66B;font-weight:800;font-size:14px;letter-spacing:-0.5px;">
                          VN
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;">VN MOBILES</div>
                          <div style="font-size:10px;font-weight:700;color:#8C6226;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">SECURITY VERIFICATION</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:10px;font-weight:700;letter-spacing:0.5px;padding:4px 10px;border-radius:9999px;">
                      ⏱ Valid for 5 mins
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding:28px 36px 32px 36px;">
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#1E293B;">
                Dear <strong>${user.name || "Customer"}</strong>,
              </p>
              
              <!-- Direct Sentence Pattern Matching Gmail's Smart OTP Extraction -->
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#334155;">
                <strong>${codeDisplay}</strong> is the OTP to login to your VN Mobiles account. OTP is valid for next 5 mins.
              </p>

              <!-- OTP Card Section - Light, Clean & Premium -->
              <div style="background-color:#FAF8F5;border:1px solid #EBE4D6;border-radius:14px;padding:24px 20px 24px 20px;text-align:center;margin:0 0 24px 0;">
                
                <!-- Title & Badge -->
                <div style="margin-bottom:18px;">
                  <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:11px;font-weight:700;padding:4px 12px;border-radius:9999px;margin-bottom:10px;">
                    ⏱ Valid for 5 mins
                  </span>
                  <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#8C6226;letter-spacing:1.8px;">
                    ENTER 6-DIGIT CODE
                  </div>
                </div>

                <!-- 6 Separate Clean Boxes -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                  <tr>
                    ${digits.map((digit) => `
                      <td style="padding:0 3px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td align="center" valign="middle" style="width:44px;height:52px;background-color:#FFFFFF;border:2px solid #D8CABB;border-radius:10px;font-size:24px;font-weight:800;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace;text-align:center;vertical-align:middle;box-shadow:0 2px 4px rgba(140,98,38,0.06);user-select:all;-webkit-user-select:all;">
                              ${digit}
                            </td>
                          </tr>
                        </table>
                      </td>
                    `).join("")}
                  </tr>
                </table>

              </div>

              <!-- Security Notice -->
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">
                If you did not attempt to sign in, no action is needed. Your account remains protected and this code will expire automatically.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "OTP for VN Mobiles Login",
    emailType: "LOGIN_OTP",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends Password Reset Code and Link via Gmail SMTP for VN Mobiles.
 */
export async function sendPasswordResetEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  otp: string,
  token?: string
): Promise<EmailSendResult> {
  return sendOtpEmail({
    userId: user.id,
    name: user.name,
    email: user.email,
    otp,
    purpose: "PASSWORD_RESET",
    token,
    expiresInMinutes: 5,
  });
}

/**
 * Sends Admin Login OTP code to rrroyce20@gmail.com
 */
export async function sendAdminLoginOtpEmail(
  admin: { id: string; email: string; name?: string },
  otp: string
): Promise<EmailSendResult> {
  const codeDisplay = (otp || "").slice(0, 6);
  const plainText = [
    "VN Mobiles Administrator Portal - One-Time Login Code",
    "",
    "Hello Administrator,",
    "",
    "You requested to sign in to the VN Mobiles Admin Control Desk using a one-time verification code.",
    "",
    `Admin Login Code: ${codeDisplay}`,
    "",
    "This one-time passcode is strictly confidential and expires in 5 minutes.",
    "",
    "If you did not initiate this sign-in attempt, please check your administrative account security immediately.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>VN Mobiles Admin Login Code</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:500px;background-color:#1e293b;border:1px solid #334155;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #334155;background-color:#0f172a;">
              <div style="font-size:11px;font-weight:700;color:#c9a66b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Restricted Access</div>
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">VN Mobiles • Admin Portal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Hello <strong>Administrator</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                Use the following secure one-time passcode (OTP) to sign in to the VN Mobiles Admin Control Desk:
              </p>
              <div style="background-color:#0f172a;border:1px solid #c9a66b;border-radius:10px;padding:22px;text-align:center;margin:24px 0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#c9a66b;letter-spacing:1.5px;margin-bottom:8px;">Admin Passcode</div>
                <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#ffffff;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${codeDisplay}</div>
                <div style="margin-top:10px;font-size:12px;color:#f59e0b;font-weight:600;">Valid for 5 minutes • Single Use</div>
              </div>
              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                ⚠️ This authorization code grants administrative control desk access. Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;font-size:11px;color:#64748b;">
              VN Mobiles Admin Security • Authorized Personnel Only
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: admin.email,
    subject: "VN Mobiles Admin Portal: Your Login Verification Code",
    emailType: "LOGIN_OTP",
    contentSummary: "VN Mobiles Admin Portal: Login Verification Code dispatched (5-minute expiry).",
    text: plainText,
    html,
  });
}

/**
 * Sends Admin Password Reset Link to rrroyce20@gmail.com
 */
/**
 * Sends Admin Email Verification OTP code to rrroyce20@gmail.com
 */
export async function sendAdminVerificationEmail(
  admin: { id: string; email: string; name?: string },
  _token?: string,
  otp?: string
): Promise<EmailSendResult> {
  const codeDisplay = (otp || "").slice(0, 6);
  const plainText = [
    "VN Mobiles Administrator Portal - Email Verification Code",
    "",
    "Hello Administrator,",
    "",
    "You requested email verification for your VN Mobiles Administrator account (rrroyce20@gmail.com).",
    "",
    `Admin Verification Code: ${codeDisplay}`,
    "",
    "This one-time passcode is strictly confidential and expires in 5 minutes.",
    "",
    "If you did not initiate this verification attempt, please check your administrative account security immediately.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>VN Mobiles Admin Email Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:500px;background-color:#1e293b;border:1px solid #334155;border-radius:14px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #334155;background-color:#0f172a;">
              <div style="font-size:11px;font-weight:700;color:#c9a66b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Restricted Access</div>
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">VN Mobiles • Admin Portal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#e2e8f0;">
                Hello <strong>Administrator</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;line-height:1.6;color:#94a3b8;">
                You requested email verification for your VN Mobiles Administrator account (<strong style="color:#ffffff;">rrroyce20@gmail.com</strong>). Enter the following secure 6-digit verification code to complete verification:
              </p>
              <div style="background-color:#0f172a;border:1px solid #c9a66b;border-radius:10px;padding:22px;text-align:center;margin:24px 0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#c9a66b;letter-spacing:1.5px;margin-bottom:8px;">Admin Verification Code</div>
                <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#ffffff;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${codeDisplay}</div>
                <div style="margin-top:10px;font-size:12px;color:#f59e0b;font-weight:600;">Valid for 5 minutes • Single Use</div>
              </div>
              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                ⚠️ This authorization code confirms administrative privileges for rrroyce20@gmail.com. Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#0f172a;border-top:1px solid #334155;text-align:center;font-size:11px;color:#64748b;">
              VN Mobiles Admin Security • Authorized Personnel Only
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: "rrroyce20@gmail.com",
    subject: "VN Mobiles Admin Portal: Your 6-Digit Email Verification Code",
    emailType: "EMAIL_VERIFICATION",
    contentSummary: "VN Mobiles Admin Portal: Email Verification Code dispatched (5-minute expiry).",
    text: plainText,
    html,
  });
}

export async function sendAdminPasswordResetEmail(
  admin: { id: string; email: string; name?: string },
  resetLink: string,
  expiresInMinutes: number = 60
): Promise<EmailSendResult> {
  const plainText = [
    "VN Mobiles Administrator Portal - Password Reset Link",
    "",
    "Hello Administrator,",
    "",
    "A password reset request was initiated for your Administrator Account.",
    "",
    `Direct Password Reset Link: ${resetLink}`,
    "",
    `• Valid for ${expiresInMinutes} minutes (1 hour)`,
    "• Single Use Only",
    "",
    "Security Advisory: This authorization link allows modifying administrator credentials. If you did not request this recovery, ignore this message—your current credentials remain secure.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VN Mobiles Admin Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:540px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.06),0 8px 10px -6px rgba(15,23,42,0.03);">
          
          <!-- Top Gold Accent Line -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg, #C9A66B 0%, #E5CBA2 50%, #C9A66B 100%);"></td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding:28px 36px 20px 36px;border-bottom:1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:36px;height:36px;background-color:#0F172A;border:1px solid #C9A66B;border-radius:10px;text-align:center;vertical-align:middle;color:#C9A66B;font-weight:800;font-size:14px;letter-spacing:-0.5px;">
                          VN
                        </td>
                        <td style="padding-left:12px;vertical-align:middle;">
                          <div style="font-size:15px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;line-height:1.2;">VN MOBILES</div>
                          <div style="font-size:10px;font-weight:700;color:#8C6226;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">PASSWORD RECOVERY</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 12px;border-radius:9999px;">
                      🔒 RESTRICTED ACCESS
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:32px 36px 24px 36px;">
              <h2 style="margin:0 0 10px 0;font-size:18px;font-weight:700;color:#0F172A;letter-spacing:-0.2px;">
                Hello Administrator,
              </h2>
              <p style="margin:0 0 24px 0;font-size:13px;line-height:1.6;color:#475569;">
                A password reset request was initiated for your <strong>Administrator Account</strong> (<strong style="color:#0F172A;">${admin.email}</strong>). Click the secure button below to set your new administrator credentials:
              </p>

              <!-- Prominent Reset Action Box -->
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:28px 24px;text-align:center;margin:0 0 24px 0;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;letter-spacing:1.8px;margin-bottom:14px;">
                  PASSWORD RECOVERY ACTION
                </div>

                <!-- Primary CTA Button -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto;">
                  <tr>
                    <td align="center">
                      <a href="${resetLink}" target="_blank" style="display:inline-block;background-color:#0F172A;color:#FFFFFF;border:1px solid #C9A66B;padding:14px 32px;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;box-shadow:0 4px 6px -1px rgba(15,23,42,0.15);letter-spacing:0.2px;">
                        🔑 Set New Administrator Password &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Status Badges -->
                <div style="display:inline-block;margin-top:4px;">
                  <span style="display:inline-block;background-color:#FEF3C7;border:1px solid #FDE68A;color:#92400E;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;margin-right:6px;">
                    ⏱ Valid for ${expiresInMinutes} minutes
                  </span>
                  <span style="display:inline-block;background-color:#F1F5F9;border:1px solid #E2E8F0;color:#475569;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;">
                    🔒 Single Use Only
                  </span>
                </div>
              </div>

              <!-- Fallback Direct URL Box with Click-to-Copy -->
              <div style="background-color:#FFFFFF;border:1px dashed #CBD5E1;border-radius:10px;padding:14px;margin:0 0 24px 0;">
                <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:6px;">
                  Button not working? Copy and paste this link in your browser:
                </div>
                <div style="font-size:11px;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;color:#0F172A;word-break:break-all;background-color:#F8FAFC;padding:8px 10px;border-radius:6px;border:1px solid #E2E8F0;user-select:all;-webkit-user-select:all;">
                  ${resetLink}
                </div>
              </div>

              <!-- Security Warning Box -->
              <div style="background-color:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:8px;padding:14px 16px;margin:0 0 24px 0;">
                <strong style="display:block;margin-bottom:4px;color:#92400E;font-size:12px;">
                  ⚠️ Security Advisory
                </strong>
                <span style="display:block;color:#78350F;font-size:12px;line-height:1.5;">
                  This recovery link grants administrative authorization. Never forward or share this link. If you did not initiate this request, your administrator password remains secure and unchanged.
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#64748B;">
                Sent strictly to authorized administrator (<strong>${admin.email}</strong>).
              </p>
              <p style="margin:0;font-size:10px;color:#94A3B8;">
                VN Mobiles India &bull; Enterprise Security Infrastructure &bull; Automated Dispatch
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: admin.email,
    subject: "VN Mobiles Admin Portal: Password Reset Link",
    emailType: "PASSWORD_RESET",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends Order Confirmation Email when a customer places an order.
 */
export async function sendOrderConfirmationEmail(order: {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    selectedStorage?: string;
    selectedColor?: string;
    imeiNumber?: string;
  }>;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): Promise<EmailSendResult> {
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");
  const primaryItem = order.items[0];
  const formattedTotal = `₹${order.totalAmount.toLocaleString("en-IN")}`;
  const totalQty = order.items.reduce((s, i) => s + (i.quantity || 1), 0);
  const formattedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const plainTextItems = order.items
    .map(
      (item) =>
        `- ${item.productName}${item.selectedStorage ? ` (${item.selectedStorage})` : ""}${item.selectedColor ? ` [${item.selectedColor}]` : ""} x ${item.quantity || 1} = ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}`
    )
    .join("\n");

  const plainText = [
    `Order Confirmation #${order.orderNumber} - VN Mobiles`,
    "",
    `Hi ${order.customerName},`,
    "",
    `Thank you for shopping with VN Mobiles! We have received your order #${order.orderNumber} placed on ${formattedDate}.`,
    "",
    "ORDER SUMMARY:",
    plainTextItems,
    "",
    `Total Items: ${totalQty}`,
    `Total Amount: ${formattedTotal} (Inclusive of all taxes)`,
    `Payment Method: Prepaid / Online Verification`,
    "",
    "DELIVERY & PROTECTION:",
    order.address ? `Shipping Address: ${order.address}, ${order.city || ""} ${order.pincode || ""}` : "",
    "Device Protection: 1-Year Official Manufacturer Warranty is activated for your purchased smartphone(s).",
    `Track your shipment: ${siteUrl}/track/${order.orderNumber}`,
    "",
    "We are preparing your shipment with tamper-evident packaging and will notify you with courier tracking information once dispatched.",
    "",
    getEmailFooterText(),
  ]
    .filter(Boolean)
    .join("\n");

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #1F2937;">
        <strong style="color: #111827;">${item.productName}</strong>
        ${item.selectedStorage ? `<span style="color: #6B7280; font-size: 12px;"> &bull; ${item.selectedStorage}</span>` : ""}
        ${item.selectedColor ? `<span style="color: #6B7280; font-size: 12px;"> &bull; ${item.selectedColor}</span>` : ""}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: center; color: #4B5563;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: right; font-weight: 600; color: #111827;">
        ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
      </td>
    </tr>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation #${order.orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text for inbox -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF;">
    Thank you for your order! Your VN Mobiles order #${order.orderNumber} is confirmed and being prepared for shipment.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle; letter-spacing: -0.3px;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Order #${order.orderNumber}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #059669; letter-spacing: 0.5px; margin-bottom: 4px;">
                Order Confirmed
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">
                Thank you for your purchase, ${order.customerName}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                We have received your order <strong style="color: #111827;">#${order.orderNumber}</strong> placed on ${formattedDate}. Your smartphone is currently being prepared for dispatch with insured courier shipping.
              </p>

              <!-- Order Summary Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #E5E7EB; text-align: left; font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th style="padding-bottom: 10px;">Item Description</th>
                    <th style="padding-bottom: 10px; text-align: center;">Qty</th>
                    <th style="padding-bottom: 10px; text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="2" style="padding-top: 14px; font-size: 13px; color: #6B7280;">Subtotal</td>
                    <td style="padding-top: 14px; font-size: 13px; color: #111827; text-align: right; font-weight: 500;">${formattedTotal}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 6px; font-size: 13px; color: #6B7280;">Shipping & Express Insurance</td>
                    <td style="padding-top: 6px; font-size: 13px; color: #059669; text-align: right; font-weight: 600;">FREE</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 14px; font-weight: 700; color: #111827;">Total Paid</td>
                    <td style="padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 16px; font-weight: 800; color: #111827; text-align: right;">${formattedTotal}</td>
                  </tr>
                </tbody>
              </table>

              <!-- Device Shield Info Box -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <div style="font-weight: 700; font-size: 13px; color: #1E293B; margin-bottom: 4px;">
                  Device Shield 1-Year Warranty Included
                </div>
                <div style="font-size: 12px; color: #64748B; line-height: 1.5;">
                  Your device is covered by official manufacturer warranty starting today. Registered IMEI details and warranty status are available anytime in your VN Mobiles account.
                </div>
              </div>

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/orders" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                      View Order & Track Delivery
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliant Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendGmailEmail({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order Confirmation #${order.orderNumber} - VN Mobiles`,
    emailType: "ORDER_CONFIRMATION",
    orderId: order.id,
    productName: primaryItem ? primaryItem.productName : "Mobile Phone",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends Order Status Update Email when status changes.
 */
export async function sendOrderStatusEmail(
  order: {
    id: string;
    orderNumber: string;
    userId?: string | null;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    orderStatus: string;
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
  },
  newStatus: string,
  note?: string,
  extra?: {
    phoneName?: string;
    items?: Array<{ productName: string; quantity: number; price: number; selectedStorage?: string | null }>;
  }
): Promise<EmailSendResult> {
  const isCancelled = isOrderCancelled(newStatus);
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");
  const formattedTotal = Number(order.totalAmount || 0).toLocaleString("en-IN");
  const phoneName =
    extra?.phoneName ||
    (extra?.items && extra.items.map((i) => i.productName).filter(Boolean).join(", ")) ||
    "Smartphone";

  // Dedicated Cancellation Email flow
  if (isCancelled) {
    const subject = `Your order for ${phoneName} has been cancelled (Order #${order.orderNumber}) - VN Mobiles`;
    const plainText = [
      `Your order for ${phoneName} has been cancelled - VN Mobiles`,
      "",
      `Hi ${order.customerName},`,
      "",
      `Your order for ${phoneName} has been cancelled and the amount will be refunded.`,
      "",
      "Cancellation & Refund Summary:",
      `• Smartphone: ${phoneName}`,
      `• Order Number: #${order.orderNumber}`,
      `• Refund Amount: ₹${formattedTotal}`,
      "• Refund Destination: Original Payment Method",
      "• Timeline: Credited within 3-5 business days to your original bank/card account",
      note ? `• Additional Note: ${note}` : "",
      "",
      "Stock Restocked: The reserved inventory for this smartphone has been restored to our warehouse.",
      "Live shipment tracking has been disabled for this cancelled order.",
      "",
      `You can review your archived cancelled orders anytime at: ${siteUrl}/orders?tab=cancelled`,
      "",
      "If you have any questions or did not authorize this cancellation, please contact our support desk immediately at support@vnmobiles.in.",
      "",
      getEmailFooterText(),
    ]
      .filter(Boolean)
      .join("\n");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your order for ${phoneName} has been cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px; font-mono;">
                    Order #${order.orderNumber}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="display: inline-block; background-color: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
                Order Cancellation Notice
              </div>

              <h2 style="margin: 0 0 14px 0; font-size: 22px; font-weight: 800; color: #111827; line-height: 1.3;">
                Order Cancelled
              </h2>

              <!-- Requested user-friendly message with Phone Name -->
              <div style="background-color: #FFF7ED; border-left: 4px solid #EA580C; padding: 16px 18px; border-radius: 8px; margin: 0 0 24px 0;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #9A3412;">
                  Your order for <strong>${phoneName}</strong> has been cancelled and the amount will be refunded.
                </p>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${order.customerName}</strong>,<br>
                We have processed the cancellation for Order <strong>#${order.orderNumber}</strong>. The reserved stock for <strong>${phoneName}</strong> has been restored to warehouse inventory, and live tracking for this package has been removed.
              </p>

              <!-- Refund & Cancellation Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; margin: 20px 0; font-size: 13px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #6B7280; width: 40%;">Smartphone / Item</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #111827; font-weight: 700;">${phoneName}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Order Number</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #111827; font-family: monospace; font-weight: 600;">#${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Refund Amount</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #DC2626; font-weight: 800; font-size: 15px;">₹${formattedTotal}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">Refund Destination</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #E5E7EB; color: #111827; font-weight: 600;">Original Payment Method</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; color: #6B7280;">Refund Processing Time</td>
                  <td style="padding: 14px 18px; color: #059669; font-weight: 600;">3–5 Business Days</td>
                </tr>
              </table>

              ${note ? `
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin: 18px 0; font-size: 12px; color: #475569;">
                  <strong>Cancellation Note:</strong> ${note}
                </div>
              ` : ""}

              <div style="text-align: center; margin: 28px 0 10px 0;">
                <a href="${siteUrl}/orders?tab=cancelled" target="_blank" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 4px;">
                  View Cancelled Orders
                </a>
                <a href="${siteUrl}" target="_blank" style="display: inline-block; background-color: #F3F4F6; color: #1F2937; border: 1px solid #D1D5DB; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; margin: 4px;">
                  Browse Latest Mobiles
                </a>
              </div>
            </td>
          </tr>

          <!-- Compliant Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    return sendGmailEmail({
      userId: order.userId,
      recipientName: order.customerName,
      recipientEmail: order.customerEmail,
      subject,
      emailType: "ORDER_STATUS",
      orderId: order.id,
      productName: phoneName,
      contentSummary: plainText,
      text: plainText,
      html,
    });
  }

  // Active / in-flight status update
  const readableStatus = newStatus.replace(/_/g, " ");
  const trackingInfo = order.trackingNumber
    ? `\nCarrier: ${order.shippingCarrier || "Standard Delivery"}\nTracking Number: ${order.trackingNumber}`
    : "";

  const plainText = [
    `Order #${order.orderNumber} Status: ${readableStatus} - VN Mobiles`,
    "",
    `Hi ${order.customerName},`,
    "",
    `The status of your order #${order.orderNumber} has been updated to: ${readableStatus}.`,
    trackingInfo,
    note ? `Update Note: ${note}` : "",
    "",
    "You can view complete shipment tracking details in your account anytime.",
    "",
    getEmailFooterText(),
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${order.orderNumber} Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Order #${order.orderNumber}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 0.5px; margin-bottom: 4px;">
                Shipment & Order Status
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">
                Order Status Update
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${order.customerName}</strong>,<br>
                The fulfillment status of your order <strong>#${order.orderNumber}</strong> has been updated:
              </p>

              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #166534; display: block; margin-bottom: 4px;">Current Status</span>
                <span style="font-size: 18px; font-weight: 800; color: #15803D;">${readableStatus}</span>
              </div>

              ${order.trackingNumber ? `
                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px;">
                  <p style="margin: 0 0 4px 0; color: #6B7280;">Carrier: <strong style="color: #1F2937;">${order.shippingCarrier || "Standard Delivery"}</strong></p>
                  <p style="margin: 0; color: #6B7280;">Tracking Number: <strong style="color: #1F2937; font-family: monospace;">${order.trackingNumber}</strong></p>
                </div>
              ` : ""}

              ${note ? `
                <div style="background-color: #FFFDF9; border-left: 3px solid #C9A66B; padding: 12px 14px; margin: 16px 0; font-size: 13px; color: #4B5563;">
                  <strong>Customer Note:</strong> ${note}
                </div>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendGmailEmail({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order #${order.orderNumber} Status: ${readableStatus} - VN Mobiles`,
    emailType: "ORDER_STATUS",
    orderId: order.id,
    productName: phoneName,
    contentSummary: plainText,
    text: plainText,
    html,
  });
}


/**
 * Sends Mobile Warranty Activation Email.
 */
export async function sendWarrantyActivationEmail(warranty: {
  id: string;
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  imeiNumber: string;
  purchaseDate: Date;
  warrantyDuration: string;
  warrantyStartDate: Date;
  warrantyExpiryDate: Date;
}): Promise<EmailSendResult> {
  const purchaseFormatted = warranty.purchaseDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const expiryFormatted = warranty.warrantyExpiryDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const plainText = [
    `Warranty Certificate for ${warranty.productName} - VN Mobiles`,
    "",
    `Hi ${warranty.customerName},`,
    "",
    `Your official 1-year manufacturer warranty is active for ${warranty.productName}.`,
    "",
    "WARRANTY DETAILS:",
    `- Device Model: ${warranty.productName}`,
    `- Order Number: #${warranty.orderNumber}`,
    `- Registered IMEI: ${warranty.imeiNumber}`,
    `- Purchase Date: ${purchaseFormatted}`,
    `- Warranty Coverage: ${warranty.warrantyDuration}`,
    `- Expiration Date: ${expiryFormatted}`,
    "- Coverage Status: Active",
    "",
    "Your smartphone is protected by VN Mobiles Device Shield against manufacturing defects.",
    "",
    getEmailFooterText({ showNotificationPreferences: true }),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Certificate - VN Mobiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Device Shield
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #059669; letter-spacing: 0.5px; margin-bottom: 4px;">
                Protection Activated
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">
                Warranty Certificate
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${warranty.customerName}</strong>,<br>
                Official manufacturer warranty protection has been activated on your purchased smartphone.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Product:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Order Number:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">#${warranty.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Registered IMEI:</td>
                  <td style="font-family: ui-monospace, monospace; font-weight: 600; color: #8C6226; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Coverage Duration:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">${warranty.warrantyDuration}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Expires On:</td>
                  <td style="font-weight: 700; color: #059669; text-align: right; padding: 6px 0;">${expiryFormatted}</td>
                </tr>
              </table>

              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #065F46;">
                Status: ACTIVE Coverage
              </div>
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml({ showNotificationPreferences: true })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject: `Warranty Certificate for ${warranty.productName} - VN Mobiles`,
    emailType: "WARRANTY_NOTIFICATION",
    orderId: warranty.orderId,
    productName: warranty.productName,
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends 6-Month Warranty Expiry Reminder Email.
 * Triggered exactly 6 months prior to coverage expiration.
 */
export async function sendWarrantyReminder6MonthsEmail(warranty: {
  id: string;
  orderId: string;
  orderNumber?: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  imeiNumber: string;
  warrantyExpiryDate: Date;
  warrantyDuration?: string;
}): Promise<EmailSendResult> {
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");
  const expiryFormatted = new Date(warranty.warrantyExpiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const plainText = [
    `Warranty Notice: 6 months of coverage remaining for ${warranty.productName}`,
    "",
    `Dear ${warranty.customerName},`,
    "",
    `This is a scheduled service notice from VN Mobiles to confirm that your ${warranty.productName} has 6 months of active warranty coverage remaining.`,
    "",
    "WARRANTY DETAILS:",
    `- Device Model: ${warranty.productName}`,
    `- Registered IMEI: ${warranty.imeiNumber}`,
    warranty.orderNumber ? `- Order Number: #${warranty.orderNumber}` : "",
    `- Coverage End Date: ${expiryFormatted}`,
    "- Coverage Status: Active",
    "",
    "RECOMMENDED MID-TERM CHECKS:",
    "- Battery Health: Review your battery capacity in Settings > Battery.",
    "- Screen & Touch: Confirm touch response and display clarity.",
    "- Ports & Audio: Inspect charging connector and speakers for dust or wear.",
    "",
    "Your device remains covered against manufacturing defects. If you ever experience any hardware malfunction, you are eligible for complimentary authorized service before your coverage period concludes.",
    "",
    `View coverage details online: ${siteUrl}/account`,
    "",
    getEmailFooterText({ showNotificationPreferences: true }),
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Update - VN Mobiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF;">
    Service update: Your ${warranty.productName} warranty remains active with 6 months of protection until ${expiryFormatted}.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Device Shield
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2563EB; letter-spacing: 0.5px; margin-bottom: 4px;">
                Warranty Status Notice
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">
                6 Months of Coverage Remaining
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Dear <strong>${warranty.customerName}</strong>,<br>
                This is a scheduled service update regarding your <strong>${warranty.productName}</strong>. Your device protection is currently active with 6 months of coverage remaining until <strong style="color: #111827;">${expiryFormatted}</strong>.
              </p>

              <!-- Warranty Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Device Model:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Registered IMEI:</td>
                  <td style="font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 600; color: #1E293B; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                ${warranty.orderNumber ? `
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Order Reference:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">#${warranty.orderNumber}</td>
                </tr>` : ""}
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Coverage Expiration:</td>
                  <td style="font-weight: 700; color: #0F172A; text-align: right; padding: 6px 0;">${expiryFormatted}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Current Status:</td>
                  <td style="font-weight: 700; color: #059669; text-align: right; padding: 6px 0;">Active (6 Months Remaining)</td>
                </tr>
              </table>

              <!-- Helpful Tips -->
              <div style="background-color: #F9FAFB; border-left: 3px solid #3B82F6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; font-size: 13px; color: #374151; line-height: 1.6;">
                <strong style="color: #1F2937; display: block; margin-bottom: 6px;">Recommended Mid-Term Inspection:</strong>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #4B5563;">
                  <li>Verify battery maximum capacity in device settings.</li>
                  <li>Check display responsiveness and charging port connectivity.</li>
                  <li>In the event of hardware defects, complimentary authorized repairs remain covered under your warranty.</li>
                </ul>
              </div>

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/account" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                      View Coverage in Account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliant Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml({ showNotificationPreferences: true })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject: `Warranty Notice: 6 months of coverage remaining for ${warranty.productName}`,
    emailType: "WARRANTY_REMINDER_6M",
    orderId: warranty.orderId,
    productName: warranty.productName,
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends 1-Day Final Warranty Expiry Reminder Email.
 * Triggered exactly 24 hours prior to coverage expiration.
 */
export async function sendWarrantyReminder1DayEmail(warranty: {
  id: string;
  orderId: string;
  orderNumber?: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  imeiNumber: string;
  warrantyExpiryDate: Date;
  warrantyDuration?: string;
}): Promise<EmailSendResult> {
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "");
  const expiryFormatted = new Date(warranty.warrantyExpiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const plainText = [
    `Warranty Notice: Your ${warranty.productName} warranty expires tomorrow`,
    "",
    `Dear ${warranty.customerName},`,
    "",
    `This is a courtesy service notice to inform you that the official Device Shield warranty coverage for your ${warranty.productName} will conclude tomorrow, ${expiryFormatted}.`,
    "",
    "WARRANTY DETAILS:",
    `- Device Model: ${warranty.productName}`,
    `- Registered IMEI: ${warranty.imeiNumber}`,
    warranty.orderNumber ? `- Order Reference: #${warranty.orderNumber}` : "",
    `- Coverage End Date: ${expiryFormatted} (Tomorrow)`,
    "- Coverage Status: Concluding",
    "",
    "IMPORTANT INFORMATION:",
    "After tomorrow, complimentary hardware repairs and component claims will no longer be covered under this policy. If your device currently requires hardware assistance or inspection, please contact VN Mobiles support or an authorized service provider prior to the expiration date.",
    "",
    `Need assistance? Reply directly to this email or visit: ${siteUrl}/account`,
    "",
    getEmailFooterText({ showNotificationPreferences: true }),
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warranty Expiration Notice - VN Mobiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF;">
    Courtesy notice: The manufacturer warranty for your ${warranty.productName} concludes tomorrow, ${expiryFormatted}.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 24px 32px; border-bottom: 3px solid #D97706;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #D97706; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 50%; vertical-align: middle; margin-right: 8px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 700; vertical-align: middle;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Device Shield Notice
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #D97706; letter-spacing: 0.5px; margin-bottom: 4px;">
                Coverage Expiration Notice
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827;">
                Warranty Expires Tomorrow
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Dear <strong>${warranty.customerName}</strong>,<br>
                This is a courtesy notice to inform you that manufacturer warranty protection for your <strong>${warranty.productName}</strong> will officially conclude tomorrow, <strong style="color: #111827;">${expiryFormatted}</strong>.
              </p>

              <!-- Details Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Device Model:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Registered IMEI:</td>
                  <td style="font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 600; color: #1E293B; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                ${warranty.orderNumber ? `
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Order Reference:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">#${warranty.orderNumber}</td>
                </tr>` : ""}
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Coverage End Date:</td>
                  <td style="font-weight: 700; color: #B45309; text-align: right; padding: 6px 0;">${expiryFormatted} (Tomorrow)</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Coverage Status:</td>
                  <td style="font-weight: 700; color: #B45309; text-align: right; padding: 6px 0;">Concluding Tomorrow</td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin: 20px 0; font-size: 13px; color: #92400E; line-height: 1.5;">
                <strong style="display: block; margin-bottom: 4px;">Important Coverage Notice:</strong>
                After tomorrow, complimentary hardware repairs and component claims will no longer be covered under this policy. If your device has any active hardware issues, please request inspection before the coverage end date.
              </div>

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/account" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px;">
                      View Account & Support Options
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliant Footer -->
          <tr>
            <td>
              ${getEmailFooterHtml({ showNotificationPreferences: true })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject: `Warranty Notice: Your ${warranty.productName} warranty expires tomorrow`,
    emailType: "WARRANTY_REMINDER_1D",
    orderId: warranty.orderId,
    productName: warranty.productName,
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Scans all warranties in the system and automatically sends:
 * 1. Email 6 months before expiry date
 * 2. Email 1 day before expiry date
 * 3. Updates warrantyStatus to "EXPIRING_SOON" or "EXPIRED"
 */
export async function checkAndDispatchWarrantyReminders(): Promise<{
  scanned: number;
  reminders6mSent: number;
  reminders1dSent: number;
  expiredMarked: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let reminders6mSent = 0;
  let reminders1dSent = 0;
  let expiredMarked = 0;

  const warranties = await prisma.warranty.findMany({
    where: {
      warrantyStatus: { notIn: ["EXPIRED", "CANCELLED"] },
      order: {
        orderStatus: { notIn: ["CANCELLED", "Cancelled", "cancelled"] },
      },
    },
    include: {
      order: {
        select: { orderNumber: true, orderStatus: true },
      },
    },
  });

  for (const w of warranties) {
    try {
      const expiry = new Date(w.warrantyExpiryDate).getTime();
      const sixMonthsBefore = expiry - (180 * 24 * 60 * 60 * 1000);
      const oneDayBefore = expiry - (24 * 60 * 60 * 1000);
      const nowTime = now.getTime();

      // Check 1: Past expiry date
      if (nowTime >= expiry) {
        await prisma.warranty.update({
          where: { id: w.id },
          data: { warrantyStatus: "EXPIRED" },
        });
        expiredMarked++;
        continue;
      }

      // Check 2: Within 24 hours of expiry (1 day before)
      if (nowTime >= oneDayBefore && !w.reminded1DayAt) {
        const sendResult = await sendWarrantyReminder1DayEmail({
          id: w.id,
          orderId: w.orderId,
          orderNumber: w.order?.orderNumber,
          userId: w.userId,
          customerName: w.customerName,
          customerEmail: w.customerEmail,
          productName: w.productName,
          imeiNumber: w.imeiNumber,
          warrantyExpiryDate: w.warrantyExpiryDate,
          warrantyDuration: w.warrantyDuration,
        });

        if (sendResult.success) {
          await prisma.warranty.update({
            where: { id: w.id },
            data: {
              reminded1DayAt: new Date(),
              warrantyStatus: "EXPIRING_SOON",
            },
          });
          reminders1dSent++;
        } else {
          errors.push(`Failed to send 1-day reminder to ${w.customerEmail}: ${sendResult.error}`);
        }
      }
      // Check 3: Within 6 months of expiry (6 months before)
      else if (nowTime >= sixMonthsBefore && !w.reminded6MonthsAt) {
        const sendResult = await sendWarrantyReminder6MonthsEmail({
          id: w.id,
          orderId: w.orderId,
          orderNumber: w.order?.orderNumber,
          userId: w.userId,
          customerName: w.customerName,
          customerEmail: w.customerEmail,
          productName: w.productName,
          imeiNumber: w.imeiNumber,
          warrantyExpiryDate: w.warrantyExpiryDate,
          warrantyDuration: w.warrantyDuration,
        });

        if (sendResult.success) {
          await prisma.warranty.update({
            where: { id: w.id },
            data: {
              reminded6MonthsAt: new Date(),
              warrantyStatus: "EXPIRING_SOON",
            },
          });
          reminders6mSent++;
        } else {
          errors.push(`Failed to send 6-month reminder to ${w.customerEmail}: ${sendResult.error}`);
        }
      }
    } catch (itemErr: any) {
      errors.push(`Error processing warranty ${w.id}: ${itemErr?.message || String(itemErr)}`);
    }
  }

  return {
    scanned: warranties.length,
    reminders6mSent,
    reminders1dSent,
    expiredMarked,
    errors,
  };
}

/**
 * Retries sending an existing failed email notification.
 * Does NOT create duplicate order or warranty records!
 */
export async function retryEmailNotification(notificationId: string): Promise<EmailSendResult> {
  const notification = await prisma.emailNotification.findUnique({
    where: { id: notificationId },
    include: {
      order: {
        include: { items: true },
      },
    },
  });

  if (!notification) {
    return {
      success: false,
      status: "FAILED",
      message: "Notification record not found.",
      error: "Not found",
    };
  }

  // Increment retry count
  await prisma.emailNotification.update({
    where: { id: notificationId },
    data: {
      retryCount: { increment: 1 },
      status: "PENDING",
    },
  });

  // Re-dispatch based on emailType
  if (notification.emailType === "ORDER_CONFIRMATION" && notification.order) {
    return sendOrderConfirmationEmail(notification.order);
  } else if (notification.emailType === "ORDER_STATUS" && notification.order) {
    return sendOrderStatusEmail(notification.order, notification.order.orderStatus);
  } else {
    // General retry using stored subject and summary
    return sendGmailEmail({
      userId: notification.userId,
      recipientName: notification.recipientName || "Customer",
      recipientEmail: notification.recipientEmail,
      subject: notification.subject,
      emailType: notification.emailType as SendEmailOptions["emailType"],
      orderId: notification.orderId,
      productName: notification.productName,
      templateId: notification.templateId || undefined,
      contentSummary: notification.contentSummary || undefined,
      text: notification.contentSummary || notification.subject,
    });
  }
}


/**
 * Sends a secure direct password reset link (no OTP required) initiated by Admin.
 * Link is valid for 1 hour and directs the user to choose their new password.
 */
export async function sendAdminPasswordResetLinkEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  token: string,
  expiresInMinutes: number = 60,
  baseUrl?: string
): Promise<EmailSendResult> {
  const appUrl = (baseUrl || getAppUrl()).replace(/\/$/, "");
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

  const plainText = [
    "Reset your VN Mobiles password",
    "",
    `Hi ${user.name},`,
    "",
    "A request to reset your VN Mobiles account password was initiated by an administrator.",
    "",
    "Click the link below to choose your new password directly:",
    resetLink,
    "",
    `This link is valid for ${expiresInMinutes} minutes and can only be used once.`,
    "No OTP verification code is required.",
    "",
    "If you did not request this, your existing password remains safe and unchanged.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your VN Mobiles password</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#24292f;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #d0d7de;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #f0f2f5;background-color:#ffffff;">
              <div style="font-size:22px;font-weight:700;color:#1f2328;letter-spacing:-0.3px;">VN Mobiles</div>
              <div style="font-size:12px;color:#57606a;margin-top:2px;">Account Security Management</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#24292f;">
                Hi <strong>${user.name}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#57606a;">
                An administrator has initiated a password reset for your VN Mobiles account (<strong>${user.email}</strong>). Click the secure button below to choose a new password:
              </p>
              
              <div style="text-align:center;margin:28px 0;">
                <a href="${resetLink}" style="display:inline-block;background-color:#C9A66B;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:10px;box-shadow:0 2px 6px rgba(201,166,107,0.35);">
                  Reset Your Password
                </a>
              </div>

              <div style="background-color:#fbfcfd;border:1px solid #e1e4e8;border-radius:10px;padding:16px;margin:24px 0;font-size:12px;color:#57606a;line-height:1.6;">
                <div style="font-weight:600;color:#24292f;margin-bottom:4px;">🔒 Security Information:</div>
                <ul style="margin:0;padding-left:18px;">
                  <li>This secure link is valid for <strong>${expiresInMinutes} minutes</strong> (1 hour).</li>
                  <li>No OTP code is required — simply click the button above.</li>
                  <li>This link is single-use and will expire once your password is updated.</li>
                </ul>
              </div>

              <p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:#8c959f;">
                If the button above does not work, copy and paste this link into your browser:<br/>
                <a href="${resetLink}" style="color:#C9A66B;word-break:break-all;font-size:11px;">${resetLink}</a>
              </p>

              <p style="margin:20px 0 0 0;font-size:12px;line-height:1.5;color:#8c959f;">
                If you did not request or expect this email, you can safely ignore it. Your existing password will remain active and unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "Reset your VN Mobiles password",
    emailType: "PASSWORD_RESET",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}


/**
 * Sends a 6-digit OTP verification email for self-service account deletion.
 * Valid for 10 minutes. Includes prominent security warning and consequences notice.
 */
export async function sendAccountDeletionOtpEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  otp: string
): Promise<EmailSendResult> {
  return sendOtpEmail({
    userId: user.id,
    name: user.name,
    email: user.email,
    otp,
    purpose: "ACCOUNT_DELETION_OTP",
    expiresInMinutes: 10,
  });
}

/**
 * Sends a confirmation email after an account has been permanently deleted.
 */
export async function sendAccountDeletionConfirmationEmail(user: {
  name: string;
  email: string;
}): Promise<EmailSendResult> {
  const plainText = [
    "Your VN Mobiles Account Has Been Deleted",
    "",
    `Dear ${user.name},`,
    "",
    "This email confirms that your VN Mobiles customer account has been permanently deleted as requested.",
    "",
    "What this means:",
    "- Your profile, address, and credentials have been erased.",
    "- Your active sessions and login cookies have been revoked.",
    "- Historical order and warranty data have been detached and personal information anonymized to fulfill legal and accounting requirements.",
    "",
    "If you ever wish to shop with us again in the future, you are always welcome to register a new account at https://vnmobiles.in.",
    "",
    "Thank you for being part of the VN Mobiles community.",
    "",
    getEmailFooterText(),
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your VN Mobiles Account Has Been Deleted</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#24292f;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f6f8fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #d0d7de;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #f0f2f5;background:linear-gradient(135deg, #1f2328 0%, #24292f 100%);">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">VN Mobiles</h1>
              <p style="margin:4px 0 0 0;font-size:12px;color:#d0d7de;">Account Deletion Confirmation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <div style="display:inline-block;padding:4px 10px;background-color:#f6ffed;border:1px solid #b7eb8f;border-radius:6px;color:#389e0d;font-size:12px;font-weight:600;margin-bottom:16px;">
                ✓ Account Deleted Successfully
              </div>
              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#24292f;">
                Hello <strong>${user.name}</strong>,
              </p>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#57606a;">
                This email confirms that your VN Mobiles customer account (<strong>${user.email}</strong>) has been permanently deleted in accordance with your verified request.
              </p>
              
              <div style="background-color:#fbfcfd;border:1px solid #e1e4e8;border-radius:10px;padding:16px;margin:20px 0;font-size:13px;color:#24292f;line-height:1.6;">
                <div style="font-weight:600;margin-bottom:6px;">Summary of actions completed:</div>
                <ul style="margin:0;padding-left:18px;color:#57606a;">
                  <li>Personal details, phone numbers, and address records have been erased.</li>
                  <li>Wishlists and active sessions have been terminated.</li>
                  <li>Historical orders and warranty records have been detached and personal data anonymized for statutory tax and warranty obligations.</li>
                </ul>
              </div>

              <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#57606a;">
                If you ever wish to purchase smartphones, access express shipping, or explore flagship deals in the future, you are always welcome to register a new account on our platform.
              </p>

              <div style="text-align:center;margin:26px 0 10px 0;">
                <a href="${(process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in").replace(/\/$/, "")}" style="display:inline-block;background-color:#C9A66B;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                  Visit VN Mobiles
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              ${getEmailFooterHtml()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendGmailEmail({
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "Your VN Mobiles Account Has Been Deleted",
    emailType: "ACCOUNT_DELETED",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}
