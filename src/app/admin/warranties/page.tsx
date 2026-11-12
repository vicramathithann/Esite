"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Edit3,
  History,
  AlertTriangle,
  Calendar,
  Send,
  Check,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";
import { isOrderCancelled } from "@/lib/orderStatus";
import { NumberInput } from "@/components/NumberInput";
import {
  calculateNewWarrantyExpiry,
  formatKolkataDateString,
  WarrantyDurationUnit,
  WarrantyCalculateFrom,
} from "@/lib/warrantyDateHelpers";

const PRESET_DURATIONS: Array<{ label: string; value: number; unit: WarrantyDurationUnit }> = [
  { label: "1 Month", value: 1, unit: "MONTHS" },
  { label: "3 Months", value: 3, unit: "MONTHS" },
  { label: "6 Months", value: 6, unit: "MONTHS" },
  { label: "1 Year", value: 1, unit: "YEARS" },
  { label: "2 Years", value: 2, unit: "YEARS" },
  { label: "3 Years", value: 3, unit: "YEARS" },
  { label: "4 Years", value: 4, unit: "YEARS" },
];

export default function AdminWarrantiesPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit Warranty Modal State
  const [editModalWarranty, setEditModalWarranty] = useState<any | null>(null);
  const [durationValue, setDurationValue] = useState<string>("1");
  const [durationUnit, setDurationUnit] = useState<WarrantyDurationUnit>("YEARS");
  const [calculateFrom, setCalculateFrom] = useState<WarrantyCalculateFrom>("START_DATE");
  const [reductionConfirmed, setReductionConfirmed] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // History Drawer State
  const [historyModalWarranty, setHistoryModalWarranty] = useState<any | null>(null);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);

  // Deletion Modal State
  const [deleteModalWarranty, setDeleteModalWarranty] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast / Feedback State
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" = "success",
    action?: { label: string; onClick: () => void }
  ) => {
    setNotification({ type, message, action });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, action ? 10000 : 5000);
  };

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("admin", "true");
      if (search) params.set("search", search);

      const res = await fetch(`/api/warranties?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
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

  const handleOpenEditModal = (w: any) => {
    setEditModalWarranty(w);
    let val = "1";
    let unit: WarrantyDurationUnit = "YEARS";
    if (w.warrantyDuration) {
      const match = String(w.warrantyDuration).match(/(\d+)\s*(day|month|year)/i);
      if (match) {
        val = match[1];
        const uStr = match[2].toLowerCase();
        if (uStr.startsWith("day")) unit = "DAYS";
        else if (uStr.startsWith("month")) unit = "MONTHS";
        else unit = "YEARS";
      }
    }
    setDurationValue(val);
    setDurationUnit(unit);
    setCalculateFrom("START_DATE");
    setReductionConfirmed(false);
    setEditError(null);
  };

  // Live calculation for preview
  const liveCalc = useMemo(() => {
    if (!editModalWarranty) return null;
    const num = parseInt(durationValue, 10);
    if (isNaN(num) || num <= 0) return null;
    try {
      return calculateNewWarrantyExpiry({
        startDate:
          editModalWarranty.warrantyStartDate ||
          editModalWarranty.purchaseDate ||
          new Date(),
        currentExpiryDate: editModalWarranty.warrantyExpiryDate,
        durationValue: num,
        durationUnit,
        calculateFrom,
      });
    } catch {
      return null;
    }
  }, [editModalWarranty, durationValue, durationUnit, calculateFrom]);

  const hasNoChange = Boolean(liveCalc && !liveCalc.isExtended && !liveCalc.isReduced);

  const handleSaveEditWarranty = async () => {
    if (!editModalWarranty || !liveCalc) return;
    if (hasNoChange) {
      setEditError("No change to save. The new expiration date is identical to the current one.");
      return;
    }
    if (liveCalc.isReduced && !reductionConfirmed) {
      setEditError("Please confirm that you understand this reduces the customer's warranty.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);

      const targetWarrantyId = editModalWarranty.id;
      const res = await fetch(`/api/admin/warranties/${targetWarrantyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          durationValue: parseInt(durationValue, 10),
          durationUnit,
          calculateFrom,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const targetEmail = data.customerEmail || editModalWarranty.customerEmail;
        if (data.emailSent) {
          showToast(`Warranty updated and email sent to ${targetEmail}`, "success");
        } else {
          showToast(
            `Warranty updated, but the email failed. Resend?`,
            "warning",
            {
              label: "Resend update email",
              onClick: () => handleResendUpdateEmail(targetWarrantyId),
            }
          );
        }
        setEditModalWarranty(null);
        await loadWarranties();
      } else {
        setEditError(data.error || "Failed to update warranty duration.");
      }
    } catch (err: any) {
      setEditError(err?.message || "Network error contacting server.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleResendCertificate = async (warrantyId: string, customerEmail: string) => {
    try {
      setActionLoading(warrantyId);
      const res = await fetch("/api/admin/send-certificate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warrantyId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Warranty certificate emailed to ${customerEmail}!`);
        await loadWarranties();
      } else {
        showToast(data.error || "Failed to send warranty certificate email.", "error");
      }
    } catch {
      showToast("Error contacting warranty service.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendUpdateEmail = async (warrantyId: string, historyId?: string) => {
    try {
      setResendLoadingId(historyId || warrantyId);
      const res = await fetch(`/api/admin/warranties/${warrantyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "resend-update", historyId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Warranty update notification re-emailed successfully!");
        await loadWarranties();
        setHistoryModalWarranty((prev: any) => {
          if (!prev || prev.id !== warrantyId) return prev;
          const updated = { ...prev };
          if (Array.isArray(updated.changeHistory)) {
            updated.changeHistory = updated.changeHistory.map((item: any) =>
              !historyId || item.id === historyId ? { ...item, emailSent: true } : item
            );
          }
          return updated;
        });
      } else {
        showToast(data.error || "Failed to resend update email.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setResendLoadingId(null);
    }
  };

  const handleDeleteWarranty = async () => {
    if (!deleteModalWarranty) return;

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/warranties/${deleteModalWarranty.id}`, {
        method: "DELETE",
        credentials: "include",
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
              : notification.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 backdrop-blur-md"
              : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300 backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : notification.type === "warning" ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">
            <div>{notification.message}</div>
            {notification.action && (
              <button
                type="button"
                onClick={() => {
                  notification.action?.onClick();
                  setNotification(null);
                }}
                className="mt-2 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {notification.action.label}
              </button>
            )}
          </div>
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
                  const isCancelled =
                    w.warrantyStatus === "CANCELLED" || isOrderCancelled(w.order?.orderStatus);
                  const isExpired = !isCancelled && new Date(w.warrantyExpiryDate) < new Date();
                  const hasHistory = Array.isArray(w.changeHistory) && w.changeHistory.length > 0;

                  return (
                    <tr key={w.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        #{w.order?.orderNumber || w.orderId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{w.productName}</div>
                        {w.orderItem && (w.orderItem.selectedStorage || w.orderItem.selectedColor) && (
                          <div className="text-[11px] text-muted">
                            {[w.orderItem.selectedStorage, w.orderItem.selectedColor]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-foreground font-medium">{w.customerName}</div>
                        <div className="text-[11px] text-muted font-mono">{w.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#8C6226] dark:text-[#E5CBA2] font-semibold">
                        {w.imeiNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-foreground/90 font-medium">
                            {isCancelled ? "Voided" : w.warrantyDuration || "1 Year"}
                          </span>
                          {hasHistory && (
                            <button
                              onClick={() => setHistoryModalWarranty(w)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 hover:bg-[#C9A66B]/25 transition cursor-pointer"
                              title="View change history"
                            >
                              <History className="w-2.5 h-2.5" />
                              Edited ({w.changeHistory.length})
                            </button>
                          )}
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            isCancelled
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : isExpired
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : "text-emerald-600 dark:text-emerald-400 font-semibold"
                          }`}
                        >
                          {isCancelled
                            ? "Order Cancelled"
                            : `Exp: ${formatDateOnly(w.warrantyExpiryDate)}`}
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
                          {isCancelled
                            ? "CANCELLED"
                            : isExpired
                            ? "EXPIRED"
                            : w.warrantyStatus || "ACTIVE"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Warranty Duration Button */}
                          <button
                            onClick={() => handleOpenEditModal(w)}
                            disabled={isCancelled}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              isCancelled
                                ? "opacity-40 cursor-not-allowed bg-tile text-muted border-border"
                                : "bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border-[#C9A66B]/30"
                            }`}
                            title={
                              isCancelled
                                ? "Cancelled warranties cannot be edited"
                                : "Edit Warranty Duration"
                            }
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleResendCertificate(w.id, w.customerEmail)}
                              disabled={actionLoading === w.id}
                              className="px-2.5 py-1 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] text-[11px] font-semibold rounded-lg inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="Resend Warranty Certificate Email"
                            >
                              {actionLoading === w.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Mail className="w-3 h-3 text-[#8C6226] dark:text-[#E5CBA2]" />
                              )}
                              Send Certificate Email
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

      {/* Edit Warranty Duration Modal */}
      {editModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Edit Warranty Duration</h2>
                  <p className="text-xs text-muted">
                    Modify official coverage duration. Dates are computed authoritatively in IST.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalWarranty(null)}
                className="text-muted hover:text-foreground transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Target Warranty Details */}
            <div className="bg-tile border border-border rounded-xl p-4 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block">
                    Smartphone
                  </span>
                  <span className="font-semibold text-foreground">
                    {editModalWarranty.productName}
                    {editModalWarranty.orderItem &&
                      (editModalWarranty.orderItem.selectedStorage ||
                        editModalWarranty.orderItem.selectedColor) && (
                        <span className="text-muted font-normal">
                          {" "}
                          (
                          {[
                            editModalWarranty.orderItem.selectedStorage,
                            editModalWarranty.orderItem.selectedColor,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                          )
                        </span>
                      )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block">
                    Customer
                  </span>
                  <span className="font-medium text-foreground">
                    {editModalWarranty.customerName} ({editModalWarranty.customerEmail})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block">
                    Order ID & IMEI
                  </span>
                  <span className="font-mono text-foreground">
                    #{editModalWarranty.order?.orderNumber || editModalWarranty.orderId} •{" "}
                    {editModalWarranty.imeiNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted block">
                    Current Coverage
                  </span>
                  <span className="font-medium text-foreground">
                    {editModalWarranty.warrantyDuration || "1 Year"} (Exp:{" "}
                    {formatKolkataDateString(editModalWarranty.warrantyExpiryDate)})
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 text-xs">
              {/* New Duration Input & Unit */}
              <div>
                <label className="block text-foreground font-semibold mb-1.5">
                  New Duration <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <NumberInput
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full px-3.5 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                    />
                  </div>
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as WarrantyDurationUnit)}
                    className="px-3.5 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B] cursor-pointer"
                  >
                    <option value="DAYS">Days</option>
                    <option value="MONTHS">Months</option>
                    <option value="YEARS">Years</option>
                  </select>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted font-medium mr-1">Presets:</span>
                  {PRESET_DURATIONS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setDurationValue(preset.value.toString());
                        setDurationUnit(preset.unit);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer ${
                        durationValue === preset.value.toString() && durationUnit === preset.unit
                          ? "bg-[#C9A66B] text-white border-[#C9A66B]"
                          : "bg-tile text-muted border-border hover:text-foreground hover:bg-tile/80"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate From */}
              <div>
                <label className="block text-foreground font-semibold mb-1.5">Calculate From</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalculateFrom("START_DATE")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      calculateFrom === "START_DATE"
                        ? "bg-[#C9A66B]/10 border-[#C9A66B] text-[#8C6226] dark:text-[#E5CBA2]"
                        : "bg-card border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="font-bold text-xs">Original Start Date</span>
                    <span className="text-[10px] opacity-80">
                      {formatKolkataDateString(
                        editModalWarranty.warrantyStartDate || editModalWarranty.purchaseDate
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCalculateFrom("TODAY")}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      calculateFrom === "TODAY"
                        ? "bg-[#C9A66B]/10 border-[#C9A66B] text-[#8C6226] dark:text-[#E5CBA2]"
                        : "bg-card border-border text-muted hover:text-foreground"
                    }`}
                  >
                    <span className="font-bold text-xs">Today (Extend From Now)</span>
                    <span className="text-[10px] opacity-80">{formatKolkataDateString(new Date())}</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Box */}
              {liveCalc && (
                <div className="p-3.5 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#C9A66B]" />
                      Live Expiry Preview
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        liveCalc.isExtended
                          ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                          : liveCalc.isReduced
                          ? "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                          : "bg-muted/20 text-muted"
                      }`}
                    >
                      {liveCalc.differenceText}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/90 font-mono flex items-center gap-2 flex-wrap">
                    <span className="line-through text-muted">
                      {formatKolkataDateString(editModalWarranty.warrantyExpiryDate)}
                    </span>
                    <span>&rarr;</span>
                    <span className="font-bold text-foreground">
                      {formatKolkataDateString(liveCalc.newExpiryDate)}
                    </span>
                    <span className="text-muted font-normal">({liveCalc.newDuration})</span>
                  </div>
                </div>
              )}

              {/* Reduction Warning & Confirmation Checkbox */}
              {liveCalc && liveCalc.isReduced && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">⚠️ This reduces the customer&apos;s warranty</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                        The new expiration date is earlier than the customer&apos;s existing warranty
                        period.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 border-t border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reductionConfirmed}
                      onChange={(e) => setReductionConfirmed(e.target.checked)}
                      className="w-4 h-4 accent-[#C9A66B] rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      I understand and confirm that this reduces the active warranty duration
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditModalWarranty(null)}
                disabled={editLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditWarranty}
                disabled={
                  editLoading ||
                  !durationValue ||
                  parseInt(durationValue, 10) <= 0 ||
                  hasNoChange ||
                  (liveCalc?.isReduced && !reductionConfirmed)
                }
                className="px-5 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A8813B] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {editLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : hasNoChange ? (
                  <span>No change to save</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Warranty Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer / Modal */}
      {historyModalWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Warranty Modification History</h2>
                  <p className="text-xs text-muted">
                    {historyModalWarranty.productName} • IMEI:{" "}
                    <span className="font-mono">{historyModalWarranty.imeiNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalWarranty(null)}
                className="text-muted hover:text-foreground transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History List */}
            <div className="space-y-3">
              {!Array.isArray(historyModalWarranty.changeHistory) ||
              historyModalWarranty.changeHistory.length === 0 ? (
                <div className="py-8 text-center text-muted text-xs">
                  No previous modification history recorded for this warranty.
                </div>
              ) : (
                [...historyModalWarranty.changeHistory]
                  .reverse()
                  .map((entry: any, idx: number) => {
                    const isIncrease = new Date(entry.newExpiry) > new Date(entry.oldExpiry);
                    return (
                      <div
                        key={entry.id || idx}
                        className="bg-tile border border-border rounded-xl p-4 text-xs space-y-2.5 transition"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {formatKolkataDateString(entry.changedAt)}
                            </span>
                            <span className="text-[10px] text-muted">by {entry.changedBy}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isIncrease
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {isIncrease ? "Extended" : "Adjusted"}
                          </span>
                        </div>

                        {/* Changes overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted block text-[10px]">Duration Change:</span>
                            <span className="font-semibold text-foreground">
                              {entry.oldDuration || "1 Year"} &rarr; {entry.newDuration}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted block text-[10px]">Expiry Date:</span>
                            <span className="font-mono text-foreground">
                              {formatKolkataDateString(entry.oldExpiry)} &rarr;{" "}
                              {formatKolkataDateString(entry.newExpiry)}
                            </span>
                          </div>
                        </div>

                        {/* Email Dispatch Info & Resend Action */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px]">
                          <span className="text-muted">
                            {entry.emailSent ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Updated Certificate Emailed
                              </span>
                            ) : (
                              <span className="text-[#8C6226] dark:text-[#E5CBA2] font-semibold">
                                Email notification sent
                              </span>
                            )}
                          </span>

                          <button
                            onClick={() =>
                              handleResendUpdateEmail(historyModalWarranty.id, entry.id)
                            }
                            disabled={resendLoadingId === entry.id}
                            className="px-2.5 py-1 rounded-lg bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 font-semibold text-[10px] inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            {resendLoadingId === entry.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            Resend Update Email
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setHistoryModalWarranty(null)}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-muted">Permanent removal from warranty registry.</p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to delete this warranty record?
              </p>
              <div className="text-[11px] text-muted space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Smartphone:</span>{" "}
                  {deleteModalWarranty.productName}
                </div>
                <div>
                  <span className="font-semibold text-foreground">IMEI:</span>{" "}
                  {deleteModalWarranty.imeiNumber}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Customer:</span>{" "}
                  {deleteModalWarranty.customerName} ({deleteModalWarranty.customerEmail})
                </div>
                <div>
                  <span className="font-semibold text-foreground">Order:</span> #
                  {deleteModalWarranty.order?.orderNumber || deleteModalWarranty.orderId}
                </div>
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium pt-1 border-t border-rose-500/20">
                ⚠️ This warranty certificate will be permanently erased. The customer will no longer see
                active warranty coverage for this IMEI.
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
