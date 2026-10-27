"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { flushSync } from "react-dom";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export default function ThemeToggle({ className = "", showLabels = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    if (theme === newTheme) return;

    // Utilize View Transitions API if supported for a buttery cross-fade
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      try {
        (document as any).startViewTransition(() => {
          flushSync(() => {
            setTheme(newTheme);
          });
        });
        return;
      } catch {
        // Fallback if startViewTransition throws
      }
    }

    setTheme(newTheme);
  };

  const options = [
    { value: "light", label: "Light", icon: Sun, title: "Switch to light theme" },
    { value: "dark", label: "Dark", icon: Moon, title: "Switch to dark theme" },
    { value: "system", label: "System", icon: Monitor, title: "Follow system preference" },
  ] as const;

  // Hydration-safe placeholder with identical dimensions to prevent layout shifts (CLS = 0)
  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center p-0.5 sm:p-1 rounded-full bg-[#E5E5EA] dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.12] h-[34px] w-[104px] sm:w-[112px] opacity-80 ${className}`}
        aria-hidden="true"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-7 rounded-full flex items-center justify-center p-1 text-muted">
          <Sun className="w-3.5 h-3.5" />
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-7 rounded-full flex items-center justify-center p-1 text-muted">
          <Moon className="w-3.5 h-3.5" />
        </div>
        <div className="w-7 h-7 sm:w-8 sm:h-7 rounded-full flex items-center justify-center p-1 text-muted">
          <Monitor className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Select color theme"
      className={`inline-flex items-center p-0.5 sm:p-1 rounded-full bg-[#E5E5EA] dark:bg-[#18181B] border border-black/[0.08] dark:border-white/[0.14] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] transition-colors duration-250 ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleThemeChange(opt.value)}
            className={`group relative flex items-center justify-center h-7 px-2.5 sm:px-3 rounded-full text-xs font-medium transition-all duration-200 ease-out cursor-pointer select-none ${
              isActive
                ? "bg-[#C9A66B] dark:bg-[#D4B483] text-[#FFFCFA] shadow-[0_2px_8px_rgba(201,166,107,0.35)] ring-1 ring-[#C9A66B]/50 font-semibold"
                : "text-muted hover:text-[#8C6226] dark:hover:text-[#D4B483] hover:bg-[#C9A66B]/15"
            }`}
            title={opt.title}
            aria-label={opt.title}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 stroke-[2.2] transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
            {showLabels && <span className="text-[11px] ml-1">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
