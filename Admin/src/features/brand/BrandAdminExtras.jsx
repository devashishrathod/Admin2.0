import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { History, RefreshCw, Loader2, AlertTriangle, CheckCircle2, X, Layers, ChevronDown, Receipt, ShieldCheck } from "lucide-react";
import { SectionCard, CollapsibleSectionCard, EmptyState, Field, inputClass } from "./BrandShared";
import { updateOutlet, updateOutletWhatsapp } from "./services/BrandApi";
import { getBrandSubscription, getBrandSubscriptionHistory, resyncBrandSubscription } from "./services/subscriptionApi";
import { getVerificationHistory } from "../newOnboarding/services/NewOnboardingApi";
import { queryKeys } from "../../lib/query";
import { isNotFoundMessage, MISSING } from "../../utils/helpers";
import Loader from "../../components/common/Loader";
import useBackLayer from "../../lib/useBackLayer";

/* -------------------------------------------------------------------------
 * Brand detail add-ons for super admin API doc endpoints the page didn't
 * use yet. Each block sits below an existing tab's content and leaves that
 * content as it was:
 *   - Outlet modals         → #30 edit, #28a change number (used by the
 *                             Sub-Brand tab, BrandDetails/tabs/SubBrandTab)
 *   - VerificationHistory   → GET /brands/verifications/history (#25)
 *   - LiveSubscriptionPanel → GET /subscribeds/get (#82), /history (#83), resync (#81)
 * ---------------------------------------------------------------------- */

const humanize = (v) =>
  String(v || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "Not set";

// Display-only formatters: a missing date reads "Not set", never a bare dash.
const fmtDate = (iso) => {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? MISSING.date : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtDateTime = (iso) => {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? MISSING.date
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const isValidWhatsapp = (n) => /^[6-9]\d{9}$/.test(String(n || ""));

function Pill({ tone = "neutral", children }) {
  const tones = {
    emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
    neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  };
  return <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone, children }) {
  const cls =
    tone === "error"
      ? "bg-red-500/5 text-red-600 dark:text-red-400"
      : tone === "warn"
      ? "bg-amber-400/10 text-amber-700 dark:text-amber-400"
      : "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400";
  const Icon = tone === "error" || tone === "warn" ? AlertTriangle : CheckCircle2;
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] ${cls}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children }) {
  useBackLayer(true, onClose); // browser Back closes the modal first
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-neutral-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:hover:text-neutral-200">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({ onCancel, onConfirm, disabled, submitting, label }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onCancel} className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled || submitting}
        className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting && <Loader2 size={14} className="animate-spin" />}
        {label}
      </button>
    </div>
  );
}

/* ---- Outlets ---------------------------------------------------------- */

