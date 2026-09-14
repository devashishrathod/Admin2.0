import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";
import {
  Search,
  RefreshCw,
  Clock3,
  CheckCircle2,
  XCircle,
  Wallet,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Ban,
  Eye,
  Download,
  BarChart3,
} from "lucide-react";
import { getRefundWorklist, approveRefund, rejectRefund } from "./services/RefundApi";
import { formatDate, fmtTime, inr, todayStr } from "../transaction/transactionUtils";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { downloadCsv } from "../../utils/exportTable";

/* -------------------------------------------------------------------------
 * Shared Table — mirrors Transaction.jsx's local table so this page keeps
 * the exact same look and feel.
 * ---------------------------------------------------------------------- */

function Table({ columns = [], data = [], emptyMessage = "No records found.", rowKey = "id" }) {
  const alignClass = (align) =>
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
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
                <td colSpan={columns.length} className="px-5 py-10 text-center text-neutral-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={row[rowKey] ?? rowIndex}
                  className="border-t border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-3.5 text-neutral-700 dark:text-neutral-300 ${alignClass(col.align)}`}
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
 * Real data — GET /refunds (see ./services/RefundApi). Confirmed real
 * response: { total, totalPages, page, limit, data: [...] }, each row a
 * flat refund document — no embedded brand/claim/outlet summaries, just
 * raw ids (claimId, transactionId, customerId, brandId) — so "Brand" and
 * "Customer" show the id rather than a fabricated name.
 * ---------------------------------------------------------------------- */

// "OUTLET_CLOSED" -> "Outlet Closed"
function humanizeEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Buckets the real status values into the 3 tabs/stat groups this page
// shows. COMPLETED/ADMIN_APPROVED (statusLabel "Refunded" / "Approved -
// processing") count as "approved". AWAITING_BANK_DETAILS still needs
// admin/customer follow-up, so it stays "pending".
function bucketRefundStatus(status) {
  switch (status) {
    case "APPROVED":
    case "ADMIN_APPROVED":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "ADMIN_REJECTED":
    case "FAILED":
    case "CANCELLED":
      return "rejected";
    default:
      return "pending";
  }
}

function normalizeRefundRow(raw) {
  const ts = raw.createdAt || null;
  const d = ts ? new Date(ts) : null;
  const dateStr = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : todayStr();
  const status = String(raw.status || "PENDING").toUpperCase();
  const split = raw.split || {};

  return {
    id: raw._id || "—",
    claimId: raw.claimId || "—",
    transactionId: raw.transactionId || "—",
    claimCode: raw.claimCode || "—",
    brandId: raw.brandId || "—",
    customerId: raw.customerId || "—",
    date: dateStr,
    time: d && !Number.isNaN(d.getTime()) ? fmtTime(ts) : "—",
    requestedAmount: Number(raw.requestedAmount) || 0,
    approvedAmount: raw.approvedAmount != null ? Number(raw.approvedAmount) : null,
    isFullRefund: Boolean(split.isFullRefund),
    reason: humanizeEnum(raw.reason),
    reasonNote: raw.reasonNote || "",
    method: raw.method || "—",
    status,
    statusLabel: raw.statusLabel || humanizeEnum(status),
    statusBucket: bucketRefundStatus(status),
    isOpen: Boolean(raw.isOpen),
    canDecide: Boolean(raw.canDecide),
    canWithdraw: Boolean(raw.canWithdraw),
    // Not real API flags — inferred from the confirmed status values:
    // once an admin has approved a refund it can be paid out via /pay, or
    // (if that fails, or it's a manual-bank refund) sent to
    // /request-bank-details instead. Both stay available until the
    // refund reaches a terminal state.
    canPay: status === "ADMIN_APPROVED",
    canRequestBankDetails: status === "ADMIN_APPROVED",
    razorpayRefundId: raw.razorpayRefundId || "—",
    completedAt: raw.completedAt || null,
    adminDecisionAt: raw.adminDecisionAt || null,
    adminNote: raw.adminNote || "",
    remindersSent: Number(raw.remindersSent) || 0,
    attemptCount: Number(raw.attemptCount) || 0,
    isOverride: Boolean(raw.isOverride),
    split,
  };
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function RefundStatusBadge({ status, statusLabel }) {
  const map = {
    approved: { cls: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400", icon: CheckCircle2 },
    rejected: { cls: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400", icon: XCircle },
    pending: { cls: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400", icon: Clock3 },
  };
  const cfg = map[bucketRefundStatus(status)] || map.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${cfg.cls}`}>
      <Icon size={12} />
      {statusLabel || status}
    </span>
  );
}

function StatCard({ icon: Icon, label, amount, sub, tone = "emerald" }) {
  const toneCls = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[tone];
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <Icon size={15} className={toneCls} />
        {label}
      </div>
      <div className="mt-3 text-[22px] font-semibold text-neutral-900 dark:text-neutral-50">{inr(amount)}</div>
      <div className="mt-1 text-[12px] text-neutral-500">{sub}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Top Refund Reasons — a single-series horizontal bar ranking every
 * refund reason by how many requests cite it, so an admin can see at a
 * glance what's actually driving refunds instead of digging through the
 * table row by row.
 * ---------------------------------------------------------------------- */

const REASON_BAR_COLOR = "#fbbf24"; // amber — this page's existing "needs attention" tone

function ReasonTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <p className="font-medium text-neutral-800 dark:text-neutral-100">{row.reason}</p>
      <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">
        {row.count} refund{row.count === 1 ? "" : "s"} · {inr(row.amount)} requested
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

function ApproveRefundModal({ refund, onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Approve Refund</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Claim <span className="font-mono text-neutral-700 dark:text-neutral-300">{refund.claimCode}</span> · Requested{" "}
              {inr(refund.requestedAmount)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Only the starter was wrong."
            className={inputClass}
          />
        </label>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note.trim())}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectRefundModal({ refund, onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Refund</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Claim <span className="font-mono text-neutral-700 dark:text-neutral-300">{refund.claimCode}</span> · Requested{" "}
              {inr(refund.requestedAmount)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Customer collected the order in full."
            className={inputClass}
          />
        </label>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(note.trim())}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Tabs config
 * ---------------------------------------------------------------------- */

const TABS = [
  { key: "all", label: "All Refunds" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function matchesTab(row, tab) {
  if (tab === "all") return true;
  return row.statusBucket === tab;
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Refund() {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getRefundWorklist({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? []).map(normalizeRefundRow);
      setRefunds(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const stats = useMemo(() => {
    const pending = refunds.filter((r) => r.statusBucket === "pending");
    const approved = refunds.filter((r) => r.statusBucket === "approved");
    const rejected = refunds.filter((r) => r.statusBucket === "rejected");
    const sum = (rows) => rows.reduce((s, r) => s + r.requestedAmount, 0);
    return {
      all: { amount: sum(refunds), count: refunds.length },
      pending: { amount: sum(pending), count: pending.length },
      approved: { amount: sum(approved), count: approved.length },
      rejected: { amount: sum(rejected), count: rejected.length },
    };
  }, [refunds]);

  // Ranks every reason by how many refunds cite it, across all fetched
  // refunds (not just the current search/date filter) so this stays a
  // stable "what's driving refunds" summary. Past the top 6, the rest
  // fold into "Other" rather than crowding the chart with long tail slices.
  const reasonBreakdown = useMemo(() => {
    const map = new Map();
    refunds.forEach((r) => {
      const key = r.reason || "Unspecified";
      const entry = map.get(key) || { reason: key, count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += r.requestedAmount;
      map.set(key, entry);
    });
    const rows = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const TOP_N = 6;
    if (rows.length <= TOP_N) return rows;
    const other = rows.slice(TOP_N - 1).reduce(
      (acc, r) => ({ reason: "Other", count: acc.count + r.count, amount: acc.amount + r.amount }),
      { reason: "Other", count: 0, amount: 0 }
    );
    return [...rows.slice(0, TOP_N - 1), other];
  }, [refunds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      const inTab = matchesTab(r, activeTab);
      const inSearch =
        !q ||
        r.claimCode.toLowerCase().includes(q) ||
        r.brandId.toLowerCase().includes(q) ||
        r.customerId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      const inDateFrom = !dateFrom || r.date >= dateFrom;
      const inDateTo = !dateTo || r.date <= dateTo;
      return inTab && inSearch && inDateFrom && inDateTo;
    });
  }, [refunds, activeTab, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Every scalar field on the normalized row, including the split ledger —
  // nothing left out — so the export is a full data dump, not a curated
  // subset of columns.
  const handleExport = () => {
    downloadCsv(`refunds_${todayStr()}`, [
      { label: "Refund Id", key: "id" },
      { label: "Claim Id", key: "claimId" },
      { label: "Transaction Id", key: "transactionId" },
      { label: "Claim Code", key: "claimCode" },
      { label: "Brand Id", key: "brandId" },
      { label: "Customer Id", key: "customerId" },
      { label: "Date", key: "date" },
      { label: "Time", key: "time" },
      { label: "Requested Amount", key: "requestedAmount" },
      { label: "Approved Amount", value: (r) => (r.approvedAmount != null ? r.approvedAmount : "") },
      { label: "Is Full Refund", value: (r) => (r.isFullRefund ? "Yes" : "No") },
      { label: "Reason", key: "reason" },
      { label: "Reason Note", key: "reasonNote" },
      { label: "Method", key: "method" },
      { label: "Status", key: "status" },
      { label: "Status Label", key: "statusLabel" },
      { label: "Is Open", value: (r) => (r.isOpen ? "Yes" : "No") },
      { label: "Can Decide", value: (r) => (r.canDecide ? "Yes" : "No") },
      { label: "Can Withdraw", value: (r) => (r.canWithdraw ? "Yes" : "No") },
      { label: "Can Pay", value: (r) => (r.canPay ? "Yes" : "No") },
      { label: "Can Request Bank Details", value: (r) => (r.canRequestBankDetails ? "Yes" : "No") },
      { label: "Razorpay Refund Id", key: "razorpayRefundId" },
      { label: "Completed At", key: "completedAt" },
      { label: "Admin Decision At", key: "adminDecisionAt" },
      { label: "Admin Note", key: "adminNote" },
      { label: "Reminders Sent", key: "remindersSent" },
      { label: "Attempt Count", key: "attemptCount" },
      { label: "Is Override", value: (r) => (r.isOverride ? "Yes" : "No") },
      { label: "Net Bill Refund", value: (r) => r.split?.netBillRefund ?? "" },
      { label: "Convenience Fee Refund", value: (r) => r.split?.convenienceFeeRefund ?? "" },
      { label: "Tax Refund", value: (r) => r.split?.taxRefund ?? "" },
      { label: "Commission Reversal", value: (r) => r.split?.commissionReversal ?? "" },
      { label: "Commission Tax Reversal", value: (r) => r.split?.commissionTaxReversal ?? "" },
      { label: "Commission Deduction Reversal", value: (r) => r.split?.commissionDeductionReversal ?? "" },
      { label: "Vendor Clawback", value: (r) => r.split?.vendorClawback ?? "" },
      { label: "Platform Promo Reversal", value: (r) => r.split?.platformPromoReversal ?? "" },
      { label: "Vendor Promo Reversal", value: (r) => r.split?.vendorPromoReversal ?? "" },
      { label: "Gateway Fee Absorbed", value: (r) => r.split?.gatewayFeeAbsorbed ?? "" },
      { label: "Total Refund (Split)", value: (r) => r.split?.totalRefund ?? "" },
    ], filtered);
  };

  const handleApprove = async (note) => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await approveRefund(approveTarget.id, { note });
      setApproveTarget(null);
      await fetchRefunds();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async (note) => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await rejectRefund(rejectTarget.id, { note });
      setRejectTarget(null);
      await fetchRefunds();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const columns = [
    {
      key: "claimCode",
      label: "Claim",
      render: (r) => (
        <button
          onClick={() => navigate(`/refund/${r.id}`)}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {r.claimCode}
        </button>
      ),
    },
    { key: "brandId", label: "Brand", render: (r) => <span className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">{r.brandId}</span> },
    { key: "customerId", label: "Customer", render: (r) => <span className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">{r.customerId}</span> },
    { key: "reason", label: "Reason" },
    { key: "method", label: "Method" },
    {
      key: "date",
      label: "Date",
      render: (r) => (
        <span>
          {formatDate(r.date)} <span className="ml-1 text-neutral-500">· {r.time}</span>
        </span>
      ),
    },
    {
      key: "requestedAmount",
      label: "Requested",
      align: "right",
      render: (r) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-50">
          {inr(r.requestedAmount)}
          {r.isFullRefund && (
            <span className="ml-1.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              Full
            </span>
          )}
        </span>
      ),
    },
    {
      key: "approvedAmount",
      label: "Approved",
      align: "right",
      render: (r) => (
        <span className={r.approvedAmount != null ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}>
          {r.approvedAmount != null ? inr(r.approvedAmount) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <RefundStatusBadge status={r.status} statusLabel={r.statusLabel} />,
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.canDecide && (
            <>
              <button
                onClick={() => setApproveTarget(r)}
                className="flex h-8 items-center gap-1 rounded-lg bg-emerald-400/10 px-2.5 text-[12px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
              >
                <Check size={13} />
                Approve
              </button>
              <button
                onClick={() => setRejectTarget(r)}
                className="flex h-8 items-center gap-1 rounded-lg bg-red-400/10 px-2.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-400/20 dark:text-red-400"
              >
                <Ban size={13} />
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => navigate(`/refund/${r.id}`)}
            aria-label="View refund details"
            title="View details"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400"
          >
            <Eye size={15} />
          </button>
        </div>
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
              Refunds
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Review and action refund requests raised against redeemed vouchers.
            </p>
          </div>
          <button
            onClick={fetchRefunds}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet} label="All Requests" amount={stats.all.amount} sub={`${stats.all.count} refunds`} />
          <StatCard
            icon={Clock3}
            label="Pending"
            amount={stats.pending.amount}
            sub={`${stats.pending.count} refunds`}
            tone="amber"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            amount={stats.approved.amount}
            sub={`${stats.approved.count} refunds`}
            tone="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Rejected"
            amount={stats.rejected.amount}
            sub={`${stats.rejected.count} refunds`}
            tone="red"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          {TABS.map((t) => {
            const count = stats[t.key === "all" ? "all" : t.key]?.count;
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

        {/* Toolbar — search, date range and export in one wrapping row,
            matching Settlement/Transaction's filter layout. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search claim code, vendor, customer, outlet..."
              className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 sm:w-64"
            />
          </div>
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
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex h-[38px] items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading refunds…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load refunds: {loadError}
          </div>
        ) : (
          <Table columns={columns} data={pageRows} emptyMessage="No refunds match your filters." />
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

        {/* Top Refund Reasons — a single stable place to see what's driving
            refunds the most, independent of the table's current search/tab
            filters. */}
        {reasonBreakdown.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
              <BarChart3 size={14} className="text-amber-500" />
              Top Refund Reasons
            </div>
            <p className="mb-4 text-[12px] text-neutral-500">
              Which reasons are driving the most refund requests, across all {refunds.length} refunds.
            </p>
            <ResponsiveContainer width="100%" height={Math.max(180, reasonBreakdown.length * 42)}>
              <BarChart data={reasonBreakdown} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#e1e0d9" strokeDasharray="0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={150}
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ReasonTooltip />} cursor={{ fill: "rgba(251, 191, 36, 0.08)" }} />
                <Bar dataKey="count" fill={REASON_BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#71717a" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {approveTarget && (
        <ApproveRefundModal
          refund={approveTarget}
          onClose={() => {
            setApproveTarget(null);
            setActionError("");
          }}
          onSubmit={handleApprove}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}
      {rejectTarget && (
        <RejectRefundModal
          refund={rejectTarget}
          onClose={() => {
            setRejectTarget(null);
            setActionError("");
          }}
          onSubmit={handleReject}
          submitting={actionSubmitting}
          error={actionError}
        />
      )}
    </div>
  );
}
