"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Truck,
  ShieldCheck,
  MapPin,
  CreditCard,
  AlertTriangle,
  Phone,
  Calendar,
  XCircle,
  X,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";
import { isOrderCancelled, canOrderBeCancelled } from "@/lib/orderStatus";
import { useApp } from "@/context/AppContext";

export default function SingleOrderDetailsPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const { currentUser } = useApp();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [resendingWarranty, setResendingWarranty] = useState(false);
  const [warrantyCooldown, setWarrantyCooldown] = useState(0);

  useEffect(() => {
    if (warrantyCooldown <= 0) return;
    const interval = setInterval(() => {
      setWarrantyCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [warrantyCooldown]);

  useEffect(() => {
    if (!orderId) return;

    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();

        if (!data.success || !data.order) {
          setError(data.error || "Order not found.");
          return;
        }

        const fetchedOrder = data.order;

        // Security Check: Customer can only view their own order
        if (currentUser) {
          const isOwner =
            currentUser.role === "ADMIN" ||
            fetchedOrder.userId === currentUser.id ||
            fetchedOrder.customerEmail?.toLowerCase() === currentUser.email?.toLowerCase();

          if (!isOwner) {
            setError("Access Denied: You do not have permission to view this order.");
            return;
          }
        }

        setOrder(fetchedOrder);
      } catch (err) {
        console.error(err);
        setError("Failed to load order details.");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, currentUser]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm(`Are you sure you want to cancel order #${order.orderNumber}? A full refund will be initiated.`)) return;

    try {
      setCancelling(true);
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL_ORDER",
          orderStatus: "CANCELLED",
          cancelReason: "Cancelled by customer from order details page.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder((prev: any) => ({
          ...(prev || {}),
          ...(data.order || {}),
          orderStatus: "CANCELLED",
          paymentStatus: "Refund Initiated",
        }));
        const phoneNames = order.items?.map((i: any) => i.productName).filter(Boolean).join(", ") || "Smartphone";
        alert(data.message || `Your order for ${phoneNames} has been cancelled and the amount will be refunded.`);
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

  const handleResendWarranty = async () => {
    if (!order || warrantyCooldown > 0) return;
    setResendingWarranty(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/resend-warranty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        alert(`Warranty details email resent to ${order.customerEmail}!`);
        setWarrantyCooldown(60);
      } else {
        if (data.cooldownSeconds) {
          setWarrantyCooldown(data.cooldownSeconds);
        }
        alert(data.error || "Failed to resend warranty email.");
      }
    } catch {
      alert("Error contacting server. Please try again later.");
    } finally {
      setResendingWarranty(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-muted">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Order Notice</h2>
          <p className="text-muted text-sm mb-6">{error || "Unable to display this order."}</p>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-white hover:opacity-95 rounded-full font-semibold text-xs transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Return to My Orders
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = isOrderCancelled(order.orderStatus);
  const canCancel = canOrderBeCancelled(order.orderStatus);

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            {!isCancelled && (
              <Link
                href={`/track/${order.orderNumber}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] rounded-full text-xs font-medium transition-all shadow-2xs"
              >
                <Truck className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" /> Track Live Shipment
              </Link>
            )}
          </div>
        </div>

        {/* Order Header Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Order #{order.orderNumber}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isCancelled
                      ? "bg-red-500/10 text-red-500 border border-red-500/20"
                      : order.orderStatus === "Delivered"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30"
                  }`}
                >
                  {isCancelled ? "Cancelled" : order.orderStatus}
                </span>
              </div>
              <p className="text-xs text-muted mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Placed on {formatDateOnly(order.createdAt)}
              </p>
            </div>

            {canCancel && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
              >
                <XCircle className="w-4 h-4" /> {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </div>

          {/* Cancellation Notice Banner */}
          {isCancelled && (
            <div className="my-5 p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-500 flex items-start gap-3">
              <div className="p-1 rounded-lg bg-red-600 text-white shrink-0 mt-0.5">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="font-bold text-red-500 text-sm">
                  This Order Has Been Cancelled & Archived
                </div>
                <p className="text-muted leading-relaxed font-sans">
                  Your order for <strong className="text-foreground">{order.items?.map((i: any) => i.productName).filter(Boolean).join(", ") || "Smartphone"}</strong> has been cancelled and the amount of <strong className="text-red-500">{formatINR(order.totalAmount)}</strong> will be refunded to your payment method ({order.paymentMethod}).
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href="/orders?tab=cancelled"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:underline"
                  >
                    View All Cancelled Orders →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Delivery & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" /> Delivery Address
              </h3>
              <p className="text-sm font-bold text-foreground">{order.customerName}</p>
              <p className="text-xs text-muted leading-relaxed mt-0.5">{order.address}</p>
              <p className="text-xs text-muted">{order.city}, {order.state} - {order.pincode}</p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {order.customerPhone}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-500" /> Shipping Information
              </h3>
              <p className="text-sm font-medium text-foreground">Carrier: {order.shippingCarrier || "VM Mobiles Express"}</p>
              <p className="text-xs text-muted mt-0.5">
                Tracking: <span className="font-mono text-foreground">{order.trackingNumber || "Pending Dispatch"}</span>
              </p>
              {order.estimatedDelivery && (
                <p className="text-xs text-emerald-500 mt-1 font-medium">
                  Est. Delivery: {formatDateOnly(order.estimatedDelivery)}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-amber-500" /> Payment Summary
              </h3>
              <p className="text-sm font-medium text-foreground">Method: {order.paymentMethod}</p>
              <p className="text-xs text-muted mt-0.5">
                Status: <span className={isCancelled ? "text-red-500 font-semibold" : "text-emerald-500 font-semibold"}>{isCancelled ? "Refund Initiated" : order.paymentStatus}</span>
              </p>
              <p className="text-base font-bold text-foreground mt-1">Total: {formatINR(order.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Ordered Products Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-accent" /> Purchased Smartphones & Items ({order.items.length})
          </h2>

          <div className="divide-y divide-border">
            {order.items.map((item: any) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl bg-tile border border-border p-2 flex-shrink-0">
                    <Image
                      src={item.productImageUrl || "/images/placeholder.png"}
                      alt={item.productName}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{item.productName}</h3>
                    <p className="text-xs text-muted">
                      Brand: {item.productBrand} • Storage: {item.selectedStorage} • Color: {item.selectedColor}
                    </p>
                    <p className="text-xs font-mono text-accent mt-1">
                      IMEI: {item.imeiNumber}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                  <span className="text-xs text-muted">Qty: {item.quantity}</span>
                  <span className="text-sm font-bold text-foreground">{formatINR(item.price * item.quantity)}</span>
                  {isCancelled || item.warrantyStatus === "CANCELLED" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full mt-1 font-medium border border-red-500/20">
                      <X className="w-3 h-3 text-red-500" /> Warranty Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 font-medium border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> 1-Yr Warranty Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warranties & Device Shield Section */}
        {order.warranties && order.warranties.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Device Shield Warranty Protection
              </h2>

              {!isCancelled && (
                <button
                  onClick={handleResendWarranty}
                  disabled={resendingWarranty || warrantyCooldown > 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${resendingWarranty ? "animate-spin" : ""}`} />
                  {warrantyCooldown > 0 ? `Resend Certificate (${warrantyCooldown}s)` : "Resend Certificate Email"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {order.warranties.map((w: any, idx: number) => {
                const isWarrantyCancelled = isCancelled || w.warrantyStatus === "CANCELLED";
                const displayWarrantyNum = w.warrantyNumber || `WRT-${order.orderNumber}-${idx + 1}`;
                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl space-y-2 border ${
                      isWarrantyCancelled ? "bg-red-500/5 border-red-500/20" : "bg-tile border-border"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-foreground">{w.productName}</span>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                          isWarrantyCancelled
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}
                      >
                        {isWarrantyCancelled ? "CANCELLED" : w.warrantyStatus}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono text-muted">
                      <span>IMEI: {w.imeiNumber}</span>
                      <span className="text-[#8C6226] dark:text-[#E5CBA2] font-semibold">{displayWarrantyNum}</span>
                    </div>
                    {isWarrantyCancelled ? (
                      <div className="text-xs text-red-500 pt-1 border-t border-red-500/15 font-medium">
                        Warranty coverage voided due to order cancellation
                      </div>
                    ) : (
                      <div className="text-xs text-muted flex justify-between pt-1 border-t border-border">
                        <span>Duration: {w.warrantyDuration}</span>
                        <span>Expires: {formatDateOnly(w.warrantyExpiryDate)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
