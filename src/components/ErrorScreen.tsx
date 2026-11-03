"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, RotateCcw } from "lucide-react";

export interface ErrorAction {
  label?: string;
  href?: string;
  onClick?: () => void;
}

export interface ErrorScreenProps {
  code?: string | number;
  title?: string;
  message?: string;
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
  onReset?: () => void;
  isGlobal?: boolean;
  as?: "main" | "section" | "div";
}

export const ERROR_PRESETS: Record<
  string | number,
  { title: string; message: string }
> = {
  400: {
    title: "Bad Request",
    message: "The request could not be understood by the server.",
  },
  401: {
    title: "Authentication Required",
    message: "Please sign in to access this page.",
  },
  403: {
    title: "Access Denied",
    message: "You do not have permission to access this resource.",
  },
  404: {
    title: "Page Not Found",
    message: "The page you are looking for doesn't exist or has been moved.",
  },
  408: {
    title: "Request Timeout",
    message: "The server took too long to respond. Please try again.",
  },
  429: {
    title: "Too Many Requests",
    message: "You have made too many requests. Please wait a moment and try again.",
  },
  500: {
    title: "Server Error",
    message: "Something went wrong on our end. Please try again later.",
  },
  503: {
    title: "Service Unavailable",
    message: "Our servers are temporarily offline for maintenance. Please check back soon.",
  },
};

const DEFAULT_PRESET = {
  title: "Something Went Wrong",
  message: "An unexpected error occurred. Please try again.",
};

export default function ErrorScreen({
  code = "404",
  title,
  message,
  primaryAction,
  secondaryAction,
  onReset,
  isGlobal = false,
  as,
}: ErrorScreenProps) {
  const router = useRouter();

  const codeKey = code !== undefined ? String(code) : "404";
  const preset = ERROR_PRESETS[codeKey] ?? DEFAULT_PRESET;
  const resolvedTitle = title ?? preset.title;
  const resolvedMessage = message ?? preset.message;

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const primaryLabel = primaryAction?.label ?? "Return Home";
  const primaryHref =
    primaryAction?.href ?? (primaryAction?.onClick ? undefined : "/");

  const secondaryLabel = secondaryAction?.label ?? "Go Back";
  const hasCustomSecondary = !!secondaryAction;

  const RootTag = as || (isGlobal ? "main" : "section");

  return (
    <RootTag
      role="alert"
      aria-live="polite"
      className={`w-full flex flex-col items-center justify-center py-16 sm:py-24 px-4 sm:px-6 relative select-none motion-safe:animate-fade-in motion-reduce:animate-none ${
        isGlobal ? "min-h-screen" : "flex-1 min-h-[60vh] sm:min-h-[70vh]"
      }`}
    >
      <meta name="robots" content="noindex, nofollow, noarchive" />

      {/* Status Code Display: Large, thin-weight typography with subtle gold gradient */}
      <div className="relative flex items-center justify-center mb-1 sm:mb-2">
        <span
          aria-hidden="true"
          className="font-extralight text-8xl sm:text-9xl md:text-[10rem] tracking-tight leading-none bg-gradient-to-b from-[#C9A66B] via-[#B8914A] to-[#8C6226] dark:from-[#F5E6C8] dark:via-[#D4B483] dark:to-[#996515] bg-clip-text text-transparent select-none drop-shadow-xs"
        >
          {code}
        </span>
      </div>

      {/* Accessible Title */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-foreground text-center mb-3">
        <span className="sr-only">Error {code}: </span>
        {resolvedTitle}
      </h1>

      {/* Friendly Description */}
      <p className="text-sm sm:text-base text-muted max-w-md mx-auto text-center text-balance mb-8 sm:mb-10 leading-relaxed">
        {resolvedMessage}
      </p>

      {/* Centered Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
        {/* On 500 / error boundary: Try Again button */}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full border border-[#C9A66B]/50 hover:border-[#C9A66B] bg-[#C9A66B]/10 hover:bg-[#C9A66B]/20 text-[#8C6226] dark:text-[#E5CBA2] font-medium text-sm tracking-wide transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}

        {/* Primary Action (Default: Return Home) */}
        {primaryAction?.onClick ? (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] font-medium text-sm tracking-wide shadow-[0_2px_12px_rgba(201,166,107,0.25)] hover:shadow-[0_4px_18px_rgba(201,166,107,0.35)] transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            {primaryLabel === "Return Home" ? (
              <Home className="w-4 h-4" />
            ) : null}
            <span>{primaryLabel}</span>
          </button>
        ) : (
          <Link
            href={primaryHref || "/"}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] font-medium text-sm tracking-wide shadow-[0_2px_12px_rgba(201,166,107,0.25)] hover:shadow-[0_4px_18px_rgba(201,166,107,0.35)] transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            {primaryLabel === "Return Home" ? (
              <Home className="w-4 h-4" />
            ) : null}
            <span>{primaryLabel}</span>
          </Link>
        )}

        {/* Secondary Action (Default: Go Back) */}
        {hasCustomSecondary && secondaryAction.onClick ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-foreground font-medium text-sm tracking-wide transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{secondaryLabel}</span>
          </button>
        ) : hasCustomSecondary && secondaryAction.href ? (
          <Link
            href={secondaryAction.href}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-foreground font-medium text-sm tracking-wide transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{secondaryLabel}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-7 sm:px-8 py-3 rounded-full border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 text-foreground font-medium text-sm tracking-wide transition-all duration-200 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </RootTag>
  );
}

