import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";

export interface SendSharedMailOptions {
  userId?: string | null;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  emailType: string;
  orderId?: string | null;
  productName?: string | null;
  templateId?: string;
  variables?: Record<string, string | number | undefined>;
  contentSummary?: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SharedMailResult {
  success: boolean;
  status: "SENT" | "FAILED";
  statusCode?: number;
  message: string;
  messageId?: string;
  notificationId?: string;
  error?: string;
  rawError?: any;
}

/**
 * Returns current time formatted in Asia/Kolkata (IST), e.g. "5:27 PM"
 */
export function getIstTimeString(date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Appends an IST time suffix to the subject line: e.g. "Subject (5:27 PM)".
 * If the subject already ends with an IST time suffix, it refreshes it with the current send time.
 */
export function formatSubjectWithIstTime(subject: string, date = new Date()): string {
  const trimmed = (subject || "").trim();
  const timeStr = getIstTimeString(date);
  const timeSuffixRegex = /\s*\(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)\)$/i;

  if (timeSuffixRegex.test(trimmed)) {
    return trimmed.replace(timeSuffixRegex, ` (${timeStr})`);
  }

  return `${trimmed} (${timeStr})`;
}

/**
 * Generates an RFC 5322 compliant unique Message-ID header for every single outgoing email.
 */
export function generateFreshMessageId(domain = "vnmobiles.in"): string {
  const timestamp = Date.now();
  const uniqueToken = crypto.randomUUID();
  return `<${timestamp}.${uniqueToken}@${domain}>`;
}

/**
 * Retrieves and sanitizes Gmail SMTP credentials from environment variables.
 */
export function getSanitizedGmailCredentials(): { user: string; pass: string } {
  const rawUser = (
    process.env.GMAIL_USER ||
    process.env.GMAIL_EMAIL ||
    ""
  ).trim();

  const rawPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASSWORD ||
    ""
  ).trim();

