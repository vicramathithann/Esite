import {
  escapeHtml,
  renderEmailLayout,
  formatOrderProductsDisplayName,
  renderOrderDetailsTable,
} from "./layout";

export interface OrderConfirmationItem {
  productId?: string;
  productName: string;
  quantity?: number;
  price?: number;
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
  totalAmount?: number;
  items: OrderConfirmationItem[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
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
  price?: number | null;
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
  const productName = formatOrderProductsDisplayName(order.items);

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
    createdAt: order.createdAt,
    orderedDate: order.orderedDate,
    estimatedDelivery: order.estimatedDelivery,
    deliveryDate: order.deliveryDate,
    expectedDeliveryDate: order.expectedDeliveryDate,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    isPaid: order.isPaid,
    paymentText: order.paymentText,
    quantity: order.quantity ?? (order.items && order.items.length > 0 ? order.items.reduce((s, i) => s + (i.quantity || 1), 0) : undefined),
    totalAmount: order.totalAmount,
    price: order.price,
    address: order.address,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
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
