"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, notFound } from "next/navigation";
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
  const { currentUser, login } = useApp();

  // Dedicated token-based recovery route only
  const isAuthPage = pathname === "/admin/reset-password";

  // Check if we already have proof that this user is the authorized admin
  const [authState, setAuthState] = useState<"CHECKING" | "AUTHORIZED" | "UNAUTHORIZED">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("novamobile_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isAuthorizedAdmin(parsed)) {
            return "AUTHORIZED";
          }
          // If logged in as someone else (regular user), immediately mark unauthorized
          if (parsed.email && !isAuthorizedAdmin(parsed)) {
            return "UNAUTHORIZED";
          }
        }
      } catch {}
    }
    return "CHECKING";
  });

  const verifySession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
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

    // Fallback: If context or localStorage confirms authorized admin, allow access
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("novamobile_user");
        if (saved && isAuthorizedAdmin(JSON.parse(saved))) {
          setAuthState("AUTHORIZED");
          return;
        }
      } catch {}
    }

    // Otherwise strictly unauthorized (normal user or unauthenticated)
    setAuthState("UNAUTHORIZED");
  }, [login]);

  useEffect(() => {
    if (isAuthPage) return;

    if (isAuthorizedAdmin(currentUser)) {
      setAuthState("AUTHORIZED");
      return;
    }

    verifySession();
  }, [currentUser, isAuthPage, verifySession]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // 1. Loading State while verifying
  if (authState === "CHECKING") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Strict Authorization Gate: Return 404 for normal users or unauthenticated visitors
  if (authState === "UNAUTHORIZED") {
    return notFound();
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
