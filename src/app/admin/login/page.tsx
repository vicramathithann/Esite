"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the single universal login page
    router.replace("/login?redirect=/admin");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#131921] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-[#1f2833] border border-amber-500/30 rounded-xl p-8 shadow-2xl space-y-5 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-[#febd69] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <ShieldCheck className="w-9 h-9 text-[#131921]" />
        </div>
        <h1 className="text-xl font-bold">Redirecting to Universal Sign In...</h1>
        <p className="text-xs text-gray-400">
          Admin and Customer accounts now use the unified login page.
        </p>
        <Link
          href="/login?redirect=/admin"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all"
        >
          <span>Continue to Sign In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

