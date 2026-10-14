"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck 
} from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError("Missing or invalid password reset link. Please request a new link.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify and re-enter.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(
          "Your password has been successfully reset! Redirecting to sign in..."
        );
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setError(data.error || "Failed to reset password. The link may have expired.");
      }
    } catch {
      setError("Network error while resetting password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center pt-8 pb-16 px-4">
      {/* Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-200 group-hover:scale-105">
            VN
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            VN <span className="text-muted font-normal">Mobiles</span>
          </span>
        </div>
      </Link>

      {/* Main Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Set New Password</h1>
          <span className="text-[11px] px-2.5 py-1 bg-tile text-muted rounded-full font-medium flex items-center gap-1 border border-border">
            <ShieldCheck className="w-3 h-3 text-accent" /> Secure Link
          </span>
        </div>

        {email && (
          <div className="mb-4 p-3 bg-tile border border-border rounded-xl text-xs text-muted">
            Resetting password for: <strong className="text-foreground">{email}</strong>
          </div>
        )}

        {/* Missing Token Warning */}
        {!token && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500 space-y-3">
            <p className="font-semibold">
              No reset token found in your link.
            </p>
            <p className="text-muted">
              If you requested a password reset, please use the link in your email or enter your 6-digit code on the recovery page.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block px-3 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] rounded-lg font-semibold text-xs transition-all"
            >
              Go to Password Recovery →
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <span className="font-semibold">{error}</span>
              <div className="mt-2">
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] underline font-semibold"
                >
                  Request a fresh reset link →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-500 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Reset Form */}
        {token && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* New Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground">New Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || newPassword.length < 6 || !confirmPassword}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Set New Password</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Back to Sign In */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link
            href="/login"
            className="text-xs text-muted hover:text-foreground font-medium transition-colors"
          >
            ← Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-sm font-bold text-muted">
        Loading...
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

