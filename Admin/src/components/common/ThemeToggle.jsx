import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/* Header icon button — switches the whole app between light and dark mode. */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
