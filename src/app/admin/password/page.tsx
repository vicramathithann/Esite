"use client";

import React, { useState, useEffect } from "react";
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
  Mail,
  Send,
} from "lucide-react";

const ADMIN_EMAIL = "rrroyce20@gmail.com";

export default function AdminChangePasswordPage() {
  const [activeTab, setActiveTab] = useState<"standard" | "forgot">("standard");

  // Tab 1: Standard Password Change States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tab 2: Admin Forgot Password States (Email Reset Link)
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [linkDispatched, setLinkDispatched] = useState(false);

  // Shared States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCooldown]);

  const switchTab = (tab: "standard" | "forgot") => {
    setError(null);
    setSuccess(null);
    setActiveTab(tab);
  };

  // -------------------------------------------------------------------
  // TAB 1: Standard Password Change (Current Password + New Password)
  // -------------------------------------------------------------------
  const handleStandardSubmit = async (e: React.FormEvent) => {
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

  // -------------------------------------------------------------------
  // TAB 2: Admin Forgot Password - Send Reset Link to rrroyce20@gmail.com
  // -------------------------------------------------------------------
  const handleSendResetLink = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/auth/forgot-password/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });

      const data = await res.json();
      if (data.success) {
        setLinkDispatched(true);
        setForgotCooldown(data.cooldown || 60);
        setSuccess(
          data.message ||
            `A secure password reset link has been dispatched to ${ADMIN_EMAIL}.`
        );
      } else {
        setError(data.error || "Failed to dispatch password reset link.");
        if (data.cooldown) setForgotCooldown(data.cooldown);
      }
    } catch (err) {
      console.error("Send forgot password link error:", err);
      setError("Network error communicating with authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
              Securely update credentials or recover access with PBKDF2/SHA-512 cryptographic encryption.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Root Admin: {ADMIN_EMAIL}</span>
        </div>
      </div>

      {/* Main Password Management Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => switchTab("standard")}
            className={`flex-1 pb-3 text-xs font-bold transition-all relative flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "standard"
                ? "text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Change Password</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("forgot")}
            className={`flex-1 pb-3 text-xs font-bold transition-all relative flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "forgot"
                ? "text-[#8C6226] dark:text-[#E5CBA2] border-b-2 border-[#C9A66B]"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Forgot Password (Reset Link)</span>
          </button>
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

        {/* ---------------------------------------------------------------- */}
        {/* TAB 1: STANDARD PASSWORD CHANGE */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "standard" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
                Update Administrator Password
              </h2>
              <p className="text-xs text-muted mt-1">
                Enter your current administrator password followed by your desired new password.
              </p>
            </div>

            <form onSubmit={handleStandardSubmit} className="space-y-5">
              {/* Current Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTab("forgot")}
                    className="text-[11px] font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Forgot current password? Reset via email link →
                  </button>
                </div>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs cursor-pointer"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs cursor-pointer"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Details */}
              <div className="p-3.5 bg-tile/60 border border-border rounded-xl text-[11px] text-muted space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" />
                  Cryptographic Policy:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-muted/90 pl-1">
                  <li>PBKDF2-HMAC-SHA512 key derivation with 100,000 rounds.</li>
                  <li>Bound strictly to root administrator ({ADMIN_EMAIL}).</li>
                  <li>Rate-limited to 5 change attempts per 5 minutes.</li>
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
        )}

        {/* ---------------------------------------------------------------- */}
        {/* TAB 2: ADMIN FORGOT PASSWORD (EMAIL RESET LINK) */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "forgot" && (
          <div className="space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C9A66B] dark:text-[#D4B483]" />
                Admin Password Recovery (Email Reset Link)
              </h2>
              <p className="text-xs text-muted mt-1">
                Dispatches an encrypted, single-use password reset link directly to your authorized administrator inbox.
              </p>
            </div>

            {/* Admin Identity Card */}
            <div className="p-3.5 bg-tile/60 border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Authorized Administrator
                </span>
                <span className="text-xs font-bold text-foreground">
                  {ADMIN_EMAIL}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[#8C6226] dark:text-[#E5CBA2] text-[10px] font-bold">
                🔒 Restricted Access
              </span>
            </div>

            {/* Link Dispatched Confirmation Card */}
            {linkDispatched && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs text-emerald-600 dark:text-emerald-400">
                <div className="font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Password Reset Link Dispatched</span>
                </div>
                <p className="text-muted leading-relaxed">
                  We have dispatched a single-use password reset link to{" "}
                  <strong className="text-foreground">{ADMIN_EMAIL}</strong>. The link expires in 60 minutes.
                </p>
                <p className="text-[11px] text-muted">
                  Please check your email inbox and click the &quot;Set New Administrator Password&quot; button to establish your new credentials.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-xs text-muted leading-relaxed">
                Click the button below to generate a secure recovery link. When you click the link in your email, you will be taken to a secure page to set and confirm your new password.
              </p>

              <button
                type="button"
                onClick={handleSendResetLink}
                disabled={loading || forgotCooldown > 0}
                className="w-full py-3 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching Password Reset Link...</span>
                  </>
                ) : forgotCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Resend Link Available in {forgotCooldown}s</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{linkDispatched ? "Resend Password Reset Link" : "Send Password Recovery Link to " + ADMIN_EMAIL}</span>
                  </>
                )}
              </button>

              <div className="p-3.5 bg-tile/60 border border-border rounded-xl text-[11px] text-muted space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#C9A66B] dark:text-[#D4B483]" />
                  Security Specifications:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-muted/90 pl-1">
                  <li>Single-use cryptographic token (invalidated upon submission).</li>
                  <li>Link valid for 60 minutes (1 hour).</li>
                  <li>No OTP required — simply click the link in your email to reset.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
