"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";

export default function AdminWarrantiesPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("admin", "true");
      if (search) params.set("search", search);

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
  }, []);

  const handleResend = async (warrantyId: string, customerEmail: string) => {
    try {
      setActionLoading(warrantyId);
      const res = await fetch("/api/warranties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyId, action: "RESEND_EMAIL" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Warranty email certificate dispatched to ${customerEmail}!`);
        await loadWarranties();
      } else {
        alert(data.error || "Failed to resend warranty email.");
      }
    } catch {
      alert("Error contacting warranty service.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mobile Device Warranties</h1>
              <p className="text-xs text-muted">
                Official smartphone warranties registered by IMEI. Search by customer, order, or serial number.
              </p>
            </div>
          </div>

          <button
            onClick={loadWarranties}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadWarranties()}
            placeholder="Search by Order ID, Customer, Smartphone Name, or IMEI..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Smartphone</th>
                  <th className="py-3.5 px-4">Customer & Email</th>
                  <th className="py-3.5 px-4">Hardware IMEI</th>
                  <th className="py-3.5 px-4">Duration & Expiry</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      Loading warranty registry...
                    </td>
                  </tr>
                ) : warranties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted">
                      No warranty records found.
                    </td>
                  </tr>
                ) : (
                  warranties.map((w) => {
                    const isExpired = new Date(w.warrantyExpiryDate) < new Date();
                    return (
                      <tr key={w.id} className="hover:bg-tile/50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          #{w.order?.orderNumber || w.orderId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {w.productName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-foreground font-medium">{w.customerName}</div>
                          <div className="text-[11px] text-muted font-mono">{w.customerEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#8C6226] dark:text-[#E5CBA2] font-semibold">
                          {w.imeiNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-foreground/90 font-medium">{w.warrantyDuration || "1 Year"}</div>
                          <div className={`text-[11px] ${isExpired ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}`}>
                            Exp: {formatDateOnly(w.warrantyExpiryDate)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isExpired
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isExpired ? "EXPIRED" : w.warrantyStatus || "ACTIVE"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleResend(w.id, w.customerEmail)}
                            disabled={actionLoading === w.id}
                            className="px-2.5 py-1 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
                            title="Resend Warranty Certificate Email"
                          >
                            {actionLoading === w.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Mail className="w-3 h-3 text-[#8C6226] dark:text-[#E5CBA2]" />
                            )}
                            Resend Email
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
  );
}
