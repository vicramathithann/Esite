"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles,
  User,
  ShoppingBag,
  HelpCircle
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const { currentUser, login, logout } = useApp();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string; role: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = emailOrPhone.trim();
    if (!identifier || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUnverifiedEmail(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: identifier, password }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        login(data.user);
        const isAdmin = data.user.role === "ADMIN";

        setSuccessInfo({
          name: data.user.name,
          role: data.user.role,
          message: isAdmin
            ? "👑 Administrator verified! Opening Admin Control Center..."
            : `✓ Welcome, ${data.user.name}! Accessing your account...`,
        });

        // Smooth redirect after visual confirmation
        setTimeout(() => {
          const targetUrl = isAdmin
            ? "/admin"
            : (redirectParam && redirectParam !== "/admin" ? redirectParam : "/user");
          window.location.href = targetUrl;
        }, 500);
      } else {
        if (data.requiresVerification || res.status === 403) {
          setError("Please verify your email address before logging in.");
          setUnverifiedEmail(data.email || identifier);
        } else {
          setError(data.error || "Login failed. Please check your credentials.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setError(null);
    setUnverifiedEmail(null);
    setEmailOrPhone("admin");
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center pt-8 pb-16 px-4">
      {/* Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs tracking-tight transition-transform duration-200 group-hover:scale-105">
            VM
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            VM <span className="text-muted font-normal">Mobiles</span>
          </span>
        </div>
        <span className="text-[11px] font-semibold text-muted uppercase tracking-widest mt-1">
          Universal Sign In
        </span>
      </Link>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <span className="text-[11px] px-2.5 py-1 bg-tile text-muted rounded-full font-medium flex items-center gap-1 border border-border">
            <Sparkles className="w-3 h-3 text-accent" /> All Accounts
          </span>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-4 p-3.5 bg-tile border border-border rounded-xl text-xs text-muted flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">Single Unified Portal:</strong> Log in as an <strong>Administrator</strong> or <strong>Customer</strong>. Your permissions and access are automatically routed!
          </div>
        </div>

        {/* Already Logged In Notice */}
        {currentUser && (
          <div className="mb-4 p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-accent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-accent" />
              <span>Signed in as <strong className="text-foreground">{currentUser.name}</strong> ({currentUser.role})</span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.role === "ADMIN" ? (
                <Link href="/admin" className="text-[11px] font-bold text-accent underline">
                  Admin Panel →
                </Link>
              ) : (
                <>
                  <Link href="/user" className="text-[11px] font-bold text-accent underline">
                    My Account →
                  </Link>
                  <Link href="/" className="text-[11px] font-bold text-accent underline">
                    Shop Mobiles →
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-red-500 hover:underline ml-2 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span className="font-semibold">{error}</span>
            </div>
            {unverifiedEmail && (
              <div className="mt-1 pt-2 border-t border-red-500/20 flex items-center justify-between gap-2">
                <span className="text-[11px] text-red-500">
                  Received code in email?
                </span>
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition"
                >
                  Verify Email Now →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            successInfo.role === "ADMIN"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successInfo.message}</span>
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">
              Email, Mobile number, or Admin Username
            </label>
            <input
              type="text"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="e.g. customer@example.com, phone, or admin"
              className="w-full bg-tile border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-foreground">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (e.g. admin123 or user123)"
                className="w-full bg-tile border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white hover:opacity-95 text-xs font-semibold rounded-xl mt-3 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
              ⚡ Administrator Shortcut:
            </span>
            <span className="text-[10px] text-muted">Click to fill</span>
          </div>

          <div className="text-xs">
            {/* Admin Fill */}
            <button
              type="button"
              onClick={handleQuickFillAdmin}
              className="w-full p-3 border border-border bg-tile hover:bg-card rounded-xl flex items-center justify-center gap-2 text-center transition-all cursor-pointer group"
              title="Fill Admin Credentials"
            >
              <span className="text-base group-hover:scale-110 transition-transform">👑</span>
              <span className="font-semibold text-foreground text-xs">Store Administrator</span>
              <span className="text-[10px] text-muted font-mono">(admin / admin123)</span>
            </button>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-[11px] text-muted mt-5 text-center leading-relaxed">
          Admin logins automatically route to the Admin Control Center. Customer logins open your cart, orders, and storefront.
        </p>
      </div>

      {/* New to VM Mobiles Section */}
      <div className="w-full max-w-md mt-6">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-border"></div>
          <span className="flex-shrink mx-3 text-xs text-muted font-medium">New to VM Mobiles?</span>
          <div className="flex-grow border-t border-border"></div>
        </div>

        <Link
          href="/register"
          className="block w-full text-center py-2.5 px-4 bg-card hover:bg-tile border border-border rounded-xl text-xs font-semibold text-foreground shadow-2xs transition-colors"
        >
          Create your VM Mobiles customer account
        </Link>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-accent hover:underline font-medium">
            ← Continue shopping as guest
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center text-sm font-bold text-muted">
        Loading Universal Sign In...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
