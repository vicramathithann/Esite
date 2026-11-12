import nodemailer from "nodemailer";
import type { Transporter, SendMailOptions } from "nodemailer";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/appUrl";
import { isEmailSuppressed } from "@/lib/bounce-handler";

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

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
  attachments?: EmailAttachment[];
}

export interface SharedMailResult {
  success: boolean;
  status: "SENT" | "FAILED" | "BOUNCED";
  statusCode?: number;
  message: string;
  messageId?: string;
  notificationId?: string;
  error?: string;
  provider?: string;
  rawError?: any;
}

export type SupportedEmailProvider = "resend" | "sendgrid" | "ses" | "smtp" | "gmail";

/**
 * Resolves the active transactional email provider from environment variables.
 * Priority:
 * 1. Explicit EMAIL_PROVIDER setting
 * 2. RESEND_API_KEY -> "resend"
 * 3. SENDGRID_API_KEY -> "sendgrid"
 * 4. AWS_SES_REGION / AWS_ACCESS_KEY_ID -> "ses"
 * 5. Fallback to Gmail SMTP / custom SMTP
 */
export function resolveActiveEmailProvider(): SupportedEmailProvider {
  const explicit = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (explicit === "resend" || explicit === "sendgrid" || explicit === "ses" || explicit === "smtp" || explicit === "gmail") {
    return explicit as SupportedEmailProvider;
  }

  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SENDGRID_API_KEY?.trim()) return "sendgrid";
  if (process.env.AWS_SES_REGION?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim()) return "ses";

  return "gmail";
}

/**
 * Parses a "Name <email@domain.com>" or "email@domain.com" string into parts.
 */
export function parseEmailAddress(raw: string, defaultName = "VN Mobiles"): { name: string; email: string } {
  const trimmed = (raw || "").trim();
  const match = trimmed.match(/^(?:["']?([^"']+)["']?\s+)?<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || defaultName, email: match[2]?.trim().toLowerCase() };
  }
  return { name: defaultName, email: trimmed.toLowerCase() };
}

/**
 * Resolves verified sender identity:
 * From: "VN Mobiles <no-reply@{my-domain}>"
 * Reply-To: monitored support address
 */
