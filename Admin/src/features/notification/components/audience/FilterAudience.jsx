import { useMemo } from "react";
import { CalendarDays, Mail, RotateCcw, Search, ShieldCheck, Users } from "lucide-react";
import { AUDIENCE_GROUPS, EMPTY_DRAFT, STATUS_OPTIONS, groupByKey } from "../../notificationConfig";
import { applyFilter, isRoleWideFilter } from "../../utils/notificationUtils";
import { Field, IconInput, Select, Switch } from "../NotificationUi";
import { TINTS, innerTile } from "../notificationStyles";

/* By filter — one group narrowed by status, keyword, join date and "has an
 * email". A filter that only uses "has email" goes to the server as the
 * whole role; anything narrower resolves to ids from the loaded list. */
export default function FilterAudience({ filter, onChange, directory }) {
  const group = groupByKey(filter.group);
  const src = directory[group.key];
  const roleWide = isRoleWideFilter(filter);
  const matching = useMemo(() => applyFilter(src.rows, filter).length, [src.rows, filter]);
  const count = roleWide && !filter.hasEmail ? src.total : matching;
  const pct = src.total ? Math.min(100, Math.round((count / src.total) * 100)) : 0;
  const active = [filter.status !== "all", filter.keyword.trim(), filter.from || filter.to, filter.hasEmail].filter(Boolean).length;
  const GroupIcon = group.icon;

  return (
    <div className="space-y-3">
      <div className={`space-y-3 rounded-2xl border border-neutral-200/70 p-4 dark:border-neutral-800 ${innerTile}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Audience">
            <Select
              icon={Users}
              value={filter.group}
              onChange={(v) => onChange({ group: v })}
              options={AUDIENCE_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
            />
          </Field>
          <Field label="Account status">
            <Select icon={ShieldCheck} value={filter.status} onChange={(v) => onChange({ status: v })} options={STATUS_OPTIONS} />
          </Field>
        </div>

        <Field label="Keyword">
          <IconInput
            icon={Search}
            value={filter.keyword}
            onChange={(v) => onChange({ keyword: v })}
            onClear={() => onChange({ keyword: "" })}
            placeholder="Name, email, phone or ID"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Joined from">
            <IconInput
              icon={CalendarDays}
              type="date"
              value={filter.from}
              max={filter.to || undefined}
              onChange={(v) => onChange({ from: v })}
            />
          </Field>
          <Field label="Joined to">
            <IconInput
              icon={CalendarDays}
              type="date"
              value={filter.to}
              min={filter.from || undefined}
              onChange={(v) => onChange({ to: v })}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => onChange({ hasEmail: !filter.hasEmail })}
          className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <Mail size={14} className="shrink-0 text-neutral-400" />
          <span className="flex-1">
            <span className="block text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-200">Only people with an email</span>
            <span className="block text-[10.5px] normal-case text-neutral-400">Skip anyone who hasn't added an email address</span>
          </span>
          <Switch checked={filter.hasEmail} />
        </button>
      </div>

      {/* Result */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.06] px-4 py-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TINTS[group.tint]}`}>
          <GroupIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-100">Matching this filter</p>
          <p className="truncate text-[10.5px] normal-case text-neutral-500">
            {roleWide && !filter.hasEmail
              ? `Every ${group.singular} on the platform`
              : `${pct}% of ${src.rows.length} loaded ${group.label.toLowerCase()}`}
          </p>
          <div className="mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-emerald-100 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-[26px] font-bold leading-none tabular-nums text-neutral-900 dark:text-neutral-50">
          {src.loading ? "…" : count.toLocaleString("en-IN")}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] normal-case text-neutral-400">{active ? `${active} filter${active === 1 ? "" : "s"} on` : "No filters on"}</span>
        <button
          type="button"
          disabled={!active}
          onClick={() => onChange({ ...EMPTY_DRAFT.audience.filter, status: "all", group: filter.group })}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300"
        >
          <RotateCcw size={12} /> Reset filters
        </button>
      </div>
    </div>
  );
}