  // Strip wrapping single or double quotes
  const user = rawUser.replace(/^["']|["']$/g, "").trim();
  let pass = rawPass.replace(/^["']|["']$/g, "").trim();

  // Strip all whitespace characters from Google App Passwords
  pass = pass.replace(/\s+/g, "");

  return { user, pass };
}

/**
 * Creates Nodemailer transporter on demand inside function execution context.
 */
export function createSharedTransport(): Transporter {
  const { user, pass } = getSanitizedGmailCredentials();
  if (!user || !pass) {
    throw new Error("Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are missing or empty.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * SHARED SINGLE SEND FUNCTION:
 * All outgoing emails in the entire project route through this function.
 * Enforces:
 * 1. Fresh unique Message-ID on every email.
 * 2. Strictly NO In-Reply-To and NO References headers (prevents conversation stacking in Gmail).
 * 3. Unique subject line with IST send time suffix, e.g. "Subject (5:27 PM)".
 * 4. Audit recording in EmailNotification table (status: PENDING -> SENT / FAILED).
 */
export async function sendSharedMail(options: SendSharedMailOptions): Promise<SharedMailResult> {
  const cleanRecipientEmail = (options.recipientEmail || "").trim().toLowerCase();
  const recipientName = (options.recipientName || "Valued Customer").trim();
  const { user: userEmail, pass: userPass } = getSanitizedGmailCredentials();

  // 1. Format subject with IST time suffix (e.g. "Your OnePlus Nord 6 order was placed successfully (5:27 PM)")
  const finalSubject = formatSubjectWithIstTime(options.subject);

  // 2. Create initial audit record in DB with PENDING status
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
        subject: finalSubject,
        contentSummary: options.contentSummary || options.subject,
        status: "PENDING",
      },
    });
  } catch (dbErr) {
    console.error("[EMAIL AUDIT DB ERROR] Failed to record pending email:", dbErr);
  }

  // 3. Validate credentials
  if (!userEmail || !userPass) {
    const errorMsg = "Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are missing or empty in environment variables.";
    console.error(`[GMAIL SMTP ERROR] ${errorMsg}`);

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: { status: "FAILED", errorMessage: errorMsg },
        });
      } catch {}
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

  // 4. Generate fresh unique Message-ID
  const domain = userEmail.includes("@") ? userEmail.split("@")[1] : "vnmobiles.in";
  const freshMessageId = generateFreshMessageId(domain);

  // 5. Build deliverability headers (strictly NO In-Reply-To, NO References)
  const customFrom = process.env.EMAIL_FROM?.trim();
  const fromAddress = customFrom || `"VN Mobiles" <${userEmail}>`;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || userEmail;

  const deliverabilityHeaders: Record<string, string> = {
    "X-Mailer": "VN Mobiles Transactional Mailer",
    "Auto-Submitted": "auto-generated",
    "X-Auto-Response-Suppress": "All",
  };

  // Explicitly strip any threading headers to ensure Gmail renders each message as a fresh unstacked email
  delete (deliverabilityHeaders as any)["In-Reply-To"];
  delete (deliverabilityHeaders as any)["in-reply-to"];
  delete (deliverabilityHeaders as any)["References"];
  delete (deliverabilityHeaders as any)["references"];

  // RFC 8058 compliant List-Unsubscribe for recurring notification types
  if (
    options.emailType === "WARRANTY_REMINDER_6M" ||
    options.emailType === "WARRANTY_REMINDER_1D" ||
    options.emailType === "ORDER_STATUS"
  ) {
    const siteUrl = getAppUrl();
    deliverabilityHeaders["List-Unsubscribe"] = `<mailto:${replyTo}?subject=Unsubscribe-Notification>, <${siteUrl}/account/profile>`;
    deliverabilityHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const mailOptions: SendMailOptions = {
    from: fromAddress,
    to: `"${recipientName}" <${cleanRecipientEmail}>`,
    replyTo,
    subject: finalSubject,
    text: options.text || options.contentSummary || finalSubject,
    html: options.html,
    headers: deliverabilityHeaders,
    attachments: options.attachments,
    messageId: freshMessageId,
  };

  // Strictly ensure inReplyTo and references are not defined on mailOptions
  delete (mailOptions as any).inReplyTo;
  delete (mailOptions as any).references;

  // 6. Dispatch email via Nodemailer
  let transporter: Transporter;
  try {
    transporter = createSharedTransport();
  } catch (tErr: any) {
    const errMsg = tErr?.message || "Could not initialize nodemailer transporter.";
    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: { status: "FAILED", errorMessage: errMsg },
        });
      } catch {}
    }
    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: errMsg,
      error: errMsg,
      notificationId: notificationRecord?.id,
    };
  }

  try {
    console.log(`[GMAIL SMTP] Dispatching ${options.emailType} to ${cleanRecipientEmail} [MessageId: ${freshMessageId}] [Subject: ${finalSubject}]`);
    const info = (await transporter.sendMail(mailOptions)) as any;
    const resolvedMessageId = info?.messageId || freshMessageId;
    console.log(`[GMAIL SMTP SUCCESS] Message delivered. MessageId: ${resolvedMessageId}`);

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            subject: finalSubject,
          },
        });
      } catch (dbUpdErr) {
        console.warn("[EMAIL AUDIT DB UPDATE WARNING]", dbUpdErr);
      }
    }

    return {
      success: true,
      status: "SENT",
      statusCode: 200,
      message: "Email delivered successfully via Gmail SMTP.",
      messageId: resolvedMessageId,
      notificationId: notificationRecord?.id,
    };
  } catch (err: unknown) {
    const errObj = typeof err === "object" && err !== null ? (err as Record<string, any>) : {};
    const errorCode = errObj.code || (errObj.errno ? String(errObj.errno) : "PROVIDER_ERROR");
    const errorResponse = errObj.response || "";
    const rawErrorMessage = err instanceof Error ? err.message : "Unknown error while sending email via Gmail SMTP.";
    const detailedErrorMessage = `[${errorCode}] ${rawErrorMessage}${errorResponse ? ` (${errorResponse})` : ""}`;

    console.error(`[GMAIL SMTP ERROR] Delivery failed to ${cleanRecipientEmail}: ${detailedErrorMessage}`, err);

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "FAILED",
            errorMessage: detailedErrorMessage,
            subject: finalSubject,
          },
        });
      } catch (dbUpdErr) {
        console.error("[EMAIL AUDIT DB UPDATE ERROR]", dbUpdErr);
      }
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: detailedErrorMessage,
      error: detailedErrorMessage,
      messageId: freshMessageId,
      notificationId: notificationRecord?.id,
      rawError: err,
    };
  }
}

