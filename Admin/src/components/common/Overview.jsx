import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import SelectDropdown from "./SelectDropdown";
import { dayKey, compactInr } from "../../utils/overviewStats";

/* -------------------------------------------------------------------------
 * Finance overview widgets — KPI cards, a daily bar chart, a share/mix card
 * and pill tabs. Shared by Transactions, Settlement and Refund so the three
 * pages read as one system.
 * ---------------------------------------------------------------------- */

const CARD = "rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

const MIX_COLORS = ["#10B981", "#22D3EE", "#A3A3A3", "#F59E0B", "#F87171", "#8B5CF6"];

const byDate = (r) => r.date;

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

// `invert` flips the colours for metrics where going up is bad (refunds).
function TrendBadge({ value, suffix = "%", invert = false }) {
  if (value === null) {
    return <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">New</span>;
  }
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        good ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      <Icon size={11} />
      {Math.abs(value).toFixed(2)}
      {suffix}
    </span>
  );
}

// Leave `trend` undefined to hide the badge; `sub` replaces the
// "vs previous 7 days" caption.
export function KpiCard({ icon: Icon, label, value, trend, trendSuffix, invert, sub }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          <Icon size={14} />
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="truncate text-[24px] font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">{value}</span>
        {trend !== undefined && <TrendBadge value={trend} suffix={trendSuffix} invert={invert} />}
      </div>
      <p className="mt-2 truncate text-[11px] text-neutral-400">{sub ?? "vs previous 7 days"}</p>
    </div>
  );
}

const RANGE_OPTIONS = ["Last 7 days", "Last 14 days", "Last 30 days"];
const RANGE_DAYS = { "Last 7 days": 7, "Last 14 days": 14, "Last 30 days": 30 };

function DailyTooltip({ active, payload, label, countLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <p className="font-semibold text-neutral-900 dark:text-neutral-50">{label}</p>
      <p className="mt-0.5 text-neutral-500">
        {inr(row.value)} · {row.count} {countLabel}
      </p>
    </div>
  );
}

// Sums getValue(row) per day over the selected range. Rows are expected to
// be pre-filtered by the caller (e.g. successful payments only).
export function DailyBarsCard({
  title,
  subtitle,
  icon: Icon,
  rows,
  getDate = byDate,
  getValue,
  countLabel = "items",
  emptyText = "No data in this period.",
  gradientId,
  className = "",
}) {
  const [range, setRange] = useState("Last 14 days");
  const days = RANGE_DAYS[range];

  const data = useMemo(() => {
    const byDay = {};
    rows.forEach((r) => {
      const d = getDate(r);
      if (!d) return;
      const slot = (byDay[d] ||= { value: 0, count: 0 });
      slot.value += Number(getValue(r)) || 0;
      slot.count += 1;
    });
    return Array.from({ length: days }, (_, i) => {
      const key = dayKey(days - 1 - i);
      const label = new Date(key + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      return { label, value: byDay[key]?.value || 0, count: byDay[key]?.count || 0 };
    });
  }, [rows, days, getDate, getValue]);

  const hasData = data.some((d) => d.value > 0);

  return (
    <div className={`${CARD} p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
            {Icon && <Icon size={14} className="text-emerald-500" />}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[11.5px] text-neutral-500">{subtitle}</p>}
        </div>
        <SelectDropdown value={range} options={RANGE_OPTIONS} onChange={setRange} />
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E5E5E5" strokeOpacity={0.6} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#8C9A91", fontSize: 10 }} axisLine={false} tickLine={false} interval={days > 14 ? 3 : 0} />
            <YAxis tick={{ fill: "#8C9A91", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={compactInr} width={52} />
            <Tooltip cursor={{ fill: "rgba(16,185,129,0.06)" }} content={<DailyTooltip countLabel={countLabel} />} />
            <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-55 items-center justify-center text-[12.5px] text-neutral-500">{emptyText}</div>
      )}
    </div>
  );
}

// items: [{ name, count, color? }] — sorted and coloured here unless a
// colour is supplied (e.g. fixed status colours).
export function MixCard({ title, icon: Icon, total, totalLabel, items, emptyText = "No data yet." }) {
  const mix = useMemo(() => {
    const sum = items.reduce((s, i) => s + i.count, 0) || 1;
    return [...items]
      .sort((a, b) => b.count - a.count)
      .map((item, i) => ({
        ...item,
        pct: (item.count / sum) * 100,
        color: item.color || MIX_COLORS[i % MIX_COLORS.length],
      }));
  }, [items]);

  return (
    <div className={`${CARD} flex flex-col p-4`}>
      <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
        {Icon && <Icon size={14} className="text-emerald-500" />}
        {title}
      </h2>
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">
        {Number(total).toLocaleString("en-IN")}
        <span className="ml-1.5 text-[12px] font-normal text-neutral-500">{totalLabel}</span>
      </p>

      {mix.length ? (
        <>
          <div className="mt-4 flex h-3 gap-1 overflow-hidden">
            {mix.map((m) => (
              <span key={m.name} className="h-full rounded-sm" style={{ width: `${m.pct}%`, backgroundColor: m.color }} title={`${m.name} · ${m.count}`} />
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {mix.map((m) => (
              <li key={m.name} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: m.color }} />
                <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{m.name}</span>
                <span className="text-[11px] text-neutral-400">{m.count}</span>
                <span className="w-10 text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{Math.round(m.pct)}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-6 text-[12.5px] text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}

// tabs: [{ key, label, count }]
export function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-3xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:inline-flex sm:rounded-full">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              isActive
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] font-semibold ${
                  isActive ? "bg-white/20 dark:bg-neutral-900/15" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
