import {
  escapeHtml,
  formatDate,
  renderEmailLayout,
  renderPlainFooter,
  BadgeConfig,
} from "./layout";

export interface WarrantyReminderData {
  customerName: string;
  customerEmail: string;
  productName: string;
  warrantyNumber: string;
  imeiNumber: string;
  warrantyStartDate: Date | string;
  warrantyExpiryDate: Date | string;
  orderNumber?: string;
  warrantyDuration?: string;
}

export function renderWarrantyExpiringEmail(
  warranty: WarrantyReminderData,
  type: "6_MONTHS" | "1_DAY",
  siteUrl = "https://vnmobiles.in"
): {
  subject: string;
  html: string;
  text: string;
  preheader: string;
} {
  const cleanUrl = siteUrl.replace(/\/$/, "");
  const deviceName = warranty.productName || "Your Smartphone";
  const startStr = formatDate(warranty.warrantyStartDate);
  const expiryStr = formatDate(warranty.warrantyExpiryDate);

  const isOneDay = type === "1_DAY";

  const subject = isOneDay
    ? `Warranty expires tomorrow: ${deviceName}`
    : `6 months of warranty remaining: ${deviceName}`;

  const preheader = isOneDay
    ? "Final 24 hours of official coverage."
    : "Check your device health before coverage expires.";

  const badge: BadgeConfig = isOneDay
    ? { text: "EXPIRING TOMORROW", bg: "#FFF7ED", color: "#9A3412", border: "#FFEDD5" }
    : { text: "6 MONTHS REMAINING", bg: "#EEF2FF", color: "#3730A3", border: "#C7D2FE" };

  const headline = isOneDay
    ? "Final 24 hours of warranty."
    : "6 months of protection left.";

  const subheadline = isOneDay
    ? `Your official warranty coverage for ${deviceName} expires tomorrow on ${expiryStr}.`
    : `Time flies when your phone is running smooth. You have 6 months left on your official warranty for ${deviceName}.`;

  const contentHtml = `
    <!-- Device & Warranty Specs Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:20px 0;font-size:13px;">
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;width:40%;">Covered Device</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700;">${escapeHtml(deviceName)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Certificate ID</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:700;">${escapeHtml(warranty.warrantyNumber)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Device IMEI</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-weight:600;">${escapeHtml(warranty.imeiNumber)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#64748B;">Coverage Start</td>
        <td style="padding:14px 18px;border-bottom:1px solid #E2E8F0;color:#0F172A;">${escapeHtml(startStr)}</td>
      </tr>
      <tr>
        <td style="padding:14px 18px;color:#64748B;">Coverage Expiry Date</td>
        <td style="padding:14px 18px;color:${isOneDay ? "#DC2626" : "#0F172A"};font-weight:700;">${escapeHtml(expiryStr)}</td>
      </tr>
    </table>

    <div style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:13px;line-height:1.6;color:#475569;">
      <strong>Recommended Action:</strong> Check your device hardware, battery health, touchscreen responsiveness, and camera sensors. If you are noticing any defects or issues, visit an authorized brand service center before ${escapeHtml(expiryStr)} to claim free repairs under warranty.
    </div>

    ${
      warranty.orderNumber
        ? `<p style="margin:16px 0 0 0;font-size:13px;color:#64748B;">Order Reference: <span style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;color:#0F172A;font-weight:600;">#${escapeHtml(warranty.orderNumber)}</span></p>`
        : ""
    }
  `;

  const html = renderEmailLayout({
    preheader,
    badge,
    headline,
    subheadline,
    orderNumber: warranty.orderNumber,
    contentHtml,
    cta: {
      label: isOneDay ? "View Warranty Certificate" : "Check Device Health & Coverage",
      url: `${cleanUrl}/account/warranties`,
    },
    siteUrl: cleanUrl,
  });

  const text = [
    subject,
    "",
    `Hi ${warranty.customerName},`,
    "",
    subheadline,
    "",
    "WARRANTY DETAILS:",
    `- Device: ${deviceName}`,
    `- Certificate ID: ${warranty.warrantyNumber}`,
    `- IMEI: ${warranty.imeiNumber}`,
    `- Valid From: ${startStr}`,
    `- Expiry Date: ${expiryStr}`,
    "",
    "Recommended Action: Check your phone hardware and visit an authorized brand service center before expiry if you need any warranty service.",
    "",
    `View your warranty: ${cleanUrl}/account/warranties`,
    "",
    renderPlainFooter(cleanUrl),
  ].join("\n");

  return { subject, html, text, preheader };
}

