import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock3,
  XCircle,
  Wallet,
  Eye,
  ArrowLeftRight,
  Receipt,
  BarChart3,
  CreditCard,
  Undo2,
} from "lucide-react";
import { useAllVoucherClaimPayments } from "./queries/transactionQueries";
import { KpiCard, DailyBarsCard, MixCard, PillTabs } from "../../components/common/Overview";
import { pctChange, weekOverWeek, localDateStr } from "../../utils/overviewStats";
import {
  todayStr,
  formatDate,
  fmtTime,
  normalizeClaimStatus,
  formatPaymentMethod,
  inr,
} from "./transactionUtils";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import SelectDropdown from "../../components/common/SelectDropdown";
import { downloadCsv } from "../../utils/exportTable";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, orText } from "../../utils/helpers";

/* -------------------------------------------------------------------------
 * Shared Table component (same as provided) — kept in this file so the
 * artifact stays single-file. In your real project keep this in its own
 * Table.jsx and just `import Table from "./Table"` here.
 * ---------------------------------------------------------------------- */

export function StatusBadge({ status, activeLabel = "Active" }) {
  const isActive = status === activeLabel;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold
        ${
          isActive
            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-400"
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-400" : "bg-neutral-500"
        }`}
      />
      {status}
    </span>
  );
}

export function Table({
  columns = [],
  data = [],
  emptyMessage = "No records found.",
  // Shared EmptyState props (see components/common/EmptyState.jsx).
  emptyTitle,
  emptyDescription,
  emptyIcon = "search",
  emptyAction,
  rowKey = "id",
}) {
  const alignClass = (align) =>
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-225 border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-100/80 dark:bg-neutral-950/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ${alignClass(
                    col.align
                  )} ${col.width || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle || String(emptyMessage).replace(/\.$/, "")}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className={`border-t border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30 ${
                    row.isToday ? "bg-cyan-400/[0.04]" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-3.5 text-neutral-700 dark:text-neutral-300 ${alignClass(
                        col.align
                      )}`}
                    >
                      {col.render ? col.render(row, rowIndex) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Real data — GET /voucher-claims/payments (see ./services/TransactionApi)
 * ---------------------------------------------------------------------- */

// Normalizes one real voucher-claim payment record (GET
// /voucher-claims/payments) into the flat row shape this page's table/
// stats expect.
//
// The sibling detail endpoint (GET /voucher-claims/:claimId, confirmed real
// — see TransactionDetails.jsx) returns each record wrapped as
// { payment, claim, brand, outlet, timeline } rather than one flat object,
// so each list row is defensively unwrapped the same way here: read every
// payment field off `item.payment` when present, falling back to the item
// itself for a flatter shape. This is what was making most cells show "—"
// — the old code only ever read straight off the list item.
//
// On an admin token every row carries a `customer` block (fullName,
// uniqueId, email, mobile, whatsappNumber). Unset keys are omitted, not
// null, so "Customer" falls back to the raw `customerId` when there's no name.
function normalizeClaimPayment(item) {
  const payment = item?.payment ?? item ?? {};
  const claim = item?.claim ?? {};
  const brand = item?.brand ?? payment?.brand ?? {};
  const customerInfo = item?.customer ?? payment?.customer ?? {};
  const customerId = payment.customerId || claim.customerId || "—";

  // No usable timestamp → no date (shown as "—"), never "today".
  const ts = payment.createdAt || payment.verifiedAt || null;
  const dateStr = localDateStr(ts);

  const status = normalizeClaimStatus(payment.status);

  return {
    id: payment._id || item?._id || "—",
    claimId: claim._id || payment.claimId || item?.voucher?.claimId || item?._id || payment._id || "—",
    razorpayPaymentId: payment.razorpayPaymentId || "—",
    vendor: brand.brandName || "—",
    customer: customerInfo.fullName || customerId,
    customerId,
    customerUniqueId: customerInfo.uniqueId || "—",
    customerPhone: customerInfo.mobile || customerInfo.whatsappNumber || "—",
    date: dateStr,
    time: dateStr ? fmtTime(ts) : "—",
    amount: Number(payment.amount) || 0,
    method: formatPaymentMethod(payment.paymentMethod),
    status,
    isToday: dateStr === todayStr(),
    reference: payment.invoiceId || "—",
    failureReason: status === "Failed" ? payment.errorDescription || payment.failureReason || "Payment failed." : null,
  };
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

export function TxnStatusBadge({ status }) {
  const map = {
    Success: {
      cls: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    Pending: {
      cls: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
      icon: Clock3,
    },
    Failed: {
      cls: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
      icon: XCircle,
    },
    Refunded: {
      cls: "bg-violet-400/10 text-violet-600 ring-violet-400/30 dark:text-violet-400",
      icon: Undo2,
    },
  };
  const cfg = map[status] || map.Pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${cfg.cls}`}
    >
      <Icon size={12} />
      {status}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Tabs config
 * ---------------------------------------------------------------------- */

const TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "pending", label: "Pending" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];

