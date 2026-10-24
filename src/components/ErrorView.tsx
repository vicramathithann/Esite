"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

export interface ErrorViewProps {
  code?: "404" | "500" | string;
  title?: string;
  description?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  onPrimaryClick?: () => void;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  onSecondaryClick?: () => void;
}

export default function ErrorView({
  code = "404",
  title,
  primaryButtonText = "Return Home",
  primaryButtonHref = "/",
  onPrimaryClick,
  secondaryButtonText,
  secondaryButtonHref,
  onSecondaryClick,
}: ErrorViewProps) {
  const [imgError, setImgError] = useState(false);

  const imageSrc =
    code === "500"
      ? "/images/error-500-matte-gold.png"
      : "/images/error-404-matte-gold.png";

  const displayTitle =
    title || (code === "500" ? "SERVER ERROR" : "PAGE NOT FOUND");

  return (
    <div
      className="min-h-screen w-full bg-[#F7F5F0] dark:bg-[#121316] text-[#1c1e22] dark:text-[#F3F4F6] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none transition-colors duration-200"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
      }}
    >
      {/* Soft Diagonal Sunbeam Shadows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70 dark:opacity-20"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(247,245,240,0.3) 35%, rgba(0,0,0,0.035) 65%, rgba(255,255,255,0.4) 85%, rgba(0,0,0,0.02) 100%)",
        }}
      />
      <div
        className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] pointer-events-none opacity-25 dark:opacity-10 rotate-[-26deg]"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent, transparent 160px, rgba(0,0,0,0.03) 160px, rgba(0,0,0,0.03) 320px)",
        }}
      />

      {/* Main Content: Minimalist Editorial Hierarchy */}
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center justify-center text-center relative z-10 py-6">
        {/* Upper Center: Monumental 3D Numbers "404" */}
        <div className="relative w-full max-w-[480px] sm:max-w-[560px] md:max-w-[620px] aspect-[16/9] flex items-center justify-center">
          {!imgError ? (
            <Image
              src={imageSrc}
              alt={`${code} 3D Numbers`}
              width={1376}
              height={768}
              priority
              onError={() => setImgError(true)}
              className="w-full h-auto object-contain filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_22px_40px_rgba(201,166,107,0.22)] select-none"
            />
          ) : (
            <div className="relative text-center p-6">
              <span className="font-serif text-8xl sm:text-9xl font-bold tracking-wider text-[#1c1e22] dark:text-[#F3F4F6] drop-shadow-sm">
                {code}
              </span>
            </div>
          )}
        </div>

        {/* Directly Below: High-Contrast Dark Charcoal Serif Title */}
        <h1 className="font-serif font-bold text-3xl sm:text-4xl md:text-5xl tracking-[0.16em] uppercase text-[#1c1e22] dark:text-[#F3F4F6] mt-4 mb-7 sm:mb-8 text-center drop-shadow-xs">
          {displayTitle}
        </h1>

        {/* Centered Below: Single Warm Camel-Gold Pill Button */}
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          {onPrimaryClick ? (
            <button
              type="button"
              onClick={onPrimaryClick}
              className="inline-flex items-center justify-center gap-2 px-9 py-3.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] font-medium text-sm tracking-wide shadow-[0_6px_22px_rgba(201,166,107,0.32)] hover:shadow-[0_8px_28px_rgba(201,166,107,0.48)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{primaryButtonText}</span>
            </button>
          ) : (
            <Link
              href={primaryButtonHref}
              className="inline-flex items-center justify-center gap-2 px-9 py-3.5 rounded-full bg-[#C9A66B] hover:bg-[#B8914A] active:bg-[#A67C3D] text-[#FFFCFA] font-medium text-sm tracking-wide shadow-[0_6px_22px_rgba(201,166,107,0.32)] hover:shadow-[0_8px_28px_rgba(201,166,107,0.48)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{primaryButtonText}</span>
            </Link>
          )}

          {secondaryButtonText && (
            onSecondaryClick ? (
              <button
                type="button"
                onClick={onSecondaryClick}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#1c1e22] dark:text-[#F3F4F6] text-sm font-medium transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{secondaryButtonText}</span>
              </button>
            ) : secondaryButtonHref ? (
              <Link
                href={secondaryButtonHref}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-[#1c1e22] dark:text-[#F3F4F6] text-sm font-medium transition-all cursor-pointer"
              >
                <span>{secondaryButtonText}</span>
              </Link>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}