export function resolveSenderIdentity(): {
  fromFormatted: string;
  fromName: string;
  fromEmail: string;
  replyToFormatted: string;
  replyToEmail: string;
  domain: string;
} {
  const rawFrom = (process.env.EMAIL_FROM || "").trim();
  const rawReplyTo = (process.env.EMAIL_REPLY_TO || "").trim();

  let fromEmail = "no-reply@vnmobiles.in";
  let fromName = "VN Mobiles";

  if (rawFrom) {
    const parsed = parseEmailAddress(rawFrom, "VN Mobiles");
    if (parsed.email && parsed.email.includes("@")) {
      fromEmail = parsed.email;
      fromName = parsed.name || "VN Mobiles";
    }
  }

  let replyToEmail = "support@vnmobiles.in";
  if (rawReplyTo) {
    const parsed = parseEmailAddress(rawReplyTo, "VN Mobiles Support");
    if (parsed.email && parsed.email.includes("@")) {
      replyToEmail = parsed.email;
    }
  }

  const domain = fromEmail.includes("@") ? fromEmail.split("@")[1] : "vnmobiles.in";

  return {
    fromFormatted: `"${fromName}" <${fromEmail}>`,
    fromName,
    fromEmail,
    replyToFormatted: `"VN Mobiles Support" <${replyToEmail}>`,
    replyToEmail,
    domain,
  };
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

  const user = rawUser.replace(/^["']|["']$/g, "").trim();
  let pass = rawPass.replace(/^["']|["']$/g, "").trim().replace(/\s+/g, "");

  return { user, pass };
}

/**
 * Creates Nodemailer transporter on demand inside function execution context.
 */
export function createSharedTransport(): Transporter {
  const provider = resolveActiveEmailProvider();

  // If Amazon SES SMTP is configured
  if (provider === "ses" && (process.env.SES_SMTP_USER || process.env.AWS_SES_REGION)) {
    const sesRegion = process.env.AWS_SES_REGION || "ap-south-1";
    const sesHost = process.env.SES_SMTP_HOST || `email-smtp.${sesRegion}.amazonaws.com`;
    const sesUser = (process.env.SES_SMTP_USER || process.env.AWS_ACCESS_KEY_ID || "").trim();
    const sesPass = (process.env.SES_SMTP_PASSWORD || process.env.AWS_SECRET_ACCESS_KEY || "").trim();

    return nodemailer.createTransport({
      host: sesHost,
      port: 465,
      secure: true,
      auth: { user: sesUser, pass: sesPass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  // Custom SMTP host if set
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || "465");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: (process.env.SMTP_USER || "").trim(),
        pass: (process.env.SMTP_PASS || "").trim(),
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });
  }

  // Fallback to Gmail SMTP
  const { user, pass } = getSanitizedGmailCredentials();
  if (!user || !pass) {
    throw new Error("Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are missing or empty.");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Dispatches transactional email via Resend REST API (HTTPS).
 */
async function sendViaResend(params: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html?: string;
  text?: string;
  messageId: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; messageId?: string; error?: string; statusCode?: number; raw?: any }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: "Missing RESEND_API_KEY environment variable." };
  }

  const resendAttachments = (params.attachments || []).map((att) => ({
    filename: att.filename,
    content: Buffer.isBuffer(att.content)
      ? att.content.toString("base64")
      : Buffer.from(att.content).toString("base64"),
    content_type: att.contentType || "application/pdf",
  }));

  const payload: any = {
    from: params.from,
    to: [params.to],
    reply_to: params.replyTo,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
      "Message-ID": params.messageId,
    },
  };

  if (resendAttachments.length > 0) {
    payload.attachments = resendAttachments;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      return {
        success: true,
        messageId: data.id,
        statusCode: res.status,
        raw: data,
      };
    }

    const errorMsg = data.message || data.error?.message || `Resend HTTP ${res.status}`;
    return {
      success: false,
      error: errorMsg,
      statusCode: res.status,
      raw: data,
    };
  } catch (fetchErr: any) {
    return {
      success: false,
      error: fetchErr?.message || "Failed to contact Resend API",
      raw: fetchErr,
    };
  }
}

/**
 * Dispatches transactional email via SendGrid v3 API (HTTPS).
 */
async function sendViaSendGrid(params: {
  fromFormatted: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  toName: string;
  replyToEmail: string;
  subject: string;
  html?: string;
  text?: string;
  messageId: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; messageId?: string; error?: string; statusCode?: number; raw?: any }> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    return { success: false, error: "Missing SENDGRID_API_KEY environment variable." };
  }

  const sendGridAttachments = (params.attachments || []).map((att) => ({
    content: Buffer.isBuffer(att.content)
      ? att.content.toString("base64")
      : Buffer.from(att.content).toString("base64"),
    filename: att.filename,
    type: att.contentType || "application/pdf",
    disposition: "attachment",
  }));

  const payload: any = {
    personalizations: [
      {
        to: [{ email: params.toEmail, name: params.toName }],
        subject: params.subject,
      },
    ],
    from: { email: params.fromEmail, name: params.fromName },
    reply_to: { email: params.replyToEmail, name: "VN Mobiles Support" },
    content: [
      { type: "text/plain", value: params.text || params.subject },
      { type: "text/html", value: params.html || params.text || params.subject },
    ],
    headers: {
      "Auto-Submitted": "auto-generated",
      "X-Auto-Response-Suppress": "All",
      "Message-ID": params.messageId,
    },
  };

  if (sendGridAttachments.length > 0) {
    payload.attachments = sendGridAttachments;
  }

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.status >= 200 && res.status < 300) {
      const msgIdHeader = res.headers.get("x-message-id") || params.messageId;
      return {
        success: true,
        messageId: msgIdHeader,
        statusCode: res.status,
      };
    }

    const data = await res.json().catch(() => ({}));
    const errorMsg = data.errors?.[0]?.message || `SendGrid HTTP ${res.status}`;
    return {
      success: false,
      error: errorMsg,
      statusCode: res.status,
      raw: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to contact SendGrid API",
      raw: err,
    };
  }
}

