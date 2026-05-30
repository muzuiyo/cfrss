"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/use-settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useSettings();

  useEffect(() => {
    if (!settings?.ui_theme) return;

    const root = document.documentElement;
    const theme = settings.ui_theme;

    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings?.ui_theme]);

  return <>{children}</>;
}
