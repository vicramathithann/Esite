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
  MessageSquareText,
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
      <div className="min-h-screen bg-[#eaeded] flex items-center justify-center p-4">
        <div className="text-center text-xs text-gray-600 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-[#007185] mx-auto" />
          <p className="font-bold">Locating order #{orderNumber} in dispatch pipeline...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#eaeded] py-16 px-4">
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-sm p-8 text-center space-y-4 shadow-xs">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <h2 className="text-lg font-bold text-[#0f1111]">Order Not Found</h2>
          <p className="text-xs text-gray-600">
            We couldn&apos;t find an order matching #{orderNumber}. Please check the number and try again.
          </p>
          <div className="pt-2">
            <Link href="/orders" className="btn-amazon-yellow py-2 px-6 text-xs font-bold inline-block">
              View All Your Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Stepper State
  // Steps: 1. Confirmed -> 2. Processing -> 3. Shipped -> 4. Out For Delivery -> 5. Delivered
  const status = order.orderStatus;
  const isConfirmed = true;
  const isProcessing = ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isShipped = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isOutForDelivery = ["OUT_FOR_DELIVERY", "DELIVERED"].includes(status);
  const isDelivered = status === "DELIVERED";

  const steps = [
    { title: "Order Placed", done: isConfirmed, desc: "Order received & verified via SMS" },
    { title: "Processing", done: isProcessing, desc: "Quality check & IMEI registered" },
    { title: "Shipped", done: isShipped, desc: order.shippingCarrier ? `In transit with ${order.shippingCarrier}` : "Dispatched from warehouse" },
    { title: "Out for Delivery", done: isOutForDelivery, desc: "Courier partner delivering today" },
    { title: "Delivered", done: isDelivered, desc: "Delivered & Device Shield Active" },
  ];

  return (
    <div className="min-h-screen bg-[#eaeded] pb-20 pt-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs">
          <Link href="/orders" className="text-[#007185] hover:underline flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            {order.orderStatus === "CANCELLED" ? (
              <span className="py-1 px-3 bg-red-100 text-red-800 border border-red-300 rounded font-bold flex items-center gap-1 text-xs">
                <X className="w-3.5 h-3.5 text-red-600" /> Order Cancelled & Refunded
              </span>
            ) : order.orderStatus !== "DELIVERED" ? (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="py-1 px-3 bg-white hover:bg-red-50 text-red-700 border border-gray-300 hover:border-red-300 rounded shadow-2xs font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                title="Cancel this order"
              >
                <X className="w-3.5 h-3.5 text-red-600" /> Cancel Order
              </button>
            ) : null}
            <button
              onClick={fetchOrder}
              className="text-gray-600 hover:text-black flex items-center gap-1 bg-white px-2.5 py-1 border border-gray-300 rounded shadow-2xs font-medium cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Status
            </button>
          </div>
        </div>

        {/* Header Summary Box */}
        <div className="bg-white border border-gray-200 rounded-sm p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[11px] text-gray-500 block">ORDER TRACKING NUMBER</span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0f1111] font-mono">
                #{order.orderNumber}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-500 block">
                {order.orderStatus === "CANCELLED" ? "ORDER STATUS" : "ESTIMATED DELIVERY"}
              </span>
              <span className={`text-sm sm:text-base font-bold ${order.orderStatus === "CANCELLED" ? "text-red-700 font-mono" : "text-emerald-800"}`}>
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
            <div className="bg-red-50 border border-red-200 rounded p-4 text-xs text-red-900 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-red-700 flex items-center justify-between">
                  <span>ORDER CANCELLED & REFUND PROCESSED</span>
                  <span className="text-xs font-mono font-bold bg-red-200 text-red-900 px-2 py-0.5 rounded">
                    REFUNDED
                  </span>
                </h4>
                <p className="text-red-800 leading-relaxed font-sans">
                  This shipment was cancelled. Full refund of <strong>₹{order.totalAmount?.toLocaleString("en-IN")}</strong> has been initiated back to your original payment method and reserved smartphone inventory has been restocked.
                </p>
              </div>
            </div>
          )}

          {/* Interactive 5-Step Pipeline Timeline */}
          <div className="py-4">
            <div className="relative">
              {/* Desktop Progress Line */}
              <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-gray-200 z-0">
                <div
                  className="h-full bg-emerald-600 transition-all duration-500"
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
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                          : "bg-gray-100 text-gray-400 border border-gray-300"
                      }`}
                    >
                      {step.done ? <Check className="w-5 h-5 stroke-[2.5]" /> : idx + 1}
                    </div>
                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          step.done ? "text-[#0f1111]" : "text-gray-400"
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-tight hidden sm:block mt-0.5">
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
            <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded p-4 text-xs text-[#0369a1] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-[#0c4a6e] block">
                    Shipped via {order.shippingCarrier}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 font-mono">
                    <span className="text-gray-600">AWB Tracking Number:</span>
                    <strong className="text-black bg-white px-2 py-0.5 border border-blue-200 rounded">
                      {order.trackingNumber}
                    </strong>
                    <button
                      onClick={() => handleCopyTracking(order.trackingNumber)}
                      className="text-blue-600 hover:text-blue-800 p-0.5"
                      title="Copy Tracking Number"
                    >
                      {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] text-gray-500">
                <span>Real-time courier scans updated automatically</span>
              </div>
            </div>
          )}

          {/* Admin / Support Modification Notice */}
          {order.adminNotes && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 text-xs text-amber-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e67a00] text-white flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#b12704]">
                  Recent Support / Fulfillment Update:
                </h4>
                <p className="text-gray-800 leading-relaxed font-sans">
                  {order.adminNotes.split("|").pop()?.trim()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Details Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Items & Registered IMEI (7 cols) */}
          <div className="md:col-span-7 bg-white border border-gray-200 rounded-sm p-5 space-y-4 shadow-xs text-xs">
            <h3 className="font-bold text-sm text-[#0f1111] pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Items in this Shipment ({order.items?.length || 0})</span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                1-Year Device Shield Active ✓
              </span>
            </h3>

            <div className="divide-y divide-gray-100">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex gap-3.5 items-start">
                  <div className="w-16 h-16 relative bg-gray-50 border border-gray-200 rounded shrink-0 overflow-hidden">
                    <Image
                      src={item.productImageUrl}
                      alt={item.productName}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-[#0f1111]">{item.productName}</h4>
                    <p className="text-gray-500 font-mono text-[11px]">
                      {item.selectedStorage} • {item.selectedColor} • Qty: {item.quantity}
                    </p>
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-[11px] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Registered IMEI:</span>
                        <span className="font-mono font-bold text-[#0f1111] bg-white px-2 py-0.5 border border-gray-300 rounded-xs">
                          {item.imeiNumber}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                        <span>Brand Warranty Expiry:</span>
                        <span className="font-bold text-emerald-700">
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

          {/* Right Column: Destination & SMS Dispatch History (5 cols) */}
          <div className="md:col-span-5 space-y-4 text-xs">
            {/* Delivery Destination */}
            <div className="bg-white border border-gray-200 rounded-sm p-4 space-y-2 shadow-xs">
              <h3 className="font-bold text-gray-700 pb-1.5 border-b border-gray-100 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>Delivery Address</span>
              </h3>
              <div>
                <strong className="text-sm text-[#0f1111] block">{order.customerName}</strong>
                <p className="text-gray-600 leading-relaxed mt-1">
                  {order.address}, {order.city}, {order.state} - {order.pincode}
                </p>
                <div className="mt-2 text-[11px] text-gray-500 font-mono">
                  Phone: {order.customerPhone}
                </div>
              </div>
            </div>

            {/* Live SMS History for this Shipment */}
            <div className="bg-white border border-gray-200 rounded-sm p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-gray-700 pb-1.5 border-b border-gray-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5 text-[#007185]" />
                  <span>Shipment SMS Log ({order.smsAlerts?.length || 0})</span>
                </span>
                <span className="text-[10px] text-gray-400">Delivered to {order.customerPhone}</span>
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {order.smsAlerts?.map((sms: any) => (
                  <div
                    key={sms.id}
                    className="p-2.5 bg-amber-50/50 border border-amber-200/80 rounded space-y-1 text-[11px]"
                  >
                    <div className="flex justify-between items-center text-gray-500 text-[10px]">
                      <span className="font-bold text-[#e67a00]">{sms.title}</span>
                      <span>
                        {new Date(sms.sentAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed font-sans">{sms.messageBody}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && order && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <X className="w-5 h-5 bg-white/20 p-0.5 rounded-full" />
                <span>Cancel Order #{order.orderNumber}</span>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
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
                  Once cancelled, this shipment will be halted immediately. A full refund of{" "}
                  <strong className="text-red-700">₹{order.totalAmount?.toLocaleString("en-IN")}</strong>{" "}
                  will be refunded to your payment method, and reserved smartphone units will be restored to warehouse stock.
                </p>
              </div>

              {/* Items Summary */}
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2">
                <span className="font-bold text-[11px] uppercase text-gray-500 block">Items in this shipment:</span>
                {order.items?.map((it: any) => (
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
                ℹ️ An instant cancellation confirmation SMS alert will be dispatched to <strong>{order.customerPhone || order.phone}</strong>.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-semibold rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="py-2 px-4 text-xs font-bold rounded-md bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
