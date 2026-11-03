/* Subscription status chip, with a "Lapsed" note under an expired-but-unflagged plan. */

const STATUS_TONES = {
  ACTIVE: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  PENDING: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  EXPIRED: "bg-red-500/10 text-red-600 dark:text-red-400",
  UPGRADED: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
};

export default function StatusPill({ status, isLapsed }) {
  const tone = STATUS_TONES[status] || "bg-neutral-200 dark:bg-neutral-700/40 text-neutral-500 dark:text-neutral-400";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {status}
      </span>
      {isLapsed && (
        <span className="text-[10.5px] font-medium text-red-600 dark:text-red-400">Lapsed</span>
      )}
    </div>
  );
}
