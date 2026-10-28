import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sanitizeInput, detectLlmAttack } from "@/lib/aiSecurity";
import { formatINR } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Strict Administrator Authorization on the Backend
    const auth = await requireAdmin(request);
    if (auth instanceof Response) {
      return auth;
    }
    const adminUser = auth;

    // 2. Parse & Sanitize Request
    const body = await request.json();
    const { messages = [] } = body;

    const rawLatest = messages[messages.length - 1]?.content || "";
    const latestMessage = sanitizeInput(rawLatest);
    const historyText = messages
      .slice(-4, -1)
      .map((m: any) => sanitizeInput(m.content))
      .join(" ");

    // 3. Security Check: Detect prompt injection / jailbreak / system prompt extraction attacks
    const attackCheck = detectLlmAttack(latestMessage);
    if (attackCheck.isAttack) {
      return NextResponse.json({
        success: true,
        answer:
          "🛡️ **Security Alert:** Request rejected. System override, injection tokens, or unauthorized prompt extraction attempts cannot be executed.\n\nAs the VN Mobiles Admin AI Assistant, I can provide operational analytics, sales metrics, invite tracking, and inventory health for this store.",
        suggestions: [
          "💰 Total revenue & sales",
          "👥 User invite acceptance stats",
          "📦 Order stats & cancellation rate",
          "📱 Top selling products"
        ]
      });
    }

    const q = latestMessage.toLowerCase().trim();

    // 4. Greetings
    if (/^(hi|hello|hey|namaste|good morning|good afternoon|good evening|greeting)\b/i.test(q)) {
      return NextResponse.json({
        success: true,
        answer:
          `Hello, **${adminUser.name || "Administrator"}**! 🛡️ Welcome to the **VN Mobiles Admin AI Assistant**.\n\n` +
          `I am your live operations and business analytics agent. I can analyze real-time data across your store, including:\n\n` +
          `• **Total Revenue & Sales Analytics**\n` +
          `• **User Invitations & Acceptance Rates**\n` +
          `• **Registered Userbase & Verification Metrics**\n` +
          `• **Order Breakdown & Cancellation Rate**\n` +
          `• **Top-Selling Smartphones & Inventory Alerts**\n` +
          `• **Device Shield Warranty Coverage Metrics**\n` +
          `• **Transactional Email Delivery Health**\n\n` +
          `What metric or analysis would you like me to pull up for you?`,
        links: [
          { label: "Admin Dashboard", href: "/admin/dashboard" },
          { label: "Orders Manager", href: "/admin/orders" },
          { label: "Invite Manager", href: "/admin/invite" }
        ],
        suggestions: [
          "How much total revenue do we have?",
          "How many users accepted my invites?",
          "What is our order cancellation rate?",
          "What are our top selling phones?"
        ]
      });
    }

    // 5. Query Real-Time Store Data from Database

    // A) Revenue & Sales Queries
    if (
      q.includes("revenue") ||
      q.includes("sales") ||
      q.includes("turnover") ||
      q.includes("earnings") ||
      q.includes("how much money") ||
      q.includes("gross") ||
      q.includes("profit") ||
      q.includes("aov")
    ) {
      const nonCancelledOrders = await prisma.order.findMany({
        where: {
          orderStatus: { notIn: ["Cancelled", "CANCELLED"] }
        },
        select: {
          id: true,
          totalAmount: true,
          paymentMethod: true,
          createdAt: true
        }
      });

      const totalRevenue = nonCancelledOrders.reduce((sum: number, o: { totalAmount: number | null }) => sum + (o.totalAmount || 0), 0);
      const orderCount = nonCancelledOrders.length;
      const aov = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

      // Group by payment method
      const paymentBreakdown: Record<string, { count: number; sum: number }> = {};
      nonCancelledOrders.forEach((o: { paymentMethod?: string | null; totalAmount?: number | null }) => {
        const method = o.paymentMethod || "Other";
        if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, sum: 0 };
        paymentBreakdown[method].count += 1;
        paymentBreakdown[method].sum += o.totalAmount || 0;
      });

      const paymentLines = Object.entries(paymentBreakdown)
        .map(([m, data]) => `  - **${m}:** ${formatINR(data.sum)} (${data.count} orders)`)
        .join("\n");

      return NextResponse.json({
        success: true,
        answer:
          `📊 **Live Revenue & Sales Analytics (VN Mobiles):**\n\n` +
          `• **Total Gross Revenue:** **${formatINR(totalRevenue)}**\n` +
          `• **Total Paid/Active Orders:** **${orderCount} orders**\n` +
          `• **Average Order Value (AOV):** **${formatINR(aov)}**\n\n` +
          `**Revenue by Payment Channel:**\n` +
          (paymentLines || "  - No completed orders yet") +
          `\n\n💡 *Note: Cancelled orders are strictly excluded from gross revenue calculations to prevent inflated accounting figures.*`,
        links: [
          { label: "View Orders Table", href: "/admin/orders" },
          { label: "Admin Dashboard", href: "/admin/dashboard" }
        ],
        suggestions: [
          "What is our order cancellation rate?",
          "How many users accepted my invites?",
          "Top selling smartphones"
        ]
      });
    }

    // B) User Invitations & Acceptance Queries
    if (
      q.includes("invite") ||
      q.includes("invitation") ||
      q.includes("accepted") ||
      q.includes("token")
    ) {
      const totalInvites = await prisma.invitation.count();
      const acceptedInvites = await prisma.invitation.count({ where: { status: "ACCEPTED" } });
      const pendingInvites = await prisma.invitation.count({ where: { status: "PENDING" } });
      const expiredInvites = await prisma.invitation.count({ where: { status: "EXPIRED" } });
      const acceptanceRate = totalInvites > 0 ? ((acceptedInvites / totalInvites) * 100).toFixed(1) + "%" : "0%";

      const recentAccepted = await prisma.invitation.findMany({
        where: { status: "ACCEPTED" },
        orderBy: { acceptedAt: "desc" },
        take: 3,
        select: { email: true, acceptedAt: true }
      });

      const recentLines = recentAccepted.length > 0
        ? recentAccepted.map((inv: { email: string; acceptedAt: Date | string | null }) => `  - \`${inv.email}\` (Accepted: ${inv.acceptedAt ? new Date(inv.acceptedAt).toLocaleDateString("en-IN") : "Recent"})`).join("\n")
        : "  - No accepted invites yet.";

      return NextResponse.json({
        success: true,
        answer:
          `✉️ **User Invitations & Conversion Metrics:**\n\n` +
          `• **Total Invitations Dispatched:** **${totalInvites}**\n` +
          `• **Accepted Invitations:** **${acceptedInvites}**\n` +
          `• **Acceptance Conversion Rate:** **${acceptanceRate}**\n` +
          `• **Pending Acceptance:** **${pendingInvites}**\n` +
          `• **Expired / Unclaimed:** **${expiredInvites}**\n\n` +
          `**Recently Onboarded Invitees:**\n` +
          recentLines +
          `\n\n*Actionable Insight: You have **${pendingInvites} pending invites**. If any exceed 48 hours without acceptance, you can re-dispatch a fresh invitation link from the Invite Manager.*`,
        links: [
          { label: "Go to Invite Manager", href: "/admin/invite" },
          { label: "View User Accounts", href: "/admin/customers" }
        ],
        suggestions: [
          "How many total registered users do we have?",
          "Total revenue & sales",
          "Order stats & cancellation rate"
        ]
      });
    }

    // C) Registered Users & Account Growth Queries
    if (
      q.includes("registered") ||
      q.includes("user count") ||
      q.includes("customers") ||
      q.includes("how many users") ||
      q.includes("logged in") ||
      q.includes("active users")
    ) {
      const totalUsers = await prisma.user.count({ where: { role: "USER" } });
      const verifiedUsers = await prisma.user.count({ where: { role: "USER", emailVerified: true } });
      const unverifiedUsers = totalUsers - verifiedUsers;

      const usersWithOrders = await prisma.user.count({
        where: {
          role: "USER",
          orders: { some: {} }
        }
      });

      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

      return NextResponse.json({
        success: true,
        answer:
          `👥 **Userbase & Account Demographics:**\n\n` +
          `• **Total Registered Shoppers:** **${totalUsers} customer accounts**\n` +
          `• **Email Verified Accounts:** **${verifiedUsers}** (${totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(0) : 0}%)\n` +
          `• **Pending Email Verification:** **${unverifiedUsers}**\n` +
          `• **Shoppers with Purchases:** **${usersWithOrders}** (${totalUsers > 0 ? ((usersWithOrders / totalUsers) * 100).toFixed(0) : 0}% buyer conversion)\n` +
          `• **Store Administrators:** **${adminCount}** (\`rrroyce20@gmail.com\`)\n\n` +
          `*Note: Registered users can sign in with passwords or instant one-time login OTPs sent via Gmail SMTP.*`,
        links: [
          { label: "Manage User Accounts", href: "/admin/customers" },
          { label: "Dispatch New Invite", href: "/admin/invite" }
        ],
        suggestions: [
          "How many users accepted my invites?",
          "Total store revenue",
          "Order cancellation rate"
        ]
      });
    }

    // D) Order Statistics & Cancellation Rate Queries
    if (
      q.includes("order") ||
      q.includes("cancellation") ||
      q.includes("cancell") ||
      q.includes("shipped") ||
      q.includes("fulfillment")
    ) {
      const totalOrders = await prisma.order.count();
      const confirmed = await prisma.order.count({ where: { orderStatus: { in: ["Confirmed", "CONFIRMED", "Order Confirmed"] } } });
      const processing = await prisma.order.count({ where: { orderStatus: { in: ["Processing", "PROCESSING"] } } });
      const packed = await prisma.order.count({ where: { orderStatus: { in: ["Packed", "PACKED"] } } });
      const shipped = await prisma.order.count({ where: { orderStatus: { in: ["Shipped", "SHIPPED"] } } });
      const outForDelivery = await prisma.order.count({ where: { orderStatus: { in: ["OUT_FOR_DELIVERY", "Out for Delivery"] } } });
      const delivered = await prisma.order.count({ where: { orderStatus: { in: ["Delivered", "DELIVERED"] } } });
      const cancelled = await prisma.order.count({ where: { orderStatus: { in: ["Cancelled", "CANCELLED"] } } });

      const cancellationRate = totalOrders > 0 ? ((cancelled / totalOrders) * 100).toFixed(1) + "%" : "0%";
      const pendingFulfillment = confirmed + processing + packed;

      return NextResponse.json({
        success: true,
        answer:
          `📦 **Order Pipeline & Fulfillment Statistics:**\n\n` +
          `• **Total Orders Logged:** **${totalOrders}**\n` +
          `• **Order Cancellation Rate:** **${cancellationRate}** (${cancelled} cancelled)\n` +
          `• **Pending Dispatch / Fulfillment:** **${pendingFulfillment} orders**\n\n` +
          `**Full Status Breakdown:**\n` +
          `  - **Confirmed:** ${confirmed}\n` +
          `  - **Processing:** ${processing}\n` +
          `  - **Packed:** ${packed}\n` +
          `  - **In Transit / Shipped:** ${shipped + outForDelivery}\n` +
          `  - **Successfully Delivered:** ${delivered}\n` +
          `  - **Cancelled & Refund Initiated:** ${cancelled}\n\n` +
          `*Operational Note: When an order is cancelled, stock is restored automatically and the associated Device Shield warranty is voided in real-time.*`,
        links: [
          { label: "Manage Orders", href: "/admin/orders" },
          { label: "Admin Dashboard", href: "/admin/dashboard" }
        ],
        suggestions: [
          "How much total revenue do we have?",
          "Top selling products",
          "Warranty statistics"
        ]
      });
    }

    // E) Top Selling Products & Inventory Health
    if (
      q.includes("top selling") ||
      q.includes("best seller") ||
      q.includes("popular") ||
      q.includes("inventory") ||
      q.includes("stock") ||
      q.includes("product")
    ) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            orderStatus: { notIn: ["Cancelled", "CANCELLED"] }
          }
        },
        select: {
          productName: true,
          price: true,
          quantity: true
        }
      });

      const productSalesMap: Record<string, { count: number; revenue: number }> = {};
      orderItems.forEach((item: { productName?: string | null; quantity?: number | null; price?: number | null }) => {
        const name = item.productName || "Unknown Phone";
        if (!productSalesMap[name]) productSalesMap[name] = { count: 0, revenue: 0 };
        productSalesMap[name].count += item.quantity || 1;
        productSalesMap[name].revenue += (item.price || 0) * (item.quantity || 1);
      });

      const topProducts = Object.entries(productSalesMap)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5);

      const topLines = topProducts.length > 0
        ? topProducts.map(([name, data], idx) => `  ${idx + 1}. **${name}** — ${data.count} units sold (${formatINR(data.revenue)})`).join("\n")
        : "  - No completed sales recorded yet.";

      const totalCatalog = await prisma.mobileProduct.count();
      const lowStockCount = await prisma.mobileProduct.count({ where: { stock: { lte: 5 } } });
      const outOfStockCount = await prisma.mobileProduct.count({ where: { stock: 0 } });

      return NextResponse.json({
        success: true,
        answer:
          `📱 **Top-Selling Smartphones & Inventory Health:**\n\n` +
          `**Top Selling Handsets (by units sold):**\n` +
          topLines +
          `\n\n**Inventory Health:**\n` +
          `• **Total Catalog Products:** **${totalCatalog}**\n` +
          `• **Low Stock Items (≤ 5 units):** **${lowStockCount} products**\n` +
          `• **Out of Stock Items:** **${outOfStockCount} products**\n\n` +
          (lowStockCount > 0
            ? `⚠️ *Action Required: You have ${lowStockCount} items running low on stock. Check Inventory to reorder before stockouts occur.*`
            : `✅ *Inventory status is healthy with no critical low-stock bottlenecks.*`),
        links: [
          { label: "Inventory Manager", href: "/admin/inventory" },
          { label: "Product Catalog", href: "/admin/products" }
        ],
        suggestions: [
          "Total store revenue",
          "Order cancellation rate",
          "Warranty statistics"
        ]
      });
    }

    // F) Warranty Related Statistics
    if (
      q.includes("warranty") ||
      q.includes("warranties") ||
      q.includes("device shield") ||
      q.includes("imei")
    ) {
      const totalWarranties = await prisma.warranty.count();
      const activeWarranties = await prisma.warranty.count({
        where: {
          warrantyStatus: "ACTIVE",
          order: { orderStatus: { notIn: ["Cancelled", "CANCELLED"] } }
        }
      });
      const expiringSoon = await prisma.warranty.count({
        where: {
          warrantyStatus: "EXPIRING_SOON",
          order: { orderStatus: { notIn: ["Cancelled", "CANCELLED"] } }
        }
      });
      const expired = await prisma.warranty.count({
        where: { warrantyStatus: "EXPIRED" }
      });
      const cancelledWarranties = await prisma.warranty.count({
        where: { warrantyStatus: "CANCELLED" }
      });

      return NextResponse.json({
        success: true,
        answer:
          `🛡️ **Device Shield Warranty Operations:**\n\n` +
          `• **Total Warranties Logged:** **${totalWarranties} registered devices**\n` +
          `• **Active Coverage:** **${activeWarranties} devices**\n` +
          `• **Expiring Soon (Alert Window):** **${expiringSoon} devices**\n` +
          `• **Expired Warranties:** **${expired}**\n` +
          `• **Cancelled / Voided:** **${cancelledWarranties}** (tied to cancelled orders)\n\n` +
          `*Automated System Note: Expiration reminder emails are scheduled via background cron at 6 months and 1 day before expiry. Cancelled orders automatically close active warranty protection.*`,
        links: [
          { label: "View Warranties Registry", href: "/admin/warranties" },
          { label: "Email Delivery Logs", href: "/admin/email-logs" }
        ],
        suggestions: [
          "Total revenue & sales",
          "Order stats & cancellation rate",
          "Email delivery logs"
        ]
      });
    }

    // G) Email Delivery & Notification Logs
    if (
      q.includes("email") ||
      q.includes("smtp") ||
      q.includes("notifications") ||
      q.includes("delivery logs")
    ) {
      const totalEmails = await prisma.emailNotification.count();
      const sent = await prisma.emailNotification.count({ where: { status: "SENT" } });
      const failed = await prisma.emailNotification.count({ where: { status: "FAILED" } });
      const successRate = totalEmails > 0 ? ((sent / totalEmails) * 100).toFixed(1) + "%" : "100%";

      return NextResponse.json({
        success: true,
        answer:
          `📬 **Transactional Email Delivery Statistics (Gmail SMTP):**\n\n` +
          `• **Total Emails Dispatched:** **${totalEmails} events**\n` +
          `• **Delivered Successfully:** **${sent}**\n` +
          `• **Delivery Success Rate:** **${successRate}**\n` +
          `• **Failed / Pending Retry:** **${failed}**\n\n` +
          (failed > 0
            ? `⚠️ *You have ${failed} failed notifications. You can trigger instant retries with zero duplicate risk in Email Logs.*`
            : `✅ *All outgoing transactional emails (OTPs, order confirmations, and warranty reminders) are operating smoothly.*`),
        links: [
          { label: "View Email Logs", href: "/admin/email-logs" }
        ],
        suggestions: [
          "Total revenue & sales",
          "User invite stats",
          "Order stats & cancellation rate"
        ]
      });
    }

    // H) Comprehensive Executive Store Performance Summary
    const nonCancelledOrders = await prisma.order.findMany({
      where: { orderStatus: { notIn: ["Cancelled", "CANCELLED"] } },
      select: { totalAmount: true }
    });
    const totalRev = nonCancelledOrders.reduce((sum: number, o: { totalAmount: number | null }) => sum + (o.totalAmount || 0), 0);
    const totalOrdersCount = await prisma.order.count();
    const cancelledOrdersCount = await prisma.order.count({ where: { orderStatus: { in: ["Cancelled", "CANCELLED"] } } });
    const userCount = await prisma.user.count({ where: { role: "USER" } });
    const totalInvitesCount = await prisma.invitation.count();
    const acceptedInvitesCount = await prisma.invitation.count({ where: { status: "ACCEPTED" } });
    const lowStockCount = await prisma.mobileProduct.count({ where: { stock: { lte: 5 } } });

    return NextResponse.json({
      success: true,
      answer:
        `📊 **VN Mobiles Store Executive Summary:**\n\n` +
        `• **Gross Store Revenue:** **${formatINR(totalRev)}** (${nonCancelledOrders.length} active orders)\n` +
        `• **Total Orders Logged:** **${totalOrdersCount}** (Cancellation rate: **${totalOrdersCount > 0 ? ((cancelledOrdersCount / totalOrdersCount) * 100).toFixed(1) + "%" : "0%"}**)\n` +
        `• **Registered Customers:** **${userCount} users**\n` +
        `• **User Invites:** **${acceptedInvitesCount} accepted** out of **${totalInvitesCount} sent** (${totalInvitesCount > 0 ? ((acceptedInvitesCount / totalInvitesCount) * 100).toFixed(1) + "%" : "0%"})\n` +
        `• **Inventory Alerts:** **${lowStockCount} items** with ≤ 5 units in stock\n\n` +
        `What specific department would you like to explore further?`,
      links: [
        { label: "Admin Dashboard", href: "/admin/dashboard" },
        { label: "Manage Orders", href: "/admin/orders" },
        { label: "Inventory Table", href: "/admin/inventory" }
      ],
      suggestions: [
        "How much total revenue do we have?",
        "How many users accepted my invites?",
        "What are our top selling phones?",
        "Warranty statistics"
      ]
    });
  } catch (error) {
    console.error("Admin AI Agent error:", error);
    return NextResponse.json(
      { success: false, error: "Admin AI Agent error occurred" },
      { status: 500 }
    );
  }
}

