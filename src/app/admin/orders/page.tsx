"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Search,
  RefreshCw,
  Mail,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  XCircle,
  CheckCircle2,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Download,
  Copy,
  Check,
  Layers,
  List,
  SlidersHorizontal,
  ShieldCheck,
  CreditCard,
  Truck,
  RotateCcw,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";
import {
  isOrderCancelled,
  normalizeAdminOrderStatus,
} from "@/lib/orderStatus";
import {
  STATUS_TABS,
  StatusTabKey,
  isCODPayment,
  getOrderDeviceCount,
  getOrderBrands,
  matchesDateRange,
  matchesAmountRange,
  getOrderDateGroup,
  getStatusStyle,
  exportOrdersToCSV,
  DateGroupKey,
} from "@/lib/adminOrderHelpers";

const ORDER_STATUS_SELECT_OPTIONS = [
  "Order Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Refund Initiated",
  "Refunded",
];

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-card/60 border border-border rounded-2xl" />
        ))}
      </div>
      <div className="h-12 bg-card/60 border border-border rounded-xl" />
      <div className="h-64 bg-card/60 border border-border rounded-2xl" />
    </div>
  );
}

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingType, setResendingType] = useState<"warranty" | "confirmation" | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Filter States initialized from URL search params
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [activeTab, setActiveTab] = useState<StatusTabKey>(() => {
    const tabParam = searchParams.get("tab")?.toUpperCase() as StatusTabKey;
    const validKeys: StatusTabKey[] = [
      "ALL",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];
    return validKeys.includes(tabParam) ? tabParam : "ALL";
  });
  const [dateRange, setDateRange] = useState(() => searchParams.get("date") || "all");
  const [customFrom, setCustomFrom] = useState(() => searchParams.get("from") || "");
  const [customTo, setCustomTo] = useState(() => searchParams.get("to") || "");
  const [paymentFilter, setPaymentFilter] = useState(() => searchParams.get("payment") || "all");
  const [sizeFilter, setSizeFilter] = useState(() => searchParams.get("size") || "all");
  const [brandFilter, setBrandFilter] = useState(() => searchParams.get("brand") || "all");
  const [amountFilter, setAmountFilter] = useState(() => searchParams.get("amount") || "all");
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "newest");
  const [viewMode, setViewMode] = useState<"list" | "grouped">(() => {
    const p = searchParams.get("view");
    if (p === "grouped" || p === "list") return p;
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("admin_orders_view_mode");
      if (saved === "grouped" || saved === "list") return saved;
    }
    return "list";
  });

  // Pagination
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Grouped view collapsed sections
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Active actions dropdown menu
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Close actions menu on click outside
  useEffect(() => {
    function handleClickOutside() {
      setOpenActionMenuId(null);
    }
    if (openActionMenuId) {
      window.addEventListener("click", handleClickOutside);
      return () => window.removeEventListener("click", handleClickOutside);
    }
  }, [openActionMenuId]);

  // Sync state to URL Query String
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "ALL") params.set("tab", activeTab.toLowerCase());
    if (search.trim()) params.set("search", search.trim());
    if (dateRange !== "all") params.set("date", dateRange);
    if (dateRange === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    if (paymentFilter !== "all") params.set("payment", paymentFilter);
    if (sizeFilter !== "all") params.set("size", sizeFilter);
    if (brandFilter !== "all") params.set("brand", brandFilter);
    if (amountFilter !== "all") params.set("amount", amountFilter);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (viewMode !== "list") params.set("view", viewMode);

    const queryString = params.toString();
    const newUrl = queryString ? `/admin/orders?${queryString}` : "/admin/orders";
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [
    activeTab,
    search,
    dateRange,
    customFrom,
    customTo,
    paymentFilter,
    sizeFilter,
    brandFilter,
    amountFilter,
    sortBy,
    viewMode,
  ]);

  // Remember viewMode in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("admin_orders_view_mode", viewMode);
    }
  }, [viewMode]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [
    activeTab,
    search,
    dateRange,
    customFrom,
    customTo,
    paymentFilter,
    sizeFilter,
    brandFilter,
    amountFilter,
    sortBy,
    pageSize,
  ]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("admin", "true");

      const res = await fetch(`/api/orders?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Compute live tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<StatusTabKey, number> = {
      ALL: orders.length,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      REFUNDED: 0,
    };

    orders.forEach((o) => {
      const norm = normalizeAdminOrderStatus(o.orderStatus);
      if (norm === "Order Confirmed") counts.CONFIRMED++;
      else if (norm === "Processing" || norm === "Packed") counts.PROCESSING++;
      else if (norm === "Shipped") counts.SHIPPED++;
      else if (norm === "Out for Delivery") counts.OUT_FOR_DELIVERY++;
      else if (norm === "Delivered") counts.DELIVERED++;
      else if (norm === "Cancelled") counts.CANCELLED++;
      else if (norm === "Refund Initiated" || norm === "Refunded") counts.REFUNDED++;
    });

    return counts;
  }, [orders]);

  // Compute Summary Cards Metrics
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let todayOrdersCount = 0;
    let pendingActionCount = 0;
    let cancelledCount = 0;
    let revenueInDateRange = 0;

    orders.forEach((o) => {
      const createdAt = new Date(o.createdAt).getTime();
      const norm = normalizeAdminOrderStatus(o.orderStatus);
      const cancelled = isOrderCancelled(o.orderStatus);

      // Today's orders
      if (createdAt >= todayStart) {
        todayOrdersCount++;
      }

      // Pending action: confirmed, processing, packed (not shipped or delivered or cancelled)
      if (norm === "Order Confirmed" || norm === "Processing" || norm === "Packed") {
        pendingActionCount++;
      }

      // Cancelled or refunded
      if (cancelled || norm === "Cancelled" || norm === "Refund Initiated" || norm === "Refunded") {
        cancelledCount++;
      }

      // Revenue: non-cancelled orders that match current date filter
      if (!cancelled && norm !== "Cancelled" && norm !== "Refunded") {
        if (matchesDateRange(o.createdAt, dateRange, customFrom, customTo)) {
          revenueInDateRange += Number(o.totalAmount) || 0;
        }
      }
    });

    return {
      todayOrdersCount,
      pendingActionCount,
      cancelledCount,
      revenueInDateRange,
    };
  }, [orders, dateRange, customFrom, customTo]);

  // Extract all unique brands dynamically from all orders
  const allBrands = useMemo(() => {
    const brandSet = new Set<string>();
    orders.forEach((o) => {
      getOrderBrands(o).forEach((b) => brandSet.add(b));
    });
    return Array.from(brandSet).sort();
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Status Tab filter
      if (activeTab !== "ALL") {
        const tabConfig = STATUS_TABS.find((t) => t.key === activeTab);
        if (tabConfig && !tabConfig.matches(o.orderStatus)) {
          return false;
        }
      }

      // 2. Search query (Order number, customer name, email, phone)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchNum = o.orderNumber?.toLowerCase().includes(q);
        const matchName = o.customerName?.toLowerCase().includes(q);
        const matchEmail = o.customerEmail?.toLowerCase().includes(q);
        const matchPhone = o.customerPhone?.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchEmail && !matchPhone) return false;
      }

      // 3. Date range filter
      if (!matchesDateRange(o.createdAt, dateRange, customFrom, customTo)) {
        return false;
      }

      // 4. Payment filter
      if (paymentFilter === "paid") {
        if (isCODPayment(o)) return false;
      } else if (paymentFilter === "cod") {
        if (!isCODPayment(o)) return false;
      }

      // 5. Order size filter
      const deviceCount = getOrderDeviceCount(o);
      if (sizeFilter === "single" && deviceCount !== 1) return false;
      if (sizeFilter === "multiple" && deviceCount <= 1) return false;

      // 6. Brand filter
      if (brandFilter !== "all") {
        const brands = getOrderBrands(o);
        if (!brands.some((b) => b.toLowerCase() === brandFilter.toLowerCase())) {
          return false;
        }
      }

      // 7. Amount range filter
      if (!matchesAmountRange(Number(o.totalAmount) || 0, amountFilter)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "amount_desc") {
        return (Number(b.totalAmount) || 0) - (Number(a.totalAmount) || 0);
      }
      if (sortBy === "amount_asc") {
        return (Number(a.totalAmount) || 0) - (Number(b.totalAmount) || 0);
      }
      return 0;
    });
  }, [
    orders,
    activeTab,
    search,
    dateRange,
    customFrom,
    customTo,
    paymentFilter,
    sizeFilter,
    brandFilter,
    amountFilter,
    sortBy,
  ]);

  // Paginated orders (List view)
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    if (pageSize === 0) return filteredOrders;
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Grouped Orders (Grouped view)
  const groupedOrders = useMemo(() => {
    const groups: Record<DateGroupKey, { title: string; orders: any[]; revenue: number }> = {
      today: { title: "Today", orders: [], revenue: 0 },
      yesterday: { title: "Yesterday", orders: [], revenue: 0 },
      this_week: { title: "This Week", orders: [], revenue: 0 },
      earlier: { title: "Earlier", orders: [], revenue: 0 },
    };

    filteredOrders.forEach((o) => {
      const gKey = getOrderDateGroup(o.createdAt);
      groups[gKey].orders.push(o);
      if (!isOrderCancelled(o.orderStatus)) {
        groups[gKey].revenue += Number(o.totalAmount) || 0;
      }
    });

    return [
      { key: "today", ...groups.today },
      { key: "yesterday", ...groups.yesterday },
      { key: "this_week", ...groups.this_week },
      { key: "earlier", ...groups.earlier },
    ].filter((g) => g.orders.length > 0);
  }, [filteredOrders]);

  // Active filter count and removable chips
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    if (search.trim()) {
      chips.push({
        id: "search",
        label: `Search: "${search.trim()}"`,
        onRemove: () => setSearch(""),
      });
    }

    if (activeTab !== "ALL") {
      const tab = STATUS_TABS.find((t) => t.key === activeTab);
      chips.push({
        id: "tab",
        label: `Status: ${tab?.label || activeTab}`,
        onRemove: () => setActiveTab("ALL"),
      });
    }

    if (dateRange !== "all") {
      const dateLabels: Record<string, string> = {
        today: "Today",
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        month: "This month",
        custom: customFrom && customTo ? `${customFrom} to ${customTo}` : "Custom range",
      };
      chips.push({
        id: "date",
        label: `Date: ${dateLabels[dateRange] || dateRange}`,
        onRemove: () => {
          setDateRange("all");
          setCustomFrom("");
          setCustomTo("");
        },
      });
    }

    if (paymentFilter !== "all") {
      chips.push({
        id: "payment",
        label: `Payment: ${paymentFilter === "paid" ? "Paid (Online)" : "COD"}`,
        onRemove: () => setPaymentFilter("all"),
      });
    }

    if (sizeFilter !== "all") {
      chips.push({
        id: "size",
        label: `Size: ${sizeFilter === "single" ? "Single Device" : "Multiple Devices"}`,
        onRemove: () => setSizeFilter("all"),
      });
    }

    if (brandFilter !== "all") {
      chips.push({
        id: "brand",
        label: `Brand: ${brandFilter}`,
        onRemove: () => setBrandFilter("all"),
      });
    }

    if (amountFilter !== "all") {
      const amountLabels: Record<string, string> = {
        under20k: "Under ₹20,000",
        "20k-50k": "₹20K - ₹50K",
        above50k: "Above ₹50,000",
      };
      chips.push({
        id: "amount",
        label: `Amount: ${amountLabels[amountFilter] || amountFilter}`,
        onRemove: () => setAmountFilter("all"),
      });
    }

    return chips;
  }, [
    search,
    activeTab,
    dateRange,
    customFrom,
    customTo,
    paymentFilter,
    sizeFilter,
    brandFilter,
    amountFilter,
  ]);

  const handleClearAllFilters = () => {
    setSearch("");
    setActiveTab("ALL");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
    setPaymentFilter("all");
    setSizeFilter("all");
    setBrandFilter("all");
    setAmountFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Quick Status Change with automated email dispatch
  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await loadOrders();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Error updating order status");
    }
  };

  // Resend Warranty Certificate Email
  const handleResendWarranty = async (orderId: string, customerEmail: string) => {
    try {
      setResendingId(orderId);
      setResendingType("warranty");
      const res = await fetch("/api/admin/send-certificate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Warranty certificate email sent to ${customerEmail}!`);
        await loadOrders();
      } else {
        alert(data.error || "Failed to send warranty certificate email.");
      }
    } catch {
      alert("Error contacting server.");
    } finally {
      setResendingId(null);
      setResendingType(null);
    }
  };

  // Resend Order Confirmation Email
  const handleResendConfirmation = async (orderId: string, customerEmail: string) => {
    try {
      setResendingId(orderId);
      setResendingType("confirmation");
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESEND_CONFIRMATION" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Order confirmation email resent to ${customerEmail}!`);
        await loadOrders();
      } else {
        alert(data.error || "Failed to resend confirmation email.");
      }
    } catch {
      alert("Error contacting server.");
    } finally {
      setResendingId(null);
      setResendingType(null);
    }
  };

  // Copy Order ID
  const handleCopyOrderId = (orderNumber: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber);
      setCopiedOrderId(orderNumber);
      setTimeout(() => setCopiedOrderId(null), 2000);
    }
  };

  // Checkbox selection
  const handleSelectAllOnPage = () => {
    const pageOrderIds = paginatedOrders.map((o) => o.id);
    const allSelected = pageOrderIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageOrderIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageOrderIds])));
    }
  };

  const handleToggleSelectRow = (orderId: string) => {
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Bulk Actions
  const handleBulkStatusChange = async (targetStatus: "Shipped" | "Delivered") => {
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    if (selectedOrders.length === 0) return;

    // Filter out cancelled orders (rule: respect cancelled order protection)
    const validOrders = selectedOrders.filter((o) => !isOrderCancelled(o.orderStatus));
    const skippedCount = selectedOrders.length - validOrders.length;

    if (validOrders.length === 0) {
      alert("All selected orders are cancelled or refunded and cannot be modified.");
      return;
    }

    const confirmMsg =
      skippedCount > 0
        ? `Are you sure you want to mark ${validOrders.length} order(s) as ${targetStatus}?\n(${skippedCount} cancelled order(s) will be skipped)`
        : `Are you sure you want to mark ${validOrders.length} order(s) as ${targetStatus}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setBulkActionLoading(true);
      for (const order of validOrders) {
        await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderStatus: targetStatus }),
        });
      }
      setSelectedIds([]);
      await loadOrders();
      alert(`Successfully updated ${validOrders.length} order(s) to ${targetStatus}!`);
    } catch {
      alert("Error updating some orders during bulk operation.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = () => {
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    if (selectedOrders.length === 0) return;
    exportOrdersToCSV(selectedOrders, "vn-mobiles-selected-orders");
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2] shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Order Management</h1>
            <p className="text-xs text-muted">
              Classify orders, filter by status and date, track payments, or dispatch notification emails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Group View Toggle */}
          <div className="inline-flex items-center bg-tile border border-border rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Standard list view"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === "grouped"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
              title="Grouped chronological view"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
          </div>

          {/* Export CSV button */}
          <button
            type="button"
            onClick={() => exportOrdersToCSV(filteredOrders)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-tile hover:bg-tile/80 border border-border text-foreground rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
            title="Export filtered orders to CSV"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Export CSV</span>
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={loadOrders}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (One row above tabs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Today's Orders */}
        <button
          type="button"
          onClick={() => {
            setDateRange("today");
            setActiveTab("ALL");
          }}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            dateRange === "today"
              ? "bg-[#C9A66B]/10 border-[#C9A66B] ring-2 ring-[#C9A66B]/20"
              : "bg-card border-border hover:border-[#C9A66B]/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Today&apos;s Orders</span>
            <div className="w-8 h-8 rounded-xl bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {summaryMetrics.todayOrdersCount}
          </div>
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <span>Placed today</span>
            <span className="text-[#C9A66B] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </button>

        {/* Card 2: Pending Action (Confirmed / Processing / Packed) */}
        <button
          type="button"
          onClick={() => setActiveTab("CONFIRMED")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            activeTab === "CONFIRMED" || activeTab === "PROCESSING"
              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20"
              : "bg-card border-border hover:border-amber-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Pending Action</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {summaryMetrics.pendingActionCount}
          </div>
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <span>Awaiting fulfillment</span>
            <span className="text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </button>

        {/* Card 3: Revenue (Non-cancelled orders in selected range) */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card text-left transition shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">
              Revenue ({dateRange === "today" ? "Today" : dateRange === "7d" ? "7 Days" : dateRange === "30d" ? "30 Days" : dateRange === "month" ? "This Month" : "All Time"})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight font-mono">
            {formatINR(summaryMetrics.revenueInDateRange)}
          </div>
          <div className="text-[11px] text-muted mt-1">Non-cancelled orders</div>
        </div>

        {/* Card 4: Cancelled */}
        <button
          type="button"
          onClick={() => setActiveTab("CANCELLED")}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-xs ${
            activeTab === "CANCELLED"
              ? "bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20"
              : "bg-card border-border hover:border-rose-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Cancelled</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {summaryMetrics.cancelledCount}
          </div>
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <span>Cancelled & refunded</span>
            <span className="text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </button>
      </div>

      {/* 3. STATUS TABS WITH LIVE COUNTS */}
      <div className="relative border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 pt-1">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#C9A66B] text-[#FFFCFA] shadow-xs"
                    : "bg-card hover:bg-tile border border-border text-muted hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-black/20 text-[#FFFCFA]"
                      : "bg-tile text-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. FILTER BAR */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors duration-200">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID (ORD...), customer name, email, phone..."
              className="w-full pl-10 pr-9 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B] transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-muted hover:text-foreground cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex items-center gap-2 flex-wrap">
            {/* Date Range Dropdown */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Date: Today</option>
              <option value="7d">Date: Last 7 Days</option>
              <option value="30d">Date: Last 30 Days</option>
              <option value="month">Date: This Month</option>
              <option value="custom">Date: Custom Range...</option>
            </select>

            {/* Payment Dropdown */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
            >
              <option value="all">Payment: All</option>
              <option value="paid">Payment: Paid (Online)</option>
              <option value="cod">Payment: COD</option>
            </select>

            {/* Order Size Dropdown */}
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
            >
              <option value="all">Devices: All Sizes</option>
              <option value="single">Single Device (1)</option>
              <option value="multiple">Multiple Devices (2+)</option>
            </select>

            {/* Brand Dropdown */}
            {allBrands.length > 0 && (
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
              >
                <option value="all">Brand: All Brands</option>
                {allBrands.map((b) => (
                  <option key={b} value={b}>
                    Brand: {b}
                  </option>
                ))}
              </select>
            )}

            {/* Amount Range Dropdown */}
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
            >
              <option value="all">Amount: All</option>
              <option value="under20k">Under ₹20,000</option>
              <option value="20k-50k">₹20K - ₹50K</option>
              <option value="above50k">Above ₹50,000</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-tile border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B] cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="amount_desc">Sort: Amount (High to Low)</option>
              <option value="amount_asc">Sort: Amount (Low to High)</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers (conditional) */}
        {dateRange === "custom" && (
          <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
            <span className="text-xs text-muted font-medium">Custom Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted">From:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-tile border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-[#C9A66B]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted">To:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-tile border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-[#C9A66B]"
              />
            </div>
          </div>
        )}

        {/* Removable Active Filter Chips & Clear All */}
        {activeChips.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
            <span className="text-[11px] text-muted font-medium">Active Filters:</span>
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A66B]/10 border border-[#C9A66B]/30 text-[#8C6226] dark:text-[#E5CBA2] text-[11px] font-medium"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="hover:text-foreground cursor-pointer rounded-full p-0.5"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 5. BULK ACTIONS FLOATING/STICKY BAR (Active when orders selected) */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-30 flex items-center justify-between gap-3 bg-[#111827] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-white/10 animate-fade-in flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-6 h-6 rounded-full bg-[#C9A66B] text-black font-bold flex items-center justify-center text-[11px]">
              {selectedIds.length}
            </span>
            <span>order(s) selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusChange("Shipped")}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Mark as Shipped</span>
            </button>

            <button
              type="button"
              disabled={bulkActionLoading}
              onClick={() => handleBulkStatusChange("Delivered")}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark as Delivered</span>
            </button>

            <button
              type="button"
              onClick={handleBulkExport}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-white/70 hover:text-white underline cursor-pointer ml-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 6. ORDERS TABLE / GROUPED VIEW */}
      {loading ? (
        <OrdersLoadingSkeleton />
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-xs transition-colors duration-200">
          <div className="w-12 h-12 rounded-2xl bg-tile border border-border flex items-center justify-center text-muted mx-auto mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No orders match your filters</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            Try adjusting your search query, status tab, or date range to find what you are looking for.
          </p>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="px-4 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === "grouped" ? (
        /* Grouped Chronological View */
        <div className="space-y-4">
          {groupedOrders.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.key]);

            return (
              <div
                key={group.key}
                className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200"
              >
                {/* Collapsible Section Header */}
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-tile/70 hover:bg-tile/90 border-b border-border text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="text-muted">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-bold text-sm text-foreground">{group.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-tile border border-border text-[11px] font-semibold text-muted">
                      {group.orders.length} order{group.orders.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="text-xs font-mono font-bold text-foreground">
                    Total: {formatINR(group.revenue)}
                  </div>
                </button>

                {/* Section Content */}
                {!isCollapsed && (
                  <div className="p-0">
                    <OrdersTableRenderer
                      orders={group.orders}
                      selectedIds={selectedIds}
                      onToggleSelectRow={handleToggleSelectRow}
                      onSelectAll={handleSelectAllOnPage}
                      onQuickStatusChange={handleQuickStatusChange}
                      onResendWarranty={handleResendWarranty}
                      onResendConfirmation={handleResendConfirmation}
                      onCopyOrderId={handleCopyOrderId}
                      copiedOrderId={copiedOrderId}
                      resendingId={resendingId}
                      resendingType={resendingType}
                      openActionMenuId={openActionMenuId}
                      setOpenActionMenuId={setOpenActionMenuId}
                      expandedItemId={expandedItemId}
                      setExpandedItemId={setExpandedItemId}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Standard List View with Pagination */
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
            <OrdersTableRenderer
              orders={paginatedOrders}
              selectedIds={selectedIds}
              onToggleSelectRow={handleToggleSelectRow}
              onSelectAll={handleSelectAllOnPage}
              onQuickStatusChange={handleQuickStatusChange}
              onResendWarranty={handleResendWarranty}
              onResendConfirmation={handleResendConfirmation}
              onCopyOrderId={handleCopyOrderId}
              copiedOrderId={copiedOrderId}
              resendingId={resendingId}
              resendingType={resendingType}
              openActionMenuId={openActionMenuId}
              setOpenActionMenuId={setOpenActionMenuId}
              expandedItemId={expandedItemId}
              setExpandedItemId={setExpandedItemId}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-tile/40 text-xs text-muted">
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-tile border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:border-[#C9A66B]"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={0}>All orders</option>
                </select>
                <span>
                  Showing {pageSize === 0 ? 1 : Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)} to{" "}
                  {pageSize === 0 ? filteredOrders.length : Math.min(filteredOrders.length, currentPage * pageSize)} of{" "}
                  {filteredOrders.length} orders
                </span>
              </div>

              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-border bg-tile hover:bg-tile/80 disabled:opacity-40 text-foreground cursor-pointer disabled:cursor-not-allowed transition"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <React.Fragment key={p}>
                          {prev && p - prev > 1 && <span className="px-1 text-muted">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              currentPage === p
                                ? "bg-[#C9A66B] text-white font-bold"
                                : "hover:bg-tile text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-border bg-tile hover:bg-tile/80 disabled:opacity-40 text-foreground cursor-pointer disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

interface OrdersTableRendererProps {
  orders: any[];
  selectedIds: string[];
  onToggleSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onQuickStatusChange: (id: string, newStatus: string) => void;
  onResendWarranty: (id: string, email: string) => void;
  onResendConfirmation: (id: string, email: string) => void;
  onCopyOrderId: (orderNumber: string) => void;
  copiedOrderId: string | null;
  resendingId: string | null;
  resendingType: "warranty" | "confirmation" | null;
  openActionMenuId: string | null;
  setOpenActionMenuId: (id: string | null) => void;
  expandedItemId: string | null;
  setExpandedItemId: (id: string | null | ((prev: string | null) => string | null)) => void;
}

function OrdersTableRenderer({
  orders,
  selectedIds,
  onToggleSelectRow,
  onSelectAll,
  onQuickStatusChange,
  onResendWarranty,
  onResendConfirmation,
  onCopyOrderId,
  copiedOrderId,
  resendingId,
  resendingType,
  openActionMenuId,
  setOpenActionMenuId,
  expandedItemId,
  setExpandedItemId,
}: OrdersTableRendererProps) {
  const allSelectedOnPage = orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const someSelectedOnPage = orders.some((o) => selectedIds.includes(o.id)) && !allSelectedOnPage;

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelectedOnPage}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelectedOnPage;
                  }}
                  onChange={onSelectAll}
                  className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B] cursor-pointer"
                  title="Select all on this page"
                />
              </th>
              <th className="py-3.5 px-4">Order ID & Date</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Items</th>
              <th className="py-3.5 px-4">Amount & Payment</th>
              <th className="py-3.5 px-4">Status & Update</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => {
              const isSelected = selectedIds.includes(o.id);
              const isCOD = isCODPayment(o);
              const statusStyle = getStatusStyle(o.orderStatus);
              const items = o.items || [];
              const firstItem = items[0];
              const extraCount = items.length - 1;
              const isExpanded = expandedItemId === o.id;

              return (
                <React.Fragment key={o.id}>
                  <tr
                    className={`hover:bg-tile/50 transition ${
                      isSelected ? "bg-[#C9A66B]/5" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectRow(o.id)}
                        className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B] cursor-pointer"
                      />
                    </td>

                    {/* Order ID & Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono font-bold text-[#8C6226] dark:text-[#E5CBA2] hover:underline"
                        >
                          #{o.orderNumber || o.id}
                        </Link>
                        <button
                          type="button"
                          onClick={() => onCopyOrderId(o.orderNumber || o.id)}
                          className="p-1 hover:bg-tile text-muted hover:text-foreground rounded transition cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === (o.orderNumber || o.id) ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-muted">{formatDateOnly(o.createdAt)}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{o.customerName}</div>
                      <div className="text-[11px] text-muted font-mono truncate max-w-[180px]">
                        {o.customerEmail}
                      </div>
                      <div className="text-[11px] text-muted/80 font-mono">{o.customerPhone}</div>
                    </td>

                    {/* Items */}
                    <td className="py-3.5 px-4 text-foreground/90">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {firstItem?.productName || `${items.length} device(s)`}
                        </span>
                        {extraCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : o.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-tile border border-border text-[10px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:bg-tile/80 cursor-pointer"
                            title="Toggle full item breakdown"
                          >
                            <span>+{extraCount} more</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-muted">
                        Total {getOrderDeviceCount(o)} unit{getOrderDeviceCount(o) === 1 ? "" : "s"}
                      </div>
                    </td>

                    {/* Amount & Payment */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-foreground">
                        {formatINR(o.totalAmount)}
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isCOD
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isCOD ? "COD" : "Paid"}
                        </span>
                      </div>
                    </td>

                    {/* Status & Colored Dropdown Update */}
                    <td className="py-3.5 px-4">
                      <div className="relative inline-block">
                        <select
                          value={normalizeAdminOrderStatus(o.orderStatus)}
                          onChange={(e) => onQuickStatusChange(o.id, e.target.value)}
                          className={`appearance-none pl-3 pr-7 py-1 text-xs font-semibold rounded-lg border focus:outline-none transition cursor-pointer shadow-2xs ${statusStyle.badgeClass}`}
                        >
                          {ORDER_STATUS_SELECT_OPTIONS.map((st) => (
                            <option
                              key={st}
                              value={st}
                              className="bg-card text-foreground font-medium py-1"
                            >
                              {st}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>

                    {/* Actions Menu (Three Dots) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuId(openActionMenuId === o.id ? null : o.id);
                          }}
                          className="p-1.5 hover:bg-tile rounded-lg text-muted hover:text-foreground transition cursor-pointer"
                          title="More actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu Popover */}
                        {openActionMenuId === o.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 mt-1 w-52 bg-card border border-border rounded-xl shadow-xl z-20 py-1.5 text-xs animate-scale-in"
                          >
                            <Link
                              href={`/admin/orders/${o.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-tile transition"
                              onClick={() => setOpenActionMenuId(null)}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-muted" />
                              <span>View Full Details</span>
                            </Link>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onResendWarranty(o.id, o.customerEmail);
                              }}
                              disabled={resendingId === o.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-tile transition text-left cursor-pointer"
                            >
                              <ShieldCheck
                                className={`w-3.5 h-3.5 text-muted ${
                                  resendingId === o.id && resendingType === "warranty"
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              <span>Send Certificate Email</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onResendConfirmation(o.id, o.customerEmail);
                              }}
                              disabled={resendingId === o.id}
                              className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-tile transition text-left cursor-pointer"
                            >
                              <Mail
                                className={`w-3.5 h-3.5 text-muted ${
                                  resendingId === o.id && resendingType === "confirmation"
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              <span>Resend Confirmation</span>
                            </button>

                            <div className="border-t border-border my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                onCopyOrderId(o.orderNumber || o.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-muted hover:text-foreground hover:bg-tile transition text-left cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-muted" />
                              <span>Copy Order ID</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Items Drawer Row */}
                  {isExpanded && extraCount > 0 && (
                    <tr className="bg-tile/30">
                      <td colSpan={7} className="px-6 py-3 border-t border-border/50">
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                            All Devices in this Order ({items.length}):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {items.map((item: any, iIdx: number) => (
                              <div
                                key={item.id || iIdx}
                                className="p-2.5 rounded-xl bg-card border border-border text-xs space-y-0.5"
                              >
                                <div className="font-semibold text-foreground truncate">
                                  {item.productName}
                                </div>
                                <div className="text-[11px] text-muted flex items-center justify-between">
                                  <span>
                                    {item.selectedStorage || ""} {item.selectedColor ? `• ${item.selectedColor}` : ""}
                                  </span>
                                  <span className="font-mono font-medium">
                                    Qty: {item.quantity || 1} × {formatINR(item.price || 0)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View (< md) */}
      <div className="md:hidden divide-y divide-border">
        {orders.map((o) => {
          const isSelected = selectedIds.includes(o.id);
          const isCOD = isCODPayment(o);
          const statusStyle = getStatusStyle(o.orderStatus);
          const items = o.items || [];
          const firstItem = items[0];
          const extraCount = items.length - 1;

          return (
            <div
              key={o.id}
              className={`p-4 space-y-3 transition ${
                isSelected ? "bg-[#C9A66B]/5" : "hover:bg-tile/30"
              }`}
            >
              {/* Header row: Checkbox, Order ID, and Actions */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectRow(o.id)}
                    className="rounded border-border text-[#C9A66B] focus:ring-[#C9A66B] cursor-pointer"
                  />
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono font-bold text-sm text-[#8C6226] dark:text-[#E5CBA2]"
                  >
                    #{o.orderNumber || o.id}
                  </Link>
                  <button
                    type="button"
                    onClick={() => onCopyOrderId(o.orderNumber || o.id)}
                    className="p-1 hover:bg-tile text-muted rounded cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copiedOrderId === (o.orderNumber || o.id) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-muted">{formatDateOnly(o.createdAt)}</div>
              </div>

              {/* Customer Info */}
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-foreground">{o.customerName}</div>
                <div className="text-[11px] text-muted font-mono">{o.customerEmail}</div>
                <div className="text-[11px] text-muted/80 font-mono">{o.customerPhone}</div>
              </div>

              {/* Items & Payment Amount */}
              <div className="flex items-start justify-between gap-2 text-xs pt-1 border-t border-border/50">
                <div className="flex-1">
                  <div className="font-medium text-foreground truncate">
                    {firstItem?.productName || `${items.length} device(s)`}
                  </div>
                  {extraCount > 0 && (
                    <div className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2]">
                      +{extraCount} additional device{extraCount === 1 ? "" : "s"}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-foreground">
                    {formatINR(o.totalAmount)}
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isCOD
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {isCOD ? "COD" : "Paid"}
                  </span>
                </div>
              </div>

              {/* Status Update & Quick Action Links */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                <div className="relative">
                  <select
                    value={normalizeAdminOrderStatus(o.orderStatus)}
                    onChange={(e) => onQuickStatusChange(o.id, e.target.value)}
                    className={`appearance-none pl-3 pr-7 py-1 text-xs font-semibold rounded-lg border focus:outline-none cursor-pointer ${statusStyle.badgeClass}`}
                  >
                    {ORDER_STATUS_SELECT_OPTIONS.map((st) => (
                      <option
                        key={st}
                        value={st}
                        className="bg-card text-foreground font-medium py-1"
                      >
                        {st}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onResendWarranty(o.id, o.customerEmail)}
                    disabled={resendingId === o.id}
                    className="p-1.5 rounded-lg border border-border hover:bg-tile text-muted hover:text-foreground cursor-pointer"
                    title="Send Certificate Email"
                  >
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        resendingId === o.id && resendingType === "warranty" ? "animate-spin" : ""
                      }`}
                    />
                  </button>

                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="p-1.5 rounded-lg border border-border hover:bg-tile text-muted hover:text-foreground"
                    title="View Full Order Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingSkeleton />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
