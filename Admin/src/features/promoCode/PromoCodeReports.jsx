import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  AlertTriangle,
  Gift,
  Wallet,
  Target,
  RefreshCw,
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
import { getPromoCodeReports, getPromoCodes } from "./services/PromoCodeApi";
import {
  PROMO_AUDIENCE,
  AUDIENCE_LABELS,
  REPORT_GROUP_BY,
  REPORT_GROUP_BY_LABELS,
} from "./promoCodeEnums";

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
  if (v == null) return "—";
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

function KpiTile({ icon: Icon, label, value, caption, tint = "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400", big = false }) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${
        big ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={16} />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
          <p className={`font-bold text-neutral-900 dark:text-neutral-50 ${big ? "text-[24px]" : "text-[19px]"}`}>{value}</p>
        </div>
      </div>
      {caption && <p className="mt-2 text-[11px] text-neutral-500">{caption}</p>}
    </div>
  );
}

export default function PromoCodeReports() {
  const navigate = useNavigate();

  const [codes, setCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(true);

  const [codeFilter, setCodeFilter] = useState("");
  const [audience, setAudience] = useState("");
  const [groupBy, setGroupBy] = useState(REPORT_GROUP_BY.DAY);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatDateInput(d);
  });
  const [to, setTo] = useState(() => formatDateInput(new Date()));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getPromoCodes({ page: 1, limit: 100 })
      .then((res) => setCodes(res?.data?.data ?? []))
      .catch(() => {})
      .finally(() => setCodesLoading(false));
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getPromoCodeReports({
        code: codeFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        groupBy,
        audience: audience || undefined,
      });
      setReport(res?.data ?? null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [codeFilter, from, to, groupBy, audience]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/promo-code")}
              aria-label="Back to promo codes"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                <TrendingUp size={20} className="text-emerald-500" />
                Promo Code Campaign Report
              </h1>
              {period.basis && <p className="mt-1 text-[12px] text-neutral-500">{period.basis}</p>}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Code</label>
            <select
              value={codeFilter}
              onChange={(e) => setCodeFilter(e.target.value)}
              disabled={codesLoading}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            >
              <option value="">All Codes</option>
              {codes.map((c) => (
                <option key={c._id} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            >
              <option value="">All</option>
              {Object.values(PROMO_AUDIENCE).map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 [color-scheme:light] focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 [color-scheme:light] focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-neutral-500">Group By</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              >
                {Object.values(REPORT_GROUP_BY).map((g) => (
                  <option key={g} value={g}>
                    {REPORT_GROUP_BY_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Apply
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading report…
          </div>
        )}

        {!loading && loadError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load report: {loadError}
          </div>
        )}

        {!loading && !loadError && report && (
          <>
            {campaign && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-[12.5px] text-emerald-700 dark:text-emerald-300">
                <Tag size={14} />
                Scoped to campaign:
                {Object.entries(campaign).map(([k, v]) => (
                  <span key={k} className="rounded-full bg-white/60 px-2.5 py-1 font-medium dark:bg-black/20">
                    {toTitleCase(k)}: {displayValue(v)}
                  </span>
                ))}
              </div>
            )}

            {/* KPI bento grid */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <KpiTile
                icon={Percent}
                label="Conversion Rate"
                value={`${summary.conversionRate ?? 0}%`}
                caption="Claims that ended in redemption"
                tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                big
              />
              <KpiTile
                icon={IndianRupee}
                label="Discount Given"
                value={`₹${(summary.discountGiven ?? 0).toLocaleString("en-IN")}`}
                caption="Total value handed out"
                tint="bg-sky-400/10 text-sky-600 dark:text-sky-400"
                big
              />
              <KpiTile icon={Tag} label="Codes Used" value={summary.codesUsed ?? 0} tint="bg-violet-400/10 text-violet-600 dark:text-violet-400" />
              <KpiTile icon={Store} label="Brands Reached" value={summary.brandsReached ?? 0} tint="bg-orange-400/10 text-orange-600 dark:text-orange-400" />
              <KpiTile icon={Users} label="Claims" value={summary.claims ?? 0} tint="bg-blue-400/10 text-blue-600 dark:text-blue-400" />
              <KpiTile icon={CheckCircle2} label="Redemptions" value={summary.redemptions ?? 0} tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" />
              <KpiTile icon={Clock} label="Open Reservations" value={summary.openReservations ?? 0} tint="bg-amber-400/10 text-amber-600 dark:text-amber-400" />
              <KpiTile icon={XCircle} label="Abandoned" value={summary.abandoned ?? 0} tint="bg-red-400/10 text-red-600 dark:text-red-400" />
              <KpiTile icon={Wallet} label="Revenue Collected" value={`₹${(summary.revenueCollected ?? 0).toLocaleString("en-IN")}`} tint="bg-teal-400/10 text-teal-600 dark:text-teal-400" />
              <KpiTile icon={Wallet} label="Revenue Before Promo" value={`₹${(summary.revenueBeforePromo ?? 0).toLocaleString("en-IN")}`} tint="bg-neutral-200 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300" />
              <KpiTile icon={Target} label="Average Discount" value={`₹${(summary.averageDiscount ?? 0).toLocaleString("en-IN")}`} tint="bg-pink-400/10 text-pink-600 dark:text-pink-400" />
              <KpiTile icon={Gift} label="Average Order Value" value={`₹${(summary.averageOrderValue ?? 0).toLocaleString("en-IN")}`} tint="bg-green-400/10 text-green-600 dark:text-green-400" />
            </div>

            {/* Over time + by action */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Trend Over Time {overTimeY ? `(${toTitleCase(overTimeY)})` : ""}
                </p>
                {overTimeChartData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
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
                  <div className="flex h-[220px] items-center justify-center text-[12.5px] text-neutral-500">
                    No usage in this period yet.
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">By Action</p>
                {byActionChartData.length ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-[140px] w-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={byActionChartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={62} paddingAngle={3} isAnimationActive={false}>
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
                  <div className="flex h-[140px] items-center justify-center text-[12.5px] text-neutral-500">No action data yet.</div>
                )}
              </div>
            </div>

            {/* By Code */}
            <div className="mb-4">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">By Code ({byCode.length})</p>
              <Table columns={byCodeColumns} data={byCode} rowKey={byCodeColumns[0]?.key || "code"} emptyMessage="No per-code breakdown for this period." dense />
            </div>

            {/* By Plan (vendor) + Top Brands (customer) */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">By Plan ({byPlan.length})</p>
                <Table columns={byPlanColumns} data={byPlan} rowKey={byPlanColumns[0]?.key || "plan"} emptyMessage="No plan breakdown for this period." dense />
              </div>
              <div>
                <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">Top Brands ({topBrands.length})</p>
                <Table columns={topBrandsColumns} data={topBrands} rowKey={topBrandsColumns[0]?.key || "brand"} emptyMessage="No brand usage for this period." dense />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
