import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { isOrderCancelled } from "@/lib/orderStatus";
import { getAppUrl } from "@/lib/appUrl";
import {
  renderOrderConfirmedEmail,
  renderOrderStatusEmail,
  renderOrderCancelledEmail,
  renderWarrantyActivationEmail,
  renderWarrantyExpiringEmail,
  renderOtpEmail,
  renderPasswordResetLinkEmail,
  renderAccountDeletionOtpEmail,
  renderAccountDeletionConfirmedEmail,
  renderAdminInvitationEmail,
} from "./email-templates";
import { generateWarrantyCertificatePdf, formatKolkataDate } from "./warranty-pdf";
import { sendWarrantyEmail } from "./mailer";

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

import {
  sendSharedMail,
  generateFreshMessageId,
} from "./email-sender";
export {
  sendSharedMail,
  generateFreshMessageId,
};

export interface SendEmailOptions {
  userId?: string | null;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  emailType: "EMAIL_VERIFICATION" | "ORDER_CONFIRMATION" | "ORDER_STATUS" | "WARRANTY_NOTIFICATION" | "WARRANTY_REMINDER_6M" | "WARRANTY_REMINDER_1D" | "LOGIN_OTP" | "PASSWORD_RESET" | "ACCOUNT_DELETION_OTP" | "ACCOUNT_DELETED" | string;
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

export interface EmailSendResult {
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
 * Retrieves and sanitizes Gmail SMTP credentials from environment variables.
 * Handles:
 * - Stripping any wrapping quotes (e.g., "value" or 'value') that may be added in Vercel UI
 * - Stripping all spaces from 16-character Google App Passwords ("xxxx xxxx xxxx xxxx" -> "xxxxxxxxxxxxxxxx")
 * - Supporting common aliases (GMAIL_USER / GMAIL_EMAIL, GMAIL_APP_PASSWORD / GMAIL_PASSWORD)
 */
export function getGmailCredentials(): { user: string; pass: string } {
  const rawUser = (
    process.env.GMAIL_USER ||
    process.env.GMAIL_EMAIL ||
    process.env.EMAIL_USER ||
    ""
  );
  const user = rawUser
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();

  const rawPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_APP_PASS ||
    process.env.GMAIL_PASSWORD ||
    process.env.GMAIL_PASS ||
    ""
  );
  const pass = rawPass
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, "")
    .trim();

  return { user, pass };
}

/**
 * Standard serverless transport configuration for Gmail SMTP via Nodemailer.
 * Uses built-in 'service: "gmail"' preset to avoid custom TLS/port/IPv6 handshake
 * failures on Vercel AWS Lambda infrastructure.
 */
