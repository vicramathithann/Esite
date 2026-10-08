"use client";

import React, { useState, useEffect } from "react";
import AdminNav from "@/components/AdminNav";
import {
  MailCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Mail,
  Send,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatDateOnly } from "@/lib/formatters";

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<{ total: number; sentCount: number; failedCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: logId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Email re-dispatched successfully!");
        await loadLogs();
      } else {
        alert(`Retry note: ${data.message || data.error || "Email failed"}`);
        await loadLogs();
      }
    } catch {
      alert("Error contacting email gateway");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MailCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MSG91 Transactional Email Logs</h1>
              <p className="text-xs text-slate-400">
                Connected Gmail (Integration ID: 832). Tracks order confirmations, verification emails, and warranty alerts.
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Total Email Events</span>
              <p className="text-2xl font-bold text-white mt-1">{stats?.total ?? 0}</p>
            </div>
            <Mail className="w-6 h-6 text-slate-500" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Delivered Successfully</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats?.sentCount ?? 0}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Failed / Pending Retry</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{stats?.failedCount ?? 0}</p>
            </div>
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadLogs()}
              placeholder="Search by recipient email, customer name, or subject..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="SENT">Sent Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="PENDING">Pending Only</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Email Type</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Error / Notes</th>
                  <th className="py-3.5 px-4">Sent Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading email logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No email log records found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{log.recipientName || "Customer"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{log.recipientEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {log.emailType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 max-w-xs truncate">
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            log.status === "SENT"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                        {log.errorMessage || (log.status === "SENT" ? "Delivered without errors" : "Awaiting retry")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {log.sentAt ? formatDateOnly(log.sentAt) : formatDateOnly(log.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
