import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Field, inputClass, SectionCard, CollapsibleSectionCard, EmptyState, StatusBadge, InfoRow } from "./BrandShared";
import { getPlans } from "../plan/services/planApi";
import { grantSubscription, cancelSubscription } from "./services/subscriptionApi";

/* -------------------------------------------------------------------------
 * SubscriptionCenter.jsx
 * The "Subscription" tab on BrandDetails — a command center for the admin
 * grant/downgrade/change-tier/cancel actions defined in the
 * "05 — Subscription · Admin management" Postman collection, all of which
 * hit the real backend (POST /subscribeds/admin/grant, PUT
 * /subscribeds/admin/cancel) rather than the mock brand data used elsewhere
 * on this page.
 * ---------------------------------------------------------------------- */

const OFFLINE_PAYMENT_MODES = ["UPI", "BANK_TRANSFER", "CASH", "OTHER"];

const ACTION_META = {
  free: {
    title: "Grant Free Subscription",
    subtitle: "Give this brand complimentary access to a plan — no payment collected.",
    icon: Gift,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
    submitLabel: "Grant Free Access",
  },
  offline: {
    title: "Grant Subscription — Offline Payment",
    subtitle: "Record a payment collected outside the app (bank transfer, UPI, cash) and activate the plan.",
    icon: Landmark,
    accent: "text-sky-600 dark:text-sky-400 bg-sky-400/10",
    submitLabel: "Grant Access",
  },
  downgrade: {
    title: "Downgrade Subscription",
    subtitle: "Move the brand to a lower tier as a grandfathered exception.",
    icon: TrendingDown,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-400/10",
    submitLabel: "Confirm Downgrade",
  },
  "change-tier": {
    title: "Change Tier, Keep End Date",
    subtitle: "Correct a mis-sold plan — same validity window, different tier.",
    icon: ArrowLeftRight,
    accent: "text-violet-600 dark:text-violet-400 bg-violet-400/10",
    submitLabel: "Change Tier",
  },
};

function normalizePlanOption(raw) {
  return {
    id: raw?._id ?? raw?.id,
    name: raw?.name ?? "Untitled plan",
    price: raw?.price ?? 0,
    type: raw?.type ?? "MONTHLY",
    status: raw?.status ?? (raw?.isActive === false ? "Inactive" : "Active"),
  };
}

/* -------------------------------------------------------------------------
 * Grant modal — covers Free / Offline Payment / Downgrade / Change Tier.
 * The fields shown adapt to `action`; the payload sent to /grant does too.
 * ---------------------------------------------------------------------- */
