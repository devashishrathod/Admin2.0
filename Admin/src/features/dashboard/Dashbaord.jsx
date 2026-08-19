import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  Plus,
  MoreHorizontal,
  Store,
  Users,
  Landmark,
  Tag,
  Package,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";

/* -------------------------------------------------------------------------
 * Mock data — all numbers below are hand-set dummy data that mirrors the
 * rest of the Trydood admin (vendors, plans, settlements, vouchers, deal
 * packs). KPI values and deltas are computed from this data, not typed in
 * directly, so swapping this block for a real API response keeps every
 * card, chart and progress bar correct.
 * ---------------------------------------------------------------------- */

// Revenue + transactions for the last 7 days, and the week before (for the % delta).
const WEEKLY_TREND = [
  { d: "Mon", revenue: 88200, transactions: 268 },
  { d: "Tue", revenue: 94600, transactions: 285 },
  { d: "Wed", revenue: 91300, transactions: 274 },
  { d: "Thu", revenue: 102800, transactions: 301 },
  { d: "Fri", revenue: 97900, transactions: 289 },
  { d: "Sat", revenue: 118500, transactions: 342 },
  { d: "Sun", revenue: 132400, transactions: 378 },
];
const PREVIOUS_WEEK_REVENUE = 611000;
const PREVIOUS_WEEK_TRANSACTIONS = 1840;

// Platform-wide snapshot vs. last month, used for the vendor/customer/settlement cards.
const PLATFORM_STATS = {
  totalVendors: 342,
  totalVendorsLastMonth: 318,
  activeCustomers: 2467,
  activeCustomersLastMonth: 2214,
  pendingSettlements: 6,
  pendingSettlementsYesterday: 9,
};

// Recent platform activity — one real event per line, newest first.
const ACTIVITY_FEED = [
  { id: 1, icon: Store, tint: "emerald", who: "Bloom & Co Florist", what: "upgraded to the Pro plan", when: "6m ago" },
  { id: 2, icon: Landmark, tint: "sky", who: "Spice Route Kitchen", what: "settlement of ₹20,500 was paid", when: "24m ago" },
  { id: 3, icon: Tag, tint: "amber", who: "FitZone Gym", what: "customer redeemed a ₹450 voucher", when: "1h ago" },
  { id: 4, icon: Package, tint: "pink", who: "GlowUp Cosmetics", what: "sold 3 Deal Packs", when: "2h ago" },
  { id: 5, icon: Users, tint: "sky", who: "TechHub Electronics", what: "onboarded as a new vendor", when: "3h ago" },
];

// Top brands this month, tracked against their monthly revenue goal.
const BRAND_GOALS = [
  { id: 1, name: "Spice Route Kitchen", revenue: 212000, goal: 250000 },
  { id: 2, name: "Jr Unisex Salon", revenue: 96500, goal: 120000 },
  { id: 3, name: "FitZone Gym", revenue: 90000, goal: 100000 },
];

const tints = {
  emerald: "bg-emerald-400/10 text-emerald-400",
  amber: "bg-amber-400/10 text-amber-400",
  sky: "bg-sky-400/10 text-sky-400",
  pink: "bg-pink-400/10 text-pink-400",
};

/* -------------------------------------------------------------------------
 * Derived stats — every KPI card below reads from here, not a hardcoded
 * number, so the math stays correct if the mock data above changes.
 * ---------------------------------------------------------------------- */

const pctChange = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);
const formatCurrency = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const formatCompact = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

const weekRevenue = WEEKLY_TREND.reduce((s, d) => s + d.revenue, 0);
const weekTransactions = WEEKLY_TREND.reduce((s, d) => s + d.transactions, 0);
const revenueDelta = pctChange(weekRevenue, PREVIOUS_WEEK_REVENUE);
const transactionsDelta = pctChange(weekTransactions, PREVIOUS_WEEK_TRANSACTIONS);
const vendorDelta = pctChange(PLATFORM_STATS.totalVendors, PLATFORM_STATS.totalVendorsLastMonth);
const customerDelta = pctChange(PLATFORM_STATS.activeCustomers, PLATFORM_STATS.activeCustomersLastMonth);
const settlementDelta = pctChange(PLATFORM_STATS.pendingSettlements, PLATFORM_STATS.pendingSettlementsYesterday);

