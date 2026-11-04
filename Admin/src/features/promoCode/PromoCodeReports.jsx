import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import {
  ArrowLeft,
  TrendingUp,
  Tag,
  Users,
  Store,
  Percent,
  IndianRupee,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Gift,
  Wallet,
  Target,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";
import Table from "../../components/common/Table";
import { usePromoCodeReport, usePromoCodes } from "./queries/promoCodeQueries";
import {
  PROMO_AUDIENCE,
  AUDIENCE_LABELS,
  REPORT_GROUP_BY,
  REPORT_GROUP_BY_LABELS,
} from "./promoCodeEnums";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import { MISSING } from "../../utils/helpers";

/* -------------------------------------------------------------------------
 * Promo Code Campaign Report — GET /promoCodes/reports
 * -------------------------------------------------------------------------
 * `summary` and `period` field names are confirmed from a real response.
 * `byCode` / `byPlan` / `byAction` / `overTime` / `topBrands` are NOT — every
 * response seen so far had zero usage, so those arrays were empty and their
 * per-item shape is unknown. Tables read them with dynamically-built columns
 * (whatever keys the first row actually has) instead of guessing field
 * names, so a real row of data renders correctly no matter what it's called
 * server-side. The over-time chart similarly picks its own x/y keys from a
 * short list of likely candidates.
 * ---------------------------------------------------------------------- */

const CHART_GREEN = "#2FDE8C"; // matches the trend-chart accent used on Dashboard/Voucher pages

// Fixed, non-cycled categorical order (blue, orange, teal, amber) — same
// convention as the voucher details page, for the small by-action donut.
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

// A single stable reference for "no rows yet" — `report?.x || []` would
// create a brand-new array every render, which makes every useMemo keyed
// on it think its input changed on every render too.
const EMPTY_ARRAY = [];

function toTitleCase(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function displayValue(v) {
  if (v == null) return MISSING.generic;
  if (typeof v === "number") return v.toLocaleString("en-IN");
  if (typeof v === "object") return v.name || v.brandName || v.code || v.planName || v._id || JSON.stringify(v);
  return String(v);
}

// Builds Table columns from whatever keys the first row actually has —
// see the note above on why field names aren't hardcoded here.
function dynamicColumns(rows) {
  if (!rows?.length) return [];
  return Object.keys(rows[0]).map((k) => ({
    key: k,
    label: toTitleCase(k),
    align: typeof rows[0][k] === "number" ? "right" : "left",
    render: (row) => displayValue(row[k]),
  }));
}

const X_KEY_CANDIDATES = ["period", "date", "bucket", "day", "month", "label", "_id"];
const Y_KEY_CANDIDATES = ["discountGiven", "revenueCollected", "claims", "redemptions", "count", "total"];

function pickTimeSeriesKeys(rows) {
  if (!rows?.length) return { xKey: null, yKey: null };
  const first = rows[0];
  const keys = Object.keys(first);
  const xKey = X_KEY_CANDIDATES.find((k) => k in first) || keys[0];
  const yKey =
    Y_KEY_CANDIDATES.find((k) => k in first && typeof first[k] === "number") ||
    keys.find((k) => k !== xKey && typeof first[k] === "number");
  return { xKey, yKey };
}

function formatDateInput(d) {
  return d.toISOString().slice(0, 10);
}

const CARD = "rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";
const inr = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
const pctOf = (n, total) => (total ? Math.round((n / total) * 100) : 0);

// KPI tile; `highlight` = the green gradient lead tile (Dashboard style).
function KpiTile({ icon: Icon, label, value, caption, tint = "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400", highlight = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 ${
        highlight
          ? "bg-gradient-to-br from-emerald-200/80 via-emerald-100/70 to-white shadow-[0_8px_30px_rgba(16,185,129,0.15)] dark:from-emerald-500/30 dark:via-emerald-600/10 dark:to-neutral-900"
          : "bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[11.5px] font-medium ${highlight ? "text-neutral-900/70 dark:text-neutral-300" : "text-neutral-500"}`}>{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${highlight ? "bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300" : tint}`}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-1 truncate text-[22px] font-bold leading-tight tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">{value}</p>
      {caption && <p className={`mt-0.5 truncate text-[11px] ${highlight ? "text-neutral-900/70 dark:text-neutral-300" : "text-neutral-500"}`}>{caption}</p>}
    </div>
  );
}

// Card header: icon + title + subtitle.
function CardTitle({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
          <Icon size={14} className="shrink-0 text-emerald-500" /> {title}
        </p>
        {subtitle && <p className="mt-0.5 truncate text-[11px] text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// Section label between the page's blocks.
function SectionLabel({ children }) {
  return <p className="mb-2.5 mt-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{children}</p>;
}

// Label + value with an optional bar (share of a base).
function BarRow({ icon: Icon, label, value, pct, color }) {
  return (
    <li>
      <div className="mb-1 flex items-center gap-2 text-[12px]">
        <Icon size={13} className="shrink-0" style={{ color }} />
        <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{label}</span>
        <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{value}</span>
        {pct != null && <span className="w-9 text-right text-[10.5px] tabular-nums text-neutral-400">{pct}%</span>}
      </div>
      {pct != null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
        </div>
      )}
    </li>
  );
}
export default function PromoCodeReports() {
  const navigate = useNavigate();

  // Codes for the filter dropdown — a failed load just leaves "All Codes".
  const { data: codesRes, isPending: codesLoading } = usePromoCodes({ page: 1, limit: 100 });
  const codes = codesRes?.data?.data ?? EMPTY_ARRAY;

  const [codeFilter, setCodeFilter] = useState("");
  const [audience, setAudience] = useState("");
  const [groupBy, setGroupBy] = useState(REPORT_GROUP_BY.DAY);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateInput(d);
  });
  const [to, setTo] = useState(() => formatDateInput(new Date()));

  // The filters above only take effect on "Apply" — the report is keyed on
  // this snapshot of them, not on the live inputs.
  const currentFilters = () => ({
    code: codeFilter || undefined,
    from: from || undefined,
    to: to || undefined,
    groupBy,
    audience: audience || undefined,
  });
  const [appliedFilters, setAppliedFilters] = useState(currentFilters);
  const {
    data: reportRes,
    isPending: loading,
    isFetching: reportFetching,
    error: reportError,
    refetch: refetchReport,
  } = usePromoCodeReport(appliedFilters, { placeholderData: keepPreviousData });
  const report = reportRes?.data ?? null;
  const loadError = reportError?.message ?? "";

  // Same filters → fetch again; changed filters → the new key fetches.
  const applyFilters = () => {
    const next = currentFilters();
    if (JSON.stringify(next) === JSON.stringify(appliedFilters)) refetchReport();
    else setAppliedFilters(next);
  };

  const summary = report?.summary || {};
  const period = report?.period || {};
  const campaign = report?.campaign || null;
  const overTime = report?.overTime || EMPTY_ARRAY;
  const byCode = report?.byCode || EMPTY_ARRAY;
  const byPlan = report?.byPlan || EMPTY_ARRAY;
  const byAction = report?.byAction || EMPTY_ARRAY;
  const topBrands = report?.topBrands || EMPTY_ARRAY;

  const { xKey: overTimeX, yKey: overTimeY } = useMemo(() => pickTimeSeriesKeys(overTime), [overTime]);
  const overTimeChartData = useMemo(
    () => (overTimeX && overTimeY ? overTime.map((row) => ({ x: displayValue(row[overTimeX]), y: row[overTimeY] })) : []),
    [overTime, overTimeX, overTimeY]
  );

  const byCodeColumns = useMemo(() => dynamicColumns(byCode), [byCode]);
  const byPlanColumns = useMemo(() => dynamicColumns(byPlan), [byPlan]);
  const topBrandsColumns = useMemo(() => dynamicColumns(topBrands), [topBrands]);

  // by-action is a small, fixed set (NEW/RENEW/UPGRADE/DOWNGRADE) — a good
  // fit for a donut, using whichever numeric field its rows actually have.
  const byActionChartData = useMemo(() => {
    if (!byAction.length) return [];
    const first = byAction[0];
    const nameKey = Object.keys(first).find((k) => typeof first[k] === "string") || Object.keys(first)[0];
    const valueKey = Object.keys(first).find((k) => typeof first[k] === "number");
    if (!valueKey) return [];
    return byAction.map((row) => ({ name: displayValue(row[nameKey]), value: row[valueKey] }));
  }, [byAction]);

  const claims = Number(summary.claims ?? 0);
  const fieldClass =
    "h-9 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[12.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200";
  const periodLabel = [appliedFilters.from, appliedFilters.to]
    .filter(Boolean)
    .map((d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }))
    .join(" – ");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/promo-code")}
              aria-label="Back to promo codes"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">
                <TrendingUp size={20} className="text-emerald-500" />
                Promo Code Report
              </h1>
              <p className="mt-0.5 text-[12.5px] text-neutral-500">{period.basis || "How promo codes performed — usage, money and reach."}</p>
            </div>
          </div>
          {periodLabel && (
            <span className="flex items-center gap-1.5 self-start rounded-full bg-white px-3.5 py-2 text-[12px] font-medium text-emerald-700 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:self-auto dark:bg-neutral-900 dark:text-emerald-300">
              <CalendarDays size={13} /> {periodLabel}
              {appliedFilters.code && <span className="text-neutral-400">· {appliedFilters.code}</span>}
            </span>
          )}
        </div>

        {/* Filters — one row; the report updates on Apply */}
        <div className={`${CARD} flex flex-wrap items-end gap-2.5 !p-3`}>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Code</span>
            <select value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} disabled={codesLoading} className={fieldClass}>
              <option value="">All codes</option>
              {codes.map((c) => (
                <option key={c._id} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className={fieldClass}>
              <option value="">All</option>
              {Object.values(PROMO_AUDIENCE).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">From</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${fieldClass} [color-scheme:light] dark:[color-scheme:dark]`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">To</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${fieldClass} [color-scheme:light] dark:[color-scheme:dark]`} />
          </label>
          <label className="flex min-w-[110px] flex-col gap-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Group by</span>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={fieldClass}>
              {Object.values(REPORT_GROUP_BY).map((g) => (
                <option key={g} value={g}>
                  {REPORT_GROUP_BY_LABELS[g]}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={applyFilters}
            disabled={reportFetching}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400 px-4 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reportFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Apply
          </button>
        </div>

        {loading && <Loader label="Loading report…" />}

        {!loading && loadError && (
          <div className="mt-5 rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load the report"
              description={loadError}
              action={{ label: "Try again", icon: RefreshCw, onClick: () => refetchReport() }}
            />
          </div>
        )}

        {!loading && !loadError && report && (
          <div className={`transition-opacity ${reportFetching ? "opacity-60" : ""}`}>
            {campaign && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[12.5px] text-emerald-700 dark:text-emerald-300">
                <Tag size={14} />
                Scoped to campaign:
                {Object.entries(campaign).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-white/60 px-2.5 py-1 font-medium dark:bg-black/20">
                    {toTitleCase(k)}: {displayValue(v)}
                  </span>
                ))}
              </div>
            )}

            {/* 1 · Overview — the four numbers that matter most */}
            <SectionLabel>Overview</SectionLabel>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiTile highlight icon={Percent} label="Conversion rate" value={`${summary.conversionRate ?? 0}%`} caption="Claims that ended in a redemption" />
              <KpiTile icon={IndianRupee} label="Discount given" value={inr(summary.discountGiven)} caption="Total value handed out" tint="bg-sky-400/10 text-sky-600 dark:text-sky-400" />
              <KpiTile icon={Wallet} label="Revenue collected" value={inr(summary.revenueCollected)} caption={`Before promo ${inr(summary.revenueBeforePromo)}`} tint="bg-teal-400/10 text-teal-600 dark:text-teal-400" />
              <KpiTile icon={CheckCircle2} label="Redemptions" value={(summary.redemptions ?? 0).toLocaleString("en-IN")} caption={`Out of ${claims.toLocaleString("en-IN")} claims`} tint="bg-violet-400/10 text-violet-600 dark:text-violet-400" />
            </div>

            {/* 2 · Usage funnel · money · reach */}
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className={CARD}>
                <CardTitle icon={Users} title="Usage funnel" subtitle="What happened to every claim" />
                <ul className="space-y-2.5">
                  <BarRow icon={Users} label="Claims" value={claims.toLocaleString("en-IN")} pct={claims ? 100 : 0} color="#2a78d6" />
                  <BarRow icon={CheckCircle2} label="Redeemed" value={(summary.redemptions ?? 0).toLocaleString("en-IN")} pct={pctOf(summary.redemptions, claims)} color="#1baf7a" />
                  <BarRow icon={Clock} label="Still reserved" value={(summary.openReservations ?? 0).toLocaleString("en-IN")} pct={pctOf(summary.openReservations, claims)} color="#eda100" />
                  <BarRow icon={XCircle} label="Abandoned" value={(summary.abandoned ?? 0).toLocaleString("en-IN")} pct={pctOf(summary.abandoned, claims)} color="#e34948" />
                </ul>
              </div>

              <div className={CARD}>
                <CardTitle icon={Wallet} title="Money" subtitle="Order value before → after the promo" />
                <ul className="divide-y divide-neutral-100 text-[12px] dark:divide-neutral-800">
                  {[
                    ["Revenue before promo", inr(summary.revenueBeforePromo)],
                    ["Discount given", `− ${inr(summary.discountGiven)}`],
                    ["Revenue collected", inr(summary.revenueCollected)],
                    ["Average discount", inr(summary.averageDiscount)],
                    ["Average order value", inr(summary.averageOrderValue)],
                  ].map(([label, value], i) => (
                    <li key={label} className="flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0">
                      <span className="text-neutral-500">{label}</span>
                      <span className={`font-semibold tabular-nums ${i === 2 ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-50"}`}>{value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={CARD}>
                <CardTitle icon={Target} title="Reach" subtitle="How widely the codes were used" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [Tag, "Codes used", summary.codesUsed, "bg-violet-400/10 text-violet-600 dark:text-violet-400"],
                    [Store, "Brands reached", summary.brandsReached, "bg-orange-400/10 text-orange-600 dark:text-orange-400"],
                    [Gift, "Avg. order", inr(summary.averageOrderValue), "bg-green-400/10 text-green-600 dark:text-green-400"],
                    [Target, "Avg. discount", inr(summary.averageDiscount), "bg-pink-400/10 text-pink-600 dark:text-pink-400"],
                  ].map(([Icon, label, value, tint]) => (
                    <div key={label} className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60">
                      <span className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
                        <Icon size={13} />
                      </span>
                      <p className="truncate text-[10.5px] text-neutral-500">{label}</p>
                      <p className="truncate text-[15px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{typeof value === "number" || value == null ? (value ?? 0).toLocaleString("en-IN") : value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 · Trend + by action */}
            <SectionLabel>Trend</SectionLabel>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className={`${CARD} lg:col-span-8`}>
                <CardTitle
                  icon={TrendingUp}
                  title="Over time"
                  subtitle={`${overTimeY ? toTitleCase(overTimeY) : "Usage"} per ${REPORT_GROUP_BY_LABELS[appliedFilters.groupBy]?.toLowerCase() || "period"}`}
                />
                {overTimeChartData.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={overTimeChartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="promoTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="x" tick={{ fill: "#8C9A91", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="natural" dataKey="y" stroke={CHART_GREEN} strokeWidth={2.4} fill="url(#promoTrendFill)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState variant="compact" icon="report" title="No usage in this period yet" description="Try a wider date range." />
                )}
              </div>

              <div className={`${CARD} lg:col-span-4`}>
                <CardTitle icon={Gift} title="By action" subtitle="New, renew, upgrade, downgrade" />
                {byActionChartData.length ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-32 w-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={byActionChartData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={3} cornerRadius={4} isAnimationActive={false}>
                            {byActionChartData.map((d, i) => (
                              <Cell key={d.name} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {byActionChartData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[11.5px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }} />
                          <span className="min-w-0 flex-1 truncate text-neutral-500">{d.name}</span>
                          <span className="font-semibold text-neutral-900 dark:text-neutral-50">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState variant="compact" icon="report" title="No action data yet" />
                )}
              </div>
            </div>

            {/* 4 · Breakdown tables */}
            <SectionLabel>Breakdown</SectionLabel>
            <div>
              <CardTitle icon={Tag} title="By code" subtitle={`${byCode.length} code${byCode.length === 1 ? "" : "s"} with usage in this period`} />
              <Table columns={byCodeColumns} data={byCode} rowKey={byCodeColumns[0]?.key || "code"} emptyTitle="No code usage in this period" emptyDescription="Try a longer date range to see how each code performed." emptyIcon="report" dense />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div>
                <CardTitle icon={Wallet} title="By plan" subtitle={`${byPlan.length} plan${byPlan.length === 1 ? "" : "s"} · vendor codes`} />
                <Table columns={byPlanColumns} data={byPlan} rowKey={byPlanColumns[0]?.key || "plan"} emptyTitle="No plan usage in this period" emptyDescription="Try a longer date range to see redemptions by plan." emptyIcon="report" dense />
              </div>
              <div>
                <CardTitle icon={Store} title="Top brands" subtitle={`${topBrands.length} brand${topBrands.length === 1 ? "" : "s"} · customer codes`} />
                <Table columns={topBrandsColumns} data={topBrands} rowKey={topBrandsColumns[0]?.key || "brand"} emptyTitle="No brand usage in this period" emptyDescription="Try a longer date range to see which brands used promo codes." emptyIcon="report" dense />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}