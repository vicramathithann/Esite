import { prisma } from "@/lib/prisma";
import { maskSecret } from "@/lib/msg91";

/**
 * MSG91 Email Gateway Integration (Backend Only)
 * 
 * Uses connected Gmail account (Integration ID: 832) via:
 * Endpoint: https://control.msg91.com/api/v5/email/send
 * 
 * Never expose MSG91 Authkey or sensitive credentials in client-side code.
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
  variables: Record<string, string | number | undefined>;
  contentSummary?: string;
}

export interface EmailSendResult {
  success: boolean;
  status: "SENT" | "FAILED";
  statusCode?: number;
  message: string;
  notificationId?: string;
  error?: string;
}

/**
 * Sends a transactional email using MSG91 Email API (via Integration ID 832)
 * and records the event in EmailNotification database table.
 */
export async function sendMsg91Email(options: SendEmailOptions): Promise<EmailSendResult> {
  const authKey = process.env.MSG91_AUTHKEY?.trim();
  const integrationId = process.env.MSG91_EMAIL_INTEGRATION_ID?.trim() || "832";
  const defaultTemplateId = process.env.MSG91_EMAIL_TEMPLATE_ID?.trim() || "";
  const templateId = options.templateId || defaultTemplateId;

  const cleanRecipientEmail = options.recipientEmail.trim().toLowerCase();
  const recipientName = options.recipientName.trim();

  // Create initial audit record in DB with PENDING status
  let notificationRecord;
  try {
    notificationRecord = await prisma.emailNotification.create({
      data: {
        userId: options.userId || null,
        recipientEmail: cleanRecipientEmail,
        recipientName,
        emailType: options.emailType,
        orderId: options.orderId || null,
        productName: options.productName || null,
        templateId: templateId || null,
        subject: options.subject,
        contentSummary: options.contentSummary || options.subject,
        status: "PENDING",
      },
    });
  } catch (dbErr) {
    console.error("[EMAIL AUDIT DB ERROR] Failed to record pending email:", dbErr);
  }

  // Check auth key
  const hasValidAuthKey = authKey && authKey !== "your_msg91_authkey_here";

  if (!hasValidAuthKey) {
    const errorMsg = "MSG91_AUTHKEY is not configured in backend environment variables.";
    console.warn(`[MSG91 EMAIL] ${errorMsg} (Simulation mode active - email recorded for: ${cleanRecipientEmail})`);

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

  // Construct MSG91 Email API Payload with integration_id 832
  // When integration_id is provided, MSG91 uses the connected Gmail account as sender.
  const payload: Record<string, unknown> = {
    recipients: [
      {
        to: [
          {
            name: recipientName,
            email: cleanRecipientEmail,
          },
        ],
        variables: options.variables,
      },
    ],
    integration_id: integrationId,
  };

  if (templateId) {
    payload.template_id = templateId;
  }

  console.log(
    `[MSG91 EMAIL] Sending ${options.emailType} to ${cleanRecipientEmail} | Integration: ${integrationId} | Auth: ${maskSecret(authKey)}`
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://control.msg91.com/api/v5/email/send", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();
    let parsedData: unknown = null;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = { raw: rawText };
    }

    const isSuccess = response.status >= 200 && response.status < 300;
    const msg91Type = typeof parsedData === "object" && parsedData !== null && "type" in parsedData
      ? (parsedData as { type: string }).type
      : "";

    if (isSuccess && msg91Type !== "error") {
      console.log(`[MSG91 EMAIL SUCCESS] Email accepted for delivery to ${cleanRecipientEmail}`);

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
        statusCode: response.status,
        message: "Email sent successfully via MSG91 connected Gmail.",
        notificationId: notificationRecord?.id,
      };
    } else {
      const errorMsg =
        (typeof parsedData === "object" && parsedData !== null && "message" in parsedData
          ? (parsedData as { message: string }).message
          : null) || `MSG91 returned status ${response.status}`;

      console.error(`[MSG91 EMAIL API ERROR] ${errorMsg}`);

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
        statusCode: response.status,
        message: errorMsg,
        error: errorMsg,
        notificationId: notificationRecord?.id,
      };
    }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errorMessage = isAbort
      ? "Connection to MSG91 Email API timed out after 12 seconds."
      : err instanceof Error
      ? err.message
      : "Unknown network error communicating with MSG91 Email API.";

    console.error(`[MSG91 EMAIL NETWORK ERROR] ${errorMessage}`);

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
      statusCode: 504,
      message: errorMessage,
      error: errorMessage,
      notificationId: notificationRecord?.id,
    };
  }
}

