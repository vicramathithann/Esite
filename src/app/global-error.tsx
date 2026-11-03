"use client";

import React, { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the real internal error for server/client debugging
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex flex-col antialiased">
        <ErrorScreen
          code="500"
          isGlobal
          onReset={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            } else {
              reset();
            }
          }}
        />
      </body>
    </html>
  );
}
