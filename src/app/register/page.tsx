"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, RefreshCw, CheckCircle2, User } from "lucide-react";
import { isValidInternalRedirect } from "@/lib/redirect";

function getFriendlyReasonMessage(reason: string | null): string {
  switch (reason) {
    case "OTP_STORE_FAILED":
      return "Database configuration needed: The email_otps table is missing or pending schema reload in Supabase. Please run the SQL migration in your Supabase SQL Editor.";
    case "MISSING_ENV":
      return "Email credentials missing: Please verify GMAIL_USER and GMAIL_APP_PASSWORD are set in your Vercel Project Settings.";
    case "EAUTH":
      return "Gmail authentication failed (invalid email or app password). Please verify your 16-character Google App Password in Vercel.";
    case "SMTP_CONNECTION":
    case "ETIMEDOUT":
      return "Connection to Google mail servers timed out. Please click Resend Code to try again.";
    case "SEND_FAILED":
      return "Email delivery failed. Please click Resend Code or enter code manually.";
    default:
      return "Our mail gateway could not reach your inbox. Check your spam folder or retry below.";
  }
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const safeRedirect = isValidInternalRedirect(redirectParam);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Username Validation State
  const [usernameCheck, setUsernameCheck] = useState<{
    status: "idle" | "checking" | "available" | "unavailable";
    reason: string | null;
    message: string | null;
  }>({ status: "idle", reason: null, message: null });

  // Email delivery failure & resend code state
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [deliveryReason, setDeliveryReason] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Live countdown timer for the 60-second resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Debounced Live Username Availability Check (400ms)
  useEffect(() => {
    const clean = formData.name.trim();
    if (!clean) {
      setUsernameCheck({ status: "idle", reason: null, message: null });
      return;
    }

    if (clean.length < 3) {
      setUsernameCheck({
        status: "unavailable",
        reason: "too short",
        message: "Username must be at least 3 characters long.",
      });
      return;
    }

    setUsernameCheck((prev) => ({ ...prev, status: "checking" }));
    const timeout = setTimeout(async () => {
      try {
        const queryUrl = `/api/invite/check-username?name=${encodeURIComponent(clean)}${
          formData.email ? `&email=${encodeURIComponent(formData.email.trim())}` : ""
        }`;
        const res = await fetch(queryUrl);
        const data = await res.json();
        if (data.available) {
          setUsernameCheck({ status: "available", reason: null, message: "Username is available" });
        } else {
          setUsernameCheck({
            status: "unavailable",
            reason: data.reason || "taken",
            message: data.message || "Username already taken",
          });
        }
      } catch {
        setUsernameCheck({ status: "idle", reason: null, message: null });
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [formData.name, formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.name.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (usernameCheck.status === "unavailable") {
      setError(usernameCheck.message || "Please choose an available username.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please retype your password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResendNotice(null);

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        if (data.emailSent === false || data.emailDeliveryFailed) {
          setEmailDeliveryFailed(true);
          setDeliveryReason(data.reason || null);
          setResendCooldown(60);
          setError(data.message || "Your account was created, but we could not deliver the verification code to your email. Click Resend Code below.");
        } else {
          const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(safeRedirect)}` : "";
          router.push(`/verify-email?email=${encodeURIComponent(formData.email.trim())}${redirectQuery}`);
        }
      } else {
        if (data.emailDeliveryFailed || res.status === 502) {
          setEmailDeliveryFailed(true);
          setDeliveryReason(data.reason || null);
          setResendCooldown(60);
          setError(data.error || "Your account was created, but we could not deliver the verification code to your email. Click Resend Code below.");
        } else {
          setError(data.error || "Registration failed. Please check your details.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during account creation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resending || !formData.email.trim()) return;

    try {
      setResending(true);
      setError(null);
      setResendNotice(null);

      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();
      if (data.success && data.emailSent !== false) {
        setResendNotice(data.message || `A new 6-digit verification code was dispatched to ${formData.email}.`);
        setResendCooldown(data.cooldown || 60);
      } else {
        setDeliveryReason(data.reason || null);
        setError(data.error || "Could not resend verification code. Please try again.");
        if (data.cooldown) {
          setResendCooldown(data.cooldown);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to reach server. Please check your internet connection.");
    } finally {
      setResending(false);
    }
  };

  const loginHref = redirectParam
    ? `/login?redirect=${encodeURIComponent(safeRedirect)}`
    : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center pt-8 pb-16 px-4">
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

      {/* Registration Box */}
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-1.5">Create Account</h1>
        <p className="text-xs text-muted mb-5 leading-relaxed">
          A 6-digit verification code will be sent to your email address (valid for 5 minutes).
        </p>

        {/* Actionable Email Delivery Warning with Resend & Direct Verification Actions */}
        {emailDeliveryFailed && (
          <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2.5">
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>Verification email could not be delivered</span>
              {deliveryReason && (
                <span className="ml-auto px-1.5 py-0.5 font-mono text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded">
                  {deliveryReason}
                </span>
              )}
            </div>
            <p className="text-muted leading-relaxed text-[11px]">
              {getFriendlyReasonMessage(deliveryReason)}
            </p>

            {resendNotice && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{resendNotice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || resending}
                className="px-3 py-1.5 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] text-[#FFFCFA] font-medium rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending..." : resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}
              </button>
              <Link
                href={`/verify-email?email=${encodeURIComponent(formData.email.trim())}${redirectParam ? `&redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
                className="px-3 py-1.5 border border-border text-foreground hover:bg-tile rounded-lg font-medium text-xs transition-colors"
              >
                Enter Code Manually →
              </Link>
            </div>
          </div>
        )}

        {error && !emailDeliveryFailed && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#C9A66B]" />
                <span>Name (Username)</span>
              </label>
              <span className="text-[10px] text-muted">Unique handle</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted font-bold text-xs">
                @
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. johndoe or techlover"
                autoComplete="username"
                className={`w-full bg-tile border text-foreground rounded-xl pl-8 pr-10 py-2.5 text-sm focus:outline-none transition-all placeholder:text-muted ${
                  usernameCheck.status === "unavailable"
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                    : usernameCheck.status === "available"
                    ? "border-emerald-500 focus:border-emerald-500 ring-1 ring-emerald-500/20"
                    : "border-border focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20"
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {usernameCheck.status === "checking" && (
                  <div className="w-3.5 h-3.5 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin" />
                )}
                {usernameCheck.status === "available" && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {usernameCheck.status === "unavailable" && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>

            {/* Username feedback message */}
            {usernameCheck.status === "unavailable" ? (
              <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{usernameCheck.message}</span>
              </p>
            ) : usernameCheck.status === "available" ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>✓ Username is available</span>
              </p>
            ) : (
              <p className="text-[10px] text-muted">
                Must be unique across VN Mobiles. Letters, numbers, dot, and underscore allowed (3–20 characters).
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Email address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@example.com"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Phone number (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Confirm password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Re-type your password"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <button
            type="submit"
            disabled={loading || usernameCheck.status === "checking" || usernameCheck.status === "unavailable"}
            className="w-full py-3.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs mt-2 disabled:opacity-50 text-xs"
          >
            <span>{loading ? "Creating account..." : "Continue to Verification"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-muted">
          Already have an account?{" "}
          <Link href={loginHref} className="text-[#8C6226] dark:text-[#E5CBA2] font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
