"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Smartphone } from "lucide-react";

interface MobileImageProps {
  src?: string | null;
  alt: string;
  phoneId?: string;
  brand?: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
}

export default function MobileImage({
  src,
  alt,
  phoneId,
  brand,
  className = "object-contain",
  fill = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: MobileImageProps) {
  // Determine if there is a local photo matching the exact product slug
  const localSlugPhoto = phoneId ? `/phones/${phoneId}.jpg` : null;

  // Clean source without cartoon svg replacements
  const initialSrc = (src || "").trim() || localSlugPhoto || "";

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    const nextSrc = (src || "").trim() || localSlugPhoto || "";
    setImgSrc(nextSrc);
    setHasError(false);
  }, [src, localSlugPhoto]);

  const handleError = () => {
    if (!hasError) {
      // If the provided src failed and we haven't tried the exact slug photo yet
      if (localSlugPhoto && imgSrc !== localSlugPhoto) {
        setImgSrc(localSlugPhoto);
      } else {
        // Fallback to neutral placeholder, NEVER another brand's photo
        setHasError(true);
      }
    }
  };

  // If there is no image source or the image failed to load, display a neutral phone placeholder
  if (!imgSrc || hasError) {
    return (
      <div
        className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-tile/40 border border-border/40 rounded-xl p-4 text-center select-none"
        aria-label={`${alt || "Product"} - No image available`}
      >
        <div className="w-12 h-12 rounded-2xl bg-tile border border-border flex items-center justify-center text-muted mb-2 shadow-xs">
          <Smartphone className="w-6 h-6 stroke-[1.5]" />
        </div>
        <span className="text-[11px] font-semibold text-foreground/80">{brand || "Smartphone"}</span>
        <span className="text-[10px] text-muted">No image available</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <Image
        src={imgSrc}
        alt={alt || `${brand || ""} Smartphone`}
        fill={fill}
        priority={priority}
        sizes={sizes}
        unoptimized
        onError={handleError}
        className={`${className} transition-opacity duration-200`}
      />
    </div>
  );
}
