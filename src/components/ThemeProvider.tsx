"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  resolvedTheme: "light" | "dark";
  systemTheme: "light" | "dark";
  themes: string[];
  forcedTheme?: string;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string | string[];
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
  themes?: string[];
  forcedTheme?: string;
  disableTransitionOnChange?: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "system",
      setTheme: () => {},
      resolvedTheme: "light",
      systemTheme: "light",
      themes: ["light", "dark", "system"],
    };
  }
  return context;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  themes = ["light", "dark", "system"],
  forcedTheme,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<string>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    const active = forcedTheme || theme;
    if (active === "system") {
      return systemTheme;
    }
    return active === "dark" ? "dark" : "light";
  }, [forcedTheme, theme, systemTheme]);

  const applyTheme = useCallback((targetTheme: "light" | "dark") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    }
  }, []);

  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch {}

    const resolved = newTheme === "system"
      ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : (newTheme === "dark" ? "dark" : "light");
    applyTheme(resolved);
  }, [storageKey, applyTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialTheme = defaultTheme;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) initialTheme = saved;
    } catch {}

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const currentSystem: "light" | "dark" = mediaQuery.matches ? "dark" : "light";
    setSystemTheme(currentSystem);
    setThemeState(initialTheme);

    const resolved = initialTheme === "system" ? currentSystem : (initialTheme === "dark" ? "dark" : "light");
    applyTheme(resolved);

    const handleSystemChange = (e: MediaQueryListEvent) => {
      const sys = e.matches ? "dark" : "light";
      setSystemTheme(sys);
      try {
        const current = localStorage.getItem(storageKey) || defaultTheme;
        if (current === "system") {
          applyTheme(sys);
        }
      } catch {}
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue);
        const res = e.newValue === "system"
          ? (mediaQuery.matches ? "dark" : "light")
          : (e.newValue === "dark" ? "dark" : "light");
        applyTheme(res);
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [storageKey, defaultTheme, applyTheme]);

  const value = useMemo(() => ({
    theme: forcedTheme || theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    themes,
    forcedTheme,
  }), [forcedTheme, theme, setTheme, resolvedTheme, systemTheme, themes]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
