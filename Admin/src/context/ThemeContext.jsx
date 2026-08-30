import React, { createContext, useContext, useEffect, useState } from "react";

/* -------------------------------------------------------------------------
 * ThemeContext — app-wide light/dark mode switch.
 *
 * Admin defaults to LIGHT mode. Dark mode is the app's original look —
 * every existing dark className stays exactly as it was, just moved behind
 * a `dark:` variant so it only applies once this provider adds a `dark`
 * class to <html> (see the `@custom-variant dark` rule in index.css).
 *
 * Persisted to localStorage so a reload keeps whatever the admin picked.
 * ---------------------------------------------------------------------- */

const THEME_STORAGE_KEY = "trydood-admin-theme";

const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
