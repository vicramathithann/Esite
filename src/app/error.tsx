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
            className="w-full sm:w-auto btn-amazon-yellow py-2 px-5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
            }}
            className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 py-2 px-5 text-xs font-bold rounded-sm flex items-center justify-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>All Mobiles Store</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
