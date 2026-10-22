"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { formatINR, formatDateOnly } from "@/lib/formatters";

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  orderCount: number;
  totalSpent: number;
  registeredAt: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal States
  const [passwordModalUser, setPasswordModalUser] = useState<CustomerRecord | null>(null);
  const [deleteModalUser, setDeleteModalUser] = useState<CustomerRecord | null>(null);

  // Password Management State
  const [passwordTab, setPasswordTab] = useState<"SET_TEMP" | "FORCE_RESET">("SET_TEMP");
  const [tempPassword, setTempPassword] = useState("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [passwordActionLoading, setPasswordActionLoading] = useState(false);

  // Deletion State
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

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (e) {
      console.error("Failed to load customers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Helper to generate a random strong temporary password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pwd);
    setShowTempPassword(true);
  };

  // Handle setting temporary password
  const handleSetTemporaryPassword = async () => {
    if (!passwordModalUser) return;
    if (!tempPassword || tempPassword.trim().length < 6) {
      showToast("Password must be at least 6 characters long.", "error");
      return;
    }

    try {
      setPasswordActionLoading(true);
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_TEMP_PASSWORD",
          newPassword: tempPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Temporary password set for ${passwordModalUser.name}`);
        setPasswordModalUser(null);
        setTempPassword("");
      } else {
        showToast(data.error || "Failed to set temporary password.", "error");
      }
    } catch {
      showToast("Network error contacting auth service.", "error");
    } finally {
      setPasswordActionLoading(false);
    }
  };

  // Handle forcing password reset link email
  const handleForcePasswordReset = async () => {
    if (!passwordModalUser) return;

    try {
      setPasswordActionLoading(true);
      const res = await fetch(`/api/admin/users/${passwordModalUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FORCE_RESET_EMAIL",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Password reset link sent to ${passwordModalUser.email}`);
        setPasswordModalUser(null);
      } else {
        showToast(data.error || "Failed to dispatch password reset email.", "error");
      }
    } catch {
      showToast("Network error contacting email service.", "error");
    } finally {
      setPasswordActionLoading(false);
    }
  };

  // Handle deleting a user and related data
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;

    try {
      setDeleteActionLoading(true);
      const res = await fetch(`/api/admin/users/${deleteModalUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `User ${deleteModalUser.name} deleted successfully.`);
        setDeleteModalUser(null);
        await loadCustomers();
      } else {
        showToast(data.error || "Failed to delete user account.", "error");
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
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">User Accounts Directory</h1>
            <p className="text-xs text-muted">
              Manage registered accounts, reset credentials, dispatch reset emails, or delete inactive records.
            </p>
          </div>
        </div>

        <button
          onClick={loadCustomers}
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
          onKeyDown={(e) => e.key === "Enter" && loadCustomers()}
          placeholder="Search by user name, email, or mobile..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-tile/80 border-b border-border text-muted font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email & Verification</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Total Spent</th>
                <th className="py-3.5 px-4 text-right">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    Loading user records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted">
                    No user accounts found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isMainAdmin = c.email.toLowerCase() === "rrroyce20@gmail.com";
                  return (
                    <tr key={c.id} className="hover:bg-tile/50 transition">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {isMainAdmin && (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                              Super Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/90 font-mono text-[11px]">{c.email}</span>
                          {c.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                              <AlertCircle className="w-3 h-3" /> Unverified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted font-mono">
                        {c.phone || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-tile font-semibold text-foreground text-[11px]">
                          {c.orderCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        {formatINR(c.totalSpent)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted">
                        {formatDateOnly(c.registeredAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manage Password Button */}
                          <button
                            onClick={() => {
                              setPasswordModalUser(c);
                              setPasswordTab("SET_TEMP");
                              setTempPassword("");
                              setShowTempPassword(false);
                            }}
                            className="p-1.5 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/20 rounded-lg transition-colors cursor-pointer"
                            title="Password Management (Set Temporary or Send Reset Link)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button (Disabled for Main Admin) */}
                          {!isMainAdmin && (
                            <button
                              onClick={() => setDeleteModalUser(c)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                              title="Delete User and Related Data"
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

      {/* MODAL 1: Password Management Modal */}
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
                  <h2 className="text-base font-bold text-foreground">Password Management</h2>
                  <p className="text-xs text-muted">
                    User: <strong className="text-foreground">{passwordModalUser.name}</strong> ({passwordModalUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-muted hover:text-foreground transition p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cryptographic Security Notice */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>Cryptographic Security Standard:</strong> Existing passwords are salted and hashed with PBKDF2/SHA-512 (100,000 iterations). In compliance with zero-knowledge security standards, passwords can never be displayed in plain text.
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="grid grid-cols-2 gap-2 bg-tile p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setPasswordTab("SET_TEMP")}
                className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  passwordTab === "SET_TEMP"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-[#C9A66B]" />
                Set Temporary Password
              </button>
              <button
                onClick={() => setPasswordTab("FORCE_RESET")}
                className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  passwordTab === "FORCE_RESET"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Send className="w-3.5 h-3.5 text-[#C9A66B]" />
                Force Password Reset Link
              </button>
            </div>

            {/* Tab 1: Set Temporary Password */}
            {passwordTab === "SET_TEMP" && (
              <div className="space-y-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      New Temporary Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Generate Strong
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showTempPassword ? "text" : "password"}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Enter minimum 6 characters..."
                      className="w-full pr-10 pl-3.5 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:border-[#C9A66B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTempPassword(!showTempPassword)}
                      className="absolute right-3 top-2.5 text-muted hover:text-foreground transition cursor-pointer"
                    >
                      {showTempPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    The password will be immediately encrypted. Provide this password securely to the user so they can log in.
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
                    disabled={passwordActionLoading || !tempPassword}
                    className="px-4 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {passwordActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Update Temporary Password
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Force Password Reset Link Email */}
            {passwordTab === "FORCE_RESET" && (
              <div className="space-y-4 pt-1">
                <div className="bg-tile border border-border rounded-xl p-3.5 text-xs text-foreground/90 space-y-2">
                  <p className="font-semibold text-foreground">
                    Send Secure Password Reset Link
                  </p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    This dispatches a high-priority transactional email to <strong className="text-foreground">{passwordModalUser.email}</strong> via Gmail SMTP containing:
                  </p>
                  <ul className="text-[11px] text-muted list-disc list-inside space-y-1">
                    <li>A secure direct password reset link</li>
                    <li>No OTP code required — the user clicks the link to set their new password</li>
                    <li>Automatic 1-hour expiration with single-use protection</li>
                  </ul>
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
                    onClick={handleForcePasswordReset}
                    disabled={passwordActionLoading}
                    className="px-4 py-2 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {passwordActionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Dispatch Reset Link Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-rose-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Delete User Account</h2>
                <p className="text-xs text-muted">
                  Permanent removal of user identity and associated store records.
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Are you sure you want to permanently delete this user?
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
                ⚠️ All related orders, warranties, wishlist items, reviews, and transactional email history for this user will also be cleaned up. This action cannot be reversed.
              </p>
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
                disabled={deleteActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
