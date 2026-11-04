import { isMissing, MISSING } from "../../utils/helpers";

/* -------------------------------------------------------------------------
 * ValueOr — shows a value, or (when it's missing / "—") a short muted phrase
 * saying what's missing, instead of a bare dash.
 *
 *   <ValueOr value={refund.utr} fallback="No UTR yet" />
 *   <ValueOr value={brand.location} fallback={MISSING.location} />
 *
 * Use orText() from utils/helpers for plain-string spots (titles, exports).
 *
 * Emails and links are shown exactly as stored: the app-wide
 * `text-transform: capitalize` (index.css) would otherwise paint
 * "asha@example.com" as "Asha@Example.Com".
 * ---------------------------------------------------------------------- */
const KEEP_CASE = /^\S+@\S+\.\S+$|^(https?:\/\/|www\.)\S+$/i;

export default function ValueOr({ value, fallback = MISSING.generic, children }) {
  if (isMissing(value)) {
    return <span className="font-normal text-neutral-400 dark:text-neutral-500">{fallback}</span>;
  }
  if (children != null) return children;
  if (typeof value === "string" && KEEP_CASE.test(value.trim())) return <span className="normal-case">{value}</span>;
  return value;
}
