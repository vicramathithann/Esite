import {
  escapeHtml,
  renderEmailLayout,
  formatOrderProductsDisplayName,
} from "./layout";

export interface WarrantyCertificateItem {
  productId?: string;
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
  const productName = formatOrderProductsDisplayName(data.items);

  // Exact required format:
  // Subject: Your {productName} order was placed successfully
  // Heading: {productName}
  // Body: Thank you! Your order for {productName} has been placed successfully.
  //       Your warranty certificate is attached as a PDF.
  const subject = `Your ${productName} order was placed successfully`;
  const heading = productName;
  const preheader = `Thank you! Your order for ${productName} has been placed successfully. Your warranty certificate is attached as a PDF.`;

  const contentHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Thank you! Your order for <strong>${escapeHtml(productName)}</strong> has been placed successfully.
    </p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">
      Your warranty certificate is attached as a PDF.
    </p>

    <div style="background-color:#FAF7F0;border:1px solid #E7D7B8;border-radius:10px;padding:14px 18px;margin:22px 0;font-size:13px;color:#5C451D;line-height:1.5;">
      <strong>Official Warranty Certificate Attached:</strong> Your official manufacturer warranty certificate (including device serial / IMEI specifications, complete coverage terms, and brand service center claim instructions) has been generated and attached to this email as a PDF document for your records.
    </div>
  `;

  const html = renderEmailLayout({
    preheader,
    badge: {
      text: "ORDER PLACED & WARRANTY ATTACHED",
      bg: "#FEF3C7",
      color: "#92400E",
      border: "#FDE68A",
    },
    headline: heading,
    contentHtml,
    cta: {
      label: "View Warranty in Account",
      url: `${cleanUrl}/account/warranties`,
    },
    siteUrl: cleanUrl,
  });

  const text = `
${heading}

Thank you! Your order for ${productName} has been placed successfully.
Your warranty certificate is attached as a PDF.

View your warranty in your account:
${cleanUrl}/account/warranties

Need assistance? Our support team is here to help at support@vnmobiles.in
This is an automated transaction notification from VN Mobiles India.
`.trim();

  return { subject, html, text, preheader };
}
