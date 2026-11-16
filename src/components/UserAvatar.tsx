import React from "react";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
  textSize?: string;
  border?: boolean;
  title?: string;
}

/**
 * Shared Letter Avatar Component for VN Mobiles.
 * Renders an accessible, perfectly centered circle with the first letter of
 * the username/name in uppercase using theme tokens (gold background, dark/white text).
 * 
 * Fallbacks:
 * 1. First letter of name (trimmed, uppercase)
 * 2. First letter of email (trimmed, uppercase)
 * 3. Default "U"
 */
export default function UserAvatar({
  name,
  email,
  size = "md",
  className = "",
  textSize,
  border = false,
  title,
}: UserAvatarProps) {
  // Determine the display letter
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim();

  let letter = "U";
  if (trimmedName) {
    letter = trimmedName.charAt(0).toUpperCase();
  } else if (trimmedEmail) {
    letter = trimmedEmail.charAt(0).toUpperCase();
  }

  // Predefined standard size mappings
  let sizeClasses = "w-10 h-10 text-sm"; // default medium (40px)
  let defaultTextSize = "text-sm font-bold";

  if (size === "sm") {
    sizeClasses = "w-8 h-8"; // small (32px)
    defaultTextSize = "text-xs font-bold";
  } else if (size === "md") {
    sizeClasses = "w-10 h-10"; // medium (40px)
    defaultTextSize = "text-sm font-bold";
  } else if (size === "lg") {
    sizeClasses = "w-20 h-20 sm:w-24 sm:h-24"; // large (80px phone / 96px laptop)
    defaultTextSize = "text-3xl sm:text-4xl font-extrabold";
  }

  const borderClass = border
    ? "border-2 border-[#C9A66B]/50 dark:border-[#D4B483]/60 shadow-xs"
    : "";

  const customStyle: React.CSSProperties =
    typeof size === "number"
      ? { width: `${size}px`, height: `${size}px` }
      : {};

  return (
    <div
      style={customStyle}
      title={title || trimmedName || trimmedEmail || "User"}
      aria-label={title || trimmedName || trimmedEmail || "User"}
      className={`rounded-full shrink-0 flex items-center justify-center select-none bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] ${
        size === "lg" ? "bg-gradient-to-tr from-[#C9A66B] to-[#E2C799] text-[#0B1220]" : ""
      } ${sizeClasses} ${textSize || defaultTextSize} ${borderClass} ${className}`}
    >
      <span className="leading-none">{letter}</span>
    </div>
  );
}
