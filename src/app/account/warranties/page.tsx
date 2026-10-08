"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Clock, Smartphone, AlertTriangle, RefreshCw, Mail, CheckCircle2 } from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";
import { useApp } from "@/context/AppContext";

export default function UserWarrantiesPage() {
  const { currentUser } = useApp();
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadWarranties = async () => {
    if (!currentUser) {
      setWarranties([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentUser.id) params.set("userId", currentUser.id);
      if (currentUser.email) params.set("email", currentUser.email);
      if (currentUser.role === "ADMIN") params.set("admin", "true");

      const res = await fetch(`/api/warranties?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWarranties(data.warranties || []);
      }
    } catch (e) {
      console.error("Failed to load warranties:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarranties();
  }, [currentUser]);

  const handleResendWarrantyEmail = async (warrantyId: string) => {
    try {
      setActionLoading(warrantyId);
      const res = await fetch("/api/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyId, action: "RESEND_EMAIL" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Warranty certificate email has been sent!");
      } else {
        alert(data.error || "Failed to send warranty email.");
      }
    } catch {
      alert("Error contacting warranty service.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Account
          </Link>
          <span className="text-xs text-slate-400 font-mono">
            {warranties.length} Active Protections
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Device Shield Warranties</h1>
              <p className="text-xs text-slate-400">
                Official smartphone warranties registered with VM Mobiles. Each smartphone is tracked by its unique hardware IMEI.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm">Loading your mobile warranties...</p>
          </div>
        ) : warranties.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Active Warranties</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              When you purchase a smartphone from VM Mobiles, official 1-year Device Shield warranty protection will automatically be registered here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              Browse Smartphones
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {warranties.map((w) => {
              const isExpired = new Date(w.warrantyExpiryDate) < new Date();
              return (
                <div
                  key={w.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white">{w.productName}</h2>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            isExpired
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isExpired ? "EXPIRED" : w.warrantyStatus || "ACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Order #{w.order?.orderNumber || w.orderId} • Purchased on {formatDateOnly(w.purchaseDate)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleResendWarrantyEmail(w.id)}
                      disabled={actionLoading === w.id}
                      className="px-3 py-1.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 dark:hover:bg-[#D4B483]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                    >
                      {actionLoading === w.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-[#8C6226] dark:text-[#E5CBA2]" />
                      )}
                      Email Certificate
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Registered IMEI</span>
                      <span className="font-mono text-indigo-400 font-semibold">{w.imeiNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Coverage Duration</span>
                      <span className="text-white font-medium">{w.warrantyDuration || "1 Year"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Start Date</span>
                      <span className="text-slate-300">{formatDateOnly(w.warrantyStartDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase tracking-wider text-[10px]">Expiry Date</span>
                      <span className={isExpired ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                        {formatDateOnly(w.warrantyExpiryDate)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
