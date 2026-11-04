import {
  escapeHtml,
  formatDate,
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
    startDateStr: formatDate(new Date()),
    expiryDateStr: formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    status: "ACTIVE",
  };

  const firstItemFullName = firstItem.variantInfo
    ? `${firstItem.productName}, ${firstItem.variantInfo.replace(/\s*•\s*/g, ", ")}`
    : firstItem.productName;

  const deviceSummary =
    data.items.length > 1
      ? `${firstItemFullName} + ${data.items.length - 1} more`
      : firstItemFullName;

  const subject = `Warranty activated: ${deviceSummary}`;
  const preheader = "Official manufacturer coverage is locked in.";

  // Generate certificate card for each covered item
  const certificatesHtml = data.items
    .map((item, idx) => {
      return `
        <div style="background-color:#F8FAFC;border:2px solid #E2E8F0;border-radius:12px;padding:20px;margin:${idx > 0 ? "20px" : "12px"} 0 20px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;border-bottom:1px solid #E2E8F0;padding-bottom:12px;">
            <tr>
              <td>
                <div style="font-size:16px;font-weight:800;color:#0F172A;">
                  ${escapeHtml(item.productName)}
                </div>
                ${
                  item.variantInfo
                    ? `<div style="font-size:12px;color:#64748B;margin-top:2px;">${escapeHtml(item.variantInfo)}</div>`
                    : ""
                }
              </td>
              <td align="right">
                <span style="display:inline-block;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:700;background-color:#FEF3C7;color:#92400E;border:1px solid #FDE68A;letter-spacing:0.5px;">
                  ${escapeHtml(item.status || "ACTIVE")}
                </span>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;">
            <tr>
              <td style="padding:6px 0;color:#64748B;width:40%;">Certificate ID</td>
              <td style="padding:6px 0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700;">
                ${escapeHtml(item.warrantyNumber)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;">Device IMEI</td>
              <td style="padding:6px 0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:600;">
                ${escapeHtml(item.imeiNumber)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;">Coverage Period</td>
              <td style="padding:6px 0;color:#0F172A;font-weight:600;">
                ${escapeHtml(item.coveragePeriod)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;">Valid From</td>
              <td style="padding:6px 0;color:#0F172A;">
                ${escapeHtml(item.startDateStr)}
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748B;">Valid Until</td>
              <td style="padding:6px 0;color:#0F172A;font-weight:700;">
                ${escapeHtml(item.expiryDateStr)}
              </td>
            </tr>
          </table>
        </div>
      `;
    })
    .join("");

  const contentHtml = `
    ${certificatesHtml}

    <!-- Coverage terms card (No emojis, clean text badges) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:10px;margin:20px 0;font-size:12px;line-height:1.6;">
      <tr>
        <td style="padding:16px 20px;border-bottom:1px solid #E2E8F0;">
          <div style="font-size:12px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            WHAT IS COVERED
          </div>
          <div style="color:#475569;">
            &bull; Internal hardware and motherboard defects<br>
            &bull; Touchscreen, display panel, and camera sensor failures<br>
            &bull; Battery degradation falling below 80% capacity within 12 months<br>
            &bull; Authorized pan-India brand service center repairs and genuine parts
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          <div style="font-size:12px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
            WHAT IS NOT COVERED
          </div>
          <div style="color:#475569;">
            &bull; Liquid immersion or water exposure beyond IP rating<br>
            &bull; Physical damage caused by drops, crushing, or accidents<br>
            &bull; Unauthorized third-party repairs or software modifications
          </div>
        </td>
      </tr>
    </table>

    <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:12px;color:#64748B;line-height:1.5;">
      <strong>How to claim:</strong> Present your warranty certificate ID and device IMEI at any authorized brand service center across India, or initiate a claim directly through your VN Mobiles account dashboard.
    </div>

    ${
      data.orderNumber
        ? `<p style="margin:16px 0 0 0;font-size:13px;color:#64748B;">Order Reference: <span style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#0F172A;font-weight:600;">#${escapeHtml(data.orderNumber)}</span></p>`
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
    subheadline: `Official brand coverage is active for ${deviceSummary}. Here are your device protection credentials.`,
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
- ${item.productName}${item.variantInfo ? ` (${item.variantInfo})` : ""}
  Certificate: ${item.warrantyNumber}
  IMEI: ${item.imeiNumber}
  Coverage: ${item.coveragePeriod}
  Valid: ${item.startDateStr} to ${item.expiryDateStr}
  Status: ${item.status}`
    )
    .join("\n");

  const text = [
    `Warranty activated: ${deviceSummary}`,
    "",
    `Hi ${data.customerName},`,
    "",
    "Your warranty has your back. Official brand coverage is active for your device.",
    "",
    "CERTIFICATE DETAILS:",
    plainTextItems,
    "",
    "WHAT IS COVERED:",
    "- Hardware defects and motherboard failures",
    "- Touchscreen and camera sensor malfunctions",
    "- Battery degradation below 80% capacity",
    "- Authorized brand service center repairs",
    "",
    "WHAT IS NOT COVERED:",
    "- Liquid immersion and water damage",
    "- Accidental physical drops and screen breakage",
    "- Unauthorized repairs or tampering",
    "",
    `View your certificate online: ${cleanUrl}/account/warranties`,
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

