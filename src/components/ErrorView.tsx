"use client";

import React from "react";
import ErrorScreen, { ErrorAction } from "./ErrorScreen";

export interface ErrorViewProps {
  code?: "404" | "500" | string | number;
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
  primaryButtonText,
  primaryButtonHref,
  onPrimaryClick,
  secondaryButtonText,
  secondaryButtonHref,
  onSecondaryClick,
}: ErrorViewProps) {
  const primaryAction: ErrorAction | undefined =
    primaryButtonText || primaryButtonHref || onPrimaryClick
      ? {
          label: primaryButtonText,
          href: primaryButtonHref,
          onClick: onPrimaryClick,
        }
      : undefined;

  const secondaryAction: ErrorAction | undefined =
    secondaryButtonText || secondaryButtonHref || onSecondaryClick
      ? {
          label: secondaryButtonText,
          href: secondaryButtonHref,
          onClick: onSecondaryClick,
        }
      : undefined;

  return (
    <ErrorScreen
      code={code}
      title={title}
      message={description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      onReset={
        String(code) === "500" && onSecondaryClick ? onSecondaryClick : undefined
      }
    />
  );
}