function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function StatCard({ label, value, prefix = "", suffix = "", delta, positive, ringPct }) {
  const count = useCountUp(value);
  const display =
    Number.isInteger(value) && value < 1000 ? Math.round(count) : count.toFixed(1);
  const dash = 2 * Math.PI * 15;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{label}</span>
        <span
          className={`flex items-center gap-1 text-[11.5px] font-bold ${
            positive ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {delta}
        </span>
      </div>
      <div className="text-[27px] font-bold tracking-tight text-neutral-50">
        {prefix}
        {display}
        {suffix}
      </div>
      <svg className="absolute bottom-3 right-3 h-10 w-10 opacity-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="15" className="fill-none stroke-neutral-800" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r="15"
          className="fill-none stroke-emerald-400 transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: dash,
            strokeDashoffset: dash * (1 - Math.min(1, (ringPct ?? value) / 100)),
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
          }}
        />
      </svg>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-800 px-2.5 py-1.5 text-[11.5px]">
      <div className="mb-0.5 text-neutral-400">{label}</div>
      <div className="font-bold text-emerald-400">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="mx-auto max-w-[1240px] px-7 pb-16 pt-6.5">
      <div className="mb-5.5 flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight text-neutral-50">
            Good afternoon, Navnit
          </div>
          <div className="mt-1 text-[13.5px] text-neutral-400">
            Here's how Trydood is growing this week.
          </div>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-2 text-[13px] font-bold text-neutral-950 transition-transform hover:-translate-y-0.5">
          <Plus size={15} /> Add Vendor
        </button>
      </div>

      <div className="mb-4.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Active Vendors"
          value={PLATFORM_STATS.totalVendors}
          delta={`${vendorDelta >= 0 ? "+" : ""}${vendorDelta.toFixed(1)}% this month`}
          positive={vendorDelta >= 0}
          ringPct={(PLATFORM_STATS.totalVendors / 400) * 100}
        />
        <StatCard
          label="Active Customers"
          value={PLATFORM_STATS.activeCustomers}
          delta={`${customerDelta >= 0 ? "+" : ""}${customerDelta.toFixed(1)}% this month`}
          positive={customerDelta >= 0}
          ringPct={(PLATFORM_STATS.activeCustomers / 3000) * 100}
        />
        <StatCard
          label="Revenue (7 days)"
          value={weekRevenue}
          prefix="₹"
          delta={`${revenueDelta >= 0 ? "+" : ""}${revenueDelta.toFixed(1)}% vs last wk`}
          positive={revenueDelta >= 0}
          ringPct={(weekRevenue / 800000) * 100}
        />
        <StatCard
          label="Pending Settlements"
          value={PLATFORM_STATS.pendingSettlements}
          delta={`${settlementDelta >= 0 ? "+" : ""}${settlementDelta.toFixed(1)}% vs yesterday`}
          positive={settlementDelta <= 0}
          ringPct={(PLATFORM_STATS.pendingSettlements / 20) * 100}
        />
      </div>

      <div className="mb-3.5 grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
              <Sparkles size={15} className="text-emerald-400" /> Weekly Revenue
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-400">
              {formatCompact(weekRevenue)} · {weekTransactions} txns
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={WEEKLY_TREND} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#2FDE8C"
                strokeWidth={2.4}
                fill="url(#fillGreen)"
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[14.5px] font-bold text-neutral-50">Recent Activity</div>
            <MoreHorizontal size={16} className="cursor-pointer text-neutral-500" />
          </div>
          {ACTIVITY_FEED.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className="flex items-center gap-2.5 border-b border-neutral-800 py-2.5 last:border-none"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tints[a.tint]}`}>
                  <Icon size={13} />
                </span>
                <div className="text-[12.5px] leading-snug text-neutral-50">
                  <b className="font-semibold">{a.who}</b> {a.what}
                </div>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-neutral-500">
                  {a.when}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-50">
            <Target size={15} className="text-emerald-400" /> Brand Revenue Goals
          </div>
          <div className="flex cursor-pointer items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400">
            View all brands <ArrowUpRight size={12} />
          </div>
        </div>
        {BRAND_GOALS.map((b) => {
          const progress = Math.min(100, Math.round((b.revenue / b.goal) * 100));
          return (
            <div key={b.id} className="flex items-center gap-3 border-b border-neutral-800 py-2.5 last:border-none">
              <div className="w-40 shrink-0 truncate text-[13px] font-semibold text-neutral-50">{b.name}</div>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="w-9 shrink-0 text-right font-mono text-xs text-neutral-400">{progress}%</div>
              <div className="w-28 shrink-0 text-right font-mono text-[11px] text-neutral-500">
                {formatCompact(b.revenue)} / {formatCompact(b.goal)}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}