export function createTransporter(): Transporter | null {
  const { user, pass } = getGmailCredentials();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

// In serverless environments, create fresh or verify connections to avoid stale socket reuse
export function getTransporter(): Transporter | null {
  return createTransporter();
}

/**
 * Maps raw Nodemailer / Supabase error codes and descriptions into high-level failure classifications:
 * EAUTH | ETIMEDOUT | MISSING_ENV | SUPABASE_ERROR | UNKNOWN
 */
export function mapEmailFailureReason(
  code?: string,
  errorMsg?: string
): "EAUTH" | "ETIMEDOUT" | "MISSING_ENV" | "SUPABASE_ERROR" | "UNKNOWN" {
  const upperCode = (code || "").toUpperCase();
  const upperMsg = (errorMsg || "").toUpperCase();

  if (
    upperCode === "MISSING_CREDENTIALS" ||
    upperCode === "MISSING_ENV" ||
    upperMsg.includes("MISSING REQUIRED") ||
    upperMsg.includes("MISSING OR EMPTY") ||
    upperMsg.includes("GMAIL SMTP CREDENTIALS")
  ) {
    return "MISSING_ENV";
  }

  if (
    upperCode === "EAUTH" ||
    upperMsg.includes("EAUTH") ||
    upperMsg.includes("AUTHENTICATION") ||
    upperMsg.includes("INVALID CREDENTIALS") ||
    upperMsg.includes("535") ||
    upperMsg.includes("534") ||
    upperMsg.includes("USERNAME AND PASSWORD NOT ACCEPTED")
  ) {
    return "EAUTH";
  }

  if (
    upperCode === "ETIMEDOUT" ||
    upperCode === "ESOCKET" ||
    upperCode === "ESOCKETTIMEDOUT" ||
    upperCode === "ECONNECTION" ||
    upperCode === "ECONNREFUSED" ||
    upperCode === "ECONNRESET" ||
    upperMsg.includes("TIMEOUT") ||
    upperMsg.includes("TIMEDOUT") ||
    upperMsg.includes("CONNECTION TIMED OUT")
  ) {
    return "ETIMEDOUT";
  }

  if (
    upperCode.startsWith("P") ||
    upperCode.includes("SUPABASE") ||
    upperCode.includes("PRISMA") ||
    upperMsg.includes("SUPABASE") ||
    upperMsg.includes("DATABASE")
  ) {
    return "SUPABASE_ERROR";
  }

  return "UNKNOWN";
}

/**
 * Validates the live SMTP connection with Google Mail servers without sending an email.
 * Used by diagnostic and health check endpoints.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message?: string; error?: string; code?: string; rawError?: any }> {
  const { user, pass } = getGmailCredentials();

  const envCheck = {
    GMAIL_USER_DEFINED: Boolean(user),
    GMAIL_APP_PASSWORD_DEFINED: Boolean(pass),
    GMAIL_APP_PASSWORD_LENGTH: pass ? pass.length : 0,
    NEXT_PUBLIC_APP_URL_DEFINED: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_SUPABASE_URL_DEFINED: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY_DEFINED: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  if (!user || !pass) {
    const missing: string[] = [];
    if (!user) missing.push("GMAIL_USER");
    if (!pass) missing.push("GMAIL_APP_PASSWORD");
    console.error("[SMTP VERIFY ERROR] Missing credentials:", { missing, envCheck });
    return {
      success: false,
      error: `Missing required environment variable(s): ${missing.join(", ")}`,
      code: "MISSING_CREDENTIALS",
      rawError: { missing, envCheck },
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.error("[SMTP VERIFY ERROR] Transporter init failed:", envCheck);
    return {
      success: false,
      error: "Could not initialize nodemailer transporter.",
      code: "INIT_FAILED",
      rawError: { envCheck },
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: `SMTP connection verified successfully with Gmail service as ${user}`,
    };
  } catch (err: unknown) {
    const errObj = (typeof err === "object" && err !== null) ? (err as Record<string, any>) : {};
    const code = errObj.code || (errObj.errno ? String(errObj.errno) : "UNKNOWN");
    const response = errObj.response || "";
    const command = errObj.command || "";
    const responseCode = errObj.responseCode || "";
    const message = err instanceof Error ? err.message : String(err);

    console.error(`[SMTP VERIFY ERROR] Code: ${code} | Command: ${command} | ResponseCode: ${responseCode} | Response: ${response} | Message: ${message}`, {
      message,
      code,
      command,
      response,
      responseCode,
      envCheck,
    });
    return {
      success: false,
      code,
      error: `[${code}] ${message}${response ? ` (${response})` : ""}`,
      rawError: {
        code,
        command,
        responseCode,
        response,
        message,
        envCheck,
      },
    };
  }
}

/**
 * Sends a transactional email using Gmail SMTP and records
 * an audit entry in the EmailNotification table.
 */
export async function sendGmailEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const result = await sendSharedMail(options);
  return {
    success: result.success,
    status: result.status,
    statusCode: result.statusCode,
    message: result.message,
    messageId: result.messageId,
    notificationId: result.notificationId,
    error: result.error,
    rawError: result.rawError,
  };
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
  const siteUrl = getAppUrl();

  let subject: string;
  let plainText: string;
  let html: string;

  if (options.purpose === "ACCOUNT_DELETION_OTP") {
    const rendered = renderAccountDeletionOtpEmail(
      {
        recipientName: cleanName,
        recipientEmail: cleanEmail,
        code: codeDisplay,
      },
      siteUrl
    );
    subject = rendered.subject;
    plainText = rendered.text;
    html = rendered.html;
  } else {
    let otpPurpose = "general";
    if (options.purpose === "EMAIL_VERIFICATION") otpPurpose = "registration";
    else if (options.purpose === "PASSWORD_RESET") otpPurpose = "password_reset";
    else if (options.purpose === "LOGIN_OTP") otpPurpose = "login";

    const rendered = renderOtpEmail(
      {
        recipientName: cleanName,
        recipientEmail: cleanEmail,
        code: codeDisplay,
        purpose: otpPurpose,
        expiresInMinutes: minutes,
      },
      siteUrl
    );
    subject = rendered.subject;
    plainText = rendered.text;
    html = rendered.html;
  }

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
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderOtpEmail(
    {
      recipientName: user.name,
      recipientEmail: user.email,
      code: codeDisplay,
      purpose: "registration",
      expiresInMinutes: 5,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject,
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
  role?: string;
  expiresInHours?: number;
}): Promise<EmailSendResult> {
  const expiresInHours = options.expiresInHours || 48;
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderAdminInvitationEmail(
    {
      inviteLink: options.inviteLink,
      recipientEmail: options.recipientEmail,
      role: options.role || "USER",
      expiresAtFormatted: `Expires in ${expiresInHours} hours`,
    },
    siteUrl
  );

  return sendGmailEmail({
    recipientName: "Invited Member",
    recipientEmail: options.recipientEmail,
    subject,
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
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderOtpEmail(
    {
      recipientName: user.name,
      recipientEmail: user.email,
      code: codeDisplay,
      purpose: "login",
      expiresInMinutes: 5,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject,
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
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderOtpEmail(
    {
      recipientName: admin.name || "Administrator",
      recipientEmail: admin.email,
      code: codeDisplay,
      purpose: "admin_login",
      expiresInMinutes: 5,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: admin.email,
    subject,
    emailType: "LOGIN_OTP",
    contentSummary: "VN Mobiles Admin Portal: Login Verification Code dispatched (5-minute expiry).",
    text: plainText,
    html,
  });
}

/**
 * Sends Admin Email Verification OTP code to rrroyce20@gmail.com
 */
export async function sendAdminVerificationEmail(
  admin: { id: string; email: string; name?: string },
  _token?: string,
  otp?: string
): Promise<EmailSendResult> {
  const codeDisplay = (otp || "").slice(0, 6);
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderOtpEmail(
    {
      recipientName: admin.name || "Administrator",
      recipientEmail: admin.email,
      code: codeDisplay,
      purpose: "admin_verification",
      expiresInMinutes: 5,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: "rrroyce20@gmail.com",
    subject,
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
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderPasswordResetLinkEmail(
    {
      recipientName: admin.name || "Administrator",
      recipientEmail: admin.email,
      resetUrl: resetLink,
      expiresInMinutes,
      isAdmin: true,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: admin.id,
    recipientName: admin.name || "VN Mobiles Administrator",
    recipientEmail: admin.email,
    subject,
    emailType: "PASSWORD_RESET",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

/**
 * Sends Order Confirmation Email when a customer places an order.
 * Follows the unified format with official warranty certificate PDF attached.
 */
export async function sendOrderConfirmationEmail(order: {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items?: Array<{
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
  const result = await sendWarrantyEmail(order as any, (order.items as any) || [], [], undefined, { force: true });
  return {
    success: result.success,
    status: result.success ? "SENT" : "FAILED",
    message: result.message,
    statusCode: result.statusCode,
    error: result.error,
  };
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
  const siteUrl = getAppUrl();
  const phoneName =
    extra?.phoneName ||
    (extra?.items && extra.items.map((i) => i.productName).filter(Boolean).join(", ")) ||
    "Smartphone";

  if (isCancelled) {
    const { subject, html, text: plainText } = renderOrderCancelledEmail(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        orderStatus: newStatus,
        items: extra?.items,
      },
      note,
      extra,
      siteUrl
    );

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

  const { subject, html, text: plainText } = renderOrderStatusEmail(
    order,
    newStatus,
    note,
    extra,
    siteUrl
  );

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

/**
 * Sends Mobile Warranty Activation Email with official PDF certificate attached.
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
  purchaseDate: Date | string;
  warrantyDuration?: string;
  warrantyStartDate: Date | string;
  warrantyExpiryDate: Date | string;
}): Promise<EmailSendResult> {
  const siteUrl = getAppUrl();
  let resolvedName = warranty.productName;
  let resolvedBrand = "VN Mobiles";
  let resolvedVariant = "";

  let linkedOrder: any = null;
  try {
    const dbWar = await prisma.warranty.findUnique({
      where: { id: warranty.id },
      include: {
        orderItem: true,
        order: true,
      },
    });

    if (dbWar) {
      if ((dbWar as any).order) linkedOrder = (dbWar as any).order;
      if (dbWar.productName) resolvedName = dbWar.productName;
      if (dbWar.orderItem) {
        if (dbWar.orderItem.productName) resolvedName = dbWar.orderItem.productName;
        if (dbWar.orderItem.productBrand) resolvedBrand = dbWar.orderItem.productBrand;
        resolvedVariant = [dbWar.orderItem.selectedStorage, dbWar.orderItem.selectedColor]
          .filter(Boolean)
          .join(", ");
      }
    }
  } catch (dbErr) {
    console.warn("[WARRANTY EMAIL] Notice: could not load warranty relations:", dbErr);
  }

  const startDateStr = formatKolkataDate(warranty.warrantyStartDate);
  const expiryDateStr = formatKolkataDate(warranty.warrantyExpiryDate);
  const durationStr = warranty.warrantyDuration || "1 Year Brand Warranty";
  const warrantyNumber = `WRT-${warranty.orderNumber}-1`;

  // Build PDF certificate attachment
  let pdfAttachment: { filename: string; content: Buffer; contentType: string } | null = null;
  try {
    const pdfResult = await generateWarrantyCertificatePdf({
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      orderNumber: warranty.orderNumber,
      devices: [
        {
          productName: resolvedName,
          productBrand: resolvedBrand,
          variantInfo: resolvedVariant,
          warrantyNumber,
          imeiNumber: warranty.imeiNumber,
          coveragePeriod: durationStr,
          warrantyStartDate: warranty.warrantyStartDate,
          warrantyExpiryDate: warranty.warrantyExpiryDate,
          purchaseDate: warranty.purchaseDate,
          orderNumber: warranty.orderNumber,
          status: "ACTIVE",
        },
      ],
    });

    pdfAttachment = {
      filename: pdfResult.filename,
      content: pdfResult.pdfBuffer,
      contentType: "application/pdf",
    };
  } catch (pdfErr) {
    console.error(`[WARRANTY PDF GENERATION ERROR] Warranty ${warranty.id}:`, pdfErr);
  }

  const { subject, html, text: plainText } = renderWarrantyActivationEmail(
    {
      orderNumber: warranty.orderNumber,
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      items: [
        {
          productName: resolvedName,
          variantInfo: resolvedVariant,
          warrantyNumber,
          imeiNumber: warranty.imeiNumber,
          coveragePeriod: durationStr,
          startDateStr,
          expiryDateStr,
          status: "ACTIVE",
        },
      ],
      createdAt: warranty.purchaseDate || linkedOrder?.createdAt,
      deliveryDate: linkedOrder?.estimatedDelivery,
      paymentMethod: linkedOrder?.paymentMethod,
      paymentStatus: linkedOrder?.paymentStatus,
      totalAmount: linkedOrder?.totalAmount,
      address: linkedOrder?.address,
      city: linkedOrder?.city,
      state: linkedOrder?.state,
      pincode: linkedOrder?.pincode,
    },
    siteUrl
  );

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject,
    emailType: "WARRANTY_NOTIFICATION",
    orderId: warranty.orderId,
    productName: resolvedName,
    contentSummary: plainText,
    text: plainText,
    html,
    attachments: pdfAttachment ? [pdfAttachment] : undefined,
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
  warrantyNumber?: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  variantInfo?: string;
  imeiNumber: string;
  warrantyStartDate?: Date | string;
  warrantyExpiryDate: Date | string;
  warrantyDuration?: string;
}): Promise<EmailSendResult> {
  const siteUrl = getAppUrl();
  const fullProductName = warranty.variantInfo
    ? `${warranty.productName}, ${warranty.variantInfo}`
    : warranty.productName;

  const wNumber =
    warranty.warrantyNumber ||
    (warranty.orderNumber ? `WRT-${warranty.orderNumber}-1` : `WRT-${warranty.id.slice(0, 8)}`);

  const { subject, html, text: plainText } = renderWarrantyExpiringEmail(
    {
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      productName: fullProductName,
      warrantyNumber: wNumber,
      imeiNumber: warranty.imeiNumber,
      warrantyStartDate: warranty.warrantyStartDate || new Date(new Date(warranty.warrantyExpiryDate).getTime() - 365 * 24 * 60 * 60 * 1000),
      warrantyExpiryDate: warranty.warrantyExpiryDate,
      orderNumber: warranty.orderNumber,
      warrantyDuration: warranty.warrantyDuration || "1 Year",
    },
    "6_MONTHS",
    siteUrl
  );

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject,
    emailType: "WARRANTY_REMINDER_6M",
    orderId: warranty.orderId,
    productName: fullProductName,
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
  warrantyNumber?: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  productName: string;
  variantInfo?: string;
  imeiNumber: string;
  warrantyStartDate?: Date | string;
  warrantyExpiryDate: Date | string;
  warrantyDuration?: string;
}): Promise<EmailSendResult> {
  const siteUrl = getAppUrl();
  const fullProductName = warranty.variantInfo
    ? `${warranty.productName}, ${warranty.variantInfo}`
    : warranty.productName;

  const wNumber =
    warranty.warrantyNumber ||
    (warranty.orderNumber ? `WRT-${warranty.orderNumber}-1` : `WRT-${warranty.id.slice(0, 8)}`);

  const { subject, html, text: plainText } = renderWarrantyExpiringEmail(
    {
      customerName: warranty.customerName,
      customerEmail: warranty.customerEmail,
      productName: fullProductName,
      warrantyNumber: wNumber,
      imeiNumber: warranty.imeiNumber,
      warrantyStartDate: warranty.warrantyStartDate || new Date(new Date(warranty.warrantyExpiryDate).getTime() - 365 * 24 * 60 * 60 * 1000),
      warrantyExpiryDate: warranty.warrantyExpiryDate,
      orderNumber: warranty.orderNumber,
      warrantyDuration: warranty.warrantyDuration || "1 Year",
    },
    "1_DAY",
    siteUrl
  );

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject,
    emailType: "WARRANTY_REMINDER_1D",
    orderId: warranty.orderId,
    productName: fullProductName,
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
 *
 * Uses the Supabase service-role client directly on the server.
 * Designed for daily cron execution.
 */
export async function checkAndDispatchWarrantyReminders(): Promise<{
  scanned: number;
  reminders6mSent: number;
  reminders1dSent: number;
  expiredMarked: number;
  errors: string[];
}> {
  const now = new Date();
  const nowTime = now.getTime();
  const errors: string[] = [];
  let reminders6mSent = 0;
  let reminders1dSent = 0;
  let expiredMarked = 0;

  // 1. Fetch active/expiring warranties via service-role client
  const { data: rawWarranties, error: fetchErr } = await supabaseAdmin
    .from("Warranty")
    .select("*")
    .not("warrantyStatus", "in", '("EXPIRED","CANCELLED")');

  if (fetchErr) {
    console.error("[CRON WARRANTY SCAN ERROR]", fetchErr);
    throw new Error(`Failed to query Warranty table: ${fetchErr.message}`);
  }

  const warranties = rawWarranties || [];
  if (warranties.length === 0) {
    return { scanned: 0, reminders6mSent: 0, reminders1dSent: 0, expiredMarked: 0, errors: [] };
  }

  // 2. Batch load related orders, orderItems, and mobileProducts for real names and cancellation checks
  const orderIds = Array.from(new Set(warranties.map((w: any) => w.orderId).filter(Boolean)));
  const itemIds = Array.from(new Set(warranties.map((w: any) => w.orderItemId).filter(Boolean)));

  let orderMap = new Map<string, any>();
  if (orderIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from("Order")
      .select("id, orderNumber, orderStatus")
      .in("id", orderIds);
    if (orders) {
      orderMap = new Map(orders.map((o) => [o.id, o]));
    }
  }

  let itemMap = new Map<string, any>();
  if (itemIds.length > 0) {
    const { data: items } = await supabaseAdmin
      .from("OrderItem")
      .select("*")
      .in("id", itemIds);
    if (items) {
      itemMap = new Map(items.map((i) => [i.id, i]));
    }
  }

  const productIds = Array.from(
    new Set(
      Array.from(itemMap.values())
        .map((i) => i.productId)
        .filter(Boolean)
    )
  );

  let productMap = new Map<string, any>();
  if (productIds.length > 0) {
    const { data: prods } = await supabaseAdmin
      .from("MobileProduct")
      .select("id, name, brand")
      .in("id", productIds);
    if (prods) {
      productMap = new Map(prods.map((p) => [p.id, p]));
    }
  }

  // 3. Process each warranty
  for (const w of warranties) {
    try {
      const order = orderMap.get(w.orderId);
      if (order && isOrderCancelled(order.orderStatus)) {
        await supabaseAdmin
          .from("Warranty")
          .update({ warrantyStatus: "CANCELLED" })
          .eq("id", w.id);
        continue;
      }

      const expiry = new Date(w.warrantyExpiryDate).getTime();
      const msUntilExpiry = expiry - nowTime;
      const daysUntilExpiry = msUntilExpiry / (1000 * 60 * 60 * 24);

      // Check 1: Past expiry date
      if (nowTime >= expiry) {
        await supabaseAdmin
          .from("Warranty")
          .update({ warrantyStatus: "EXPIRED" })
          .eq("id", w.id);
        expiredMarked++;
        continue;
      }

      const orderItem = itemMap.get(w.orderItemId);
      const catalogProd = orderItem?.productId ? productMap.get(orderItem.productId) : null;
      const realName = catalogProd?.name || orderItem?.productName || w.productName;
      const variantParts = [orderItem?.selectedStorage, orderItem?.selectedColor].filter(Boolean);
      const variantInfo = variantParts.length > 0 ? variantParts.join(", ") : undefined;
      const orderNumber = order?.orderNumber || (w.orderId ? `ORD${w.orderId.slice(0, 5)}` : undefined);
      const warrantyNumber = w.warrantyNumber || (orderNumber ? `WRT-${orderNumber}-1` : `WRT-${w.id.slice(0, 8)}`);

      const alreadyReminded1Day = Boolean(w.reminder1DaySentAt || w.reminded1DayAt);
      const alreadyReminded6Month = Boolean(w.reminder6MonthSentAt || w.reminded6MonthsAt);

      // Check 2: 1 Day Before Expiry (target window: within 0 to 36 hours before expiry for daily cron)
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 1.5 && !alreadyReminded1Day) {
        const sendResult = await sendWarrantyReminder1DayEmail({
          id: w.id,
          orderId: w.orderId,
          orderNumber,
          warrantyNumber,
          userId: w.userId,
          customerName: w.customerName,
          customerEmail: w.customerEmail,
          productName: realName,
          variantInfo,
          imeiNumber: w.imeiNumber,
          warrantyStartDate: w.warrantyStartDate,
          warrantyExpiryDate: w.warrantyExpiryDate,
          warrantyDuration: w.warrantyDuration,
        });

        if (sendResult.success) {
          const sentTimestamp = new Date().toISOString();
          await supabaseAdmin
            .from("Warranty")
            .update({
              reminder1DaySentAt: sentTimestamp,
              reminded1DayAt: sentTimestamp,
              warrantyStatus: "EXPIRING_SOON",
            })
            .eq("id", w.id);
          reminders1dSent++;
        } else {
          errors.push(`Failed to send 1-day reminder to ${w.customerEmail}: ${sendResult.error}`);
        }
      }
      // Check 3: 6 Months Before Expiry (target window: between 175 and 185 days for daily cron)
      else if (daysUntilExpiry >= 30 && daysUntilExpiry <= 185 && !alreadyReminded6Month) {
        const sendResult = await sendWarrantyReminder6MonthsEmail({
          id: w.id,
          orderId: w.orderId,
          orderNumber,
          warrantyNumber,
          userId: w.userId,
          customerName: w.customerName,
          customerEmail: w.customerEmail,
          productName: realName,
          variantInfo,
          imeiNumber: w.imeiNumber,
          warrantyStartDate: w.warrantyStartDate,
          warrantyExpiryDate: w.warrantyExpiryDate,
          warrantyDuration: w.warrantyDuration,
        });

        if (sendResult.success) {
          const sentTimestamp = new Date().toISOString();
          await supabaseAdmin
            .from("Warranty")
            .update({
              reminder6MonthSentAt: sentTimestamp,
              reminded6MonthsAt: sentTimestamp,
              warrantyStatus: "EXPIRING_SOON",
            })
            .eq("id", w.id);
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

  const { subject, html, text: plainText } = renderPasswordResetLinkEmail(
    {
      recipientName: user.name,
      recipientEmail: user.email,
      resetUrl: resetLink,
      expiresInMinutes,
      isAdmin: false,
    },
    appUrl
  );

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject,
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
  const siteUrl = getAppUrl();
  const { subject, html, text: plainText } = renderAccountDeletionConfirmedEmail(
    {
      recipientName: user.name,
      recipientEmail: user.email,
    },
    siteUrl
  );

  return sendGmailEmail({
    recipientName: user.name,
    recipientEmail: user.email,
    subject,
    emailType: "ACCOUNT_DELETED",
    contentSummary: plainText,
    text: plainText,
    html,
  });
}

// Re-export sendWarrantyEmail from modern mailer module
export { sendWarrantyEmail } from "./mailer";
export type { WarrantyEmailResult } from "./mailer";

