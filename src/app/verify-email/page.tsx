"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2, RefreshCw, KeyRound, ShieldCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const { currentUser, login } = useApp();

  const [email, setEmail] = useState(emailParam || currentUser?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [status, setStatus] = useState<"idle" | "success" | "error" | "expired">("idle");
  const [message, setMessage] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Active cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-verify if ?token=... is present in URL
  useEffect(() => {
    if (tokenParam) {
      handleVerifyToken(tokenParam);
    }
  }, [tokenParam]);

  // Handle Token Verification
  const handleVerifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) return;
    setLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(tokenToVerify.trim())}`);
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message || "Your email has been verified successfully!");
        if (currentUser && data.user) {
          login({ ...currentUser, ...data.user, emailVerified: true });
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Verification link is invalid or expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to verify email token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification Form Submit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanEmail || cleanOtp.length !== 6) {
      setStatus("error");
      setMessage("Please enter a valid email and 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setStatus("idle");
    setMessage("");
    setRemainingAttempts(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        if (currentUser && data.user) {
          login({ ...currentUser, ...data.user, emailVerified: true });
        }
      } else {
        if (res.status === 410) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setMessage(data.error || "Invalid verification code.");
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
      }
    } catch {
      setStatus("error");
      setMessage("Unable to connect to verification server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Verification Code
  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStatus("error");
      setMessage("Please enter your email address to receive a new code.");
      return;
    }

    if (cooldown > 0) return;

    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("idle");
        setMessage("A fresh 6-digit verification code has been dispatched via MSG91.");
        setCooldown(60);
        setRemainingAttempts(null);
      } else {
        setStatus("error");
        setMessage(data.error || "Unable to resend verification code.");
        if (data.cooldownRemaining) {
          setCooldown(data.cooldownRemaining);
        }
      }
    } catch {
      setStatus("error");
      setMessage("Network error trying to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm">
        {/* Header Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            {status === "success" ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-accent" />
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2 tracking-tight">
          {status === "success" ? "Email Verified!" : "Email Verification"}
        </h1>

        <p className="text-xs text-muted text-center mb-6 leading-relaxed">
          {status === "success"
            ? "Your email address has been authenticated. You now have full access to VM Mobiles."
            : "Enter the 6-digit verification code sent to your email via MSG91 to activate your account."}
        </p>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-10 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
            <p className="text-muted font-medium text-sm">Verifying with MSG91 gateway...</p>
          </div>
        ) : status === "success" ? (
          /* Success Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-sm font-semibold text-emerald-500">{message}</p>
            </div>

            <Link
              href="/login"
              className="w-full py-3.5 px-4 bg-accent text-white hover:opacity-95 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs text-xs"
            >
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-tile hover:bg-tile/80 text-foreground text-xs font-semibold rounded-xl flex items-center justify-center transition-colors"
            >
              Continue to Storefront
            </Link>
          </div>
        ) : (
          /* OTP Form */
          <div>
            {/* Error Banner */}
            {(status === "error" || status === "expired") && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-red-500 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <p className="font-bold">{status === "expired" ? "Code Expired" : "Verification Error"}</p>
                  <p className="mt-0.5">{message}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="mt-1 font-semibold text-accent">
                      Remaining attempts: {remainingAttempts}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Email Address Field */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                  <span>Registered Email Address</span>
                  <span className="text-[10px] text-muted font-normal">Receiver of OTP</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-tile border border-border rounded-xl text-foreground text-xs placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                  <Mail className="w-4 h-4 text-muted absolute left-3 top-3" />
                </div>
              </div>

              {/* 6-Digit Code Field */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                  <span>6-Digit Verification Code</span>
                  <span className="text-[10px] text-accent font-normal">Valid for 10 minutes</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="• • • • • •"
                    className="w-full pl-9 pr-4 py-3 bg-tile border border-border rounded-xl text-foreground text-xl tracking-[0.5em] text-center font-mono placeholder:text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-muted absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6 || !email.trim()}
                className="w-full py-3.5 px-4 bg-accent hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <span>Verify Code & Activate Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Resend Cooldown Section */}
            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-xs text-muted mb-2.5">
                Didn&apos;t receive the email or code expired?
              </p>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0 || !email.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline disabled:text-muted disabled:cursor-not-allowed transition cursor-pointer"
              >
                {resending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching via MSG91...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend 6-Digit Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Link */}
        <div className="mt-6 text-center pt-4 border-t border-border">
          <Link href="/login" className="text-xs text-muted hover:text-foreground transition-colors">
            ← Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
