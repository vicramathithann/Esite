import {
  escapeHtml,
  formatINR,
  formatDate,
  getProductSummaryHeadline,
  formatLockedInSubject,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface OrderConfirmationItem {
  productName: string;
  quantity: number;
  price: number;
  selectedStorage?: string;
  selectedColor?: string;
  imeiNumber?: string;
  productImageUrl?: string;
}

export interface OrderConfirmationData {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  items: OrderConfirmationItem[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdAt?: Date | string;
}

export function renderOrderConfirmedEmail(
  order: OrderConfirmationData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const productHeadline = getProductSummaryHeadline(order.items, "order");
  const subject = formatLockedInSubject(productHeadline);
  const headline = `${subject}.`;
  const preheader = "Payment received and verified. We are packing your device.";
  const formattedTotal = formatINR(order.totalAmount);
  const formattedDate = formatDate(order.createdAt || new Date());

  let items = order.items && order.items.length > 0 ? order.items : [];
  if (items.length === 0) {
    console.warn(`[ORDER CONFIRMATION EMAIL] Warning: Order #${order.orderNumber || order.id} has no order items. Using order reference.`);
    items = [{ productName: order.orderNumber ? `Order #${order.orderNumber}` : "Order", quantity: 1, price: order.totalAmount }];
  }

  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);

  // Table rows for each item
  const itemRowsHtml = items
    .map((item) => {
      const variantParts = [item.selectedStorage, item.selectedColor].filter(Boolean);
      const variantText = variantParts.length > 0 ? variantParts.join(" &bull; ") : "";
      const itemTotal = (item.price || 0) * (item.quantity || 1);

      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #E2E8F0;font-size:14px;color:#0F172A;">
            <div style="font-weight:700;color:#0F172A;margin-bottom:3px;">
              ${escapeHtml(item.productName)}
            </div>
            ${
              variantText
                ? `<div style="font-size:12px;color:#64748B;">${variantText}</div>`
                : ""
            }
          </td>
          <td align="center" style="padding:14px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;">
            ${escapeHtml(item.quantity || 1)}
          </td>
          <td align="right" style="padding:14px 0;border-bottom:1px solid #E2E8F0;font-size:14px;font-weight:700;color:#0F172A;">
            ${formatINR(itemTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  // Plain-text line items
  const plainTextItems = items
    .map((item) => {
      const variantParts = [item.selectedStorage, item.selectedColor].filter(Boolean);
      const variantText = variantParts.length > 0 ? ` (${variantParts.join(", ")})` : "";
      return `- ${item.productName}${variantText} x ${item.quantity || 1} = ${formatINR((item.price || 0) * (item.quantity || 1))}`;
    })
    .join("\n");

  const addressFormatted = [order.address, order.city, order.state, order.pincode]
    .filter(Boolean)
    .join(", ");

  const contentHtml = `
    <!-- Item Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #CBD5E1;text-align:left;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.8px;">
          <th style="padding-bottom:10px;">Item Details</th>
          <th style="padding-bottom:10px;text-align:center;">Qty</th>
          <th style="padding-bottom:10px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        <tr>
          <td colspan="2" style="padding-top:14px;font-size:13px;color:#64748B;">Subtotal (${totalQty} ${totalQty === 1 ? "item" : "items"})</td>
          <td align="right" style="padding-top:14px;font-size:13px;color:#0F172A;font-weight:600;">${formattedTotal}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:6px;font-size:13px;color:#64748B;">Express Insured Delivery</td>
          <td align="right" style="padding-top:6px;font-size:13px;color:#059669;font-weight:700;">FREE</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:12px;border-top:2px solid #E2E8F0;font-size:14px;font-weight:700;color:#0F172A;">Total Paid</td>
          <td align="right" style="padding-top:12px;border-top:2px solid #E2E8F0;font-size:16px;font-weight:800;color:#0F172A;">${formattedTotal}</td>
        </tr>
      </tbody>
    </table>

    <!-- Delivery & Protection Summary Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:24px 0;font-size:13px;">
      ${
        addressFormatted
          ? `
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:35%;">Delivery Address</td>
          <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:600;">${escapeHtml(addressFormatted)}</td>
        </tr>
      `
          : ""
      }
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:35%;">Payment Status</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#059669;font-weight:700;">VERIFIED PREPAID</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;color:#64748B;">Device Protection</td>
        <td style="padding:14px 18px;color:#0F172A;font-weight:600;">1-Year Official Brand Warranty included & activated</td>
      </tr>
    </table>

    <p style="margin:20px 0 0 0;font-size:13px;color:#64748B;line-height:1.5;">
      Order Ref: <span style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#0F172A;font-weight:600;">#${escapeHtml(order.orderNumber)}</span> &bull; Placed on ${formattedDate}
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "ORDER CONFIRMED",
      bg: "#ECFDF5",
      color: "#065F46",
      border: "#A7F3D0",
    },
    headline,
    subheadline: "Fresh drop incoming. Your payment has been received and our warehouse team is already preparing your box.",
    orderNumber: order.orderNumber,
    contentHtml,
    cta: {
      label: "View Order & Track Delivery",
      url: `${cleanUrl}/track/${order.orderNumber}`,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${order.customerName},`,
    "",
    "Fresh drop incoming. We have received your payment and your order is confirmed.",
    "",
    "ORDER SUMMARY:",
    plainTextItems,
    "",
    `Total Amount: ${formattedTotal} (Inclusive of taxes)`,
    `Payment Status: Verified Prepaid`,
    addressFormatted ? `Delivery Address: ${addressFormatted}` : "",
    "Warranty: 1-Year Official Brand Warranty included",
    `Order Reference: #${order.orderNumber} placed on ${formattedDate}`,
    "",
    `Track your shipment: ${cleanUrl}/track/${order.orderNumber}`,
    "",
    renderPlainFooter(cleanUrl),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, preheader };
}

