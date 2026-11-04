import {
  escapeHtml,
  renderEmailLayout,
  renderPlainFooter,
} from "./layout";

export interface WarrantyCertificateItem {
  productName: string;
  variantInfo?: string;
  warrantyNumber: string;
  imeiNumber: string;
  coveragePeriod: string;
  startDateStr: string;
  expiryDateStr: string;
  status: string;
}

export interface WarrantyActivationData {
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  items: WarrantyCertificateItem[];
}

export function renderWarrantyActivationEmail(
  data: WarrantyActivationData,
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const firstItem = data.items[0] || {
    productName: data.orderNumber ? `Order #${data.orderNumber} Device` : "Device",
    warrantyNumber: "WRT-PENDING",
    imeiNumber: "N/A",
    coveragePeriod: "1 Year",
    startDateStr: "4 Nov 2026",
    expiryDateStr: "4 Nov 2027",
    status: "ACTIVE",
  };

  const firstItemFullName = firstItem.variantInfo
    ? `${firstItem.productName}, ${firstItem.variantInfo.replace(/\s*•\s*/g, ", ")}`
    : firstItem.productName;

  const deviceTitle =
    data.items.length > 1
      ? `${firstItem.productName} + ${data.items.length - 1} more`
      : firstItemFullName;

  // Subject: "Your <real product name> warranty certificate"
  const subject = `Your ${deviceTitle} warranty certificate`;
  const preheader = "Official brand warranty certificate attached as PDF.";

  // Compact summary card for each device
  const devicesSummaryHtml = data.items
    .map((item, idx) => {
      return `
        <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin:${idx > 0 ? "14px" : "10px"} 0 14px 0;">
          <div style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:2px;">
            ${escapeHtml(item.productName)}
          </div>
          ${
            item.variantInfo
              ? `<div style="font-size:12px;color:#64748B;margin-bottom:12px;">${escapeHtml(item.variantInfo.replace(/\s*•\s*/g, ", "))}</div>`
              : `<div style="margin-bottom:8px;"></div>`
          }
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px;line-height:1.6;">
            <tr>
              <td style="color:#64748B;width:40%;padding:4px 0;">Certificate ID</td>
              <td style="color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700;">
                ${escapeHtml(item.warrantyNumber)}
              </td>
            </tr>
            <tr>
              <td style="color:#64748B;padding:4px 0;">Coverage Period</td>
              <td style="color:#0F172A;font-weight:600;">
                ${escapeHtml(item.coveragePeriod)}
              </td>
            </tr>
            <tr>
              <td style="color:#64748B;padding:4px 0;">Valid From</td>
              <td style="color:#0F172A;">
                ${escapeHtml(item.startDateStr)}
              </td>
            </tr>
            <tr>
              <td style="color:#64748B;padding:4px 0;">Valid Until</td>
              <td style="color:#0F172A;font-weight:700;">
                ${escapeHtml(item.expiryDateStr)}
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join("");

  const contentHtml = `
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Hello <strong>${escapeHtml(data.customerName)}</strong>,
    </p>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
      Official brand coverage is active for your device. Your comprehensive hardware warranty certificate is attached to this email as a PDF document.
    </p>

    ${devicesSummaryHtml}

    <div style="background-color:#FAF7F0;border:1px solid #E7D7B8;border-radius:8px;padding:12px 16px;margin:18px 0;font-size:12.5px;color:#5C451D;line-height:1.5;">
      <strong>Certificate Attached:</strong> Your official warranty certificate (with verified hardware IMEI, coverage specifications, terms, and brand service center claim instructions) has been attached as a PDF to this email for your records.
    </div>

    ${
      data.orderNumber
        ? `<p style="margin:16px 0 0 0;font-size:12px;color:#64748B;">Order Reference: <span style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#0F172A;font-weight:600;">#${escapeHtml(data.orderNumber)}</span></p>`
        : ""
    }
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "WARRANTY ACTIVE",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: "Your warranty has your back.",
    subheadline: `Official manufacturer coverage is active for ${deviceTitle}. Your certificate is attached as a PDF.`,
    orderNumber: data.orderNumber,
    contentHtml,
    cta: {
      label: "View Warranty in Account",
      url: `${cleanUrl}/account/warranties`,
    },
    siteUrl: cleanUrl,
  });

  const plainTextItems = data.items
    .map(
      (item) => `
- ${item.productName}${item.variantInfo ? ` (${item.variantInfo.replace(/\s*•\s*/g, ", ")})` : ""}
  Certificate: ${item.warrantyNumber}
  Coverage: ${item.coveragePeriod}
  Valid From: ${item.startDateStr}
  Valid Until: ${item.expiryDateStr}`
    )
    .join("\n");

  const text = [
    `Your ${deviceTitle} warranty certificate`,
    "",
    `Hi ${data.customerName},`,
    "",
    "Your warranty has your back. Official brand coverage is active for your device.",
    "",
    "WARRANTY SUMMARY:",
    plainTextItems,
    "",
    "Your official warranty certificate with hardware IMEI, coverage details, and service center claim instructions is attached to this email as a PDF document.",
    "",
    `View your warranty online anytime: ${cleanUrl}/account/warranties`,
    "",
    data.orderNumber ? `Order Reference: #${data.orderNumber}` : "",
    "",
    renderPlainFooter(cleanUrl),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text, preheader };
}
