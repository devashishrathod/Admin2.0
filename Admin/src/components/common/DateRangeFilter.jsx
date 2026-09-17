import { CalendarRange, X } from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared start-date/end-date range picker — one compact control so every
 * list page (Settlement, Refund, Transaction, ...) filters by date the
 * same way instead of each page inventing its own layout.
 * `startDate`/`endDate` are plain "YYYY-MM-DD" strings (native <input
 * type="date"> shape) or "".
 * ---------------------------------------------------------------------- */
export default function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange, onClear }) {
  const hasRange = Boolean(startDate || endDate);
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
      <CalendarRange size={14} className="shrink-0 text-neutral-500" />
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        max={endDate || undefined}
        aria-label="Start date"
        className="w-[122px] bg-transparent text-[12.5px] text-neutral-800 focus:outline-none dark:text-neutral-200 [color-scheme:light] dark:[color-scheme:dark]"
      />
      <span className="text-neutral-400">–</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        min={startDate || undefined}
        aria-label="End date"
        className="w-[122px] bg-transparent text-[12.5px] text-neutral-800 focus:outline-none dark:text-neutral-200 [color-scheme:light] dark:[color-scheme:dark]"
      />
      {hasRange && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear date range"
          className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
