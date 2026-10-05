import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Users, X } from "lucide-react";
import { applyTerms, previewApplyTerms } from "./services/planApi";

/* -------------------------------------------------------------------------
 * Shared dialogs for the plan screens:
 *  - ImpactConfirmModal — the "in use" 409 of plan delete / deactivate and
 *    feature delete: shows `details.impact`, "… anyway" resends with the token.
 *  - ApplyTermsModal — push a plan's current limits onto running
 *    subscribers: preview (#75c) → confirm with impactToken (#75d).
 * ---------------------------------------------------------------------- */

// Labels for the enforced (system) limit keys — used wherever a limit key
// shows up raw (apply-terms changes, over-limit buckets).
export const ENTITLEMENT_LABELS = {
  subBrands: "Outlets",
  franchises: "Franchises",
  vouchers: "Vouchers",
  showcase: "Showcase",
  dealPack: "Deal Pack",
  prioritySupport: "Priority Support",
};

// Plan-usage `impact` keys (#75 delete, #74 deactivate)
export const PLAN_IMPACT_LABELS = {
  activeSubscriptions: "Active subscriptions",
  activeBrands: "Brands on it now",
  scheduledSubscriptions: "Queued purchases",
  totalPurchases: "Total purchases",
  brandsEver: "Brands ever",
  openOrders: "Unpaid orders",
  promoCodes: "Scoped promo codes",
};

// Renders a limit/flag value the way the plan form shows it.
export function formatEntitlementValue(value) {
  if (value == null) return "—";
  if (typeof value !== "object") return String(value);
  if ("isEnabled" in value) return value.isEnabled ? "Enabled" : "Disabled";
  if (value.isUnlimited) return "Unlimited";
  if ("limit" in value) return String(value.limit ?? 0);
  if ("number" in value) return String(value.number);
  if ("text" in value) return value.text || "—";
  return "—";
}

