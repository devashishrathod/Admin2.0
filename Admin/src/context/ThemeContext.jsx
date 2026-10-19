import { createContext, useContext, useEffect, useState } from "react";

import {
  BACKGROUND_CSS_VARS,
  BACKGROUND_THEMES,
  DEFAULT_BACKGROUND,
  PLAIN_BACKGROUNDS,
  PLAIN_CSS_VARS,
} from "@/constants/backgroundThemes";

/* -------------------------------------------------------------------------
 * ThemeContext — app-wide light/dark mode + Theme Color + Plain Background.
 *
 * Admin defaults to LIGHT mode. Dark mode is the app's original look —
 * every existing dark className stays exactly as it was, just moved behind
 * a `dark:` variant so it only applies once this provider adds a `dark`
 * class to <html> (see the `@custom-variant dark` rule in index.css).
 *
 * Theme Color and Plain Background (Settings → Appearance) are written onto
 * <html> as data attributes + CSS variables, read by the theme block at the
 * end of index.css.
 *
 * All three are persisted to localStorage so a reload keeps them.
 * ---------------------------------------------------------------------- */

const THEME_STORAGE_KEY = "trydood-admin-theme";
const BACKGROUND_STORAGE_KEY = "trydood-admin-background";
const PLAIN_STORAGE_KEY = "trydood-admin-plain-background";

const ThemeContext = createContext(null);

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // storage blocked (private mode) — choice just won't survive a reload
  }
}

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = readStorage(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "light";
}

/** Theme Color id (accent + gradient). */
function readStoredBackground() {
  const stored = readStorage(BACKGROUND_STORAGE_KEY);
  return BACKGROUND_THEMES.some((b) => b.id === stored) ? stored : DEFAULT_BACKGROUND;
}

/** Plain Background id, or null for "use the Theme Color's gradient". */
function readStoredPlainBackground() {
  const stored = readStorage(PLAIN_STORAGE_KEY);
  return PLAIN_BACKGROUNDS.some((b) => b.id === stored) ? stored : null;
}

/** Sets (or, with no preset, clears) one data attribute + its CSS vars on <html>. */
function setPresetOnRoot(root, attribute, varMap, preset) {
  if (!preset) {
    root.removeAttribute(attribute);
    Object.values(varMap).forEach((cssVar) => root.style.removeProperty(cssVar));
    return;
  }
  root.setAttribute(attribute, preset.id);
  Object.entries(varMap).forEach(([field, cssVar]) => {
    root.style.setProperty(cssVar, preset[field]);
  });
}

// Writes both independent choices onto <html> (read by index.css):
//   - Theme Color      → `data-bg` + accent/gradient vars (none for the
//     default green, so the original CSS applies untouched)
//   - Plain Background → `data-bg-solid` + solid colour vars; replaces just
//     the page background, so the Theme Color's accent still applies
function applyBackground(themeId, plainId) {
  const root = document.documentElement;
  const theme = BACKGROUND_THEMES.find((b) => b.id === themeId && b.id !== DEFAULT_BACKGROUND);
  const plain = PLAIN_BACKGROUNDS.find((b) => b.id === plainId);

  setPresetOnRoot(root, "data-bg", BACKGROUND_CSS_VARS, theme);
  setPresetOnRoot(root, "data-bg-solid", PLAIN_CSS_VARS, plain);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [background, setBackground] = useState(readStoredBackground);
  const [plainBackground, setPlainBackground] = useState(readStoredPlainBackground);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    writeStorage(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    applyBackground(background, plainBackground);
    writeStorage(BACKGROUND_STORAGE_KEY, background);
    writeStorage(PLAIN_STORAGE_KEY, plainBackground);
  }, [background, plainBackground]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === "dark",
        background,
        setBackground,
        plainBackground,
        setPlainBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives with its Provider
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
