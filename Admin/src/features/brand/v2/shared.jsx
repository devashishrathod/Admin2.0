import { Loader2 } from "lucide-react";
import { CardHeader } from "../BrandDetails/components/Bento";
import { cardClass, innerTile, tints } from "../BrandDetails/components/bentoStyles";

/* -------------------------------------------------------------------------
 * Small shared components for the brand detail's onboarding v2 sections
 * (admin guide §4–§13). Plain helpers live in ./util.js.
 * ---------------------------------------------------------------------- */

/** Glass card with the bento header — one per section. */
export function V2Card({ icon, tint = "emerald", title, subtitle, action, children, className = "" }) {
  return (
    <section className={`${cardClass} ${className}`}>
      <CardHeader icon={icon} tint={tint} title={title} subtitle={subtitle} action={action} />
      {children}
    </section>
  );
}

const CHIP_TONES = {
  emerald: tints.emerald,
  amber: tints.amber,
  sky: tints.sky,
  violet: tints.violet,
  red: tints.red,
  neutral: tints.neutral,
};

export function Chip({ tone = "neutral", title, children }) {
  return (
    <span title={title} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CHIP_TONES[tone] || CHIP_TONES.neutral}`}>
      {children}
    </span>
  );
}

/** Label + value tile. `empty` shows when the value is missing. */
export function KV({ label, value, empty = "Not set", mono = false, children }) {
  const has = value != null && value !== "";
  return (
    <div className={`${innerTile} min-w-0 px-3 py-2.5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <div className={`mt-0.5 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono" : ""}`}>
        {children ?? (has ? value : <span className="font-normal text-neutral-400">{empty}</span>)}
      </div>
    </div>
  );
}

const BTN_TONES = {
  primary: "bg-emerald-400 text-neutral-950 hover:bg-emerald-300",
  dark: "bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900",
  danger: "bg-red-500 text-white hover:bg-red-400",
  warn: "bg-amber-400 text-neutral-950 hover:bg-amber-300",
  ghost:
    "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800",
};

export function Btn({ tone = "ghost", busy = false, disabled = false, onClick, type = "button", title, children }) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BTN_TONES[tone] || BTN_TONES.ghost}`}
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

/** Counter for capped text fields. */
export function Count({ value, max }) {
  const n = String(value || "").trim().length;
  return <span className={`text-[10.5px] tabular-nums ${n > max ? "text-red-500" : "text-neutral-400"}`}>{n}/{max}</span>;
}
