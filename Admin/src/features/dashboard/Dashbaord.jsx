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
  TrendingUp,
  Activity,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useBrands } from "../brand/BrandContext";
import { BrandAvatar } from "../brand/BrandShared";
import { getTopBrands } from "../brand/services/BrandApi";
import { mapBrandListItem } from "../brand/brandMapper";
import { getBrandVerifications } from "../newOnboarding/services/NewOnboardingApi";
import { useAuthStore } from "../auth/store/authStore";

/* -------------------------------------------------------------------------
 * Mock data — revenue/transactions/activity have no real endpoint yet, so
 * these stay hand-set and every widget using them carries a "Sample" tag.
 * Vendor counts, pending approvals, top brands and category mix are real —
 * see useBrands() and the fetches inside Dashboard().
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

// BrandContext only holds approved brands, so the composition is
// Active / Deactive / Expired (see deriveBrandStatus in brandMapper).
const STATUS_SLICES = [
  { key: "Active", label: "Active", color: "#2FDE8C" },
  { key: "Deactive", label: "Inactive", color: "#A3A3A3" },
  { key: "Expired", label: "Expired", color: "#F87171" },
];

const STATUS_PILLS = {
  Active: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  Deactive: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  Expired: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const CATEGORY_BAR_COLORS = ["#2FDE8C", "#38BDF8", "#A78BFA", "#F59E0B", "#F472B6"];

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

const rangeStart = (monthsCount) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
};

// Vendor growth IS real — derived below from each brand's actual joinedDate.
function buildVendorGrowth(brands, monthsCount = 6) {
  const now = new Date();
  const months = Array.from({ length: monthsCount }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1 - i), 1);
    return { y: dt.getFullYear(), m: dt.getMonth(), label: dt.toLocaleString("en-US", { month: "short" }) };
  });
  const windowStart = rangeStart(monthsCount);
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
    return { d: mo.label, vendors: running, added: perMonth[i] };
  });
}

const QUICK_ACTIONS = [
  { label: "Brands", icon: Store, tint: "emerald", path: "/brand" },
  { label: "Onboarding", icon: UserCog, tint: "amber", path: "/new-onboarding" },
  { label: "Vouchers", icon: Ticket, tint: "sky", path: "/vendor-listing" },
  { label: "Settlements", icon: HandCoins, tint: "violet", path: "/settlements" },
  { label: "Customers", icon: Users, tint: "pink", path: "/customer" },
  { label: "Banners", icon: ImageIcon, tint: "sky", path: "/banner" },
  { label: "Settings", icon: Settings, tint: "neutral", path: "/settings" },
];

// Every dashboard card shares this — soft shadow, no border, same as the
// Brand page cards.
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

const formatCompact = (n) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

const weekRevenue = WEEKLY_TREND.reduce((s, d) => s + d.revenue, 0);
const weekTransactions = WEEKLY_TREND.reduce((s, d) => s + d.transactions, 0);

const greetingFor = (date) => {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

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

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */
function SampleTag() {
  return (
    <span
      title="No live endpoint yet — showing sample data"
      className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
    >
      Sample
    </span>
  );
}

function CardHeader({ icon: Icon, iconClass = "text-emerald-500", title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
          {Icon && <Icon size={15} className={iconClass} />}
          {title}
        </div>
        {subtitle && <p className="mt-0.5 text-[11.5px] text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function ViewAllButton({ onClick, label = "View all" }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
    >
      {label} <ArrowUpRight size={12} />
    </button>
  );
}

function Sparkline({ data, dataKey, id, color = "#2FDE8C" }) {
  if (!data || data.length < 2) return <div className="h-full" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="natural" dataKey={dataKey} stroke={color} strokeWidth={1.8} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// KPI card. `highlight` renders the emerald hero variant used for the
// first card in the row.
function StatCard({ icon: Icon, label, value, sub, tint = "emerald", highlight = false, sample = false, onClick, children }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-2xl p-4 text-left transition-all ${
        highlight
          ? "bg-gradient-to-br from-emerald-500 to-emerald-400 text-neutral-950 shadow-lg shadow-emerald-500/20"
          : "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
      } ${onClick ? "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10" : ""}`}
    >
      {highlight && <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />}
      <div className="relative flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            highlight ? "bg-neutral-950/10 text-neutral-950" : tints[tint]
          }`}
        >
          <Icon size={16} />
        </span>
        {sample ? <SampleTag /> : onClick && <ArrowUpRight size={14} className="text-neutral-400 transition-colors group-hover:text-emerald-500" />}
      </div>
      <p className={`relative mt-3 text-[11.5px] font-medium ${highlight ? "text-neutral-900/70" : "text-neutral-500"}`}>{label}</p>
      <p className={`relative truncate text-[24px] font-bold leading-tight tracking-tight ${highlight ? "" : "text-neutral-900 dark:text-neutral-50"}`}>
        {value}
      </p>
      {sub && <p className={`relative mt-0.5 truncate text-[11px] ${highlight ? "text-neutral-900/70" : "text-neutral-500"}`}>{sub}</p>}
      {children && <div className="relative mt-3">{children}</div>}
    </Wrapper>
  );
}

