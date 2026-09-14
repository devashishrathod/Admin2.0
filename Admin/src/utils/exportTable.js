/* -------------------------------------------------------------------------
 * Reusable table-export helpers — CSV (real file download) and PDF
 * (native browser print-to-PDF, scoped to whatever element carries the
 * `.print-area` class via the print rules in index.css). No extra
 * dependencies; works the same on every page that uses it.
 * ---------------------------------------------------------------------- */

function csvCell(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * columns: [{ label, key }] or [{ label, value: (row) => string }]
 * rows: array of plain objects
 */
export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => csvCell(c.value ? c.value(row) : row[c.key]))
      .join(",")
  );
  const csv = [header, ...lines].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens the browser's print dialog — the user can "Save as PDF" there.
 *  Only the element(s) with the `print-area` class stay visible, per the
 *  @media print rules in index.css. */
export function printAsPdf() {
  window.print();
}