const getTxnAmount = (t) => t.amount;

function matchesTab(row, tab) {
  switch (tab) {
    case "today":
      return row.isToday;
    case "pending":
      return row.status === "Pending";
    case "success":
      return row.status === "Success";
    case "failed":
      return row.status === "Failed";
    case "refunded":
      return row.status === "Refunded";
    default:
      return true;
  }
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Transaction() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Every page of payments (the endpoint only filters by outlet), so tabs,
  // filters, KPIs and export below run client-side over the full set.
  const {
    data: paymentsRes,
    isPending: loading,
    isFetching,
    error,
    refetch,
  } = useAllVoucherClaimPayments();
  const loadError = error?.message ?? "";
  const transactions = useMemo(
    () => (paymentsRes?.data?.data ?? []).map(normalizeClaimPayment),
    [paymentsRes]
  );

  const stats = useMemo(() => {
    const today = transactions.filter((t) => t.isToday);
    const pending = transactions.filter((t) => t.status === "Pending");
    const success = transactions.filter((t) => t.status === "Success");
    const failed = transactions.filter((t) => t.status === "Failed");
    const refunded = transactions.filter((t) => t.status === "Refunded");
    const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
    return {
      total: { amount: sum(transactions), count: transactions.length },
      today: { amount: sum(today), count: today.length },
      pending: { amount: sum(pending), count: pending.length },
      success: { amount: sum(success), count: success.length },
      failed: { amount: sum(failed), count: failed.length },
      refunded: { amount: sum(refunded), count: refunded.length },
    };
  }, [transactions]);

  const kpis = useMemo(() => {
    const summarize = (rows) => {
      const success = rows.filter((r) => r.status === "Success");
      const revenue = success.reduce((s, r) => s + r.amount, 0);
      return {
        revenue,
        count: rows.length,
        aov: success.length ? revenue / success.length : 0,
        successRate: rows.length ? (success.length / rows.length) * 100 : 0,
      };
    };
    const all = summarize(transactions);
    const { cur, prev } = weekOverWeek(transactions, summarize);
    return {
      ...all,
      revenueTrend: pctChange(cur.revenue, prev.revenue),
      countTrend: pctChange(cur.count, prev.count),
      aovTrend: pctChange(cur.aov, prev.aov),
      // Percentage-point difference, not a relative change.
      successRateTrend: prev.count ? cur.successRate - prev.successRate : cur.count ? null : 0,
    };
  }, [transactions]);

  const successfulTxns = useMemo(() => transactions.filter((t) => t.status === "Success"), [transactions]);

  const methodMix = useMemo(() => {
    const counts = {};
    transactions.forEach((t) => {
      const method = orText(t.method, MISSING.method);
      counts[method] = (counts[method] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [transactions]);

  // Filter options come from the methods actually present in the data, so
  // every option matches at least one row.
  const methodOptions = useMemo(() => ["All", ...methodMix.map((m) => m.name).sort()], [methodMix]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const inTab = matchesTab(t, activeTab);
      const inMethod = methodFilter === "All" || orText(t.method, MISSING.method) === methodFilter;
      const inSearch =
        !q ||
        t.razorpayPaymentId.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.customerId.toLowerCase().includes(q) ||
        t.customerUniqueId.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.reference.toLowerCase().includes(q);
      const inDateFrom = !dateFrom || t.date >= dateFrom;
      const inDateTo = !dateTo || t.date <= dateTo;
      return inTab && inMethod && inSearch && inDateFrom && inDateTo;
    });
  }, [transactions, activeTab, methodFilter, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Every scalar field on the normalized row — nothing left out — so the
  // export is a full data dump, not a curated subset of columns.
  const handleExport = () => {
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label || "transactions";
    const filename = `${tabLabel.replace(/\s+/g, "_").toLowerCase()}_${todayStr()}`;
    downloadCsv(filename, [
      { label: "Payment Id", key: "id" },
      { label: "Claim Id", key: "claimId" },
      { label: "Razorpay Payment Id", key: "razorpayPaymentId" },
      { label: "Vendor", key: "vendor" },
      { label: "Customer", key: "customer" },
      { label: "Customer Id", key: "customerId" },
      { label: "Customer Unique Id", key: "customerUniqueId" },
      { label: "Customer Phone", key: "customerPhone" },
      { label: "Date", key: "date" },
      { label: "Time", key: "time" },
      { label: "Amount", key: "amount" },
      { label: "Method", key: "method" },
      { label: "Status", key: "status" },
      { label: "Is Today", value: (r) => (r.isToday ? "Yes" : "No") },
      { label: "Reference", key: "reference" },
      { label: "Failure Reason", value: (r) => r.failureReason || "" },
    ], filtered);
  };

  const columns = [
    { key: "razorpayPaymentId", label: "Payment Id", render: (r) => (
      <button
        onClick={() => navigate(`/transaction/${r.claimId}`)}
        className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
      >
        <ValueOr value={r.razorpayPaymentId} fallback={MISSING.id} />
      </button>
    ) },
    { key: "vendor", label: "Vendor", render: (r) => <ValueOr value={r.vendor} fallback="No brand" /> },
    { key: "customer", label: "Customer", render: (r) => <ValueOr value={r.customer} fallback={MISSING.name} /> },
    {
      key: "date",
      label: "Date",
      render: (r) => !r.date ? (
        <ValueOr value={null} fallback={MISSING.date} />
      ) : (
        <span>
          {formatDate(r.date)}{" "}
          {r.isToday && (
            <span className="ml-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
              Today
            </span>
          )}
          <span className="ml-1 text-neutral-500">· {orText(r.time, "Time not recorded")}</span>
        </span>
      ),
    },
    { key: "method", label: "Method", render: (r) => <ValueOr value={r.method} fallback={MISSING.method} /> },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (r) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{inr(r.amount)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <TxnStatusBadge status={r.status} />,
    },
    {
      key: "reference",
      label: "Reference",
      render: (r) => (
        <span className="text-neutral-500"><ValueOr value={r.reference} fallback="No reference" /></span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (r) => (
        <button
          onClick={() => navigate(`/transaction/${r.claimId}`)}
          aria-label="View transaction details"
          title="View details"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Transactions
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Track every payment transaction across vendors — today's,
              pending, successful and failed.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Wallet} label="Total Revenue" value={inr(kpis.revenue)} trend={kpis.revenueTrend} />
          <KpiCard icon={ArrowLeftRight} label="Transactions" value={kpis.count.toLocaleString("en-IN")} trend={kpis.countTrend} />
          <KpiCard icon={Receipt} label="Avg. Order Value" value={inr(kpis.aov)} trend={kpis.aovTrend} />
          <KpiCard
            icon={CheckCircle2}
            label="Success Rate"
            value={`${kpis.successRate.toFixed(1)}%`}
            trend={kpis.successRateTrend}
            trendSuffix=" pts"
          />
        </div>

        {/* Revenue overview + payment method mix */}
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DailyBarsCard
            className="lg:col-span-2"
            title="Revenue Overview"
            subtitle="Successful payments per day"
            icon={BarChart3}
            rows={successfulTxns}
            getValue={getTxnAmount}
            countLabel="txn"
            emptyText="No successful payments in this period."
            gradientId="txnRevenueBar"
          />
          <MixCard
            title="Payment method mix"
            icon={CreditCard}
            total={transactions.length}
            totalLabel="transactions"
            items={methodMix}
            emptyText="No transactions yet."
          />
        </div>

        <PillTabs
          tabs={TABS.map((t) => ({ ...t, count: t.key === "all" ? stats.total.count : stats[t.key]?.count }))}
          active={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPage(1);
          }}
        />

        {/* Toolbar — search, method filter, date range and export share one
            wrapping row, matching Settlement/Refund's filter layout. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search payment id, vendor, customer, reference..."
              className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 sm:w-64"
            />
          </div>
          <SelectDropdown
            value={methodFilter}
            options={methodOptions}
            icon={Filter}
            onChange={(m) => {
              setMethodFilter(m);
              setPage(1);
            }}
          />
          <DateRangeFilter
            startDate={dateFrom}
            endDate={dateTo}
            onStartChange={(v) => {
              setDateFrom(v);
              setPage(1);
            }}
            onEndChange={(v) => {
              setDateTo(v);
              setPage(1);
            }}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
              setPage(1);
            }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <Loader label="Loading transactions…" />
        ) : loadError ? (
          <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load transactions"
              description={`${loadError} — check your connection and try again.`}
              action={{ label: "Try again", onClick: () => refetch() }}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={pageRows}
            emptyIcon={transactions.length ? "search" : "transaction"}
            emptyTitle={transactions.length ? "No transactions match your filters" : "No transactions yet"}
            emptyDescription={
              transactions.length
                ? "No voucher claims match this tab, date range, payment method or search. Try widening the filters."
                : "Voucher claims show up here as soon as customers start paying at outlets."
            }
          />
        )}

        {/* Pagination */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-[12.5px] text-neutral-500">
            Rows per page
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-neutral-800 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="ml-2">
              Showing {pageRows.length} of {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium ${
                  page === n
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}