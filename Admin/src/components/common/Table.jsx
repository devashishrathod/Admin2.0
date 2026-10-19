import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EmptyState from "./EmptyState";

export function StatusBadge({ status, activeLabel = "Active" }) {
  const isActive = status === activeLabel;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
        ${
          isActive
            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-400" : "bg-neutral-500"
        }`}
      />
      {status}
    </span>
  );
}

/**
 * Generic data table used across pages (Category, Plan, Voucher, Brand, Team...).
 *
 * columns: [{ key, label, align?, width?, render?(row, rowIndex) }]
 *   - key: unique key for the column
 *   - label: header text shown in <th>
 *   - align: "left" | "center" | "right" (default "left")
 *   - width: optional tailwind width class, e.g. "w-16"
 *   - cellClass: optional classes for this column's <td>. Cells default to
 *     whitespace-nowrap so dates and codes never break across lines; pass
 *     e.g. "min-w-48 max-w-64 whitespace-normal" for a long-text column
 *     that should wrap to a couple of lines instead of widening the table.
 *   - render: optional custom cell renderer; falls back to row[key]
 *   - sticky: pin the column to the right edge while the table scrolls
 *     sideways (use on the last "Action" column so it's never cut off)
 *
 * data: array of row objects, each should have a unique `id`
 * emptyMessage: title shown when data is empty (kept for existing callers)
 * emptyTitle / emptyDescription / emptyIcon / emptyAction: optional richer
 *   empty state (see EmptyState.jsx) — emptyIcon takes a preset key like
 *   "brand" or a lucide icon; emptyAction is { label, onClick, icon }.
 * rowKey: field to use as the React key (default "id")
 *
 * Pagination (all optional — the footer only renders when `onPageChange`
 * is passed): page (1-based current page), totalPages, onPageChange(page),
 * total (raw record count, for the "Showing X–Y of Z" caption), pageSize.
 */
export default function Table({
  columns = [],
  data = [],
  emptyMessage = "No records found.",
  emptyTitle,
  emptyDescription,
  emptyIcon = "search",
  emptyAction,
  rowKey = "id",
  minWidth = 760,
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  // Compact mode — smaller row padding/font so a wider set of columns
  // (real-data pages with lots of fields) fits without feeling cramped.
  // Opt-in only; every existing caller keeps the current spacious sizing.
  dense = false,
}) {
  const alignClass = (align) =>
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  const showPagination = typeof onPageChange === "function" && totalPages > 1;
  const rangeStart = page && pageSize ? (page - 1) * pageSize + 1 : null;
  const rangeEnd = page && pageSize ? Math.min((page - 1) * pageSize + data.length, total ?? Infinity) : null;
  const cellPad = dense ? "px-3 py-2" : "px-4 py-3";
  const bodyTextSize = dense ? "text-xs" : "text-[13px]";

  return (
    // Soft emerald → white diagonal gradient behind the rows (ends on plain
    // white / neutral-900 at the right, matching the sticky column's bg).
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-emerald-100/70 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 dark:shadow-black/20 dark:ring-emerald-900/30">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${bodyTextSize}`} style={{ minWidth: minWidth ? `${minWidth}px` : undefined }}>
          <thead>
            <tr className="border-b border-emerald-200/70 bg-gradient-to-r from-emerald-100 to-emerald-50 dark:border-emerald-900/60 dark:from-emerald-950 dark:to-emerald-950/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${cellPad} whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.08em] text-emerald-800 dark:text-emerald-300 ${alignClass(
                    col.align
                  )} ${col.width || ""} ${
                    col.sticky ? "sticky right-0 z-10 bg-emerald-50 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.25)] dark:bg-emerald-950" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-0"
                >
                  <EmptyState
                    variant="compact"
                    icon={emptyIcon}
                    title={emptyTitle || String(emptyMessage).replace(/\.$/, "")}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className="group/row border-b border-emerald-100/60 transition-colors last:border-b-0 hover:bg-emerald-50/60 dark:border-neutral-800/70 dark:hover:bg-emerald-950/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`${cellPad} align-middle text-neutral-700 dark:text-neutral-300 ${alignClass(
                        col.align
                      )} ${col.cellClass || "whitespace-nowrap"} ${
                        col.sticky
                          ? "sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.25)] group-hover/row:bg-emerald-50 dark:bg-neutral-900 dark:group-hover/row:bg-[#0f1f1a]"
                          : ""
                      }`}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="flex flex-col items-center justify-between gap-3 px-5 py-3.5 sm:flex-row">
          <p className="text-[12.5px] text-neutral-500">
            {rangeStart != null
              ? `Showing ${rangeStart} to ${rangeEnd} of ${total} record${total === 1 ? "" : "s"}`
              : `Page ${page} of ${totalPages}`}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                  n === page
                    ? "bg-emerald-400 text-neutral-950"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}