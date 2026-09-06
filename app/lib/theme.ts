"use client";

import { getItem, setItem } from "./store";

/**
 * Palette selection. Every colour resolves through CSS custom properties
 * defined in globals.css, so switching themes is a single attribute on <html>
 * rather than a rebuild.
 */

export const THEMES = [
  {
    id: "tide",
    name: "Tidewater",
    blurb: "Teal on pale blue-grey. Calm, clinical, reads like a health instrument.",
    swatch: ["#eef4f7", "#14b8a6", "#3b82f6", "#ec4899", "#0d2733"],
  },
  {
    id: "coast",
    name: "Coast",
    blurb: "Blue primary with teal and coral. Warmer and more energetic.",
    swatch: ["#f2f6fb", "#3b82f6", "#14b8a6", "#f472b6", "#0d2340"],
  },
  {
    id: "sorbet",
    name: "Sorbet",
    blurb: "Pink primary over near-white with a lilac cast. The boldest option.",
    swatch: ["#f8f4f8", "#ec4899", "#14b8a6", "#0ea5e9", "#1e171f"],
  },
  {
    id: "midnight",
    name: "Midnight",
    blurb: "The original dark scheme. Useful for early-morning sessions.",
    swatch: ["#0a0a0f", "#facc15", "#60a5fa", "#c084fc", "#e5e7eb"],
  },
] as const;

export type ThemeId = typeof THEMES[number]["id"];

export const DEFAULT_THEME: ThemeId = "tide";
const THEME_KEY = "bws-theme";

/** Theme colour reported to the OS for the status bar / task switcher. */
const BROWSER_THEME_COLOR: Record<ThemeId, string> = {
  tide:     "#eef4f7",
  coast:    "#f2f6fb",
  sorbet:   "#f8f4f8",
  midnight: "#0a0a0f",
};

export function getTheme(): ThemeId {
  const saved = getItem(THEME_KEY) as ThemeId | null;
  return saved && THEMES.some(t => t.id === saved) ? saved : DEFAULT_THEME;
}

export function applyTheme(id: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", BROWSER_THEME_COLOR[id]);
  // iOS uses this to tint the status bar in an installed web app.
  const bar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (bar) bar.setAttribute("content", id === "midnight" ? "black-translucent" : "default");
}

export function setTheme(id: ThemeId): void {
  setItem(THEME_KEY, id);
  applyTheme(id);
}
