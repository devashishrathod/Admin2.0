import { readSheet } from "read-excel-file/browser";

/* -------------------------------------------------------------------------
 * Spreadsheet import for bulk actions (e.g. per-settlement approval notes
 * or payout UTRs). Reads the first sheet of an .xlsx file, or a .csv file
 * (what Excel's "Save as CSV" produces), and returns one object per data
 * row keyed by its header.
 *
 * Headers are normalised — lower-cased with spaces, underscores, dashes and
 * dots removed — so "Settlement ID", "settlement_id" and "SettlementId" all
 * become `settlementid`.
 * ---------------------------------------------------------------------- */

export const normaliseHeader = (h) => String(h ?? "").toLowerCase().replace(/[\s_.-]/g, "");

// Minimal RFC-4180 CSV parser: quoted fields, escaped quotes, CRLF/LF.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Reads an .xlsx / .csv File into [{ normalisedHeader: value, ... }]. */
export async function readSheetRows(file) {
  const name = file?.name?.toLowerCase() || "";
  let grid;
  if (name.endsWith(".csv")) {
    grid = parseCsv(await file.text());
  } else if (name.endsWith(".xlsx")) {
    grid = await readSheet(file);
  } else {
    throw new Error("Please upload an .xlsx or .csv file.");
  }

  const [header = [], ...body] = grid;
  const keys = header.map(normaliseHeader);
  return body
    .filter((cells) => cells.some((c) => c !== null && String(c).trim() !== ""))
    .map((cells) => Object.fromEntries(keys.map((k, i) => [k, cells[i] ?? ""])));
}
