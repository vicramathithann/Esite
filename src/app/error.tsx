"use client";

import React, { useEffect } from "react";
import ErrorView from "@/components/ErrorView";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VN Mobiles Client Error Boundary:", error);
  }, [error]);

  return (
    <ErrorView
      code="500"
      title="SERVER ERROR"
      primaryButtonText="Return Home"
      primaryButtonHref="/"
      secondaryButtonText="Try Again"
      onSecondaryClick={() => reset()}
    />
  );
}
