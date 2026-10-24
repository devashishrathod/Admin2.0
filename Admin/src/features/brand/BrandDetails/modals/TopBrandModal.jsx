import { useState } from "react";
import { AlertTriangle, X, Sparkles, Loader2 } from "lucide-react";
import { ToggleSwitch, Field, inputClass } from "../../BrandShared";

/* -------------------------------------------------------------------------
 * Top Brand Modal
 * Lets a super admin mark/unmark a brand as a "Top Brand" and set its
 * display order. Calls PUT /brands/admin/top-brands/:brandId with body
 * { brandId, isTopBrand, topOrder } via the onSetTopBrand(brand, payload)
 * handler passed down from BrandContext.
 * ---------------------------------------------------------------------- */

export default function TopBrandModal({ brand, onClose, onSubmit }) {
  const [isTopBrand, setIsTopBrand] = useState(Boolean(brand.isTopBrand));
  const [topOrder, setTopOrder] = useState(brand.topOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit(brand, {
        isTopBrand,
        topOrder: isTopBrand ? Number(topOrder) || 0 : 0,
      });
      onClose();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-600 dark:text-amber-400">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Top Brand Placement</h2>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">
                Feature <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> in the
                top-brands section shown to customers.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <div>
              <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Mark as Top Brand</p>
              <p className="mt-0.5 text-[11.5px] text-neutral-500">Toggle off to remove it from the top-brands list.</p>
            </div>
            <ToggleSwitch
              checked={isTopBrand}
              onChange={() => setIsTopBrand((v) => !v)}
              title={isTopBrand ? "Unmark as Top Brand" : "Mark as Top Brand"}
            />
          </div>

          {isTopBrand && (
            <Field label="Display Order" required>
              <input
                type="number"
                min="0"
                step="1"
                value={topOrder}
                onChange={(e) => setTopOrder(e.target.value)}
                placeholder="e.g. 1"
                required
                className={inputClass}
              />
              <p className="mt-1.5 text-[11.5px] text-neutral-500">
                Lower numbers show first. Brands sharing an order fall back to most-recently-added first.
              </p>
            </Field>
          )}

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
              disabled={submitting || (isTopBrand && topOrder === "")}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
