// Shared bento/glass styles for the brand-details tabs — same recipe as the
// dashboard cards, so light and dark themes look consistent.

export const glassClass =
  "rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";

// Card that fills its grid cell so cards side by side share one height.
export const cardClass = `${glassClass} flex h-full flex-col p-5`;

// Emerald "hero" card (one per tab).
export const heroClass =
  "relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-emerald-200/80 via-emerald-100/70 to-white/60 p-5 shadow-[0_8px_30px_rgba(16,185,129,0.15)] backdrop-blur-xl dark:border-emerald-400/10 dark:from-emerald-500/25 dark:via-emerald-600/10 dark:to-neutral-900/60";

// Tile inside a glass card.
export const innerTile = "rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 dark:bg-neutral-950/50 dark:ring-white/5";

export const tints = {
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export const has = (v) => v != null && v !== "" && v !== "—";
