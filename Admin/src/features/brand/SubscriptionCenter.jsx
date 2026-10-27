import React, { useMemo, useState } from "react";
import {
  X,
  Gift,
  Landmark,
  TrendingDown,
  ArrowLeftRight,
  Ban,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Download,
  ChevronRight,
  Receipt,
  ShieldCheck,
  Clock3,
  IndianRupee,
  Wallet,
  Crown,
  Sparkles,
  History,
  Info,
} from "lucide-react";
import { Field, inputClass, CollapsibleSectionCard, StatusBadge } from "./BrandShared";
import { CardHeader } from "./BrandDetails/components/Bento";
import { glassClass, cardClass, heroClass, innerTile, tints } from "./BrandDetails/components/bentoStyles";
import { usePlans } from "../plan/queries/planQueries";
import { grantSubscription, cancelSubscription } from "./services/subscriptionApi";
import { useBrands } from "./BrandContext";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, orText } from "../../utils/helpers";

/* -------------------------------------------------------------------------
 * SubscriptionCenter.jsx
 * The "Subscription" tab on BrandDetails — a command center for the admin
 * grant/downgrade/change-tier/cancel actions defined in the
 * "05 — Subscription · Admin management" Postman collection, all of which
 * hit the real backend (POST /subscribeds/admin/grant, PUT
 * /subscribeds/admin/cancel) rather than the mock brand data used elsewhere
 * on this page.
 * ---------------------------------------------------------------------- */

// Offline payment modes — exactly the values POST /subscribeds/admin/grant
// accepts (doc #76): FREE | CASH | BANK_TRANSFER | CHEQUE | UPI_OFFLINE.
const OFFLINE_PAYMENT_MODES = [
  ["BANK_TRANSFER", "Bank transfer (NEFT / IMPS / RTGS)"],
  ["UPI_OFFLINE", "UPI (collected outside the app)"],
  ["CASH", "Cash"],
  ["CHEQUE", "Cheque"],
];
const PAYMENT_MODE_LABEL = Object.fromEntries([["FREE", "Free"], ...OFFLINE_PAYMENT_MODES.map(([k, l]) => [k, l.split(" (")[0]])]);

// Doc #76 / #77: note and reason are mandatory, 3–500 characters.
const TEXT_MIN = 3;
const TEXT_MAX = 500;
const REFERENCE_MAX = 80;
const textError = (value, what) => {
  const n = value.trim().length;
  if (!n) return `${what} is required.`;
  if (n < TEXT_MIN) return `${what} must be at least ${TEXT_MIN} characters.`;
  if (n > TEXT_MAX) return `${what} can't be longer than ${TEXT_MAX} characters.`;
  return "";
};

const ACTION_META = {
  free: {
    title: "Grant Free Subscription",
    subtitle: "Give this brand complimentary access to a plan — no payment collected.",
    icon: Gift,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
    submitLabel: "Grant Free Access",
    canSchedule: true,
    points: [
      "No payment is taken (payment mode FREE) — a ₹0 invoice is still created.",
      "If the brand already has a plan, the server works out NEW / RENEW / UPGRADE / DOWNGRADE from the plan tier.",
      "A trial plan can be given only once per brand.",
      "The vendor gets a \"subscription granted\" notification.",
    ],
  },
  offline: {
    title: "Grant Subscription — Offline Payment",
    subtitle: "Record a payment collected outside the app (bank transfer, UPI, cash, cheque) and activate the plan.",
    icon: Landmark,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-400/10",
    submitLabel: "Record Payment & Grant",
    canSchedule: true,
    points: [
      "Records money collected outside the app against this plan.",
      "The collected amount can't be more than the plan total (with GST).",
      "An invoice is created and the vendor is notified.",
    ],
  },
  downgrade: {
    title: "Downgrade Subscription",
    subtitle: "Move the brand to a lower tier as a grandfathered exception.",
    icon: TrendingDown,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-400/10",
    submitLabel: "Confirm Downgrade",
    canSchedule: true,
    points: [
      "Pick a lower-tier plan — the server records it as a DOWNGRADE.",
      "Nothing is deleted: existing outlets, vouchers and albums keep running; new ones are blocked above the new limits.",
      "Fails if downgrades are switched off in platform settings.",
    ],
  },
  "change-tier": {
    title: "Change Tier, Keep End Date",
    subtitle: "Correct a mis-sold plan — same validity window, different tier.",
    icon: ArrowLeftRight,
    accent: "text-violet-600 dark:text-violet-400 bg-violet-400/10",
    submitLabel: "Change Tier",
    canSchedule: false,
    points: [
      "Keeps the current end date — only the plan tier changes (keepCurrentEndDate).",
      "Needs an active plan to take the end date from.",
      "No credit and no forfeit — the paid-for validity simply carries over.",
    ],
  },
};

