"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Smartphone } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VM Mobiles Client Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#eaeded] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-gray-300 rounded-lg p-6 sm:p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#0f1111]">
            Catalog Temporarily Unavailable
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            We encountered a temporary hiccup loading this view. Your cart, orders, and warranty data remain completely safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] py-2 px-5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="w-full sm:w-auto bg-[#C9A66B]/10 dark:bg-[#D4B483]/10 hover:bg-[#C9A66B]/20 border border-[#C9A66B]/30 dark:border-[#D4B483]/30 text-[#8C6226] dark:text-[#E5CBA2] py-2 px-5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>All Mobiles Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
