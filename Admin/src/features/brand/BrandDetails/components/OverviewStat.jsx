// Small label/value tile (icon on top) in the glass/bento style. Used by the
// Account Details tab.
export default function OverviewStat({ icon: Icon, label, value, strike = false }) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/80 bg-white/65 p-4 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30">
      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
        <Icon size={15} />
      </span>
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
      <div
        className={`mt-1 truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 ${
          strike ? "line-through decoration-neutral-400 dark:decoration-neutral-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
