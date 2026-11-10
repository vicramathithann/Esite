import { formatINR, formatDateOnly } from "./formatters";
import { normalizeAdminOrderStatus } from "./orderStatus";

export type StatusTabKey =
  | "ALL"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface StatusTabConfig {
  key: StatusTabKey;
  label: string;
  badgeLabel?: string;
  matches: (status?: string | null) => boolean;
}

export const STATUS_TABS: StatusTabConfig[] = [
  {
    key: "ALL",
    label: "All",
    matches: () => true,
  },
  {
    key: "CONFIRMED",
    label: "New / Confirmed",
    matches: (s) => normalizeAdminOrderStatus(s) === "Order Confirmed",
  },
  {
    key: "PROCESSING",
    label: "Processing",
    matches: (s) => {
      const norm = normalizeAdminOrderStatus(s);
      return norm === "Processing" || norm === "Packed";
    },
  },
  {
    key: "SHIPPED",
    label: "Shipped",
    matches: (s) => normalizeAdminOrderStatus(s) === "Shipped",
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    matches: (s) => normalizeAdminOrderStatus(s) === "Out for Delivery",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    matches: (s) => normalizeAdminOrderStatus(s) === "Delivered",
  },
  {
    key: "CANCELLED",
    label: "Cancelled",
    matches: (s) => {
      const norm = normalizeAdminOrderStatus(s);
      return norm === "Cancelled";
    },
  },
  {
    key: "REFUNDED",
    label: "Returned / Refunded",
    matches: (s) => {
      const norm = normalizeAdminOrderStatus(s);
      return norm === "Refund Initiated" || norm === "Refunded";
    },
  },
];

export function isCODPayment(order: { paymentMethod?: string | null }): boolean {
  const method = (order.paymentMethod || "").toLowerCase();
  return (
    method.includes("cod") ||
    method.includes("cash on delivery") ||
    method.includes("pay on delivery")
  );
}

export function getOrderDeviceCount(order: { items?: any[] }): number {
  if (!order.items || order.items.length === 0) return 0;
  return order.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

export function getOrderBrands(order: { items?: any[] }): string[] {
  if (!order.items || order.items.length === 0) return [];
  const brands = new Set<string>();

  const KNOWN_BRANDS = [
    "Apple",
    "Samsung",
    "Google Pixel",
    "OnePlus",
    "Xiaomi",
    "Redmi",
    "Realme",
    "Vivo",
    "Oppo",
    "Motorola",
    "Nothing",
    "Sony",
    "iQOO",
  ];

  order.items.forEach((item) => {
    if (item.productBrand) {
      brands.add(item.productBrand);
      return;
    }
    const name = item.productName || "";
    for (const b of KNOWN_BRANDS) {
      if (name.toLowerCase().includes(b.toLowerCase())) {
        brands.add(b);
        return;
      }
    }
    // Fallback: first word
    const firstWord = name.split(" ")[0];
    if (firstWord && firstWord.length > 2) {
      brands.add(firstWord);
    }
  });

  return Array.from(brands);
}

export function matchesDateRange(
  dateStr: string,
  range: string,
  customFrom?: string,
  customTo?: string
): boolean {
  if (range === "all") return true;
  const date = new Date(dateStr);
  const orderTime = date.getTime();
  if (isNaN(orderTime)) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (range === "today") {
    return orderTime >= todayStart;
  }
  if (range === "7d") {
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    return orderTime >= sevenDaysAgo;
  }
  if (range === "30d") {
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
    return orderTime >= thirtyDaysAgo;
  }
  if (range === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return orderTime >= monthStart;
  }
  if (range === "custom") {
    if (customFrom) {
      const fromTime = new Date(customFrom).setHours(0, 0, 0, 0);
      if (orderTime < fromTime) return false;
    }
    if (customTo) {
      const toTime = new Date(customTo).setHours(23, 59, 59, 999);
      if (orderTime > toTime) return false;
    }
    return true;
  }
  return true;
}

export function matchesAmountRange(totalAmount: number, amountRange: string): boolean {
  if (amountRange === "all") return true;
  if (amountRange === "under20k") return totalAmount < 20000;
  if (amountRange === "20k-50k") return totalAmount >= 20000 && totalAmount <= 50000;
  if (amountRange === "above50k") return totalAmount > 50000;
  return true;
}

export type DateGroupKey = "today" | "yesterday" | "this_week" | "earlier";

export function getOrderDateGroup(dateStr: string): DateGroupKey {
  const date = new Date(dateStr);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const orderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (orderDay.getTime() === today.getTime()) return "today";
  if (orderDay.getTime() === yesterday.getTime()) return "yesterday";

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (orderDay.getTime() >= sevenDaysAgo.getTime()) return "this_week";
  return "earlier";
}

export function getStatusStyle(status?: string | null): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const norm = normalizeAdminOrderStatus(status);

  switch (norm) {
    case "Order Confirmed":
      return {
        label: "Confirmed",
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        dotClass: "bg-blue-500",
      };
    case "Processing":
    case "Packed":
      return {
        label: norm,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        dotClass: "bg-amber-500",
      };
    case "Shipped":
    case "Out for Delivery":
      return {
        label: norm,
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        dotClass: "bg-purple-500",
      };
    case "Delivered":
      return {
        label: "Delivered",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        dotClass: "bg-emerald-500",
      };
    case "Cancelled":
      return {
        label: "Cancelled",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        dotClass: "bg-rose-500",
      };
    case "Refund Initiated":
    case "Refunded":
      return {
        label: norm,
        badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
        dotClass: "bg-zinc-400",
      };
    default:
      return {
        label: norm,
        badgeClass: "bg-tile text-foreground border-border",
        dotClass: "bg-muted",
      };
  }
}

export { sanitizeForCSV } from "./csvSanitizer";
import { sanitizeForCSV } from "./csvSanitizer";

export function exportOrdersToCSV(orders: any[], filenamePrefix = "vn-mobiles-orders") {
  if (!orders || orders.length === 0) {
    alert("No orders to export.");
    return;
  }

  const headers = [
    "Order ID",
    "Date",
    "Customer Name",
    "Customer Email",
    "Customer Phone",
    "Items Summary",
    "Total Devices",
    "Total Amount (INR)",
    "Payment Method",
    "Payment Status",
    "Order Status",
    "Delivery Address",
    "City",
    "State",
    "PIN Code",
  ];

  const rows = orders.map((o) => {
    const itemsSummary = (o.items || [])
      .map((i: any) => `${i.productName} (Qty: ${i.quantity || 1}, ${formatINR(i.price || 0)})`)
      .join(" | ");

    return [
      sanitizeForCSV(o.orderNumber || o.id),
      sanitizeForCSV(formatDateOnly(o.createdAt)),
      sanitizeForCSV(o.customerName || ""),
      sanitizeForCSV(o.customerEmail || ""),
      sanitizeForCSV(o.customerPhone || ""),
      sanitizeForCSV(itemsSummary),
      sanitizeForCSV(getOrderDeviceCount(o)),
      sanitizeForCSV(o.totalAmount || 0),
      sanitizeForCSV(o.paymentMethod || ""),
      sanitizeForCSV(o.paymentStatus || ""),
      sanitizeForCSV(normalizeAdminOrderStatus(o.orderStatus)),
      sanitizeForCSV(o.address || ""),
      sanitizeForCSV(o.city || ""),
      sanitizeForCSV(o.state || ""),
      sanitizeForCSV(o.pincode || ""),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
