"use client";

import React, { forwardRef, InputHTMLAttributes } from "react";

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  allowNegative?: boolean;
  allowExponent?: boolean;
}

export function useNumberInput({
  onWheel,
  onKeyDown,
  allowNegative = false,
  allowExponent = false,
}: {
  onWheel?: React.WheelEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  allowNegative?: boolean;
  allowExponent?: boolean;
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

    // Block exponential characters
    if (!allowExponent && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
    }

    // Block sign characters
    if (!allowNegative && (e.key === "+" || e.key === "-")) {
      e.preventDefault();
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
      type = "number",
      onWheel,
      onKeyDown,
      allowNegative = false,
      allowExponent = false,
      ...rest
    },
    ref
  ) => {
    const { handleWheel, handleKeyDown } = useNumberInput({
      onWheel,
      onKeyDown,
      allowNegative,
      allowExponent,
    });

    return (
      <input
        ref={ref}
        type={type}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 ${className}`}
        {...rest}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
