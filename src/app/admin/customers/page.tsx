"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Send,
  Lock,
  ShieldAlert,
  X,
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  Copy,
  Check,
  Filter,
  ArrowUpDown,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "USER";
  emailVerified: boolean;
  orderCount: number;
  totalSpent: number;
  registeredAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "CUSTOMER">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "orders" | "spent">("newest");

  // Modal States
  const [passwordModalUser, setPasswordModalUser] = useState<CustomerRecord | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<CustomerRecord | null>(null);

  // Password Management State
  const [tempPasswordInput, setTempPasswordInput] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordActionLoading, setPasswordActionLoading] = useState(false);
  const [revealedTempPassword, setRevealedTempPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Reset Link per-row loading state
  const [resetLinkSendingId, setResetLinkSendingId] = useState<string | null>(null);

  // Deletion State
  const [deleteActionLoading, setDeleteActionLoading] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");

  // Toast / Feedback State
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (sortBy) params.set("sortBy", sortBy);

      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data?.error || `Failed to fetch user directory (HTTP ${res.status})`;
        setError(errorMsg);
        setCustomers([]);
        return;
      }

      setCustomers(data.users || data.customers || []);
    } catch (e: any) {
      console.error("Failed to load user directory:", e);
      setError(e?.message || "Network error contacting server.");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, sortBy]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Generate strong temporary password helper
  const handleGenerateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%^&*";
    const all = upper + lower + numbers + symbols;

    let pwd = "";
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const shuffled = pwd
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    setTempPasswordInput(shuffled);
    setShowPasswordInput(true);
  };

  // Handle setting temporary password
  const handleSetTemporaryPassword = async () => {
    if (!passwordModalUser) return;

    try {
      setPasswordActionLoading(true);
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_TEMP_PASSWORD",
          newPassword: tempPasswordInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.temporaryPassword) {
        setRevealedTempPassword(data.temporaryPassword);
        showToast(`Temporary password set for ${passwordModalUser.name}`);
      } else {
        showToast(data.error || "Failed to set temporary password.", "error");
      }
    } catch {
      showToast("Network error contacting auth service.", "error");
    } finally {
      setPasswordActionLoading(false);
    }
  };

  // Handle sending password reset link directly
  const handleSendResetLink = async (user: CustomerRecord) => {
    try {
      setResetLinkSendingId(user.id);
      const res = await fetch(`/api/admin/users/${user.id}/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_RESET_LINK",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Reset link sent to ${user.email}`);
      } else {
        showToast(data.error || "Failed to dispatch password reset email.", "error");
      }
    } catch {
      showToast("Network error contacting email service.", "error");
    } finally {
      setResetLinkSendingId(null);
    }
  };

  // Handle deleting a user and related data
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;

    if (deleteConfirmEmail.trim().toLowerCase() !== deleteModalUser.email.toLowerCase()) {
      showToast("Confirmation email does not match.", "error");
      return;
    }

    try {
      setDeleteActionLoading(true);
      const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || `User ${deleteModalUser.name} deleted successfully.`);
        setDeleteModalUser(null);
        setDeleteConfirmEmail("");
        // Remove immediately from local state
        setCustomers((prev) => prev.filter((c) => c.id !== deleteModalUser.id));
      } else {
        showToast(data.error || "Failed to delete user account.", "error");
      }
    } catch {
      showToast("Network error contacting server.", "error");
    } finally {
      setDeleteActionLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!revealedTempPassword) return;
    navigator.clipboard.writeText(revealedTempPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  // Filter & Search counts
  const totalCount = customers.length;
  const adminCount = useMemo(() => customers.filter((c) => c.role === "ADMIN").length, [customers]);
  const userCount = totalCount - adminCount;

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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground">User Accounts Directory</h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30">
                {totalCount} Total
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Manage verified customer and administrator accounts, order totals, credentials, and access permissions.
            </p>
          </div>
        </div>

        <button
          onClick={loadCustomers}
          disabled={loading}
          className="p-2.5 bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] rounded-xl transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
          title="Refresh Directory"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-bold">Failed to load user records</div>
              <div className="text-[11px] opacity-90">{error}</div>
            </div>
          </div>
          <button
            onClick={loadCustomers}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer shadow-xs"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name, email, or mobile..."
            className="w-full pl-10 pr-9 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-muted hover:text-foreground transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter and Sort Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter Tabs */}
          <div className="flex items-center bg-card border border-border rounded-xl p-1 text-xs">
            <button
              onClick={() => setRoleFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                roleFilter === "ALL"
                  ? "bg-[#C9A66B] text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setRoleFilter("ADMIN")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                roleFilter === "ADMIN"
                  ? "bg-[#C9A66B] text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admins
            </button>
            <button
              onClick={() => setRoleFilter("CUSTOMER")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                roleFilter === "CUSTOMER"
                  ? "bg-[#C9A66B] text-white shadow-xs"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Customers
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex items-center bg-card border border-border rounded-xl px-2.5 py-1.5 text-xs text-muted">
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-[#C9A66B]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-foreground text-xs focus:outline-none cursor-pointer pr-2 font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="orders">Most Orders</option>
              <option value="spent">Highest Spend</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email & Verification</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4 text-center">Role</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Total Spent</th>
                <th className="py-3.5 px-4 text-right">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-tile/80" />
                        <div className="h-4 w-28 bg-tile/80 rounded" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-40 bg-tile/80 rounded mb-1" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-24 bg-tile/80 rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-5 w-16 bg-tile/80 rounded-full mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-8 bg-tile/80 rounded mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 w-16 bg-tile/80 rounded ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 w-20 bg-tile/80 rounded ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-7 w-20 bg-tile/80 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        No user accounts match your filter
                      </div>
                      <p className="text-xs text-muted max-w-sm">
                        {search
                          ? `No registered accounts found matching "${search}".`
                          : "No accounts found under the selected category."}
                      </p>
                      {(search || roleFilter !== "ALL") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setRoleFilter("ALL");
                          }}
                          className="px-3.5 py-1.5 bg-[#C9A66B] text-white rounded-xl text-xs font-semibold transition hover:bg-[#B8914A] cursor-pointer shadow-xs"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isAdmin = c.role === "ADMIN";
                  const isPrimaryAdmin = c.email.toLowerCase() === "rrroyce20@gmail.com";
                  const initial = (c.name || "U").charAt(0).toUpperCase();

                  return (
                    <tr key={c.id} className="hover:bg-tile/50 transition">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isAdmin
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {isPrimaryAdmin && (
                                <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded-full font-bold">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted font-normal font-mono">
                              ID: {c.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Verification */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/90 font-mono text-[11px]">{c.email}</span>
                          {c.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <AlertCircle className="w-3 h-3" /> Unverified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mobile */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-muted">
                        {c.phone && c.phone !== "-" ? (
                          <span className="text-foreground/80">{c.phone}</span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            <UserIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Customer
                          </span>
                        )}
                      </td>

                      {/* Orders Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block font-mono font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                            c.orderCount > 0
                              ? "bg-tile text-foreground border border-border"
                              : "text-muted"
                          }`}
                        >
                          {c.orderCount}
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        {formatINR(c.totalSpent || 0)}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-right text-muted text-[11px] whitespace-nowrap">
                        {formatDateOnly(c.registeredAt)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Reset Link Action */}
                          <button
                            onClick={() => handleSendResetLink(c)}
                            disabled={resetLinkSendingId === c.id}
                            className="p-1.5 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Send Password Reset Link by Email (30 min expiry)"
                          >
                            {resetLinkSendingId === c.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Set Temporary Password Button */}
                          <button
                            onClick={() => {
                              setPasswordModalUser(c);
                              setTempPasswordInput("");
                              setShowPasswordInput(false);
                              setRevealedTempPassword(null);
                            }}
                            className="p-1.5 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/20 rounded-lg transition-colors cursor-pointer"
                            title="Set Temporary Password (must change on next login)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button (Disabled / Protected for Admin Accounts) */}
                          {!isAdmin && (
                            <button
                              onClick={() => {
                                setDeleteModalUser(c);
                                setDeleteConfirmEmail("");
                              }}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Delete Customer Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* MODAL 1: Set Temporary Password */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Set Temporary Password</h2>
                  <p className="text-xs text-muted">
                    For user <strong className="text-foreground">{passwordModalUser.name}</strong> ({passwordModalUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPasswordModalUser(null);
                  setRevealedTempPassword(null);
                }}
                className="text-muted hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If password was generated and revealed */}
            {revealedTempPassword ? (
              <div className="space-y-4 pt-1">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Temporary Password Created Successfully
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">
                    Copy and share this password securely with the user. It will{" "}
                    <strong className="text-rose-600 dark:text-rose-400">NEVER</strong> be displayed again, and the user will be prompted to set a new password upon their next login.
                  </p>

                  <div className="flex items-center justify-between gap-3 bg-card border border-border rounded-xl p-3">
                    <span className="font-mono text-sm font-bold text-foreground tracking-wider select-all">
                      {revealedTempPassword}
                    </span>
                    <button
                      onClick={handleCopyPassword}
                      className="px-3 py-1.5 bg-[#C9A66B] hover:bg-[#B8914A] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      {copiedPassword ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setPasswordModalUser(null);
                      setRevealedTempPassword(null);
                    }}
                    className="px-4 py-2 bg-[#C9A66B] hover:bg-[#B8914A] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateStrongPassword}
                      className="text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Generate Strong
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordInput ? "text" : "password"}
                      value={tempPasswordInput}
                      onChange={(e) => setTempPasswordInput(e.target.value)}
                      placeholder="Leave empty to auto-generate, or type 6+ chars..."
                      className="w-full pr-10 pl-3.5 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:border-[#C9A66B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordInput(!showPasswordInput)}
                      className="absolute right-3 top-2.5 text-muted hover:text-foreground transition cursor-pointer"
                    >
                      {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    The password will be hashed using PBKDF2/SHA-512 before saving. Any active sessions for this account will be revoked immediately.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                  <button
                    onClick={() => setPasswordModalUser(null)}
                    disabled={passwordActionLoading}
                    className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetTemporaryPassword}
                    disabled={passwordActionLoading}
                    className="px-4 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {passwordActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Set & Show Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Delete User Confirmation Modal with Typed Email Match */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Delete Customer Account</h2>
                <p className="text-xs text-muted">
                  Permanent removal of user account and credentials.
                </p>
              </div>
              <button
                onClick={() => setDeleteModalUser(null)}
                className="text-muted hover:text-foreground transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Details */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to delete this customer?
              </p>
              <div className="text-[11px] text-muted space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Name:</span> {deleteModalUser.name}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Email:</span> {deleteModalUser.email}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Total Orders:</span> {deleteModalUser.orderCount}
                </div>
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium pt-1 border-t border-rose-500/20">
                ⚠️ In-flight orders block deletion. Completed/cancelled orders and warranties are safely anonymized so business financial and device records are preserved.
              </p>
            </div>

            {/* Email Confirmation Requirement */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Type <strong className="text-rose-600 dark:text-rose-400 font-mono">{deleteModalUser.email}</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={deleteModalUser.email}
                className="w-full px-3.5 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setDeleteModalUser(null)}
                disabled={deleteActionLoading}
                className="px-4 py-2 border border-border text-foreground text-xs font-semibold rounded-xl hover:bg-tile transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={
                  deleteActionLoading ||
                  deleteConfirmEmail.trim().toLowerCase() !== deleteModalUser.email.toLowerCase()
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {deleteActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Permanently Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
