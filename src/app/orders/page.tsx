"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, 
  Smartphone, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  BellRing, 
  Award, 
  Search, 
  Truck, 
  Mail,
  X 
} from "lucide-react";
import { formatINR, formatDateOnly, getDaysRemaining } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function OrdersPage() {
  const { currentUser } = useApp();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeOrderTab, setActiveOrderTab] = useState<"all" | "active" | "cancelled">("all");
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Order created by mistake");
  const [cancelling, setCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${cancelModalOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: "CANCELLED",
          action: "CANCEL_ORDER",
          cancelReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelModalOrder(null);
        await loadOrders();
        alert(`Order #${cancelModalOrder.orderNumber} has been successfully cancelled and refunded!`);
      } else {
        alert(data.error || "Failed to cancel order.");
      }
    } catch (e) {
      console.error(e);
      alert("Error cancelling order.");
    } finally {
      setCancelling(false);
    }
  };

  const loadOrders = useCallback(async () => {
    if (!currentUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentUser.id) params.set("userId", currentUser.id);
      if (currentUser.email) params.set("email", currentUser.email);
      if (currentUser.phone) params.set("phone", currentUser.phone);
      if (currentUser.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com") {
        params.set("admin", "true");
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error("Failed to load orders", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSimulateExpiry = async (orderItemId: string, action: string) => {
    try {
      setActionLoading(`${orderItemId}-${action}`);
      const res = await fetch("/api/orders/simulate-expiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, action }),
      });
      const data = await res.json();
      if (data.success) {
        await loadOrders();
        alert(data.message || "Warranty simulation updated and notification email dispatched!");
      } else {
        alert(data.error || "Simulation failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error simulating expiry.");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === "EXPIRED" || daysLeft <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Protection Expired
        </span>
      );
    }
    if (status === "EXPIRING_SOON" || daysLeft <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" /> Expiring in {daysLeft} Days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Active Coverage ({daysLeft} Days Left)
      </span>
    );
  };

  const activeOrdersCount = orders.filter((o) => o.orderStatus !== "CANCELLED").length;
  const cancelledOrdersCount = orders.filter((o) => o.orderStatus === "CANCELLED").length;

  const filteredOrders = orders.filter((o) => {
    if (activeOrderTab === "active") return o.orderStatus !== "CANCELLED";
    if (activeOrderTab === "cancelled") return o.orderStatus === "CANCELLED";
    return true;
  });

  return (
    <div className="min-h-screen pb-20 bg-background text-foreground">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-muted flex items-center gap-1.5">
        <Link href="/" className="hover:text-foreground transition-colors">Your Account</Link>
        <ChevronRight className="w-3 h-3 text-muted" />
        <span className="text-foreground font-medium">Your Orders & Device Shield</span>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Title & Actions row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Your Orders</h1>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadOrders}
              className="py-2 px-3.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Guest Banner if not logged in */}
        {!currentUser && (
          <div className="bg-card p-5 rounded-2xl border border-border flex flex-wrap items-center justify-between gap-4 mb-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tile border border-border flex items-center justify-center text-foreground font-bold">
                👤
              </div>
              <div>
                <h2 className="font-bold text-sm text-foreground">You are browsing as Guest</h2>
                <p className="text-xs text-muted">Sign in to view your personal orders, tracked packages, and warranty shields.</p>
              </div>
            </div>
            <Link
              href="/login?redirect=/orders"
              className="px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border flex gap-6 text-sm mb-6">
          <button
            onClick={() => setActiveOrderTab("all")}
            className={`pb-3 text-xs md:text-sm transition-colors cursor-pointer ${
              activeOrderTab === "all"
                ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B] dark:border-[#D4B483]"
                : "text-muted hover:text-foreground"
            }`}
          >
            Orders & Warranties ({orders.length})
          </button>
          <button
            onClick={() => setActiveOrderTab("active")}
            className={`pb-3 text-xs md:text-sm transition-colors cursor-pointer ${
              activeOrderTab === "active"
                ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B] dark:border-[#D4B483]"
                : "text-muted hover:text-foreground"
            }`}
          >
            Active Orders ({activeOrdersCount})
          </button>
          <button
            onClick={() => setActiveOrderTab("cancelled")}
            className={`pb-3 text-xs md:text-sm transition-colors cursor-pointer ${
              activeOrderTab === "cancelled"
                ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B] dark:border-[#D4B483]"
                : "text-muted hover:text-foreground"
            }`}
          >
            Cancelled Orders ({cancelledOrdersCount})
          </button>
        </div>

        {/* Feature Banner */}
        <div className="bg-tile border border-border rounded-2xl p-4 mb-6 text-xs text-muted flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483] shrink-0" />
            <span>
              <strong className="text-foreground">VN Mobiles Automated Warranty Protection:</strong> You will receive automated email alerts 6 months and 1 day before your hardware warranty expires. You can simulate reminders below to test email delivery.
            </span>
          </div>
        </div>

        {/* Orders List */}
        {loading && orders.length === 0 ? (
          <div className="py-20 text-center text-muted">
            <div className="w-8 h-8 border-3 border-[#C9A66B] dark:border-[#D4B483] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted space-y-4 shadow-sm">
            <Smartphone className="w-12 h-12 mx-auto text-muted" />
            <h3 className="text-lg font-bold text-foreground">No Orders Placed Yet</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              When you purchase a smartphone from VN Mobiles, you can track delivery and device warranty expiry here.
            </p>
            <Link href="/" className="inline-flex items-center justify-center bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-2.5 px-6 text-xs font-semibold rounded-xl transition-all shadow-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                {/* Order Card Header */}
                <div className="bg-tile border-b border-border px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted">Order Placed</span>
                      <span className="font-semibold text-foreground">{formatDateOnly(order.createdAt)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted">Total</span>
                      <span className="font-bold text-foreground">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted">Ship To</span>
                      <span className="text-foreground font-medium">{order.customerName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted">Verified Mobile</span>
                      <span className="font-mono text-emerald-500 font-semibold">{order.customerPhone}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted">Order # {order.orderNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/track/${order.orderNumber}`}
                        className="bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-1.5 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Package</span>
                      </Link>

                      {order.orderStatus === "CANCELLED" ? (
                        <span className="py-1.5 px-3 text-xs font-semibold rounded-xl bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> Cancelled
                        </span>
                      ) : order.orderStatus !== "DELIVERED" ? (
                        <button
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason("Order created by mistake");
                          }}
                          className="py-1.5 px-3 text-xs font-semibold rounded-xl bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title="Cancel this order and receive full refund"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel Order</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Cancelled Order Banner */}
                {order.orderStatus === "CANCELLED" && (
                  <div className="bg-red-500/10 border-b border-red-500/20 px-5 py-3 text-xs text-red-500 flex items-start gap-2.5">
                    <div className="p-1 rounded-lg bg-red-600 text-white shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-red-500 text-sm">
                        ORDER CANCELLED & REFUND PROCESSED
                      </div>
                      <p className="mt-0.5 text-muted leading-relaxed font-sans">
                        This order was cancelled. Full refund of <strong className="text-red-500">₹{order.totalAmount?.toLocaleString("en-IN")}</strong> has been initiated and reserved smartphone stock has been restored to warehouse inventory.
                      </p>
                    </div>
                  </div>
                )}

                {/* Alteration Alert Banner */}
                {(order.adminNotes || order.orderStatus !== "CONFIRMED" || order.shippingCarrier) && (
                  <div className="bg-tile border-b border-border px-5 py-3 text-xs text-muted">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-accent text-white">
                          <BellRing className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-foreground text-sm">
                          Order Activity & Support Notice:
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                          Status: {order.orderStatus?.replace(/_/g, " ")}
                        </span>
                      </div>

                      {order.shippingCarrier && order.trackingNumber && (
                        <div className="flex items-center gap-1.5 font-mono text-xs bg-card px-2.5 py-1 rounded-xl border border-border text-foreground">
                          <Truck className="w-3.5 h-3.5 text-accent" />
                          <span><strong>{order.shippingCarrier}</strong> AWB: <strong>{order.trackingNumber}</strong></span>
                        </div>
                      )}
                    </div>

                    {order.adminNotes && (
                      <div className="mt-2 text-xs text-foreground bg-card p-2.5 rounded-xl border border-border leading-relaxed font-sans">
                        <strong className="text-foreground block mb-0.5">🔔 Latest Update from Support Desk:</strong>
                        <span>{order.adminNotes.split("|").pop()?.trim()}</span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted pt-2 border-t border-border">
                      <span>📍 Delivery Destination: <strong className="text-foreground">{order.address}, {order.city}, {order.state} - {order.pincode}</strong></span>
                    </div>
                  </div>
                )}

                {/* Items in Order */}
                <div className="p-5 space-y-6 divide-y divide-border">
                  {order.items?.map((item: any) => {
                    const daysLeft = getDaysRemaining(item.warrantyExpiryDate);
                    const isExpiringSoon = item.warrantyStatus === "EXPIRING_SOON" || (daysLeft <= 7 && daysLeft > 0);
                    const isExpired = item.warrantyStatus === "EXPIRED" || daysLeft <= 0;

                    return (
                      <div key={item.id} className="pt-6 first:pt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Item Info (5 cols) */}
                          <div className="lg:col-span-5 flex gap-4">
                            <div className="relative w-20 h-20 bg-tile border border-border p-1 shrink-0 rounded-xl overflow-hidden">
                              <Image src={item.productImageUrl} alt={item.productName} fill unoptimized className="object-contain" />
                            </div>
                            <div className="space-y-1 text-xs">
                              <h4 className="font-bold text-sm text-foreground hover:text-accent cursor-pointer leading-snug">
                                {item.productName}
                              </h4>
                              <p className="text-muted">{item.selectedStorage} • {item.selectedColor}</p>
                              <div className="font-mono text-xs text-muted bg-tile px-2 py-0.5 border border-border rounded-md inline-block font-semibold">
                                Registered IMEI: <strong className="text-foreground">{item.imeiNumber}</strong>
                              </div>
                              <div className="text-muted text-[11px] pt-1">
                                Return window closed on {formatDateOnly(new Date(new Date(item.warrantyStartDate).getTime() + 15 * 86400000))}
                              </div>
                            </div>
                          </div>

                          {/* Warranty Status & Countdown (4 cols) */}
                          <div className="lg:col-span-4 bg-tile border border-border p-4 rounded-xl space-y-2.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-accent" />
                                Device Shield Warranty
                              </span>
                              {getStatusBadge(item.warrantyStatus, daysLeft)}
                            </div>

                            <div className="flex justify-between text-muted font-mono text-[11px]">
                              <span>Valid until:</span>
                              <strong className="text-foreground">{formatDateOnly(item.warrantyExpiryDate)}</strong>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-card rounded-full h-1.5 overflow-hidden border border-border">
                              <div
                                className={`h-full ${
                                  isExpired
                                    ? "bg-red-500 w-full"
                                    : isExpiringSoon
                                    ? "bg-amber-500 w-3/4 animate-pulse"
                                    : "bg-emerald-500 w-1/4"
                                }`}
                              />
                            </div>

                            <p className="text-[11px] text-muted leading-tight">
                              {isExpired
                                ? "Warranty coverage has expired. Hardware claim window closed."
                                : isExpiringSoon
                                ? "⚠️ Warranty is expiring soon. Reminder email dispatched to buyer."
                                : "Active coverage. Automated warranty alert emails sent 6 months & 1 day before expiry."}
                            </p>
                          </div>

                          {/* Action Buttons & Warranty Email Simulation Triggers (3 cols) */}
                          <div className="lg:col-span-3 space-y-2 text-xs">
                            <span className="text-[10px] uppercase font-semibold text-muted block">
                              Test Warranty Alert Emails:
                            </span>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "SET_NEAR_EXPIRY")}
                              disabled={actionLoading !== null}
                              className="w-full py-2 px-3 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl font-medium text-left transition-all cursor-pointer text-foreground disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1.5 text-[#8C6226] dark:text-[#E5CBA2] font-semibold text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" /> Set 6-Month Expiry
                              </div>
                              <span className="text-[10px] text-muted block mt-0.5">Triggers 6-Month Email Alert</span>
                            </button>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "SET_URGENT_EXPIRY")}
                              disabled={actionLoading !== null}
                              className="w-full py-2 px-3 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl font-medium text-left transition-all cursor-pointer text-foreground disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1.5 text-[#8C6226] dark:text-[#E5CBA2] font-semibold text-xs">
                                <ShieldAlert className="w-3.5 h-3.5" /> Set 24H Expiry
                              </div>
                              <span className="text-[10px] text-muted block mt-0.5">Triggers 1-Day Urgent Email</span>
                            </button>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "EXTEND_WARRANTY")}
                              disabled={actionLoading !== null}
                              className="w-full py-2 px-3 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl font-medium text-left transition-all cursor-pointer text-foreground disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1.5 text-[#8C6226] dark:text-[#E5CBA2] font-semibold text-xs">
                                <Plus className="w-3.5 h-3.5" /> Extend +1 Year
                              </div>
                              <span className="text-[10px] text-muted block mt-0.5">Renew warranty coverage</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border">
            {/* Modal Header */}
            <div className="bg-red-600 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <X className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
                <span>Cancel Order #{cancelModalOrder.orderNumber}</span>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-muted">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Please confirm order cancellation:</p>
                <p>
                  Once cancelled, your order will be stopped immediately. A full refund of{" "}
                  <strong className="text-red-500 font-bold">₹{cancelModalOrder.totalAmount?.toLocaleString("en-IN")}</strong>{" "}
                  will be credited back, and reserved phone inventory will be returned to stock.
                </p>
              </div>

              {/* Items Summary */}
              <div className="border border-border rounded-xl p-3 bg-tile space-y-2">
                <span className="font-semibold text-[11px] uppercase text-muted block">Items to be cancelled:</span>
                {cancelModalOrder.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2 font-medium text-foreground">
                      {it.productName} ({it.selectedStorage || "Default"} • {it.selectedColor || "Standard"}) × {it.quantity || 1}
                    </span>
                    <span className="font-bold text-foreground shrink-0">₹{it.price?.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {/* Cancellation Reason Selection */}
              <div>
                <label className="font-semibold block text-foreground mb-1.5 text-xs">
                  Reason for Cancellation: <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 border border-border rounded-xl bg-tile text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Order created by mistake">Order created by mistake</option>
                  <option value="Found cheaper price elsewhere">Found cheaper price elsewhere</option>
                  <option value="Delivery date is too late / Need it sooner">Delivery date is too late / Need it sooner</option>
                  <option value="Changed mind / No longer needed">Changed mind / No longer needed</option>
                  <option value="Need to change shipping address or phone">Need to change shipping address or phone</option>
                  <option value="Incorrect phone model / color / storage selected">Incorrect phone model / color / storage selected</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div className="text-[11px] text-muted leading-tight">
                ℹ️ An instant cancellation confirmation email will be dispatched to <strong className="text-foreground">{cancelModalOrder.customerEmail || cancelModalOrder.email}</strong>.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-tile px-5 py-3 border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-semibold rounded-xl border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer transition-all"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-semibold rounded-xl bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {cancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Confirm Order Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}