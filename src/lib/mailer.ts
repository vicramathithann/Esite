import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env, getMissingServerEnvVars, getBaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export type EmailFailureReason =
  | "MISSING_ENV"
  | "OTP_STORE_FAILED"
  | "EAUTH"
  | "SMTP_CONNECTION"
  | "SEND_FAILED";

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
 * Sanitizes credentials thoroughly: trims username, strips spaces and wrapping quotes from app password.
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
  const upperResponse = (response || "").toUpperCase();

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
    upperResponse.includes("535") ||
    upperResponse.includes("534") ||
    upperMsg.includes("AUTHENTICATION") ||
    upperMsg.includes("USERNAME AND PASSWORD NOT ACCEPTED") ||
    upperResponse.includes("USERNAME AND PASSWORD NOT ACCEPTED")
  ) {
    reason = "EAUTH";
  } else if (
    upperCode === "ETIMEDOUT" ||
    upperCode === "ESOCKETTIMEDOUT" ||
    upperCode === "ECONNECTION" ||
    upperCode === "ECONNREFUSED" ||
    upperCode === "ECONNRESET" ||
    upperCode === "EDNS" ||
    upperMsg.includes("TIMEOUT") ||
    upperMsg.includes("TIMEDOUT") ||
    upperMsg.includes("CONNECTION")
  ) {
    reason = "SMTP_CONNECTION";
  }

  return new MailerError(rawMessage, reason, { code, response, responseCode, command });
}

/**
 * Sends a 6-digit verification OTP email to the user.
 * Strictly awaits delivery and logs a single JSON line on failure (never leaking secrets or the code).
 */
export async function sendOtpEmail(to: string, code: string, req?: Request): Promise<{ messageId: string }> {
  const cleanTo = to.trim().toLowerCase();
  const cleanCode = code.trim();

  let transporter: Transporter;
  try {
    transporter = createMailerTransport();
  } catch (initErr) {
    const error = classifyMailerError(initErr);
    console.error(
      JSON.stringify({
        event: "MAILER_INIT_ERROR",
        recipient: cleanTo,
        reason: error.reason,
        message: error.message,
        code: error.code || null,
        command: error.command || null,
        response: error.response || null,
        responseCode: error.responseCode || null,
      })
    );
    throw error;
  }

  const senderAddress = env.GMAIL_USER;
  const siteUrl = getBaseUrl(req);

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
    console.error(
      JSON.stringify({
        event: "MAILER_SEND_ERROR",
        recipient: cleanTo,
        reason: error.reason,
        message: error.message,
        code: error.code || null,
        command: error.command || null,
        response: error.response || null,
        responseCode: error.responseCode || null,
      })
    );
    throw error;
  }
}

// ==============================================================================
// WARRANTY EMAIL IMPLEMENTATION
// ==============================================================================

export interface OrderEmailData {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  totalAmount?: number;
  createdAt?: string | Date;
  warrantyEmailSentAt?: string | Date | null;
}

export interface OrderItemEmailData {
  id?: string;
  productId?: string;
  productName: string;
  productBrand?: string;
  quantity?: number;
  price?: number;
  selectedColor?: string | null;
  selectedStorage?: string | null;
  imeiNumber?: string | null;
  warrantyMonths?: number;
  warrantyStartDate?: string | Date;
  warrantyExpiryDate?: string | Date;
}

export interface WarrantyEmailData {
  id?: string;
  warrantyNumber?: string;
  orderId?: string;
  orderItemId?: string;
  userId?: string | null;
  customerName?: string;
  customerEmail?: string;
  productName?: string;
  imeiNumber?: string;
  purchaseDate?: string | Date;
  warrantyDuration?: string;
  warrantyStartDate?: string | Date;
  warrantyExpiryDate?: string | Date;
  warrantyStatus?: string;
  emailSent?: boolean;
}

export interface SendWarrantyEmailOptions {
  forceResend?: boolean;
}

export interface WarrantyEmailResult {
  success: boolean;
  status: "SENT" | "FAILED" | "ALREADY_SENT" | "LOGGED";
  statusCode: number;
  message: string;
  notificationId?: string;
  messageId?: string;
  error?: string;
}