/**
 * SHARED SINGLE SEND FUNCTION:
 * All outgoing emails in the entire project route through this function.
 * Enforces:
 * 1. Verified Sender Identity (From: VN Mobiles <no-reply@{my-domain}>).
 * 2. Monitored Reply-To address (support@vnmobiles.in).
 * 3. Fresh unique Message-ID on every email.
 * 4. Strictly NO In-Reply-To and NO References headers.
 * 5. Strictly NO List-Unsubscribe for transactional messages.
 * 6. Header Auto-Submitted: auto-generated.
 * 7. Clean, plain subject line under 60 characters without timestamp suffixes.
 * 8. Automatic pre-validation (filters invalid addresses, soft-deleted accounts, and bounced suppression lists).
 * 9. Automatic 1-retry with backoff for transient provider errors.
 * 10. Audit recording in EmailNotification table (status: PENDING -> SENT / FAILED / BOUNCED).
 */
export async function sendSharedMail(options: SendSharedMailOptions): Promise<SharedMailResult> {
  const cleanRecipientEmail = (options.recipientEmail || "").trim().toLowerCase();
  const recipientName = (options.recipientName || "Valued Customer").trim();

  // Clean subject: remove any leftover timestamp suffixes and ensure under 60 characters
  let finalSubject = (options.subject || "")
    .replace(/\s*\(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)\)$/i, "")
    .replace(/\s*-\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)$/i, "")
    .trim();

  if (finalSubject.length > 60) {
    finalSubject = finalSubject.slice(0, 57) + "...";
  }

  // 1. Initial audit record in EmailNotification table (PENDING)
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
        recipientEmail: cleanRecipientEmail || "unknown@vnmobiles.in",
        recipientName,
        emailType: options.emailType,
        orderId: options.orderId || null,
        productName: options.productName || null,
        templateId: options.templateId || null,
        subject: finalSubject,
        contentSummary: options.contentSummary || options.text || finalSubject,
        status: "PENDING",
      },
    });
  } catch (dbErr) {
    console.error("[EMAIL AUDIT DB ERROR] Failed to record pending email:", dbErr);
  }

  // 2. Pre-Validation
  const isDeletedEmail = cleanRecipientEmail.includes("@deleted.") || cleanRecipientEmail.startsWith("deleted-");
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipientEmail);

  if (!isValidEmail || isDeletedEmail) {
    const errorMsg = isDeletedEmail
      ? "Customer account is deleted. Email delivery skipped."
      : "Invalid recipient email address format.";

    console.warn(`[EMAIL DISPATCH SKIPPED] ${cleanRecipientEmail}: ${errorMsg}`);
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
      statusCode: 400,
      message: errorMsg,
      error: errorMsg,
      notificationId: notificationRecord?.id,
    };
  }

  // 3. Suppression check (bounce / spam complaint list)
  const isSuppressed = await isEmailSuppressed(cleanRecipientEmail);
  if (isSuppressed) {
    const errorMsg = "Recipient address is suppressed due to a prior hard bounce or spam complaint.";
    console.warn(`[EMAIL SUPPRESSED] ${cleanRecipientEmail}: ${errorMsg}`);
    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: { status: "BOUNCED", errorMessage: errorMsg },
        });
      } catch {}
    }

    return {
      success: false,
      status: "BOUNCED",
      statusCode: 410,
      message: errorMsg,
      error: errorMsg,
      notificationId: notificationRecord?.id,
    };
  }

  // 4. Resolve sender identity and headers
  const sender = resolveSenderIdentity();
  const freshMessageId = generateFreshMessageId(sender.domain);
  const provider = resolveActiveEmailProvider();

  console.log(`[EMAIL DISPATCH] Provider: ${provider.toUpperCase()} | To: ${cleanRecipientEmail} | Type: ${options.emailType} | MsgId: ${freshMessageId}`);

  // Internal execution function for single attempt
  const executeSend = async (): Promise<{ success: boolean; messageId?: string; error?: string; statusCode?: number; raw?: any }> => {
    if (provider === "resend") {
      return sendViaResend({
        from: sender.fromFormatted,
        to: cleanRecipientEmail,
        replyTo: sender.replyToEmail,
        subject: finalSubject,
        html: options.html,
        text: options.text,
        messageId: freshMessageId,
        attachments: options.attachments,
      });
    }

    if (provider === "sendgrid") {
      return sendViaSendGrid({
        fromFormatted: sender.fromFormatted,
        fromName: sender.fromName,
        fromEmail: sender.fromEmail,
        toEmail: cleanRecipientEmail,
        toName: recipientName,
        replyToEmail: sender.replyToEmail,
        subject: finalSubject,
        html: options.html,
        text: options.text,
        messageId: freshMessageId,
        attachments: options.attachments,
      });
    }

    // SMTP Dispatch (Amazon SES SMTP, Gmail SMTP, or custom SMTP)
    const transporter = createSharedTransport();
    const mailOptions: SendMailOptions = {
      from: sender.fromFormatted,
      to: `"${recipientName}" <${cleanRecipientEmail}>`,
      replyTo: sender.replyToFormatted,
      subject: finalSubject,
      text: options.text || options.contentSummary || finalSubject,
      html: options.html,
      headers: {
        "X-Mailer": "VN Mobiles Transactional Mailer",
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
      },
      attachments: options.attachments,
      messageId: freshMessageId,
    };

    // Strictly ensure threading headers are omitted
    delete (mailOptions as any).inReplyTo;
    delete (mailOptions as any).references;

    const info = (await transporter.sendMail(mailOptions)) as any;
    return {
      success: true,
      messageId: info?.messageId || freshMessageId,
      statusCode: 200,
      raw: info,
    };
  };

  // 5. Attempt send with 1 automatic retry after 1.5s on transient failure
  let attemptResult: { success: boolean; messageId?: string; error?: string; statusCode?: number; raw?: any };
  try {
    attemptResult = await executeSend();
  } catch (firstErr: any) {
    attemptResult = { success: false, error: firstErr?.message || "Initial dispatch error", raw: firstErr };
  }

  if (!attemptResult.success) {
    console.warn(`[EMAIL DISPATCH RETRY] Initial dispatch to ${cleanRecipientEmail} failed: ${attemptResult.error}. Retrying in 1.5s...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      attemptResult = await executeSend();
      if (attemptResult.success) {
        console.log(`[EMAIL DISPATCH RETRY SUCCESS] Delivered to ${cleanRecipientEmail} on retry.`);
      }
    } catch (retryErr: any) {
      attemptResult = { success: false, error: retryErr?.message || "Retry dispatch error", raw: retryErr };
    }
  }

  // 6. Record final status in EmailNotification table
  const resolvedMessageId = attemptResult.messageId || freshMessageId;

  if (attemptResult.success) {
    console.log(`[EMAIL DISPATCH SUCCESS] Delivered to ${cleanRecipientEmail} [MsgId: ${resolvedMessageId}]`);
    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            subject: finalSubject,
            errorMessage: null,
          },
        });
      } catch (dbUpdErr) {
        console.warn("[EMAIL AUDIT DB UPDATE WARNING]", dbUpdErr);
      }
    }

    return {
      success: true,
      status: "SENT",
      statusCode: attemptResult.statusCode || 200,
      message: `Email delivered successfully via ${provider.toUpperCase()}.`,
      messageId: resolvedMessageId,
      notificationId: notificationRecord?.id,
      provider,
    };
  }

  const finalErrorMsg = attemptResult.error || "Email delivery failed.";
  console.error(`[EMAIL DISPATCH FAILED] ${cleanRecipientEmail}: ${finalErrorMsg}`);

  if (notificationRecord) {
    try {
      await prisma.emailNotification.update({
        where: { id: notificationRecord.id },
        data: {
          status: "FAILED",
          errorMessage: finalErrorMsg,
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
    statusCode: attemptResult.statusCode || 500,
    message: finalErrorMsg,
    error: finalErrorMsg,
    messageId: resolvedMessageId,
    notificationId: notificationRecord?.id,
    provider,
    rawError: attemptResult.raw,
  };
}
