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
  MessageSquareText, 
  Truck, 
  Sparkles,
  KeyRound,
  Send,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  X
} from "lucide-react";
import { formatINR } from "@/lib/formatters";
import confetti from "canvas-confetti";

export default function CheckoutPage() {
  const router = useRouter();
  const { currentUser, cart, cartTotal, clearCart, fetchSmsAlerts, setIsSmsDrawerOpen } = useApp();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    address: "Flat 402, Skyline Tech Park, Outer Ring Road",
    city: "Bengaluru",
    pincode: "560103",
    state: "Karnataka",
    paymentMethod: "Amazon Pay UPI",
  });

  // Pre-fill user data if logged in
  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        customerName: currentUser.name || prev.customerName,
        customerPhone: currentUser.phone || prev.customerPhone,
        customerEmail: currentUser.email || prev.customerEmail,
      }));
    } else {
      // Default placeholder values for guest checkout
      setFormData((prev) => ({
        ...prev,
        customerName: prev.customerName || "Customer",
        customerPhone: prev.customerPhone || "+91 98765 43210",
        customerEmail: prev.customerEmail || "customer@example.com",
      }));
    }
  }, [currentUser]);

  // SMS OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [lastDispatchedOtp, setLastDispatchedOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

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
        await fetchSmsAlerts();
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

  const [autoSubmitOrder, setAutoSubmitOrder] = useState(true);

  // Send SMS OTP
  const handleSendOtp = async () => {
    if (!formData.customerPhone || formData.customerPhone.trim().length < 8) {
      alert("Please enter a valid mobile number.");
      return;
    }

    try {
      setSendingOtp(true);
      setOtpError(null);
      const res = await fetch("/api/sms/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formData.customerPhone }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setLastDispatchedOtp(data.otp);
        await fetchSmsAlerts();
      } else {
        setOtpError(data.error || "Failed to send verification SMS.");
      }
    } catch (e) {
      console.error(e);
      setOtpError("Failed to dispatch verification SMS.");
    } finally {
      setSendingOtp(false);
    }
  };

  const hasOutOfStock = cart.some(
    (item) => item.inStock === false || (item.stock !== undefined && item.stock <= 0)
  );

  // Place Order Core Logic
  const executeOrderPlacement = async (isVerified = isPhoneVerified) => {
    const outOfStockItem = cart.find(
      (item) => item.inStock === false || (item.stock !== undefined && item.stock <= 0)
    );
    if (outOfStockItem) {
      alert(`⚠️ Cannot place order: "${outOfStockItem.name}" is Currently Out of Stock. Please remove it from your cart.`);
      return;
    }

    if (!isVerified) {
      alert("Please verify your mobile number via SMS OTP before placing your order.");
      return;
    }

    if (!formData.customerName || !formData.address) {
      alert("Please fill in your delivery details.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName || currentUser?.name || "Customer",
          customerPhone: formData.customerPhone || currentUser?.phone || "+91 98765 43210",
          customerEmail: formData.customerEmail || currentUser?.email || "customer@example.com",
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          state: formData.state,
          totalAmount: cartTotal,
          paymentMethod: formData.paymentMethod,
          userId: currentUser?.id || null,
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

      const data = await res.json();
      if (data.success) {
        setOrderComplete(data);
        clearCart();
        await fetchSmsAlerts();

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

  // Verify OTP (with optional automatic order submission)
  const handleVerifyOtp = async (codeToVerify?: string, shouldAutoSubmit = autoSubmitOrder) => {
    const code = codeToVerify || otpCode;
    if (!code || code.trim().length !== 6) {
      setOtpError("Please enter the 6-digit OTP sent via SMS.");
      return;
    }

    try {
      setVerifyingOtp(true);
      setOtpError(null);
      const res = await fetch("/api/sms/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.customerPhone,
          code: code.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPhoneVerified(true);
        setOtpError(null);
        if (shouldAutoSubmit) {
          // Automatically place the order right away!
          await executeOrderPlacement(true);
        }
      } else {
        setOtpError(data.error || "Invalid verification code.");
      }
    } catch (e) {
      console.error(e);
      setOtpError("Error verifying OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Submit Order Form Handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeOrderPlacement();
  };

  if (orderComplete) {
    const order = orderComplete.order;
    const sms = orderComplete.smsAlert;

    return (
      <div className="min-h-screen py-10 bg-[#eaeded] max-w-4xl mx-auto px-4">
        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center space-y-6 shadow-sm">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            orderCancelled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          }`}>
            {orderCancelled ? <X className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>

          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
              orderCancelled
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            }`}>
              {orderCancelled ? (
                <>
                  <X className="w-3.5 h-3.5 text-red-600" /> Order Cancelled & Full Refund Issued
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Order Placed & Warranty Active
                </>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0f1111]">
              {orderCancelled ? "Order Cancellation Confirmed" : `Thank you, ${order.customerName}!`}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {orderCancelled ? (
                <span>
                  Order <strong className="text-[#0f1111]">#{order.orderNumber}</strong> has been cancelled. Full refund of{" "}
                  <strong className="text-red-700">{formatINR(order.totalAmount)}</strong> has been initiated.
                </span>
              ) : (
                <span>
                  Your order <strong className="text-[#0f1111]">#{order.orderNumber}</strong> has been placed for{" "}
                  <strong className="text-[#0f1111]">{formatINR(order.totalAmount)}</strong>.
                </span>
              )}
            </p>
          </div>

          {/* Cancelled Order Notice Banner */}
          {orderCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-xs text-red-900 text-left flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-sm text-red-700">
                  REFUND & INVENTORY RESTOCK COMPLETED
                </h4>
                <p className="text-red-800 leading-relaxed font-sans">
                  The ordered smartphone stock has been restored to warehouse inventory. A cancellation confirmation SMS was sent to <strong>{order.customerPhone}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Amazon Order Details Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-sm p-5 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 font-bold">
              <span className="text-gray-700">Shipment Details & Device Warranty</span>
              <span className={orderCancelled ? "text-red-700" : "text-emerald-700"}>
                {orderCancelled ? "CANCELLED & REFUNDED" : "VERIFIED & ACTIVE"}
              </span>
            </div>

            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <h4 className="font-bold text-sm text-[#0f1111]">{item.productName}</h4>
                  <p className="text-gray-500 font-mono text-[11px]">
                    {item.selectedStorage} • {item.selectedColor}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 text-[10px] block">Registered IMEI:</span>
                  <span className="font-mono font-bold text-[#0f1111] bg-white px-2 py-0.5 border border-gray-300 rounded-xs">
                    {item.imeiNumber}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-3 bg-white border border-gray-200 rounded-xs text-xs text-gray-700 flex items-start gap-2">
              <MessageSquareText className="w-4 h-4 text-[#007185] shrink-0 mt-0.5" />
              <div>
                <strong>SMS Dispatch Confirmed:</strong> Confirmation SMS delivered to verified phone{" "}
                <span className="font-mono font-bold underline">{order.customerPhone}</span>.
              </div>
            </div>
          </div>

          {/* Simulated SMS Card */}
          {sms && (
            <div className="bg-[#fef8f2] border border-[#fbd8b4] rounded-sm p-4 text-left space-y-1.5">
              <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                <span className="text-[#e67a00] font-bold">Delivered to {order.customerPhone}:</span>
                <span>Just Now</span>
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-xs text-xs text-gray-800 font-sans leading-relaxed">
                {sms.messageBody}
              </div>
            </div>
          )}

          {/* Action Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={`/track/${order.orderNumber}`}
              className="btn-amazon-yellow py-2 px-6 text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Truck className="w-4 h-4" />
              <span>Track Package Live (#{order.orderNumber})</span>
            </Link>

            {orderCancelled ? (
              <span className="bg-red-100 text-red-800 border border-red-200 py-2 px-5 text-xs font-bold rounded-sm flex items-center gap-1.5">
                <X className="w-4 h-4 text-red-600" />
                <span>Cancelled & Refunded</span>
              </span>
            ) : (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="bg-white hover:bg-red-50 text-red-700 border border-gray-300 hover:border-red-300 py-2 px-5 text-xs font-bold rounded-sm flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Cancel this order and receive full refund"
              >
                <X className="w-4 h-4 text-red-600" />
                <span>Cancel Order</span>
              </button>
            )}

            <Link
              href="/orders"
              className="bg-white hover:bg-gray-100 border border-gray-300 py-2 px-5 text-xs font-bold rounded-sm text-gray-800"
            >
              View All Orders & Warranty
            </Link>

            <button
              onClick={() => setIsSmsDrawerOpen(true)}
              className="btn-amazon-orange py-2 px-5 text-xs font-bold cursor-pointer"
            >
              Open Buyer SMS Inbox
            </button>

            <Link href="/" className="text-xs text-[#007185] hover:underline font-medium px-4">
              Continue Shopping on VM Mobiles
            </Link>
          </div>
        </div>

        {/* Cancellation Confirmation Modal */}
        {cancelModalOpen && order && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-300 text-left">
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
                    Are you sure you want to cancel this order? A full refund of{" "}
                    <strong className="text-red-700">{formatINR(order.totalAmount)}</strong>{" "}
                    will be refunded immediately, and reserved smartphone units will be restored to warehouse inventory.
                  </p>
                </div>

                {/* Items Summary */}
                <div className="border border-gray-200 rounded-md p-3 bg-gray-50 space-y-2">
                  <span className="font-bold text-[11px] uppercase text-gray-500 block">Items to be cancelled:</span>
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
                  ℹ️ An instant cancellation confirmation SMS alert will be dispatched to <strong>{order.customerPhone}</strong>.
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
                  onClick={handleCancelCurrentOrder}
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

  if (cart.length === 0) {
    return (
      <div className="min-h-screen py-16 bg-[#eaeded] max-w-xl mx-auto px-4 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#0f1111]">Your VM Mobiles Cart is Empty</h2>
        <p className="text-xs text-gray-600">
          Your shopping cart has no smartphone items.
        </p>
        <Link href="/" className="btn-amazon-yellow py-2 px-6 text-xs font-bold inline-block">
          Shop Today&apos;s Mobile Deals
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-[#eaeded]">
      {/* Amazon-Style Checkout Header */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-baseline">
            <span className="text-2xl font-black text-[#131921]">vm<span className="text-[#febd69]">mobiles</span></span>
            <span className="text-xs text-[#febd69] font-bold">.in</span>
          </Link>

          <h1 className="text-xl sm:text-2xl font-medium text-[#0f1111]">
            Checkout <span className="text-gray-500 font-normal">({cart.length} items)</span>
          </h1>

          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Lock className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">100% Secure</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Checkout Layout */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 3 Steps (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Step 1: Delivery Address & Phone Number SMS Verification */}
              <div className="bg-white border border-gray-200 rounded-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#0f1111]">
                    <span className="text-[#e67a00]">1.</span>
                    <span>Delivery Address & Phone SMS Verification</span>
                  </div>
                  {isPhoneVerified && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Phone Verified ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full border border-gray-300 rounded-xs px-3 py-2 text-sm focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600]"
                      placeholder="Full Name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 flex justify-between">
                      <span>Mobile Number</span>
                      <span className="text-[10px] text-[#007185]">For SMS Expiry Alerts</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        required
                        disabled={isPhoneVerified}
                        value={formData.customerPhone}
                        onChange={(e) => {
                          setFormData({ ...formData, customerPhone: e.target.value });
                          setIsPhoneVerified(false);
                          setOtpSent(false);
                        }}
                        className={`flex-1 border rounded-xs px-3 py-2 text-sm font-mono focus:outline-none ${
                          isPhoneVerified
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                            : "border-gray-300 focus:border-[#e77600]"
                        }`}
                        placeholder="+91 98765 43210"
                      />
                      {!isPhoneVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp}
                          className="btn-amazon-yellow px-3 py-1.5 text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1"
                        >
                          {sendingOtp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          <span>{otpSent ? "Resend OTP" : "Send OTP"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* OTP Verification Tray */}
                  {!isPhoneVerified && otpSent && (
                    <div className="sm:col-span-2 p-3.5 bg-[#fef8f2] border border-[#fbd8b4] rounded-sm space-y-2.5 text-xs">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <span className="font-bold text-[#703800] flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-[#e67a00]" />
                          Enter 6-digit OTP sent via SMS to {formData.customerPhone}:
                        </span>
                        {lastDispatchedOtp && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpCode(lastDispatchedOtp);
                              handleVerifyOtp(lastDispatchedOtp, autoSubmitOrder);
                            }}
                            className="text-[11px] text-[#007185] hover:underline font-bold bg-white px-2.5 py-1 border border-gray-300 rounded shadow-2xs flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-[#e67a00]" />
                            Auto-fill & Submit ({lastDispatchedOtp})
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setOtpCode(val);
                            if (val.length === 6) {
                              handleVerifyOtp(val, autoSubmitOrder);
                            }
                          }}
                          placeholder="••••••"
                          className="w-36 border-2 border-[#e77600] rounded px-3 py-1.5 text-center font-mono text-lg font-bold bg-white tracking-[0.25em] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#e77600]"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyOtp(otpCode, autoSubmitOrder)}
                          disabled={verifyingOtp || otpCode.length !== 6}
                          className="btn-amazon-yellow px-4 py-2 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {verifyingOtp ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{autoSubmitOrder ? "Verifying & Placing Order..." : "Verifying..."}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{autoSubmitOrder ? "Verify & Auto-Submit" : "Verify OTP"}</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 text-[11px]">
                        <label className="flex items-center gap-1.5 text-gray-700 cursor-pointer select-none font-medium">
                          <input
                            type="checkbox"
                            checked={autoSubmitOrder}
                            onChange={(e) => setAutoSubmitOrder(e.target.checked)}
                            className="rounded border-gray-300 text-[#e67a00] focus:ring-[#e67a00]"
                          />
                          <span>⚡ Auto-submit order immediately when 6 digits are entered</span>
                        </label>
                      </div>

                      {otpError && (
                        <p className="text-[#cc0c39] font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {otpError}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-gray-700">Street Address</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border border-gray-300 rounded-xs px-3 py-2 text-sm focus:outline-none focus:border-[#e77600]"
                      placeholder="Flat, House no., Building, Company, Apartment"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">City</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-xs px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700">Pincode</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full border border-gray-300 rounded-xs px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="bg-white border border-gray-200 rounded-sm p-5 space-y-3 text-xs">
                <div className="font-bold text-sm text-[#0f1111] border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="text-[#e67a00]">2.</span>
                  <span>Payment method</span>
                </div>

                <div className="space-y-2">
                  {[
                    "Amazon Pay UPI / PhonePe / GPay",
                    "Credit or debit card (Visa, Mastercard, RuPay)",
                    "Net Banking (All Indian Banks)",
                    "Cash on Delivery / Pay on Delivery"
                  ].map((method) => (
                    <label
                      key={method}
                      className="flex items-center gap-3 p-2.5 border rounded-xs cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={formData.paymentMethod === method}
                        onChange={() => setFormData({ ...formData, paymentMethod: method })}
                        className="text-[#e77600] focus:ring-[#e77600]"
                      />
                      <span className="font-medium text-gray-900">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Review items & Delivery */}
              <div className="bg-white border border-gray-200 rounded-sm p-5 space-y-3 text-xs">
                <div className="font-bold text-sm text-[#0f1111] border-b border-gray-100 pb-2 flex items-center gap-2">
                  <span className="text-[#e67a00]">3.</span>
                  <span>Review items and delivery</span>
                </div>

                {hasOutOfStock && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Warning:</strong> One or more smartphones in your order are currently out of stock. You cannot place an order until these items are removed.
                    </span>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {cart.map((item) => {
                    const isItemOutOfStock = item.inStock === false || (item.stock !== undefined && item.stock <= 0);

                    return (
                      <div key={item.id} className="py-3 flex gap-3">
                        <div className="relative w-16 h-16 bg-white border border-gray-200 rounded-xs overflow-hidden shrink-0">
                          <Image src={item.imageUrl} alt={item.name} fill unoptimized className="object-contain" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-[#0f1111]">{item.name}</h4>
                          <p className="text-gray-500">{item.selectedStorage.size} • {item.selectedColor.name}</p>
                          <div className="font-bold text-[#0f1111] mt-1">₹{(item.price * item.quantity).toLocaleString("en-IN")}</div>
                          {isItemOutOfStock ? (
                            <div className="text-[11px] text-red-600 font-bold mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                              Currently Out of Stock &mdash; Please remove to proceed
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#007600] font-medium mt-0.5">In Stock</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Place Order Button */}
              <button
                type="submit"
                disabled={loading || !isPhoneVerified || hasOutOfStock}
                className={`w-full py-3 px-6 text-sm font-bold rounded-full shadow-xs transition-all ${
                  hasOutOfStock
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300"
                    : isPhoneVerified
                    ? "btn-amazon-yellow cursor-pointer"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300"
                }`}
              >
                {hasOutOfStock 
                  ? "Cannot Place Order (Items Out of Stock)" 
                  : loading 
                  ? "Registering IMEI & Placing Order..." 
                  : !isPhoneVerified 
                  ? "Verify Phone via SMS OTP to Place Order" 
                  : `Place your order and pay (₹${cartTotal.toLocaleString("en-IN")})`}
              </button>
            </form>
          </div>

          {/* Right Column: Amazon Order Summary Box (4 cols) */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-gray-200 rounded-sm p-4 space-y-3 sticky top-24 shadow-xs text-xs">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading || !isPhoneVerified || hasOutOfStock}
                className={`w-full py-2 px-4 text-xs font-medium rounded-full shadow-xs transition-all ${
                  hasOutOfStock
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                    : isPhoneVerified
                    ? "btn-amazon-yellow cursor-pointer"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                }`}
              >
                {hasOutOfStock ? "Out of Stock" : loading ? "Processing..." : "Place your order"}
              </button>

              <p className="text-[11px] text-gray-500 text-center leading-tight">
                By placing your order, you agree to VM Mobiles.in privacy notice and conditions of use.
              </p>

              <div className="border-t border-gray-200 pt-3 space-y-1.5 text-gray-600">
                <h4 className="font-bold text-sm text-[#0f1111] mb-2">Order Summary</h4>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="text-[#007600] font-bold">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>1-Year Device Warranty:</span>
                  <span className="text-[#007600] font-bold">FREE (Included)</span>
                </div>
                <div className="flex justify-between">
                  <span>Pre-Expiry SMS Alerts:</span>
                  <span className="text-[#007600] font-bold">FREE (Included)</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#b12704] pt-2 border-t border-gray-200">
                  <span>Order Total:</span>
                  <span>₹{cartTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#fef8f2] border border-[#fbd8b4] rounded-xs text-[11px] text-[#703800] space-y-1">
                <span className="font-bold flex items-center gap-1 text-[#e67a00]">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Purchase Protection
                </span>
                <p>
                  Genuine Indian brand warranty with unique IMEI database registration and automated SMS alerts 7 days & 24h before expiry.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}