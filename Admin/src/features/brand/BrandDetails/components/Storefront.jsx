// Storefront pieces for the Sub-Brand grid cards — ported from the Vendor
// Panel's outlets/components/Storefront.jsx so both panels show outlets the
// same way. Awning / sign styles live in src/index.css.

const cx = (...classes) => classes.filter(Boolean).join(" ");

/** Striped shop canopy with a scalloped edge; `children` sit on the stripes.
 *  `variant`: "own" (green) | "franchise" (amber) | "closed" (grey). */
export function StoreAwning({ variant, height = "h-[52px]", className, children }) {
  return (
    <div className={cx(`awning-${variant}`, className)}>
      <div className={cx("awning-stripes relative", height)}>{children}</div>
      <div aria-hidden="true" className="awning-scallops" />
    </div>
  );
}

/** Hanging OPEN / CLOSED board, strung from a nail under the awning. */
export function OpenSign({ open, className }) {
  return (
    <div aria-hidden="true" className={cx("sign-swing pointer-events-none flex flex-col items-center", className)}>
      <svg width="44" height="12" viewBox="0 0 56 18" fill="none" preserveAspectRatio="none">
        <path d="M10 18 L28 1 L46 18" stroke="#6B7280" strokeWidth="1.5" />
        <circle cx="28" cy="2" r="2" fill="#6B7280" />
      </svg>
      <span
        className={cx(
          "-mt-px rounded-md border-2 bg-white px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-[0.14em] shadow-md dark:bg-neutral-900",
          open
            ? "-rotate-[4deg] border-emerald-700 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400"
            : "rotate-[5deg] border-neutral-500 text-neutral-600 dark:border-neutral-500 dark:text-neutral-300"
        )}
      >
        {open ? "OPEN" : "CLOSED"}
      </span>
    </div>
  );
}

/** Rounded store icon tile, tinted to match the awning. */
export function StoreTile({ variant }) {
  const tint = {
    own: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    franchise: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    closed: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  }[variant];
  return (
    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tint)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9 4.5 4h15L21 9" />
        <path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
        <path d="M5 13v7h14v-7" />
        <path d="M10 20v-4h4v4" />
      </svg>
    </span>
  );
}
