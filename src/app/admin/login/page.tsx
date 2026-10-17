"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

const ADMIN_EMAIL = "rrroyce20@gmail.com";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin/dashboard";

  const { login } = useApp();

  // Active tab: "password" | "otp" | "forgot"
  const [activeTab, setActiveTab] = useState<"password" | "otp" | "forgot">("password");

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Password Login State
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 2. OTP Login State
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);

  // 3. Forgot Password State
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotOtpCode, setForgotOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // Cooldown timer ticker
  useEffect(() => {
    if (loginOtpCooldown <= 0 && forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setLoginOtpCooldown((prev) => Math.max(0, prev - 1));
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [loginOtpCooldown, forgotCooldown]);

  // Tab switcher helper
  const switchTab = (tab: "password" | "otp" | "forgot") => {
    setError(null);
    setSuccess(null);
    setActiveTab(tab);
  };

  // -------------------------------------------------------------
  // TAB 1: Password Sign In
  // -------------------------------------------------------------
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your administrator password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password,
          requiredRole: "ADMIN",
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        setSuccess("Administrator authenticated. Accessing control desk...");
        setTimeout(() => {
          router.replace(redirectTarget.startsWith("/admin") ? redirectTarget : "/admin/dashboard");
        }, 600);
      } else {
        setError(data.error || "Invalid administrator credentials. Please try again.");
      }
    } catch {
      setError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: Admin OTP Login
  // -------------------------------------------------------------
  const handleSendLoginOtp = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/auth/login-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ADMIN_EMAIL }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpStep("verify");
        setLoginOtpCooldown(data.cooldown || 60);
        setSuccess(data.message || `A 6-digit login code has been sent to ${ADMIN_EMAIL}`);
      } else {
        setError(data.error || "Failed to dispatch administrator login code.");
        if (data.cooldown) setLoginOtpCooldown(data.cooldown);
      }
    } catch {
      setError("Network error requesting login code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtpCode.trim()) {
      setError("Please enter the 6-digit code received in your email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/auth/login-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          otp: loginOtpCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        setSuccess("Administrator verified successfully via OTP. Redirecting...");
        setTimeout(() => {
          router.replace(redirectTarget.startsWith("/admin") ? redirectTarget : "/admin/dashboard");
        }, 600);
      } else {
        setError(data.error || "Invalid or expired login code.");
      }
    } catch {
      setError("Network error verifying login code.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: Admin Forgot Password
  // -------------------------------------------------------------
  const handleSendForgotOtp = async () => {
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
        setForgotStep("verify");
        setForgotCooldown(data.cooldown || 60);
        setSuccess(data.message || `Password recovery code dispatched to ${ADMIN_EMAIL}`);
      } else {
        setError(data.error || "Failed to send password recovery code.");
        if (data.cooldown) setForgotCooldown(data.cooldown);
      }
    } catch {
      setError("Network error sending recovery code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtpCode.trim()) {
      setError("Please enter the 6-digit recovery code from your email.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/admin/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          otp: forgotOtpCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("Admin password reset successfully! You can now sign in with your new password.");
        setPassword(newPassword);
        setForgotOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          switchTab("password");
        }, 1800);
      } else {
        setError(data.error || "Failed to reset administrator password.");
      }
    } catch {
      setError("Network error resetting password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-foreground flex flex-col items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#C9A66B] to-[#E5CBA2] flex items-center justify-center mx-auto shadow-lg shadow-[#C9A66B]/20 text-[#0b0f19]">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#C9A66B] text-[11px] font-bold uppercase tracking-wider mb-1">
              Restricted Gateway
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Admin Control Desk
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              VN Mobiles Store Administration Portal
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#0b0f19] p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchTab("password")}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                activeTab === "password"
                  ? "bg-[#C9A66B] text-[#0b0f19] font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => switchTab("otp")}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                activeTab === "otp"
                  ? "bg-[#C9A66B] text-[#0b0f19] font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => switchTab("forgot")}
              className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center ${
                activeTab === "forgot"
                  ? "bg-[#C9A66B] text-[#0b0f19] font-bold shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Forgot
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-400 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-400 text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{success}</div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 1: Password Sign In */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Admin Account
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={ADMIN_EMAIL}
                    readOnly
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0b0f19]/70 border border-slate-800 rounded-xl text-xs text-slate-300 cursor-not-allowed select-none font-medium"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-[#C9A66B]/15 text-[#C9A66B] px-2 py-0.5 rounded-full font-bold">
                    Admin
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTab("forgot")}
                    className="text-[11px] text-[#C9A66B] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password..."
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0b0f19] border border-slate-800 focus:border-[#C9A66B] rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#0b0f19] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating Admin...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchTab("otp")}
                  className="text-xs text-slate-400 hover:text-[#C9A66B] transition-colors cursor-pointer"
                >
                  Or sign in using <strong>One-Time Email Code (OTP)</strong> →
                </button>
              </div>
            </form>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: Admin OTP Login */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "otp" && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0b0f19] rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>Passwordless Admin Sign-In</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Sign in securely with a temporary 6-digit code sent directly to your registered administrator email: <strong className="text-slate-200">{ADMIN_EMAIL}</strong>.
                </p>
              </div>

              {otpStep === "request" ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSendLoginOtp}
                    disabled={loading || loginOtpCooldown > 0}
                    className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-[#0b0f19] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Dispatching OTP...</span>
                      </>
                    ) : loginOtpCooldown > 0 ? (
                      <span>Resend available in {loginOtpCooldown}s</span>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Login Code to {ADMIN_EMAIL}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Enter 6-Digit Login Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      autoFocus
                      required
                      className="w-full py-3 px-4 text-center tracking-[8px] font-mono font-bold text-lg bg-[#0b0f19] border border-slate-800 focus:border-[#C9A66B] rounded-xl text-white placeholder:text-slate-700 focus:outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-[#0b0f19] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Access Dashboard</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={loginOtpCooldown > 0 || loading}
                      className="hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      {loginOtpCooldown > 0 ? `Resend code (${loginOtpCooldown}s)` : "Resend OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep("request")}
                      className="hover:text-[#C9A66B] cursor-pointer"
                    >
                      Change method
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-2 text-center border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => switchTab("password")}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ← Back to Password Login
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: Admin Forgot Password */}
          {/* ------------------------------------------------------------- */}
          {activeTab === "forgot" && (
            <div className="space-y-4">
              <div className="p-3 bg-[#0b0f19] rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>Admin Password Recovery</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Reset your administrator password by verifying a 6-digit one-time code sent to: <strong className="text-slate-200">{ADMIN_EMAIL}</strong>.
                </p>
              </div>

              {forgotStep === "request" ? (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={loading || forgotCooldown > 0}
                    className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-[#0b0f19] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Dispatching Reset Code...</span>
                      </>
                    ) : forgotCooldown > 0 ? (
                      <span>Resend available in {forgotCooldown}s</span>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Send Recovery Code to {ADMIN_EMAIL}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyForgotOtp} className="space-y-3.5 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      6-Digit Recovery Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtpCode}
                      onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      autoFocus
                      required
                      className="w-full py-2.5 px-4 text-center tracking-[6px] font-mono font-bold text-base bg-[#0b0f19] border border-slate-800 focus:border-[#C9A66B] rounded-xl text-white placeholder:text-slate-700 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      New Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters..."
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-[#0b0f19] border border-slate-800 focus:border-[#C9A66B] rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password..."
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#0b0f19] border border-slate-800 focus:border-[#C9A66B] rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-[#0b0f19] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Update Admin Password</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1 text-slate-400">
                    <button
                      type="button"
                      onClick={handleSendForgotOtp}
                      disabled={forgotCooldown > 0 || loading}
                      className="hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      {forgotCooldown > 0 ? `Resend code (${forgotCooldown}s)` : "Resend code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotStep("request")}
                      className="hover:text-[#C9A66B] cursor-pointer"
                    >
                      Start over
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-2 text-center border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => switchTab("password")}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ← Back to Password Login
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back to storefront link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to VN Mobiles Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 font-medium">
          Loading Admin Portal...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
