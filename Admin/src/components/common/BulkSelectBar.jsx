/* -------------------------------------------------------------------------
 * BulkSelectBar — sits above a table: "Select all: <group> (n)" buttons to
 * pick every record of one status in a click, and, once something is
 * selected, the bulk actions valid for that selection.
 *
 *   groups:  [{ key, label, count, onSelect }]
 *   actions: [{ key, label, icon, count, onClick, tone? }]  (count 0 → hidden)
 * ---------------------------------------------------------------------- */
export default function BulkSelectBar({ groups, selectedCount, selectedTotal, actions, onClear }) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-medium text-neutral-500">Select all:</span>
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={g.onSelect}
            disabled={!g.count}
            className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
          >
            {g.label} <span className="text-neutral-400">{g.count}</span>
          </button>
        ))}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">
            {selectedCount} selected{selectedTotal ? ` · ${selectedTotal}` : ""}
          </span>
          {actions
            .filter((a) => a.count > 0)
            .map(({ key, label, icon: Icon, count, onClick, tone }) => (
              <button
                key={key}
                onClick={onClick}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  tone === "red"
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                    : "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
                }`}
              >
                {Icon && <Icon size={13} />} {label} ({count})
              </button>
            ))}
          <button onClick={onClear} className="rounded-xl px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
