import { ChevronRight } from "lucide-react";

/* -------------------------------------------------------------------------
 * StatusStepButton — a status pill that doubles as the workflow button.
 * Shared by Settlement, Refund and the Voucher pages so every "move this
 * to the next status" control looks and behaves the same.
 *
 *  - Same width on every row, so a table's status column lines up.
 *  - With `stepLabel`: shows a ›, and on hover fills in and swaps its label
 *    to the next step ("Approve →"); click calls `onClick`.
 *  - Without `stepLabel`: a plain, non-clickable badge of the same size.
 * ---------------------------------------------------------------------- */

const TONES = {
  amber: { pill: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30", hover: "hover:bg-amber-500 hover:text-white hover:ring-amber-500", dot: "bg-amber-500" },
  sky: { pill: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/30", hover: "hover:bg-sky-500 hover:text-white hover:ring-sky-500", dot: "bg-sky-500" },
  violet: { pill: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30", hover: "hover:bg-violet-500 hover:text-white hover:ring-violet-500", dot: "bg-violet-500" },
  red: { pill: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30", hover: "hover:bg-red-500 hover:text-white hover:ring-red-500", dot: "bg-red-500" },
  emerald: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30", hover: "hover:bg-emerald-500 hover:text-white hover:ring-emerald-500", dot: "bg-emerald-500" },
  orange: { pill: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30", hover: "hover:bg-orange-500 hover:text-white hover:ring-orange-500", dot: "bg-orange-500" },
  fuchsia: { pill: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-400/10 dark:text-fuchsia-300 dark:ring-fuchsia-400/30", hover: "hover:bg-fuchsia-500 hover:text-white hover:ring-fuchsia-500", dot: "bg-fuchsia-500" },
  neutral: { pill: "bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700", hover: "hover:bg-neutral-700 hover:text-white hover:ring-neutral-700", dot: "bg-neutral-400" },
};

// `bare` drops the outline ring — for pills sitting on a photo (voucher
// card cover), where the ring reads as a border.
export default function StatusStepButton({ label, tone = "neutral", stepLabel, onClick, disabled = false, bare = false }) {
  const t = TONES[tone] || TONES.neutral;
  const base = `inline-flex w-28 items-center justify-between gap-2 rounded-full px-3 py-1.5 text-[8.5px] font-semibold ${bare ? "ring-0" : "ring-1"} ${t.pill}`;
  const statusLabel = (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
      <span className="truncate">{label}</span>
    </span>
  );

  if (!stepLabel) return <span className={base}>{statusLabel}</span>;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={stepLabel}
      className={`group/step ${base} cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${t.hover}`}
    >
      <span className="min-w-0 group-hover/step:hidden">{statusLabel}</span>
      <span className="hidden truncate group-hover/step:inline">{stepLabel}</span>
      <ChevronRight size={13} className="shrink-0 opacity-60 transition-transform group-hover/step:translate-x-0.5 group-hover/step:opacity-100" />
    </button>
  );
}
