"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Lock, 
  CheckCircle2, 
  ArrowLeft, 
  Truck, 
  Sparkles,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Mail,
  X
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import confetti from "canvas-confetti";

export default function CheckoutPage() {
  const router = useRouter();
  const { currentUser, cart, cartTotal, clearCart } = useApp();

  const [authChecking, setAuthChecking] = useState(true);

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    address: "Flat 402, Skyline Tech Park, Outer Ring Road",
    city: "Bengaluru",
    pincode: "560103",
    state: "Karnataka",
    paymentMethod: "Amazon Pay UPI",
  });

  // Auth Protection: Require authenticated and email-verified user
  useEffect(() => {
    let user = currentUser;
    if (!user && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("novamobile_user");
        if (saved) user = JSON.parse(saved);
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      router.replace("/login?redirect=/checkout");
      return;
    }

    if (!user.emailVerified) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}&redirect=/checkout`);
      return;
    }

    setAuthChecking(false);
  }, [currentUser, router]);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        customerName: currentUser.name || prev.customerName,
        customerEmail: currentUser.email || prev.customerEmail,
      }));
    }
  }, [currentUser]);

  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState<any>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Order created by mistake");
  const [cancelling, setCancelling] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(false);

  const handleCancelCurrentOrder = async () => {
    if (!orderComplete?.order?.id) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${orderComplete.order.id}`, {
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
        setCancelModalOpen(false);
        setOrderCancelled(true);
        alert(`Order #${orderComplete.order.orderNumber} has been successfully cancelled and refunded!`);
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

  const hasOutOfStock = cart.some(
    (item) => item.inStock === false || (item.stock !== undefined && item.stock <= 0)
  );

  // Place Order Core Logic
  const executeOrderPlacement = async () => {
    if (!currentUser) {
      alert("Please log in to complete your purchase.");
      router.push("/login?redirect=/checkout");
      return;
    }

    if (!currentUser.emailVerified) {
      alert("Please verify your email before placing an order.");
      router.push(`/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`);
      return;
    }

    const outOfStockItem = cart.find(
      (item) => item.inStock === false || (item.stock !== undefined && item.stock <= 0)
    );
    if (outOfStockItem) {
      alert(`⚠️ Cannot place order: "${outOfStockItem.name}" is Currently Out of Stock. Please remove it from your cart.`);
      return;
    }

    if (!formData.address || !formData.city || !formData.pincode) {
      alert("Please fill in your delivery address (Street Address, City, and Pincode).");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: currentUser.name || formData.customerName || "Customer",
          customerPhone: currentUser.phone || "",
          customerEmail: currentUser.email || formData.customerEmail,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          state: formData.state,
          totalAmount: cartTotal,
          paymentMethod: formData.paymentMethod,
          userId: currentUser.id,
          items: cart.map((i) => ({
            productId: i.productId,
            productName: i.name,
            productBrand: i.brand,
            productImageUrl: i.imageUrl,
            selectedColor: i.selectedColor.name,
            selectedStorage: i.selectedStorage.size,
            price: i.price,
            quantity: i.quantity,
            warrantyMonths: i.warrantyMonths,
          })),
        }),
      });

      if (res.status === 401) {
        alert("Session expired or unauthorized. Please log in again.");
        router.push("/login?redirect=/checkout");
        return;
      }

      if (res.status === 403) {
        alert("Email verification required. Please verify your email before placing an order.");
        router.push(`/verify-email?email=${encodeURIComponent(currentUser.email)}&redirect=/checkout`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setOrderComplete(data);
        clearCart();

        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        alert(data.error || "Failed to place order.");
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong placing the order.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Order Form Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeOrderPlacement();
  };

  if (authChecking) {
    return (
      <div className="min-h-screen py-20 flex flex-col items-center justify-center bg-background text-foreground space-y-3">
        <RefreshCw className="w-8 h-8 text-[#C9A66B] dark:text-[#D4B483] animate-spin" />
        <p className="text-sm text-muted">Securing checkout session...</p>
      </div>
    );
  }

  if (orderComplete) {
    const order = orderComplete.order;

    return (
      <div className="min-h-screen py-10 bg-background text-foreground max-w-4xl mx-auto px-4">
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-6 shadow-sm">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            orderCancelled ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
          }`}>
            {orderCancelled ? <X className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
              orderCancelled
                ? "bg-red-500/10 text-red-500 border-red-500/20"
                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            }`}>
              {orderCancelled ? (
                <>
                  <X className="w-3.5 h-3.5 text-red-500" /> Order Cancelled & Full Refund Issued
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Order Placed & Warranty Active
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {orderCancelled ? "Order Cancellation Confirmed" : `Thank you, ${order.customerName}!`}
            </h1>
            <p className="text-muted text-sm mt-1">
              {orderCancelled ? (
                <span>
                  Order <strong className="text-foreground">#{order.orderNumber}</strong> has been cancelled. Full refund of{" "}
                  <strong className="text-red-500">{formatINR(order.totalAmount)}</strong> has been initiated.
                </span>
              ) : (
                <span>
                  Your order <strong className="text-foreground">#{order.orderNumber}</strong> has been placed for{" "}
                  <strong className="text-accent">{formatINR(order.totalAmount)}</strong>.
                </span>
              )}
            </p>
          </div>

          {/* Cancelled Order Notice Banner */}
          {orderCancelled && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-500 text-left flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-red-500">
                  REFUND & INVENTORY RESTOCK COMPLETED
                </h4>
                <p className="text-muted leading-relaxed font-sans">
                  The ordered smartphone stock has been restored to warehouse inventory. A cancellation confirmation email was sent to <strong className="text-foreground">{order.customerEmail}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Order Details Box */}
          <div className="bg-tile border border-border rounded-xl p-5 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border font-semibold">
              <span className="text-muted">Shipment Details & Device Warranty</span>
              <span className={orderCancelled ? "text-red-500" : "text-emerald-500"}>
                {orderCancelled ? "CANCELLED & REFUNDED" : "VERIFIED & ACTIVE"}
              </span>
            </div>

            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-border">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{item.productName}</h4>
                  <p className="text-muted font-mono text-[11px]">
                    {item.selectedStorage} • {item.selectedColor}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-muted text-[10px] block">Registered IMEI:</span>
                  <span className="font-mono font-bold text-foreground bg-card px-2 py-0.5 border border-border rounded-md">
                    {item.imeiNumber}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-3 bg-card border border-border rounded-lg text-xs text-muted flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Order Confirmation Dispatched:</strong> An official receipt has been delivered to{" "}
                <span className="font-mono font-bold text-foreground underline">{order.customerEmail}</span>.
              </div>
            </div>

            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-muted flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">1-Year Warranty Active:</strong> Automated email notifications will be sent to{" "}
                <span className="font-medium text-foreground">{order.customerEmail}</span> <strong>6 months</strong> and <strong>1 day</strong> before your warranty expires.
              </div>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/track/${order.orderNumber}`}
              className="bg-accent text-white hover:opacity-95 py-2.5 px-6 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Truck className="w-4 h-4" />
              <span>Track Package Live (#{order.orderNumber})</span>
            </Link>

            {orderCancelled ? (
              <span className="bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 dark:border-[#D4B483]/30 py-2.5 px-5 text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <X className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
                <span>Cancelled & Refunded</span>
              </span>
            ) : (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 dark:border-[#D4B483]/30 py-2.5 px-5 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                title="Cancel this order and receive full refund"
              >
                <X className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
                <span>Cancel Order</span>
              </button>
            )}

            <Link
              href="/orders"
              className="bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 py-2.5 px-5 text-xs font-semibold rounded-xl text-[#8C6226] dark:text-[#E5CBA2] transition-all"
            >
              View All Orders & Warranty
            </Link>

            <Link href="/" className="text-xs text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-medium px-4">
              Continue Shopping on VN Mobiles
            </Link>
          </div>
        </div>

        {/* Cancellation Confirmation Modal */}
        {cancelModalOpen && order && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-card text-foreground rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border text-left">
              {/* Modal Header */}
              <div className="bg-red-600 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <X className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
                  <span>Cancel Order #{order.orderNumber}</span>
                </div>
                <button
                  onClick={() => setCancelModalOpen(false)}
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
                    Are you sure you want to cancel this order? A full refund of{" "}
                    <strong className="text-red-500 font-bold">{formatINR(order.totalAmount)}</strong>{" "}
                    will be refunded immediately, and reserved smartphone units will be restored to warehouse inventory.
                  </p>
                </div>

                {/* Items Summary */}
                <div className="border border-border rounded-xl p-3 bg-tile space-y-2">
                  <span className="font-semibold text-[11px] uppercase text-muted block">Items to be cancelled:</span>
                  {order.items?.map((it: any) => (
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
                  ℹ️ An instant cancellation confirmation email will be dispatched to <strong className="text-foreground">{order.customerEmail}</strong>.
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-tile px-5 py-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={cancelling}
                  className="py-2 px-4 text-xs font-semibold rounded-xl border border-[#C9A66B]/30 dark:border-[#D4B483]/30 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 text-[#8C6226] dark:text-[#E5CBA2] cursor-pointer transition-all"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleCancelCurrentOrder}
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

  if (cart.length === 0) {
    return (
      <div className="min-h-screen py-16 bg-background max-w-xl mx-auto px-4 text-center space-y-4">
        <div className="bg-card border border-border rounded-2xl p-8 space-y-4 shadow-sm">
          <h2 className="text-xl font-bold text-foreground">Your VN Mobiles Cart is Empty</h2>
          <p className="text-sm text-muted">
            Your shopping cart currently has no smartphone items.
          </p>
          <Link href="/" className="inline-flex items-center justify-center bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-2.5 px-6 text-xs font-semibold rounded-xl transition-all shadow-sm">
            Shop Today&apos;s Mobile Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background text-foreground">
      {/* Premium Minimalist Checkout Header */}
      <div className="bg-card/80 backdrop-blur-md border-b border-border py-3.5 px-4 sm:px-8 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tight">
              VN
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              VN <span className="text-muted font-normal">Mobiles</span>
            </span>
          </Link>

          <h1 className="text-base sm:text-lg font-semibold text-foreground">
            Checkout <span className="text-muted font-normal text-sm">({cart.length} items)</span>
          </h1>

          <div className="flex items-center gap-1.5 text-muted text-xs">
            <Lock className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline font-medium">100% Secure Checkout</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Checkout Layout */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 3 Steps (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              {/* Step 1: Delivery Address */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2.5 font-bold text-base text-foreground">
                    <span className="w-6 h-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center text-xs font-bold">1</span>
                    <span>Delivery Address</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Account Verified ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Full Name: Read-Only from Profile */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" /> Full Name
                      </span>
                      <span className="text-[10px] text-muted">From profile (Read-only)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentUser?.name || formData.customerName}
                      className="w-full bg-tile/70 border border-border text-foreground font-medium rounded-xl px-3.5 py-2.5 text-sm cursor-not-allowed select-none opacity-90 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="font-semibold text-foreground">Street Address <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                      placeholder="Flat, House no., Building, Company, Apartment"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground">Pincode <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-xs shadow-xs">
                <div className="font-bold text-base text-foreground border-b border-border pb-3 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center text-xs font-bold">2</span>
                  <span>Payment Method</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    "Amazon Pay UPI / PhonePe / GPay",
                    "Credit or debit card (Visa, Mastercard, RuPay)",
                    "Net Banking (All Indian Banks)",
                    "Cash on Delivery / Pay on Delivery"
                  ].map((method) => {
                    const isSelected = formData.paymentMethod === method;
                    return (
                      <label
                        key={method}
                        className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#C9A66B] dark:border-[#D4B483] bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 text-foreground font-semibold"
                            : "border-border bg-tile/40 hover:bg-tile text-foreground font-normal"
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          checked={isSelected}
                          onChange={() => setFormData({ ...formData, paymentMethod: method })}
                          className="accent-[#C9A66B] dark:accent-[#D4B483]"
                        />
                        <span>{method}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Review items & Delivery */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-xs shadow-xs">
                <div className="font-bold text-base text-foreground border-b border-border pb-3 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] flex items-center justify-center text-xs font-bold">3</span>
                  <span>Review Items and Delivery</span>
                </div>

                {hasOutOfStock && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning:</strong> One or more smartphones in your order are currently out of stock. You cannot place an order until these items are removed.
                    </span>
                  </div>
                )}

                <div className="divide-y divide-border">
                  {cart.map((item) => {
                    const isItemOutOfStock = item.inStock === false || (item.stock !== undefined && item.stock <= 0);

                    return (
                      <div key={item.id} className="py-4 flex gap-4 items-center">
                        <div className="relative w-16 h-16 bg-tile border border-border rounded-xl overflow-hidden shrink-0 p-1">
                          <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-contain" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                          <p className="text-muted text-xs mt-0.5">{item.selectedStorage.size} • {item.selectedColor.name}</p>
                          <div className="font-bold text-foreground mt-1">₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                          {isItemOutOfStock ? (
                            <div className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              Currently Out of Stock &mdash; Please remove to proceed
                            </div>
                          ) : (
                            <div className="text-[11px] text-emerald-500 font-medium mt-0.5">In Stock</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Place Order Button */}
              <button
                type="submit"
                disabled={loading || hasOutOfStock}
                className={`w-full py-3.5 px-6 text-sm font-semibold rounded-xl shadow-xs transition-all ${
                  hasOutOfStock
                    ? "bg-tile text-muted cursor-not-allowed border border-border"
                    : "bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] cursor-pointer shadow-md"
                }`}
              >
                {hasOutOfStock 
                  ? "Cannot Place Order (Items Out of Stock)" 
                  : loading 
                  ? "Registering Warranty & Placing Order..." 
                  : `Place your order and pay (₹${cartTotal.toLocaleString("en-IN")})`}
              </button>
            </form>
          </div>

          {/* Right Column: Order Summary Box (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 sticky top-24 shadow-xs text-xs">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading || hasOutOfStock}
                className={`w-full py-3 px-4 text-xs font-semibold rounded-xl shadow-xs transition-all ${
                  hasOutOfStock
                    ? "bg-tile text-muted cursor-not-allowed border border-border"
                    : "bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] cursor-pointer shadow-md"
                }`}
              >
                {hasOutOfStock ? "Out of Stock" : loading ? "Processing..." : "Place your order"}
              </button>

              <p className="text-[11px] text-muted text-center leading-tight">
                By placing your order, you agree to VN Mobiles.in privacy notice and conditions of use.
              </p>

              <div className="border-t border-border pt-4 space-y-2 text-muted">
                <h4 className="font-bold text-sm text-foreground mb-2">Order Summary</h4>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span className="text-foreground font-medium">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="text-emerald-500 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>1-Year Device Warranty:</span>
                  <span className="text-emerald-500 font-semibold">FREE (Included)</span>
                </div>
                <div className="flex justify-between">
                  <span>Pre-Expiry Warranty Alerts:</span>
                  <span className="text-emerald-500 font-semibold">FREE (6M & 1D via Email)</span>
                </div>
                <div className="flex justify-between text-base font-bold text-foreground pt-3 border-t border-border">
                  <span>Order Total:</span>
                  <span className="text-accent">₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-3.5 bg-tile border border-border rounded-xl text-[11px] text-muted space-y-1">
                <span className="font-semibold flex items-center gap-1 text-accent">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Purchase Protection
                </span>
                <p>
                  Genuine Indian brand warranty with unique IMEI database registration and automated email alerts 6 months & 1 day before expiry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}