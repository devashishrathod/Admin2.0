import { useState } from "react";
import { X, Download, Upload, Loader2, AlertTriangle } from "lucide-react";
import { downloadCsv } from "../../utils/exportTable";
import { readSheetRows } from "../../utils/importSheet";

/* -------------------------------------------------------------------------
 * BulkActionModal — runs one admin action on many selected records
 * (settlements, refunds, …). There are no bulk endpoints, so each record is
 * sent through its normal API one after another, with a per-row result.
 *
 * `input` decides what the admin fills in:
 *   - "none"   → nothing (e.g. Start Payout)
 *   - "note"   → optional note: one for all, or per record from Excel/CSV
 *   - "reason" → required reason: one for all, or per record from Excel/CSV
 *   - "utr"    → per-record UTR / Mode / Paid At, always from Excel/CSV
 *                (each payout has its own bank reference)
 * File rows are matched to records by the "ID" column (getRef or id).
 * ---------------------------------------------------------------------- */

const PAYOUT_MODES = ["NEFT", "IMPS", "RTGS", "UPI"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// Excel gives Date objects for date cells; CSV gives text.
function toIsoDate(value) {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function BulkActionModal({
  title,
  actionLabel,
  rows,
  getRef = (r) => r.id,
  getAmount = () => 0,
  getSubtitle = () => "",
  input = "none",
  templateName = "bulk",
  onRun,
  onClose,
}) {
  const textInput = input === "note" || input === "reason";
  const [source, setSource] = useState("same"); // "same" | "file" (note / reason)
  const [sameText, setSameText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [fromFile, setFromFile] = useState({}); // record id -> { text } | { utr, mode, paidAt }
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({}); // record id -> { ok, error }

  const usesFile = input === "utr" || (textInput && source === "file");
  const textLabel = input === "reason" ? "Reason" : "Note";
  const done = Object.keys(results).length;

  const downloadTemplate = () => {
    const base = [
      { label: "ID", value: getRef },
      { label: "Name", value: getSubtitle },
      { label: "Amount", value: getAmount },
    ];
    const extra =
      input === "utr"
        ? [
            { label: "UTR", value: () => "" },
            { label: "Mode", value: () => "NEFT" },
            { label: "Paid At", value: () => "" },
          ]
        : [{ label: textLabel, value: () => "" }];
    downloadCsv(`${templateName}-template`, [...base, ...extra], rows);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    try {
      const sheet = await readSheetRows(file);
      const byRef = {};
      rows.forEach((r) => {
        byRef[String(getRef(r)).trim().toLowerCase()] = r.id;
        byRef[String(r.id).trim().toLowerCase()] = r.id;
      });
      const map = {};
      sheet.forEach((line) => {
        const ref = String(line.id ?? line.settlementid ?? line.refundid ?? "").trim().toLowerCase();
        const id = byRef[ref];
        if (!id) return;
        if (input === "utr") {
          const mode = String(line.mode ?? "").trim().toUpperCase();
          map[id] = {
            utr: String(line.utr ?? "").trim(),
            mode: PAYOUT_MODES.includes(mode) ? mode : "NEFT",
            paidAt: toIsoDate(line.paidat),
          };
        } else {
          map[id] = { text: String(line[textLabel.toLowerCase()] ?? line.notes ?? "").trim() };
        }
      });
      if (!Object.keys(map).length) {
        throw new Error("No rows in the file matched the selected records — check the ID column.");
      }
      setFromFile(map);
      setFileName(file.name);
    } catch (err) {
      setFromFile({});
      setFileName("");
      setFileError(err.message);
    }
  };

  // What will be sent for each record, or why it's skipped.
  const plan = rows.map((r) => {
    if (input === "none") return { r, payload: {} };
    if (textInput) {
      const text = source === "same" ? sameText.trim() : fromFile[r.id]?.text || "";
      if (input === "reason" && !text) return { r, skip: "Reason missing" };
      return { r, payload: { text: text || undefined } };
    }
    const f = fromFile[r.id];
    if (!f) return { r, skip: "Not in file" };
    if (!f.utr) return { r, skip: "UTR missing" };
    if (!f.paidAt) return { r, skip: "Invalid Paid At" };
    return { r, payload: f };
  });
  const runnable = plan.filter((p) => !p.skip);
  const canRun = !running && done === 0 && runnable.length > 0 && (!usesFile || fileName);

  const run = async () => {
    setRunning(true);
    for (const p of runnable) {
      try {
        await onRun(p.r, p.payload);
        setResults((prev) => ({ ...prev, [p.r.id]: { ok: true } }));
      } catch (err) {
        setResults((prev) => ({ ...prev, [p.r.id]: { ok: false, error: err.message } }));
      }
    }
    setRunning(false);
  };

  const okCount = Object.values(results).filter((x) => x.ok).length;
  const failCount = done - okCount;
  const finished = done > 0 && !running;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={running ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              {rows.length} selected · {inr(rows.reduce((sum, r) => sum + (Number(getAmount(r)) || 0), 0))}
            </p>
          </div>
          <button onClick={onClose} disabled={running} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800">
            <X size={15} />
          </button>
        </div>

        {done === 0 && textInput && (
          <>
            <div className="mt-4 flex gap-1 rounded-xl bg-neutral-100 p-1 text-[12.5px] font-medium dark:bg-neutral-800">
              {[["same", `Same ${textLabel.toLowerCase()} for all`], ["file", `Different ${textLabel.toLowerCase()}s (Excel)`]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSource(key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 transition-colors ${source === key ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50" : "text-neutral-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {source === "same" && (
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  {textLabel} {input === "reason" ? "(required — the customer/vendor sees it)" : "(optional)"}
                </span>
                <textarea
                  rows={2}
                  value={sameText}
                  onChange={(e) => setSameText(e.target.value)}
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                />
              </label>
            )}
          </>
        )}

        {done === 0 && usesFile && (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
            <p className="text-[12.5px] text-neutral-600 dark:text-neutral-300">
              {input === "utr"
                ? "Every payout has its own bank reference. Download the template, fill in UTR (and Mode / Paid At) against each ID, then upload it."
                : `Download the template, write a ${textLabel.toLowerCase()} against each ID, then upload it.${input === "note" ? " Rows left blank go without a note." : " Rows left blank are skipped."}`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">
                <Download size={13} /> Download template
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900">
                <Upload size={13} /> {fileName ? "Replace file" : "Upload Excel / CSV"}
                <input type="file" accept=".xlsx,.csv" onChange={handleFile} className="hidden" />
              </label>
              {fileName && <span className="truncate text-[12px] text-emerald-600 dark:text-emerald-400">✓ {fileName}</span>}
            </div>
            {fileError && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400">
                <AlertTriangle size={12} /> {fileError}
              </p>
            )}
          </div>
        )}

        {/* Preview / results */}
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-neutral-100 dark:border-neutral-800">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 bg-neutral-50 text-[10.5px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-950">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2 text-right">Amount</th>
                {input !== "none" && <th className="px-3 py-2">{input === "utr" ? "UTR · Mode" : textLabel}</th>}
                <th className="px-3 py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {plan.map(({ r, payload, skip }) => {
                const res = results[r.id];
                return (
                  <tr key={r.id} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">
                      <p className="font-medium text-neutral-800 dark:text-neutral-200">{getRef(r)}</p>
                      {getSubtitle(r) && <p className="truncate text-[11px] text-neutral-400">{getSubtitle(r)}</p>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{inr(getAmount(r))}</td>
                    {input !== "none" && (
                      <td className="max-w-56 truncate px-3 py-2 text-neutral-500">
                        {input === "utr" ? (payload ? `${payload.utr} · ${payload.mode}` : "—") : payload?.text || "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      {res ? (
                        res.ok ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Done</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400" title={res.error}>✗ {res.error}</span>
                        )
                      ) : skip ? (
                        <span className="text-amber-600 dark:text-amber-400">Skipped · {skip}</span>
                      ) : running ? (
                        <Loader2 size={13} className="ml-auto animate-spin text-neutral-400" />
                      ) : (
                        <span className="text-neutral-400">Ready</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(running || finished) && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(done / runnable.length) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-neutral-500">
              {running ? `Processing ${done + 1} of ${runnable.length}…` : `${okCount} done${failCount ? `, ${failCount} failed` : ""}.`}
            </p>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} disabled={running} className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">
            {finished ? "Close" : "Cancel"}
          </button>
          {!finished && (
            <button
              onClick={run}
              disabled={!canRun}
              className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running && <Loader2 size={14} className="animate-spin" />}
              {actionLabel} {runnable.length ? `(${runnable.length})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
