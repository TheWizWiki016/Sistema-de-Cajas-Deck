"use client";

import { useEffect } from "react";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "@/lib/themes";
import { DEFAULT_ANIMATION_ID } from "@/lib/animations";

const toRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace("#", "");
  const parsed =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((value) => value + value)
          .join("")
      : cleaned;
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ThemeProvider() {
  useEffect(() => {
    const applyTheme = (themeId: string, animationStyle: string) => {
      const theme =
        THEME_PRESETS.find((preset) => preset.id === themeId) ??
        THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_ID);
      if (!theme) {
        return;
      }
      const root = document.documentElement;
      root.dataset.anim = animationStyle || DEFAULT_ANIMATION_ID;
      root.style.setProperty("--background", theme.background);
      root.style.setProperty("--panel", theme.panel);
      root.style.setProperty("--panel-90", toRgba(theme.panel, 0.9));
      root.style.setProperty("--panel-80", toRgba(theme.panel, 0.8));
      root.style.setProperty("--surface", theme.surface);
      root.style.setProperty("--surface-70", toRgba(theme.surface, 0.7));
    };

    const loadTheme = async () => {
      try {
        const response = await fetch("/api/settings");
        const data = (await response.json()) as {
          themeId?: string;
          animationStyle?: string;
        };
        applyTheme(
          data.themeId ?? DEFAULT_THEME_ID,
          data.animationStyle ?? DEFAULT_ANIMATION_ID
        );
      } catch (error) {
        applyTheme(DEFAULT_THEME_ID, DEFAULT_ANIMATION_ID);
      }
    };

    loadTheme();
  }, []);

  return null;
}
