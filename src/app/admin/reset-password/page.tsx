"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  Clock,
} from "lucide-react";

const ADMIN_EMAIL = "rrroyce20@gmail.com";

function AdminResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const emailParam = (searchParams.get("email") || ADMIN_EMAIL).trim();

  // Token validation state
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenStatus, setTokenStatus] = useState<"VALID" | "EXPIRED" | "USED" | "INVALID" | "MISSING">("VALID");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number>(60);

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission states
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setTokenStatus("MISSING");
      setTokenError("No reset token provided in this link. Please use the exact link sent to your email.");
      return;
    }

    const verifyTokenOnLoad = async () => {
      try {
        setCheckingToken(true);
        const res = await fetch(`/api/admin/auth/forgot-password/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (data.valid) {
          setTokenStatus("VALID");
          setExpiresInMinutes(data.expiresInMinutes || 60);
          setTokenError(null);
        } else {
          setTokenStatus(data.status || "INVALID");
          setTokenError(data.error || "This reset link is invalid or has expired.");
        }
      } catch (err) {
        console.error("Token verification check error:", err);
        // Fallback: allow form submission to let POST handle it if GET fails due to network
        setTokenStatus("VALID");
      } finally {
        setCheckingToken(false);
      }
    };

    verifyTokenOnLoad();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!token) {
      setSubmitError("Missing recovery token. Please request a new link.");
      return;
    }

    if (newPassword.length < 8) {
      setSubmitError("New administrator password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(
          data.message ||
            "Administrator password updated successfully! Redirecting to sign in..."
        );
        setTimeout(() => {
          router.push("/admin/login");
        }, 1600);
      } else {
        setSubmitError(
          data.error || "Failed to reset password. The recovery link may have expired or already been used."
        );
        if (data.status === "USED" || data.status === "EXPIRED") {
          setTokenStatus(data.status);
        }
      }
    } catch {
      setSubmitError("Network error while communicating with authentication service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-center items-center p-4 selection:bg-[#C9A66B] selection:text-black">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#C9A66B]/15 border border-[#C9A66B]/30 flex items-center justify-center text-[#C9A66B] font-extrabold text-lg mb-3 shadow-lg shadow-[#C9A66B]/10">
          VN
        </div>
        <div className="flex items-center gap-2">
          <span className="font-extrabold tracking-tight text-lg text-white">
            VN MOBILES
          </span>
          <span className="w-2 h-2 rounded-full bg-[#C9A66B] animate-pulse"></span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#C9A66B] bg-[#C9A66B]/10 px-2 py-0.5 rounded-full border border-[#C9A66B]/20">
            ADMIN CONTROL DESK
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            🔒 RESTRICTED ACCESS
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#111625] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Gold Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C9A66B] via-[#E5CBA2] to-[#C9A66B]"></div>

        <div className="mb-5 pb-4 border-b border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#C9A66B]" />
              Set New Administrator Password
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Account: <strong className="text-slate-200">{emailParam}</strong>
            </p>
          </div>
          {tokenStatus === "VALID" && !checkingToken && (
            <span className="shrink-0 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Link Active
            </span>
          )}
        </div>

        {/* 1. INITIAL CHECKING SPINNER */}
        {checkingToken && (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-6 h-6 text-[#C9A66B] animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Verifying password recovery link...</span>
          </div>
        )}

        {/* 2. SPECIFIC ERROR CARD: ALREADY USED */}
        {!checkingToken && tokenStatus === "USED" && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Password Reset Link Already Used</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                This reset link has already been used to update your credentials. For security, each link is single-use and expires immediately after use.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/admin/login"
                className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Go to Admin Sign In</span>
              </Link>
            </div>
          </div>
        )}

        {/* 3. SPECIFIC ERROR CARD: EXPIRED */}
        {!checkingToken && tokenStatus === "EXPIRED" && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-rose-400 flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Password Reset Link Expired</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                This reset link has expired. Links remain valid for 1 hour from dispatch. Please request a fresh link below.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/admin/login"
                className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Request a Fresh Reset Link</span>
              </Link>
            </div>
          </div>
        )}

        {/* 4. SPECIFIC ERROR CARD: INVALID OR MISSING */}
        {!checkingToken && (tokenStatus === "INVALID" || tokenStatus === "MISSING") && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Invalid Recovery Link</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {tokenError || "This recovery link is invalid or has been superseded by a newer request. Please request a new recovery link."}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Link
                href="/admin/login"
                className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] text-black font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Request New Password Reset Link</span>
              </Link>
            </div>
          </div>
        )}

        {/* 5. ACTIVE RESET FORM */}
        {!checkingToken && tokenStatus === "VALID" && (
          <>
            {/* Feedback Alerts */}
            {submitError && (
              <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">{submitError}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Expiry Pill */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#0b0f19] px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C9A66B]" />
                  <span>Link valid for:</span>
                </span>
                <span className="font-semibold text-slate-200">{expiresInMinutes} minutes</span>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  New Administrator Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Confirm New Administrator Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new administrator password"
                    required
                    minLength={8}
                    className="w-full px-3.5 py-2.5 bg-[#0b0f19] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C9A66B] transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Cryptographic Security Details */}
              <div className="p-3 bg-[#0b0f19] border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#C9A66B]" />
                  Security Baseline:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li>Salted PBKDF2-HMAC-SHA512 key derivation with 100,000 iterations.</li>
                  <li>Single-use recovery token invalidates immediately upon completion.</li>
                  <li>Strictly authorized for root administrator ({ADMIN_EMAIL}).</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || !confirmPassword}
                className="w-full py-2.5 px-4 bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-black font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Administrator Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Update Administrator Password</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Back Link */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <Link
            href="/admin/login"
            className="text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Admin Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center text-xs">
          Loading recovery portal...
        </div>
      }
    >
      <AdminResetPasswordContent />
    </Suspense>
  );
}
