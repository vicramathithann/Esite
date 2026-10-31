"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import AdminNav from "@/components/AdminNav";
import AdminSupportChatbot from "@/components/AdminSupportChatbot";

const ADMIN_EMAIL = "rrroyce20@gmail.com";

function isAuthorizedAdmin(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || "").toUpperCase();
  const email = String(user.email || "").toLowerCase().trim();
  return role === "ADMIN" && email === ADMIN_EMAIL;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { login } = useApp();

  // Dedicated token-based recovery route only
  const isAuthPage = pathname === "/admin/reset-password";

  // Check server-verified authorization state
  const [authState, setAuthState] = useState<"CHECKING" | "AUTHORIZED" | "UNAUTHORIZED">("CHECKING");

  const verifySession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && isAuthorizedAdmin(data.user)) {
          login(data.user);
          setAuthState("AUTHORIZED");
          return;
        }
      }
    } catch (e) {
      console.error("[ADMIN_AUTH_CHECK_ERROR]", e);
    }

    // Server check failed or user is not authorized admin: purge stale client credentials
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("novamobile_user");
      } catch {}
    }

    setAuthState("UNAUTHORIZED");
    const redirectUrl = `/login?redirect=${encodeURIComponent(pathname || "/admin")}`;
    if (typeof window !== "undefined") {
      window.location.href = redirectUrl;
    }
  }, [login, pathname]);

  useEffect(() => {
    if (isAuthPage) return;
    verifySession();
  }, [isAuthPage, verifySession]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // 1. Loading / Verification State
  if (authState === "CHECKING") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-muted font-medium">Verifying administrator credentials...</p>
      </div>
    );
  }

  // 2. Unauthorized State (Redirecting to Sign-In)
  if (authState === "UNAUTHORIZED") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs text-muted font-medium">
          Administrator session required. Directing to sign-in...
        </p>
      </div>
    );
  }

  // 3. Authorized Admin
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row transition-colors duration-200">
      <AdminNav />
      <div className="flex-1 min-w-0 lg:pl-64 xl:pl-72 flex flex-col">
        {children}
      </div>
      <AdminSupportChatbot />
    </div>
  );
}
