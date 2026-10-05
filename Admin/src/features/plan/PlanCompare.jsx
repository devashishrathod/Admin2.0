import React, { useEffect, useState } from "react";
import { Check, Loader2, Lock, X } from "lucide-react";
import { getPlanComparison } from "./services/planApi";

/* -------------------------------------------------------------------------
 * Plan comparison (#75e) — the same grid vendors see. `columns[]` are the
 * plans (tier → length → price order), `rows[].cells[i]` belongs to
 * `columns[i]`; `display` is already formatted by the server.
 * ---------------------------------------------------------------------- */

function CellValue({ cell }) {
  if (!cell) return <span className="text-neutral-400 dark:text-neutral-700">—</span>;
  const raw = cell.raw;
  const isBool = raw && typeof raw === "object" && "isEnabled" in raw && Object.keys(raw).length === 1;
  if (isBool || (cell.display == null && typeof cell.isIncluded === "boolean")) {
    return cell.isIncluded ? (
      <Check size={15} className="mx-auto text-emerald-600 dark:text-emerald-400" />
    ) : (
      <X size={15} className="mx-auto text-red-600/70 dark:text-red-400/70" />
    );
  }
  return (
    <span className={cell.isIncluded === false ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-800 dark:text-neutral-200"}>
      {cell.display ?? "—"}
    </span>
  );
}

export default function PlanCompare() {
  const [includeInactive, setIncludeInactive] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getPlanComparison(includeInactive);
        if (!cancelled) setData(res?.data ?? res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includeInactive]);

  const columns = Array.isArray(data?.columns) ? data.columns : [];
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const groups = Array.isArray(data?.groups) ? data.groups : [];

  // Rows grouped in the server's group order; rows with an unknown group last.
  const groupName = (g) => (typeof g === "string" ? g : g?.name ?? g?.label ?? g?.group ?? "");
  const groupOrder = groups.map(groupName);
  const grouped = [];
  rows.forEach((row) => {
    const name = row.group ?? "";
    let bucket = grouped.find((b) => b.name === name);
    if (!bucket) {
      bucket = { name, rows: [] };
      grouped.push(bucket);
    }
    bucket.rows.push(row);
  });
  grouped.sort((a, b) => {
    const ia = groupOrder.indexOf(a.name);
    const ib = groupOrder.indexOf(b.name);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12.5px] text-neutral-500">Exactly what vendors see on the plans page.</p>
        <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 accent-emerald-400"
          />
          Include inactive plans
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
          <Loader2 size={16} className="animate-spin" />
          Loading comparison…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
          Failed to load comparison: {error}
        </div>
      )}

      {!loading && !error && !columns.length && (
        <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
          No plans to compare yet.
        </div>
      )}

      {!loading && !error && columns.length > 0 && (
        <div className="overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-[13px]">
              <thead>
                <tr className="bg-white dark:bg-neutral-900">
                  <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Feature
                  </th>
                  {columns.map((col) => (
                    <th key={col.planId ?? col._id} className="px-4 py-3.5 text-center align-top">
                      <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{col.name}</p>
                      <p className="mt-0.5 text-[11px] font-normal text-neutral-500">
                        {[col.tier != null && `Tier ${col.tier}`, col.durationLabel ?? col.typeLabel].filter(Boolean).join(" · ")}
                      </p>
                      {(col.discountedPrice ?? col.price) != null && (
                        <p className="mt-0.5 text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
                          ₹{Number(col.discountedPrice ?? col.price).toLocaleString("en-IN")}
                        </p>
                      )}
                      {col.isActive === false && (
                        <span className="mt-1 inline-block rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800">
                          Inactive
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map((bucket) => (
                  <React.Fragment key={bucket.name || "_"}>
                    {bucket.name && (
                      <tr className="bg-neutral-100 dark:bg-neutral-900/70">
                        <td
                          colSpan={columns.length + 1}
                          className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                        >
                          {bucket.name}
                        </td>
                      </tr>
                    )}
                    {bucket.rows.map((row, i) => (
                      <tr
                        key={row.key ?? i}
                        className={i % 2 === 0 ? "bg-neutral-50 dark:bg-neutral-950" : "bg-white dark:bg-neutral-900/40"}
                      >
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            {row.isSystem && <Lock size={11} className="shrink-0" />}
                            {row.label ?? row.key}
                          </span>
                        </td>
                        {columns.map((col, ci) => (
                          <td key={col.planId ?? col._id ?? ci} className="px-4 py-3 text-center">
                            <CellValue cell={row.cells?.[ci]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
