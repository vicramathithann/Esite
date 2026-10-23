"use client";

import React, { useEffect, useState } from "react";
import { usePathname, notFound } from "next/navigation";
import { useApp } from "@/context/AppContext";
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
        <div className="w-8 h-8 border-2 border-[#C9A66B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Strict Authorization Gate: Only authenticated rrroyce20@gmail.com with ADMIN role
  const isAdminAuthorized =
    currentUser &&
    currentUser.role === "ADMIN" &&
    (currentUser.email || "").toLowerCase() === "rrroyce20@gmail.com";

  if (!isAdminAuthorized) {
    return notFound();
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

