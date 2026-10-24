import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeftRight,
  Undo2,
  ChevronRight,
  Wallet,
  Search,
  X,
  XCircle,
  Receipt,
  CalendarDays,
} from "lucide-react";
import { EmptyState, SectionCard } from "./BrandShared";
import { glassClass, heroClass, tints } from "./BrandDetails/components/bentoStyles";
import StatusStepButton from "../../components/common/StatusStepButton";
import { useVoucherClaimPayments } from "../transaction/queries/transactionQueries";
import { useRefundWorklist } from "../refund/queries/refundQueries";
import { retryUnlessNotFound } from "./queries/brandQueries";
import { normalizeClaimStatus, formatPaymentMethod, fmtTime, inr } from "../transaction/transactionUtils";
import { isNotFoundMessage, MISSING } from "../../utils/helpers";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";

/* -------------------------------------------------------------------------
 * Transactions + Refunds tabs on a brand's detail page — this brand's own
 * records, fetched by the brand's id. Neither list endpoint is confirmed to
 * filter on brandId, so the rows are also filtered by brand here (every
 * record carries its brand). Rows open the existing detail pages.
 * ---------------------------------------------------------------------- */

// Full ISO timestamp → "11 Oct 2026" (transactionUtils.formatDate expects a
// bare "YYYY-MM-DD" string, so it isn't used here).
const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? MISSING.date : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const humanize = (v) =>
  String(v || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/* Params + options both tabs' queries use: up to 100 records for this brand. */
const recordParams = (brand) => ({ brandId: brand.id, page: 1, limit: 100 });
const recordOptions = (brand) => ({ enabled: Boolean(brand.id), retry: retryUnlessNotFound });

/* Shared filter-and-map over a records query: keeps this brand's rows.
   "Not found" just means none yet — shown as the empty state, not an error. */
function useBrandRecords(query, brand, belongsToBrand, map) {
  const rows = useMemo(() => {
    const res = query.data;
    const list = res?.data?.data ?? res?.data ?? [];
    return (Array.isArray(list) ? list : []).filter((item) => belongsToBrand(item, brand)).map(map);
    // belongsToBrand / map are module-level, so only the data and brand matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, brand.id, brand.brandName]);
  const loadError = query.error?.message ?? "";
  return { rows, loading: query.isPending, error: isNotFoundMessage(loadError) ? "" : loadError };
}

function TabState({ loading, error, label }) {
  if (loading) {
    return (
      <Loader label={`Loading ${label}…`} />
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
      <AlertTriangle size={14} className="shrink-0" /> Failed to load {label}: {error}
    </div>
  );
}

const tableWrap = "overflow-hidden rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";
const thClass = "px-4 py-3 font-semibold";

/* ---- Transactions ---------------------------------------------------- */

// The list endpoint returns { payment, claim, brand, … } per record (or a
// flatter shape on some records) — same unwrapping as the Transactions page.
const paymentBrandId = (item) => {
  const payment = item?.payment ?? item ?? {};
  return item?.brand?._id ?? payment.brandId ?? item?.claim?.brandId ?? payment.brand?._id ?? null;
};

function belongsToBrandTxn(item, brand) {
  const id = paymentBrandId(item);
  if (id) return String(id) === String(brand.id);
  // No id on the record — fall back to the brand name.
  return (item?.brand?.brandName ?? item?.payment?.brand?.brandName) === brand.brandName;
}

function mapTxn(item) {
  const payment = item?.payment ?? item ?? {};
  const claim = item?.claim ?? {};
  const ts = payment.createdAt || payment.verifiedAt || null;
  return {
    id: payment._id || item?._id,
    claimId: claim._id || payment.claimId || item?._id || payment._id,
    reference: payment.razorpayPaymentId || payment.invoiceId || payment._id || "—",
    // Admin rows carry a `customer` block; fall back to the raw id.
    customer: item?.customer?.fullName || payment.customerId || claim.customerId || "—",
    customerIsId: !item?.customer?.fullName,
    ts,
    amount: Number(payment.amount) || 0,
    method: formatPaymentMethod(payment.paymentMethod),
    status: normalizeClaimStatus(payment.status),
  };
}

const TXN_TONES = { Success: "emerald", Pending: "amber", Failed: "red", Refunded: "violet" };

/* ---- Bento bits (same look as the other brand-detail tabs) ------------ */

function Ring({ pct, size = 84, stroke = 8, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-900/10 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className="stroke-emerald-600 transition-[stroke-dashoffset] duration-700 dark:stroke-emerald-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// Local "YYYY-MM-DD" for grouping by day.
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TXN_FILTERS = [
  ["all", "All"],
  ["Success", "Success"],
  ["Pending", "Pending"],
  ["Failed", "Failed"],
  ["Refunded", "Refunded"],
];

export function TransactionsTab({ brand }) {
  const navigate = useNavigate();
  const paymentsQuery = useVoucherClaimPayments(recordParams(brand), recordOptions(brand));
  const { rows, loading, error } = useBrandRecords(paymentsQuery, brand, belongsToBrandTxn, mapTxn);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  if (loading || error) return <TabState loading={loading} error={error} label="transactions" />;
  if (!rows.length) return <EmptyState label="No transactions for this brand yet." />;

  const total = (list) => list.reduce((s, r) => s + r.amount, 0);
  const byStatus = (s) => rows.filter((r) => r.status === s);
  const success = byStatus("Success");
  const collected = total(success);
  const successRate = (success.length / rows.length) * 100;
  const avgTicket = success.length ? collected / success.length : 0;
  const failedCount = byStatus("Failed").length;

  // Last 14 days — successful amount per day.
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (13 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), amount: 0, count: 0 };
  });
  const dayIndex = Object.fromEntries(days.map((d, i) => [d.key, i]));
  for (const r of success) {
    if (!r.ts) continue;
    const i = dayIndex[dayKey(new Date(r.ts))];
    if (i != null) {
      days[i].amount += r.amount;
      days[i].count += 1;
    }
  }
  const last14 = days.reduce((s, d) => s + d.amount, 0);

  const q = search.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!q || [r.reference, r.customer, r.method].some((v) => String(v || "").toLowerCase().includes(q)))
  );
  const counts = Object.fromEntries(TXN_FILTERS.map(([k]) => [k, k === "all" ? rows.length : byStatus(k).length]));

  return (
    <div className="space-y-4">
      {/* One row: a compact "Collected" card + four separate small cards.
          Total / Failed also filter the list below. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className={`${heroClass} col-span-2 !p-4`}>
          <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />
          <div className="relative flex items-center gap-3">
            <Ring pct={successRate} size={58} stroke={6}>
              <p className="text-[12px] font-bold tabular-nums leading-none text-neutral-900 dark:text-neutral-50">{Math.round(successRate)}%</p>
            </Ring>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-900/60 dark:text-neutral-300">
                <Wallet size={12} /> Collected for this brand
              </p>
              <p className="mt-1 truncate text-[20px] font-bold leading-none tracking-tight tabular-nums text-neutral-950 dark:text-neutral-50">{inr(collected)}</p>
              <p className="mt-1 text-[11px] text-neutral-900/60 dark:text-neutral-400">
                {success.length} of {rows.length} payments succeeded
              </p>
            </div>
          </div>
        </div>

        {[
          { icon: ArrowLeftRight, tint: "sky", label: "Total Transactions", value: String(rows.length), filterKey: "all" },
          {
            icon: XCircle,
            tint: failedCount ? "red" : "neutral",
            label: "Failed",
            value: String(failedCount),
            filterKey: "Failed",
            tone: failedCount ? "text-red-600 dark:text-red-400" : "",
          },
          { icon: Receipt, tint: "violet", label: "Avg. ticket", value: inr(avgTicket) },
          { icon: CalendarDays, tint: "emerald", label: "Last 14 days", value: inr(last14) },
        ].map(({ icon: Icon, tint, label, value, filterKey, tone = "" }) => {
          const Tag = filterKey ? "button" : "div";
          return (
            <Tag
              key={label}
              {...(filterKey ? { type: "button", onClick: () => setFilter(filterKey), title: `Show ${label.toLowerCase()}` } : {})}
              className={`${glassClass} flex flex-col p-4 text-left ${
                filterKey ? "transition-all hover:-translate-y-0.5" : ""
              } ${filterKey && filter === filterKey ? "ring-2 ring-emerald-400/60" : ""}`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tints[tint]}`}>
                <Icon size={15} />
              </span>
              <span className="mt-2.5 text-[11px] font-medium text-neutral-500">{label}</span>
              <span className={`truncate text-[18px] font-bold leading-tight tabular-nums text-neutral-900 dark:text-neutral-50 ${tone}`}>{value}</span>
            </Tag>
          );
        })}
      </div>

      {/* Filters + list */}
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className={`${glassClass} no-scrollbar flex w-fit max-w-full items-center gap-1 overflow-x-auto !rounded-full p-1`}>
            {TXN_FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  filter === key ? "bg-emerald-400 text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {label} <span className="opacity-60">{counts[key]}</span>
              </button>
            ))}
          </div>
          <label className={`${glassClass} flex h-9 items-center gap-2 !rounded-full px-3.5 sm:w-64`}>
            <Search size={14} className="shrink-0 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payment, customer, method"
              className="w-full bg-transparent text-[12.5px] text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-neutral-400 hover:text-neutral-700">
                <X size={13} />
              </button>
            )}
          </label>
        </div>

        {shown.length === 0 ? (
          <div className={`${glassClass} py-12 text-center text-[12.5px] text-neutral-500`}>No transactions match.</div>
        ) : (
          <div className={`${glassClass} divide-y divide-neutral-200/60 overflow-hidden dark:divide-white/5`}>
            {shown.map((r) => {
              const tone = TXN_TONES[r.status] || "neutral";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => r.claimId && navigate(`/transaction/${r.claimId}`)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/70 dark:hover:bg-white/5"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tints[tone] || tints.neutral}`}>
                    <ArrowLeftRight size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[12px] font-semibold normal-case text-neutral-900 dark:text-neutral-50"><ValueOr value={r.reference} fallback="No reference" /></p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-neutral-500">
                      <span className={r.customerIsId ? "font-mono text-[11px] normal-case" : ""}><ValueOr value={r.customer} fallback="No customer" /></span>
                      <span>· <ValueOr value={r.method} fallback={MISSING.method} /></span>
                      <span>· {r.ts ? `${formatDate(r.ts)}, ${fmtTime(r.ts)}` : MISSING.date}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[14.5px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{inr(r.amount)}</span>
                    <StatusStepButton label={r.status} tone={TXN_TONES[r.status]} />
                  </div>
                  <ChevronRight size={15} className="shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Refunds --------------------------------------------------------- */

const belongsToBrandRefund = (item, brand) => String(item?.brandId) === String(brand.id);

function mapRefund(raw) {
  const status = String(raw.status || "PENDING").toUpperCase();
  return {
    id: raw._id,
    claimCode: raw.claimCode || "—",
    reason: humanize(raw.reason) || "—",
    method: humanize(raw.method) || "—",
    ts: raw.createdAt,
    requested: Number(raw.requestedAmount) || 0,
    approved: raw.approvedAmount != null ? Number(raw.approvedAmount) : null,
    status,
    statusLabel: raw.statusLabel || humanize(status),
  };
}

// Refund status → pill colour (same grouping as the Refunds page).
function refundTone(status) {
  if (["COMPLETED", "APPROVED", "VENDOR_APPROVED"].includes(status)) return "emerald";
  if (status === "ADMIN_APPROVED") return "sky";
  if (status === "PROCESSING") return "violet";
  if (["REJECTED", "ADMIN_REJECTED", "CANCELLED", "WITHDRAWN", "FAILED"].includes(status)) return "red";
  return "amber";
}

export function RefundsTab({ brand }) {
  const navigate = useNavigate();
  const refundsQuery = useRefundWorklist(recordParams(brand), recordOptions(brand));
  const { rows, loading, error } = useBrandRecords(refundsQuery, brand, belongsToBrandRefund, mapRefund);

  if (loading || error) return <TabState loading={loading} error={error} label="refunds" />;
  if (!rows.length) return <EmptyState label="No refunds for this brand yet." />;

  const sum = (list, key) => list.reduce((s, r) => s + (r[key] || 0), 0);
  const refunded = rows.filter((r) => r.status === "COMPLETED");
  const open = rows.filter((r) => refundTone(r.status) === "amber" || ["ADMIN_APPROVED", "PROCESSING"].includes(r.status));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SectionCard title="Refund Requests">
          <p className="text-[20px] font-bold text-neutral-800 dark:text-neutral-200">{rows.length}</p>
          <p className="text-[11.5px] text-neutral-500">{inr(sum(rows, "requested"))} requested</p>
        </SectionCard>
        <SectionCard title="Refunded">
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{inr(sum(refunded, "approved"))}</p>
          <p className="text-[11.5px] text-neutral-500">{refunded.length} completed</p>
        </SectionCard>
        <SectionCard title="Open">
          <p className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{open.length}</p>
        </SectionCard>
        <SectionCard title="Rejected">
          <p className="text-[20px] font-bold text-red-600 dark:text-red-400">{rows.filter((r) => refundTone(r.status) === "red").length}</p>
        </SectionCard>
      </div>

      <div className={tableWrap}>
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-neutral-100/80 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/50">
              <tr>
                <th className={thClass}>Claim</th>
                <th className={thClass}>Reason</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Method</th>
                <th className={`${thClass} text-right`}>Requested</th>
                <th className={`${thClass} text-right`}>Approved</th>
                <th className={thClass}>Status</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/refund/${r.id}`)}
                  className="cursor-pointer border-t border-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-50">
                      <Undo2 size={13} className="text-neutral-400" /> <ValueOr value={r.claimCode} fallback="No claim code" />
                    </span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-[12px]"><ValueOr value={r.reason} fallback={MISSING.reason} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]">{r.ts ? formatDate(r.ts) : MISSING.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]"><ValueOr value={r.method} fallback={MISSING.method} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-50">{inr(r.requested)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                    {r.approved != null ? inr(r.approved) : <span className="text-neutral-400">Not approved</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusStepButton label={r.statusLabel} tone={refundTone(r.status)} />
                  </td>
                  <td className="px-2 py-3 text-neutral-400">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
