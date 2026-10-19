"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogIn, Lock } from "lucide-react";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();
  const [isVerifying, setIsVerifying] = useState(true);

  // If visiting public admin authentication pages, don't gate them here
  const isAuthPage = pathname === "/admin/login" || pathname === "/admin/reset-password";

  useEffect(() => {
    // Short verification delay to let AppContext restore session from cookies
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // 1. Initial Loading State
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-muted font-medium">Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  // 2. Not Logged In: Redirect to Login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xs space-y-5">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-[#8C6226] dark:text-[#E5CBA2] rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Sign In Required</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Please sign in with authorized store administrator credentials to access the VN Mobiles Admin Control Desk.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <Link
              href="/admin/login"
              className="w-full py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Sign In</span>
            </Link>
            <Link
              href="/"
              className="block text-xs text-muted hover:text-foreground pt-1 transition"
            >
              ← Return to Public Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Logged In, but NOT the designated Admin: 403 Forbidden Screen
  const isAdminAuthorized =
    currentUser.role === "ADMIN" &&
    (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com";

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border border-rose-500/30 rounded-2xl p-8 shadow-xl space-y-5">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              403 Forbidden
            </span>
            <h2 className="text-xl font-bold text-foreground mt-3">Access Denied</h2>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              This portal is strictly restricted to store administrators. Your current account (<strong className="text-foreground">{currentUser.email}</strong>) has regular user privileges and cannot view or alter administrative resources.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-tile hover:bg-tile/80 text-foreground font-semibold text-xs rounded-xl border border-border transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Storefront</span>
            </Link>

            <button
              onClick={async () => {
                await logout();
                window.location.href = "/admin/login";
              }}
              className="w-full py-2.5 px-4 bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] border border-[#C9A66B]/30 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Switch to Admin Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Admin
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-200">
      <AdminNav />
      <div className="flex-1 min-w-0 lg:pl-64 xl:pl-72 flex flex-col">
        {children}
      </div>
    </div>
  );
}

