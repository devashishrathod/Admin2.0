import React, { useState } from "react";
import {
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  MessageSquareWarning,
  FileText,
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

export function BrandAvatar({ brand, size = "md" }) {
  const sizes = {
    sm: "h-9 w-9 text-[13px] rounded-lg",
    md: "h-11 w-11 text-[16px] rounded-xl",
    lg: "h-14 w-14 text-[20px] rounded-2xl",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-orange-500 font-semibold text-white ${sizes[size]}`}
    >
      {brand.logo ? (
        <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
      ) : (
        <span>{brand.emoji || brand.brandName?.charAt(0)}</span>
      )}
    </div>
  );
}

export function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      aria-label="Toggle brand active state"
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-400" : "bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
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
      <span className="text-[13.5px] font-medium text-neutral-200">{value}</span>
    </div>
  );
}

export function VerificationRow({ icon: Icon, label, value, verified }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <Icon size={15} className="text-neutral-500" />
        <div>
          <p className="text-[11px] text-neutral-500">{label}</p>
          <p className="text-[13px] font-medium text-neutral-200">{value || "—"}</p>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
          verified ? "bg-emerald-400/10 text-emerald-400" : "bg-red-500/10 text-red-400"
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
      <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5">
        <p className="truncate font-mono text-[12.5px] text-neutral-300">{token || "—"}</p>
        <button
          type="button"
          onClick={() => token && navigator.clipboard?.writeText(token)}
          className="shrink-0 rounded-lg border border-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
        >
          Copy
        </button>
      </div>
    </SectionCard>
  );
}

export function SectionCard({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-900 p-5 ${className}`}>
      {title && (
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-10 text-center text-[13px] text-neutral-500">
      {label}
    </div>
  );
}

/* Small badge shown wherever an incomplete-onboarding brand needs a status pill */
export function OnboardingBadge({ brand, className = "" }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-400 ${className}`}
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
      className={`flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-medium text-red-400 ${className}`}
      title={brand.rejectionReason}
    >
      <MessageSquareWarning size={10} />
      <span className="max-w-[220px] truncate">{brand.rejectionReason}</span>
    </span>
  );
}

export const inputClass =
  "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13px] text-neutral-200 placeholder:text-neutral-600 outline-none transition-colors focus:border-emerald-500/50";

export function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-400">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

export function FileField({ label, accept, multiple = false, files = [], onChange }) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} className="block cursor-pointer">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-400">{label}</span>
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-700 bg-neutral-950 px-3 py-4 text-center transition-colors hover:border-emerald-500/50">
        <FileText size={16} className="text-neutral-600" />
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

export function StatChip({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-800/80 bg-neutral-950/60 px-2.5 py-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
        <Icon size={12} />
      </span>
      <div className="leading-tight">
        <p className="text-[12.5px] font-semibold text-neutral-200">{value}</p>
        <p className="text-[9.5px] uppercase tracking-wide text-neutral-500">{label}</p>
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
      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-50">Reject Listing</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Tell {brand.ownerName || "the owner"} why{" "}
              <span className="text-neutral-300">{brand.brandName}</span> is being rejected. This
              reason is shown to the brand owner.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-800 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
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

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-800 px-4 py-2 text-[13px] font-medium text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-200"
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
            ? "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
            : brand.status === "Active"
            ? "bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
            : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
        }`}
      >
        {isPending ? "Awaiting Approval" : brand.status}
        <ChevronRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl shadow-black/40">
            <button
              onClick={() => {
                onDecision(brand, "Active", "");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-emerald-400 transition-colors hover:bg-neutral-800"
            >
              <Check size={13} />
              Approve
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setShowRejectModal(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-400 transition-colors hover:bg-neutral-800"
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