"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import AdminSupportChatbot from "@/components/AdminSupportChatbot";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser } = useApp();
  const [isVerifying, setIsVerifying] = useState(true);

  // Dedicated token-based recovery route only
  const isAuthPage = pathname === "/admin/reset-password";

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
          <span className="text-xs text-muted font-medium">Verifying authorization...</span>
        </div>
      </div>
    );
  }

  // 2. Strict Authorization Gate: Only authenticated rrroyce20@gmail.com with ADMIN role
  const isAdminAuthorized =
    currentUser &&
    currentUser.role === "ADMIN" &&
    (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com";

  if (!isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xs space-y-5">
          <div className="w-14 h-14 bg-muted/20 border border-border text-muted-foreground rounded-2xl flex items-center justify-center mx-auto">
            <FileQuestion className="w-7 h-7 text-muted" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted bg-muted/10 px-2.5 py-0.5 rounded-full border border-border">
              404 Not Found
            </span>
            <h2 className="text-xl font-bold text-foreground mt-3">Page Not Found</h2>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              The page you are looking for does not exist or you do not have permission to view it.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/"
              className="w-full py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Storefront</span>
            </Link>
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
      <AdminSupportChatbot />
    </div>
  );
}

