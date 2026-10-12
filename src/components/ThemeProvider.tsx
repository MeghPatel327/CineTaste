"use client";

import { useEffect, ReactNode } from "react";

/**
 * CineTaste is permanently dark-themed.
 * This provider enforces dark mode and clears any stale "light" preference.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    // Clear stale theme preference so it can't accidentally flip to light
    try { localStorage.removeItem("cinetaste-theme"); } catch {}
  }, []);

  return <>{children}</>;
}

/** Retained for backward-compatible imports. Theme is always "dark". */
export function useTheme() {
  return { theme: "dark" as const, setTheme: (_t: string) => {} };
}
