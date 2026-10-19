import { Check, Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import {
  BACKGROUND_THEMES,
  PLAIN_BACKGROUNDS,
  accentPreview,
  darkTopPreview,
} from "@/constants/backgroundThemes";

/* -------------------------------------------------------------------------
 * Settings → Appearance. Unlike every other Settings section this is a
 * per-device preference (ThemeContext + localStorage), not part of the
 * platform settings document — so it applies instantly, no Save button.
 *
 *  - Mode: light / dark
 *  - Theme Color: accent for every emerald/teal utility + page gradient
 *  - Plain Background: optional flat page colour that replaces only the
 *    gradient; the Theme Color's accent still applies on top of it
 * ---------------------------------------------------------------------- */

const MODE_OPTIONS = [
  { key: "light", label: "Light Mode", icon: Sun },
  { key: "dark", label: "Dark Mode", icon: Moon },
];

// Mini-preview background for a Theme Color preset in the current mode
// (mirrors the real .app-shell-bg gradient in index.css).
function gradientPreview(preset, isDark) {
  return isDark
    ? `linear-gradient(to bottom, ${darkTopPreview(preset)} 0%, #030712 85%)`
    : `linear-gradient(to bottom, ${preset.top} 0%, ${preset.mid} 45%, #ffffff 100%)`;
}

const cardClass =
  "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";
const sectionTitle = "text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500";
const tileClass = (active) =>
  `rounded-xl p-1.5 text-left transition-all ${
    active
      ? "ring-2 ring-emerald-400"
      : "ring-1 ring-neutral-200 hover:ring-neutral-300 dark:ring-neutral-800 dark:hover:ring-neutral-700"
  }`;

// One preview tile: page background (gradient or flat) + a "button" in the
// given colour, a check when selected, and the preset's name underneath.
function PreviewTile({ active, label, background, buttonStyle, buttonClass = "", isDark, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={tileClass(active)}>
      {/* Dynamic per preset, so inline styles. */}
      <div
        className="relative h-16 overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
        style={background}
      >
        <div
          className={`absolute inset-x-2 bottom-2 flex h-5 items-center justify-end rounded px-1 shadow-sm ${
            isDark ? "bg-neutral-800/80" : "bg-white/90"
          }`}
        >
          <span className={`h-3 w-7 rounded-sm ${buttonClass}`} style={buttonStyle} />
        </div>
        {active && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-neutral-950 shadow">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 truncate px-0.5 text-[12px] font-medium ${
          active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
        }`}
      >
        {label}
      </p>
    </button>
  );
}

export default function AppearanceThemePicker() {
  const { theme, setTheme, isDark, background, setBackground, plainBackground, setPlainBackground } = useTheme();
  const activeTheme = BACKGROUND_THEMES.find((b) => b.id === background) ?? BACKGROUND_THEMES[0];

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div className={cardClass}>
        <p className={`mb-4 ${sectionTitle}`}>Mode</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {MODE_OPTIONS.map(({ key, label, icon: Icon }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                aria-pressed={active}
                className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active
                      ? "bg-emerald-400 text-neutral-950"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className="flex-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{label}</span>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Color */}
      <div className={cardClass}>
        <p className={sectionTitle}>Theme Color</p>
        <p className="mb-4 mt-1 text-[12px] text-neutral-500">
          Changes every button, badge and highlight, plus the page gradient (unless a Plain Background is set
          below) — in light and dark mode.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BACKGROUND_THEMES.map((preset) => (
            <PreviewTile
              key={preset.id}
              active={background === preset.id}
              label={preset.label}
              isDark={isDark}
              background={{ background: gradientPreview(preset, isDark) }}
              buttonStyle={{ backgroundColor: accentPreview(preset) }}
              onClick={() => setBackground(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* Plain Background */}
      <div className={cardClass}>
        <p className={sectionTitle}>Plain Background</p>
        <p className="mb-4 mt-1 text-[12px] text-neutral-500">
          Swap the gradient for one flat colour — buttons, text and cards keep your {activeTheme.label} theme colour.
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[{ id: null, label: "None" }, ...PLAIN_BACKGROUNDS].map((preset) => (
            <PreviewTile
              key={preset.id ?? "none"}
              active={plainBackground === preset.id}
              label={preset.label}
              isDark={isDark}
              background={
                preset.id
                  ? { backgroundColor: isDark ? preset.darkSolid : preset.solid }
                  : { background: gradientPreview(activeTheme, isDark) }
              }
              // bg-emerald-500 already follows the live Theme Color.
              buttonClass="bg-emerald-500"
              onClick={() => setPlainBackground(preset.id)}
            />
          ))}
        </div>
      </div>

      <p className="text-[11.5px] text-neutral-500">
        Saved on this device only and applied across the whole Admin panel instantly — no Save needed.
      </p>
    </div>
  );
}
