/* -------------------------------------------------------------------------
 * Loader — the one "data is on its way" UI used across the panel, shown
 * while a page, list or section waits for its API data.
 *
 *   <Loader label="Loading banners…" />                    // list / table area
 *   <Loader variant="page" label="Loading brand…" />       // whole detail page
 *   <Loader variant="inline" label="Loading plans…" />     // inside a card / field
 *
 * Variants:
 *  - "section" (default): dashed box with a centred spinner + label.
 *  - "page": centred in the viewport area (min 60vh), for early returns.
 *  - "inline": small spinner + label on one line. Pass `center` to centre it.
 *
 * `className` is appended, so callers can tweak spacing (e.g. "mb-8").
 * Announced to screen readers via role="status".
 * ---------------------------------------------------------------------- */

function Spinner({ size }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 animate-spin motion-reduce:[animation-duration:2.4s]"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" className="text-neutral-200 dark:text-neutral-800" />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-emerald-500 dark:text-emerald-400"
      />
    </svg>
  );
}

const VARIANTS = {
  page: "flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-[13px]",
  section:
    "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 px-4 py-14 text-[13px] dark:border-neutral-800",
  inline: "flex items-center gap-2 text-[12.5px]",
};

export default function Loader({ label = "Loading…", variant = "section", center = false, className = "" }) {
  const isInline = variant === "inline";
  // Inline gets a little vertical room unless the caller sets its own.
  const pad = isInline && !/(^|\s)py?-/.test(className) ? "py-2" : "";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${VARIANTS[variant] || VARIANTS.section} ${isInline && center ? "justify-center" : ""} ${pad} text-neutral-500 dark:text-neutral-400 ${className}`}
    >
      <Spinner size={isInline ? 14 : variant === "page" ? 32 : 26} />
      <span className={isInline ? "" : "font-medium"}>{label}</span>
    </div>
  );
}
