// Theme colour presets for the Admin panel, picked on the Settings page
// (Appearance → Theme Color). Same presets as the Vendor Panel. A preset
// changes, in both light and dark mode:
//   - the page background (light: one colour at the top fading to white;
//     dark: a deep tint of the hue at the top fading to near-black),
//   - the accent colour — every `emerald-*` / `teal-*` Tailwind utility
//     (buttons, badges, rings, icons, charts using var(--color-emerald-*)),
//     by regenerating those palettes from `hue` + `chroma` in index.css.
// ThemeContext writes the chosen preset onto <html> as `data-bg` + CSS
// variables. `green` is the original look and sets nothing at all, so it
// renders exactly as before.

export const DEFAULT_BACKGROUND = "green";

/**
 * @typedef {Object} BackgroundTheme
 * @property {string} id
 * @property {string} label
 * @property {number} hue     OKLCH hue the accent palette is rebuilt around
 * @property {number} chroma  saturation multiplier vs. Tailwind's emerald (0 = gray)
 * @property {string} top     light mode: colour at the very top of the page
 * @property {string} mid     light mode: softer tint the top fades through before white
 */

/** @type {BackgroundTheme[]} */
export const BACKGROUND_THEMES = [
  { id: "green", label: "Trydood Green", hue: 162.48, chroma: 1, top: "#E9F8EF", mid: "#F5FBF7" },
  { id: "violet", label: "Violet", hue: 280, chroma: 1.05, top: "#CBC8FF", mid: "#E7E5FF" },
  { id: "blue", label: "Ocean Blue", hue: 255, chroma: 1, top: "#CFE2FF", mid: "#E8F1FF" },
  { id: "sky", label: "Sky", hue: 232, chroma: 0.95, top: "#CFF0FB", mid: "#E9F8FD" },
  { id: "lavender", label: "Lavender", hue: 305, chroma: 1, top: "#EAD9FF", mid: "#F5ECFF" },
  { id: "rose", label: "Rose", hue: 0, chroma: 1, top: "#FFD6E4", mid: "#FFEBF2" },
  { id: "peach", label: "Peach", hue: 45, chroma: 1, top: "#FFDEC7", mid: "#FFEFE4" },
  { id: "sunshine", label: "Sunshine", hue: 85, chroma: 1, top: "#FFF0BD", mid: "#FFF8E0" },
  { id: "gray", label: "Soft Gray", hue: 255, chroma: 0.15, top: "#E2E5EA", mid: "#F1F2F5" },
  { id: "white", label: "Silver", hue: 255, chroma: 0, top: "#F8F9FA", mid: "#FCFCFD" },
];

/**
 * Plain (solid, no gradient) page backgrounds — a separate, optional choice
 * on top of the Theme Color. It replaces only the page background; the
 * Theme Color's accent (green, violet, …) still colours buttons, text,
 * badges and cards. Glows are switched off so the page really is plain.
 * @typedef {Object} PlainBackground
 * @property {string} id
 * @property {string} label
 * @property {string} solid      light-mode page colour
 * @property {string} darkSolid  dark-mode page colour
 */

/** @type {PlainBackground[]} */
export const PLAIN_BACKGROUNDS = [
  { id: "plain-white", label: "White", solid: "#FFFFFF", darkSolid: "#030712" },
  { id: "plain-gray", label: "Light Gray", solid: "#F3F4F6", darkSolid: "#111827" },
  { id: "plain-cream", label: "Cream", solid: "#FFFBEB", darkSolid: "#16130B" },
  { id: "plain-mint", label: "Mint", solid: "#ECFDF5", darkSolid: "#04140E" },
  { id: "plain-ice", label: "Ice Blue", solid: "#EFF6FF", darkSolid: "#0A1020" },
];

/** CSS custom properties ThemeContext sets on <html> for a plain background. */
export const PLAIN_CSS_VARS = {
  solid: "--shell-solid",
  darkSolid: "--shell-dark-solid",
};

/** CSS custom properties ThemeContext sets on <html> for a non-default preset. */
export const BACKGROUND_CSS_VARS = {
  hue: "--accent-h",
  chroma: "--accent-c",
  top: "--shell-top",
  mid: "--shell-mid",
};

/**
 * Preset's main accent colour (its emerald-500 equivalent), for previews.
 * Same formula index.css uses, so the swatch matches the real buttons.
 * @param {BackgroundTheme} preset
 */
export const accentPreview = (preset) => `oklch(69.6% ${0.17 * preset.chroma} ${preset.hue})`;

/**
 * Preset's dark-mode top tint, for previews (matches index.css).
 * @param {BackgroundTheme} preset
 */
export const darkTopPreview = (preset) =>
  preset.id === DEFAULT_BACKGROUND ? "#06231b" : `oklch(26% ${0.06 * preset.chroma} ${preset.hue})`;
