"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  RefreshCw,
  Mail,
  ExternalLink,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";

const ORDER_STATUS_OPTIONS = [
  "ALL",
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("admin", "true");

      const res = await fetch(`/api/orders?${params.toString()}`);
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

  const handleResendEmail = async (orderId: string, customerEmail: string) => {
    try {
      setResendingId(orderId);
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESEND_EMAIL" }),
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
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "ALL" && o.orderStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = o.orderNumber?.toLowerCase().includes(q);
      const matchName = o.customerName?.toLowerCase().includes(q);
      const matchEmail = o.customerEmail?.toLowerCase().includes(q);
      const matchPhone = o.customerPhone?.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchEmail && !matchPhone) return false;
    }
    return true;
  });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Order Management</h1>
              <p className="text-xs text-muted">
                View all orders, change fulfillment status, trigger automated status emails, or resend confirmation emails.
              </p>
            </div>
          </div>

          <button
            onClick={loadOrders}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID (ORD...), customer name, email, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B]"
          >
            {ORDER_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{st === "ALL" ? "All Statuses" : st}</option>
            ))}
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Order ID & Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Items</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Status & Update</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted">
                      No orders match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-mono font-bold text-[#8C6226] dark:text-[#E5CBA2] hover:underline"
                        >
                          #{o.orderNumber}
                        </Link>
                        <div className="text-[11px] text-muted">{formatDateOnly(o.createdAt)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{o.customerName}</div>
                        <div className="text-[11px] text-muted font-mono">{o.customerEmail}</div>
                        <div className="text-[11px] text-muted/80 font-mono">{o.customerPhone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-foreground/90">
                        <div className="font-medium text-foreground">{o.items?.length || 0} device(s)</div>
                        <div className="text-[11px] text-muted truncate max-w-xs">
                          {o.items?.map((i: any) => i.productName).join(", ")}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {formatINR(o.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={o.orderStatus}
                          onChange={(e) => handleQuickStatusChange(o.id, e.target.value)}
                          className="bg-tile border border-border text-xs font-semibold text-foreground rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#C9A66B]"
                        >
                          <option value="Order Confirmed">Order Confirmed</option>
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refund Initiated">Refund Initiated</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResendEmail(o.id, o.customerEmail)}
                            disabled={resendingId === o.id}
                            className="px-2.5 py-1 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Resend Order Confirmation Email"
                          >
                            <Mail className={`w-3 h-3 text-[#8C6226] dark:text-[#E5CBA2] ${resendingId === o.id ? "animate-spin" : ""}`} />
                            Resend Email
                          </button>
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="p-1.5 hover:bg-tile rounded-lg text-muted hover:text-foreground transition"
                            title="View Full Order Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
  );
}
