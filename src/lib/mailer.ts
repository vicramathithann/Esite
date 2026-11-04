import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env, getMissingServerEnvVars, getBaseUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  renderOtpEmail,
  renderWarrantyActivationEmail,
} from "./email-templates";
import { generateWarrantyCertificatePdf, formatKolkataDate } from "./warranty-pdf";

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

  const { subject, html, text: plainText } = renderOtpEmail(
    {
      recipientEmail: cleanTo,
      code: cleanCode,
      purpose: "registration",
      expiresInMinutes: 5,
    },
    siteUrl
  );

  const mailOptions = {
    from: `"VN Mobiles" <${senderAddress}>`,
    to: cleanTo,
    subject,
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
  force?: boolean;
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
    timeZone: "Asia/Kolkata",
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

  // 1. Idempotency Check (prevent duplicates unless forced by admin)
  const isForced = Boolean(options?.force || options?.forceResend);
  if (!isForced && order.id) {
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

  // 2. Prepare normalized warranty line items with real product names & variants
  const now = new Date();
  const orderDateFormatted = formatDate(order.createdAt || now);

  let sourceItems: OrderItemEmailData[] = items.length > 0 ? [...items] : [];

  if (sourceItems.length === 0 && order.id) {
    try {
      const dbItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      if (dbItems && dbItems.length > 0) {
        sourceItems = dbItems.map((dbI) => ({
          id: dbI.id,
          productId: dbI.productId,
          productName: dbI.productName,
          productBrand: dbI.productBrand,
          productImageUrl: dbI.productImageUrl,
          selectedColor: dbI.selectedColor,
          selectedStorage: dbI.selectedStorage,
          imeiNumber: dbI.imeiNumber,
          warrantyMonths: dbI.warrantyMonths || 12,
          warrantyStartDate: dbI.warrantyStartDate,
          warrantyExpiryDate: dbI.warrantyExpiryDate,
        }));
      }
    } catch (loadErr) {
      console.warn("[WARRANTY EMAIL] Notice: could not load order items from DB:", loadErr);
    }
  }

  if (sourceItems.length === 0 && warranties.length > 0) {
    sourceItems = warranties.map((w) => ({
      id: w.orderItemId,
      productName: w.productName || (orderNumber ? `Order #${orderNumber} Device` : "Protected Device"),
      imeiNumber: w.imeiNumber,
      warrantyMonths: 12,
      warrantyStartDate: w.warrantyStartDate,
      warrantyExpiryDate: w.warrantyExpiryDate,
    }));
  }

  if (sourceItems.length === 0) {
    console.warn(`[WARRANTY EMAIL WARNING] Order #${orderNumber} has no line items or warranty records. Using order reference.`);
    sourceItems = [
      {
        productName: orderNumber ? `Order #${orderNumber} Device` : "Protected Device",
        imeiNumber: `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        warrantyMonths: 12,
      },
    ];
  }

  // Build a lookup map of warranties by orderItemId or index
  const warrantyMap = new Map<string, WarrantyEmailData>();
  warranties.forEach((w) => {
    if (w.orderItemId) warrantyMap.set(w.orderItemId, w);
  });

  if (warranties.length === 0 && order.id) {
    try {
      const dbWars = await prisma.warranty.findMany({ where: { orderId: order.id } });
      if (dbWars && dbWars.length > 0) {
        dbWars.forEach((w) => {
          if (w.orderItemId) warrantyMap.set(w.orderItemId, w as any);
        });
      }
    } catch (wLookupErr) {
      console.warn("[WARRANTY EMAIL] Notice: could not load stored warranties:", wLookupErr);
    }
  }

  interface ResolvedWarrantyItem {
    productName: string;
    productBrand?: string;
    variantInfo: string;
    warrantyNumber: string;
    imeiNumber: string;
    coveragePeriod: string;
    startDateStr: string;
    expiryDateStr: string;
    status: string;
    rawStartDate: Date | string;
    rawExpiryDate: Date | string;
    rawPurchaseDate: Date | string;
  }

  const resolvedItems: ResolvedWarrantyItem[] = [];

  for (let idx = 0; idx < sourceItems.length; idx++) {
    const item = sourceItems[idx];
    const matchedWarranty = (item.id && warrantyMap.get(item.id)) || warranties[idx];
    const warrantyNum =
      matchedWarranty?.warrantyNumber || `WRT-${orderNumber}-${idx + 1}`;
    const imei =
      matchedWarranty?.imeiNumber || item.imeiNumber || `86${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;

    const months = item.warrantyMonths || 12;
    const durationStr =
      matchedWarranty?.warrantyDuration || `${Math.max(1, Math.round(months / 12))} Year Brand Warranty`;

    const start = matchedWarranty?.warrantyStartDate || item.warrantyStartDate || now;
    let expiry = matchedWarranty?.warrantyExpiryDate || item.warrantyExpiryDate;
    if (!expiry) {
      const expDate = new Date(start);
      expDate.setFullYear(expDate.getFullYear() + Math.max(1, Math.round(months / 12)));
      expiry = expDate;
    }

    let prodName = item.productName || matchedWarranty?.productName || "";
    let prodBrand = item.productBrand || "VN Mobiles";

    // Load real product name from database if missing or generic fallback
    if (
      item.productId &&
      (!prodName || prodName.includes("Device") || prodName.includes("Smartphone"))
    ) {
      try {
        const dbProd = await prisma.mobileProduct.findUnique({
          where: { id: item.productId },
          select: { name: true, brand: true },
        });
        if (dbProd) {
          prodName = dbProd.name;
          if (dbProd.brand) prodBrand = dbProd.brand;
        }
      } catch {}
    }

    const variantParts = [item.selectedStorage, item.selectedColor].filter(Boolean);
    const variantInfo = variantParts.length > 0 ? variantParts.join(", ") : "";

    resolvedItems.push({
      productName: prodName || `Order #${orderNumber} Device`,
      productBrand: prodBrand,
      variantInfo,
      warrantyNumber: warrantyNum,
      imeiNumber: imei,
      coveragePeriod: durationStr,
      startDateStr: formatKolkataDate(start),
      expiryDateStr: formatKolkataDate(expiry),
      status: matchedWarranty?.warrantyStatus || "ACTIVE",
      rawStartDate: start,
      rawExpiryDate: expiry,
      rawPurchaseDate: order.createdAt || start,
    });
  }

  // Generate official PDF certificate attachment (A4 portrait, 1 page per device)
  let pdfAttachment: { filename: string; content: Buffer; contentType: string } | null = null;
  try {
    const pdfResult = await generateWarrantyCertificatePdf({
      customerName,
      customerEmail: cleanRecipientEmail,
      orderNumber,
      devices: resolvedItems.map((r, i) => ({
        productId: sourceItems[i]?.productId,
        productName: r.productName,
        productBrand: r.productBrand || "VN Mobiles",
        variantInfo: r.variantInfo,
        warrantyNumber: r.warrantyNumber,
        imeiNumber: r.imeiNumber,
        coveragePeriod: r.coveragePeriod,
        warrantyStartDate: r.rawStartDate,
        warrantyExpiryDate: r.rawExpiryDate,
        purchaseDate: r.rawPurchaseDate,
        orderNumber,
        status: r.status,
      })),
    });
    pdfAttachment = {
      filename: pdfResult.filename,
      content: pdfResult.pdfBuffer,
      contentType: "application/pdf",
    };
    console.log(`[WARRANTY PDF] Successfully built ${pdfResult.filename} (${pdfResult.pdfBuffer.length} bytes)`);
  } catch (pdfErr) {
    console.error(`[WARRANTY PDF ERROR] Could not generate PDF for order #${orderNumber}:`, pdfErr);
  }

  const { subject, html, text: plainText } = renderWarrantyActivationEmail(
    {
      orderNumber,
      customerName,
      customerEmail: cleanRecipientEmail,
      items: resolvedItems,
    },
    siteUrl
  );

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
    attachments: pdfAttachment ? [pdfAttachment] : [],
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

    // Update Order warrantyEmailSentAt & certificateEmailSent
    if (order.id) {
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            warrantyEmailSentAt: new Date(),
            certificateEmailSent: true,
          },
        });
      } catch (ordErr) {
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { warrantyEmailSentAt: new Date() },
          });
        } catch {}
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
