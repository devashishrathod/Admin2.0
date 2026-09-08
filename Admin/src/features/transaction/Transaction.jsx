import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  Clock3,
  XCircle,
  Wallet,
  Loader2,
  AlertTriangle,
  ScanLine,
  ArrowRight,
  Eye,
} from "lucide-react";
import { getVoucherClaimPayments, getVoucherClaimByCode } from "./services/TransactionApi";
import {
  todayStr,
  formatDate,
  fmtTime,
  normalizeClaimStatus,
  formatPaymentMethod,
  inr,
} from "./transactionUtils";

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 ${alignClass(
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
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-neutral-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className={`transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
                    row.isToday ? "bg-cyan-400/[0.04]" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-5 py-4 text-neutral-700 dark:text-neutral-300 ${alignClass(
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

const PAYMENT_METHODS = ["UPI", "Debit Card", "Credit Card", "Net Banking", "Wallet"];

// Normalizes one real voucher-claim payment record (GET
// /voucher-claims/payments) into the flat row shape this page's table/
// stats expect. `customerId` is only ever a raw id — the platform's users
// have no `name` field (WhatsApp-OTP login only), so "Customer" shows the
// id rather than a fabricated name. `claimId` (the redemption's own id,
// `voucher.claimId` here) is what routes to the details page (GET
// /voucher-claims/:claimId) — never shown in the UI; the visible
// "Payment ID" is the gateway's `razorpayPaymentId`.
function normalizeClaimPayment(raw) {
  const ts = raw.createdAt || raw.verifiedAt || null;
  const d = ts ? new Date(ts) : null;
  const dateStr = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : todayStr();

  const status = normalizeClaimStatus(raw.status);

  return {
    id: raw._id || "—",
    claimId: raw.voucher?.claimId || raw._id || "—",
    razorpayPaymentId: raw.razorpayPaymentId || "—",
    vendor: raw.brand?.brandName || "—",
    customer: raw.customerId || "—",
    date: dateStr,
    time: d && !Number.isNaN(d.getTime()) ? fmtTime(ts) : "—",
    amount: Number(raw.amount) || 0,
    method: formatPaymentMethod(raw.paymentMethod),
    status,
    isToday: dateStr === todayStr(),
    reference: raw.invoiceId || "—",
    failureReason: status === "Failed" ? raw.errorDescription || raw.failureReason || "Payment failed." : null,
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

function StatCard({ icon: Icon, label, amount, sub, tone = "emerald", live }) {
  const toneCls = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    cyan: "text-cyan-600 dark:text-cyan-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <Icon size={15} className={toneCls} />
        {label}
        {live && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </div>
      <div className="mt-3 text-[22px] font-semibold text-neutral-900 dark:text-neutral-50">
        {inr(amount)}
      </div>
      <div className="mt-1 text-[12px] text-neutral-500">{sub}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * CSV export
 * ---------------------------------------------------------------------- */

function exportToCsv(rows, filename) {
  if (!rows.length) return;
  const headers = [
    "Payment Id",
    "Vendor",
    "Customer",
    "Date",
    "Time",
    "Amount",
    "Payment Method",
    "Status",
    "Reference",
    "Failure Reason",
  ];
  const escapeCell = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.razorpayPaymentId,
        r.vendor,
        r.customer,
        r.date,
        r.time,
        r.amount,
        r.method,
        r.status,
        r.reference,
        r.failureReason || "",
      ]
        .map(escapeCell)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
 * Tabs config
 * ---------------------------------------------------------------------- */

const TABS = [
  { key: "all", label: "All Transactions" },
  { key: "today", label: "Today Transaction" },
  { key: "pending", label: "Pending Transaction" },
  { key: "success", label: "Success Transaction" },
  { key: "failed", label: "Failed Transaction" },
];

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
    default:
      return true;
  }
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Transaction() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [claimCode, setClaimCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getVoucherClaimPayments({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? []).map(normalizeClaimPayment);
      setTransactions(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const stats = useMemo(() => {
    const today = transactions.filter((t) => t.isToday);
    const pending = transactions.filter((t) => t.status === "Pending");
    const success = transactions.filter((t) => t.status === "Success");
    const failed = transactions.filter((t) => t.status === "Failed");
    const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);
    return {
      total: { amount: sum(transactions), count: transactions.length },
      today: { amount: sum(today), count: today.length },
      pending: { amount: sum(pending), count: pending.length },
      success: { amount: sum(success), count: success.length },
      failed: { amount: sum(failed), count: failed.length },
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const inTab = matchesTab(t, activeTab);
      const inMethod = methodFilter === "All" || t.method === methodFilter;
      const inSearch =
        !q ||
        t.razorpayPaymentId.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.customer.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q);
      return inTab && inMethod && inSearch;
    });
  }, [transactions, activeTab, methodFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleExport = () => {
    const tabLabel = TABS.find((t) => t.key === activeTab)?.label || "transactions";
    const filename = `${tabLabel.replace(/\s+/g, "_").toLowerCase()}_${todayStr()}.csv`;
    exportToCsv(filtered, filename);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = claimCode.trim();
    if (!code) return;
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const res = await getVoucherClaimByCode(code);
      const raw = res?.data ?? res;
      const claim = raw?.claim ?? raw;
      if (!claim) throw new Error("No claim found for this code.");
      setVerifyResult({
        claimId: claim._id || raw?.payment?.voucher?.claimId || null,
        claimCode: claim.claimCode || code,
        status: claim.status || "—",
        voucherName: claim.voucherSnapshot?.name || "—",
        brandName: claim.brandSnapshot?.name || raw?.brand?.brandName || "—",
        outletId: claim.outletSnapshot?.uniqueId || raw?.outlet?.uniqueId || "—",
        billAmount: claim.billAmount ?? claim.pricing?.billAmount ?? null,
      });
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const columns = [
    { key: "razorpayPaymentId", label: "Payment Id", render: (r) => (
      <button
        onClick={() => navigate(`/transaction/${r.claimId}`)}
        className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
      >
        {r.razorpayPaymentId}
      </button>
    ) },
    { key: "vendor", label: "Vendor" },
    { key: "customer", label: "Customer" },
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span>
          {formatDate(r.date)}{" "}
          {r.isToday && (
            <span className="ml-1 rounded-full bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
              Today
            </span>
          )}
          <span className="ml-1 text-neutral-500">· {r.time}</span>
        </span>
      ),
    },
    { key: "method", label: "Method" },
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
        <span className="text-neutral-500">{r.reference}</span>
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
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
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
              onClick={fetchTransactions}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Verify claim code (counter verification) */}
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5 dark:border-neutral-800">
              <ScanLine size={15} className="shrink-0 text-neutral-500" />
              <input
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value)}
                placeholder="Verify a claim code (e.g. TD-W46DVM)…"
                className="w-full bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
              />
            </div>
            <button
              type="submit"
              disabled={verifyLoading || !claimCode.trim()}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifyLoading ? <Loader2 size={15} className="animate-spin" /> : <ScanLine size={15} />}
              Verify
            </button>
          </form>

          {verifyError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {verifyError}
            </div>
          )}

          {verifyResult && (
            <div className="mt-3 flex flex-col gap-3 rounded-xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
                <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-50">
                  {verifyResult.claimCode}
                </span>
                <span className="text-neutral-500">{verifyResult.voucherName}</span>
                <span className="text-neutral-500">{verifyResult.brandName}</span>
                <span className="text-neutral-500">Outlet {verifyResult.outletId}</span>
                {verifyResult.billAmount != null && (
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">
                    {inr(verifyResult.billAmount)}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    verifyResult.status === "REDEEMED"
                      ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {verifyResult.status}
                </span>
              </div>
              {verifyResult.claimId && (
                <button
                  onClick={() => navigate(`/transaction/${verifyResult.claimId}`)}
                  className="flex items-center gap-1 self-start text-[12.5px] font-medium text-emerald-600 hover:underline dark:text-emerald-400 sm:self-auto"
                >
                  View Full Timeline
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            icon={Wallet}
            label="Total"
            amount={stats.total.amount}
            sub={`${stats.total.count} transactions`}
          />
          <StatCard
            icon={CalendarClock}
            label="Today"
            amount={stats.today.amount}
            sub={`${stats.today.count} transactions`}
            tone="cyan"
            live
          />
          <StatCard
            icon={Clock3}
            label="Pending"
            amount={stats.pending.amount}
            sub={`${stats.pending.count} transactions`}
            tone="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Success"
            amount={stats.success.amount}
            sub={`${stats.success.count} transactions`}
            tone="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Failed"
            amount={stats.failed.amount}
            sub={`${stats.failed.count} transactions`}
            tone="red"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          {TABS.map((t) => {
            const count =
              t.key === "all"
                ? stats.total.count
                : stats[t.key === "today" ? "today" : t.key]?.count;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    active
                      ? "bg-neutral-950/20 text-neutral-950"
                      : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search payment id, vendor, customer, reference..."
              className="w-72 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-white px-1 py-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <Filter size={14} className="ml-1.5 text-neutral-500" />
              {["All", ...PAYMENT_METHODS].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMethodFilter(m);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    methodFilter === m
                      ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading transactions…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load transactions: {loadError}
          </div>
        ) : (
          <Table
            columns={columns}
            data={pageRows}
            emptyMessage="No transactions match your filters."
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