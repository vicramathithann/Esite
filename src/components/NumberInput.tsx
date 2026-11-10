"use client";

import React, { forwardRef, InputHTMLAttributes } from "react";

export function sanitizeNumericString(raw: string, allowDecimals = false): string {
  if (raw === "" || raw === null || raw === undefined) return "";
  const str = String(raw);

  // Allow digits only (and at most one decimal point if allowDecimals is true)
  let cleaned = allowDecimals
    ? str.replace(/[^0-9.]/g, "")
    : str.replace(/[^0-9]/g, "");

  if (allowDecimals && cleaned.includes(".")) {
    const parts = cleaned.split(".");
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Strip leading zeros, except single "0" or "0." before a decimal point
  if (cleaned.length > 1 && cleaned.startsWith("0")) {
    if (cleaned.startsWith("0.")) {
      // Keep single 0 before decimal
    } else {
      cleaned = cleaned.replace(/^0+/, "");
      if (cleaned === "" || cleaned.startsWith(".")) {
        cleaned = "0" + cleaned;
      }
    }
  }

  return cleaned;
}

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  allowNegative?: boolean;
  allowExponent?: boolean;
  allowDecimals?: boolean;
  hasError?: boolean;
}

export function useNumberInput({
  onWheel,
  onKeyDown,
  allowNegative = false,
  allowExponent = false,
  allowDecimals = false,
}: {
  onWheel?: React.WheelEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  allowNegative?: boolean;
  allowExponent?: boolean;
  allowDecimals?: boolean;
} = {}) {
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Unfocus the input so scrolling the page while focused does not change value
    e.currentTarget.blur();
    onWheel?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block arrow keys from changing value
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }

    // Block scientific notation "e", "E"
    if (!allowExponent && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
    }

    // Block "+" and "-" signs
    if (!allowNegative && (e.key === "+" || e.key === "-")) {
      e.preventDefault();
    }

    // Block decimal point if not allowed, or if already present
    if (e.key === ".") {
      if (!allowDecimals) {
        e.preventDefault();
      } else if (e.currentTarget.value.includes(".")) {
        e.preventDefault();
      }
    }

    onKeyDown?.(e);
  };

  return {
    handleWheel,
    handleKeyDown,
  };
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className = "",
      type = "text",
      value,
      onChange,
      onWheel,
      onKeyDown,
      allowNegative = false,
      allowExponent = false,
      allowDecimals = false,
      hasError = false,
      ...rest
    },
    ref
  ) => {
    const { handleWheel, handleKeyDown } = useNumberInput({
      onWheel,
      onKeyDown,
      allowNegative,
      allowExponent,
      allowDecimals,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeNumericString(e.target.value, allowDecimals);
      e.target.value = sanitized;
      onChange?.(e);
    };

    // Format value: if undefined or null, pass empty string
    const displayValue = value === undefined || value === null ? "" : String(value);

    const errorClass = hasError
      ? "!border-red-500 focus:!border-red-500 !ring-1 !ring-red-500/40"
      : "";

    return (
      <input
        ref={ref}
        type={type}
        inputMode={allowDecimals ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 ${errorClass} ${className}`}
        {...rest}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