function normalizePlanOption(raw) {
  return {
    id: raw?._id ?? raw?.id,
    name: raw?.name ?? "Untitled plan",
    price: raw?.price ?? 0,
    type: raw?.type ?? "MONTHLY",
    tier: raw?.tier ?? null,
    status: raw?.status ?? (raw?.isActive === false ? "Inactive" : "Active"),
  };
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : MISSING.date;
const money = (n) => (n == null || n === "" ? MISSING.amount : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const ACTION_TONES = {
  NEW: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  RENEW: "bg-sky-400/10 text-sky-700 dark:text-sky-400",
  UPGRADE: "bg-violet-400/10 text-violet-700 dark:text-violet-400",
  DOWNGRADE: "bg-amber-400/10 text-amber-700 dark:text-amber-400",
};

/* "What this does" box — the doc's notes for the action, in plain words. */
function WhatHappens({ points, tone = "neutral" }) {
  const box =
    tone === "danger"
      ? "bg-red-500/[0.05] ring-red-500/15 text-red-700 dark:text-red-300"
      : "bg-neutral-50 ring-neutral-200/80 text-neutral-600 dark:bg-white/[0.03] dark:ring-white/10 dark:text-neutral-300";
  return (
    <div className={`rounded-2xl px-3.5 py-3 ring-1 ${box}`}>
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-80">
        <Info size={12} /> What this does
      </p>
      <ul className="space-y-1">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-[12px] leading-snug">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* The brand's plan right now — so the admin sees what they're changing. */
function CurrentPlanStrip({ brand }) {
  const detail = brand.subscriptionDetail;
  const active = brand.expiredInDays > 0;
  return (
    <div className={`${innerTile} grid grid-cols-3 gap-2 px-3.5 py-2.5`}>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Current plan</p>
        <p className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{brand.subscriptionPlan && brand.subscriptionPlan !== "—" ? brand.subscriptionPlan : "No plan"}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Ends</p>
        <p className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{detail?.endDateDisplay && detail.endDateDisplay !== "—" ? detail.endDateDisplay : "No end date"}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Status</p>
        <p className={`truncate text-[13px] font-semibold ${active ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
          {active ? `${brand.expiredInDays} days left` : "Not active"}
        </p>
      </div>
    </div>
  );
}

function ResultTile({ label, value, mono = false, empty = MISSING.generic }) {
  return (
    <div className={`${innerTile} min-w-0 px-3 py-2`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-0.5 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono normal-case" : ""}`} title={typeof value === "string" ? value : undefined}>
        <ValueOr value={value} fallback={empty} />
      </p>
    </div>
  );
}

const modalShell =
  "max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-white/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] dark:border-white/5 dark:bg-neutral-900 dark:shadow-black/40";
const closeBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200";
const secondaryBtn =
  "rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200";

function Counter({ value, max }) {
  const n = value.trim().length;
  return <span className={`text-[10.5px] tabular-nums ${n > max ? "text-red-500" : "text-neutral-400"}`}>{n}/{max}</span>;
}

/* -------------------------------------------------------------------------
 * Grant modal — covers Free / Offline Payment / Downgrade / Change Tier, all
 * through POST /subscribeds/admin/grant (doc #76). After success it shows
 * what the server actually applied before closing.
 * ---------------------------------------------------------------------- */
export function GrantSubscriptionModal({ brand, action, onClose, onSuccess }) {
  const meta = ACTION_META[action];
  const plansQuery = usePlans();
  const plans = useMemo(() => {
    // GET /subscriptions/getAll → { data: { total, page, data: [...] } };
    // accept the flatter shapes too, and never call .map on a non-array.
    const res = plansQuery.data;
    const raw = Array.isArray(res) ? res : res?.data?.data ?? res?.data?.plans ?? res?.plans ?? res?.data ?? [];
    return (Array.isArray(raw) ? raw : [])
      .map(normalizePlanOption)
      .filter((p) => p.status !== "Inactive");
  }, [plansQuery.data]);
  const plansLoading = plansQuery.isPending;
  const plansError = plansQuery.error?.message ?? "";

  const [subscriptionId, setSubscriptionId] = useState("");
  const [mode, setMode] = useState("IMMEDIATE");
  const [paymentMode, setPaymentMode] = useState(OFFLINE_PAYMENT_MODES[0][0]);
  const [collectedAmount, setCollectedAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null); // server response after success

  const isOffline = action === "offline";
  const selectedPlan = plans.find((p) => p.id === subscriptionId);
  const noteError = textError(note, "Note");
  const amountError = isOffline && (collectedAmount === "" || Number(collectedAmount) < 0) ? "Enter the amount collected (₹0 or more)." : "";
  const canSubmit = subscriptionId && !noteError && !amountError && referenceNumber.trim().length <= REFERENCE_MAX;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit || submitting) return;

    // brandId must be the brand's Mongo _id (brand.id) — brand.brandId is
    // the human "BR-…" code, which the API rejects.
    const payload = {
      brandId: brand.id,
      subscriptionId,
      note: note.trim(),
      ...(isOffline
        ? {
            paymentMode,
            collectedAmount: Number(collectedAmount),
            ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
          }
        : { paymentMode: "FREE" }),
      ...(action === "change-tier" ? { keepCurrentEndDate: true } : {}),
      ...(meta.canSchedule && mode === "AFTER_CURRENT" ? { mode } : {}),
    };

    setSubmitting(true);
    setSubmitError("");
    try {
      setResult(await grantSubscription(payload));
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => onSuccess({ action, plan: selectedPlan, note: note.trim(), result });

  // ---- After success: what the server applied ----
  if (result) {
    const d = result?.data ?? {};
    const sub = d.subscribed ?? {};
    const txn = d.transaction ?? {};
    const pricing = d.pricing ?? {};
    const overflow = Object.entries(d.overflow ?? {}).filter(([, n]) => Number(n) > 0);
    const term = sub.durationValue ? `${sub.durationValue} ${String(sub.durationUnit || "").toLowerCase()}${sub.durationValue > 1 ? "s" : ""}` : sub.termDays ? `${sub.termDays} days` : null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div role="dialog" aria-modal="true" className={`${modalShell} max-w-lg`}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{meta.title} — done</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">{result?.message || "The subscription was updated."}</p>
            </div>
            {d.action && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${ACTION_TONES[d.action] || ACTION_TONES.NEW}`}>{d.action}</span>}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ResultTile label="Plan" value={selectedPlan?.name} empty={MISSING.plan} />
            <ResultTile label="Status" value={sub.status ? humanizeStatus(sub.status) : d.isScheduled ? "Scheduled" : null} empty="Not set" />
            <ResultTile label="Term" value={term} empty="Not set" />
            <ResultTile label="Starts" value={fmtDate(sub.startDate)} />
            <ResultTile label="Ends" value={sub.endDate ? fmtDate(sub.endDate) : null} empty="No end date" />
            <ResultTile label="Payment" value={PAYMENT_MODE_LABEL[txn.paymentMode] || txn.paymentMode} empty={MISSING.method} />
            <ResultTile label="Collected" value={money(sub.paidAmount)} />
            <ResultTile label="Plan total" value={money(pricing.totalPayable)} />
            <ResultTile label="Credit used" value={d.credit?.appliedToBill ? money(d.credit.appliedToBill) : null} empty={MISSING.none} />
          </div>

          {d.isScheduled && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-sky-400/10 px-3.5 py-2.5 text-[12px] text-sky-700 dark:text-sky-400">
              <Clock3 size={13} className="shrink-0" /> Queued — starts on {fmtDate(sub.startDate)}, when the current plan ends.
            </p>
          )}
          {overflow.length > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3.5 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Over the new limits (kept running, new ones blocked): {overflow.map(([k, n]) => `${n} ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`).join(", ")}.
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {txn.invoiceUrl ? (
              <a href={txn.invoiceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-sky-600 hover:underline dark:text-sky-400">
                <Download size={13} /> Invoice
              </a>
            ) : (
              <span />
            )}
            <button type="button" onClick={finish} className="rounded-xl bg-emerald-400 px-5 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- The form ----
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={submitting ? undefined : onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={`${modalShell} max-w-xl`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.accent}`}>
              <meta.icon size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{meta.title}</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">{meta.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close" className={closeBtn}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <CurrentPlanStrip brand={brand} />
          <WhatHappens points={meta.points} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Field label={`Plan${action === "downgrade" ? " (lower tier)" : ""}`} required>
            {plansLoading ? (
              <Loader variant="inline" label="Loading plans…" />
            ) : plansError ? (
              <p className="text-[12.5px] text-red-600 dark:text-red-400">{plansError}</p>
            ) : (
              <select value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} className={inputClass}>
                <option value="" disabled>
                  Select a plan…
                </option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{Number(p.price).toLocaleString("en-IN")} / {p.type === "MONTHLY" ? "mo" : "yr"}
                    {p.tier != null ? ` · tier ${p.tier}` : ""}
                  </option>
                ))}
              </select>
            )}
            {touched && !subscriptionId && <p className="mt-1 text-[11.5px] text-red-500">Choose a plan.</p>}
          </Field>

          {meta.canSchedule && (
            <Field label="When should it start?">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["IMMEDIATE", "Start now", "Replaces the current plan today"],
                  ["AFTER_CURRENT", "After current plan", brand.expiredInDays > 0 ? "Queued — starts when the current plan ends" : "Needs an active plan"],
                ].map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer flex-col rounded-xl px-3 py-2 ring-1 transition-colors ${
                      mode === value ? "bg-emerald-400/10 ring-emerald-400/50" : "ring-neutral-200 hover:bg-neutral-50 dark:ring-neutral-800 dark:hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
                      <input type="radio" name="grant-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="accent-emerald-500" />
                      {label}
                    </span>
                    <span className="mt-0.5 pl-5 text-[11px] text-neutral-500">{hint}</span>
                  </label>
                ))}
              </div>
            </Field>
          )}

          {isOffline && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Payment mode" required>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
                  {OFFLINE_PAYMENT_MODES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount collected (₹)" required>
                <input type="number" min="0" step="0.01" value={collectedAmount} onChange={(e) => setCollectedAmount(e.target.value)} placeholder="e.g. 3538.82" className={inputClass} />
                {touched && amountError && <p className="mt-1 text-[11.5px] text-red-500">{amountError}</p>}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reference number (UTR / cheque no.)">
                  <input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} maxLength={REFERENCE_MAX} placeholder="e.g. UTR2026082212345 — optional for cash" className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          {action === "change-tier" && (
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[12.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              <Calendar size={13} className="shrink-0 text-neutral-500" />
              Current end date {brand.subscriptionDetail?.endDateDisplay && brand.subscriptionDetail.endDateDisplay !== "—" ? `(${brand.subscriptionDetail.endDateDisplay}) ` : ""}is kept — only the tier changes.
            </div>
          )}

          <Field label="Note (why this is being done)" required>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Paid by NEFT on 22 Aug, confirmed by finance"
              className={inputClass}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11.5px] text-red-500">{touched ? noteError : ""}</span>
              <Counter value={note} max={TEXT_MAX} />
            </div>
          </Field>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button type="button" onClick={onClose} disabled={submitting} className={secondaryBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {meta.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Cancel modal — PUT /subscribeds/admin/cancel (doc #77)
 * ---------------------------------------------------------------------- */
const CANCEL_POINTS = [
  "Access stops now — every limit becomes 0, so nothing new can be created.",
  "Nothing is deleted: existing outlets, vouchers and albums stay live.",
  "Any plan queued after this one is cancelled too.",
  "No refund happens here — refunds are a separate process.",
  "The reason may be shown to the vendor — keep it professional.",
];

export function CancelSubscriptionModal({ brand, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const reasonError = textError(reason, "Reason");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (reasonError || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      // brand.id = Mongo _id (brand.brandId is the "BR-…" code).
      setResult(await cancelSubscription({ brandId: brand.id, reason: reason.trim() }));
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const d = result?.data ?? {};
    const queued = Array.isArray(d.cancelledScheduled) ? d.cancelledScheduled : [];
    const queuedPaid = queued.reduce((s, q) => s + (Number(q.paidAmount) || 0), 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div role="dialog" aria-modal="true" className={`${modalShell} max-w-md`}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Ban size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Subscription cancelled</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">{result?.message || "Access has been revoked."}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResultTile label="Cancelled on" value={fmtDate(d.subscribed?.cancelledAt)} />
            <ResultTile label="Queued plans cancelled" value={String(queued.length)} />
          </div>
          {queuedPaid > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3.5 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {money(queuedPaid)} was already paid for the queued plan{queued.length > 1 ? "s" : ""} — refund it separately if needed.
            </p>
          )}
          <div className="mt-5 flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button type="button" onClick={() => onSuccess({ reason: reason.trim(), result })} className="rounded-xl bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={submitting ? undefined : onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={`${modalShell} max-w-lg`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Ban size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Cancel Subscription</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                Revokes <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span>'s access immediately. To restore it later, grant a new plan.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close" className={closeBtn}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <CurrentPlanStrip brand={brand} />
          <WhatHappens points={CANCEL_POINTS} tone="danger" />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Reason" required>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Chargeback raised and lost — plan revoked as per policy"
              className={inputClass}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11.5px] text-red-500">{touched ? reasonError : ""}</span>
              <Counter value={reason} max={TEXT_MAX} />
            </div>
          </Field>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button type="button" onClick={onClose} disabled={submitting} className={secondaryBtn}>
              Keep Subscription
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Confirm Cancellation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Action card — one tile in the command-center grid
 * ---------------------------------------------------------------------- */
function ActionCard({ action, onClick }) {
  const meta = ACTION_META[action];
  return (
    <button
      onClick={onClick}
      className={`${innerTile} group flex items-start gap-3 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:bg-white dark:hover:bg-neutral-900`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.accent}`}>
        <meta.icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{meta.title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-neutral-500">{meta.subtitle}</p>
      </div>
      <ChevronRight size={15} className="mt-1 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
    </button>
  );
}

/* -------------------------------------------------------------------------
 * SubscriptionTab — current plan summary, grant/downgrade/cancel actions,
 * and the grant/payment history feed. Styled to match the platform-wide
 * Subscriptions list page: a small stat row, then a gradient hero card
 * with an embedded share-style donut, next to a white chart card.
 * ---------------------------------------------------------------------- */
// Price split bar: taxable value · GST · saved.
const SPLIT_BARS = ["bg-emerald-500", "bg-amber-500", "bg-sky-500"];

const STAT_TINTS = tints;

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const humanizeStatus = (v) =>
  String(v || "—")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

function StatTile({ icon: Icon, label, value, sub, tint = "emerald" }) {
  return (
    <div className={`${glassClass} flex h-full flex-col p-4`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${STAT_TINTS[tint]}`}>
        <Icon size={16} />
      </span>
      <span className="mt-3 text-[11.5px] font-medium text-neutral-500">{label}</span>
      <span className="truncate text-[22px] font-bold leading-tight tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">{value}</span>
      {sub && <span className="mt-0.5 truncate text-[11px] text-neutral-500">{sub}</span>}
    </div>
  );
}

function Ring({ pct, size = 80, stroke = 7, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const tone = v <= 10 ? "stroke-red-500" : v <= 25 ? "stroke-amber-500" : "stroke-emerald-600 dark:stroke-emerald-300";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-900/10 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className={`${tone} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Subscription record — the raw subscribed row, grouped. A real 0 shows as
 * "0" / "None" (DetailTile alone would turn it into a dash), and counters
 * the API didn't send at all are left out instead of showing a dash.
 * ---------------------------------------------------------------------- */
const sent = (v) => v !== undefined && v !== null && v !== "—" && v !== "";

function RecordGroup({ title, icon: Icon, children }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <Icon size={12} /> {title}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}

function RecordTile({ label, value, hint, mono = false, wide = false }) {
  return (
    <div className={`${innerTile} min-w-0 px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono text-[12px] normal-case" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {sent(value) ? value : <span className="font-normal text-neutral-400">Not recorded</span>}
      </p>
      {hint && <p className="mt-0.5 truncate text-[10.5px] text-neutral-400">{hint}</p>}
    </div>
  );
}

function SubscriptionRecord({ detail }) {
  const forfeitSent = sent(detail.forfeitedDays) || sent(detail.forfeitedValue);
  const forfeited = Number(detail.forfeitedDays) > 0;
  return (
    <div className="space-y-4">
      <RecordGroup title="Plan & term" icon={Calendar}>
        <RecordTile label="Status" value={humanizeStatus(detail.status)} hint={detail.isFreeGrant ? "Free grant" : null} />
        <RecordTile label="Duration" value={detail.durationLabel} hint={sent(detail.termDays) ? `${detail.termDays} days` : null} />
        {sent(detail.tier) && <RecordTile label="Tier" value={String(detail.tier)} />}
        <RecordTile label="Starts" value={detail.startDateDisplay} />
        <RecordTile label="Ends" value={detail.endDateDisplay} />
        <RecordTile label="Activated" value={detail.activatedAtDisplay} />
        {detail.cancelledAtDisplay && <RecordTile label="Cancelled" value={detail.cancelledAtDisplay} />}
      </RecordGroup>

      <RecordGroup title="Money" icon={IndianRupee}>
        <RecordTile label="List price" value={rupees(detail.price)} />
        <RecordTile label="Discount" value={Number(detail.discount) > 0 ? rupees(detail.discount) : "None"} />
        <RecordTile label="Paid" value={rupees(detail.paidAmount)} hint={detail.isFreeGrant ? "Nothing collected" : null} />
        <RecordTile label="Due" value={Number(detail.dueAmount) > 0 ? rupees(detail.dueAmount) : "Nothing due"} />
        <RecordTile label="Source" value={humanizeStatus(detail.source)} />
      </RecordGroup>

      {(forfeitSent || sent(detail.numberOfUpgrade) || sent(detail.remindersSentCount)) && (
        <RecordGroup title="Changes" icon={ArrowLeftRight}>
          {sent(detail.numberOfUpgrade) && <RecordTile label="Upgrades" value={String(detail.numberOfUpgrade)} />}
          {forfeitSent && (
            <RecordTile
              label="Forfeited"
              value={forfeited ? `${detail.forfeitedDays} days` : "None"}
              hint={forfeited ? rupees(detail.forfeitedValue) : "Recorded on the replaced plan — see history"}
            />
          )}
          {sent(detail.remindersSentCount) && <RecordTile label="Renewal reminders" value={String(detail.remindersSentCount)} />}
        </RecordGroup>
      )}

      {(detail.grantNote || detail.cancelReason) && (
        <div className="space-y-2">
          {detail.grantNote && (
            <p className="rounded-xl bg-emerald-400/[0.07] px-3.5 py-2.5 text-[12px] normal-case text-neutral-700 ring-1 ring-emerald-400/20 dark:text-neutral-200">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Grant note: </span>“{detail.grantNote}”
            </p>
          )}
          {detail.cancelReason && (
            <p className="rounded-xl bg-red-500/[0.05] px-3.5 py-2.5 text-[12px] normal-case text-neutral-700 ring-1 ring-red-500/15 dark:text-neutral-200">
              <span className="font-semibold text-red-600 dark:text-red-400">Cancel reason: </span>“{detail.cancelReason}”
            </p>
          )}
        </div>
      )}

      <RecordGroup title="References" icon={Receipt}>
        <RecordTile label="Plan ID" value={detail.subscriptionId} mono wide />
        <RecordTile label="Transaction ID" value={detail.transactionId} mono wide />
        <RecordTile label="Record ID" value={detail.id} mono wide />
        <RecordTile label="Last updated" value={detail.updatedAtDisplay} wide />
      </RecordGroup>
    </div>
  );
}

export function SubscriptionTab({ brand, onUpdate, readOnly = false }) {
  const [modalAction, setModalAction] = useState(null); // null | 'free' | 'offline' | 'downgrade' | 'change-tier'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const detail = brand.subscriptionDetail;
  const pricing = detail?.pricing;

  const pricingBreakdown = useMemo(() => {
    if (!pricing) return [];
    return [
      { name: "Taxable Value", value: Number(pricing.taxableValue) || 0 },
      { name: "GST", value: Number(pricing.gstAmount) || 0 },
      { name: "You Saved", value: Number(pricing.youSaved) || 0 },
    ].filter((d) => d.value > 0);
  }, [pricing]);

  const historyTrend = useMemo(() => {
    if (!brand.invoices?.length) return [];
    return [...brand.invoices]
      .reverse()
      .map((inv) => ({
        date: inv.date,
        amount: Number(String(inv.amount).replace(/[^\d.]/g, "")) || 0,
      }));
  }, [brand.invoices]);
  const splitTotal = pricingBreakdown.reduce((s, p) => s + p.value, 0) || 1;
  const trendMax = Math.max(...historyTrend.map((d) => d.amount), 1);

  // The local patches below show the change instantly. The /subscribeds
  // write already refreshes the brand list (shared interceptor); this also
  // re-pulls the brand's detail payload — the real subscription (end date,
  // pricing, remaining %) only comes from it, not from the list.
  const { syncAfterUpdate } = useBrands();

  const recordHistory = (entry) => {
    const history = [entry, ...(brand.invoices || [])];
    onUpdate(brand.id, { invoices: history });
  };

  const handleGrantSuccess = ({ action, plan, note, result }) => {
    const actionLabel = ACTION_META[action].title;
    // What was actually collected (₹0 for free grants), not the list price.
    const paid = result?.data?.subscribed?.paidAmount;
    recordHistory({
      id: `GR-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount: paid != null ? `₹${Number(paid).toLocaleString("en-IN")}` : plan ? `₹${Number(plan.price).toLocaleString("en-IN")}` : "—",
      status: "Paid",
      note: `${actionLabel}${plan ? ` — ${plan.name}` : ""}. ${note}`,
    });
    if (plan) {
      onUpdate(brand.id, { subscriptionPlan: plan.name, planPrice: `₹${Number(plan.price).toLocaleString("en-IN")}` });
    }
    syncAfterUpdate(brand.id);
    setModalAction(null);
    setSuccessMsg(`${actionLabel} applied successfully.`);
  };

  const handleCancelSuccess = ({ reason }) => {
    recordHistory({
      id: `CN-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount: "—",
      status: "Failed",
      note: `Subscription cancelled — ${reason}`,
    });
    onUpdate(brand.id, { subscriptionPlan: "Cancelled", expiredInDays: 0, remainderPercent: 0 });
    syncAfterUpdate(brand.id);
    setShowCancelModal(false);
    setSuccessMsg("Subscription cancelled.");
  };

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[12.5px] font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={14} className="shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Row 1 — KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={ShieldCheck} tint="emerald" label="Plan status" value={orText(detail ? humanizeStatus(detail.status) : brand.status, "Not set")} sub={detail?.isFreeGrant ? "Free grant" : detail ? orText(humanizeStatus(detail.source), null) : null} />
        <StatTile
          icon={Clock3}
          tint={brand.expiredInDays > 0 && brand.expiredInDays <= 15 ? "red" : "amber"}
          label="Days left"
          value={brand.expiredInDays > 0 ? brand.expiredInDays : "None"}
          sub={detail?.endDateDisplay && detail.endDateDisplay !== "—" ? `Ends ${detail.endDateDisplay}` : null}
        />
        <StatTile icon={IndianRupee} tint="sky" label="Paid" value={detail ? rupees(detail.paidAmount) : MISSING.amount} sub={detail?.discount ? `${rupees(detail.discount)} discount` : null} />
        <StatTile
          icon={Wallet}
          tint={detail?.dueAmount > 0 ? "red" : "violet"}
          label="Due"
          value={detail ? rupees(detail.dueAmount) : MISSING.amount}
          sub={detail?.dueAmount > 0 ? "Payment outstanding" : "Nothing due"}
        />
      </div>

      {/* Row 2 — plan hero · pricing */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className={`${heroClass} lg:col-span-5`}>
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
                <Crown size={15} />
              </span>
              <div>
                <p className="text-[11px] font-medium text-neutral-900/60 dark:text-neutral-300">Current plan</p>
                <p className="text-[20px] font-bold leading-tight tracking-tight text-neutral-950 dark:text-neutral-50">{orText(brand.subscriptionPlan, MISSING.plan)}</p>
              </div>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-bold tabular-nums text-neutral-900 dark:bg-white/10 dark:text-neutral-50">
              {orText(brand.planPrice, "No price")}
            </span>
          </div>

          <div className="relative mt-5 flex items-center gap-4">
            {brand.expiredInDays > 0 ? (
              <>
                <Ring pct={brand.remainderPercent} size={80} stroke={7}>
                  <span className="text-[14px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{Math.round(brand.remainderPercent || 0)}%</span>
                </Ring>
                <div className="min-w-0">
                  <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-neutral-950 dark:text-neutral-50">
                    {brand.expiredInDays}
                    <span className="ml-1 text-[13px] font-semibold text-neutral-900/60 dark:text-neutral-400">days left</span>
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-neutral-900/60 dark:text-neutral-400">of the current {brand.subscriptionTerm || "term"}</p>
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-neutral-900/60 dark:text-neutral-400">No active period right now.</p>
            )}
          </div>

          <div className="relative mt-auto grid grid-cols-2 gap-2 pt-5">
            {[
              ["Started", detail?.startDateDisplay, MISSING.date],
              ["Ends", detail?.endDateDisplay, "No end date"],
            ].map(([label, value, empty]) => (
              <div key={label} className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-900/50 dark:text-neutral-400">{label}</p>
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100"><ValueOr value={value} fallback={empty} /></p>
              </div>
            ))}
          </div>

          <div className="relative mt-2 flex flex-wrap gap-1.5">
            {detail?.isFreeGrant && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:bg-white/10 dark:text-emerald-300">Free grant</span>}
            {detail?.isUpgraded && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-sky-700 dark:bg-white/10 dark:text-sky-300">Upgraded</span>}
            {detail?.isExpired && <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10.5px] font-semibold text-red-600 dark:bg-white/10 dark:text-red-300">Expired</span>}
          </div>
        </div>

        <div className={`${cardClass} lg:col-span-7`}>
          <CardHeader
            icon={Receipt}
            tint="violet"
            title="Pricing"
            subtitle={pricing ? `${pricing.taxType || "GST"} · ${pricing.gstPercentage != null ? `${pricing.gstPercentage}% GST` : "GST % not set"}${pricing.placeOfSupplyState ? ` · ${pricing.placeOfSupplyState}` : ""}` : "No pricing on this subscription"}
          />
          {pricing ? (
            <>
              {/* Split bar */}
              {pricingBreakdown.length > 0 && (
                <div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
                    {pricingBreakdown.map((p, i) => (
                      <div key={p.name} className={SPLIT_BARS[i]} style={{ width: `${(p.value / splitTotal) * 100}%` }} />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                    {pricingBreakdown.map((p, i) => (
                      <span key={p.name} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${SPLIT_BARS[i]}`} /> {p.name} {rupees(p.value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  ["List price", rupees(pricing.listPrice)],
                  ["Promo discount", pricing.promoDiscount ? rupees(pricing.promoDiscount) : MISSING.none],
                  ["Taxable value", rupees(pricing.taxableValue)],
                  ["CGST", rupees(pricing.cgst)],
                  ["SGST", rupees(pricing.sgst)],
                  ["IGST", rupees(pricing.igst)],
                ].map(([label, value]) => (
                  <div key={label} className={`${innerTile} px-3 py-2`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-end justify-between gap-3 border-t border-neutral-200/70 pt-3 dark:border-white/10">
                <div>
                  <p className="text-[11px] text-neutral-500">Total payable</p>
                  <p className="text-[22px] font-bold leading-tight tabular-nums text-neutral-900 dark:text-neutral-50">{rupees(pricing.totalPayable)}</p>
                </div>
                <div className="text-right">
                  {pricing.youSaved > 0 && (
                    <span className="inline-flex rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Saved {rupees(pricing.youSaved)}
                    </span>
                  )}
                  {pricing.hsnSacCode && <p className="mt-1 text-[10.5px] text-neutral-400">HSN/SAC {pricing.hsnSacCode}</p>}
                </div>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-[12px] text-neutral-400">No pricing details</p>
          )}
        </div>
      </div>

      {/* Row 3 — admin actions (dummy brands are view-only) */}
      {!readOnly && (
        <div className={cardClass}>
          <CardHeader icon={Sparkles} tint="emerald" title="Grant or change subscription" subtitle="Every action is logged in the history below" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <ActionCard action="free" onClick={() => setModalAction("free")} />
            <ActionCard action="offline" onClick={() => setModalAction("offline")} />
            <ActionCard action="downgrade" onClick={() => setModalAction("downgrade")} />
            <ActionCard action="change-tier" onClick={() => setModalAction("change-tier")} />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-500/[0.05] px-4 py-3 ring-1 ring-red-500/15">
            <div className="flex items-center gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${STAT_TINTS.red}`}>
                <Ban size={15} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">Cancel subscription</p>
                <p className="text-[11.5px] text-neutral-500">Revokes access immediately — for chargebacks or policy violations.</p>
              </div>
            </div>
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
            >
              <Ban size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Full record */}
      {detail && (
        <CollapsibleSectionCard title="Subscription record" icon={FileText} tint="neutral" defaultOpen={false}>
          <SubscriptionRecord detail={detail} />
        </CollapsibleSectionCard>
      )}

      {/* Grant & payment history (this session's actions + invoices) */}
      <div className={cardClass}>
        <CardHeader icon={History} tint="sky" title="Grant & payment history" subtitle={brand.invoices?.length ? `${brand.invoices.length} entr${brand.invoices.length === 1 ? "y" : "ies"}` : "Nothing recorded yet"} />
        {!brand.invoices?.length ? (
          <p className="py-6 text-center text-[12px] text-neutral-400">No invoices or grants recorded yet.</p>
        ) : (
          <>
            {historyTrend.length > 1 && historyTrend.some((d) => d.amount > 0) && (
              <div className="mb-3 flex h-20 items-end gap-1.5">
                {historyTrend.map((d, i) => (
                  <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
                    <div className="w-full rounded-md bg-emerald-400/80 group-hover:bg-emerald-500" style={{ height: `${Math.max(6, (d.amount / trendMax) * 100)}%` }} />
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[10.5px] text-white group-hover:block dark:bg-white dark:text-neutral-900">
                      {d.date} · {rupees(d.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ol className="relative space-y-2 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
              {brand.invoices.map((inv) => {
                const failed = inv.status === "Failed";
                return (
                  <li key={inv.id} className="relative">
                    <span className={`absolute -left-5 top-3.5 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-neutral-900 ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
                    <div className={`${innerTile} flex items-center justify-between gap-3 px-3.5 py-2.5`}>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold normal-case text-neutral-800 dark:text-neutral-100">{inv.id}</p>
                        <p className="text-[11px] text-neutral-500">{inv.date}</p>
                        {inv.note && <p className="mt-0.5 text-[12px] normal-case text-neutral-600 dark:text-neutral-400">{inv.note}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-[13px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">{inv.amount}</span>
                        <StatusBadge status={inv.status} activeLabel="Paid" />
                        {!inv.note && (
                          <button
                            aria-label="Download invoice"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          >
                            <Download size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {modalAction && (
        <GrantSubscriptionModal
          brand={brand}
          action={modalAction}
          onClose={() => setModalAction(null)}
          onSuccess={handleGrantSuccess}
        />
      )}

      {showCancelModal && (
        <CancelSubscriptionModal
          brand={brand}
          onClose={() => setShowCancelModal(false)}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
}
