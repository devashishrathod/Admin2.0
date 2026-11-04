import { Check, Globe, Loader2 } from "lucide-react";
import { Notice, Pill } from "../NotificationUi";
import { TINTS, innerTile } from "../notificationStyles";
import { formatCount } from "../../utils/notificationUtils";

// Share bar colour per group tint (the bar under each count).
const BAR = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
};

function CheckDot({ checked }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      }`}
    >
      {checked && <Check size={11} strokeWidth={3.5} />}
    </span>
  );
}

/* Tappable role card — the whole card is the checkbox.
 *   header: icon · title + description · check
 *   footer: count · share of all recipients (bar + %)
 * `wide` lays the same parts out in one row (the "Everyone" card). */
function OptionCard({ checked, onChange, icon: Icon, tint, title, description, count, exact, loading, total, wide = false }) {
  const pct = total && count != null ? Math.round((count / total) * 100) : null;

  const countBlock = loading ? (
    <Loader2 size={15} className="animate-spin text-neutral-400" />
  ) : (
    <p className="flex items-baseline gap-1">
      <span className="text-[20px] font-bold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">{formatCount(count, exact)}</span>
      <span className="text-[11px] normal-case text-neutral-400">people</span>
    </p>
  );

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group flex h-full w-full flex-col rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(16,185,129,0.10)] ${
        checked
          ? "border-emerald-400/70 bg-emerald-400/[0.07] ring-2 ring-emerald-400/15"
          : `border-white/80 dark:border-white/5 ${innerTile}`
      }`}
    >
      <div className={`flex items-start gap-3 p-3.5 ${wide ? "sm:items-center" : ""}`}>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TINTS[tint]}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{title}</p>
          <p className="mt-0.5 text-[11px] normal-case leading-snug text-neutral-500">{description}</p>
        </div>
        {wide && <div className="hidden shrink-0 sm:block">{countBlock}</div>}
        <CheckDot checked={checked} />
      </div>

      {!wide && (
        <div className="mt-auto flex items-center gap-3 border-t border-neutral-200/60 px-3.5 py-2.5 dark:border-neutral-800/70">
          {countBlock}
          {pct != null && !loading && (
            <div className="ml-auto flex w-20 items-center gap-1.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
                <div className={`h-full rounded-full ${BAR[tint]} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-7 text-right text-[10px] font-semibold tabular-nums text-neutral-400">{pct}%</span>
            </div>
          )}
        </div>
      )}
      {wide && <div className="border-t border-neutral-200/60 px-3.5 py-2.5 sm:hidden dark:border-neutral-800/70">{countBlock}</div>}
    </button>
  );
}

/* By role — Customers / Vendors / Outlet managers (any mix), or everyone.
 * roleStats come from ComposeTab: a dry run per role, else the loaded total. */
export default function RoleAudience({ audience, onChange, roleStats }) {
  const toggle = (role, on) =>
    onChange({ everyone: false, roles: on ? [...new Set([...audience.roles, role])] : audience.roles.filter((r) => r !== role) });

  const total = roleStats.reduce((n, r) => n + (r.count ?? 0), 0);
  const allExact = roleStats.every((r) => r.exact);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {roleStats.map((r) => (
          <OptionCard
            key={r.key}
            checked={!audience.everyone && audience.roles.includes(r.role)}
            onChange={(on) => toggle(r.role, on)}
            icon={r.icon}
            tint={r.tint}
            title={r.label}
            description={r.description}
            count={r.count}
            exact={r.exact}
            loading={r.loading}
            total={total}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        or
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <OptionCard
        wide
        checked={audience.everyone}
        onChange={(on) => onChange({ everyone: on })}
        icon={Globe}
        tint="amber"
        title="Everyone on the platform"
        description="Every customer, vendor and outlet manager in one send."
        count={total}
        exact={allExact}
        loading={roleStats.some((r) => r.loading)}
      />

      {audience.everyone && (
        <Notice tone="warning">
          <span className="normal-case">
            This reaches every account on Trydood. You'll be asked to confirm before it goes out.
          </span>
        </Notice>
      )}
      {!audience.everyone && audience.roles.length === 0 && <Pill tint="amber">Pick at least one role</Pill>}
    </div>
  );
}
