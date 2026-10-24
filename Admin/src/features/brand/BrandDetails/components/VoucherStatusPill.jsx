const VOUCHER_STATUS_STYLES = {
  DRAFT: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
  UNDER_REVIEW: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  PUBLISHED: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400",
  EXPIRED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
  PAUSED: "bg-orange-400/10 text-orange-600 dark:text-orange-400",
  ARCHIVED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

// Voucher status chip used by the Listings and Voucher tabs.
export default function VoucherStatusPill({ status }) {
  const cls = VOUCHER_STATUS_STYLES[status] || VOUCHER_STATUS_STYLES.DRAFT;
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {status ? status.replace(/_/g, " ") : "Unknown"}
    </span>
  );
}
