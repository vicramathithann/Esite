"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Mail,
  Trash2,
  ShieldAlert,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";
import { isOrderCancelled } from "@/lib/orderStatus";

export default function AdminWarrantiesPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Deletion Modal State
  const [deleteModalWarranty, setDeleteModalWarranty] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast / Feedback State
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

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
        showToast(`Warranty certificate emailed to ${customerEmail}!`);
        await loadWarranties();
      } else {
        showToast(data.error || "Failed to resend warranty email.", "error");
      }
    } catch {
      showToast("Error contacting warranty service.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWarranty = async () => {
    if (!deleteModalWarranty) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/warranties/${deleteModalWarranty.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Warranty record deleted successfully.");
        setDeleteModalWarranty(null);
        await loadWarranties();
      } else {
        showToast(data.error || "Failed to delete warranty record.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 max-w-md p-4 rounded-xl border shadow-lg flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 backdrop-blur-md"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
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
                  const isCancelled = w.warrantyStatus === "CANCELLED" || isOrderCancelled(w.order?.orderStatus);
                  const isExpired = !isCancelled && new Date(w.warrantyExpiryDate) < new Date();
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
                        <div className="text-foreground/90 font-medium">{isCancelled ? "Voided" : w.warrantyDuration || "1 Year"}</div>
                        <div className={`text-[11px] ${isCancelled ? "text-rose-600 dark:text-rose-400 font-semibold" : isExpired ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold"}`}>
                          {isCancelled ? "Order Cancelled" : `Exp: ${formatDateOnly(w.warrantyExpiryDate)}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isCancelled
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : isExpired
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {isCancelled ? "CANCELLED" : isExpired ? "EXPIRED" : w.warrantyStatus || "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCancelled && (
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
                          )}

                          {/* Delete Warranty Record Button */}
                          <button
                            onClick={() => setDeleteModalWarranty(w)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete Warranty Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Warranty Confirmation Modal */}
      {deleteModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Delete Warranty Record</h2>
                <p className="text-xs text-muted">
                  Permanent removal from warranty registry.
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to delete this warranty record?
              </p>
              <div className="text-[11px] text-muted space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Smartphone:</span> {deleteModalWarranty.productName}
                </div>
                <div>
                  <span className="font-semibold text-foreground">IMEI:</span> {deleteModalWarranty.imeiNumber}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Customer:</span> {deleteModalWarranty.customerName} ({deleteModalWarranty.customerEmail})
                </div>
                <div>
                  <span className="font-semibold text-foreground">Order:</span> #{deleteModalWarranty.order?.orderNumber || deleteModalWarranty.orderId}
                </div>
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium pt-1 border-t border-rose-500/20">
                ⚠️ This warranty certificate will be permanently erased. The customer will no longer see active warranty coverage for this IMEI.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setDeleteModalWarranty(null)}
                disabled={deleteLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWarranty}
                disabled={deleteLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Permanently Delete Warranty
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
