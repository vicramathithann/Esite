"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eaeded] flex items-center justify-center p-4 font-sans text-[#0f1111]">
        <div className="max-w-md w-full bg-white border border-gray-300 rounded-lg p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
            ⚠
          </div>
          <h2 className="text-xl font-bold text-[#0f1111]">VM Mobiles Storefront</h2>
          <p className="text-xs text-gray-600">
            A temporary connection hiccup occurred. Click below to reconnect immediately.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/";
              else reset();
            }}
            className="w-full bg-[#febd69] hover:bg-[#f3a847] text-[#131921] py-2 px-6 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            Reload Storefront
          </button>
        </div>
      </body>
    </html>
  );
}
