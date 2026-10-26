import ValueOr from "../../../components/common/ValueOr";
import { MISSING } from "../../../utils/helpers";
import { glassClass, innerTile } from "../../brand/BrandDetails/components/bentoStyles";

// Small building blocks shared by every voucher-details section — the same
// bento look as the brand Overview tab (frosted-glass cards, tinted icon
// chips). Cards take their content's height (never stretched, so no empty
// space inside); the page balances its columns instead.

// Glass card with an icon chip + title header; `right` sits at the end of
// the header (a count, a button…).
export function DetailCard({ icon: Icon, tint = "neutral", title, subtitle, right, className = "", bodyClass = "p-5 pt-0", children }) {
  const tints = {
    neutral: "bg-neutral-200/70 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <section className={`${glassClass} flex flex-col overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 p-5 pb-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
              <Icon size={15} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-[14px] font-bold text-neutral-900 dark:text-neutral-50">{title}</h2>
            {subtitle && <p className="truncate text-[11.5px] text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className={`flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}

// Label / value tile. The value wraps (never cut with "…"), so a full
// date + time or a long code stays readable in a narrow column.
// `wide` spans both columns of a 2-column grid.
export function InfoRow({ icon: Icon, label, value, fallback = MISSING.generic, wide = false }) {
  return (
    <div className={`${innerTile} min-w-0 px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
        {Icon && <Icon size={11} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-neutral-800 dark:text-neutral-200">
        <ValueOr value={value} fallback={fallback} />
      </p>
    </div>
  );
}

// Green when `on`, grey otherwise (Active / Inactive style chips).
export function FlagChip({ on, children, danger = false }) {
  const cls = danger
    ? "bg-red-500/10 text-red-600 dark:text-red-400"
    : on
    ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
    : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{children}</span>;
}

// Label left, value right — for compact fact lists.
export function FactLine({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-neutral-800 dark:text-neutral-200">{children}</span>
    </div>
  );
}
