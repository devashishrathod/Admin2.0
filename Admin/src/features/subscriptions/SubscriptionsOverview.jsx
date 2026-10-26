import { useMemo, useState } from "react";
import {
  Layers,
  ShieldCheck,
  Clock3,
  IndianRupee,
  CheckCircle2,
  Hourglass,
  XCircle,
  ArrowUpCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";

/* -------------------------------------------------------------------------
 * Subscriptions overview — analysis of every subscription matching the
 * page's filters (status, source, search) in this scope (real or D),
 * across all pages — not just the table page. Kept compact so it fits a
 * laptop viewport above the table:
 *   row 1: KPI tiles — total, live plans, revenue collected, renewals ≤ 7d
 *   row 2: Subscriptions by plan (donut + legend: count · share · revenue)
 *          · Status mix (stacked bar + list) and Source mix
 *   row 3: New subscriptions / month · Revenue / month — each with this
 *          month vs last, a 12-month summary and the graph.
 *
 * Colors: the validated categorical palette (light & dark steps, checked
 * against this app's card surfaces #ffffff / #171717). Light-mode slots 3-5
 * are under 3:1 on white, so the charts carry visible labelled values
 * (legend, summary boxes). Status uses the reserved status palette, always
 * with an icon + label.
 * ---------------------------------------------------------------------- */

const PALETTE = {
  light: {
    series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
    other: "#898781",
    grid: "#ececea",
    axis: "#898781",
    surface: "#ffffff",
  },
  dark: {
    series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
    other: "#6b6a66",
    grid: "#262626",
    axis: "#898781",
    surface: "#171717",
  },
};
const STATUS_COLORS = { ACTIVE: "#0ca30c", PENDING: "#fab219", EXPIRED: "#d03b3b", UPGRADED: "#898781" };
const STATUS_META = {
  ACTIVE: { label: "Active", icon: CheckCircle2 },
  PENDING: { label: "Pending", icon: Hourglass },
  EXPIRED: { label: "Expired", icon: XCircle },
  UPGRADED: { label: "Upgraded", icon: ArrowUpCircle },
};
const SOURCE_LABELS = { PAYMENT: "Online payment", ADMIN_PAYMENT: "Admin · offline payment", ADMIN_MANUAL: "Admin grant" };
const MAX_PLAN_SLICES = 6; // past this, the tail folds into "Other"
const CHART_H = 128; // graph height in the trend cards

const card = "rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const inrShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}k`;
  return `₹${Math.round(v)}`;
};
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// Lapsed rows still say ACTIVE on the record — count them as expired.
const effectiveStatus = (r) => (r.isLapsed && r.status === "ACTIVE" ? "EXPIRED" : r.status || "PENDING");

/* ---------------------------- Data -------------------------------------- */

function useOverview(rows) {
  return useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => effectiveStatus(r) === "ACTIVE").length;
    const expiringSoon = rows.filter(
      (r) => effectiveStatus(r) === "ACTIVE" && r.daysRemaining != null && r.daysRemaining <= 7
    ).length;
    const paid = rows.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const due = rows.reduce((s, r) => s + (r.dueAmount || 0), 0);
    const paying = rows.filter((r) => (r.paidAmount || 0) > 0).length;
    const freeGrants = rows.filter((r) => r.isFreeGrant).length;

    // Plans: count + revenue, biggest first; the tail folds into "Other".
    const byPlan = new Map();
    rows.forEach((r) => {
      const name = r.plan?.name || "No plan";
      const e = byPlan.get(name) || { name, count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += r.paidAmount || 0;
      byPlan.set(name, e);
    });
    const sortedPlans = [...byPlan.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    let plans = sortedPlans;
    if (sortedPlans.length > MAX_PLAN_SLICES) {
      const head = sortedPlans.slice(0, MAX_PLAN_SLICES - 1);
      const tail = sortedPlans.slice(MAX_PLAN_SLICES - 1);
      plans = [
        ...head,
        {
          name: `Other (${tail.length} plans)`,
          count: tail.reduce((s, p) => s + p.count, 0),
          revenue: tail.reduce((s, p) => s + p.revenue, 0),
          isOther: true,
        },
      ];
    }

    const statuses = ["ACTIVE", "PENDING", "EXPIRED", "UPGRADED"]
      .map((key) => ({ key, count: rows.filter((r) => effectiveStatus(r) === key).length }))
      .filter((s) => s.count > 0);

    const bySource = new Map();
    rows.forEach((r) => {
      const key = r.source || "UNKNOWN";
      bySource.set(key, (bySource.get(key) || 0) + 1);
    });
    const sources = [...bySource.entries()]
      .map(([key, count]) => ({ key, label: SOURCE_LABELS[key] || key, count }))
      .sort((a, b) => b.count - a.count);

    // Last 12 months, oldest → newest, zero-filled.
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        fullLabel: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        count: 0,
        paid: 0,
        due: 0,
      };
    });
    const monthIndex = new Map(months.map((m, i) => [m.key, i]));
    rows.forEach((r) => {
      if (!r.createdAt) return;
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) return;
      const i = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i == null) return;
      months[i].count += 1;
      months[i].paid += r.paidAmount || 0;
      months[i].due += r.dueAmount || 0;
    });

    return { total, active, expiringSoon, paid, due, paying, freeGrants, plans, statuses, sources, months };
  }, [rows]);
}

