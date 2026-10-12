import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

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
  emailType: "EMAIL_VERIFICATION" | "ORDER_CONFIRMATION" | "ORDER_STATUS" | "WARRANTY_NOTIFICATION";
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

let cachedTransporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!user || !pass) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        pass,
      },
    });
  }

  return cachedTransporter;
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
    const fromAddress = `"VM Mobiles" <${userEmail}>`;
    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${cleanRecipientEmail}>`,
      subject: options.subject,
      text: options.text || options.contentSummary || options.subject,
      html: options.html,
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
    const errorMessage = err instanceof Error ? err.message : "Unknown error while sending email via Gmail SMTP.";
    console.error(`[GMAIL SMTP ERROR] Delivery failed to ${cleanRecipientEmail}:`, errorMessage);

    if (notificationRecord) {
      await prisma.emailNotification.update({
        where: { id: notificationRecord.id },
        data: {
          status: "FAILED",
          errorMessage,
        },
      });
    }

    return {
      success: false,
      status: "FAILED",
      statusCode: 500,
      message: errorMessage,
      error: errorMessage,
      notificationId: notificationRecord?.id,
    };
  }
}

// Backward-compatible alias for existing callers
export const sendMsg91Email = sendGmailEmail;
export const sendEmail = sendGmailEmail;

/**
 * Sends User Email Verification message with unique expiring token and 5-minute OTP.
 */
export async function sendUserVerificationEmail(
  user: {
    id: string;
    name: string;
    email: string;
  },
  token: string,
  otp?: string
): Promise<EmailSendResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyLink = `${appUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
  const codeDisplay = otp || token.slice(0, 6);

  const plainText = `Hi ${user.name},\n\nYour VM Mobiles verification OTP is: ${codeDisplay}\nThis code is valid for 5 minutes.\n\nAlternatively, verify using this link:\n${verifyLink}\n\nFor security reasons, never share this OTP with anyone.\n\nThank you,\nVM Mobiles`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - VM Mobiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #232F3E 0%, #131921 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 18px; padding: 6px 12px; border-radius: 8px; margin-bottom: 8px; letter-spacing: 0.5px;">VM</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">VM Mobiles</h1>
              <p style="margin: 4px 0 0 0; color: #D4B483; font-size: 12px; font-weight: 500;">Premium Smartphones & Accessories</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 20px; font-weight: 700;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${user.name}</strong>,<br>
                Thank you for choosing VM Mobiles. Please use the following 6-digit verification code to complete your account registration:
              </p>

              <!-- OTP Code Box -->
              <div style="background-color: #FFFDF9; border: 2px dashed #C9A66B; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8C6226; letter-spacing: 1px; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #8C6226; font-family: monospace;">${codeDisplay}</span>
                <div style="margin-top: 10px; display: inline-block; background-color: #FEF3C7; color: #92400E; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px;">
                  ⏱ Valid for 5 minutes only
                </div>
              </div>

              <!-- Button CTA -->
              <p style="margin: 20px 0 12px 0; font-size: 13px; color: #6B7280; text-align: center;">Or click the button below to verify automatically:</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${verifyLink}" style="display: inline-block; background-color: #C9A66B; color: #FFFFFF; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(201, 166, 107, 0.3);">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <div style="margin-top: 32px; padding: 14px 16px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; line-height: 1.5;">
                <strong style="color: #374151;">Security Alert:</strong> VM Mobiles will never ask for your verification code or password. If you did not create this account, you can safely disregard this email. Single-use only.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; ${new Date().getFullYear()} VM Mobiles. All rights reserved.<br>
              Official Store &bull; Device Shield &bull; Pan-India Support
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendGmailEmail({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "Verify Your Email - VM Mobiles",
    emailType: "EMAIL_VERIFICATION",
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
  }>;
}): Promise<EmailSendResult> {
  const primaryItem = order.items[0];
  const productSummary = order.items
    .map((i) => `${i.productName}${i.selectedStorage ? ` (${i.selectedStorage})` : ""}`)
    .join(", ");
  const totalQty = order.items.reduce((s, i) => s + (i.quantity || 1), 0);
  const formattedTotal = `₹${order.totalAmount.toLocaleString("en-IN")}`;

  const plainText = `Hi ${order.customerName},\n\nThank you for your order!\n\nYour order ${order.orderNumber} has been successfully confirmed.\n\nProduct: ${productSummary}\nQuantity: ${totalQty}\nOrder Total: ${formattedTotal}\n\nWe will notify you when your order is shipped.\n\nThank you,\nVM Mobiles`;

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #1F2937;">
        <strong>${item.productName}</strong>
        ${item.selectedStorage ? `<span style="color: #6B7280; font-size: 12px;"> - ${item.selectedStorage}</span>` : ""}
        ${item.selectedColor ? `<span style="color: #6B7280; font-size: 12px;"> (${item.selectedColor})</span>` : ""}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: center; color: #4B5563;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: right; font-weight: 600; color: #111827;">
        ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString("en-IN")}
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order ${order.orderNumber} Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #232F3E 0%, #131921 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 18px; padding: 6px 12px; border-radius: 8px; margin-bottom: 8px;">VM</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">Order Confirmed!</h1>
              <p style="margin: 4px 0 0 0; color: #D4B483; font-size: 12px;">Order ID: ${order.orderNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${order.customerName}</strong>,<br>
                Thank you for your order. Your order <strong>${order.orderNumber}</strong> has been successfully placed and confirmed.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #E5E7EB; text-align: left; font-size: 12px; color: #6B7280; text-transform: uppercase;">
                    <th style="padding-bottom: 8px;">Item</th>
                    <th style="padding-bottom: 8px; text-align: center;">Qty</th>
                    <th style="padding-bottom: 8px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr>
                    <td colspan="2" style="padding-top: 16px; font-size: 14px; font-weight: 700; color: #111827;">Total Amount</td>
                    <td style="padding-top: 16px; font-size: 16px; font-weight: 800; color: #8C6226; text-align: right;">${formattedTotal}</td>
                  </tr>
                </tbody>
              </table>

              <div style="background-color: #F9FAFB; border-left: 4px solid #C9A66B; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-top: 24px; font-size: 13px; color: #4B5563;">
                We are preparing your package for shipment. We will notify you with tracking details as soon as it is dispatched.
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; ${new Date().getFullYear()} VM Mobiles. Thank you for shopping with us!
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendGmailEmail({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order ${order.orderNumber} Confirmed`,
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
  note?: string
): Promise<EmailSendResult> {
  const readableStatus = newStatus.replace(/_/g, " ");
  const trackingInfo = order.trackingNumber
    ? `\nCarrier: ${order.shippingCarrier || "Standard Delivery"}\nTracking Number: ${order.trackingNumber}`
    : "";

  const plainText = `Hi ${order.customerName},\n\nYour order ${order.orderNumber} status has been updated to: ${readableStatus}.${trackingInfo}\n${note ? `\nNote: ${note}\n` : ""}\nYou can track your order anytime on VM Mobiles.\n\nThank you,\nVM Mobiles`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order ${order.orderNumber} Update: ${readableStatus}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #232F3E 0%, #131921 100%); padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">Order Status Update</h1>
              <p style="margin: 4px 0 0 0; color: #D4B483; font-size: 12px;">Order ID: ${order.orderNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${order.customerName}</strong>,<br>
                The status of your order <strong>${order.orderNumber}</strong> has been updated:
              </p>

              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
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
                  <strong>Note:</strong> ${note}
                </div>
              ` : ""}
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; ${new Date().getFullYear()} VM Mobiles.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendGmailEmail({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order ${order.orderNumber} Update: ${readableStatus}`,
    emailType: "ORDER_STATUS",
    orderId: order.id,
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

  const plainText = `Hi ${warranty.customerName},\n\nOfficial Mobile Warranty Activated!\n\nProduct: ${warranty.productName}\nOrder: ${warranty.orderNumber}\nIMEI Number: ${warranty.imeiNumber}\nPurchase Date: ${purchaseFormatted}\nWarranty: ${warranty.warrantyDuration}\nWarranty Expiry: ${expiryFormatted}\nWarranty Status: ACTIVE\n\nYour smartphone is protected by VM Mobiles Device Shield.\n\nThank you,\nVM Mobiles`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Warranty Activated for ${warranty.productName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #232F3E 0%, #131921 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #C9A66B; color: #FFFFFF; font-weight: 800; font-size: 16px; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px;">🛡️ DEVICE SHIELD</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">Warranty Certificate</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #4B5563;">
                Hi <strong>${warranty.customerName}</strong>,<br>
                Your official manufacturer warranty coverage has been activated on VM Mobiles Device Shield.
              </p>

              <table role="presentation" width="100%" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #6B7280; padding: 6px 0;">Product:</td>
                  <td style="font-weight: 600; color: #111827; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #6B7280; padding: 6px 0;">Order Number:</td>
                  <td style="font-weight: 600; color: #111827; text-align: right; padding: 6px 0;">${warranty.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6B7280; padding: 6px 0;">IMEI:</td>
                  <td style="font-family: monospace; font-weight: 600; color: #8C6226; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6B7280; padding: 6px 0;">Coverage:</td>
                  <td style="font-weight: 600; color: #111827; text-align: right; padding: 6px 0;">${warranty.warrantyDuration}</td>
                </tr>
                <tr>
                  <td style="color: #6B7280; padding: 6px 0;">Expires On:</td>
                  <td style="font-weight: 600; color: #059669; text-align: right; padding: 6px 0;">${expiryFormatted}</td>
                </tr>
              </table>

              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #065F46;">
                Status: ACTIVE Coverage
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9FAFB; border-top: 1px solid #E5E7EB; padding: 20px 32px; text-align: center; font-size: 11px; color: #9CA3AF;">
              &copy; ${new Date().getFullYear()} VM Mobiles Device Shield.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendGmailEmail({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject: `Official Warranty Activated for ${warranty.productName} (Order #${warranty.orderNumber})`,
    emailType: "WARRANTY_NOTIFICATION",
    orderId: warranty.orderId,
    productName: warranty.productName,
    contentSummary: plainText,
    text: plainText,
    html,
  });
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
