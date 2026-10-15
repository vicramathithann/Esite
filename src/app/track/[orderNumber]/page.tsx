"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Mail,
  Copy,
  Check,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  BellRing,
  X
} from "lucide-react";
import { formatINR } from "@/lib/formatters";

interface TrackPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default function TrackOrderPage({ params }: TrackPageProps) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("Order created by mistake");
  const [cancelling, setCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${order.id}`, {
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
        await fetchOrder();
        alert(`Order #${order.orderNumber} has been successfully cancelled and refunded!`);
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

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/orders/track/${orderNumber}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || "Order not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load tracking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const handleCopyTracking = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center text-xs text-muted space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="font-semibold text-foreground">Locating order #{orderNumber} in dispatch pipeline...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground py-16 px-4">
        <div className="max-w-md mx-auto bg-card border border-border rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <Package className="w-12 h-12 text-muted mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Order Not Found</h2>
          <p className="text-xs text-muted">
            We couldn&apos;t find an order matching #{orderNumber}. Please check the number and try again.
          </p>
          <div className="pt-2">
            <Link href="/orders" className="inline-flex items-center justify-center bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-2.5 px-6 text-xs font-semibold rounded-xl transition-all shadow-sm">
              View All Your Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Stepper State
  const status = order.orderStatus;
  const isConfirmed = true;
  const isProcessing = ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isShipped = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isOutForDelivery = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isDelivered = status === "DELIVERED";

  const steps = [
    { title: "Order Placed", done: isConfirmed, desc: "Order received & confirmed via email" },
    { title: "Processing", done: isProcessing, desc: "Quality check & IMEI registered" },
    { title: "Shipped", done: isShipped, desc: order.shippingCarrier ? `In transit with ${order.shippingCarrier}` : "Dispatched from warehouse" },
    { title: "Out for Delivery", done: isOutForDelivery, desc: "Courier partner delivering today" },
    { title: "Delivered", done: isDelivered, desc: "Delivered & Device Shield Active" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs">
          <Link href="/orders" className="text-muted hover:text-foreground flex items-center gap-1.5 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            {order.orderStatus === "CANCELLED" ? (
              <span className="py-1 px-3 bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 rounded-xl font-semibold flex items-center gap-1 text-xs">
                <X className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" /> Order Cancelled & Refunded
              </span>
            ) : order.orderStatus !== "DELIVERED" ? (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="py-1.5 px-3 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl shadow-2xs font-semibold flex items-center gap-1 cursor-pointer transition-all text-[#8C6226] dark:text-[#E5CBA2] text-xs"
                title="Cancel this order"
              >
                <X className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" /> Cancel Order
              </button>
            ) : null}
            <button
              onClick={fetchOrder}
              className="text-[#8C6226] dark:text-[#E5CBA2] hover:bg-[#C9A66B]/20 flex items-center gap-1.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 px-3 py-1.5 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 rounded-xl shadow-2xs font-medium cursor-pointer transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Status
            </button>
          </div>
        </div>

        {/* Header Summary Box */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <span className="text-[11px] text-muted block uppercase font-semibold">Order Tracking Number</span>
              <h1 className="text-xl sm:text-2xl font-black text-foreground font-mono">
                #{order.orderNumber}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-muted block uppercase font-semibold">
                {order.orderStatus === "CANCELLED" ? "Order Status" : "Estimated Delivery"}
              </span>
              <span className={`text-sm sm:text-base font-bold ${order.orderStatus === "CANCELLED" ? "text-red-500 font-mono" : "text-emerald-500"}`}>
                {order.orderStatus === "CANCELLED"
                  ? "CANCELLED (REFUNDED)"
                  : order.estimatedDelivery
                  ? new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Arriving in 2-3 Business Days"}
              </span>
            </div>
          </div>

          {/* Cancellation Alert Banner */}
          {order.orderStatus === "CANCELLED" && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-500 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-red-500 flex items-center justify-between">
                  <span>ORDER CANCELLED & REFUND PROCESSED</span>
                  <span className="text-xs font-mono font-bold bg-red-500/20 text-red-500 px-2 py-0.5 rounded-md">
                    REFUNDED
                  </span>
                </h4>
                <p className="text-muted leading-relaxed font-sans">
                  This shipment was cancelled. Full refund of <strong className="text-red-500">₹{order.totalAmount?.toLocaleString("en-IN")}</strong> has been initiated back to your original payment method and reserved smartphone inventory has been restocked.
                </p>
              </div>
            </div>
          )}

          {/* Interactive 5-Step Pipeline Timeline */}
          <div className="py-4">
            <div className="relative">
              {/* Desktop Progress Line */}
              <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-tile border border-border z-0">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: isDelivered
                      ? "100%"
                      : isOutForDelivery
                      ? "75%"
                      : isShipped
                      ? "50%"
                      : isProcessing
                      ? "25%"
                      : "0%",
                  }}
                />
              </div>

              {/* Steps Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
                {steps.map((step, idx) => (
                  <div key={step.title} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                        step.done
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                          : "bg-tile text-muted border border-border"
                      }`}
                    >
                      {step.done ? <Check className="w-5 h-5 stroke-[2.5]" /> : idx + 1}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          step.done ? "text-foreground" : "text-muted"
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-muted leading-tight hidden sm:block mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Carrier & Tracking Card if Shipped */}
          {order.shippingCarrier && (
            <div className="bg-tile border border-border rounded-xl p-4 text-xs text-muted flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">
                    Shipped via {order.shippingCarrier}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-muted">AWB Tracking Number:</span>
                    <strong className="text-foreground bg-card px-2 py-0.5 border border-border rounded-md">
                      {order.trackingNumber}
                    </strong>
                    <button
                      onClick={() => handleCopyTracking(order.trackingNumber)}
                      className="text-accent hover:opacity-80 p-0.5 cursor-pointer"
                      title="Copy Tracking Number"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-muted">
                <span>Real-time courier scans updated automatically</span>
              </div>
            </div>
          )}

          {/* Admin / Support Modification Notice */}
          {order.adminNotes && (
            <div className="bg-tile border border-border rounded-xl p-4 text-xs text-muted flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Recent Support / Fulfillment Update:
                </h4>
                <p className="text-foreground leading-relaxed font-sans">
                  {order.adminNotes.split("|").pop()?.trim()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Items & Registered IMEI (7 cols) */}
          <div className="md:col-span-7 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm text-xs">
            <h3 className="font-bold text-sm text-foreground pb-2 border-b border-border flex items-center justify-between">
              <span>Items in this Shipment ({order.items?.length || 0})</span>
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                1-Year Device Shield Active ✓
              </span>
            </h3>

            <div className="divide-y divide-border">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3.5 flex gap-3.5 items-start">
                  <div className="w-16 h-16 relative bg-tile border border-border rounded-xl shrink-0 overflow-hidden p-1">
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-foreground">{item.productName}</h4>
                    <p className="text-muted font-mono text-[11px]">
                      {item.selectedStorage} • {item.selectedColor} • Qty: {item.quantity}
                    </p>
                    <div className="mt-2 p-2.5 bg-tile border border-border rounded-xl text-[11px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-muted">Registered IMEI:</span>
                        <span className="font-mono font-bold text-foreground bg-card px-2 py-0.5 border border-border rounded-md">
                          {item.imeiNumber}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted pt-1 border-t border-border">
                        <span>Brand Warranty Expiry:</span>
                        <span className="font-bold text-emerald-500">
                          {new Date(item.warrantyExpiryDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Destination & Warranty Protection (5 cols) */}
          <div className="md:col-span-5 space-y-4 text-xs">
            {/* Delivery Destination */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-2 shadow-sm">
              <h3 className="font-bold text-foreground pb-2 border-b border-border flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <span>Delivery Address</span>
              </h3>
              <div>
                <strong className="text-sm text-foreground block">{order.customerName}</strong>
                <p className="text-muted leading-relaxed mt-1">
                  {order.address}, {order.city}, {order.state} - {order.pincode}
                </p>
                {order.customerPhone ? (
                  <div className="mt-2 text-[11px] text-muted font-mono">
                    Phone: {order.customerPhone}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Warranty & Email Protection Information */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm">
              <h3 className="font-bold text-foreground pb-2 border-b border-border flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  <span>Warranty & Protection Notice</span>
                </span>
                <span className="text-[10px] text-muted">1-Year Shield Active</span>
              </h3>

              <div className="space-y-2.5 text-xs text-muted leading-relaxed">
                <div className="p-3 bg-tile border border-border rounded-xl space-y-1">
                  <span className="font-semibold text-accent block">Order Confirmation:</span>
                  <p className="text-foreground">Dispatched to {order.customerEmail}</p>
                </div>
                <div className="p-3 bg-tile border border-border rounded-xl space-y-1">
                  <span className="font-semibold text-accent block">Automated Warranty Alerts:</span>
                  <p className="text-foreground">Reminder emails will be sent 6 months and 1 day before expiration.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && order && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border">
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
                  Once cancelled, this shipment will be halted immediately. A full refund of{" "}
                  <strong className="text-red-500 font-bold">₹{order.totalAmount?.toLocaleString("en-IN")}</strong>{" "}
                  will be refunded to your payment method, and reserved smartphone units will be restored to warehouse stock.
                </p>
              </div>

              {/* Items Summary */}
              <div className="border border-border rounded-xl p-3 bg-tile space-y-2">
                <span className="font-semibold text-[11px] uppercase text-muted block">Items in this shipment:</span>
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
