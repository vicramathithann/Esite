"use client";

import React, { useEffect } from "react";
import ErrorView from "@/components/ErrorView";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VN Mobiles Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F7F5F0] dark:bg-[#121316] min-h-screen m-0 p-0 antialiased selection:bg-[#C9A66B] selection:text-[#0b0f19]">
        <ErrorView
          code="500"
          title="SERVER ERROR"
          primaryButtonText="Return Home"
          primaryButtonHref="/"
          secondaryButtonText="Try Again"
          onSecondaryClick={() => {
            if (typeof window !== "undefined") window.location.href = "/";
            else reset();
          }}
        />
      </body>
    </html>
  );
}
