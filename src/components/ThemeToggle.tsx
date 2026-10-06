"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTheme(newTheme);
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 250);
    } else {
      setTheme(newTheme);
    }
  };

  if (!mounted) {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-full bg-tile border border-border opacity-70 ${className}`}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center p-1.5 text-muted">
          <Sun className="w-3.5 h-3.5" />
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center p-1.5 text-muted">
          <Moon className="w-3.5 h-3.5" />
        </div>
        <div className="w-7 h-7 rounded-full flex items-center justify-center p-1.5 text-muted">
          <Monitor className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      className={`inline-flex items-center p-0.5 rounded-full bg-tile border border-border shadow-2xs ${className}`}
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
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted hover:text-foreground hover:bg-card/40"
            }`}
            title={`${opt.label} mode`}
            aria-label={`${opt.label} theme`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {showLabels && <span className="text-[11px] font-medium">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
