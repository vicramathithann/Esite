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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            <KeyRound className="w-3 h-3" /> Security OTP
          </span>
        );
      case "PURCHASE_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Purchase Confirmed
          </span>
        );
      case "ORDER_CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
            <X className="w-3 h-3 text-red-500" /> Order Cancelled
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">
            <Truck className="w-3 h-3" /> Dispatched
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Package className="w-3 h-3" /> Processing
          </span>
        );
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case "ORDER_UPDATED":
      case "STATUS_UPDATE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <BellRing className="w-3 h-3" /> Support Update
          </span>
        );
      case "EXPIRY_WARNING_7D":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> 7-Day Warning
          </span>
        );
      case "EXPIRY_ALERT_24H":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> 24H Expiry Alert
          </span>
        );
      case "EXPIRED_NOTICE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-tile text-muted border border-border">
            <Clock className="w-3 h-3" /> Coverage Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-tile text-foreground border border-border">
            <Zap className="w-3 h-3" /> VM Mobiles
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-card text-foreground border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A66B]/15 dark:bg-[#D4B483]/15 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-foreground">SMS Inbox & Alerts</h2>
                {unreadSmsCount > 0 && (
                  <span className="bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadSmsCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Live buyer phone SMS notifications & OTPs
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSmsDrawerOpen(false)}
            className="p-1.5 text-muted hover:text-foreground hover:bg-tile rounded-full cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Bar */}
        <div className="p-3 bg-tile border-b border-border flex items-center justify-between gap-2.5">
          <button
            onClick={triggerExpiryScan}
            disabled={simulating}
            className="bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-2 px-3.5 text-xs font-semibold rounded-xl flex-1 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
            <span>{simulating ? "Scanning Expiries..." : "Run Auto-Expiry Scan"}</span>
          </button>
          {unreadSmsCount > 0 && (
            <button
              onClick={markAllSmsAsRead}
              className="text-xs text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-semibold px-2 py-1 cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2.5 border-b border-border flex gap-2 text-xs overflow-x-auto bg-card">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "bg-tile text-muted hover:text-foreground"
            }`}
          >
            All SMS ({smsAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab("otp")}
            className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "otp"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "bg-tile text-muted hover:text-foreground"
            }`}
          >
            OTPs
          </button>
          <button
            onClick={() => setActiveTab("expiry")}
            className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "expiry"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "bg-tile text-muted hover:text-foreground"
            }`}
          >
            Expiry Alerts
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-xs"
                : "bg-tile text-muted hover:text-foreground"
            }`}
          >
            Receipts
          </button>
        </div>

        {/* SMS Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted">
              <MessageSquare className="w-12 h-12 text-muted/60 mb-2" />
              <h4 className="text-foreground font-bold text-sm mb-1">No SMS Messages Yet</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Verify phone via OTP or purchase a mobile to receive instant text alerts!
              </p>
            </div>
          ) : (
            filteredAlerts.map((sms) => (
              <div
                key={sms.id}
                onClick={() => !sms.isRead && markSmsAsRead(sms.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-card shadow-xs ${
                  sms.isRead
                    ? "border-border"
                    : "border-accent shadow-sm ring-1 ring-accent/30"
                }`}
              >
                {!sms.isRead && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full ring-2 ring-card" />
                )}

                {/* SMS Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">
                      [VM-MOBILES]
                    </span>
                    {getAlertBadge(sms.alertType)}
                  </div>
                  <span className="text-[10px] text-muted font-mono">
                    {formatDateTime(sms.sentAt)}
                  </span>
                </div>

                {/* Subject Title */}
                <h4 className="text-xs font-bold text-foreground mb-2">
                  {sms.title}
                </h4>

                {/* Message Body bubble */}
                <div className="p-3 rounded-xl bg-tile border border-border text-xs text-foreground leading-relaxed font-sans">
                  {sms.messageBody}
                </div>

                {/* Footer metadata */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted">
                  <span>To: {sms.customerPhone || "+91-9876543210"}</span>
                  <div className="flex items-center gap-1 text-emerald-500 font-mono font-semibold">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Delivered via Gateway</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 bg-card border-t border-border text-xs text-muted flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-accent shrink-0" />
          <p className="text-[11px] leading-tight">
            VM Mobiles monitors your warranty in the database and automatically sends warning SMS alerts 7 days & 24h before expiry.
          </p>
        </div>
      </div>
    </div>
  );
}