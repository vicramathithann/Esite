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
  emailType: "EMAIL_VERIFICATION" | "ORDER_CONFIRMATION" | "ORDER_STATUS" | "WARRANTY_NOTIFICATION" | "WARRANTY_REMINDER_6M" | "WARRANTY_REMINDER_1D" | "LOGIN_OTP" | "PASSWORD_RESET";
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
    // VN Mobiles display name with authenticated Gmail sender address
    const fromAddress = `"VN Mobiles" <${userEmail}>`;
    const mailOptions = {
      from: fromAddress,
      to: `"${recipientName}" <${cleanRecipientEmail}>`,
      subject: options.subject,
      text: options.text || options.contentSummary || options.subject,
      html: options.html,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
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
 * Sends User Email Verification message with unique 5-minute OTP for VN Mobiles.
 * 
 * Optimized for high inbox deliverability:
 * - Direct, transactional content without spam trigger words
 * - Clean, standard HTML layout with high text-to-code ratio
 * - Identical plain-text representation
 * - Clear 5-minute expiry warning and security notice
 */
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
    "Thank you,",
    "VN Mobiles",
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
            <td style="background-color:#f6f8fa;padding:16px 32px;border-top:1px solid #d0d7de;font-size:12px;color:#57606a;text-align:center;">
              &copy; ${new Date().getFullYear()} VN Mobiles. All rights reserved.
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

  const plainText = [
    "Your VN Mobiles login verification code",
    "",
    `Hi ${user.name},`,
    "",
    "You requested to sign in to your VN Mobiles account using a one-time verification code.",
    "",
    `Login Code: ${codeDisplay}`,
    "",
    "This code expires in 5 minutes.",
    "",
    "If you did not request this login code, your account is safe. No one can sign in without access to this code.",
    "",
    "Thank you,",
    "VN Mobiles",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your VN Mobiles login verification code</title>
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
                Please enter the following 6-digit code to complete signing in to your VN Mobiles account:
              </p>
              <div style="background-color:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#57606a;letter-spacing:1px;margin-bottom:6px;">Sign In Code</div>
                <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#1f2328;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${codeDisplay}</div>
                <div style="margin-top:8px;font-size:12px;color:#cf222e;font-weight:600;">Expires in 5 minutes</div>
              </div>
              <p style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#57606a;">
                If you did not attempt to sign in, no action is needed. Your account remains protected.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f6f8fa;padding:16px 32px;border-top:1px solid #d0d7de;font-size:12px;color:#57606a;text-align:center;">
              &copy; ${new Date().getFullYear()} VN Mobiles. All rights reserved.
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
    subject: "Your VN Mobiles login verification code",
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
  const codeDisplay = (otp || "").slice(0, 6);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const resetLink = token
    ? `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`
    : "";

  const plainText = [
    "Reset your VN Mobiles password",
    "",
    `Hi ${user.name},`,
    "",
    "We received a request to reset the password for your VN Mobiles account.",
    "",
    `Reset Code: ${codeDisplay}`,
    ...(resetLink ? ["", `Direct Reset Link: ${resetLink}`] : []),
    "",
    "This code and link expire in 5 minutes.",
    "",
    "If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.",
    "",
    "Thank you,",
    "VN Mobiles",
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
                We received a request to reset your VN Mobiles password. Enter the code below or click the reset link to choose a new password:
              </p>
              <div style="background-color:#f6f8fa;border:1px solid #d0d7de;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#57606a;letter-spacing:1px;margin-bottom:6px;">Password Reset Code</div>
                <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#1f2328;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${codeDisplay}</div>
                <div style="margin-top:8px;font-size:12px;color:#cf222e;font-weight:600;">Expires in 5 minutes</div>
              </div>
              ${
                resetLink
                  ? `<div style="text-align:center;margin:24px 0;">
                <a href="${resetLink}" style="display:inline-block;background-color:#C9A66B;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Reset Password Directly</a>
              </div>`
                  : ""
              }
              <p style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#57606a;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f6f8fa;padding:16px 32px;border-top:1px solid #d0d7de;font-size:12px;color:#57606a;text-align:center;">
              &copy; ${new Date().getFullYear()} VN Mobiles. All rights reserved.
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

  const plainText = `Hi ${order.customerName},\n\nThank you for your order!\n\nYour order ${order.orderNumber} has been successfully confirmed.\n\nProduct: ${productSummary}\nQuantity: ${totalQty}\nOrder Total: ${formattedTotal}\n\nWe will notify you when your order is shipped.\n\nThank you,\nVN Mobiles`;

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
              &copy; ${new Date().getFullYear()} VN Mobiles. Thank you for shopping with us!
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

  const plainText = `Hi ${order.customerName},\n\nYour order ${order.orderNumber} status has been updated to: ${readableStatus}.${trackingInfo}\n${note ? `\nNote: ${note}\n` : ""}\nYou can track your order anytime on VN Mobiles.\n\nThank you,\nVN Mobiles`;

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
              &copy; ${new Date().getFullYear()} VN Mobiles.
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

  const plainText = `Hi ${warranty.customerName},\n\nOfficial Mobile Warranty Activated!\n\nProduct: ${warranty.productName}\nOrder: ${warranty.orderNumber}\nIMEI Number: ${warranty.imeiNumber}\nPurchase Date: ${purchaseFormatted}\nWarranty: ${warranty.warrantyDuration}\nWarranty Expiry: ${expiryFormatted}\nWarranty Status: ACTIVE\n\nYour smartphone is protected by VN Mobiles Device Shield.\n\nThank you,\nVN Mobiles`;

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
                Your official manufacturer warranty coverage has been activated on VN Mobiles Device Shield.
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
              &copy; ${new Date().getFullYear()} VN Mobiles Device Shield.
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
  const expiryFormatted = new Date(warranty.warrantyExpiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const plainText = `Hi ${warranty.customerName},\n\nImportant Update: Your ${warranty.productName} Device Shield has 6 months of coverage remaining.\n\nProduct: ${warranty.productName}\nIMEI: ${warranty.imeiNumber}\nCoverage Expiry Date: ${expiryFormatted}\n\nYour smartphone remains fully protected against hardware and manufacturing defects. We recommend checking your battery health and scheduling any complimentary hardware inspections before expiration.\n\nView your full warranty status anytime at VN Mobiles.\n\nWarm regards,\nVN Mobiles Customer Care`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>6-Month Warranty Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #3B82F6; color: #FFFFFF; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px; letter-spacing: 0.05em;">🛡️ 6-MONTH NOTICE</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">Warranty Coverage Reminder</h1>
              <p style="margin: 6px 0 0 0; color: #94A3B8; font-size: 13px;">6 months remaining on your Device Shield</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>${warranty.customerName}</strong>,<br><br>
                This is a friendly reminder that your <strong>${warranty.productName}</strong> has <strong>6 months of official warranty coverage remaining</strong>.
              </p>

              <table role="presentation" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Smartphone Model:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Registered IMEI:</td>
                  <td style="font-family: monospace; font-weight: 700; color: #2563EB; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                ${warranty.orderNumber ? `
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Original Order:</td>
                  <td style="font-weight: 600; color: #0F172A; text-align: right; padding: 6px 0;">#${warranty.orderNumber}</td>
                </tr>` : ""}
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Coverage Expiry Date:</td>
                  <td style="font-weight: 700; color: #D97706; text-align: right; padding: 6px 0;">${expiryFormatted}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0;">Current Status:</td>
                  <td style="font-weight: 700; color: #16A34A; text-align: right; padding: 6px 0;">ACTIVE (6 Months Left)</td>
                </tr>
              </table>

              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 16px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px 0; color: #1E40AF; font-size: 13px; font-weight: 700;">💡 Mid-Term Hardware Recommendations:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #1E3A8A; line-height: 1.6;">
                  <li>Check your battery health capacity in system settings.</li>
                  <li>Verify screen touch sensitivity and charging port functionality.</li>
                  <li>In case of any unexpected glitches, enjoy free repairs covered under your active warranty.</li>
                </ul>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748B; text-align: center;">
                Need help or wish to inspect your smartphone? Simply reply to this email or visit your VN Mobiles account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 32px; text-align: center; font-size: 11px; color: #94A3B8;">
              &copy; ${new Date().getFullYear()} VN Mobiles India. All rights reserved.
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
    subject: `🛡️ 6-Month Coverage Notice: Your ${warranty.productName} Warranty (Expires ${expiryFormatted})`,
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
  const expiryFormatted = new Date(warranty.warrantyExpiryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const plainText = `Hi ${warranty.customerName},\n\nURGENT NOTICE: Your ${warranty.productName} warranty coverage expires TOMORROW on ${expiryFormatted}!\n\nProduct: ${warranty.productName}\nIMEI: ${warranty.imeiNumber}\nExpiry Date: ${expiryFormatted}\n\nThis is your final 24-hour notice before warranty coverage ends. Once expired, complimentary manufacturer repairs and replacement parts will no longer be covered.\n\nIf your phone has any hardware issues or if you wish to renew your protection, please contact us immediately.\n\nThank you,\nVN Mobiles Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Final 24-Hour Warranty Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #FFFFFF; border: 1px solid #FECACA; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background-color: #EF4444; color: #FFFFFF; font-weight: 800; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px; letter-spacing: 0.05em;">🚨 FINAL 24 HOURS</div>
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">Warranty Expires Tomorrow!</h1>
              <p style="margin: 6px 0 0 0; color: #FECACA; font-size: 13px;">Last day of Device Shield protection</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Dear <strong>${warranty.customerName}</strong>,<br><br>
                Please note that manufacturer warranty protection for your <strong>${warranty.productName}</strong> will officially <strong>expire tomorrow (${expiryFormatted})</strong>.
              </p>

              <table role="presentation" width="100%" style="background-color: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 12px; padding: 18px; font-size: 13px; margin: 20px 0;">
                <tr>
                  <td style="color: #991B1B; padding: 6px 0;">Device:</td>
                  <td style="font-weight: 700; color: #111827; text-align: right; padding: 6px 0;">${warranty.productName}</td>
                </tr>
                <tr>
                  <td style="color: #991B1B; padding: 6px 0;">IMEI Number:</td>
                  <td style="font-family: monospace; font-weight: 700; color: #991B1B; text-align: right; padding: 6px 0;">${warranty.imeiNumber}</td>
                </tr>
                <tr>
                  <td style="color: #991B1B; padding: 6px 0;">Expiration Date:</td>
                  <td style="font-weight: 800; color: #DC2626; text-align: right; padding: 6px 0;">${expiryFormatted} (Tomorrow)</td>
                </tr>
                <tr>
                  <td style="color: #991B1B; padding: 6px 0;">Coverage Status:</td>
                  <td style="font-weight: 700; color: #DC2626; text-align: right; padding: 6px 0;">EXPIRES IN 24 HOURS</td>
                </tr>
              </table>

              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px; font-size: 12px; color: #92400E; line-height: 1.5; margin: 20px 0;">
                ⚠️ <strong>What happens after tomorrow?</strong><br>
                Complimentary repairs, display replacements, and authorized service center claim coverage will no longer be available under this policy.
              </div>

              <p style="margin: 20px 0 0 0; font-size: 13px; line-height: 1.5; color: #64748B; text-align: center;">
                Have questions or need assistance before expiration? Reply directly to this email or contact VN Mobiles support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 32px; text-align: center; font-size: 11px; color: #94A3B8;">
              &copy; ${new Date().getFullYear()} VN Mobiles India. All rights reserved.
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
    subject: `🚨 FINAL 24H ALERT: Your ${warranty.productName} Warranty Expires Tomorrow!`,
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
      warrantyStatus: { not: "EXPIRED" },
    },
    include: {
      order: {
        select: { orderNumber: true },
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