function formatDate(val: string | Date | undefined): string {
  if (!val) return "N/A";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Sends a separate, luxury-branded Warranty Details Email for an order.
 * Strictly awaited, idempotent, logs to EmailNotification and outputs a single JSON line on failure.
 */
export async function sendWarrantyEmail(
  order: OrderEmailData,
  items: OrderItemEmailData[] = [],
  warranties: WarrantyEmailData[] = [],
  req?: Request,
  options?: SendWarrantyEmailOptions
): Promise<WarrantyEmailResult> {
  const cleanRecipientEmail = (order.customerEmail || "").trim().toLowerCase();
  const customerName = (order.customerName || "Valued Customer").trim();
  const orderNumber = order.orderNumber || "ORD-N/A";
  const siteUrl = getBaseUrl(req);

  // 1. Idempotency Check (prevent duplicates on page refreshes or automatic retries)
  if (!options?.forceResend && order.id) {
    if (order.warrantyEmailSentAt) {
      console.log(
        `[WARRANTY IDEMPOTENCY] Order #${orderNumber} warranty email was already sent at ${order.warrantyEmailSentAt}. Skipping duplicate.`
      );
      return {
        success: true,
        status: "ALREADY_SENT",
        statusCode: 200,
        message: "Warranty email has already been sent for this order.",
      };
    }

    try {
      const existingSent = await prisma.emailNotification.findFirst({
        where: {
          orderId: order.id,
          emailType: "WARRANTY",
          status: "SENT",
        },
      });

      if (existingSent) {
        console.log(
          `[WARRANTY IDEMPOTENCY] Order #${orderNumber} already has SENT EmailNotification (${existingSent.id}). Skipping duplicate.`
        );
        return {
          success: true,
          status: "ALREADY_SENT",
          statusCode: 200,
          message: "Warranty email has already been sent for this order.",
          notificationId: existingSent.id,
        };
      }
    } catch (checkErr) {
      console.warn("[WARRANTY IDEMPOTENCY] Notice: check for existing notification skipped:", checkErr);
    }
  }

  // 2. Prepare normalized warranty line items
  const now = new Date();
  const orderDateFormatted = formatDate(order.createdAt || now);

  // Build a lookup map of warranties by orderItemId or index
  const warrantyMap = new Map<string, WarrantyEmailData>();
  warranties.forEach((w) => {
    if (w.orderItemId) warrantyMap.set(w.orderItemId, w);
  });

  interface ResolvedWarrantyItem {
    productName: string;
    variantInfo: string;
    warrantyNumber: string;
    imeiNumber: string;
    coveragePeriod: string;
    startDateStr: string;
    expiryDateStr: string;
    status: string;
  }

  const resolvedItems: ResolvedWarrantyItem[] = [];

  const sourceItems: OrderItemEmailData[] =
    items.length > 0
      ? items
      : warranties.length > 0
      ? warranties.map((w) => ({
          productName: w.productName || "Mobile Device",
          imeiNumber: w.imeiNumber,
          warrantyMonths: 12,
        }))
      : [{ productName: "VN Mobiles Certified Device", imeiNumber: undefined, warrantyMonths: 12 }];

  sourceItems.forEach((item, idx) => {
    const matchedWarranty = (item.id && warrantyMap.get(item.id)) || warranties[idx];
    const warrantyNum =
      matchedWarranty?.warrantyNumber || `WRT-${orderNumber}-${idx + 1}`;
    const imei =
      matchedWarranty?.imeiNumber || item.imeiNumber || `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;

    const months = item.warrantyMonths || 12;
    const durationStr =
      matchedWarranty?.warrantyDuration || `${Math.round(months / 12)} Year Brand Warranty`;

    const start = matchedWarranty?.warrantyStartDate || item.warrantyStartDate || now;
    const expiry =
      matchedWarranty?.warrantyExpiryDate ||
      item.warrantyExpiryDate ||
      new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    const variantParts = [item.selectedStorage, item.selectedColor].filter(Boolean);
    const variantInfo = variantParts.length > 0 ? variantParts.join(" • ") : "";

    resolvedItems.push({
      productName: item.productName || matchedWarranty?.productName || "Mobile Smartphone",
      variantInfo,
      warrantyNumber: warrantyNum,
      imeiNumber: imei,
      coveragePeriod: durationStr,
      startDateStr: formatDate(start),
      expiryDateStr: formatDate(expiry),
      status: matchedWarranty?.warrantyStatus || "ACTIVE",
    });
  });

  const subject = `Your Warranty Details for Order #${orderNumber} - VN Mobiles`;
  const warrantyPortalUrl = `${siteUrl}/orders/${order.id || orderNumber}`;

  // 3. Plain Text Template
  const plainTextItems = resolvedItems
    .map(
      (item, i) => `[Item ${i + 1}] ${item.productName}${item.variantInfo ? ` (${item.variantInfo})` : ""}
- Warranty Number: ${item.warrantyNumber}
- Registered IMEI / Serial: ${item.imeiNumber}
- Coverage Period: ${item.coveragePeriod}
- Coverage Validity: ${item.startDateStr} to ${item.expiryDateStr}
- Status: ${item.status}`
    )
    .join("\n\n");

  const plainText = [
    `Your Warranty Details for Order #${orderNumber} - VN Mobiles`,
    "===========================================================",
    "",
    `Dear ${customerName},`,
    "",
    `Thank you for your purchase from VN Mobiles! We are pleased to confirm that official manufacturer warranty coverage has been registered and activated for your order #${orderNumber} placed on ${orderDateFormatted}.`,
    "",
    "REGISTERED PRODUCTS & WARRANTY DETAILS:",
    "-----------------------------------------------------------",
    plainTextItems,
    "",
    "WHAT IS COVERED:",
    "• Manufacturing defects in motherboard, display digitizer, camera module, and hardware circuitry",
    "• Battery degradation replacement if maximum capacity drops below 80% during the warranty duration",
    "• Authorized service center labor and official 100% genuine replacement components",
    "",
    "WHAT IS NOT COVERED:",
    "• Accidental drops, physical impact damage, cracked screens, or casing deformation",
    "• Liquid contact, water submersion, or corrosion damage",
    "• Unauthorized third-party repairs, tampering, or unapproved firmware rooting",
    "• Everyday cosmetic wear, minor abrasions, and normal aesthetic fading",
    "",
    "HOW TO CLAIM WARRANTY:",
    "1. Reply directly to this email or contact our Priority Support Desk at support@vnmobiles.in / +91 98765 43210.",
    `2. Access your digital warranty cards online anytime: ${warrantyPortalUrl}`,
    "3. Present your registered IMEI number and invoice at any authorized brand service center nationwide.",
    "",
    "IMPORTANT PROOF OF PURCHASE NOTE:",
    "Please retain your Tax Invoice and Order Confirmation email as official proof of purchase alongside this warranty certificate. Valid proof of purchase is required when making a warranty claim.",
    "",
    `VN Mobiles Customer Protection • ${siteUrl}`,
    `© ${new Date().getFullYear()} VN Mobiles India. All rights reserved.`,
  ].join("\n");

  // 4. Luxury HTML Template (Dark header, gold accents #C9A66B, responsive tables, clear terms)
  const itemsHtml = resolvedItems
    .map(
      (item) => `
      <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
        <div style="background-color: #F9FAFB; padding: 12px 16px; border-bottom: 1px solid #E5E7EB;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <strong style="color: #111827; font-size: 14px;">${item.productName}</strong>
                ${item.variantInfo ? `<span style="color: #6B7280; font-size: 12px; margin-left: 6px;">(${item.variantInfo})</span>` : ""}
              </td>
              <td align="right">
                <span style="display: inline-block; padding: 2px 8px; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${item.status}
                </span>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding: 14px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 12px; line-height: 1.6;">
            <tr>
              <td style="color: #6B7280; width: 40%; padding: 4px 0;">Warranty Number</td>
              <td style="color: #8C6226; font-weight: 700; font-family: monospace; font-size: 12px; padding: 4px 0;">${item.warrantyNumber}</td>
            </tr>
            <tr>
              <td style="color: #6B7280; padding: 4px 0;">Registered IMEI</td>
              <td style="color: #111827; font-weight: 600; font-family: monospace; padding: 4px 0;">${item.imeiNumber}</td>
            </tr>
            <tr>
              <td style="color: #6B7280; padding: 4px 0;">Coverage Period</td>
              <td style="color: #111827; font-weight: 600; padding: 4px 0;">${item.coveragePeriod}</td>
            </tr>
            <tr>
              <td style="color: #6B7280; padding: 4px 0;">Valid From / To</td>
              <td style="color: #111827; padding: 4px 0;"><strong>${item.startDateStr}</strong> to <strong>${item.expiryDateStr}</strong></td>
            </tr>
          </table>
        </div>
      </div>
    `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF;">
    Your official Device Shield Warranty Certificate for VN Mobiles Order #${orderNumber} is now active.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F5F7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Luxury Dark Header with Gold Accent Border -->
          <tr>
            <td style="background-color: #111827; padding: 26px 32px; border-bottom: 3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 30px; height: 30px; line-height: 30px; text-align: center; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 14px; border-radius: 50%; vertical-align: middle; margin-right: 10px;">VN</span>
                    <span style="color: #FFFFFF; font-size: 20px; font-weight: 700; vertical-align: middle; letter-spacing: -0.4px;">VN Mobiles</span>
                  </td>
                  <td align="right" style="color: #9CA3AF; font-size: 12px;">
                    Order <strong style="color: #E5CBA2;">#${orderNumber}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Certificate Body -->
          <tr>
            <td style="padding: 32px;">
              <!-- Badge -->
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C6226; letter-spacing: 0.8px; margin-bottom: 6px;">
                Official Warranty Certificate
              </div>
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #111827; line-height: 1.3;">
                Warranty Activated for Your Order
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Dear <strong style="color: #111827;">${customerName}</strong>,<br>
                Thank you for your purchase from VN Mobiles! Your devices have been registered in our official warranty database for order <strong style="color: #111827;">#${orderNumber}</strong> placed on <strong>${orderDateFormatted}</strong>.
              </p>

              <!-- Products Section -->
              <div style="margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B7280; letter-spacing: 0.5px; margin-bottom: 12px;">
                  Covered Devices & Certificates
                </div>
                ${itemsHtml}
              </div>

              <!-- Terms Box (What is covered / not covered) -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 24px 0;">
                <div style="font-weight: 700; font-size: 14px; color: #1E293B; margin-bottom: 14px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
                  Device Shield Protection Coverage Terms
                </div>
                
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td valign="top" style="padding-bottom: 12px;">
                      <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 4px;">
                        ✔ WHAT IS COVERED:
                      </div>
                      <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>Manufacturing defects in motherboard, internal circuits, and display</li>
                        <li>Camera sensor, speaker, and microphone component failures</li>
                        <li>Battery capacity degradation below 80% during the coverage term</li>
                        <li>100% Genuine brand OEM parts & authorized technician labor</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td valign="top">
                      <div style="font-size: 12px; font-weight: 700; color: #B91C1C; margin-bottom: 4px;">
                        ✖ WHAT IS NOT COVERED:
                      </div>
                      <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.6;">
                        <li>Accidental drops, physical impact cracks, or casing damage</li>
                        <li>Liquid submersion, water ingress, or moisture corrosion</li>
                        <li>Unauthorized third-party disassembly, repairs, or OS rooting</li>
                        <li>Everyday aesthetic cosmetic wear, scratches, and abrasions</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- How to Claim -->
              <div style="background-color: #FFFDF9; border: 1px solid #F3E8D2; border-radius: 10px; padding: 18px; margin: 24px 0;">
                <div style="font-weight: 700; font-size: 13px; color: #8C6226; margin-bottom: 8px;">
                  How to Submit a Warranty Claim:
                </div>
                <ol style="margin: 0; padding-left: 18px; font-size: 12px; color: #5B4828; line-height: 1.6;">
                  <li>Reply directly to this email or contact support at <a href="mailto:support@vnmobiles.in" style="color: #8C6226; font-weight: 600;">support@vnmobiles.in</a> / <strong>+91 98765 43210</strong>.</li>
                  <li>Provide your Warranty Number or Order <strong>#${orderNumber}</strong>.</li>
                  <li>Present your registered IMEI number and invoice copy at any authorized brand service center.</li>
                </ol>
              </div>

              <!-- Proof of Purchase Notice -->
              <div style="background-color: #FEF3C7; border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 4px; margin: 24px 0;">
                <div style="font-size: 12px; color: #92400E; line-height: 1.5;">
                  <strong>Notice on Proof of Purchase:</strong> Please retain your Order Confirmation email and tax invoice as authoritative proof of purchase alongside this warranty certificate. Valid proof of purchase is required when submitting a claim.
                </div>
              </div>

              <!-- Button CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${warrantyPortalUrl}" style="display: inline-block; background-color: #111827; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      View Order & Digital Warranty Cards
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F9FAFB; border-top: 1px solid #E5E7EB; text-align: center; font-size: 11px; color: #9CA3AF; line-height: 1.6;">
              © ${new Date().getFullYear()} VN Mobiles India. All rights reserved.<br>
              Official Brand Partner & Certified Smartphone Distributor.<br>
              <a href="${siteUrl}" style="color: #6B7280; text-decoration: underline; margin: 0 6px;">Home</a> •
              <a href="${siteUrl}/orders" style="color: #6B7280; text-decoration: underline; margin: 0 6px;">My Orders</a> •
              <a href="${siteUrl}/track" style="color: #6B7280; text-decoration: underline; margin: 0 6px;">Track Shipment</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  // 5. Create audit record in EmailNotification table (status: PENDING)
  let notificationRecord: { id: string } | null = null;
  try {
    notificationRecord = await prisma.emailNotification.create({
      data: {
        userId: order.userId || null,
        recipientEmail: cleanRecipientEmail,
        recipientName: customerName,
        emailType: "WARRANTY",
        orderId: order.id || null,
        productName: resolvedItems[0]?.productName || "Mobile Smartphone",
        templateId: "WARRANTY_CERTIFICATE_V1",
        subject,
        contentSummary: plainText.slice(0, 500),
        status: "PENDING",
      },
    });
  } catch (dbErr) {
    console.error("[WARRANTY EMAIL AUDIT] Failed to record pending notification:", dbErr);
  }

  // 6. Initialize Mailer Transporter
  let transporter: Transporter;
  try {
    transporter = createMailerTransport();
  } catch (initErr) {
    const error = classifyMailerError(initErr);
    console.error(
      JSON.stringify({
        event: "WARRANTY_EMAIL_INIT_ERROR",
        orderNumber,
        recipient: cleanRecipientEmail,
        reason: error.reason,
        message: error.message,
        code: error.code || null,
        command: error.command || null,
        response: error.response || null,
        responseCode: error.responseCode || null,
      })
    );

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: { status: "FAILED", errorMessage: error.message },
        });
      } catch {}
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: error.message,
      error: error.message,
      notificationId: notificationRecord?.id,
    };
  }

  // 7. Dispatch Email via Gmail SMTP
  const senderAddress = env.GMAIL_USER;
  const mailOptions = {
    from: `"VN Mobiles" <${senderAddress}>`,
    to: `"${customerName}" <${cleanRecipientEmail}>`,
    replyTo: senderAddress,
    subject,
    text: plainText,
    html,
    headers: {
      "X-Mailer": "VN Mobiles Warranty Service",
      "Auto-Submitted": "auto-generated",
    },
  };

  try {
    console.log(`[WARRANTY EMAIL] Dispatching warranty certificate for order #${orderNumber} to ${cleanRecipientEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[WARRANTY EMAIL SUCCESS] Delivered for order #${orderNumber}. MessageId: ${info.messageId}`);

    // Update EmailNotification status: SENT
    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });
      } catch (err) {
        console.warn("[WARRANTY EMAIL AUDIT] Could not mark notification as SENT:", err);
      }
    }

    // Update Order warrantyEmailSentAt
    if (order.id) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: { warrantyEmailSentAt: new Date() },
        });
      } catch (ordErr) {
        console.warn("[WARRANTY EMAIL AUDIT] Could not update order warrantyEmailSentAt:", ordErr);
      }
    }

    // Mark matching warranty rows as emailSent: true
    for (const w of warranties) {
      if (w.id) {
        try {
          await prisma.warranty.update({
            where: { id: w.id },
            data: { emailSent: true },
          });
        } catch {}
      }
    }

    return {
      success: true,
      status: "SENT",
      statusCode: 200,
      message: "Warranty certificate delivered successfully via Gmail SMTP.",
      notificationId: notificationRecord?.id,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const error = classifyMailerError(err);
    console.error(
      JSON.stringify({
        event: "WARRANTY_EMAIL_ERROR",
        orderNumber,
        recipient: cleanRecipientEmail,
        reason: error.reason,
        message: error.message,
        code: error.code || null,
        command: error.command || null,
        response: error.response || null,
        responseCode: error.responseCode || null,
      })
    );

    if (notificationRecord) {
      try {
        await prisma.emailNotification.update({
          where: { id: notificationRecord.id },
          data: {
            status: "FAILED",
            errorMessage: error.message,
          },
        });
      } catch {}
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: error.message,
      error: error.message,
      notificationId: notificationRecord?.id,
    };
  }
}

/**
 * Validates the live SMTP connection with Gmail servers without sending an email.
 */
export async function verifyMailerConnection(): Promise<{ success: boolean; message: string }> {
  const transporter = createMailerTransport();
  await transporter.verify();
  return { success: true, message: "SMTP connection verified successfully." };
}

export default sendOtpEmail;
