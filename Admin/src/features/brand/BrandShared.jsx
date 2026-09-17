import React, { useState } from "react";
import {
  Check,
  X,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  MessageSquareWarning,
  FileText,
  Power,
} from "lucide-react";
import { StatusBadge } from "../../components/common/Table";
import { REJECTION_REASONS } from "./data/BrandData";

/* -------------------------------------------------------------------------
 * BrandShared.jsx
 * Small reusable building blocks shared between the Brand list page and the
 * BrandDetails page: avatars, toggles, info rows, verification rows, the
 * approve/reject control (with a mandatory rejection reason), form fields,
 * and a small delete-confirmation hook.
 * ---------------------------------------------------------------------- */

export function BrandAvatar({ brand, size = "md", className = "" }) {
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-11 w-11 text-[16px] rounded-xl",
    lg: "h-14 w-14 text-[20px] rounded-2xl",
    xl: "h-[86px] w-[86px] text-[26px] rounded-2xl",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-orange-500 font-semibold text-white ${sizes[size]} ${className}`}
    >
      {brand.logo ? (
        <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
      ) : (
        <span>{brand.emoji || brand.brandName?.charAt(0)}</span>
      )}
    </div>
  );
}

export function ToggleSwitch({ checked, onChange, title }) {
  // `title` lets a caller show a hover tooltip naming the action the click
  // will perform (e.g. "Deactivate" while on, "Activate" while off) —
  // optional, so existing toggles (Reviewed, push-enable...) are unaffected.
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label={title || "Toggle brand active state"}
      title={title}
      className={`relative h-7 w-16 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[8px]" : "translate-x-[-22px]"
        }`}
      />
    </button>
  );
}

export function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        {Icon && <Icon size={13} />}
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

/* Small bento tile for a single label/value pair — used instead of a
   divide-y line list wherever a detail dump (PAN/GST/Bank...) needs a
   borderless, line-free card grid look. */
export function DetailTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
        {Icon && <Icon size={11} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{value || "—"}</p>
    </div>
  );
}

export function VerificationRow({ icon: Icon, label, value, verified }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className="text-neutral-500" />
        <div>
          <p className="text-[11px] text-neutral-500">{label}</p>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{value || "—"}</p>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
          verified ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
        }`}
      >
        {verified ? "Verified" : "Unverified"}
      </span>
    </div>
  );
}

export function MerchantTokenCard({ token }) {
  return (
    <SectionCard title="Merchant Token">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="truncate font-mono text-[12.5px] text-neutral-700 dark:text-neutral-300">{token || "—"}</p>
        <button
          type="button"
          onClick={() => token && navigator.clipboard?.writeText(token)}
          className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
        >
          Copy
        </button>
      </div>
    </SectionCard>
  );
}

export function SectionCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${className}`}>
      {title && (
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          {Icon && <Icon size={13} className="text-neutral-400 dark:text-neutral-500" />}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

/* Same card chrome as SectionCard, but the body only renders once the
   header is clicked open — collapsed by default so long detail dumps
   (PAN/GST/Bank records, subscription breakdowns...) don't dominate the
   tab on first render. */
export function CollapsibleSectionCard({ title, children, defaultOpen = false, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-5 py-4 text-left"
      >
        <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
        <ChevronDown
          size={15}
          className={`shrink-0 text-neutral-400 transition-transform duration-200 dark:text-neutral-500 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
      {label}
    </div>
  );
}

/* Small badge shown wherever an incomplete-onboarding brand needs a status pill */
export function OnboardingBadge({ brand, className = "" }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 ${className}`}
    >
      <AlertTriangle size={10} />
      Stuck at {brand.onboardingStep}
    </span>
  );
}

/* Small badge shown wherever a rejected brand needs its reason surfaced quickly */
export function RejectionBadge({ brand, className = "" }) {
  if (!brand.rejectionReason) return null;
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-medium text-red-600 dark:text-red-400 ${className}`}
      title={brand.rejectionReason}
    >
      <MessageSquareWarning size={10} />
      <span className="max-w-[220px] truncate">{brand.rejectionReason}</span>
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

export function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
        {required && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

export function FileField({ label, accept, multiple = false, files = [], onChange }) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} className="block cursor-pointer">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-center transition-colors hover:border-emerald-500/50 dark:border-neutral-700 dark:bg-neutral-950">
        <FileText size={16} className="text-neutral-400 dark:text-neutral-600" />
        <span className="text-[11.5px] text-neutral-500">
          {files.length
            ? files.map((f) => f.name).join(", ")
            : `Click to upload ${multiple ? "files" : "a file"}`}
        </span>
      </div>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => onChange(Array.from(e.target.files || []))}
        className="hidden"
      />
    </label>
  );
}

const STAT_CHIP_TINTS = {
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  emerald: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-400/15 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-400/15 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-400/15 text-amber-600 dark:text-amber-400",
};

