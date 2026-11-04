/* Class strings shared by the Notifications components — the Dashboard's
 * look (Dashbaord.jsx): frosted-glass cards, soft inner tiles, tint pairs. */

// Same glass card as Dashboard's glassClass.
export const glass =
  "rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";
export const innerTile = "bg-white/70 dark:bg-neutral-950/50";

export const TINTS = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  pink: "bg-pink-400/10 text-pink-600 dark:text-pink-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

// Solid white + visible border + soft shadow, so fields read clearly even
// on the white inner tiles; green ring on focus.
export const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.05)] placeholder:text-neutral-400 outline-none transition-all hover:border-neutral-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:hover:border-neutral-600";
