import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Store,
  Users,
  Landmark,
  Tag,
  Package,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Ticket,
  HandCoins,
  Settings,
  UserCog,
  Calendar,
  Clock3,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";
import { useBrands } from "../brand/BrandContext";
import { BrandAvatar } from "../brand/BrandShared";
import { getBrandVerifications } from "../newOnboarding/services/NewOnboardingApi";

/* -------------------------------------------------------------------------
 * Mock data — revenue/transactions/settlements/activity have no real
 * endpoint yet, so these stay hand-set (scaled to the platform's real
 * current size). Vendor counts and pending approvals below are real —
 * see useBrands() and the verifications fetch inside Dashboard().
 * ---------------------------------------------------------------------- */

const WEEKLY_TREND = [
  { d: "Mon", revenue: 2100, transactions: 4 },
  { d: "Tue", revenue: 2450, transactions: 5 },
  { d: "Wed", revenue: 1980, transactions: 3 },
  { d: "Thu", revenue: 2800, transactions: 6 },
  { d: "Fri", revenue: 2350, transactions: 5 },
  { d: "Sat", revenue: 3200, transactions: 7 },
  { d: "Sun", revenue: 3650, transactions: 8 },
];

const ACTIVITY_FEED = [
  { id: 1, icon: Store, tint: "emerald", who: "Bloom & Co Florist", what: "upgraded to the Pro plan", when: "6m ago" },
  { id: 2, icon: Landmark, tint: "sky", who: "Spice Route Kitchen", what: "settlement of ₹2,050 was paid", when: "24m ago" },
  { id: 3, icon: Tag, tint: "amber", who: "FitZone Gym", what: "customer redeemed a ₹150 voucher", when: "1h ago" },
  { id: 4, icon: Package, tint: "pink", who: "GlowUp Cosmetics", what: "sold 3 Deal Packs", when: "2h ago" },
  { id: 5, icon: Users, tint: "sky", who: "TechHub Electronics", what: "onboarded as a new vendor", when: "3h ago" },
];

const BRAND_GOALS = [
  { id: 1, name: "Spice Route Kitchen", revenue: 8200, goal: 10000 },
  { id: 2, name: "Jr Unisex Salon", revenue: 5400, goal: 7000 },
  { id: 3, name: "FitZone Gym", revenue: 3100, goal: 5000 },
];

const DONUT_COLORS = { Active: "#2FDE8C", Inactive: "#F59E0B", Rejected: "#F43F5E" };
const CATEGORY_COLORS = ["#2FDE8C", "#5EEBB0", "#8FF3CC", "#C0FAE6"];

