import {
  escapeHtml,
  renderEmailLayout,
} from "./layout";
import { formatKolkataDateString } from "../warrantyDateHelpers";

export interface WarrantyUpdatedEmailData {
  customerName: string;
  customerEmail: string;
  productName: string;
  variantInfo?: string | null;
  oldDuration: string;
  newDuration: string;
  oldExpiryDate: Date | string;
  newExpiryDate: Date | string;
  updatedAt?: Date | string | null;
  isExtended: boolean;
}

export function renderWarrantyUpdatedEmail(
  data: WarrantyUpdatedEmailData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const baseName = data.productName.trim();
  const displayName = data.variantInfo
    ? `${baseName} (${data.variantInfo})`
    : baseName;

  // Anti-threading subject (no dynamic timestamp in subject line)
  const subject = `Your warranty for ${baseName} has been updated`;
  const heading = displayName;
  const preheader = data.isExtended
    ? `Good news! Your warranty for ${baseName} has been extended.`
    : `The warranty period for ${baseName} has been updated.`;

  const introText = data.isExtended
    ? "Good news! The warranty on your device has been extended."
    : "The warranty period on your device has been updated.";

  const oldExpiryFormatted = formatKolkataDateString(data.oldExpiryDate);
  const newExpiryFormatted = formatKolkataDateString(data.newExpiryDate);
  const updatedOnFormatted = formatKolkataDateString(data.updatedAt || new Date());

  // Build the details table rows
  const rows: Array<{ label: string; value: string; isBold?: boolean }> = [
    { label: "Product", value: displayName, isBold: true },
    { label: "Old warranty", value: data.oldDuration },
    { label: "New warranty", value: data.newDuration, isBold: true },
    { label: "New expiry date", value: newExpiryFormatted, isBold: true },
    { label: "Updated on", value: updatedOnFormatted },
  ];

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

  const tableHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:100%;background-color:#F8FAFC;border:1px solid #E2E8F0;border-top:2px solid #C9A66B;border-radius:10px;margin:24px 0 20px 0;border-collapse:separate;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;

  const contentHtml = `
    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#1E293B;">
      Dear ${escapeHtml(data.customerName || "Customer")},
    </p>

    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#334155;">
      ${escapeHtml(introText)}
    </p>

    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">
      Your new official warranty certificate has been generated and is attached to this email as a PDF.
    </p>

    ${tableHtml}

    <p style="margin:24px 0 0 0;font-size:13px;line-height:1.6;color:#64748B;">
      If you have any questions, contact VN Mobiles support.
    </p>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "WARRANTY UPDATED",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: heading,
    contentHtml,
    cta: {
      label: "View My Warranties",
      url: `${cleanUrl}/account/warranties`,
    },
    siteUrl: cleanUrl,
    showNotificationPreferences: false,
  });

  const textRows = rows.map((r) => `- ${r.label}: ${r.value}`).join("\n");
  const text = [
    `Dear ${data.customerName || "Customer"},`,
    "",
    introText,
    "Your new official warranty certificate is attached as a PDF.",
    "",
    "Updated Warranty Details:",
    textRows,
    "",
    "If you have any questions, contact VN Mobiles support.",
    `${cleanUrl}/account/warranties`,
  ].join("\n");

  return {
    subject,
    html,
    text,
    preheader,
  };
}
