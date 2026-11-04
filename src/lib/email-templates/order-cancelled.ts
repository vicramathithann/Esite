import {
  escapeHtml,
  formatINR,
  getProductSummaryHeadline,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface OrderCancelledEmailData {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  orderStatus?: string;
  items?: Array<{
    productName: string;
    quantity?: number;
    price?: number;
    selectedStorage?: string | null;
  }>;
}

export function renderOrderCancelledEmail(
  order: OrderCancelledEmailData,
  note?: string,
  extra?: {
    phoneName?: string;
    items?: Array<{ productName: string; quantity: number; price: number; selectedStorage?: string | null }>;
  },
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const allItems = extra?.items || order.items;
  const rawHeadline =
    extra?.phoneName || getProductSummaryHeadline(allItems, "order");
  const productHeadline = rawHeadline.replace(/^your\s+/i, "");

  const formattedTotal = formatINR(order.totalAmount);
  const subject = `Order cancelled: ${productHeadline}`;
  const preheader = "Your cancellation has been processed and your refund is initiated.";

  const contentHtml = `
    <!-- Clear cancellation box (calm and professional) -->
    <div style="background-color:#FEF2F2;border-left:4px solid #DC2626;padding:16px 20px;border-radius:8px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#991B1B;font-weight:500;">
        Your order for <strong>${escapeHtml(productHeadline)}</strong> has been cancelled. If payment was collected, a full refund of <strong>${formattedTotal}</strong> has been initiated to your original payment method.
      </p>
    </div>

    <!-- Refund Details Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:38%;">Smartphone / Item</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(productHeadline)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Order Reference</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:600;">#${escapeHtml(order.orderNumber)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Refund Amount</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#DC2626;font-weight:800;font-size:15px;">${formattedTotal}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Refund Destination</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">Original Payment Method</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;${note ? "border-bottom:1px solid #E2E8F0;" : ""}color:#64748B;">Estimated Credit Time</td>
        <td style="padding:14px 18px;${note ? "border-bottom:1px solid #E2E8F0;" : ""}color:#0F172A;font-weight:600;">3 to 5 business days</td>
      </tr>
      ${
        note
          ? `
        <tr>
          <td style="padding:14px 18px;color:#64748B;">Cancellation Reason</td>
          <td style="padding:14px 18px;color:#0F172A;">${escapeHtml(note)}</td>
        </tr>
      `
          : ""
      }
    </table>

    <p style="margin:20px 0 0 0;font-size:13px;color:#64748B;line-height:1.5;">
      The reserved warehouse stock for this device has been released, and live courier tracking has been stopped.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "CANCELLED",
      bg: "#FEF2F2",
      color: "#991B1B",
      border: "#FECACA",
    },
    headline: "Order cancelled.",
    subheadline: `Hi ${order.customerName}, we have processed the cancellation request for your order.`,
    orderNumber: order.orderNumber,
    contentHtml,
    cta: {
      label: "View Order Status",
      url: `${cleanUrl}/orders?tab=cancelled`,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${order.customerName},`,
    "",
    `Your order for ${productHeadline} has been cancelled.`,
    "",
    "CANCELLATION & REFUND DETAILS:",
    `- Device: ${productHeadline}`,
    `- Order Reference: #${order.orderNumber}`,
    `- Refund Amount: ${formattedTotal}`,
    "- Refund Destination: Original Payment Method",
    "- Refund Timeline: 3 to 5 business days",
    note ? `- Note: ${note}` : "",
    "",
    "Reserved stock has been returned to our warehouse and shipment tracking has been disabled.",
    "",
    `View your order: ${cleanUrl}/orders?tab=cancelled`,
    "",
    renderPlainFooter(cleanUrl),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, preheader };
}

