"use client";

import React, { useEffect } from "react";
import ErrorScreen from "@/components/ErrorScreen";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the real internal error for server/client debugging
    console.error("Client Error Boundary:", error);
  }, [error]);

  return <ErrorScreen code="500" onReset={reset} />;
}
