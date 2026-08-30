import React, { useMemo, useState } from "react";
import {
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  UserMinus,
  Download,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

/* -------------------------------------------------------------------------
 * Mock data — mirrors the Prime Lite / Pluse / Elite customer plans.
 * Swap these for real API data; the shapes are documented inline.
 * ---------------------------------------------------------------------- */

const PLAN_COLORS = {
  "Prime Lite": "#5eead4", // teal
  "Prime Pluse": "#34d399", // emerald (flagship)
  "Prime Elite": "#a3e635", // lime
};

const RANGE_OPTIONS = ["7D", "30D", "90D", "12M"];

// Revenue + subscriber trend, monthly.
const TREND_DATA = [
  { month: "Feb", "Prime Lite": 8200, "Prime Pluse": 21400, "Prime Elite": 18800, subscribers: 612 },
  { month: "Mar", "Prime Lite": 8850, "Prime Pluse": 24200, "Prime Elite": 20680, subscribers: 655 },
  { month: "Apr", "Prime Lite": 9300, "Prime Pluse": 27900, "Prime Elite": 22560, subscribers: 701 },
  { month: "May", "Prime Lite": 9765, "Prime Pluse": 30690, "Prime Elite": 26320, subscribers: 748 },
  { month: "Jun", "Prime Lite": 10230, "Prime Pluse": 33480, "Prime Elite": 30080, subscribers: 812 },
  { month: "Jul", "Prime Lite": 11160, "Prime Pluse": 37200, "Prime Elite": 35720, subscribers: 879 },
];

const PLAN_PERFORMANCE = [
  {
    name: "Prime Lite",
    price: 465,
    subscribers: 240,
    newThisMonth: 34,
    churned: 9,
    revenue: 111600,
    growth: 8.2,
  },
  {
    name: "Prime Pluse",
    price: 930,
    subscribers: 400,
    newThisMonth: 61,
    churned: 12,
    revenue: 372000,
    growth: 14.6,
  },
  {
    name: "Prime Elite",
    price: 1880,
    subscribers: 190,
    newThisMonth: 47,
    churned: 4,
    revenue: 357200,
    growth: 21.3,
  },
];

const DISTRIBUTION_DATA = PLAN_PERFORMANCE.map((p) => ({
  name: p.name,
  value: p.subscribers,
}));

const totalSubscribers = PLAN_PERFORMANCE.reduce((sum, p) => sum + p.subscribers, 0);
const totalRevenue = PLAN_PERFORMANCE.reduce((sum, p) => sum + p.revenue, 0);
const totalChurned = PLAN_PERFORMANCE.reduce((sum, p) => sum + p.churned, 0);
const avgRevenuePerUser = Math.round(totalRevenue / totalSubscribers);
const churnRate = ((totalChurned / totalSubscribers) * 100).toFixed(1);

const fmtINR = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function KpiCard({ icon: Icon, label, value, delta, deltaGood = true }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
          <Icon size={16} />
        </span>
        {delta != null && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              deltaGood
                ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
          >
            {deltaGood ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-4 text-[22px] font-bold text-neutral-900 dark:text-neutral-50">{value}</div>
      <div className="mt-0.5 text-[12px] text-neutral-500">{label}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4">
        <h3 className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  background: "#171717",
  border: "1px solid #262626",
  borderRadius: 10,
  fontSize: 12.5,
  color: "#e5e5e5",
};

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function CustomerPlanAnalytics() {
  const [range, setRange] = useState("30D");

  const sortedByRevenue = useMemo(
    () => [...PLAN_PERFORMANCE].sort((a, b) => b.revenue - a.revenue),
    []
  );

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Customer Plan Analytics
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Subscriber growth, revenue, and churn across Prime Lite, Prime Pluse & Prime Elite.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRange(opt)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    range === opt
                      ? "bg-emerald-400 text-neutral-950"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Total Subscribers"
            value={totalSubscribers.toLocaleString("en-IN")}
            delta="+9.4%"
            deltaGood
          />
          <KpiCard
            icon={IndianRupee}
            label="Monthly Revenue"
            value={fmtINR(totalRevenue)}
            delta="+15.1%"
            deltaGood
          />
          <KpiCard
            icon={TrendingUp}
            label="Avg. Revenue Per User"
            value={fmtINR(avgRevenuePerUser)}
            delta="+4.8%"
            deltaGood
          />
          <KpiCard
            icon={UserMinus}
            label="Churn Rate"
            value={`${churnRate}%`}
            delta="-1.2%"
            deltaGood
          />
        </div>

        {/* Charts row 1 */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <ChartCard
              title="Revenue By Plan"
              subtitle="Monthly revenue split across all three plans"
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={TREND_DATA}>
                  <defs>
                    {Object.entries(PLAN_COLORS).map(([name, color]) => (
                      <linearGradient key={name} id={`fill-${name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                  <YAxis stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtINR(v)} />
                  {Object.entries(PLAN_COLORS).map(([name, color]) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stackId="1"
                      stroke={color}
                      fill={`url(#fill-${name})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center justify-center gap-5">
                {Object.entries(PLAN_COLORS).map(([name, color]) => (
                  <span key={name} className="flex items-center gap-1.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {name}
                  </span>
                ))}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Subscriber Mix" subtitle="Share of active subscribers by plan">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={DISTRIBUTION_DATA}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {DISTRIBUTION_DATA.map((entry) => (
                    <Cell key={entry.name} fill={PLAN_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {DISTRIBUTION_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PLAN_COLORS[d.name] }}
                    />
                    {d.name}
                  </span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {((d.value / totalSubscribers) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <ChartCard title="New vs Churned" subtitle="Subscriber movement this month, by plan">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={PLAN_PERFORMANCE} barGap={6}>
                  <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                  <YAxis stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11.5, color: "#a3a3a3" }} />
                  <Bar dataKey="newThisMonth" name="New" fill="#34d399" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="churned" name="Churned" fill="#f87171" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Total Active Subscribers" subtitle="Across all plans, last 6 months">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="fill-subs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#262626" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                <YAxis stroke="#737373" fontSize={11.5} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#34d399"
                  fill="url(#fill-subs)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Plan performance table */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <h3 className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">Plan Performance</h3>
            <button className="flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              Sorted by revenue
              <ChevronDown size={13} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900/60">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Plan
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Price
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Subscribers
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    New
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Churned
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Revenue
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedByRevenue.map((plan, i) => (
                  <tr
                    key={plan.name}
                    className={i % 2 === 0 ? "bg-white dark:bg-neutral-950" : "bg-neutral-50 dark:bg-neutral-900/40"}
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: PLAN_COLORS[plan.name] }}
                        />
                        {plan.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-500 dark:text-neutral-400">
                      {fmtINR(plan.price)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-800 dark:text-neutral-200">
                      {plan.subscribers.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400">
                      +{plan.newThisMonth}
                    </td>
                    <td className="px-5 py-3.5 text-right text-red-600 dark:text-red-400">
                      -{plan.churned}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-neutral-800 dark:text-neutral-100">
                      {fmtINR(plan.revenue)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <TrendingUp size={11} />
                        {plan.growth}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}