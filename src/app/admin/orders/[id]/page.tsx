"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import AdminNav from "@/components/AdminNav";
import {
  ArrowLeft,
  Package,
  Truck,
  CreditCard,
  MapPin,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";

const ORDER_STATUS_OPTIONS = [
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

export default function AdminSingleOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const [formStatus, setFormStatus] = useState("Order Confirmed");
  const [formCarrier, setFormCarrier] = useState("BlueDart Express");
  const [formTracking, setFormTracking] = useState("");
  const [formPaymentStatus, setFormPaymentStatus] = useState("PAID");
  const [formNotes, setFormNotes] = useState("");

  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setFormStatus(data.order.orderStatus);
        setFormCarrier(data.order.shippingCarrier || "BlueDart Express");
        setFormTracking(data.order.trackingNumber || "");
        setFormPaymentStatus(data.order.paymentStatus || "PAID");
        setFormNotes(data.order.adminNotes || "");
      }
    } catch (e) {
      console.error("Failed to load order:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus: formStatus,
          shippingCarrier: formCarrier,
          trackingNumber: formTracking,
          paymentStatus: formPaymentStatus,
          adminNotes: formNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Order updated successfully! Notification emails dispatched.");
        await loadOrder();
      } else {
        alert(data.error || "Failed to update order");
      }
    } catch {
      alert("Error saving order");
    } finally {
      setSaving(false);
    }
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setResendingEmail(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESEND_EMAIL" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Order confirmation email resent to ${order.customerEmail}!`);
        await loadOrder();
      } else {
        alert(data.error || "Failed to resend confirmation email.");
      }
    } catch {
      alert("Error contacting server.");
    } finally {
      setResendingEmail(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Loading order #{orderId}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Orders List
          </Link>

          <button
            onClick={handleResendEmail}
            disabled={resendingEmail}
            className="px-3 py-1.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Mail className={`w-3.5 h-3.5 text-[#8C6226] dark:text-[#E5CBA2] ${resendingEmail ? "animate-spin" : ""}`} />
            Resend Confirmation Email
          </button>
        </div>

        {/* Order Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Order #{order.orderNumber}</h1>
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-full">
                {order.orderStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Placed on {formatDateOnly(order.createdAt)}</p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total Amount</span>
            <span className="text-xl font-mono font-bold text-white">{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Status Update Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-1.5">
            <Truck className="w-4 h-4" /> Fulfillment & Shipment Status
          </h2>

          <form onSubmit={handleSaveChanges} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Order Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  {ORDER_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Shipping Carrier</label>
                <input
                  type="text"
                  value={formCarrier}
                  onChange={(e) => setFormCarrier(e.target.value)}
                  placeholder="e.g. BlueDart Express, Delhivery"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Tracking AWB Number</label>
                <input
                  type="text"
                  value={formTracking}
                  onChange={(e) => setFormTracking(e.target.value)}
                  placeholder="e.g. BLUEDART-89472"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Internal Admin Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Log internal notes regarding this customer or order..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving Changes..." : "Update Order & Notify Customer via Email"}
            </button>
          </form>
        </div>

        {/* Customer & Items Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-400" /> Customer & Delivery
            </h2>

            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Recipient</span>
                <span className="font-semibold text-white">{order.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                <span className="text-indigo-400 font-mono">{order.customerEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                <span className="text-slate-300 font-mono">{order.customerPhone}</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Shipping Address</span>
                <p className="text-slate-300 leading-relaxed">{order.address}</p>
                <p className="text-slate-400">{order.city}, {order.state} - {order.pincode}</p>
              </div>
            </div>
          </div>

          {/* Ordered Devices */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Package className="w-4 h-4 text-indigo-400" /> Ordered Smartphones ({order.items?.length || 0})
            </h2>

            <div className="divide-y divide-slate-800/80">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 p-1 flex-shrink-0">
                      <Image
                        src={item.productImageUrl || "/images/placeholder.png"}
                        alt={item.productName}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.productName}</h3>
                      <p className="text-slate-400 text-[11px]">
                        {item.selectedStorage} • {item.selectedColor} • IMEI: <span className="font-mono text-indigo-400">{item.imeiNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white">{formatINR(item.price * item.quantity)}</div>
                    <span className="text-[11px] text-slate-400">Qty: {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Timeline / Email Delivery Records */}
        {order.emailNotifications && order.emailNotifications.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-400" /> MSG91 Email Dispatch History for this Order
            </h2>
            <div className="divide-y divide-slate-800/80 text-xs">
              {order.emailNotifications.map((em: any) => (
                <div key={em.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">{em.subject}</span>
                    <span className="text-slate-400 ml-2">({em.emailType})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${em.status === "SENT" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                      {em.status}
                    </span>
                    <span className="text-slate-400 text-[11px]">{formatDateOnly(em.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