export function StatChip({ icon: Icon, value, label, tint = "neutral" }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-2.5 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${STAT_CHIP_TINTS[tint] || STAT_CHIP_TINTS.neutral}`}>
        <Icon size={12} />
      </span>
      <div className="leading-tight">
        <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
        <p className="text-[9.5px] uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

const RING_TINTS = {
  emerald: "stroke-emerald-400",
  amber: "stroke-amber-400",
  sky: "stroke-sky-400",
  violet: "stroke-violet-400",
  red: "stroke-red-400",
};

/* Compact "ring + label" stat pill — a circular progress ring with the
   percentage centered, paired with a bold label and a lighter caption line.
   Used at the top of detail pages for at-a-glance health/progress metrics. */
export function RingStat({ pct, label, caption, tint = "emerald" }) {
  const dash = 2 * Math.PI * 15;
  const clamped = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 h-11 w-11 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="15" className="fill-none stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r="15"
            className={`fill-none ${RING_TINTS[tint] || RING_TINTS.emerald}`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - clamped / 100)}
          />
        </svg>
        <span className="text-[10.5px] font-bold text-neutral-900 dark:text-neutral-50">{Math.round(clamped)}%</span>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{label}</p>
        <p className="truncate text-[11px] text-neutral-500">{caption}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Reject Reason Modal
 * Shown whenever a super admin picks "Reject" so a reason is always
 * captured. Offers a quick-pick list plus an optional free-text note.
 * ---------------------------------------------------------------------- */

export function RejectReasonModal({ brand, onClose, onConfirm }) {
  const [reasonChoice, setReasonChoice] = useState(REJECTION_REASONS[0]);
  const [note, setNote] = useState("");

  const finalReason =
    reasonChoice === "Other"
      ? note.trim()
      : note.trim()
      ? `${reasonChoice} — ${note.trim()}`
      : reasonChoice;

  const canSubmit = reasonChoice !== "Other" || note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Listing</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Tell {brand.ownerName || "the owner"} why{" "}
              <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> is being rejected. This
              reason is shown to the brand owner.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Reason">
            <select
              value={reasonChoice}
              onChange={(e) => setReasonChoice(e.target.value)}
              className={inputClass}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label={reasonChoice === "Other" ? "Describe the reason" : "Additional note (optional)"} required={reasonChoice === "Other"}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add specific details to help the owner fix the issue..."
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(finalReason)}
            className="rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Approve / Reject dropdown shown for brands that finished onboarding and
 * are waiting for super admin approval (the "Complete Listing" tab).
 *
 * onDecision(brand, newStatus, reason) is called with:
 *   - newStatus = "Active"   and reason = ""             on approve
 *   - newStatus = "Rejected" and reason = "<typed text>"  on reject
 * ---------------------------------------------------------------------- */

export function ApprovalDropdown({ brand, onDecision, size = "md" }) {
  const [open, setOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const isPending = brand.status === "Pending";
  const pad = size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3 py-1.5 text-[12.5px]";

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full font-semibold transition-colors ${pad} ${
          isPending
            ? "bg-amber-400/10 text-amber-600 hover:bg-amber-400/20 dark:text-amber-400"
            : brand.status === "Active"
            ? "bg-emerald-400/10 text-emerald-600 hover:bg-emerald-400/20 dark:text-emerald-400"
            : "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
        }`}
      >
        {isPending ? "Awaiting Approval" : brand.status}
        <ChevronRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-xl bg-white shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
            <button
              onClick={() => {
                onDecision(brand, "Active", "");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-emerald-600 transition-colors hover:bg-neutral-100 dark:text-emerald-400 dark:hover:bg-neutral-800"
            >
              <Check size={13} />
              Approve
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setShowRejectModal(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
            >
              <X size={13} />
              Reject
            </button>
          </div>
        </>
      )}

      {showRejectModal && (
        <RejectReasonModal
          brand={brand}
          onClose={() => setShowRejectModal(false)}
          onConfirm={(reason) => {
            onDecision(brand, "Rejected", reason);
            setShowRejectModal(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Toggle Active/Inactive confirmation
 * Shown before flipping a brand's active state, so a super admin sees the
 * consequence before committing.
 *
 * On deactivate, a "Hide from Customers" checkbox lets the admin choose:
 *   - unchecked (default): brand is deactivated in the admin panel, but its
 *     existing listings/vouchers keep showing on the customer-facing app.
 *   - checked: brand is also hidden from customers entirely.
 *
 * onConfirm(hideFromCustomers) is called with that boolean. It's ignored
 * for the activate path since only deactivate exposes this choice.
 * ---------------------------------------------------------------------- */

export function ToggleActiveConfirmModal({ brand, willActivate, onClose, onConfirm }) {
  const [hideFromCustomers, setHideFromCustomers] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              willActivate ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Power size={18} />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
              {willActivate ? "Activate this brand?" : "Deactivate this brand?"}
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {willActivate ? (
                <>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{brand.brandName}</span> will regain
                  full access and be able to perform actions in the admin panel again.
                </>
              ) : (
                <>
                  While deactivated,{" "}
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{brand.brandName}</span> won't be able
                  to perform any actions in the admin panel — no new listings, updates, or transactions.
                  By default, its existing content, including vouchers and offers, will keep showing
                  exactly as it is on the customer-facing app.
                </>
              )}
            </p>
          </div>
        </div>

        {!willActivate && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <input
              type="checkbox"
              checked={hideFromCustomers}
              onChange={(e) => setHideFromCustomers(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-amber-500 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <span>
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                Also hide from customers
              </span>
              <span className="mt-0.5 block text-[11.5px] text-neutral-500">
                Removes {brand.brandName} entirely from the customer-facing app — its listings and
                offers won't be visible until it's re-activated.
              </span>
            </span>
          </label>
        )}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(willActivate ? false : hideFromCustomers)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
              willActivate
                ? "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
                : "bg-amber-400 text-neutral-950 hover:bg-amber-300"
            }`}
          >
            {willActivate ? "Yes, Activate" : "Yes, Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Confirm-then-run wrapper for destructive actions */
export function useConfirmDelete(onConfirm) {
  return (brand) => {
    const ok = window.confirm(
      `Delete "${brand.brandName}"? This will permanently remove the brand and cannot be undone.`
    );
    if (ok) onConfirm(brand);
  };
}

export { StatusBadge };