// PUT /subBrands/update/:id — only changed fields are sent (email is the
// manager ACCOUNT's email; outletType switches plan pools).
export function EditOutletModal({ outlet, onClose, onSaved }) {
  const [form, setForm] = useState({
    email: outlet.email || "",
    outletType: outlet.outletType || "OUTLET",
    description: outlet.description || "",
    isActive: outlet.isActive !== false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const body = {};
  if (form.email.trim() && form.email.trim() !== (outlet.email || "")) body.email = form.email.trim();
  if (form.outletType !== (outlet.outletType || "OUTLET")) body.outletType = form.outletType;
  if (form.description !== (outlet.description || "")) body.description = form.description;
  if (form.isActive !== (outlet.isActive !== false)) body.isActive = form.isActive;
  const changed = Object.keys(body).length > 0;

  const save = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await updateOutlet(outlet._id, body);
      onSaved(res?.message || "Outlet updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit outlet" subtitle={`${outlet.storeId || outlet.uniqueId || outlet._id}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Manager email">
          <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
        </Field>
        <Field label="Outlet type">
          <select value={form.outletType} onChange={(e) => setForm((f) => ({ ...f, outletType: e.target.value }))} className={inputClass}>
            <option value="OUTLET">Outlet</option>
            <option value="FRANCHISE">Franchise</option>
          </select>
        </Field>
        {form.outletType !== (outlet.outletType || "OUTLET") && (
          <Notice tone="warn">Switching type moves this outlet to the other plan pool — it fails if that pool is full.</Notice>
        )}
        <Field label="Description">
          <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-[13px] text-neutral-700 dark:text-neutral-300">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 accent-emerald-500" />
          Visible to customers (active)
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={save} disabled={!changed} submitting={submitting} label="Save" />
    </Modal>
  );
}

// PATCH /subBrands/:id/whatsapp-number — only before the manager verifies.
export function ChangeNumberModal({ outlet, onClose, onSaved }) {
  const [number, setNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const valid = isValidWhatsapp(number) && number !== outlet.whatsappNumber;

  const save = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await updateOutletWhatsapp(outlet._id, number);
      const d = res?.data || {};
      // 200 even when the code couldn't go — the number did change.
      // Second arg lets the caller open code entry for the new number.
      onSaved(
        d.otpSent === false
          ? `Number changed, but the code wasn't sent${d.otpError ? `: ${d.otpError}` : ""}. Use Resend code.`
          : res?.message || "Number updated and a new code was sent.",
        { whatsappNumber: d.subBrand?.whatsappNumber || number, otpSent: d.otpSent }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Change WhatsApp number" subtitle={outlet.whatsappNumber ? `Current: +91 ${outlet.whatsappNumber}` : "Current: No number set"} onClose={onClose}>
      <Field label="New WhatsApp number" required>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="98XXXXXXXX"
          className={inputClass}
        />
      </Field>
      <p className="mt-2 text-[11.5px] text-neutral-500">
        Only before the manager verifies. A new code goes to the new number; the outlet's WhatsApp notifications turn off until it's verified.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      <ModalActions onCancel={onClose} onConfirm={save} disabled={!valid} submitting={submitting} label="Change Number" />
    </Modal>
  );
}

/* ---- Verification history -------------------------------------------- */

export function VerificationHistory({ brandId }) {
  const query = useQuery({
    queryKey: queryKeys.brands.view("verification-history", { brandId }),
    queryFn: () => getVerificationHistory({ brandId, limit: 50 }),
    enabled: Boolean(brandId),
  });
  const rows = query.data?.data?.data ?? [];
  const notFound = isNotFoundMessage(query.error?.message ?? "");

  return (
    <div className="mt-4">
      <SectionCard title="Verification history" icon={History} tint="violet">
        {query.isPending ? (
          <Loader label="Loading history…" />
        ) : query.error && !notFound ? (
          <Notice tone="error">{query.error.message}</Notice>
        ) : rows.length === 0 ? (
          <EmptyState label="No verification events yet." />
        ) : (
          <ol className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
            {rows.map((ev) => {
              const action = String(ev.action || "").toUpperCase();
              const dot = /REJECT|REVOK|FAIL/.test(action) ? "bg-red-500" : /APPROV|VERIF/.test(action) ? "bg-emerald-500" : /REVIEW/.test(action) ? "bg-sky-500" : "bg-neutral-400";
              return (
                <li key={ev._id} className="relative">
                  <span className={`absolute -left-5 top-3 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-neutral-900 ${dot}`} />
                  <div className="rounded-2xl bg-white/70 px-3.5 py-2.5 ring-1 ring-neutral-200/60 dark:bg-neutral-950/50 dark:ring-white/5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{humanize(ev.action)}</span>
                      <Pill>{humanize(ev.performedByType)}</Pill>
                      {ev.attemptNumber != null && <Pill tone="sky">Attempt #{ev.attemptNumber}</Pill>}
                      {ev.score != null && <Pill tone="emerald">Score {ev.score}</Pill>}
                      <span className="ml-auto text-[11px] text-neutral-400">{fmtDateTime(ev.createdAt)}</span>
                    </div>
                    {(ev.previousStatus || ev.newStatus || ev.performedBy?.name) && (
                      <p className="mt-1 text-[11.5px] text-neutral-500">
                        {ev.previousStatus || ev.newStatus ? `${humanize(ev.previousStatus)} → ${humanize(ev.newStatus)}` : ""}
                        {ev.performedBy?.name ? ` · by ${ev.performedBy.name}` : ""}
                      </p>
                    )}
                    {ev.reason && <p className="mt-1.5 rounded-xl bg-neutral-100/80 px-2.5 py-1.5 text-[12px] normal-case text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">“{ev.reason}”</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

/* ---- Live subscription ----------------------------------------------- */

const USAGE_BUCKETS = [
  { key: "subBrands", label: "Outlets" },
  { key: "franchises", label: "Franchises" },
  { key: "vouchers", label: "Vouchers" },
  { key: "showcase", label: "Showcase" },
];

/* ---- Subscription history entry ----------------------------------------
 * GET /subscribeds/history row → one shape. Field names per the live API
 * (reason, amount, toPlan / fromPlan, performedByUser, snapshot.*), with the
 * older guesses (note, paidAmount, planName, performedBy) as fallbacks.
 * ---------------------------------------------------------------------- */
const HISTORY_PAGE_SIZE = 50;

function normalizeHistory(h) {
  const snap = h.snapshot || {};
  return {
    id: h._id,
    action: h.action,
    createdAt: h.createdAt,
    toPlan: h.toPlan || (h.planName ? { name: h.planName } : h.plan || null),
    fromPlan: h.fromPlan || null,
    startDate: h.startDate,
    endDate: h.endDate,
    amount: h.amount ?? h.paidAmount ?? null,
    paymentMode: h.paymentMode || "",
    source: h.source || "",
    reason: h.reason ?? h.note ?? "",
    by: h.performedByUser?.name || h.performedBy?.name || "",
    byRole: h.performedByRole || h.performedByType || h.performedByUser?.role || "",
    mode: snap.mode || "",
    pricing: snap.pricing || null,
    entitlements: snap.entitlements || null,
    overflow: Object.entries(snap.overflow || {}).filter(([, n]) => Number(n) > 0),
    forfeitedDays: snap.forfeitedDays ?? h.forfeitedDays ?? 0,
    forfeitedValue: snap.forfeitedValue ?? h.forfeitedValue ?? 0,
    extraDays: snap.extraDays ?? 0,
    creditApplied: Boolean(snap.creditApplied),
    upgradeCredit: snap.upgradeCredit || null,
    isTrial: Boolean(snap.isTrial),
  };
}

// Readable names for `source` (PAYMENT alone under a "Payment" label reads oddly).
const SOURCE_LABELS = { PAYMENT: "Online", ADMIN_MANUAL: "Admin grant", ADMIN_PAYMENT: "Admin · offline payment", TRIAL: "Trial" };
const sourceLabel = (s) => (s ? SOURCE_LABELS[String(s).toUpperCase()] || humanize(s) : "");

// History filter groups (SUBSCRIPTION_HISTORY_ACTION values vary, so match loosely).
const HISTORY_GROUPS = [
  ["UPGRADES", "Upgrades / downgrades"],
  ["GRANTS", "Grants"],
  ["PURCHASES", "Purchases & renewals"],
  ["CANCELS", "Cancels & expiries"],
  ["OTHER", "Other"],
];
function historyGroup(action) {
  const a = String(action || "").toUpperCase();
  if (/UPGRADE|DOWNGRADE|CHANGE/.test(a)) return "UPGRADES";
  if (/GRANT/.test(a)) return "GRANTS";
  if (/PURCHASE|ORDER|RENEW|ACTIV|PAID|NEW/.test(a)) return "PURCHASES";
  if (/CANCEL|REVOK|EXPIR|FORFEIT/.test(a)) return "CANCELS";
  return "OTHER";
}

const ENTITLEMENT_LABELS = {
  subBrands: "Sub-brands",
  franchises: "Franchises",
  vouchers: "Vouchers",
  showcase: "Showcase",
  dealPack: "Deal pack",
  prioritySupport: "Priority support",
};
const entitlementValue = (v) =>
  v == null ? "Not set" : "isEnabled" in v ? (v.isEnabled ? "On" : "Off") : v.isUnlimited ? "Unlimited" : String(v.limit ?? 0);

/* Expanded-history building blocks: each detail group is its own card. */
const CARD_TINTS = {
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
};

function DetailCard({ icon: Icon, tint, title, subtitle, children }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-neutral-200/70 dark:bg-neutral-900 dark:ring-white/10">
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${CARD_TINTS[tint]}`}>
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</p>
          {subtitle && <p className="text-[10.5px] text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PlanChip({ label, plan, muted = false }) {
  return (
    <div className={`min-w-0 flex-1 rounded-xl px-2.5 py-2 ring-1 ${muted ? "bg-neutral-50 ring-neutral-200/60 dark:bg-neutral-900/60 dark:ring-white/5" : "bg-sky-400/10 ring-sky-400/30"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`truncate text-[13px] font-bold ${muted ? "text-neutral-500" : "text-neutral-900 dark:text-neutral-50"}`}>{plan?.name || MISSING.plan}</p>
      {(plan?.type || plan?.price != null) && (
        <p className="truncate text-[10.5px] text-neutral-500">
          {[plan.type && humanize(plan.type), plan.price != null && inr(plan.price)].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-2.5 py-2 ring-1 ring-neutral-200/60 dark:bg-neutral-900/60 dark:ring-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{value}</p>
    </div>
  );
}

function LimitValue({ v }) {
  if (v && "isEnabled" in v) {
    return v.isEnabled ? (
      <span className="mt-0.5 inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">On</span>
    ) : (
      <span className="mt-0.5 inline-flex rounded-full bg-neutral-200/80 px-2 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-neutral-800">Off</span>
    );
  }
  if (v?.isUnlimited) {
    return <span className="mt-0.5 inline-flex rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:text-sky-400">∞ Unlimited</span>;
  }
  return <p className="text-[15px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{entitlementValue(v)}</p>;
}

function HistoryEntry({ h }) {
  const [open, setOpen] = useState(false);
  const action = String(h.action || "").toUpperCase();
  const dot = /CANCEL|REVOK|EXPIR/.test(action)
    ? "bg-red-500"
    : /DOWNGRADE/.test(action)
    ? "bg-amber-500"
    : /UPGRADE|CHANGE/.test(action)
    ? "bg-sky-500"
    : /GRANT|PURCHASE|ACTIV|RENEW|NEW/.test(action)
    ? "bg-emerald-500"
    : "bg-neutral-400";
  const p = h.pricing;
  const row = (label, value) => (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium tabular-nums text-neutral-800 dark:text-neutral-100">{value}</span>
    </div>
  );

  // Only facts the row actually has — no "— → —" or "by —".
  const hasDates = Boolean(h.startDate || h.endDate);
  const isFree = h.paymentMode === "FREE";
  const facts = [
    hasDates && ["Period", `${fmtDate(h.startDate)} → ${fmtDate(h.endDate)}`],
    // On a FREE grant `amount` is the plan's value — nothing was collected.
    h.amount != null && [isFree ? "Plan value" : "Amount", inr(h.amount)],
    (h.paymentMode || h.source) && [
      "Payment",
      [isFree ? "Free — nothing collected" : h.paymentMode ? humanize(h.paymentMode) : "", sourceLabel(h.source)].filter(Boolean).join(" · "),
    ],
    (h.by || h.byRole) && ["Done by", h.by ? `${h.by}${h.byRole ? ` (${humanize(h.byRole)})` : ""}` : humanize(h.byRole)],
  ].filter(Boolean);

  return (
    <li>
      <div className="rounded-2xl bg-white/70 p-3.5 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
        {/* Action + plan change · when */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
              {humanize(h.action)}
              {h.isTrial && <Pill tone="sky">Trial</Pill>}
              {h.mode === "AFTER_CURRENT" && <Pill tone="sky">Queued</Pill>}
            </p>
            {(h.fromPlan || h.toPlan) && (
              <p className="mt-0.5 text-[12.5px] text-neutral-700 dark:text-neutral-200">
                {h.fromPlan && (
                  <>
                    <span className="text-neutral-500">{h.fromPlan.name}</span>
                    <span className="mx-1.5 text-neutral-400">→</span>
                  </>
                )}
                <span className="font-semibold">{h.toPlan?.name || MISSING.plan}</span>
              </p>
            )}
          </div>
          <span className="shrink-0 text-[11px] text-neutral-400">{fmtDateTime(h.createdAt)}</span>
        </div>

        {/* Facts grid */}
        {facts.length > 0 && (
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-neutral-200/60 pt-2.5 sm:grid-cols-4 dark:border-white/5">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                <p className="break-words text-[12px] font-medium leading-snug text-neutral-800 dark:text-neutral-100">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {h.reason ? (
          <p className="mt-2.5 rounded-xl bg-neutral-100/80 px-3 py-2 text-[12px] normal-case text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
            <span className="font-semibold text-neutral-500">Reason: </span>“{h.reason}”
          </p>
        ) : (
          <p className="mt-2 text-[11px] italic text-neutral-400">No reason recorded</p>
        )}

        {h.forfeitedDays > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} className="shrink-0" />
            Forfeited {h.forfeitedDays} days ({inr(h.forfeitedValue)}) of the previous plan
          </p>
        )}
        {h.overflow.length > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} className="shrink-0" />
            Over the new limits: {h.overflow.map(([k, n]) => `${n} ${ENTITLEMENT_LABELS[k] || k}`).join(", ")}
          </p>
        )}

      {(p || h.entitlements || h.fromPlan || h.extraDays > 0 || h.upgradeCredit) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-violet-600 hover:underline dark:text-violet-400"
        >
          <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          {open ? "Hide details" : "Show details"}
        </button>
      )}

      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 text-[11.5px] md:grid-cols-3">
          {/* Plan card */}
          <DetailCard icon={Layers} tint="sky" title="Plan">
            <div className="flex items-stretch gap-2">
              {h.fromPlan && (
                <>
                  <PlanChip label="From" plan={h.fromPlan} muted />
                  <span className="flex items-center text-neutral-400">→</span>
                </>
              )}
              <PlanChip label={h.fromPlan ? "To" : "Plan"} plan={h.toPlan} />
            </div>
            {hasDates && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat label={h.mode === "AFTER_CURRENT" ? "Starts (queued)" : "Starts"} value={fmtDate(h.startDate)} />
                <MiniStat label="Ends" value={h.endDate ? fmtDate(h.endDate) : "No end date"} />
              </div>
            )}
            {h.extraDays > 0 && <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">+{h.extraDays} extra days from credit</p>}
            {h.upgradeCredit && (
              <p className="mt-2 text-[11px] text-neutral-500">
                Upgrade credit {inr(h.upgradeCredit.appliedToBill ?? h.upgradeCredit.unusedValue)}
                {h.creditApplied ? " · applied" : ""}
              </p>
            )}
          </DetailCard>

          {p && (
            <DetailCard icon={Receipt} tint="violet" title={`Pricing (${p.currency || "INR"})`}>
              {row("List price", inr(p.listPrice))}
              {Number(p.discountAmount) > 0 &&
                row(`Discount${p.discountType === "PERCENT" && p.discountPercent ? ` (${p.discountPercent}%)` : ""}`, `− ${inr(p.discountAmount)}`)}
              {Number(p.promoDiscount) > 0 && row(`Promo${p.promoCode ? ` (${p.promoCode})` : ""}`, `− ${inr(p.promoDiscount)}`)}
              {Number(p.prorationCredit) > 0 && row("Upgrade credit", `− ${inr(p.prorationCredit)}`)}
              {row("Taxable value", inr(p.taxableValue))}
              {p.taxType === "IGST"
                ? row(`IGST ${p.gstPercentage ?? ""}%`, inr(p.igst))
                : row(`CGST + SGST ${p.gstPercentage ?? ""}%`, inr((Number(p.cgst) || 0) + (Number(p.sgst) || 0)))}
              {Number(p.roundOff) !== 0 && p.roundOff != null && row("Round off", inr(p.roundOff))}
              <div className="mt-2 flex items-baseline justify-between rounded-xl bg-violet-400/10 px-2.5 py-2">
                <span className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">Total</span>
                <span className="text-[15px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{inr(p.totalPayable)}</span>
              </div>
              {Number(p.youSaved) > 0 && <p className="mt-1.5 text-right text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Saved {inr(p.youSaved)}</p>}
              {(p.placeOfSupplyState || p.hsnSacCode) && (
                <p className="mt-1.5 text-[10.5px] text-neutral-400">
                  {p.placeOfSupplyState && `Place of supply: ${p.placeOfSupplyState}`}
                  {p.placeOfSupplyState && p.hsnSacCode && " · "}
                  {p.hsnSacCode && `HSN/SAC ${p.hsnSacCode}`}
                </p>
              )}
            </DetailCard>
          )}

          {h.entitlements && (
            <DetailCard icon={ShieldCheck} tint="emerald" title="Limits given" subtitle="Frozen for this term">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(h.entitlements).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-neutral-50 px-2.5 py-2 ring-1 ring-neutral-200/60 dark:bg-neutral-900/60 dark:ring-white/5">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{ENTITLEMENT_LABELS[k] || humanize(k)}</p>
                    <LimitValue v={v} />
                  </div>
                ))}
              </div>
            </DetailCard>
          )}
        </div>
      )}
      </div>
    </li>
  );
}

export function LiveSubscriptionPanel({ brandId, readOnly }) {
  const subQuery = useQuery({
    queryKey: queryKeys.subscribeds.view("brand", { brandId }),
    queryFn: () => getBrandSubscription(brandId),
    enabled: Boolean(brandId),
  });
  // GET /subscribeds/history?brandId= — 50 per page, "Load more" for the rest.
  const historyQuery = useInfiniteQuery({
    queryKey: queryKeys.subscribeds.view("history", { brandId }),
    queryFn: ({ pageParam }) => getBrandSubscriptionHistory(brandId, { page: pageParam, limit: HISTORY_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalPages = lastPage?.data?.totalPages ?? 1;
      return allPages.length < totalPages ? allPages.length + 1 : undefined;
    },
    enabled: Boolean(brandId),
  });
  const [resyncing, setResyncing] = useState(false);
  const [resync, setResync] = useState(null); // response data
  const [resyncError, setResyncError] = useState("");

  const d = subQuery.data?.data || {};
  const sub = d.subscription || null;
  const last = d.lastSubscription || null;
  const usage = d.usage || {};
  const history = (historyQuery.data?.pages ?? []).flatMap((p) => (Array.isArray(p?.data?.data) ? p.data.data : [])).map(normalizeHistory);
  const historyTotal = historyQuery.data?.pages?.[0]?.data?.total ?? history.length;
  // Filter chips over the loaded rows — only groups that actually occur.
  const [historyFilter, setHistoryFilter] = useState("ALL");
  const groupCounts = history.reduce((acc, h) => {
    const g = historyGroup(h.action);
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});
  const shownHistory = historyFilter === "ALL" ? history : history.filter((h) => historyGroup(h.action) === historyFilter);
  // What the closed card says next to its arrow.
  const historySummary = historyQuery.isPending
    ? "Loading…"
    : history.length
    ? `${historyTotal} entr${historyTotal === 1 ? "y" : "ies"} · latest ${humanize(history[0].action)}, ${fmtDate(history[0].createdAt)}`
    : "No entries yet";
  const planSummary = subQuery.isPending
    ? "Loading…"
    : sub
    ? [
        `${sub.plan?.name || "Plan"}${sub.plan?.typeLabel ? ` · ${sub.plan.typeLabel}` : ""}`,
        humanize(sub.status),
        sub.daysRemaining != null ? `${sub.daysRemaining} days left` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "No active plan";

  const runResync = async () => {
    setResyncing(true);
    setResyncError("");
    try {
      const res = await resyncBrandSubscription(brandId);
      setResync(res?.data || {});
      subQuery.refetch();
      historyQuery.refetch();
    } catch (err) {
      setResyncError(err.message);
    } finally {
      setResyncing(false);
    }
  };

  const tile = "rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 dark:bg-neutral-950/50 dark:ring-white/5";
  const usageTone = (pct, unlimited) =>
    unlimited ? "bg-sky-400/60" : pct > 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="mt-4 space-y-4">
      <div>
      {/* Closed by default — the arrow on the right opens plan + usage. */}
      <CollapsibleSectionCard title="Live plan & usage" icon={Layers} tint="sky" summary={planSummary}>
        <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-neutral-500">Live from the subscription service</p>
          {!readOnly && (
            <button
              onClick={runResync}
              disabled={resyncing}
              title="Rebuilds cached plan flags and usage counters from real rows. Deletes nothing."
              className="flex h-8 items-center gap-1.5 rounded-full bg-sky-400/10 px-3.5 text-[12px] font-semibold text-sky-600 transition-colors hover:bg-sky-400/20 disabled:opacity-60 dark:text-sky-400"
            >
              {resyncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Resync counters
            </button>
          )}
        </div>

        {subQuery.isPending ? (
          <Loader label="Loading plan…" />
        ) : subQuery.error ? (
          <Notice tone="error">{subQuery.error.message}</Notice>
        ) : (
          <>
            {sub ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Plan", `${sub.plan?.name || MISSING.plan}${sub.plan?.typeLabel ? ` · ${sub.plan.typeLabel}` : ""}`],
                  ["Status", humanize(sub.status)],
                  ["Source", `${humanize(sub.source)}${sub.isFreeGrant ? " (free)" : ""}`],
                  ["Paid", inr(sub.paidAmount)],
                  ["Start", fmtDate(sub.startDate)],
                  ["End", sub.endDate ? fmtDate(sub.endDate) : "No end date"],
                  ["Days left", sub.daysRemaining ?? MISSING.generic],
                  ["All-time plans", d.totalSubscriptions ?? MISSING.generic],
                ].map(([label, value]) => (
                  <div key={label} className={`${tile} px-3 py-2`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                    <p className="mt-0.5 truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Notice tone="warn">
                No active plan{last ? ` — last was ${last.plan?.name || "a plan"} (${humanize(last.status)})${last.endDate ? `, ended ${fmtDate(last.endDate)}` : ""}` : ""}.
              </Notice>
            )}

            {d.entitlementsSource && d.entitlementsSource !== "DB" && (
              <Notice tone="warn">
                Plan limits come from {d.entitlementsSource} instead of the plan record — the plan isn't configured properly.
              </Notice>
            )}
            {Array.isArray(d.entitlementWarnings) && d.entitlementWarnings.length > 0 && (
              <Notice tone="warn">{d.entitlementWarnings.map(String).join(" · ")}</Notice>
            )}

            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Usage</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {USAGE_BUCKETS.map(({ key, label }) => {
                const u = usage[key];
                if (!u) return null;
                const used = u.used ?? 0;
                const limit = u.isUnlimited ? "∞" : u.limit ?? 0;
                const pct = u.isUnlimited ? 100 : u.limit > 0 ? Math.min(100, (used / u.limit) * 100) : used > 0 ? 100 : 0;
                return (
                  <div key={key} className={`${tile} p-3`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                    <p className="mt-0.5 text-[16px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">
                      {used}
                      <span className="text-[12px] font-medium text-neutral-400"> / {limit}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
                      <div className={`h-full rounded-full ${usageTone(pct, u.isUnlimited)}`} style={{ width: `${pct}%` }} />
                    </div>
                    {u.overflowBy > 0 && <p className="mt-1 text-[10.5px] text-amber-600 dark:text-amber-400">Over by {u.overflowBy} (grandfathered)</p>}
                  </div>
                );
              })}
            </div>
            {usage.syncedAt && <p className="mt-2 text-[11px] text-neutral-400">Counters synced {fmtDateTime(usage.syncedAt)}</p>}
          </>
        )}

        {resyncError && <Notice tone="error">{resyncError}</Notice>}
        {resync && (
          <Notice tone={resync.countersDrifted ? "warn" : "ok"}>
            {resync.countersDrifted ? "Counters had drifted and were recounted." : "Resynced — counters were already right."}{" "}
            Outlets used {resync.before?.subBrandsUsed ?? "unknown"} → {resync.after?.subBrandsUsed ?? "unknown"}, franchises used{" "}
            {resync.before?.franchisesUsed ?? "unknown"} → {resync.after?.franchisesUsed ?? "unknown"}.
          </Notice>
        )}
      </CollapsibleSectionCard>
      </div>

      {/* History as a timeline — full width under the live plan */}
      <div>
      {/* Closed by default — the arrow on the right opens the full history. */}
      <CollapsibleSectionCard title="Subscription history" icon={History} tint="violet" summary={historySummary}>
        {historyQuery.isPending ? (
          <Loader label="Loading history…" />
        ) : historyQuery.error && !isNotFoundMessage(historyQuery.error.message) ? (
          <Notice tone="error">{historyQuery.error.message}</Notice>
        ) : history.length === 0 ? (
          <EmptyState label="No subscription history yet." />
        ) : (
          <>
            <div className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] text-neutral-500">
                {historyTotal} entr{historyTotal === 1 ? "y" : "ies"} for this brand
                {history.length < historyTotal ? ` · showing ${history.length}` : ""} · newest first
              </p>
              {Object.keys(groupCounts).length > 1 && (
                <div className="flex flex-wrap items-center gap-1">
                  {[["ALL", "All", history.length], ...HISTORY_GROUPS.filter(([k]) => groupCounts[k]).map(([k, l]) => [k, l, groupCounts[k]])].map(([key, label, n]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setHistoryFilter(key)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        historyFilter === key
                          ? "bg-violet-500 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {label} <span className="opacity-70">{n}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ol className="space-y-3">
              {shownHistory.map((h, i) => (
                <HistoryEntry key={h.id || i} h={h} />
              ))}
            </ol>
            {historyQuery.hasNextPage && (
              <button
                type="button"
                onClick={() => historyQuery.fetchNextPage()}
                disabled={historyQuery.isFetchingNextPage}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-400/10 py-2 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-400/20 disabled:opacity-60 dark:text-violet-300"
              >
                {historyQuery.isFetchingNextPage ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                Load more ({historyTotal - history.length} left)
              </button>
            )}
          </>
        )}
      </CollapsibleSectionCard>
      </div>
    </div>
  );
}
