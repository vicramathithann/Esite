import {
  escapeHtml,
  renderEmailLayout,
  formatOrderProductsDisplayName,
  renderOrderDetailsTable,
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
  quantity?: number;
  price?: number;
}

export interface WarrantyActivationData {
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  items: WarrantyCertificateItem[];
  // Order details for the order summary table
  productName?: string;
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
  const productName = data.productName || formatOrderProductsDisplayName(data.items);

  // Exact required format:
  // Subject: Your {productName} order was placed successfully
  // Heading: {productName}
  // Body: Thank you! Your order for {productName} has been placed successfully.
  //       Your warranty certificate is attached as a PDF.
  // Note: Order ID stays strictly in the warranty PDF; never in the email text.
  const subject = `Your ${productName} order was placed successfully`;
  const heading = productName;
  const preheader = "Official order receipt and manufacturer warranty certificate.";

  // Render the order details table (Product, Ordered on, Expected delivery, Payment, and optional rows)
  const table = renderOrderDetailsTable({
    productName,
    createdAt: data.createdAt,
    orderedDate: data.orderedDate,
    estimatedDelivery: data.estimatedDelivery,
    deliveryDate: data.deliveryDate,
    expectedDeliveryDate: data.expectedDeliveryDate,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    isPaid: data.isPaid,
    paymentText: data.paymentText,
    quantity: data.quantity,
    totalAmount: data.totalAmount,
    price: data.price,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
  });

  const contentHtml = `
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
      Thank you! Your order for <strong>${escapeHtml(productName)}</strong> has been placed successfully.
    </p>
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">
      Your warranty certificate is attached as a PDF.
    </p>

    ${table.html}
  `;

  // Render email layout without CTA button ("View Warranty in Account" removed per specification)
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
    siteUrl: cleanUrl,
  });

  const text = `
${heading}

Thank you! Your order for ${productName} has been placed successfully.
Your warranty certificate is attached as a PDF.

${table.text}

Need assistance? Our support team is here to help at support@vnmobiles.in
This is an automated transaction notification from VN Mobiles India.
`.trim();

  return { subject, html, text, preheader };
}