function ModalShell({ children, maxWidth = "max-w-md", onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div
        className={`relative max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20`}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function ErrorLine({ message }) {
  if (!message) return null;
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}

/* -------------------------------------------------------------------------
 * ImpactConfirmModal
 * ---------------------------------------------------------------------- */

export function ImpactConfirmModal({
  title,
  message,
  impact,
  impactLabels = PLAN_IMPACT_LABELS,
  confirmLabel,
  busy,
  error,
  tone = "red",
  onCancel,
  onConfirm,
}) {
  const rows = impact
    ? Object.entries(impact).filter(([, v]) => typeof v === "number")
    : [];
  const names = Array.isArray(impact?.planNames) ? impact.planNames : [];
  const confirmClass =
    tone === "red"
      ? "bg-red-500 text-white hover:bg-red-400"
      : "bg-amber-400 text-neutral-950 hover:bg-amber-300";

  return (
    <ModalShell onClose={busy ? undefined : onCancel}>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <AlertTriangle size={18} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
          {message && <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{message}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {rows.map(([key, value]) => (
            <div key={key} className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60">
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{impactLabels[key] || key}</p>
              <p
                className={`mt-0.5 text-[15px] font-semibold ${
                  value > 0 ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-600"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
      {names.length > 0 && (
        <p className="mt-3 text-[12px] text-neutral-500">
          Plans: <span className="text-neutral-700 dark:text-neutral-300">{names.join(", ")}</span>
        </p>
      )}

      <ErrorLine message={error} />

      <div className="mt-5 flex items-center justify-end gap-2.5">
        <button
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${confirmClass}`}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------
 * ApplyTermsModal
 * ---------------------------------------------------------------------- */

function CountTile({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950/60" title={hint}>
      <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">{value ?? 0}</p>
    </div>
  );
}

export function ApplyTermsModal({ plan, labels = ENTITLEMENT_LABELS, onClose }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await previewApplyTerms(plan.id);
        if (!cancelled) setImpact(res?.data ?? res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  const confirm = async () => {
    setApplying(true);
    setError("");
    setNotice("");
    try {
      const res = await applyTerms(plan.id, impact.impactToken);
      setResult({ message: res?.message, ...(res?.data ?? {}) });
    } catch (err) {
      // Stale token → 409 with the fresh impact; show it and let them re-confirm.
      const fresh = err.details?.impact ?? err.details;
      if (err.status === 409 && fresh?.impactToken) {
        setImpact(fresh);
        setNotice(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setApplying(false);
    }
  };

  const counts = impact?.counts ?? {};
  const changes = Array.isArray(impact?.changes) ? impact.changes : [];
  const overLimit = impact?.overLimit ?? { total: 0, brands: [] };
  const nothingToDo = impact && !counts.affected;

  return (
    <ModalShell maxWidth="max-w-2xl" onClose={applying ? undefined : onClose}>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-sky-600 dark:text-sky-400">
          <Users size={18} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
            Apply limits to current subscribers · {plan.name}
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
            Plan edits only reach new purchases. This pushes the plan's current limits onto running and
            queued purchases too. Price, duration and dates never change.
          </p>
        </div>
      </div>

      {loading && (
        <div className="mt-6 flex items-center justify-center gap-2 py-8 text-[13px] text-neutral-500">
          <Loader2 size={15} className="animate-spin" />
          Checking who this affects…
        </div>
      )}

      {result && (
        <div className="mt-5">
          <p className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-3 py-2.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} className="shrink-0" />
            {result.message || `${result.applied ?? 0} subscription(s) updated`}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <CountTile label="Applied" value={result.applied} />
            <CountTile label="Skipped" value={result.skipped} />
            <CountTile label="Failed" value={result.failed?.length ?? 0} />
          </div>
          {result.failed?.length > 0 && (
            <ul className="mt-3 space-y-1 text-[12px] text-red-600 dark:text-red-400">
              {result.failed.map((f, i) => (
                <li key={i}>{typeof f === "string" ? f : f.message || f.subscribedId || JSON.stringify(f)}</li>
              ))}
            </ul>
          )}
          {result.overLimit?.length > 0 && (
            <p className="mt-3 text-[12px] text-amber-700 dark:text-amber-400">
              {result.overLimit.length} brand(s) are now over a limit — nothing was deleted, they just can't add more.
            </p>
          )}
        </div>
      )}

      {!loading && !result && impact && (
        <>
          {notice && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/5 px-3 py-2.5 text-[12.5px] text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {notice}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <CountTile label="Will change" value={counts.affected} hint="Purchases updated on confirm" />
            <CountTile label="Active" value={counts.active} />
            <CountTile label="Queued" value={counts.scheduled} />
            <CountTile label="Already current" value={counts.alreadyCurrent} />
            <CountTile
              label="Pre-freeze"
              value={counts.followingLivePlan}
              hint="Older purchases that read the live plan — they won't change"
            />
          </div>

          <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Changes</p>
          {changes.length ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-[12.5px]">
                <thead className="bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-950/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Limit</th>
                    <th className="px-3 py-2 text-left font-semibold">From</th>
                    <th className="px-3 py-2 text-left font-semibold">To</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.key} className="border-t border-neutral-200 dark:border-neutral-800">
                      <td className="px-3 py-2 font-medium text-neutral-800 dark:text-neutral-200">
                        {labels[c.key] || c.key}
                      </td>
                      <td className="px-3 py-2 text-neutral-500">
                        {(c.from || [])
                          .map((f) => `${formatEntitlementValue(f.value)} (${f.count})`)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatEntitlementValue(c.to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-[12.5px] text-neutral-500 dark:border-neutral-800">
              Every running purchase already has these limits.
            </p>
          )}

          {overLimit.total > 0 && (
            <>
              <p className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Over the new limit · {overLimit.total} brand(s)
              </p>
              <p className="mb-2 text-[12px] text-neutral-500">
                Nothing gets deleted — these brands just can't add more until they're under the limit.
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-neutral-50 p-3 text-[12.5px] dark:bg-neutral-950/60">
                {(overLimit.brands || []).map((b) => (
                  <li key={b.brandId} className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{b.brandName || b.brandId}</span>
                    <span className="text-neutral-500">
                      {(b.buckets || [])
                        .map((k) => `${labels[k.key] || k.key}: ${k.used}/${k.newLimit} (+${k.overflowBy})`)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
                {overLimit.total > (overLimit.brands || []).length && (
                  <li className="text-neutral-500">…and {overLimit.total - overLimit.brands.length} more</li>
                )}
              </ul>
            </>
          )}
        </>
      )}

      <ErrorLine message={error} />

      <div className="mt-5 flex items-center justify-end gap-2.5">
        <button
          onClick={onClose}
          disabled={applying}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
        >
          {result ? "Done" : "Cancel"}
        </button>
        {!result && impact && (
          <button
            onClick={confirm}
            disabled={applying || nothingToDo}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {applying && <Loader2 size={14} className="animate-spin" />}
            {nothingToDo ? "Nothing to change" : `Apply to ${counts.affected} subscription(s)`}
          </button>
        )}
      </div>
    </ModalShell>
  );
}
