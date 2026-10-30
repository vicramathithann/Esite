"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, 
  Smartphone, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ChevronRight,
  BellRing,
  Award,
  Truck,
  User,
  Mail,
  Phone,
  LogOut,
  X,
  Pencil,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2
} from "lucide-react";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { formatDateOnly, getDaysRemaining } from "@/lib/formatters";
import { isOrderCancelled, canOrderBeCancelled } from "@/lib/orderStatus";
import { useApp } from "@/context/AppContext";

export default function AccountPage() {
  const { currentUser, logout, login } = useApp();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOrderTab, setActiveOrderTab] = useState<"all" | "active" | "cancelled">("active");
  const [cancelModalOrder, setCancelModalOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Order created by mistake");
  const [cancelling, setCancelling] = useState(false);

  // Edit Profile States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Self-Service Account Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const openEditProfile = () => {
    if (!currentUser) return;
    setEditName(currentUser.name || "");
    setEditEmail(currentUser.email || "");
    setEditPhone(currentUser.phone || "");
    setEditAddress(currentUser.address || "");
    setEditError(null);
    setEditSuccess(null);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    setEditError(null);

    const cleanName = editName.trim();
    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanPhone = editPhone.trim().replace(/[^0-9]/g, "");
    const cleanAddress = editAddress.trim();

    // Validations
    if (!cleanName || cleanName.length < 2) {
      setEditError("Please enter your full name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEditError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setEditError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setEditSaving(true);
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          address: cleanAddress,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        setEditSuccess("Profile updated successfully!");
        setTimeout(() => {
          setIsEditProfileOpen(false);
          setEditSuccess(null);
        }, 1000);
      } else {
        setEditError(data.error || "Failed to update profile. Please try again.");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      setEditError("Network error. Please check your connection and try again.");
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "cancelled" || tab === "active" || tab === "all") {
        setActiveOrderTab(tab as "all" | "active" | "cancelled");
      }
    }
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    const targetOrder = cancelModalOrder;
    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${targetOrder.id}`, {
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
        setOrders((prev) =>
          prev.map((o) =>
            o.id === targetOrder.id
              ? {
                  ...o,
                  orderStatus: "CANCELLED",
                  paymentStatus: "Refund Initiated",
                  items: o.items?.map((it: any) => ({ ...it, warrantyStatus: "CANCELLED" })),
                  warranties: o.warranties?.map((w: any) => ({ ...w, warrantyStatus: "CANCELLED" })),
                }
              : o
          )
        );
        setCancelModalOrder(null);
        setActiveOrderTab("cancelled");
        await loadOrders();
        const targetPhoneNames = targetOrder.items?.map((i: any) => i.productName).filter(Boolean).join(", ") || "Smartphone";
        alert(data.message || `Your order for ${targetPhoneNames} has been cancelled and the amount will be refunded.`);
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
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === "CANCELLED" || status === "Cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
          <X className="w-3.5 h-3.5" /> Warranty Cancelled
        </span>
      );
    }
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
          <div className="bg-gradient-to-r from-[#131921] via-[#232f3e] to-[#131921] rounded-lg p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#febd69] to-[#f3a847] text-[#131921] flex items-center justify-center text-2xl font-black shadow-md shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{currentUser.name}</h1>
                  <button
                    onClick={openEditProfile}
                    className="p-1 text-gray-300 hover:text-[#febd69] hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                    title="Edit Personal Details"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {currentUser.role === "ADMIN" ? "👑 Administrator" : "✓ Verified Customer"}
                  </span>
                </div>
                <div className="text-xs text-gray-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#febd69] shrink-0" /> {currentUser.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#febd69] shrink-0" /> {currentUser.phone}</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#febd69] shrink-0" />
                    {currentUser.address ? (
                      <span className="max-w-[280px] truncate" title={currentUser.address}>{currentUser.address}</span>
                    ) : (
                      <button
                        onClick={openEditProfile}
                        className="text-[#febd69] hover:underline cursor-pointer"
                      >
                        + Add Delivery Address
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
              <button
                onClick={openEditProfile}
                className="px-3.5 py-1.5 bg-[#febd69] hover:bg-[#f3a847] active:bg-[#e2932b] text-[#131921] text-xs font-bold rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                title="Edit Profile"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              {currentUser.role === "ADMIN" && (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com" && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-bold rounded-md flex items-center gap-1.5 shadow"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Control</span>
                </Link>
              )}
              <Link
                href="/"
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-md border border-white/20 transition-colors"
              >
                Shop Mobiles
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 text-red-200 border border-red-500/30 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors"
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
          const activeOrdersCount = orders.filter((o) => !isOrderCancelled(o.orderStatus)).length;
          const cancelledOrdersCount = orders.filter((o) => isOrderCancelled(o.orderStatus)).length;
          const filteredOrders = orders.filter((o) => {
            if (activeOrderTab === "active") return !isOrderCancelled(o.orderStatus);
            if (activeOrderTab === "cancelled") return isOrderCancelled(o.orderStatus);
            return true;
          });

          return (
            <>
              <div className="border-b border-gray-300 flex gap-6 text-sm mb-6">
                <button
                  onClick={() => setActiveOrderTab("active")}
                  className={`pb-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                    activeOrderTab === "active"
                      ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                      : "text-gray-600 hover:text-[#0f1111]"
                  }`}
                >
                  Confirmed & Active Orders ({activeOrdersCount})
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
                <button
                  onClick={() => setActiveOrderTab("all")}
                  className={`pb-2 text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
                    activeOrderTab === "all"
                      ? "font-bold text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                      : "text-gray-600 hover:text-[#0f1111]"
                  }`}
                >
                  Full Order History ({orders.length})
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
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-sm p-12 text-center text-gray-600 space-y-3">
                  <Smartphone className="w-12 h-12 mx-auto text-gray-400" />
                  <h3 className="text-lg font-bold text-[#0f1111]">
                    {activeOrderTab === "cancelled"
                      ? "No Cancelled Orders"
                      : activeOrderTab === "active"
                      ? "No Active Orders"
                      : "No Orders Placed Yet"}
                  </h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    {activeOrderTab === "cancelled"
                      ? "You have not cancelled any smartphone orders. All cancelled orders will be archived here."
                      : activeOrderTab === "active"
                      ? "You currently have no active orders in processing or transit."
                      : "When you purchase a smartphone from VN Mobiles, you can track delivery and device warranty expiry here."}
                  </p>
                  {activeOrderTab !== "cancelled" && (
                    <Link href="/" className="btn-amazon-yellow py-2 px-6 text-xs font-bold inline-block">
                      Start Shopping
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredOrders.map((order) => {
                    const orderIsCancelled = isOrderCancelled(order.orderStatus);
                    const orderCanCancel = canOrderBeCancelled(order.orderStatus);

                    return (
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
                            <span className="font-bold text-[#0f1111]">Γé╣{order.totalAmount.toLocaleString("en-IN")}</span>
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
                            {!orderIsCancelled && (
                              <Link
                                href={`/track/${order.orderNumber}`}
                                className="btn-amazon-yellow py-1 px-3 text-xs font-bold rounded-sm flex items-center gap-1 shadow-2xs"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Track Package</span>
                              </Link>
                            )}

                            {orderIsCancelled ? (
                              <span className="py-1 px-2.5 text-xs font-bold rounded-sm bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                                <X className="w-3.5 h-3.5 text-red-600" /> Cancelled
                              </span>
                            ) : orderCanCancel ? (
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
                      {orderIsCancelled && (
                        <div className="bg-red-50 border-b border-red-200 px-5 py-3 text-xs text-red-900 flex items-start gap-2.5">
                          <div className="p-1 rounded bg-red-600 text-white shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-red-700 text-sm">
                              ORDER CANCELLED & REFUND PROCESSED
                            </div>
                            <p className="mt-0.5 text-red-800 leading-relaxed font-sans">
                              Your order for <strong className="text-gray-900">{order.items?.map((i: any) => i.productName).filter(Boolean).join(", ") || "Smartphone"}</strong> has been cancelled and the amount of <strong className="text-red-700">Γé╣{order.totalAmount?.toLocaleString("en-IN")}</strong> will be refunded to your original payment method.
                            </p>
                          </div>
                        </div>
                      )}

                {/* Admin / Support Alteration Alert Banner */}
                {!orderIsCancelled && (order.adminNotes || order.orderStatus !== "CONFIRMED" || order.shippingCarrier) && (
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
                        <strong className="text-[#0f1111] block mb-0.5">≡ƒöö Latest Update from Support Desk:</strong>
                        <span>{order.adminNotes.split("|").pop()?.trim()}</span>
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 pt-1.5 border-t border-amber-200/50">
                      <span>≡ƒôì Delivery Destination: <strong>{order.address}, {order.city}, {order.state} - {order.pincode}</strong></span>
                      <span className="text-gray-500 font-medium">≡ƒ¢í∩╕Å Protected by VN Shield Warranty</span>
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
                              <p className="text-gray-500">{item.selectedStorage} ΓÇó {item.selectedColor}</p>
                              <div className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 border border-gray-200 inline-block font-semibold">
                                Registered IMEI: <strong className="text-[#0f1111]">{item.imeiNumber}</strong>
                              </div>
                              <div className="text-gray-500 text-[11px] pt-1">
                                Return window closed on {formatDateOnly(new Date(new Date(item.warrantyStartDate).getTime() + 15 * 86400000))}
                              </div>
                            </div>
                          </div>

                          {orderIsCancelled || item.warrantyStatus === "CANCELLED" ? (
                            <div className="lg:col-span-7 bg-red-50 border border-red-200 p-3.5 rounded-sm space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-red-700">
                                <X className="w-4 h-4" />
                                <span>Warranty Cancelled (Order Cancelled)</span>
                              </div>
                              <p className="text-[11px] text-red-600 leading-relaxed">
                                This device was part of order #{order.orderNumber} which was cancelled. Warranty coverage is cancelled and void.
                              </p>
                            </div>
                          ) : (
                            /* Warranty Status & Details (7 cols) - Clean normal view without test controls */
                            <div className="lg:col-span-7 bg-gray-50 border border-gray-200 p-3.5 rounded-sm space-y-2 text-xs">
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
            </>
          );
        })()}

        {/* Danger Zone: Delete Account */}
        {currentUser && currentUser.role !== "ADMIN" && (
          <div className="bg-white rounded-lg border border-red-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-red-600" /> Danger Zone: Delete Customer Account
                </h3>
                <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                  Permanently remove your personal profile, credentials, and saved wishlist. Historical order and warranty data will be preserved in an anonymized format to fulfill legal, tax, and warranty obligations.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-md shrink-0 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                title="Delete Customer Account"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        )}
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
                <p className="font-bold mb-1">ΓÜá∩╕Å Please confirm order cancellation:</p>
                <p>
                  Once cancelled, your order will be stopped immediately. A full refund of{" "}
                  <strong className="text-red-700">Γé╣{cancelModalOrder.totalAmount?.toLocaleString("en-IN")}</strong>{" "}
                  will be credited back, and reserved phone inventory will be returned to stock.
                </p>
              </div>

              {/* Items Summary */}
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2">
                <span className="font-bold text-[11px] uppercase text-gray-500 block">Items to be cancelled:</span>
                {cancelModalOrder.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between items-center text-xs">
                    <span className="truncate pr-2 font-medium text-gray-900">
                      {it.productName} ({it.selectedStorage || "Default"} ΓÇó {it.selectedColor || "Standard"}) ├ù {it.quantity || 1}
                    </span>
                    <span className="font-bold text-gray-900 shrink-0">Γé╣{it.price?.toLocaleString("en-IN")}</span>
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
                Γä╣∩╕Å An instant cancellation confirmation email will be dispatched to <strong>{cancelModalOrder.customerEmail || cancelModalOrder.email}</strong>.
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
                className="py-2 px-4 text-xs font-bold rounded-md bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
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

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editSaving) {
              setIsEditProfileOpen(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 overflow-hidden text-gray-900 transition-all">
            {/* Modal Header */}
            <div className="bg-[#131921] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#febd69] text-[#131921] flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">Edit Profile Details</h3>
                  <p className="text-[11px] text-gray-300">Update your name, email, phone number & delivery address</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !editSaving && setIsEditProfileOpen(false)}
                disabled={editSaving}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProfile} className="p-5 space-y-4 text-xs">
              {/* Alert Feedback */}
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="leading-tight">{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 flex items-center gap-2 animate-fade-in font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A66B] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="name@example.com"
                    disabled={currentUser?.role === "ADMIN" && (currentUser?.email || "").toLowerCase() === "rrroyce20@gmail.com"}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A66B] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Used for sign-in, order updates, and warranty protection certificates.</p>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="10-digit mobile number"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A66B] focus:border-transparent transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Used for delivery confirmation and courier OTP.</p>
              </div>

              {/* Address Field */}
              <div>
                <label className="block font-semibold text-gray-800 mb-1">
                  Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                  <textarea
                    rows={3}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="House/Flat no., Building, Street, Area, City, State, PIN code"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C9A66B] focus:border-transparent resize-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Saved for fast, 1-click checkout on your next smartphone purchase.</p>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={editSaving}
                  className="py-2 px-4 text-xs font-semibold rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="py-2 px-5 text-xs font-bold rounded-md bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {editSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Self-Service Account Deletion Modal */}
      {currentUser && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
