import { useState } from "react";
import useBackLayer from "../../lib/useBackLayer";
import { Hourglass, X, Loader2, AlertTriangle, EyeOff, Ban, CheckCircle2 } from "lucide-react";

const NOTE_MAX = 500;

/* -------------------------------------------------------------------------
 * "Coming soon" on a real brand — PUT /brands/admin/real-dummy/:brandId.
 *   ON : the brand shows to customers like a dummy brand until launch
 *        (contact / address / directions hidden, new claims blocked). An
 *        internal note is required (max 500) — vendors and customers never
 *        see it.
 *   OFF: back to a normal live brand; the note is cleared.
 * Only for real, approved brands. `onSubmit(brand, { isRealDummy, note })`
 * throws on failure so the error shows here.
 * ---------------------------------------------------------------------- */
export default function ComingSoonModal({ brand, onClose, onSubmit }) {
  const turningOn = !brand.isRealDummy;
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useBackLayer(true, () => !submitting && onClose()); // browser Back closes it

  const approved = brand.status !== "Pending" && brand.status !== "Rejected" && brand.status !== "Revoked";
  const noteOk = note.trim().length > 0 && note.trim().length <= NOTE_MAX;
  const canSubmit = !submitting && (turningOn ? noteOk && approved : true);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(brand, turningOn ? { isRealDummy: true, note: note.trim() } : { isRealDummy: false });
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={submitting ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-6 normal-case shadow-2xl dark:bg-neutral-900">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                turningOn ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Hourglass size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                {turningOn ? "Mark as RD brand?" : "Remove RD brand?"}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                <span className="font-medium capitalize text-neutral-700 dark:text-neutral-300">{brand.brandName}</span>
                {turningOn ? " stays a real brand — only how customers see it changes." : " goes back to a normal live brand."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:text-neutral-800 disabled:opacity-50 dark:border-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        {turningOn ? (
          <>
            {/* What changes for customers */}
            {/* <ul className="mb-4 space-y-1.5 rounded-2xl bg-neutral-50 px-4 py-3 text-[12px] text-neutral-600 dark:bg-neutral-950/60 dark:text-neutral-300">
              <li className="flex items-start gap-2">
                <EyeOff size={13} className="mt-0.5 shrink-0 text-violet-500" />
                Customers see it like a dummy brand — contact, address and directions hidden, “Coming soon” shown.
              </li>
              <li className="flex items-start gap-2">
                <Ban size={13} className="mt-0.5 shrink-0 text-violet-500" />
                New voucher claims are blocked. Vouchers already bought can still be redeemed.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-violet-500" />
                It stays in the feed, search and Top Brands. The vendor isn't told.
              </li>
            </ul> */}

            {!approved && (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-400/10 px-3.5 py-2.5 text-[12.5px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Only an approved brand can be marked as RD brand.
              </p>
            )}

            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="coming-soon-note" className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Internal note<span className="ml-0.5 text-red-500">*</span>
              </label>
              <span className={`text-[11px] tabular-nums ${note.length >= NOTE_MAX ? "text-amber-600" : "text-neutral-400"}`}>
                {note.length} / {NOTE_MAX}
              </span>
            </div>
            <textarea
              id="coming-soon-note"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={3}
              placeholder="e.g. Menu aur photos baaki, 1 Nov launch"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-violet-400/60 focus:outline-none focus:ring-1 focus:ring-violet-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
            <p className="mt-1 text-[11px] text-neutral-500">Only admins see this — never the vendor or customers.</p>
          </>
        ) : (
          brand.realDummyNote && (
            <div className="mb-2 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/60">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Current note</p>
              <p className="mt-1 text-[13px] text-neutral-700 dark:text-neutral-300">{brand.realDummyNote}</p>
              {brand.realDummyUpdatedAt && <p className="mt-1 text-[11px] text-neutral-400">Set {fmt(brand.realDummyUpdatedAt)}</p>}
              <p className="mt-2 text-[11px] text-neutral-500">The note is cleared when you remove RD brand.</p>
            </div>
          )
        )}

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              turningOn ? "bg-violet-500 text-white hover:bg-violet-400" : "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
            }`}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {turningOn ? "Mark as RD brand" : "Remove RD brand"}
          </button>
        </div>
      </div>
    </div>
  );
}
