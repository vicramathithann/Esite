"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { isValidInternalRedirect } from "@/lib/auth";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all required fields.");
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
        const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(safeRedirect)}` : "";
        router.push(`/verify-email?email=${encodeURIComponent(formData.email.trim())}${redirectQuery}`);
      } else if (data.emailDeliveryFailed || res.status === 502) {
        setEmailDeliveryFailed(true);
        setDeliveryReason(data.reason || null);
        setResendCooldown(60);
        setError(data.error || "Your account was created, but we could not deliver the verification code to your email. Click Resend Code below.");
        if (data.reason || data.details) {
          console.error("[Email Delivery Diagnostic]", {
            reason: data.reason,
            details: data.details,
          });
        }
      } else {
        setError(data.error || "Registration failed. Please check your details.");
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

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setResendNotice(data.message || `A new 6-digit verification code was dispatched to ${formData.email}.`);
        setResendCooldown(data.cooldown || 60);
      } else {
        setDeliveryReason(data.reason || null);
        setError(data.error || "Could not resend verification code. Please try again.");
        if (data.reason || data.details) {
          console.error("[Resend Email Diagnostic]", {
            reason: data.reason,
            details: data.details,
          });
        }
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
              Your account was created for <strong className="text-foreground">{formData.email}</strong>, but our mail gateway could not reach your inbox. Check your spam folder or retry below.
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
            <label className="font-semibold text-foreground">Your name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="First and last name"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Email</label>
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
            <label className="font-semibold text-foreground">Mobile number (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit mobile number"
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
            <span className="text-[10px] text-muted block">Passwords must be at least 6 characters.</span>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Confirm password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Re-enter your password"
              className="w-full bg-tile border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#C9A66B] dark:focus:border-[#D4B483] focus:ring-2 focus:ring-[#C9A66B]/20 dark:focus:ring-[#D4B483]/20 transition-all placeholder:text-muted"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-3 text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Continue to Email Verification"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          By creating an account, you agree to VN Mobiles Conditions of Use and Privacy Notice.
        </p>

        <div className="mt-5 pt-4 border-t border-border text-xs">
          <p className="text-muted">
            Already have an account?{" "}
            <Link href={loginHref} className="text-[#8C6226] dark:text-[#E5CBA2] hover:underline font-semibold">
              Sign in →
            </Link>
          </p>
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
