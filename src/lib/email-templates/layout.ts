export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

export function formatDate(date: Date | string | number): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
}

export function formatSlugToProductName(slug?: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatOrderProductsDisplayName(
  items?: Array<{ productName?: string; productId?: string }> | null,
  fallback = "Samsung Galaxy S24"
): string {
  if (!items || items.length === 0) return fallback;
  const rawFirst = (items[0]?.productName || "").trim();
  const rawId = (items[0]?.productId || "").trim();

  let firstName = rawFirst;
  const isGeneric =
    !firstName ||
    firstName.toLowerCase() === "smartphone" ||
    firstName.toLowerCase() === "device" ||
    firstName.toLowerCase().includes("flagship smartphone") ||
    firstName.toLowerCase().includes("mobile smartphone") ||
    firstName.toLowerCase().includes("protected device") ||
    firstName.startsWith("Order #");

  if (isGeneric) {
    if (rawId) {
      firstName = formatSlugToProductName(rawId);
    } else {
      firstName = fallback;
    }
  }

  if (items.length <= 1) {
    return firstName;
  }
  const remaining = items.length - 1;
  return `${firstName} and ${remaining} more`;
}

export function getProductSummaryHeadline(
  items?: Array<{ productName?: string; selectedStorage?: string | null; selectedColor?: string | null }> | null,
  fallback = "order"
): string {
  if (!items || items.length === 0) return fallback;
  const first = items[0];
  const name = first?.productName?.trim();
  if (!name) return fallback;

  const variantParts = [first.selectedStorage, first.selectedColor].filter(Boolean);
  const fullName = variantParts.length > 0 ? `${name}, ${variantParts.join(", ")}` : name;

  if (items.length === 1) return fullName;
  const remaining = items.length - 1;
  return `${fullName} + ${remaining} more`;
}

export function formatOrderDate(dateInput?: Date | string | number | null): string {
  if (!dateInput) return "";
  try {
    const d =
      typeof dateInput === "string" || typeof dateInput === "number"
        ? new Date(dateInput)
        : dateInput;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function resolveDeliveryDate(order: {
  estimatedDelivery?: Date | string | number | null;
  deliveryDate?: Date | string | number | null;
  expectedDeliveryDate?: Date | string | number | null;
  createdAt?: Date | string | number | null;
  orderedDate?: Date | string | number | null;
}): string {
  const directDate = order.deliveryDate || order.estimatedDelivery || order.expectedDeliveryDate;
  if (directDate) {
    const formatted = formatOrderDate(directDate);
    if (formatted) return formatted;
  }
  const createdRaw = order.createdAt || order.orderedDate;
  if (createdRaw) {
    try {
      const createdDate = new Date(createdRaw);
      if (!isNaN(createdDate.getTime())) {
        const delivery = new Date(createdDate.getTime() + 4 * 24 * 60 * 60 * 1000);
        const formatted = formatOrderDate(delivery);
        if (formatted) return formatted;
      }
    } catch {}
  }
  return "Will be updated soon";
}

export function resolvePaymentText(order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  isPaid?: boolean | null;
  paymentText?: string | null;
}): string {
  if (order.paymentText) {
    const pt = order.paymentText.trim();
    if (pt.toUpperCase().includes("COD") || pt.toUpperCase().includes("CASH ON DELIVERY")) {
      return "Cash on Delivery (COD)";
    }
    return "Paid";
  }

  const method = (order.paymentMethod || "").trim().toUpperCase();
  const status = (order.paymentStatus || "").trim().toUpperCase();

  const isCod =
    method.includes("COD") ||
    method.includes("CASH ON DELIVERY") ||
    method.includes("PAY ON DELIVERY") ||
    status === "COD";

  if (isCod) {
    return "Cash on Delivery (COD)";
  }
  return "Paid";
}

export interface OrderDetailsTableData {
  productName: string;
  createdAt?: Date | string | number | null;
  orderedDate?: Date | string | number | null;
  estimatedDelivery?: Date | string | number | null;
  deliveryDate?: Date | string | number | null;
  expectedDeliveryDate?: Date | string | number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  isPaid?: boolean | null;
  paymentText?: string | null;
  quantity?: number | null;
  totalAmount?: number | null;
  price?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

export function renderOrderDetailsTable(data: OrderDetailsTableData): { html: string; text: string } {
  const orderedDate =
    formatOrderDate(data.createdAt || data.orderedDate) ||
    formatOrderDate(new Date());

  const deliveryDate = resolveDeliveryDate(data);
  const paymentText = resolvePaymentText(data);

  // Exact 4 required rows first (never show order ID)
  const rows: Array<{ label: string; value: string; isBold?: boolean }> = [
    { label: "Product", value: data.productName, isBold: true },
    { label: "Ordered on", value: orderedDate },
    { label: "Expected delivery", value: deliveryDate },
    { label: "Payment", value: paymentText, isBold: true },
  ];

  // Optional rows: added only if existing in the order data
  if (typeof data.quantity === "number" && data.quantity > 0) {
    rows.push({ label: "Quantity", value: String(data.quantity) });
  }

  const rawAmount = data.totalAmount ?? data.price;
  if (typeof rawAmount === "number" && rawAmount > 0) {
    rows.push({ label: "Total Amount", value: formatINR(rawAmount), isBold: true });
  }

  const addrParts = [data.address, data.city, data.state, data.pincode]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  if (addrParts.length > 0) {
    rows.push({ label: "Delivery Address", value: addrParts.join(", ") });
  }

  const rowsHtml = rows
    .map((row, idx) => {
      const isLast = idx === rows.length - 1;
      const borderBottom = isLast ? "" : "border-bottom:1px solid #E2E8F0;";
      const valueStyle = row.isBold
        ? "color:#0F172A;font-weight:700;"
        : "color:#0F172A;font-weight:500;";
      return `
        <tr>
          <td style="padding:12px 18px;${borderBottom}color:#64748B;font-size:13px;font-weight:600;width:38%;vertical-align:top;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:12px 18px;${borderBottom}${valueStyle}font-size:13px;vertical-align:top;">
            ${escapeHtml(row.value)}
          </td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:100%;background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:2px solid #C9A66B;border-radius:10px;margin:24px 0 20px 0;border-collapse:separate;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const text = [
    "Order Details:",
    ...rows.map((r) => `- ${r.label}: ${r.value}`),
  ].join("\n");

  return { html, text };
}

export function formatLockedInSubject(productSummary: string): string {
  const clean = (productSummary || "").trim();
  if (!clean || clean.toLowerCase() === "order") {
    return "Your order is locked in";
  }
  if (/^your\s+/i.test(clean)) {
    return `${clean} is locked in`;
  }
  return `Your ${clean} is locked in`;
}

export interface BadgeConfig {
  text: string;
  bg?: string;
  color?: string;
  border?: string;
}

export interface LayoutOptions {
  preheader: string;
  badge?: BadgeConfig;
  headline: string;
  subheadline?: string;
  orderNumber?: string;
  contentHtml: string;
  cta?: {
    label: string;
    url: string;
  };
  siteUrl?: string;
  showNotificationPreferences?: boolean;
}

export function renderEmailLayout(options: LayoutOptions): string {
  const siteUrl = (options.siteUrl || "https://vnmobiles.in").replace(/\/$/, "");
  const badge = options.badge;

  const badgeHtml = badge
    ? `<div style="display:inline-block;padding:5px 12px;border-radius:9999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;background-color:${badge.bg || "#F1F5F9"};color:${badge.color || "#0F172A"};border:1px solid ${badge.border || "#E2E8F0"};margin-bottom:12px;">${escapeHtml(badge.text)}</div>`
    : "";

  const ctaHtml = options.cta
    ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 8px 0;">
        <tr>
          <td align="center">
            <a href="${escapeHtml(options.cta.url)}" style="display:inline-block;background-color:#C9A66B;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:9999px;letter-spacing:0.3px;">
              ${escapeHtml(options.cta.label)}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(options.headline)}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content { padding: 24px 20px !important; }
      .email-header { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <!-- Preheader text (hidden in email body, visible in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF;">
    ${escapeHtml(options.preheader)}
    &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp; &#847; &zwnj; &nbsp;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" class="email-container" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(15,23,42,0.05);">
          <!-- Dark Navy Header with Gold Accent and Circular VN Logo -->
          <tr>
            <td class="email-header" style="background-color:#0F172A;padding:24px 32px;border-bottom:3px solid #C9A66B;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;background-color:#C9A66B;color:#FFFFFF;font-weight:800;font-size:13px;border-radius:50%;vertical-align:middle;margin-right:10px;">VN</span>
                    <span style="color:#FFFFFF;font-size:18px;font-weight:700;vertical-align:middle;letter-spacing:-0.2px;">VN Mobiles</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="email-content" style="padding:32px;">
              ${badgeHtml}
              <h1 style="margin:0 0 10px 0;font-size:22px;font-weight:800;color:#0F172A;line-height:1.3;letter-spacing:-0.3px;">
                ${escapeHtml(options.headline)}
              </h1>
              ${
                options.subheadline
                  ? `<p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(options.subheadline)}</p>`
                  : ""
              }

              ${options.contentHtml}

              ${ctaHtml}
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 32px;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#64748B;line-height:1.5;">
                Need assistance? Our support team is here to help at <a href="mailto:support@vnmobiles.in" style="color:#C9A66B;text-decoration:none;font-weight:600;">support@vnmobiles.in</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:11px;color:#94A3B8;line-height:1.4;">
                This is an automated transaction notification from VN Mobiles India.
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                &copy; 2026 VN Mobiles India. All rights reserved. &bull; <a href="${siteUrl}" style="color:#94A3B8;text-decoration:underline;">vnmobiles.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderPlainFooter(siteUrl = "https://vnmobiles.in"): string {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  return [
    "--------------------------------------------------",
    "VN Mobiles India",
    "Need help? Contact support@vnmobiles.in",
    `Visit us at ${cleanUrl}`,
    "This is an automated transaction notification.",
    "(c) 2026 VN Mobiles India. All rights reserved.",
  ].join("\n");
}

