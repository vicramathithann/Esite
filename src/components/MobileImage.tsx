"use client";

import React, { useState } from "react";
import Image from "next/image";

interface MobileImageProps {
  src: string;
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
  className = "object-contain",
  fill = true,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: MobileImageProps) {
  // Determine local photo fallback (real smartphone photography, never cartoon)
  const defaultFallback = "/phones/iphone-16-pro-max.jpg";
  const localPhoto = phoneId ? `/phones/${phoneId}.jpg` : defaultFallback;
  
  // Clean source to ensure .jpg / .png photography is loaded, never cartoon .svg
  const cleanInitialSrc = (src || "").replace(/\.svg$/, ".jpg") || localPhoto;
  const [imgSrc, setImgSrc] = useState<string>(cleanInitialSrc);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    const clean = (src || "").replace(/\.svg$/, ".jpg") || localPhoto;
    setImgSrc(clean);
    setHasError(false);
  }, [src, localPhoto]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(defaultFallback);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <Image
        src={imgSrc}
        alt={alt || "Smartphone"}
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
