"use client";

import React, { useState, useEffect } from "react";
import {
  MailCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Mail,
  Trash2,
  ShieldAlert,
  X,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; sentCount: number; failedCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Deletion modals
  const [deleteSingleLog, setDeleteSingleLog] = useState<any | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);

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

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load email logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [statusFilter]);

  const handleRetry = async (logId: string) => {
    try {
      setRetryingId(logId);
      const res = await fetch("/api/admin/email-logs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: logId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Email re-dispatched successfully!");
        await loadLogs();
      } else {
        showToast(`Retry note: ${data.message || data.error || "Email failed"}`, "error");
        await loadLogs();
      }
    } catch {
      showToast("Error contacting email gateway", "error");
    } finally {
      setRetryingId(null);
    }
  };

  // Toggle single log selection
  const toggleSelectLog = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all visible
  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length && logs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(logs.map((l) => l.id));
    }
  };

  // 1. Delete single log
  const handleDeleteSingle = async () => {
    if (!deleteSingleLog) return;
    try {
      setDeleteActionLoading(true);
      const res = await fetch(`/api/admin/email-logs/${deleteSingleLog.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Email log deleted successfully.");
        setSelectedIds((prev) => prev.filter((id) => id !== deleteSingleLog.id));
        setDeleteSingleLog(null);
        await loadLogs();
      } else {
        showToast(data.error || "Failed to delete email log.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setDeleteActionLoading(false);
    }
  };

  // 2. Bulk delete selected logs
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setDeleteActionLoading(true);
      const res = await fetch("/api/admin/email-logs/bulk-delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `${selectedIds.length} email logs deleted.`);
        setSelectedIds([]);
        setShowBulkDeleteModal(false);
        await loadLogs();
      } else {
        showToast(data.error || "Failed to delete selected logs.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setDeleteActionLoading(false);
    }
  };

  // 3. Clear all logs
  const handleClearAll = async () => {
    try {
      setDeleteActionLoading(true);
      const res = await fetch("/api/admin/email-logs", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "All email logs cleared.");
        setSelectedIds([]);
        setShowClearAllModal(false);
        await loadLogs();
      } else {
        showToast(data.error || "Failed to clear email logs.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setDeleteActionLoading(false);
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
            <MailCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Transactional Email Logs</h1>
            <p className="text-xs text-muted">
              Gmail SMTP Delivery audit trail. Monitor, retry, delete, or clear email dispatches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Clear All Logs Button */}
          {logs.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              title="Clear all email log records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Logs
            </button>
          )}

          <button
            onClick={loadLogs}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs transition-colors duration-200">
          <div>
            <span className="text-xs text-muted">Total Email Events</span>
            <p className="text-2xl font-bold text-foreground mt-1">{stats?.total ?? 0}</p>
          </div>
          <Mail className="w-6 h-6 text-muted" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs transition-colors duration-200">
          <div>
            <span className="text-xs text-muted">Delivered Successfully</span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats?.sentCount ?? 0}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-xs transition-colors duration-200">
          <div>
            <span className="text-xs text-muted">Failed / Pending Retry</span>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{stats?.failedCount ?? 0}</p>
          </div>
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-2xl p-3 px-4 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="w-6 h-6 rounded-full bg-[#C9A66B] text-white flex items-center justify-center text-[11px]">
              {selectedIds.length}
            </span>
            <span>email log(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground font-medium transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadLogs()}
            placeholder="Search by recipient email, customer name, or subject..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border text-xs text-foreground rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C9A66B]"
        >
          <option value="all">All Delivery Statuses</option>
          <option value="SENT">Sent Only</option>
          <option value="FAILED">Failed Only</option>
          <option value="PENDING">Pending Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedIds.length === logs.length}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-border accent-[#C9A66B] cursor-pointer"
                    title="Select / Deselect all"
                  />
                </th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Email Type</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Error / Notes</th>
                <th className="py-3.5 px-4">Sent Time</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    Loading email logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No email log records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedIds.includes(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-tile/50 transition ${isSelected ? "bg-tile/70" : ""}`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLog(log.id)}
                          className="w-3.5 h-3.5 rounded border-border accent-[#C9A66B] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{log.recipientName || "Customer"}</div>
                        <div className="text-[11px] text-muted font-mono">{log.recipientEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tile text-foreground">
                          {log.emailType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground/90 max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            log.status === "SENT"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-muted max-w-xs truncate">
                        {log.errorMessage || (log.status === "SENT" ? "Delivered without errors" : "Awaiting retry")}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px]">
                        {log.sentAt ? formatDateOnly(log.sentAt) : formatDateOnly(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {log.status === "FAILED" && (
                            <button
                              onClick={() => handleRetry(log.id)}
                              disabled={retryingId === log.id}
                              className="px-2.5 py-1 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold rounded-lg text-[11px] inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                              title="Retry Email (Safe: No duplicate order created)"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingId === log.id ? "animate-spin" : ""}`} />
                              Retry
                            </button>
                          )}

                          {/* Delete Log Button */}
                          <button
                            onClick={() => setDeleteSingleLog(log)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete this email log"
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

      {/* MODAL 1: Delete Single Log Confirmation */}
      {deleteSingleLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Delete Email Log</h2>
                <p className="text-xs text-muted">Remove single audit record.</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to delete this log?
              </p>
              <div className="text-[11px] text-muted space-y-1">
                <div><span className="font-semibold text-foreground">Recipient:</span> {deleteSingleLog.recipientEmail}</div>
                <div><span className="font-semibold text-foreground">Type:</span> {deleteSingleLog.emailType}</div>
                <div><span className="font-semibold text-foreground">Subject:</span> {deleteSingleLog.subject}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setDeleteSingleLog(null)}
                disabled={deleteActionLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSingle}
                disabled={deleteActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Delete Selected Logs Confirmation */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Delete Selected Logs</h2>
                <p className="text-xs text-muted">Remove multiple email delivery records.</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-800 dark:text-rose-300">
              Are you sure you want to delete the <strong>{selectedIds.length}</strong> selected email log records? This action cannot be reversed.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={deleteActionLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleteActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete {selectedIds.length} Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Clear All Logs Confirmation */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Clear All Email Logs</h2>
                <p className="text-xs text-muted">Flush entire transactional email history.</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold">
                ⚠️ Warning: Are you sure you want to clear ALL transactional email logs?
              </p>
              <p className="text-[11px] text-muted">
                This will wipe out all delivery events, failure audits, and timestamps across the entire portal. This action is irreversible.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowClearAllModal(false)}
                disabled={deleteActionLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={deleteActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Yes, Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
