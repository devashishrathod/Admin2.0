import { XCircle, X, AlertTriangle, Loader2 } from "lucide-react";
import useBackLayer from "../../../lib/useBackLayer";

/* Reason box for rejecting a voucher or its banner — the reason is shown
 * to the vendor. Controlled: the parent owns the text, the error and the
 * submit (same validation as before the split). Browser Back closes it. */
export default function RejectReasonModal({ title, subject, children, value, onChange, error, placeholder, busy, onCancel, onSubmit }) {
  useBackLayer(true, onCancel);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <XCircle size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                {children} <span className="text-neutral-700 dark:text-neutral-300">{subject}</span>. This reason is shown to the vendor.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              Reason for rejection <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              placeholder={placeholder}
              disabled={busy}
              className={`w-full resize-none rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                error ? "ring-1 ring-red-500/60 focus:ring-red-500/60" : "focus:ring-red-400/60"
              }`}
            />
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                <AlertTriangle size={11} /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 size={13} className="animate-spin" />}
              Confirm Rejection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
