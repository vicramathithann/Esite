/**
 * Utility functions for Order Status evaluation, filtering, and badge display.
 * Handles all status variations ("CANCELLED", "Cancelled", "Refund Initiated", etc.) case-insensitively.
 */

export function isOrderCancelled(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return (
    s === "CANCELLED" ||
    s === "REFUND_INITIATED" ||
    s === "REFUNDED" ||
    s === "CANCEL" ||
    s.startsWith("CANCEL")
  );
}

export function isOrderDelivered(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  return s === "DELIVERED";
}

export function canOrderBeCancelled(status?: string | null): boolean {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  if (isOrderCancelled(s)) return false;
  if (s === "DELIVERED" || s === "OUT_FOR_DELIVERY" || s === "OUT FOR DELIVERY") return false;
  return true;
}

export function getOrderStatusDisplay(status?: string | null): {
  label: string;
  badgeClass: string;
} {
  if (!status) {
    return {
      label: "Order Confirmed",
      badgeClass: "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30",
    };
  }
  if (isOrderCancelled(status)) {
    return {
      label: "Cancelled",
      badgeClass: "bg-red-500/10 text-red-500 border border-red-500/20",
    };
  }
  if (isOrderDelivered(status)) {
    return {
      label: "Delivered",
      badgeClass: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    };
  }
  return {
    label: status,
    badgeClass: "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30",
  };
}

export function normalizeAdminOrderStatus(status?: string | null): string {
  if (!status) return "Order Confirmed";
  if (isOrderCancelled(status)) return "Cancelled";
  const s = status.trim().toUpperCase();
  if (s === "CONFIRMED" || s === "ORDER CONFIRMED") return "Order Confirmed";
  if (s === "PROCESSING") return "Processing";
  if (s === "PACKED") return "Packed";
  if (s === "SHIPPED") return "Shipped";
  if (s === "OUT_FOR_DELIVERY" || s === "OUT FOR DELIVERY") return "Out for Delivery";
  if (s === "DELIVERED") return "Delivered";
  if (s === "REFUND_INITIATED" || s === "REFUND INITIATED") return "Refund Initiated";
  if (s === "REFUNDED") return "Refunded";
  return status;
}

