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
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: "ADMIN" | "VICRAM" | "ZARA") => {
    setError(null);
    if (type === "ADMIN") {
      setEmailOrPhone("admin");
      setPassword("admin123");
    } else if (type === "ZARA") {
      setEmailOrPhone("zara@example.com");
      setPassword("user123");
    } else {
      setEmailOrPhone("vicram@example.com");
      setPassword("user123");
    }
  };

  return (
    <div className="min-h-screen bg-[#eaeded] flex flex-col items-center pt-8 pb-16 px-4">
      {/* Brand Header */}
      <Link href="/" className="mb-5 flex flex-col items-center group">
        <div className="flex items-baseline">
          <span className="text-3xl font-black text-[#131921] group-hover:opacity-90">
            vm<span className="text-[#febd69]">mobiles</span>
          </span>
          <span className="text-sm text-[#febd69] font-bold">.in</span>
        </div>
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">
          Universal Sign In
        </span>
      </Link>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-[#0f1111]">Sign In</h1>
          <span className="text-[11px] px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#f3a847]" /> All Accounts
          </span>
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-md text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Single Unified Portal:</strong> Log in as an <strong>Administrator</strong> or <strong>Customer</strong>. Your permissions and access are automatically routed!
          </div>
        </div>

        {/* Already Logged In Notice */}
        {currentUser && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Signed in as <strong>{currentUser.name}</strong> ({currentUser.role})</span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser.role === "ADMIN" ? (
                <Link href="/admin" className="text-[11px] font-bold text-amber-800 underline">
                  Admin Panel (/admin) →
                </Link>
              ) : (
                <>
                  <Link href="/user" className="text-[11px] font-bold text-emerald-700 underline">
                    My Account (/user) →
                  </Link>
                  <Link href="/" className="text-[11px] font-bold text-blue-700 underline">
                    Shop Mobiles →
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={logout}
                className="text-[11px] text-red-600 hover:underline ml-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successInfo && (
          <div className={`mb-4 p-3 rounded-md text-xs font-bold flex items-center gap-2 ${
            successInfo.role === "ADMIN"
              ? "bg-amber-100 text-amber-900 border border-amber-300"
              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successInfo.message}</span>
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-[#0f1111] flex items-center justify-between">
              <span>Username, Email, or Mobile</span>
              <span className="text-[10px] text-gray-500 font-normal">admin, vicram, zara</span>
            </label>
            <input
              type="text"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="e.g. admin, vicram@example.com, or phone"
              className="w-full border border-gray-400 rounded-md px-3 py-2 text-sm text-[#0f1111] focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-bold text-[#0f1111]">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-[#007185] hover:underline flex items-center gap-1 cursor-pointer"
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
                className="w-full border border-gray-400 rounded-md px-3 py-2 text-sm text-[#0f1111] focus:outline-none focus:border-[#e77600] focus:ring-1 focus:ring-[#e77600] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 btn-amazon-yellow text-xs font-bold rounded-md mt-2 flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* 1-Click Quick Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
              ⚡ 1-Click Quick Login:
            </span>
            <span className="text-[10px] text-gray-400">Click to fill</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Admin Fill */}
            <button
              type="button"
              onClick={() => handleQuickFill("ADMIN")}
              className="p-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-md flex flex-col items-center justify-center text-center transition-colors cursor-pointer group"
              title="Fill Admin Credentials"
            >
              <span className="text-base group-hover:scale-110 transition-transform">👑</span>
              <span className="font-bold text-amber-950 text-[11px] mt-0.5">Admin</span>
              <span className="text-[9px] text-amber-700 font-mono">admin123</span>
            </button>

            {/* Vicram Fill */}
            <button
              type="button"
              onClick={() => handleQuickFill("VICRAM")}
              className="p-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-md flex flex-col items-center justify-center text-center transition-colors cursor-pointer group"
              title="Fill Vicram Credentials"
            >
              <span className="text-base group-hover:scale-110 transition-transform">👤</span>
              <span className="font-bold text-blue-950 text-[11px] mt-0.5">Vicram</span>
              <span className="text-[9px] text-blue-600 font-mono">user123</span>
            </button>

            {/* Zara Fill */}
            <button
              type="button"
              onClick={() => handleQuickFill("ZARA")}
              className="p-2 border border-purple-200 bg-purple-50 hover:bg-purple-100 rounded-md flex flex-col items-center justify-center text-center transition-colors cursor-pointer group"
              title="Fill Zara Credentials"
            >
              <span className="text-base group-hover:scale-110 transition-transform">🌸</span>
              <span className="font-bold text-purple-950 text-[11px] mt-0.5">Zara</span>
              <span className="text-[9px] text-purple-600 font-mono">user123</span>
            </button>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-[11px] text-gray-500 mt-5 text-center leading-relaxed">
          Admin logins automatically route to the Admin Control Center. Customer logins open your cart, orders, and storefront.
        </p>
      </div>

      {/* New to VM Mobiles Section */}
      <div className="w-full max-w-md mt-6">
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-3 text-xs text-gray-500 font-medium">New to VM Mobiles?</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <Link
          href="/register"
          className="block w-full text-center py-2.5 px-4 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-xs font-semibold text-[#0f1111] shadow-2xs transition-colors"
        >
          Create your VM Mobiles customer account
        </Link>

        <div className="text-center mt-4">
          <Link href="/" className="text-xs text-[#007185] hover:underline font-medium">
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
      <div className="min-h-screen bg-[#eaeded] flex items-center justify-center text-sm font-bold text-gray-600">
        Loading Universal Sign In...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
