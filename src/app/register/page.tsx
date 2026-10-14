"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
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

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        const redirectQuery = redirectParam ? `&redirect=${encodeURIComponent(safeRedirect)}` : "";
        router.push(`/verify-email?email=${encodeURIComponent(formData.email.trim())}${redirectQuery}`);
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

        {error && (
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
