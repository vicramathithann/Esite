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
  User,
  Mail,
  Phone,
  LogOut,
  Sparkles,
  ExternalLink,
  ShoppingBag,
  X
} from "lucide-react";
import { formatINR, formatDateOnly, getDaysRemaining } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function AccountPage() {
  const { currentUser, logout, setIsCartOpen } = useApp();

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
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#cc0c39] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Protection Expired
        </span>
      );
    }
    if (status === "EXPIRING_SOON" || daysLeft <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#b12704] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-[#e67a00]" /> Expiring in {daysLeft} Days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#007600] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5 text-[#007600]" /> Active Coverage ({daysLeft} Days Left)
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-20 bg-[#eaeded]">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-3 text-xs text-gray-500 flex items-center gap-1">
        <Link href="/" className="text-[#007185] hover:underline">Storefront</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        <span className="text-gray-900 font-medium">Customer Account & Orders</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* User Profile Hero Banner */}
        {currentUser ? (
          <div className="bg-gradient-to-r from-[#131921] via-[#232f3e] to-[#131921] rounded-lg p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#febd69] to-[#f3a847] text-[#131921] flex items-center justify-center text-2xl font-black shadow-md">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{currentUser.name}</h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {currentUser.role === "ADMIN" ? "👑 Administrator" : "✓ Verified Customer"}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-1 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-[#febd69]" /> {currentUser.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#febd69]" /> {currentUser.phone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-md flex items-center gap-1.5 shadow"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Control Center</span>
                </Link>
              )}
              <Link
                href="/"
                className="px-3 py-1.5 bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 text-[#FFF8F0] text-xs font-semibold rounded-md border border-[#C9A66B]/40"
              >
                Shop Mobiles
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-[#C9A66B]/15 hover:bg-[#C9A66B]/25 active:bg-[#A67C3D] text-[#FFF8F0] border border-[#C9A66B]/30 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-lg border border-gray-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-gray-400" />
              <div>
                <h2 className="font-bold text-sm text-[#0f1111]">You are browsing as Guest</h2>
                <p className="text-xs text-gray-500">Sign in to view your orders, tracked packages, and warranty shields.</p>
              </div>
            </div>
            <Link
              href="/login?redirect=/account"
              className="px-4 py-2 btn-amazon-yellow text-xs font-bold rounded-md"
            >
              Sign In to Your Account
            </Link>
          </div>
        )}

        {/* Title & Refresh row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-xl font-bold text-[#0f1111]">
              {currentUser ? `${currentUser.name}'s Orders & Warranties` : "Your Orders & Warranties"}
            </h2>
            <p className="text-xs text-gray-500">
              Registered IMEIs, 1-Year Device Shield warranty, and shipment tracking
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              className="p-1.5 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm text-[#8C6226] dark:text-[#E5CBA2] text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Amazon Tabs */}
        {(() => {
          const activeOrdersCount = orders.filter((o) => o.orderStatus !== "CANCELLED").length;
          const cancelledOrdersCount = orders.filter((o) => o.orderStatus === "CANCELLED").length;
          const filteredOrders = orders.filter((o) => {
            if (activeOrderTab === "active") return o.orderStatus !== "CANCELLED";
            if (activeOrderTab === "cancelled") return o.orderStatus === "CANCELLED";
            return true;
          });

          return (
            <>
              <div className="border-b border-gray-300 flex gap-6 text-sm mb-6">
                <button
                  onClick={() => setActiveOrderTab("all")}
                  className={`pb-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                    activeOrderTab === "all"
                      ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                      : "text-gray-600 hover:text-[#0f1111]"
                  }`}
                >
                  Orders & Warranties ({orders.length})
                </button>
                <button
                  onClick={() => setActiveOrderTab("active")}
                  className={`pb-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                    activeOrderTab === "active"
                      ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                      : "text-gray-600 hover:text-[#0f1111]"
                  }`}
                >
                  Active Orders ({activeOrdersCount})
                </button>
                <button
                  onClick={() => setActiveOrderTab("cancelled")}
                  className={`pb-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                    activeOrderTab === "cancelled"
                      ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                      : "text-gray-600 hover:text-[#0f1111]"
                  }`}
                >
                  Cancelled Orders ({cancelledOrdersCount})
                </button>
              </div>

              {/* Feature Banner */}
              <div className="bg-[#fef8f2] border border-[#fbd8b4] rounded-sm p-4 mb-6 text-xs text-[#703800] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-[#e67a00] shrink-0" />
                  <span>
                    <strong>VN Mobiles Automated Warranty Protection:</strong> You will receive automated email alerts 6 months and 1 day before your hardware warranty expires.
                  </span>
                </div>
              </div>

              {/* Orders List */}
              {loading && orders.length === 0 ? (
                <div className="py-20 text-center text-gray-600">
                  <div className="w-8 h-8 border-3 border-[#e77600] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading your orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-sm p-12 text-center text-gray-600 space-y-3">
                  <Smartphone className="w-12 h-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-bold text-[#0f1111]">No Orders Placed Yet</h3>
                  <p className="text-xs text-gray-500">
                    When you purchase a smartphone from VN Mobiles, you can track delivery and device warranty expiry here.
                  </p>
                  <Link href="/" className="btn-amazon-yellow py-2 px-6 text-xs font-bold inline-block">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-xs">
                      {/* Amazon Order Card Header */}
                      <div className="bg-[#f0f2f2] border-b border-gray-200 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600">
                        <div className="flex flex-wrap items-center gap-6">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500">Order Placed</span>
                            <span className="font-medium text-[#0f1111]">{formatDateOnly(order.createdAt)}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500">Total</span>
                            <span className="font-bold text-[#0f1111]">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500">Ship To</span>
                            <span className="text-[#007185] hover:underline cursor-pointer">{order.customerName}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500">Verified Mobile</span>
                            <span className="font-mono text-emerald-700 font-bold">{order.customerPhone}</span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500">Order # {order.orderNumber}</span>
                            <span className="text-[#007185] hover:underline cursor-pointer text-xs">View invoice</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/track/${order.orderNumber}`}
                              className="btn-amazon-yellow py-1 px-3 text-xs font-bold rounded-sm flex items-center gap-1 shadow-2xs"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Track Package</span>
                            </Link>

                            {order.orderStatus === "CANCELLED" ? (
                              <span className="py-1 px-2.5 text-xs font-bold rounded-sm bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                                <X className="w-3.5 h-3.5 text-red-600" /> Cancelled
                              </span>
                            ) : order.orderStatus !== "DELIVERED" ? (
                              <button
                                onClick={() => {
                                  setCancelModalOrder(order);
                                  setCancelReason("Order created by mistake");
                                }}
                                className="py-1 px-2.5 text-xs font-bold rounded-sm bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                title="Cancel this order and receive full refund"
                              >
                                <X className="w-3.5 h-3.5 text-[#C9A66B]" />
                                <span>Cancel Order</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Cancelled Order Banner */}
                      {order.orderStatus === "CANCELLED" && (
                        <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-xs text-red-900 flex items-start gap-2.5">
                          <div className="p-1 rounded bg-red-600 text-white shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-red-700 text-sm">
                              ORDER CANCELLED & REFUND PROCESSED
                            </div>
                            <p className="mt-0.5 text-red-800 leading-relaxed font-sans">
                              This order was cancelled. Full refund of <strong>₹{order.totalAmount?.toLocaleString("en-IN")}</strong> has been initiated and reserved smartphone stock has been restored to warehouse inventory.
                            </p>
                          </div>
                        </div>
                      )}

                {/* Admin / Support Alteration Alert Banner */}
                {(order.adminNotes || order.orderStatus !== "CONFIRMED" || order.shippingCarrier) && (
                  <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-[#e67a00] text-white">
                          <BellRing className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-bold text-[#b12704] text-sm">
                          Order Activity & Support Notice:
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#febd69] text-[#131921]">
                          Status: {order.orderStatus?.replace(/_/g, " ")}
                        </span>
                      </div>

                      {order.shippingCarrier && order.trackingNumber && (
                        <div className="flex items-center gap-1.5 font-mono text-xs bg-white px-2.5 py-1 rounded border border-amber-200">
                          <Truck className="w-3.5 h-3.5 text-[#007185]" />
                          <span><strong>{order.shippingCarrier}</strong> AWB: <strong>{order.trackingNumber}</strong></span>
                        </div>
                      )}
                    </div>

                    {order.adminNotes && (
                      <div className="mt-2 text-xs text-gray-800 bg-white/80 p-2 rounded border border-amber-200/60 leading-relaxed font-sans">
                        <strong className="text-[#0f1111] block mb-0.5">🔔 Latest Update from Support Desk:</strong>
                        <span>{order.adminNotes.split("|").pop()?.trim()}</span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 pt-1.5 border-t border-amber-200/50">
                      <span>📍 Delivery Destination: <strong>{order.address}, {order.city}, {order.state} - {order.pincode}</strong></span>
                      <span className="text-gray-500 font-medium">🛡️ Protected by VN Shield Warranty</span>
                    </div>
                  </div>
                )}

                {/* Items in Order */}
                <div className="p-5 space-y-6 divide-y divide-gray-200">
                  {order.items?.map((item: any) => {
                    const daysLeft = getDaysRemaining(item.warrantyExpiryDate);
                    const isExpiringSoon = item.warrantyStatus === "EXPIRING_SOON" || (daysLeft <= 7 && daysLeft > 0);
                    const isExpired = item.warrantyStatus === "EXPIRED" || daysLeft <= 0;

                    return (
                      <div key={item.id} className="pt-6 first:pt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                          {/* Item Info (5 cols) */}
                          <div className="lg:col-span-5 flex gap-4">
                            <div className="relative w-20 h-20 bg-white border border-gray-200 p-1 shrink-0 rounded-sm">
                              <Image src={item.productImageUrl} alt={item.productName} fill unoptimized className="object-contain" />
                            </div>
                            <div className="space-y-1 text-xs">
                              <h4 className="font-bold text-sm text-[#007185] hover:underline cursor-pointer leading-snug">
                                {item.productName}
                              </h4>
                              <p className="text-gray-500">{item.selectedStorage} • {item.selectedColor}</p>
                              <div className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 border border-gray-200 inline-block font-semibold">
                                Registered IMEI: <strong className="text-[#0f1111]">{item.imeiNumber}</strong>
                              </div>
                              <div className="text-gray-500 text-[11px] pt-1">
                                Return window closed on {formatDateOnly(new Date(new Date(item.warrantyStartDate).getTime() + 15 * 86400000))}
                              </div>
                            </div>
                          </div>

                          {/* Warranty Status & Countdown (4 cols) */}
                          <div className="lg:col-span-4 bg-gray-50 border border-gray-200 p-3.5 rounded-sm space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-[#0f1111] flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-[#e67a00]" />
                                Device Shield Warranty
                              </span>
                              {getStatusBadge(item.warrantyStatus, daysLeft)}
                            </div>

                            <div className="flex justify-between text-gray-600 font-mono text-[11px]">
                              <span>Valid until:</span>
                              <strong className="text-gray-900">{formatDateOnly(item.warrantyExpiryDate)}</strong>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  isExpired
                                    ? "bg-[#cc0c39] w-full"
                                    : isExpiringSoon
                                    ? "bg-[#e67a00] w-3/4 animate-pulse"
                                    : "bg-[#007600] w-1/4"
                                }`}
                              />
                            </div>

                            <p className="text-[11px] text-gray-500 leading-tight">
                              {isExpired
                                ? "Warranty coverage has expired. Hardware claim window closed."
                                : isExpiringSoon
                                ? "⚠️ Warranty is expiring soon. Reminder email dispatched to buyer."
                                : "Active coverage. Automated warranty alert emails sent 6 months & 1 day before expiry."}
                            </p>
                          </div>

                          {/* Action Buttons & Warranty Email Simulation Triggers (3 cols) */}
                          <div className="lg:col-span-3 space-y-1.5 text-xs">
                            <span className="text-[10px] uppercase font-bold text-gray-500 block">
                              Test Warranty Alert Emails:
                            </span>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "SET_NEAR_EXPIRY")}
                              disabled={actionLoading !== null}
                              className="w-full py-1.5 px-3 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm font-medium text-left transition-colors cursor-pointer text-gray-800 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1 text-[#8C6226] dark:text-[#E5CBA2] font-bold">
                                <AlertTriangle className="w-3 h-3 text-[#C9A66B]" /> Set 6-Month Expiry
                              </div>
                              <span className="text-[10px] text-gray-500">Triggers 6-Month Email Alert</span>
                            </button>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "SET_URGENT_EXPIRY")}
                              disabled={actionLoading !== null}
                              className="w-full py-1.5 px-3 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm font-medium text-left transition-colors cursor-pointer text-gray-800 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1 text-[#8C6226] dark:text-[#E5CBA2] font-bold">
                                <ShieldAlert className="w-3 h-3 text-[#C9A66B]" /> Set 24H Expiry
                              </div>
                              <span className="text-[10px] text-gray-500">Triggers 1-Day Urgent Email</span>
                            </button>

                            <button
                              onClick={() => handleSimulateExpiry(item.id, "EXTEND_WARRANTY")}
                              disabled={actionLoading !== null}
                              className="w-full py-1.5 px-3 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 rounded-sm font-medium text-left transition-colors cursor-pointer text-gray-800 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-1 text-[#8C6226] dark:text-[#E5CBA2] font-bold">
                                <Plus className="w-3 h-3 text-[#C9A66B]" /> Extend +1 Year
                              </div>
                              <span className="text-[10px] text-gray-500">Renew warranty & alerts</span>
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
            </>
          );
        })()}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <X className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
                <span>Cancel Order #{cancelModalOrder.orderNumber}</span>
              </div>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-gray-700">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-900 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Please confirm order cancellation:</p>
                <p>
                  Once cancelled, your order will be stopped immediately. A full refund of{" "}
                  <strong className="text-red-700">₹{cancelModalOrder.totalAmount?.toLocaleString("en-IN")}</strong>{" "}
                  will be credited back, and reserved phone inventory will be returned to stock.
                </p>
              </div>

              {/* Items Summary */}
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2">
                <span className="font-bold text-[11px] uppercase text-gray-500 block">Items to be cancelled:</span>
                {cancelModalOrder.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2 font-medium text-gray-900">
                      {it.productName} ({it.selectedStorage || "Default"} • {it.selectedColor || "Standard"}) × {it.quantity || 1}
                    </span>
                    <span className="font-bold text-gray-900 shrink-0">₹{it.price?.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {/* Cancellation Reason Selection */}
              <div>
                <label className="font-bold block text-gray-800 mb-1.5 text-xs">
                  Reason for Cancellation: <span className="text-red-500">*</span>
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
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

              <div className="text-[11px] text-gray-500 leading-tight">
                ℹ️ An instant cancellation confirmation email will be dispatched to <strong>{cancelModalOrder.customerEmail || cancelModalOrder.email}</strong>.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-semibold rounded-md border border-[#C9A66B]/30 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-bold rounded-md bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
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