/**
 * Sends User Email Verification message with unique expiring token and 10-minute OTP.
 * Uses MSG91 template_id: template_28_09_2026_14_09_2 and integration_id: 832.
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
  const templateId = process.env.MSG91_EMAIL_TEMPLATE_ID?.trim() || "template_28_09_2026_14_09_2";

  const codeDisplay = otp || token.slice(0, 6);
  const summary = `Hi ${user.name},\n\nYour VM Mobiles verification OTP is: ${codeDisplay}\nThis OTP is valid for 10 minutes.\n\nAlternatively, verify using this link:\n${verifyLink}\n\nThank you,\nVM Mobiles`;

  return sendMsg91Email({
    userId: user.id,
    recipientName: user.name,
    recipientEmail: user.email,
    subject: "Verify Your Email - VM Mobiles",
    emailType: "EMAIL_VERIFICATION",
    templateId,
    variables: {
      otp: codeDisplay,
      OTP: codeDisplay,
      code: codeDisplay,
      verification_otp: codeDisplay,
      verification_code: codeDisplay,
      customer_name: user.name,
      name: user.name,
      verification_link: verifyLink,
      link: verifyLink,
      verification_token: token,
      token,
      expiry_minutes: "10",
      app_url: appUrl,
    },
    contentSummary: summary,
  });
}

/**
 * Sends Order Confirmation Email when a customer places an order.
 * Strictly adheres to Requirement 6 format:
 * 
 * Subject: Order ORD10001 Confirmed
 * Hi Customer,
 * Thank you for your order.
 * Your order ORD10001 has been successfully confirmed.
 * Product: iPhone 16 Pro
 * Quantity: 1
 * Order Total: ₹119999
 * We will notify you when your order is shipped.
 * Thank you,
 * VM Mobiles
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
  }>;
}): Promise<EmailSendResult> {
  const primaryItem = order.items[0];
  const productSummary = order.items
    .map((i) => `${i.productName}${i.selectedStorage ? ` (${i.selectedStorage})` : ""}`)
    .join(", ");
  const totalQty = order.items.reduce((s, i) => s + (i.quantity || 1), 0);
  const formattedTotal = `₹${order.totalAmount.toLocaleString("en-IN")}`;

  const summary = `Hi ${order.customerName},\n\nThank you for your order.\n\nYour order ${order.orderNumber} has been successfully confirmed.\n\nProduct: ${productSummary}\nQuantity: ${totalQty}\nOrder Total: ${formattedTotal}\n\nWe will notify you when your order is shipped.\n\nThank you,\nVM Mobiles`;

  return sendMsg91Email({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order ${order.orderNumber} Confirmed`,
    emailType: "ORDER_CONFIRMATION",
    orderId: order.id,
    productName: primaryItem ? primaryItem.productName : "Mobile Phone",
    templateId: process.env.MSG91_ORDER_CONFIRM_TEMPLATE_ID,
    variables: {
      customer_name: order.customerName,
      order_id: order.orderNumber,
      order_number: order.orderNumber,
      product: productSummary,
      product_name: productSummary,
      quantity: totalQty,
      order_total: formattedTotal,
      amount: formattedTotal,
    },
    contentSummary: summary,
  });
}

/**
 * Sends Order Status Update Email when status changes.
 */
export async function sendOrderStatusEmail(order: {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  orderStatus: string;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
}, newStatus: string, note?: string): Promise<EmailSendResult> {
  const readableStatus = newStatus.replace(/_/g, " ");
  const trackingInfo = order.trackingNumber
    ? `\nCarrier: ${order.shippingCarrier || "Standard Delivery"}\nTracking Number: ${order.trackingNumber}`
    : "";

  const summary = `Hi ${order.customerName},\n\nYour order ${order.orderNumber} status has been updated to: ${readableStatus}.${trackingInfo}\n${note ? `\nNote: ${note}\n` : ""}\nYou can track your order anytime on VM Mobiles.\n\nThank you,\nVM Mobiles`;

  return sendMsg91Email({
    userId: order.userId,
    recipientName: order.customerName,
    recipientEmail: order.customerEmail,
    subject: `Order ${order.orderNumber} Update: ${readableStatus}`,
    emailType: "ORDER_STATUS",
    orderId: order.id,
    templateId: process.env.MSG91_ORDER_STATUS_TEMPLATE_ID,
    variables: {
      customer_name: order.customerName,
      order_id: order.orderNumber,
      order_number: order.orderNumber,
      order_status: readableStatus,
      status: readableStatus,
      tracking_number: order.trackingNumber || "",
      carrier: order.shippingCarrier || "",
    },
    contentSummary: summary,
  });
}

/**
 * Sends Mobile Warranty Activation Email.
 * Mobile phone warranty only - no tyre or manufacturing terms.
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

  const summary = `Hi ${warranty.customerName},\n\nOfficial Mobile Warranty Activated!\n\nProduct: ${warranty.productName}\nOrder: ${warranty.orderNumber}\nIMEI Number: ${warranty.imeiNumber}\nPurchase Date: ${purchaseFormatted}\nWarranty: ${warranty.warrantyDuration}\nWarranty Expiry: ${expiryFormatted}\nWarranty Status: ACTIVE\n\nYour smartphone is protected by VM Mobiles Device Shield.\n\nThank you,\nVM Mobiles`;

  return sendMsg91Email({
    userId: warranty.userId,
    recipientName: warranty.customerName,
    recipientEmail: warranty.customerEmail,
    subject: `Official Warranty Activated for ${warranty.productName} (Order #${warranty.orderNumber})`,
    emailType: "WARRANTY_NOTIFICATION",
    orderId: warranty.orderId,
    productName: warranty.productName,
    templateId: process.env.MSG91_WARRANTY_TEMPLATE_ID,
    variables: {
      customer_name: warranty.customerName,
      order_id: warranty.orderNumber,
      product: warranty.productName,
      imei: warranty.imeiNumber,
      purchase_date: purchaseFormatted,
      warranty_duration: warranty.warrantyDuration,
      warranty_expiry: expiryFormatted,
    },
    contentSummary: summary,
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
    // General retry
    return sendMsg91Email({
      userId: notification.userId,
      recipientName: notification.recipientName || "Customer",
      recipientEmail: notification.recipientEmail,
      subject: notification.subject,
      emailType: notification.emailType as SendEmailOptions["emailType"],
      orderId: notification.orderId,
      productName: notification.productName,
      templateId: notification.templateId || undefined,
      variables: {
        customer_name: notification.recipientName || "Customer",
        subject: notification.subject,
      },
      contentSummary: notification.contentSummary || undefined,
    });
  }
}
