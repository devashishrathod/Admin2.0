import React from "react";

export function StatusBadge({ status, activeLabel = "Active" }) {
  const isActive = status === activeLabel;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
        ${
          isActive
            ? "bg-emerald-400/10 text-emerald-400"
            : "bg-neutral-700/40 text-neutral-400"
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
 */
export default function Table({
  columns = [],
  data = [],
  emptyMessage = "No records found.",
  rowKey = "id",
}) {
  const alignClass = (align) =>
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-800/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 ${alignClass(
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
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className="border-b border-neutral-800/70 transition-colors last:border-b-0 hover:bg-neutral-800/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-neutral-300 ${alignClass(
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
    </div>
  );
}