// Real category mix — how many onboarded brands fall in each category.
function buildCategoryMix(brands) {
  const counts = new Map();
  brands.forEach((b) => {
    const name = b.category && b.category !== "—" ? b.category : "Uncategorized";
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const DATE_RANGE_OPTIONS = [
  { key: "3M", label: "Last 3 Months", months: 3 },
  { key: "6M", label: "Last 6 Months", months: 6 },
  { key: "12M", label: "Last 12 Months", months: 12 },
];

const REFRESH_OPTIONS = [
  { key: "off", label: "Off", ms: 0 },
  { key: "30m", label: "Every 30m", ms: 30 * 60 * 1000 },
  { key: "1h", label: "Every 1h", ms: 60 * 60 * 1000 },
  { key: "24h", label: "Every 24h", ms: 24 * 60 * 60 * 1000 },
];

// Vendor growth IS real — derived below from each brand's actual joinedDate.
function buildVendorGrowth(brands, monthsCount = 6) {
  const now = new Date();
  const months = Array.from({ length: monthsCount }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1);
    return { y: dt.getFullYear(), m: dt.getMonth(), label: dt.toLocaleString("en-US", { month: "short" }) };
  });
  const windowStart = new Date(months[0].y, months[0].m, 1);
  const perMonth = months.map(() => 0);
  let base = 0;

  brands.forEach((b) => {
    const jd = b.joinedDate ? new Date(b.joinedDate) : null;
    if (!jd || Number.isNaN(jd.getTime()) || jd < windowStart) {
      base += 1;
      return;
    }
    const idx = months.findIndex((mo) => mo.y === jd.getFullYear() && mo.m === jd.getMonth());
    if (idx === -1) base += 1;
    else perMonth[idx] += 1;
  });

  let running = base;
  return months.map((mo, i) => {
    running += perMonth[i];
    return { d: mo.label, vendors: running };
  });
}

const QUICK_ACTIONS = [
  { label: "Brands", icon: Store, tint: "emerald", path: "/brand" },
  { label: "New Onboarding", icon: UserCog, tint: "amber", path: "/new-onboarding" },
  { label: "Vouchers", icon: Ticket, tint: "sky", path: "/vendor-listing" },
  { label: "Settlements", icon: HandCoins, tint: "violet", path: "/settlements" },
  { label: "Customers", icon: Users, tint: "pink", path: "/customer" },
  { label: "Banners", icon: ImageIcon, tint: "sky", path: "/banner" },
  { label: "Settings", icon: Settings, tint: "neutral", path: "/settings" },
];

// Every dashboard card shares this — soft shadow, no border, matching the
// borderless reference design.
const cardClass = "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

const tints = {
  emerald: "bg-emerald-400/10 text-emerald-500 dark:text-emerald-400",
  amber: "bg-amber-400/10 text-amber-500 dark:text-amber-400",
  sky: "bg-sky-400/10 text-sky-500 dark:text-sky-400",
  pink: "bg-pink-400/10 text-pink-500 dark:text-pink-400",
  violet: "bg-violet-400/10 text-violet-500 dark:text-violet-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

// Same lifecycle rule used by the New Onboarding page — kept local since
// this widget only needs the status, not the full mapped verification shape.
function derivePendingStatus(raw) {
  if (raw.isRevoked || raw.isRejected || raw.isAdminApproved) return raw.status || null;
  return raw.status || "PENDING";
}
const PENDING_STATUSES = new Set(["MANUAL_REVIEW", "PENDING"]);

/* -------------------------------------------------------------------------
 * Derived stats — every KPI card below reads from here, not a hardcoded
 * number, so the math stays correct if the mock data above changes.
 * ---------------------------------------------------------------------- */

const formatCompact = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}K` : `₹${n}`;

const weekRevenue = WEEKLY_TREND.reduce((s, d) => s + d.revenue, 0);

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

// KPI card with an optional tiny sparkline — matching the reference's
// "Total Revenue"/"New Order" cards, kept in our emerald palette.
function KpiCard({ icon: Icon, label, value, tint = "emerald", trend, dataKey }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon size={15} />
      </span>
      <p className="mt-3 truncate text-[20px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className="truncate text-[11px] text-neutral-500">{label}</p>
      <div className="mt-2 h-9">
        {trend && trend.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="natural"
                dataKey={dataKey}
                stroke="#2FDE8C"
                strokeWidth={1.6}
                fill={`url(#spark-${dataKey})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full" />
        )}
      </div>
    </div>
  );
}

function HealthRing({ label, pct, tint = "emerald" }) {
  const dash = 2 * Math.PI * 26;
  const ringColor = {
    emerald: "stroke-emerald-400",
    amber: "stroke-amber-400",
    sky: "stroke-sky-400",
    violet: "stroke-violet-400",
  }[tint];
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" className="fill-none stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="5" />
          <circle
            cx="32"
            cy="32"
            r="26"
            className={`fill-none transition-[stroke-dashoffset] duration-1000 ease-out ${ringColor}`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - clamped / 100)}
          />
        </svg>
        <span className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50">{Math.round(clamped)}%</span>
      </div>
      <span className="text-center text-[11px] font-medium text-neutral-500">{label}</span>
    </div>
  );
}

