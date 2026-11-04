import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, UserMinus, UserPlus, X } from "lucide-react";
import { AUDIENCE_GROUPS, PICK_PAGE_SIZE } from "../../notificationConfig";
import { initialsOf, matchesKeyword } from "../../utils/notificationUtils";
import { Avatar, Button, Pill, Segmented } from "../NotificationUi";
import { inputClass, innerTile } from "../notificationStyles";
import CommonEmptyState from "../../../../components/common/EmptyState";

function PickRow({ row, checked, onToggle }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-white/80 dark:hover:bg-neutral-800/40">
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 shrink-0 accent-emerald-500" />
      <Avatar name={row.name} src={row.logo} initials={initialsOf(row.name)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{row.name}</p>
        <p className="truncate text-[11px] text-neutral-500">{row.sub || "—"}</p>
      </div>
      <span title={row.contact} className="hidden truncate text-[11.5px] normal-case tabular-nums text-neutral-500 sm:block sm:max-w-[200px]">{row.contact}</span>
      <Pill tint={row.active ? "emerald" : "neutral"}>{row.active ? "Active" : "Inactive"}</Pill>
    </label>
  );
}

/* Pick from list — tick individual customers, vendors or outlet managers
 * (any mix). Picks are kept per group, so switching tabs never drops them. */
export default function PickListAudience({ picked, onPick, directory }) {
  const [groupKey, setGroupKey] = useState("customers");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const src = directory[groupKey];
  const selected = picked[groupKey];
  const selectedIds = useMemo(() => new Set(selected.map((r) => r.id)), [selected]);

  const results = useMemo(() => src.rows.filter((r) => matchesKeyword(r, query)), [src.rows, query]);
  const pages = Math.max(1, Math.ceil(results.length / PICK_PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = results.slice((current - 1) * PICK_PAGE_SIZE, current * PICK_PAGE_SIZE);
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  const toggle = (row) =>
    onPick(groupKey, selectedIds.has(row.id) ? selected.filter((r) => r.id !== row.id) : [...selected, { id: row.id, name: row.name }]);
  const togglePage = () =>
    onPick(
      groupKey,
      allOnPage
        ? selected.filter((r) => !pageRows.some((p) => p.id === r.id))
        : [...selected, ...pageRows.filter((r) => !selectedIds.has(r.id)).map((r) => ({ id: r.id, name: r.name }))]
    );

  const totalPicked = AUDIENCE_GROUPS.reduce((n, g) => n + picked[g.key].length, 0);

  return (
    <div className="space-y-3">
      <Segmented
        size="sm"
        value={groupKey}
        onChange={(k) => {
          setGroupKey(k);
          setPage(1);
        }}
        options={AUDIENCE_GROUPS.map((g) => ({ key: g.key, label: g.label, icon: g.icon, badge: picked[g.key].length || null }))}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, phone or ID"
            className={`${inputClass} pl-9`}
          />
        </div>
        <Button icon={allOnPage ? UserMinus : UserPlus} onClick={togglePage} disabled={!pageRows.length}>
          {allOnPage ? "Unselect page" : "Select page"}
        </Button>
      </div>

      <div className={`overflow-hidden rounded-2xl ${innerTile}`}>
        {src.loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-neutral-500">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : src.error ? (
          <CommonEmptyState variant="compact" title="Couldn't load this list" description={src.error} className="py-8" />
        ) : pageRows.length ? (
          <div className="divide-y divide-emerald-100/70 dark:divide-neutral-800/70">
            {pageRows.map((r) => (
              <PickRow key={r.id} row={r} checked={selectedIds.has(r.id)} onToggle={() => toggle(r)} />
            ))}
          </div>
        ) : (
          <CommonEmptyState variant="compact" title={query ? `Nobody matches "${query}"` : "Nobody here yet"} className="py-8" />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-neutral-500">
        <span>
          {results.length.toLocaleString("en-IN")} shown
          {src.total > src.rows.length && ` · newest ${src.rows.length} of ${src.total} loaded`}
        </span>
        <div className="flex items-center gap-1">
          <Button size="icon" icon={ChevronLeft} aria-label="Previous page" disabled={current <= 1} onClick={() => setPage(current - 1)} />
          <span className="px-1.5 tabular-nums">
            {current} / {pages}
          </span>
          <Button size="icon" icon={ChevronRight} aria-label="Next page" disabled={current >= pages} onClick={() => setPage(current + 1)} />
        </div>
      </div>

      {totalPicked > 0 && (
        <div className={`rounded-2xl p-3 ${innerTile}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11.5px] font-semibold text-neutral-600 dark:text-neutral-300">{totalPicked} picked</p>
            <button
              type="button"
              onClick={() => AUDIENCE_GROUPS.forEach((g) => onPick(g.key, []))}
              className="text-[11px] font-semibold text-neutral-400 hover:text-red-500"
            >
              Clear all
            </button>
          </div>
          <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {AUDIENCE_GROUPS.flatMap((g) =>
              picked[g.key].map((r) => (
                <span
                  key={`${g.key}-${r.id}`}
                  className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-300"
                >
                  <g.icon size={10} className="text-emerald-500" />
                  {r.name}
                  <button
                    type="button"
                    aria-label={`Remove ${r.name}`}
                    onClick={() => onPick(g.key, picked[g.key].filter((x) => x.id !== r.id))}
                    className="text-neutral-400 hover:text-red-500"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
