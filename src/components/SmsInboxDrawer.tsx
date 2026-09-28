"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { 
  X, 
  MessageSquare, 
  Smartphone, 
  CheckCheck, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw, 
  Zap,
  KeyRound,
  Truck,
  BellRing,
  Package
} from "lucide-react";
import { formatDateTime } from "@/lib/formatters";

export default function SmsInboxDrawer() {
  const { 
    isSmsDrawerOpen, 
    setIsSmsDrawerOpen, 
    smsAlerts, 
    unreadSmsCount, 
    fetchSmsAlerts, 
    markSmsAsRead, 
    markAllSmsAsRead 
  } = useApp();

  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "otp" | "expiry" | "orders">("all");

  if (!isSmsDrawerOpen) return null;

  const triggerExpiryScan = async () => {
    try {
      setSimulating(true);
      const res = await fetch("/api/sms/check-expiry", { method: "POST" });
      const data = await res.json();
      await fetchSmsAlerts();
      alert(`Expiry scan completed! Dispatched ${data.smsDispatched} new SMS alert(s).`);
    } catch (e) {
      console.error(e);
      alert("Failed to scan expiry alerts.");
    } finally {
      setSimulating(false);
    }
  };

  const filteredAlerts = smsAlerts.filter((sms) => {
    if (activeTab === "otp") {
      return sms.alertType === "OTP_VERIFICATION";
    }
    if (activeTab === "expiry") {
      return ["EXPIRY_WARNING_7D", "EXPIRY_ALERT_24H", "EXPIRED_NOTICE"].includes(sms.alertType);
    }
    if (activeTab === "orders") {
      return [
        "PURCHASE_CONFIRMATION",
        "PROCESSING",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "ORDER_UPDATED",
        "STATUS_UPDATE",
        "ORDER_CANCELLED",
      ].includes(sms.alertType);
    }
    return true;
  });

  const getAlertBadge = (type: string) => {
    switch (type) {
      case "OTP_VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <KeyRound className="w-3 h-3" /> Security OTP
          </span>
        );
      case "PURCHASE_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Purchase Confirmed
          </span>
        );
      case "ORDER_CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#cc0c39] border border-red-200">
            <X className="w-3 h-3 text-red-600" /> Order Cancelled & Refunded
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
            <Truck className="w-3 h-3 text-cyan-700" /> Dispatched & Shipped
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Package className="w-3 h-3 text-amber-700" /> Processing Order
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Order Delivered
          </span>
        );
      case "ORDER_UPDATED":
      case "STATUS_UPDATE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <BellRing className="w-3 h-3 text-purple-700" /> Support Update
          </span>
        );
      case "EXPIRY_WARNING_7D":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fef8f2] text-[#b12704] border border-[#fbd8b4]">
            <AlertTriangle className="w-3 h-3 text-[#e67a00]" /> 7-Day Expiry Warning
          </span>
        );
      case "EXPIRY_ALERT_24H":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-[#cc0c39] border border-red-200 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Final Expiry Alert (24H)
          </span>
        );
      case "EXPIRED_NOTICE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            <Clock className="w-3 h-3" /> Protection Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
            <Zap className="w-3 h-3" /> VM Mobiles Update
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white border-l border-gray-300 h-full flex flex-col shadow-2xl">
        {/* Header (Amazon Navy #131921) */}
        <div className="p-4 bg-[#131921] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#232f3e] flex items-center justify-center text-[#febd69]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">VM Mobiles SMS Alerts</h2>
                {unreadSmsCount > 0 && (
                  <span className="bg-[#cc0c39] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {unreadSmsCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-300">
                Live buyer phone messages & expiry warnings
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSmsDrawerOpen(false)}
            className="p-1 text-gray-300 hover:text-white rounded-xs cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Bar */}
        <div className="p-3 bg-[#f0f2f2] border-b border-gray-300 flex items-center justify-between gap-2">
          <button
            onClick={triggerExpiryScan}
            disabled={simulating}
            className="btn-amazon-yellow py-1.5 px-3 text-xs font-bold flex-1 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
            <span>{simulating ? "Scanning Expiries..." : "Run Auto-Expiry Scan"}</span>
          </button>
          {unreadSmsCount > 0 && (
            <button
              onClick={markAllSmsAsRead}
              className="text-xs text-[#007185] hover:underline font-bold px-2 py-1"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b border-gray-200 flex gap-2 text-xs overflow-x-auto bg-white">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#131921] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All SMS ({smsAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab("otp")}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "otp"
                ? "bg-[#131921] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            OTPs
          </button>
          <button
            onClick={() => setActiveTab("expiry")}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "expiry"
                ? "bg-[#e67a00] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Expiry Alerts
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#007600] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Receipts
          </button>
        </div>

        {/* SMS Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#eaeded]">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <h4 className="text-gray-800 font-bold text-sm mb-1">No SMS Messages Yet</h4>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                Verify phone via OTP or purchase a mobile to receive instant text alerts!
              </p>
            </div>
          ) : (
            filteredAlerts.map((sms) => (
              <div
                key={sms.id}
                onClick={() => !sms.isRead && markSmsAsRead(sms.id)}
                className={`p-3.5 rounded-sm border transition-all cursor-pointer relative bg-white ${
                  sms.isRead
                    ? "border-gray-200"
                    : "border-[#e77600] shadow-sm ring-1 ring-[#e77600]/30"
                }`}
              >
                {!sms.isRead && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#e77600] rounded-full" />
                )}

                {/* SMS Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-gray-900">
                      [VM-MOBILES]
                    </span>
                    {getAlertBadge(sms.alertType)}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {formatDateTime(sms.sentAt)}
                  </span>
                </div>

                {/* Subject Title */}
                <h4 className="text-xs font-bold text-[#0f1111] mb-1.5">
                  {sms.title}
                </h4>

                {/* Message Body bubble */}
                <div className="p-2.5 rounded-xs bg-[#f7f7f7] border border-gray-200 text-xs text-gray-800 leading-relaxed font-sans">
                  {sms.messageBody}
                </div>

                {/* Footer metadata */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                  <span>To: {sms.customerPhone || "+91-9876543210"}</span>
                  <div className="flex items-center gap-1 text-[#007600] font-mono font-medium">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Delivered via SMS Gateway</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-white border-t border-gray-200 text-xs text-gray-600 flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#e67a00] shrink-0" />
          <p className="text-[11px] leading-tight">
            VM Mobiles monitors your warranty in the database and automatically sends warning SMS alerts 7 days & 24h before expiry.
          </p>
        </div>
      </div>
    </div>
  );
}