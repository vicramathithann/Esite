"use client";

import React, { useState } from "react";
import AdminNav from "@/components/AdminNav";
import { useApp } from "@/context/AppContext";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

export default function AdminChangePasswordPage() {
  const { currentUser } = useApp();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password cannot be identical to your current password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Administrator password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to change administrator password.");
      }
    } catch (err) {
      console.error("Change password error:", err);
      setError("Network error communicating with authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <AdminNav />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/10 border border-[#C9A66B]/20 flex items-center justify-center text-[#8C6226] dark:text-[#E5CBA2]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Administrator Security & Password</h1>
              <p className="text-xs text-muted">
                Securely update your store administrator credentials with PBKDF2/SHA-512 cryptographic encryption.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Root Admin: {currentUser?.email || "rrroyce20@gmail.com"}</span>
          </div>
        </div>

        {/* Change Password Form Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
              Update Administrator Password
            </h2>
            <p className="text-xs text-muted mt-1">
              Ensure you choose a strong password. This password grants full administrative control over orders, inventory, and store settings.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current admin password"
                  required
                  className="w-full px-3.5 py-2.5 bg-tile/70 border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-tile/70 border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new admin password"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 bg-tile/70 border border-border rounded-xl text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-[#C9A66B] focus:ring-2 focus:ring-[#C9A66B]/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-3.5 bg-tile/60 border border-border rounded-xl text-[11px] text-muted space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" />
                Password Protection Details:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-muted/90 pl-1">
                <li>Salted PBKDF2-HMAC-SHA512 key derivation with 100,000 iterations.</li>
                <li>Single administrator restriction strictly binds administrative power to {currentUser?.email || "rrroyce20@gmail.com"}.</li>
                <li>Rate-limited to 5 change attempts per 5 minutes to prevent automated abuse.</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Administrator Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

