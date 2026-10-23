"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  KeyRound, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  ShieldCheck
} from "lucide-react";

function ForgotPasswordContent() {
  const router = useRouter();

  const [step, setStep] = useState<"request" | "verify">("request");
  const [adminLinkSent, setAdminLinkSent] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Active cooldown timer ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request Password Recovery Code
  const handleRequestReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      setRemainingAttempts(null);

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setCooldown(data.cooldown || 60);
        if (data.adminRecovery) {
          setAdminLinkSent(true);
          setSuccessMessage(
            data.message || `A secure password reset link has been dispatched to ${cleanEmail}. Please check your inbox.`
          );
        } else {
          // Display the OTP verification form ONLY after email has been sent successfully
          setStep("verify");
          setSuccessMessage(
            data.message || `Password recovery code has been sent to ${cleanEmail} (valid for 5 minutes).`
          );
        }
      } else {
        setError(data.error || "Unable to send recovery code. Please try again.");
        if (data.cooldown) {
          setCooldown(data.cooldown);
        }
      }
    } catch {
      setError("Network error while requesting recovery code. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend Recovery Code
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      setResending(true);
      setError(null);
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setCooldown(data.cooldown || 60);
        setSuccessMessage("A fresh 6-digit recovery code has been sent to your email.");
        setRemainingAttempts(null);
      } else {
        setError(data.error || "Failed to resend recovery code.");
        if (data.cooldown) {
          setCooldown(data.cooldown);
        }
      }
    } catch {
      setError("Network error attempting to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify Recovery OTP and Redirect to Login Page
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit recovery code sent to your email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setRemainingAttempts(null);

      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        setSuccessMessage(
          "Recovery code verified successfully! Taking you to the sign in page..."
        );
        // After user enters a valid OTP, redirect them to the login page
        setTimeout(() => {
          router.push(
            `/login?forgotVerified=true&email=${encodeURIComponent(cleanEmail)}&token=${encodeURIComponent(data.token)}`
          );
        }, 500);
      } else {
        setError(data.error || "Failed to verify recovery code. Please check and try again.");
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch {
      setError("Network error while verifying recovery code. Please try again.");
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
          <h1 className="text-2xl font-bold text-foreground">
            {step === "request" ? "Forgot Password" : "Verify Recovery Code"}
          </h1>
          <span className="text-[11px] px-2.5 py-1 bg-tile text-muted rounded-full font-medium flex items-center gap-1 border border-border">
            <ShieldCheck className="w-3 h-3 text-accent" /> Recovery
          </span>
        </div>

        <p className="text-xs text-muted mb-4 leading-relaxed">
          {step === "request"
            ? "Enter your registered email address to receive a secure 6-digit recovery code."
            : "Enter the 6-digit recovery code sent to your email to verify your account."}
        </p>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1">
              <span className="font-semibold">{error}</span>
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="mt-1 font-semibold text-[#8C6226] dark:text-[#E5CBA2]">
                  Remaining attempts: {remainingAttempts}
                </p>
              )}
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

        {/* ADMIN RECOVERY CONFIRMATION */}
        {adminLinkSent && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Secure Recovery Link Dispatched</span>
              </div>
              <p className="text-muted leading-relaxed">
                A secure password reset link has been dispatched to <strong className="text-foreground">{email}</strong>.
                Please check your inbox and click the link to set your new password and access your account.
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline disabled:text-muted disabled:cursor-not-allowed transition cursor-pointer"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend reset link in {cooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Password Reset Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Request Recovery Code Form */}
        {!adminLinkSent && step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">
                Registered Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. customer@example.com"
                  className="w-full bg-tile border border-border rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
                />
                <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Displayed ONLY after email has been sent successfully */}
        {!adminLinkSent && step === "verify" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            {/* Target Email Badge */}
            <div className="p-3 bg-tile border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-accent" />
                <span className="text-muted font-mono">{email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setOtp("");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[11px] text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-semibold cursor-pointer"
              >
                Change Email
              </button>
            </div>

            {/* 6-Digit Recovery OTP */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground">
                  6-Digit Recovery Code
                </label>
                <span className="text-[10px] text-[#8C6226] dark:text-[#E5CBA2] font-semibold">
                  Valid for 5 mins
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="w-full pl-9 pr-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xl tracking-[0.4em] text-center font-mono placeholder:text-muted focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all"
                />
                <KeyRound className="w-4 h-4 text-muted absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Code & Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Resend Cooldown Counter */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6226] dark:text-[#E5CBA2] hover:underline disabled:text-muted disabled:cursor-not-allowed transition cursor-pointer"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sending code...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend 6-Digit Code</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Back to Sign In */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <Link
            href="/login"
            className="text-xs text-muted hover:text-foreground font-medium transition-colors"
          >
            ← Remember your password? Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-sm font-bold text-muted">
        Loading...
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
