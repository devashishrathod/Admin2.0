import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 *   - render: optional custom cell renderer; falls back to row[key]
 *
 * data: array of row objects, each should have a unique `id`
 * emptyMessage: text shown when data is empty
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
  rowKey = "id",
  minWidth = 760,
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
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

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: minWidth ? `${minWidth}px` : undefined }}>
          <thead>
            <tr className="bg-neutral-50/70 dark:bg-neutral-950/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ${alignClass(
                    col.align
                  )} ${col.width || ""}`}
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
                  className="px-5 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-4 text-neutral-700 dark:text-neutral-300 ${alignClass(
                        col.align
                      )}`}
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