function HealthRing({ label, pct, tint = "emerald", sample = false }) {
  const dash = 2 * Math.PI * 26;
  const ringColor = {
    emerald: "stroke-emerald-400",
    amber: "stroke-amber-400",
    sky: "stroke-sky-400",
    violet: "stroke-violet-400",
  }[tint];
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 px-3 py-4 dark:bg-neutral-950/60">
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
      {sample && <SampleTag />}
    </div>
  );
}

function MetricTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[11.5px] shadow-lg shadow-black/10 dark:bg-neutral-800">
      <div className="mb-0.5 text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="font-bold text-neutral-900 dark:text-neutral-50">
        {p.value} {unit}
      </div>
      {p.payload?.added != null && (
        <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400">+{p.payload.added} joined</div>
      )}
    </div>
  );
}

function Dropdown({ open, onToggle, onClose, icon: Icon, label, options, selectedKey, onSelect }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
      >
        <Icon size={14} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
            {options.map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  onSelect(o.key);
                  onClose();
                }}
                className={`flex w-full items-center px-3.5 py-2 text-left text-[12.5px] transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  o.key === selectedKey ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon = LayoutGrid, text, className = "py-10" }) {
  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
        <Icon size={16} />
      </span>
      <p className="text-[12px] text-neutral-500">{text}</p>
    </div>
  );
}

function LoadingState({ className = "py-10" }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-[12.5px] text-neutral-500 ${className}`}>
      <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.name || "Navnit";
  const { brands, loading: brandsLoading } = useBrands();
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

  // Real curated "Top Brands" — GET /brands/admin/top-brands, the same
  // list an admin builds via the Brand page's "Set as Top Brand" action
  // (updateTopBrand). Mapped through the same brandMapper the rest of the
  // app uses so the shape (followers, logo, brandName...) stays consistent.
  const [topBrands, setTopBrands] = useState([]);
  const [topBrandsLoading, setTopBrandsLoading] = useState(true);

  const fetchTopBrands = React.useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTopBrandsLoading(true);
    try {
      const res = await getTopBrands({ limit: 5 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(mapBrandListItem);
      setTopBrands(rows);
    } catch {
      setTopBrands([]);
    } finally {
      if (!silent) setTopBrandsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopBrands();
  }, [fetchTopBrands]);

  // Date range — controls how many months the Vendor Growth chart shows.
  const [dateRangeKey, setDateRangeKey] = useState("6M");
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
    await Promise.all([fetchPending({ silent: true }), fetchTopBrands({ silent: true })]);
    setTimeout(() => setRefreshSpinning(false), 500);
  };

  const vendorGrowth = useMemo(() => buildVendorGrowth(brands, dateRange.months), [brands, dateRange.months]);
  const categoryMix = useMemo(() => buildCategoryMix(brands), [brands]);
  const newInRange = vendorGrowth.reduce((s, m) => s + m.added, 0);

  const recentBrands = useMemo(
    () =>
      [...brands]
        .sort((a, b) => new Date(b.joinedDate || 0).getTime() - new Date(a.joinedDate || 0).getTime())
        .slice(0, 6),
    [brands]
  );

  // "Brand Targets" ring — no real revenue-goal source exists (this
  // dashboard has never had a revenue endpoint), so it's driven by the
  // same real Top Brands list, scored on followers relative to the
  // strongest of the group rather than an invented target number.
  const maxTopFollowers = Math.max(1, ...topBrands.map((b) => b.followers || 0));
  const avgGoalProgress = topBrands.length
    ? topBrands.reduce((s, b) => s + Math.min(100, ((b.followers || 0) / maxTopFollowers) * 100), 0) / topBrands.length
    : 0;
  const activeRatio = totalVendors ? (activeVendors / totalVendors) * 100 : 0;
  const revenueGoalPct = (weekRevenue / 25000) * 100;
  const clearancePct = 100 - Math.min(100, (pending.length / 10) * 100);
  const animatedTotal = useCountUp(totalVendors);
  const animatedActive = useCountUp(activeVendors);

  const statusData = STATUS_SLICES.map((s) => ({
    ...s,
    value: brands.filter((b) => b.status === s.key).length,
  }));
  const donutData = statusData.filter((d) => d.value > 0);
  const maxCategory = Math.max(1, ...categoryMix.map((c) => c.count));

  const now = new Date();
  const todayLabel = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-neutral-500">
            <Calendar size={12} /> {todayLabel}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">
            {greetingFor(now)}, {displayName} 👋
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">Here's how Trydood is growing today.</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Dropdown
            open={refreshMenuOpen}
            onToggle={() => setRefreshMenuOpen((o) => !o)}
            onClose={() => setRefreshMenuOpen(false)}
            icon={Clock3}
            label={refreshOption.key === "off" ? "Auto-refresh" : refreshOption.label}
            options={REFRESH_OPTIONS}
            selectedKey={refreshKey}
            onSelect={setRefreshKey}
          />
          <button
            onClick={handleManualRefresh}
            aria-label="Refresh now"
            title="Refresh now"
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <RefreshCw size={14} className={refreshSpinning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          highlight
          icon={Store}
          label="Total Brands"
          value={brandsLoading ? "…" : Math.round(animatedTotal)}
          sub={`+${newInRange} joined in the ${dateRange.label.toLowerCase()}`}
          onClick={() => navigate("/brand")}
        >
          <div className="h-10">
            <Sparkline data={vendorGrowth} dataKey="vendors" id="spark-total" color="#0a0a0a" />
          </div>
        </StatCard>

        <StatCard
          icon={Activity}
          label="Active Brands"
          value={brandsLoading ? "…" : Math.round(animatedActive)}
          sub={`${Math.round(activeRatio)}% of all brands are live`}
          tint="emerald"
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-1000"
              style={{ width: `${activeRatio}%` }}
            />
          </div>
        </StatCard>

        <StatCard
          icon={ShieldCheck}
          label="Pending Reviews"
          value={pendingLoading ? "…" : pending.length}
          sub={pending.length ? "Brands waiting for approval" : "All caught up"}
          tint="amber"
          onClick={() => navigate("/new-onboarding")}
        >
          <div className="flex -space-x-2">
            {pending.slice(0, 5).map((v) => (
              <div key={v._id} className="rounded-lg ring-2 ring-white dark:ring-neutral-900">
                <BrandAvatar brand={{ brandName: v.brand?.brandName, logo: v.brand?.logo }} size="sm" />
              </div>
            ))}
            {pending.length > 5 && (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-[11px] font-semibold text-neutral-500 ring-2 ring-white dark:bg-neutral-800 dark:ring-neutral-900">
                +{pending.length - 5}
              </span>
            )}
          </div>
        </StatCard>

        <StatCard
          icon={Landmark}
          label="Revenue this week"
          value={formatCompact(weekRevenue)}
          sub={`${weekTransactions} transactions`}
          tint="sky"
          sample
        >
          <div className="h-10">
            <Sparkline data={WEEKLY_TREND} dataKey="revenue" id="spark-revenue" color="#38BDF8" />
          </div>
        </StatCard>
      </div>

      {/* Vendor Growth + Brand status */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`lg:col-span-2 ${cardClass}`}>
          <CardHeader
            icon={TrendingUp}
            title="Vendor Growth"
            subtitle={`${totalVendors} approved brands · +${newInRange} in the ${dateRange.label.toLowerCase()}`}
            action={
              <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
                {DATE_RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setDateRangeKey(o.key)}
                    className={`rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                      o.key === dateRangeKey
                        ? "bg-emerald-400 text-neutral-950"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {o.key}
                  </button>
                ))}
              </div>
            }
          />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={vendorGrowth} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVendors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FDE8C" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2FDE8C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#8C9A91" strokeOpacity={0.18} />
              <XAxis dataKey="d" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<MetricTooltip unit="brands" />} cursor={{ stroke: "#2FDE8C", strokeOpacity: 0.4 }} />
              <Area
                type="natural"
                dataKey="vendors"
                stroke="#2FDE8C"
                strokeWidth={2.6}
                fill="url(#fillVendors)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={cardClass}>
          <CardHeader icon={LayoutGrid} title="Brand Status" subtitle="Approved brands by current state" />
          <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData.length ? donutData : [{ key: "none", value: 1, color: "#E5E5E5" }]}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={80}
                  paddingAngle={donutData.length > 1 ? 3 : 0}
                  cornerRadius={6}
                  isAnimationActive={false}
                >
                  {(donutData.length ? donutData : [{ key: "none", color: "#E5E5E5" }]).map((d) => (
                    <Cell key={d.key} fill={d.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50">{totalVendors}</span>
              <span className="text-[10.5px] text-neutral-500">Total Brands</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {statusData.map((d) => (
              <div key={d.key} className="rounded-xl bg-neutral-50 px-2.5 py-2 text-center dark:bg-neutral-950/60">
                <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-neutral-500">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.label}
                </div>
                <p className="mt-0.5 text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{d.value}</p>
                <p className="text-[10px] text-neutral-400">
                  {totalVendors ? Math.round((d.value / totalVendors) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Needs Review + Top Brands + Category mix */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Needs Your Review — real pending onboarding approvals */}
        <div className={cardClass}>
          <CardHeader
            icon={ShieldCheck}
            iconClass="text-amber-500 dark:text-amber-400"
            title="Needs Your Review"
            subtitle={pending.length ? `${pending.length} brand${pending.length === 1 ? "" : "s"} awaiting approval` : "Onboarding queue"}
            action={<ViewAllButton onClick={() => navigate("/new-onboarding")} />}
          />
          {pendingLoading ? (
            <LoadingState />
          ) : pending.length ? (
            <div className="space-y-1">
              {pending.slice(0, 5).map((v) => {
                const score = Number(v.score) || 0;
                const scoreClass =
                  score >= 70
                    ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : score >= 40
                    ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400";
                return (
                  <button
                    key={v._id}
                    onClick={() => navigate("/new-onboarding")}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <BrandAvatar brand={{ brandName: v.brand?.brandName, logo: v.brand?.logo }} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                        {v.brand?.brandName || "Untitled Brand"}
                      </p>
                      <p className="text-[11px] text-neutral-500">Attempt #{v.attemptNumber}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${scoreClass}`}>
                      {score}/100
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-neutral-300 transition-colors group-hover:text-emerald-500" />
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={CheckCircle2} text="All caught up — nothing pending review." />
          )}
        </div>

        {/* Top Brands — real curated list, GET /brands/admin/top-brands.
            Progress bar shows each brand's followers relative to the
            strongest brand in the list (no revenue endpoint exists to
            drive a real revenue-goal bar). */}
        <div className={cardClass}>
          <CardHeader
            icon={Sparkles}
            iconClass="text-amber-500 dark:text-amber-400"
            title="Top Brands"
            subtitle="Ranked by followers"
            action={<ViewAllButton onClick={() => navigate("/brand")} />}
          />
          {topBrandsLoading ? (
            <LoadingState />
          ) : topBrands.length ? (
            <div className="space-y-3">
              {topBrands.map((b, i) => {
                const progress = Math.min(100, Math.round(((b.followers || 0) / maxTopFollowers) * 100));
                return (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/brands/${b.id}`)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                        i === 0 ? "bg-amber-400/90 text-neutral-950" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <BrandAvatar brand={b} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-semibold text-neutral-800 dark:text-neutral-200">{b.brandName}</span>
                        <span className="shrink-0 pl-2 text-[11px] font-semibold text-neutral-500">
                          {b.followers} <span className="font-normal">followers</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-1000"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Sparkles} text="No brands marked as Top Brand yet." />
          )}
        </div>

        {/* Category mix — real, from each onboarded brand's category */}
        <div className={cardClass}>
          <CardHeader icon={Tag} title="Category Mix" subtitle="Top categories by brand count" />
          {categoryMix.length ? (
            <div className="space-y-3.5">
              {categoryMix.map((c, i) => {
                const color = CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length];
                return (
                  <div key={c.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[12px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate font-medium text-neutral-700 dark:text-neutral-300">{c.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-neutral-900 dark:text-neutral-50">
                        {c.count}
                        <span className="ml-1 text-[10.5px] font-normal text-neutral-400">
                          ({totalVendors ? Math.round((c.count / totalVendors) * 100) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full transition-[width] duration-1000"
                        style={{ width: `${(c.count / maxCategory) * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Tag} text="No category data yet." />
          )}
        </div>
      </div>

      {/* Recently joined brands + Recent Activity */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`lg:col-span-2 ${cardClass}`}>
          <CardHeader
            icon={Store}
            title="Recently Joined Brands"
            subtitle="Newest approved brands on the platform"
            action={<ViewAllButton onClick={() => navigate("/brand")} />}
          />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-120 text-left text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  <th className="px-2 pb-2.5 font-medium">Brand</th>
                  <th className="px-2 pb-2.5 font-medium">Category</th>
                  <th className="px-2 pb-2.5 font-medium">Plan</th>
                  <th className="px-2 pb-2.5 text-right font-medium">Followers</th>
                  <th className="px-2 pb-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                {recentBrands.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/brands/${b.id}`)}
                    className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <BrandAvatar brand={b} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-800 dark:text-neutral-200">{b.brandName}</p>
                          <p className="truncate text-[10.5px] text-neutral-400">{b.location}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-neutral-500">{b.category}</td>
                    <td className="px-2 py-2.5 text-neutral-500">{b.subscriptionPlan}</td>
                    <td className="px-2 py-2.5 text-right font-medium text-neutral-700 dark:text-neutral-300">{b.followers}</td>
                    <td className="px-2 py-2.5 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${STATUS_PILLS[b.status] || STATUS_PILLS.Deactive}`}>
                        {b.status === "Deactive" ? "Inactive" : b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {brandsLoading ? (
              <LoadingState className="py-8" />
            ) : (
              !brands.length && <EmptyState icon={Store} text="No brands yet." className="py-8" />
            )}
          </div>
        </div>

        <div className={cardClass}>
          <CardHeader icon={Activity} title="Recent Activity" subtitle="Latest platform events" action={<SampleTag />} />
          <div className="relative space-y-1">
            <div className="absolute bottom-4 left-[17px] top-4 w-px bg-neutral-200 dark:bg-neutral-800" />
            {ACTIVITY_FEED.map((a) => {
              const Icon = a.icon;
              const amountMatch = a.what.match(/₹[\d,]+/);
              return (
                <div key={a.id} className="relative flex items-center gap-3 py-2">
                  <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${tints[a.tint]}`}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{a.who}</p>
                    <p className="truncate text-[11px] text-neutral-500">{a.what}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {amountMatch && (
                      <p className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">+{amountMatch[0]}</p>
                    )}
                    <p className="text-[10.5px] text-neutral-400">{a.when}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Health + Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={cardClass}>
          <CardHeader icon={ShieldCheck} title="Platform Health" subtitle="Key ratios at a glance" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HealthRing label="Vendor Activity" pct={activeRatio} tint="emerald" />
            <HealthRing label="Approval Clearance" pct={clearancePct} tint="amber" />
            <HealthRing label="Revenue Goal" pct={revenueGoalPct} tint="sky" sample />
            <HealthRing label="Brand Targets" pct={avgGoalProgress} tint="violet" />
          </div>
        </div>

        <div className={cardClass}>
          <CardHeader icon={LayoutGrid} title="Quick Actions" subtitle="Jump straight to a section" />
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="group flex flex-col items-center gap-2 rounded-xl bg-neutral-50 px-2 py-3.5 text-center transition-all hover:-translate-y-0.5 hover:bg-neutral-100 dark:bg-neutral-950/60 dark:hover:bg-neutral-800/60"
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${tints[a.tint]}`}>
                    <Icon size={16} />
                  </span>
                  <span className="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300">{a.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