/* ---------------------------- Pieces ------------------------------------ */

function KpiTile({ icon: Icon, tint, label, value, note }) {
  const tints = {
    emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <div className={`${card} flex items-center gap-3 !p-3.5`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-medium text-neutral-500">{label}</p>
        <p className="text-[20px] font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
        {note && <p className="truncate text-[11px] text-neutral-500">{note}</p>}
      </div>
    </div>
  );
}

function CardTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold text-neutral-900 dark:text-neutral-50">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-neutral-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function ChartTip({ active, payload, label, format = (v) => v }) {
  if (!active || !payload?.length) return null;
  const title = payload[0]?.payload?.fullLabel || label;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[12px] shadow-lg ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
      <p className="mb-1 font-semibold text-neutral-900 dark:text-neutral-50">{title}</p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold text-neutral-900 dark:text-neutral-50">{format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// "▲ 12% vs last month" — green up, red down; nothing when there's no
// last-month figure to compare with.
function ChangePill({ current, previous }) {
  if (!previous) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change >= 0;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(change)}% vs last month
    </span>
  );
}

// Headline + three summary boxes, shared by both trend cards.
function TrendHeader({ headline, pill, summary }) {
  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <p className="text-[22px] font-bold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">{headline}</p>
          <p className="text-[11px] text-neutral-500">this month</p>
        </div>
        {pill}
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {summary.map((s) => (
          <div key={s.label} className="min-w-0 rounded-xl bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-950/50">
            <p className="flex items-center gap-1.5 truncate text-[10.5px] font-medium text-neutral-500">
              {s.dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.dot }} />}
              {s.label}
            </p>
            <p className="truncate text-[12.5px] font-bold text-neutral-900 dark:text-neutral-50">{s.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------------------- Cards ------------------------------------- */

function PlansCard({ data, colors }) {
  const [hover, setHover] = useState(null);
  const { plans, total } = data;
  const colorOf = (p, i) => (p.isOther ? colors.other : colors.series[i % colors.series.length]);
  const focus = hover != null ? plans[hover] : null;

  return (
    <div className={`${card} h-full`}>
      <CardTitle icon={Layers} title="Subscriptions by plan" subtitle={`${plans.length} plan${plans.length === 1 ? "" : "s"} · ${total} subscriptions`} />
      {total ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Donut — center shows the total, or the hovered plan */}
          <div className="relative h-[148px] w-[148px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plans}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={plans.length > 1 ? 2 : 0}
                  stroke={colors.surface}
                  strokeWidth={2}
                  onMouseEnter={(_, i) => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  isAnimationActive={false}
                >
                  {plans.map((p, i) => (
                    <Cell key={p.name} fill={colorOf(p, i)} opacity={hover == null || hover === i ? 1 : 0.35} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{focus ? focus.count : total}</p>
              <p className="mt-0.5 max-w-[84px] truncate text-[10.5px] text-neutral-500">{focus ? focus.name : "subscriptions"}</p>
              {focus && <p className="text-[10.5px] font-semibold text-neutral-700 dark:text-neutral-300">{pct(focus.count, total)}%</p>}
            </div>
          </div>

          {/* Legend — the labelled values (no hover needed) */}
          <div className="w-full min-w-0 flex-1">
            <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <span>Plan</span>
              <span className="text-right">Subs</span>
              <span className="w-9 text-right">Share</span>
              <span className="w-14 text-right">Revenue</span>
            </div>
            <ul>
              {plans.map((p, i) => (
                <li
                  key={p.name}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 rounded-lg px-2 py-1 text-[12px] transition-colors ${
                    hover === i ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(p, i) }} />
                    <span className="truncate font-medium text-neutral-800 dark:text-neutral-200" title={p.name}>{p.name}</span>
                  </span>
                  <span className="text-right tabular-nums font-semibold text-neutral-900 dark:text-neutral-50">{p.count}</span>
                  <span className="w-9 text-right tabular-nums text-neutral-500">{pct(p.count, total)}%</span>
                  <span className="w-14 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{inrShort(p.revenue)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="py-10 text-center text-[12.5px] text-neutral-500">No subscriptions match these filters.</p>
      )}
    </div>
  );
}

function StatusSourceCard({ data }) {
  const { statuses, sources, total } = data;
  const maxSource = Math.max(1, ...sources.map((s) => s.count));
  return (
    <div className={`${card} flex h-full flex-col`}>
      <CardTitle icon={ShieldCheck} title="Status" subtitle="Where these subscriptions stand" />
      {total ? (
        <>
          {/* 100% stacked bar, 2px gaps between segments */}
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
            {statuses.map((s) => (
              <div
                key={s.key}
                title={`${STATUS_META[s.key].label}: ${s.count}`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(s.count / total) * 100}%`, backgroundColor: STATUS_COLORS[s.key] }}
              />
            ))}
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
            {statuses.map((s) => {
              const Icon = STATUS_META[s.key].icon;
              return (
                <li key={s.key} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-950/50">
                  <Icon size={13} className="shrink-0" style={{ color: STATUS_COLORS[s.key] }} />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-600 dark:text-neutral-300">{STATUS_META[s.key].label}</span>
                  <span className="text-[12.5px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{s.count}</span>
                  <span className="w-8 text-right text-[10.5px] tabular-nums text-neutral-400">{pct(s.count, total)}%</span>
                </li>
              );
            })}
          </ul>

          <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">By source</p>
          <ul className="space-y-1.5">
            {sources.map((s) => (
              <li key={s.key}>
                <div className="mb-0.5 flex items-center justify-between text-[11.5px]">
                  <span className="truncate text-neutral-600 dark:text-neutral-300">{s.label}</span>
                  <span className="tabular-nums font-semibold text-neutral-900 dark:text-neutral-50">
                    {s.count} <span className="font-normal text-neutral-400">· {pct(s.count, total)}%</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-neutral-500 dark:bg-neutral-400" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-10 text-center text-[12.5px] text-neutral-500">No subscriptions match these filters.</p>
      )}
    </div>
  );
}

// New subscriptions: this month vs last, the 12-month total / monthly
// average / best month, then one bar per month (the current month in the
// full series color, earlier months a lighter tint of it).
function NewSubsCard({ data, colors }) {
  const { months } = data;
  const yearTotal = months.reduce((s, m) => s + m.count, 0);
  const best = months.reduce((a, m) => (m.count > a.count ? m : a), months[0]);
  const thisMonth = months[11].count;
  const lastMonth = months[10].count;

  return (
    <div className={`${card} flex h-full flex-col`}>
      <CardTitle icon={TrendingUp} title="New subscriptions per month" subtitle="Last 12 months, by the month each plan started" />
      <TrendHeader
        headline={thisMonth}
        pill={<ChangePill current={thisMonth} previous={lastMonth} />}
        summary={[
          { label: "Last 12 months", value: yearTotal },
          { label: "Monthly average", value: (yearTotal / 12).toFixed(1) },
          { label: "Best month", value: best.count ? `${best.label} · ${best.count}` : "—" },
        ]}
      />
      <div className="mt-auto">
        <ResponsiveContainer width="100%" height={CHART_H}>
          <BarChart data={months} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: colors.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.6 }} content={<ChartTip />} />
            <Bar dataKey="count" name="New subscriptions" fill={colors.series[0]} radius={[4, 4, 0, 0]} maxBarSize={22}>
              {months.map((m, i) => (
                <Cell key={m.key} fill={colors.series[0]} fillOpacity={i === months.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Revenue: this month vs last, the 12-month collected / due / best month,
// then Paid and Due per month on one ₹ axis.
function RevenueCard({ data, colors }) {
  const { months } = data;
  const yearPaid = months.reduce((s, m) => s + m.paid, 0);
  const yearDue = months.reduce((s, m) => s + m.due, 0);
  const best = months.reduce((a, m) => (m.paid > a.paid ? m : a), months[0]);
  const thisPaid = months[11].paid;
  const lastPaid = months[10].paid;

  return (
    <div className={`${card} flex h-full flex-col`}>
      <CardTitle icon={IndianRupee} title="Revenue per month" subtitle="Last 12 months, by the month each plan started" />
      <TrendHeader
        headline={inr(thisPaid)}
        pill={<ChangePill current={thisPaid} previous={lastPaid} />}
        summary={[
          { label: "Collected", value: inrShort(yearPaid), dot: colors.series[0] },
          { label: "Still due", value: inrShort(yearDue), dot: colors.series[1] },
          { label: "Best month", value: best.paid ? `${best.label} · ${inrShort(best.paid)}` : "—" },
        ]}
      />
      <div className="mt-auto">
        <ResponsiveContainer width="100%" height={CHART_H}>
          <AreaChart data={months} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="subRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.series[0]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colors.series[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="label" tick={{ fill: colors.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={inrShort} tick={{ fill: colors.axis, fontSize: 10.5 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip cursor={{ stroke: colors.axis, strokeWidth: 1 }} content={<ChartTip format={inr} />} />
            <Area
              type="monotone"
              dataKey="paid"
              name="Paid"
              stroke={colors.series[0]}
              strokeWidth={2}
              fill="url(#subRevenueFill)"
              dot={false}
              activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="due"
              name="Due"
              stroke={colors.series[1]}
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------- Overview ---------------------------------- */

export default function SubscriptionsOverview({ rows, loading }) {
  const { isDark } = useTheme();
  const colors = isDark ? PALETTE.dark : PALETTE.light;
  const data = useOverview(rows);

  return (
    // Hold the previous render at reduced opacity while refetching.
    <div className={`mb-5 space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={Users}
          tint="sky"
          label="Total subscriptions"
          value={data.total}
          note={`${data.paying} paid · ${data.freeGrants} free grant${data.freeGrants === 1 ? "" : "s"}`}
        />
        <KpiTile
          icon={ShieldCheck}
          tint="emerald"
          label="Live plans"
          value={data.active}
          note={data.total ? `${pct(data.active, data.total)}% currently running` : "No subscriptions yet"}
        />
        <KpiTile
          icon={IndianRupee}
          tint="violet"
          label="Revenue collected"
          value={inrShort(data.paid)}
          note={data.due > 0 ? `${inr(data.due)} still to collect` : data.paying ? `Avg ${inr(data.paid / data.paying)} per paid plan` : "No payments yet"}
        />
        <KpiTile
          icon={Clock3}
          tint="amber"
          label="Renewals due in 7 days"
          value={data.expiringSoon}
          note={data.expiringSoon ? "Remind these brands to renew" : "No renewals due this week"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PlansCard data={data} colors={colors} />
        </div>
        <div className="lg:col-span-5">
          <StatusSourceCard data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <NewSubsCard data={data} colors={colors} />
        <RevenueCard data={data} colors={colors} />
      </div>
    </div>
  );
}