export function GrantSubscriptionModal({ brand, action, onClose, onSuccess }) {
  const meta = ACTION_META[action];
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");

  const [subscriptionId, setSubscriptionId] = useState("");
  const [paymentMode, setPaymentMode] = useState(OFFLINE_PAYMENT_MODES[0]);
  const [collectedAmount, setCollectedAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPlans();
        const list = (Array.isArray(data) ? data : data?.plans || data?.data || [])
          .map(normalizePlanOption)
          .filter((p) => p.status !== "Inactive");
        if (!cancelled) setPlans(list);
      } catch (err) {
        if (!cancelled) setPlansError(err.message);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOffline = action === "offline";
  const canSubmit =
    subscriptionId &&
    note.trim() &&
    (!isOffline || (collectedAmount && referenceNumber.trim()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    const payload = {
      brandId: brand.brandId,
      subscriptionId,
      note: note.trim(),
      ...(action === "offline"
        ? { paymentMode, collectedAmount: Number(collectedAmount), referenceNumber: referenceNumber.trim() }
        : { paymentMode: "FREE" }),
      ...(action === "change-tier" ? { keepCurrentEndDate: true } : {}),
    };

    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await grantSubscription(payload);
      const plan = plans.find((p) => p.id === subscriptionId);
      onSuccess({ action, plan, note: note.trim(), result });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.accent}`}>
              <meta.icon size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{meta.title}</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">{meta.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={`Plan${action === "downgrade" ? " (target lower tier)" : ""}`} required>
            {plansLoading ? (
              <div className="flex items-center gap-2 py-2 text-[12.5px] text-neutral-500">
                <Loader2 size={13} className="animate-spin" />
                Loading plans…
              </div>
            ) : plansError ? (
              <p className="text-[12.5px] text-red-600 dark:text-red-400">{plansError}</p>
            ) : (
              <select
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="" disabled>
                  Select a plan…
                </option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{Number(p.price).toLocaleString("en-IN")} / {p.type === "MONTHLY" ? "mo" : "yr"}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {isOffline && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Payment Mode" required>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
                  {OFFLINE_PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Collected Amount (₹)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={collectedAmount}
                  onChange={(e) => setCollectedAmount(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Reference Number" required>
                <input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. NEFT-8817-2026"
                  required
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {action === "change-tier" && (
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[12.5px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
              <Calendar size={13} className="shrink-0 text-neutral-500" />
              Current paid-for end date will be kept — only the plan tier changes.
            </div>
          )}

          <Field label="Note" required>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why is this action being taken? Shown in the subscription history."
              required
              className={inputClass}
            />
          </Field>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
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
 * Cancel modal
 * ---------------------------------------------------------------------- */
export function CancelSubscriptionModal({ brand, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await cancelSubscription({ brandId: brand.brandId, reason: reason.trim() });
      onSuccess({ reason: reason.trim() });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Ban size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Cancel Subscription</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                Revokes <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span>'s access immediately. This
                cannot be undone from here.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Reason" required>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Chargeback raised — access revoked pending resolution"
              required
              className={inputClass}
            />
          </Field>

          {submitError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Keep Subscription
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
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
      className="group flex items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:bg-neutral-100 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20 dark:hover:bg-neutral-800/60 dark:hover:shadow-black/30"
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

/* One label/value cell in the pricing-breakdown grid. */
function PriceStat({ label, value, accent = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[14px] font-semibold ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-800 dark:text-neutral-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * SubscriptionTab — current plan summary, grant/downgrade/cancel actions,
 * and the grant/payment history feed.
 * ---------------------------------------------------------------------- */
export function SubscriptionTab({ brand, onUpdate }) {
  const [modalAction, setModalAction] = useState(null); // null | 'free' | 'offline' | 'downgrade' | 'change-tier'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const pricing = brand.subscriptionDetail?.pricing;

  const recordHistory = (entry) => {
    const history = [entry, ...(brand.invoices || [])];
    onUpdate(brand.id, { invoices: history });
  };

  const handleGrantSuccess = ({ action, plan, note }) => {
    const actionLabel = ACTION_META[action].title;
    recordHistory({
      id: `GR-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount: plan ? `₹${Number(plan.price).toLocaleString("en-IN")}` : "—",
      status: "Paid",
      note: `${actionLabel}${plan ? ` — ${plan.name}` : ""}. ${note}`,
    });
    if (plan) {
      onUpdate(brand.id, { subscriptionPlan: plan.name, planPrice: `₹${Number(plan.price).toLocaleString("en-IN")}` });
    }
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
    setShowCancelModal(false);
    setSuccessMsg("Subscription cancelled.");
  };

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-[12.5px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} className="shrink-0" />
          {successMsg}
        </div>
      )}

      <SectionCard title="Current Plan">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100">{brand.subscriptionPlan}</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {brand.planPrice} · {brand.subscriptionTerm}
            </p>
          </div>
          <StatusBadge status={brand.status} activeLabel="Active" />
        </div>
        {brand.expiredInDays > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-neutral-500">Renewal Window</p>
              <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">{brand.expiredInDays} days left</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
                style={{ width: `${brand.remainderPercent}%` }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {brand.subscriptionDetail && (
        <CollapsibleSectionCard title="Subscription Details" defaultOpen={false}>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            <InfoRow icon={Receipt} label="Subscription ID" value={brand.subscriptionDetail.subscriptionId} />
            <InfoRow icon={Receipt} label="Transaction ID" value={brand.subscriptionDetail.transactionId} />
            <InfoRow icon={Calendar} label="Duration" value={`${brand.subscriptionDetail.durationInDays} days`} />
            <InfoRow icon={Calendar} label="Start Date" value={brand.subscriptionDetail.startDateDisplay} />
            <InfoRow icon={Calendar} label="End Date" value={brand.subscriptionDetail.endDateDisplay} />
            <InfoRow icon={Calendar} label="Activated At" value={brand.subscriptionDetail.activatedAtDisplay} />
            <InfoRow icon={FileText} label="Price" value={`₹${Number(brand.subscriptionDetail.price).toLocaleString("en-IN")}`} />
            <InfoRow icon={FileText} label="Discount" value={`₹${Number(brand.subscriptionDetail.discount).toLocaleString("en-IN")}`} />
            <InfoRow icon={FileText} label="Paid Amount" value={`₹${Number(brand.subscriptionDetail.paidAmount).toLocaleString("en-IN")}`} />
            <InfoRow icon={FileText} label="Due Amount" value={`₹${Number(brand.subscriptionDetail.dueAmount).toLocaleString("en-IN")}`} />
            <InfoRow icon={ArrowLeftRight} label="Source" value={brand.subscriptionDetail.source} />
            <InfoRow icon={TrendingDown} label="Number of Upgrades" value={brand.subscriptionDetail.numberOfUpgrade} />
            <InfoRow icon={Calendar} label="Forfeited Days" value={brand.subscriptionDetail.forfeitedDays} />
            <InfoRow icon={FileText} label="Forfeited Value" value={`₹${Number(brand.subscriptionDetail.forfeitedValue).toLocaleString("en-IN")}`} />
            <InfoRow icon={FileText} label="Reminders Sent" value={brand.subscriptionDetail.remindersSentCount} />
            <InfoRow icon={Calendar} label="Created" value={brand.subscriptionDetail.createdAtDisplay} />
            <InfoRow icon={Calendar} label="Last Updated" value={brand.subscriptionDetail.updatedAtDisplay} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {brand.subscriptionDetail.status}
            </span>
            {brand.subscriptionDetail.isFreeGrant && (
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Free Grant
              </span>
            )}
            {brand.subscriptionDetail.isUpgraded && (
              <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                Upgraded
              </span>
            )}
            {brand.subscriptionDetail.isExpired && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                Expired
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                brand.subscriptionDetail.isActive
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
              }`}
            >
              {brand.subscriptionDetail.isActive ? "Active" : "Inactive"}
            </span>
            {brand.subscriptionDetail.isDeleted && (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                Deleted
              </span>
            )}
          </div>

          {pricing && (
            <div className="mt-4 overflow-hidden rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
              {/* Price Summary */}
              <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Price Summary
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <PriceStat label="List Price" value={`₹${Number(pricing.listPrice).toLocaleString("en-IN")}`} />
                  <PriceStat
                    label="Promo Discount"
                    value={pricing.promoDiscount ? `₹${Number(pricing.promoDiscount).toLocaleString("en-IN")}` : "—"}
                  />
                  <PriceStat label="You Saved" value={`₹${Number(pricing.youSaved || 0).toLocaleString("en-IN")}`} accent />
                  <PriceStat label="Taxable Value" value={`₹${Number(pricing.taxableValue).toLocaleString("en-IN")}`} />
                  <PriceStat label="GST" value={`${pricing.gstPercentage}%`} />
                  <PriceStat label="Tax Type" value={pricing.taxType} />
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  Tax Breakdown
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <PriceStat label="CGST" value={`₹${Number(pricing.cgst || 0).toLocaleString("en-IN")}`} />
                  <PriceStat label="SGST" value={`₹${Number(pricing.sgst || 0).toLocaleString("en-IN")}`} />
                  <PriceStat label="IGST" value={`₹${Number(pricing.igst || 0).toLocaleString("en-IN")}`} />
                  <PriceStat label="GST Amount" value={`₹${Number(pricing.gstAmount || 0).toLocaleString("en-IN")}`} />
                  <PriceStat label="HSN/SAC" value={pricing.hsnSacCode || "—"} />
                  <PriceStat label="Place of Supply" value={pricing.placeOfSupplyState || "—"} />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 bg-neutral-50 p-4 dark:bg-neutral-950/60">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-neutral-700 dark:text-neutral-300">Total Payable</p>
                  <p className="text-[17px] font-bold text-neutral-900 dark:text-neutral-50">
                    ₹{Number(pricing.totalPayable).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] text-neutral-500">You Saved</p>
                  <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(pricing.youSaved || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CollapsibleSectionCard>
      )}

      <div>
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          Grant / Change Subscription
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <ActionCard action="free" onClick={() => setModalAction("free")} />
          <ActionCard action="offline" onClick={() => setModalAction("offline")} />
          <ActionCard action="downgrade" onClick={() => setModalAction("downgrade")} />
          <ActionCard action="change-tier" onClick={() => setModalAction("change-tier")} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.03] px-4 py-3.5">
        <div>
          <p className="text-[13px] font-medium text-red-600 dark:text-red-400">Cancel Subscription</p>
          <p className="mt-0.5 text-[11.5px] text-neutral-500">Revokes access immediately. Use for chargebacks or policy violations.</p>
        </div>
        <button
          onClick={() => setShowCancelModal(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/30 px-3.5 py-1.5 text-[12.5px] font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/10"
        >
          <Ban size={13} />
          Cancel
        </button>
      </div>

      <div>
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          Grant &amp; Payment History
        </p>
        {!brand.invoices?.length ? (
          <EmptyState label="No invoices or grants recorded yet." />
        ) : (
          <div className="space-y-2.5">
            {brand.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
              >
                <div className="flex items-start gap-3">
                  <FileText size={16} className="mt-0.5 shrink-0 text-neutral-500" />
                  <div>
                    <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{inv.id}</p>
                    <p className="mt-0.5 text-[12px] text-neutral-500">{inv.date}</p>
                    {inv.note && <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">{inv.note}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">{inv.amount}</span>
                  <StatusBadge status={inv.status} activeLabel="Paid" />
                  {!inv.note && (
                    <button
                      aria-label="Download invoice"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                    >
                      <Download size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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
