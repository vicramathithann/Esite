import {
  escapeHtml,
  formatINR,
  getProductSummaryHeadline,
  renderEmailLayout,
  renderPlainFooter,
  BadgeConfig,
} from "./layout";

export interface OrderStatusEmailData {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  orderStatus: string;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  items?: Array<{
    productName: string;
    quantity?: number;
    price?: number;
    selectedStorage?: string | null;
    selectedColor?: string | null;
  }>;
}

export function renderOrderStatusEmail(
  order: OrderStatusEmailData,
  newStatus: string,
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
  const productHeadline =
    extra?.phoneName || getProductSummaryHeadline(allItems, "Your Smartphone");

  const normalizedStatus = (newStatus || order.orderStatus || "CONFIRMED").toUpperCase().replace(/\s+/g, "_");

  let subject = `Update on your ${productHeadline}`;
  let preheader = `Latest shipment progress for order #${order.orderNumber}.`;
  let badge: BadgeConfig = { text: newStatus.toUpperCase(), bg: "#F1F5F9", color: "#0F172A", border: "#CBD5E1" };
  let headline = `Update on your ${productHeadline}.`;
  let subheadline = "Here is the latest progress on your order.";
  let ctaLabel = "Track Live Order";
  let ctaUrl = `${cleanUrl}/track/${order.orderNumber}`;

  if (normalizedStatus.includes("SHIP")) {
    subject = `Your ${productHeadline} is on the way`;
    preheader = "Packed, sealed, and handed to our courier partner.";
    badge = { text: "SHIPPED", bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" };
    headline = `Your ${productHeadline} is on the move.`;
    subheadline = "The wait is almost over. Your package has cleared dispatch and is speeding its way to you.";
    ctaLabel = "Track Live Shipment";
  } else if (normalizedStatus.includes("OUT_FOR_DELIVERY") || normalizedStatus.includes("OUT")) {
    subject = `Out for delivery: ${productHeadline}`;
    preheader = "Arriving today. Keep your phone handy for courier verification.";
    badge = { text: "OUT FOR DELIVERY", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" };
    headline = "Out for delivery today.";
    subheadline = "Your delivery partner is in your area. Today is unboxing day.";
    ctaLabel = "Track Delivery Agent";
  } else if (normalizedStatus.includes("DELIVER")) {
    subject = `Delivered: ${productHeadline}`;
    preheader = "Your package has landed. Time to unbox.";
    badge = { text: "DELIVERED", bg: "#ECFDF5", color: "#065F46", border: "#A7F3D0" };
    headline = "It has arrived.";
    subheadline = "It's giving brand new phone. Your delivery was completed today. Peel off the film and enjoy.";
    ctaLabel = "View Warranty Certificate";
    ctaUrl = `${cleanUrl}/account/warranties`;
  } else if (normalizedStatus.includes("PROCESS")) {
    subject = `We are prepping your ${productHeadline}`;
    preheader = "Our fulfillment team is running quality checks on your device.";
    badge = { text: "PROCESSING", bg: "#F5F3FF", color: "#5B21B6", border: "#DDD6FE" };
    headline = "Your device is being prepped.";
    subheadline = "Our warehouse technicians are running pre-dispatch checks and packing with tamper-proof security seals.";
  }

  // Shipping & Tracking Card
  const hasCarrier = !!order.shippingCarrier;
  const hasTracking = !!order.trackingNumber;

  const contentHtml = `
    <!-- Status Progress Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:35%;">Device</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(productHeadline)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Latest Status</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(newStatus)}</td>
      </tr>
      ${
        hasCarrier
          ? `
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Courier Partner</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">${escapeHtml(order.shippingCarrier!)}</td>
        </tr>
      `
          : ""
      }
      ${
        hasTracking
          ? `
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Tracking Number</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700;">${escapeHtml(order.trackingNumber!)}</td>
        </tr>
      `
          : ""
      }
      ${
        note
          ? `
        <tr>
          <td style="padding:14px 18px;color:#64748B;">Update Note</td>
          <td style="padding:14px 18px;color:#0F172A;">${escapeHtml(note)}</td>
        </tr>
      `
          : ""
      }
    </table>

    <p style="margin:20px 0 0 0;font-size:13px;color:#64748B;line-height:1.5;">
      Order Ref: <span style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#0F172A;font-weight:600;">#${escapeHtml(order.orderNumber)}</span> &bull; Total Amount: ${formatINR(order.totalAmount)}
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge,
    headline,
    subheadline,
    orderNumber: order.orderNumber,
    contentHtml,
    cta: {
      label: ctaLabel,
      url: ctaUrl,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${order.customerName},`,
    "",
    subheadline,
    "",
    "STATUS DETAILS:",
    `- Device: ${productHeadline}`,
    `- Order Number: #${order.orderNumber}`,
    `- Status: ${newStatus}`,
    hasCarrier ? `- Courier Partner: ${order.shippingCarrier}` : "",
    hasTracking ? `- Tracking Number: ${order.trackingNumber}` : "",
    note ? `- Note: ${note}` : "",
    "",
    `Track your shipment: ${ctaUrl}`,
    "",
    renderPlainFooter(cleanUrl),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, preheader };
}