function MetricTooltip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] shadow-md dark:bg-neutral-800">
      <div className="mb-0.5 text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="font-bold" style={{ color: p.color }}>
        {p.value}
        {suffix}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { brands } = useBrands();
  const totalVendors = brands.length;
  const activeVendors = brands.filter((b) => b.active).length;

  // Real pending-approval count/list — GET /brands/admin/verifications,
  // same lifecycle rule the New Onboarding page uses.
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [refreshSpinning, setRefreshSpinning] = useState(false);

  const fetchPending = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setPendingLoading(true);
    try {
      const res = await getBrandVerifications({ page: 1, limit: 20 });
      const rows = res?.data?.data ?? [];
      const stillPending = rows.filter((r) => PENDING_STATUSES.has(derivePendingStatus(r)));
      setPending(stillPending);
    } catch {
      setPending([]);
    } finally {
      if (!silent) setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Date range — controls how many months the Vendor Growth chart shows.
  const [dateRangeKey, setDateRangeKey] = useState("6M");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const dateRange = DATE_RANGE_OPTIONS.find((o) => o.key === dateRangeKey) || DATE_RANGE_OPTIONS[1];

  // Auto-refresh — periodically re-pulls pending approvals in the background.
  const [refreshKey, setRefreshKey] = useState("off");
  const [refreshMenuOpen, setRefreshMenuOpen] = useState(false);
  const refreshOption = REFRESH_OPTIONS.find((o) => o.key === refreshKey) || REFRESH_OPTIONS[0];

  useEffect(() => {
    if (!refreshOption.ms) return;
    const id = setInterval(() => fetchPending({ silent: true }), refreshOption.ms);
    return () => clearInterval(id);
  }, [refreshOption.ms, fetchPending]);

  const handleManualRefresh = async () => {
    setRefreshSpinning(true);
    await fetchPending({ silent: true });
    setTimeout(() => setRefreshSpinning(false), 500);
  };

  const vendorGrowth = useMemo(() => buildVendorGrowth(brands, dateRange.months), [brands, dateRange.months]);
  const categoryMix = useMemo(() => buildCategoryMix(brands), [brands]);

  const avgGoalProgress =
    BRAND_GOALS.reduce((s, b) => s + Math.min(100, (b.revenue / b.goal) * 100), 0) / BRAND_GOALS.length;
  const activeRatio = totalVendors ? (activeVendors / totalVendors) * 100 : 0;
  const revenueGoalPct = (weekRevenue / 25000) * 100;
  const clearancePct = 100 - Math.min(100, (pending.length / 10) * 100);
  const animatedActiveVendors = useCountUp(activeVendors);

  const rejectedVendors = brands.filter((b) => b.status === "Rejected").length;
  const inactiveVendors = Math.max(0, totalVendors - activeVendors - rejectedVendors);
  const donutData = [
    { name: "Active", value: activeVendors },
    { name: "Inactive", value: inactiveVendors },
    { name: "Rejected", value: rejectedVendors },
  ].filter((d) => d.value > 0);

  const peakEntry = vendorGrowth.reduce(
    (best, cur) => (cur.vendors > (best?.vendors ?? -1) ? cur : best),
    null
  );
  const peakVendors = peakEntry?.vendors ?? totalVendors;
  const peakMonth = peakEntry?.d ?? "—";

  return (
    <main className="mx-auto max-w-[1240px] px-7 pb-16 pt-6.5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Good afternoon, Navnit
          </div>
          <div className="mt-1 text-[13.5px] text-neutral-500 dark:text-neutral-400">
            Here's how Trydood is growing this week.
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Date range — controls the Vendor Growth chart's window */}
          <div className="relative">
            <button
              onClick={() => {
                setDateMenuOpen((o) => !o);
                setRefreshMenuOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <Calendar size={13} />
              {dateRange.label}
              <ChevronDown size={12} className={`transition-transform ${dateMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {dateMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
                {DATE_RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => {
                      setDateRangeKey(o.key);
                      setDateMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3.5 py-2 text-left text-[12.5px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      o.key === dateRangeKey ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-refresh — periodically re-pulls pending approvals */}
          <div className="relative">
            <button
              onClick={() => {
                setRefreshMenuOpen((o) => !o);
                setDateMenuOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <Clock3 size={13} />
              {refreshOption.key === "off" ? "Auto-refresh" : refreshOption.label}
              <ChevronDown size={12} className={`transition-transform ${refreshMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {refreshMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
                {REFRESH_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => {
                      setRefreshKey(o.key);
                      setRefreshMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3.5 py-2 text-left text-[12.5px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      o.key === refreshKey ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual refresh */}
          <button
            onClick={handleManualRefresh}
            aria-label="Refresh now"
            title="Refresh now"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
          >
            <RefreshCw size={14} className={refreshSpinning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Revenue / Active Vendors KPI cards + Brand composition donut */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-[0.7fr_0.7fr_1fr]">
        <KpiCard
          icon={Landmark}
          label="Since last week"
          value={formatCompact(weekRevenue)}
          tint="sky"
          trend={WEEKLY_TREND}
          dataKey="revenue"
        />
        <KpiCard
          icon={Store}
          label="Since last month"
          value={Math.round(animatedActiveVendors)}
          tint="emerald"
          trend={vendorGrowth}
          dataKey="vendors"
        />

        <div className={cardClass}>
          <div className="mb-1 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">Brands</div>
          <div className="flex items-center gap-3">
            <div className="relative h-[130px] w-[130px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={3} isAnimationActive={false}>
                    {donutData.map((d) => (
                      <Cell key={d.name} fill={DONUT_COLORS[d.name]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[18px] font-bold text-neutral-900 dark:text-neutral-50">{totalVendors}+</span>
                <span className="text-[9.5px] text-neutral-500">Total Brands</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[d.name] }} />
                  <span className="min-w-0 flex-1 truncate text-neutral-500">{d.name}</span>
                  <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-50">
                    {totalVendors ? Math.round((d.value / totalVendors) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Growth (big chart, natural curve) + Top Brands + Category mix */}
      <div className="mb-3.5 grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div className={cardClass}>
          <div className="mb-0.5 flex items-center justify-between">
            <div className="text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Vendor Growth</div>
            <span className="rounded-full bg-[#f4f7fb] px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
              Last 6 Months
            </span>
          </div>
          <p className="mb-2 text-[11.5px] text-neutral-500">
            Peak so far: <span className="font-semibold text-neutral-800 dark:text-neutral-200">{peakVendors} vendors</span> in {peakMonth}
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={vendorGrowth} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVendors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<MetricTooltip label="Vendors" />} />
              <Area
                type="natural"
                dataKey="vendors"
                stroke="#2FDE8C"
                strokeWidth={2.6}
                fill="url(#fillVendors)"
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Brands — same real revenue-goal data, styled as a location/leaderboard list */}
        <div className={cardClass}>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Top Brands</div>
            <button
              onClick={() => navigate("/brand")}
              className="text-[11px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              View all
            </button>
          </div>
          <div className="space-y-3.5">
            {BRAND_GOALS.map((b) => {
              const progress = Math.min(100, Math.round((b.revenue / b.goal) * 100));
              return (
                <div key={b.id} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                    {b.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      <span className="shrink-0 pl-2 font-semibold text-neutral-900 dark:text-neutral-50">{progress}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category mix — real, from each onboarded brand's category */}
        <div className={cardClass}>
          <div className="mb-3.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Category Mix</div>
          {categoryMix.length ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={categoryMix} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <Tooltip content={<MetricTooltip label="Brands" />} />
                <Bar dataKey="count" name="Brands" radius={[0, 6, 6, 0]} barSize={14}>
                  {categoryMix.map((c, i) => (
                    <Cell key={c.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[190px] items-center justify-center text-[12.5px] text-neutral-500">No category data yet.</div>
          )}
        </div>
      </div>

      {/* Needs Your Review — real pending onboarding approvals */}
      <div className={`mb-3.5 ${cardClass}`}>
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">
            <ShieldCheck size={15} className="text-amber-500 dark:text-amber-400" /> Needs Your Review
          </div>
          <button
            onClick={() => navigate("/new-onboarding")}
            className="flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
          >
            View all <ArrowUpRight size={12} />
          </button>
        </div>

        {pendingLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-neutral-500">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : pending.length ? (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {pending.slice(0, 4).map((v) => (
              <button
                key={v._id}
                onClick={() => navigate("/new-onboarding")}
                className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-2 text-left transition-colors hover:bg-[#f4f7fb] dark:hover:bg-neutral-800/60"
              >
                <BrandAvatar brand={{ brandName: v.brand?.brandName, logo: v.brand?.logo }} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-50">
                    {v.brand?.brandName || "Untitled Brand"}
                  </p>
                  <p className="text-[11px] text-neutral-500">Attempt #{v.attemptNumber} · Score {v.score}/100</p>
                </div>
                <ArrowRight size={13} className="shrink-0 text-neutral-400" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400" />
            <p className="text-[12.5px] text-neutral-500">All caught up — nothing pending review.</p>
          </div>
        )}
      </div>

      {/* Brands (Popular Products-style table) + Recent Activity (Orders-style list) */}
      <div className="mb-3.5 grid grid-cols-1 items-stretch gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <div className={cardClass}>
          <div className="mb-3.5 flex items-center justify-between">
            <div className="text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Brands</div>
            <button
              onClick={() => navigate("/brand")}
              className="text-[11px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  <th className="pb-2 font-medium">Brand</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Followers</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {brands.slice(0, 6).map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate("/brand")}
                    className="cursor-pointer transition-colors hover:bg-[#f4f7fb] dark:hover:bg-neutral-800/40"
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <BrandAvatar brand={b} size="sm" />
                        <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{b.brandName}</span>
                      </div>
                    </td>
                    <td className="py-2 text-neutral-500">{b.category}</td>
                    <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">{b.followers}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          b.active
                            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!brands.length && (
              <p className="py-8 text-center text-[12.5px] text-neutral-500">No brands yet.</p>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-3.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Recent Activity</div>
          {ACTIVITY_FEED.map((a) => {
            const Icon = a.icon;
            const amountMatch = a.what.match(/₹[\d,]+/);
            return (
              <div key={a.id} className="flex items-center gap-2.5 py-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tints[a.tint]}`}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{a.who}</p>
                  <p className="truncate text-[11px] text-neutral-500">{a.what}</p>
                </div>
                <span
                  className={`shrink-0 font-mono text-[11px] font-semibold ${
                    amountMatch ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"
                  }`}
                >
                  {amountMatch ? `+${amountMatch[0]}` : a.when}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Health rings */}
      <div className="mb-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HealthRing label="Vendor Activity" pct={activeRatio} tint="emerald" />
        <HealthRing label="Approval Clearance" pct={clearancePct} tint="amber" />
        <HealthRing label="Revenue Goal" pct={revenueGoalPct} tint="sky" />
        <HealthRing label="Brand Targets" pct={avgGoalProgress} tint="violet" />
      </div>

      {/* Quick Actions */}
      <div className={cardClass}>
        <div className="mb-3.5 text-[14.5px] font-bold text-neutral-900 dark:text-neutral-50">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 rounded-xl bg-[#f4f7fb] px-3 py-4 text-center transition-colors hover:bg-[#e8eef7] dark:bg-neutral-800/40 dark:hover:bg-neutral-800/60"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tints[a.tint]}`}>
                  <Icon size={16} />
                </span>
                <span className="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
