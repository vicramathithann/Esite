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
  description,
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
      ? "/images/error-500-gold-clean.png"
      : "/images/error-404-gold-clean.png";

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8 relative select-none transition-colors duration-200">
      {/* Main Centered Content */}
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center justify-center text-center relative z-10 py-6">
        {/* 3D White & Gold Graphic */}
        <div className="relative w-full max-w-[460px] sm:max-w-[540px] aspect-[16/9] flex items-center justify-center">
          {!imgError ? (
            <Image
              src={imageSrc}
              alt={`${code} White & Gold 3D Graphic`}
              width={1376}
              height={768}
              priority
              onError={() => setImgError(true)}
              className="w-full h-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_20px_40px_rgba(201,166,107,0.2)]"
            />
          ) : (
            <div className="relative text-center p-6">
              <span className="text-8xl sm:text-9xl font-black tracking-tight bg-gradient-to-br from-[#111111] dark:from-white via-[#8C6226] dark:via-[#E5CBA2] to-[#C9A66B] bg-clip-text text-transparent drop-shadow-sm">
                {code}
              </span>
            </div>
          )}
        </div>

        {/* Optional Title & Description (omitted when empty for ultra-clean look) */}
        {title && (
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-4 mb-2">
            {title}
          </h1>
        )}
        {description && (
          <p className="text-sm text-muted max-w-md mb-4 leading-relaxed font-normal">
            {description}
          </p>
        )}

        {/* Action Button(s) */}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {/* Primary Action Button ("Return Home") */}
          {onPrimaryClick ? (
            <button
              type="button"
              onClick={onPrimaryClick}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] dark:text-[#1a140b] font-bold text-sm shadow-[0_4px_18px_rgba(201,166,107,0.35)] hover:shadow-[0_6px_24px_rgba(201,166,107,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{primaryButtonText}</span>
            </button>
          ) : (
            <Link
              href={primaryButtonHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] dark:text-[#1a140b] font-bold text-sm shadow-[0_4px_18px_rgba(201,166,107,0.35)] hover:shadow-[0_6px_24px_rgba(201,166,107,0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{primaryButtonText}</span>
            </Link>
          )}

          {/* Optional Secondary Action Button (Try Again) */}
          {secondaryButtonText && (
            onSecondaryClick ? (
              <button
                type="button"
                onClick={onSecondaryClick}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-[#C9A66B]/30 hover:border-[#C9A66B]/60 text-[#8C6226] dark:text-[#E5CBA2] hover:bg-[#C9A66B]/10 text-sm font-medium hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{secondaryButtonText}</span>
              </button>
            ) : secondaryButtonHref ? (
              <Link
                href={secondaryButtonHref}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-[#C9A66B]/30 hover:border-[#C9A66B]/60 text-[#8C6226] dark:text-[#E5CBA2] hover:bg-[#C9A66B]/10 text-sm font-medium hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
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
