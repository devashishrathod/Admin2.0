import { AlertTriangle, Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared "are you sure?" gate for any update/status-change action that
 * doesn't need a reason typed in first (Settlement's hold/cancel and
 * Brand's Cancel Subscription already ask for a reason via their own
 * dedicated modals — this is for the simpler case, like flipping a
 * customer's active/inactive switch, where the action still shouldn't
 * fire on a single accidental click).
 * ---------------------------------------------------------------------- */
export default function ConfirmActionModal({
  open,
  tone = "neutral", // "danger" | "neutral"
  icon: Icon,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  submitting = false,
  error,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const toneCls =
    tone === "danger"
      ? {
          iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
          confirmBtn: "bg-red-500 text-white hover:bg-red-400",
        }
      : {
          iconBg: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
          confirmBtn: "bg-emerald-400 text-neutral-950 hover:bg-emerald-300",
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
      >
        <div className="mb-5 flex items-start gap-3">
          {Icon && (
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toneCls.iconBg}`}>
              <Icon size={17} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
            {description && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">{description}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${toneCls.confirmBtn}`}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
