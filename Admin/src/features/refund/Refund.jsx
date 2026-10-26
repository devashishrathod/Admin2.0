import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Wallet,
  Landmark,
  Upload,
  Loader2,
  AlertTriangle,
  X,
  Check,
  Ban,
  Eye,
  Download,
  BarChart3,
  RotateCcw,
  Percent,
  ListChecks,
} from "lucide-react";
import { approveRefund, rejectRefund, payRefund, payToBank, confirmBankPayout } from "./services/RefundApi";
import { useAllRefunds } from "./queries/refundQueries";
import { queryKeys } from "../../lib/query";
import BulkActionModal from "../../components/common/BulkActionModal";
import BulkSelectBar from "../../components/common/BulkSelectBar";
import StatusStepButton from "../../components/common/StatusStepButton";
import { canAdminDecide, needsOverrideReason, isAdminApproved, approvedPatch, refundMethodLabel } from "./refundUtils";
import { formatDate, fmtTime, inr, todayStr } from "../transaction/transactionUtils";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { downloadCsv } from "../../utils/exportTable";
import { KpiCard, DailyBarsCard, MixCard, PillTabs } from "../../components/common/Overview";
import { pctChange, weekOverWeek, localDateStr } from "../../utils/overviewStats";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, orText } from "../../utils/helpers";

/* -------------------------------------------------------------------------
 * Shared Table — mirrors Transaction.jsx's local table so this page keeps
 * the exact same look and feel.
 * ---------------------------------------------------------------------- */

function Table({
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
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

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


function bucketRefundStatus(status) {
  switch (status) {
    case "APPROVED":
    case "ADMIN_APPROVED":
    case "ADMIN_OVERRIDE":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "ADMIN_REJECTED":
      return "rejected";
    // The customer took it back — nobody rejected it, so it stays out of
    // the Rejected tab and the approval rate.
    case "CANCELLED":
    case "WITHDRAWN":
      return "withdrawn";
    // FAILED stays isOpen ("Refund failed — we are on it") and needs the
    // admin to retry, so it lives in Pending — refundTone still colours
    // its pill red. VENDOR_APPROVED / VENDOR_REJECTED / VENDOR_TIMEOUT all
    // still wait on the admin (release, override or reject), so they stay
    // Pending too — the vendor's yes is not the refund's approval.
    default:
      return "pending";
  }
}

// Refund status → pill colour for StatusStepButton.
function refundTone(status) {
  if (status === "FAILED") return "red";
  if (isAdminApproved(status)) return "sky";
  if (status === "PROCESSING") return "violet";
  return { approved: "emerald", rejected: "red", pending: "amber", withdrawn: "neutral" }[bucketRefundStatus(status)];
}

function normalizeRefundRow(raw) {
  // No usable timestamp → no date (shown as "—"), never "today".
  const ts = raw.createdAt || null;
  const dateStr = localDateStr(ts);
  const status = String(raw.status || "PENDING").toUpperCase();
  const split = raw.split || {};

  return {
    id: raw._id || "—",
    claimId: raw.claimId || "—",
    transactionId: raw.transactionId || "—",
    claimCode: raw.claimCode || "—",
    brandId: raw.brandId || "—",
    subBrandId: raw.subBrandId || "",
    customerId: raw.customerId || "—",
    date: dateStr,
    time: dateStr ? fmtTime(ts) : "—",
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
    canDecide: canAdminDecide({ isOpen: raw.isOpen, status }),
    needsOverride: needsOverrideReason(status),
    canWithdraw: Boolean(raw.canWithdraw),
    // Not real API flags — inferred from status + method, the same rules
    // RefundDetails uses for its action buttons:
    //  - gateway refund, approved/overridden (or failed) → /pay
    //  - manual-bank refund, approved or bank details on file → /pay-to-bank
    //  - manual-bank refund with an open payout leg (PROCESSING) → confirm UTR
    canPay: raw.isOpen !== false && raw.method !== "MANUAL_BANK" && (isAdminApproved(status) || status === "FAILED"),
    canPayToBank:
      raw.method === "MANUAL_BANK" &&
      raw.isOpen !== false &&
      !["PROCESSING", "COMPLETED"].includes(status) &&
      !["rejected", "withdrawn"].includes(bucketRefundStatus(status)) &&
      (isAdminApproved(status) || Boolean(raw.customerBankAccountId)),
    canConfirmBankPayout: status === "PROCESSING" && raw.method === "MANUAL_BANK",
    canRequestBankDetails: isAdminApproved(status),
    razorpayRefundId: raw.razorpayRefundId || "—",
    completedAt: raw.completedAt || null,
    adminDecisionAt: raw.adminDecisionAt || null,
    adminNote: raw.adminNote || "",
    vendorRespondBy: raw.vendorRespondBy || null,
    vendorDecisionAt: raw.vendorDecisionAt || null,
    vendorDecisionBy: raw.vendorDecisionBy || "",
    vendorNote: raw.vendorNote || "",
    updatedAt: raw.updatedAt || null,
    remindersSent: Number(raw.remindersSent) || 0,
    attemptCount: Number(raw.attemptCount) || 0,
    isOverride: Boolean(raw.isOverride),
    split,
  };
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const getRequestedAmount = (r) => r.requestedAmount;

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

// Over a vendor's "no" or silence the approve is an override: the text
// is sent as the required `overrideReason` instead of an optional note.
function ApproveRefundModal({ refund, onClose, onSubmit, submitting, error }) {
  const [note, setNote] = useState("");
  const override = refund.needsOverride;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
              {override ? "Override & Approve Refund" : "Approve Refund"}
            </h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Claim <span className="font-mono text-neutral-700 dark:text-neutral-300">{orText(refund.claimCode, MISSING.id)}</span> · Requested{" "}
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

        {override && (
          <p className="mb-3 rounded-xl bg-amber-400/10 px-3.5 py-2.5 text-[12.5px] text-amber-700 dark:text-amber-400">
            {refund.status === "VENDOR_TIMEOUT"
              ? "The outlet never answered. Say why you are approving it yourself."
              : "The outlet rejected this refund. Say why you are overruling it."}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            {override ? (
              <>
                Override reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
              </>
            ) : (
              "Note (optional)"
            )}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Customer ki baat sahi hai - approve."
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
            disabled={submitting || (override && !note.trim())}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {override ? "Override & Approve" : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Confirm before triggering the gateway refund (PATCH .../pay). If the
   gateway can't process it, the error shows here and the admin can switch
   to the bank-transfer flow from the refund's detail page. */
function PayRefundModal({ refund, onClose, onSubmit, submitting, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
          {refund.status === "FAILED" ? "Retry refund payment?" : "Pay refund?"}
        </h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          Claim <span className="font-mono text-neutral-700 dark:text-neutral-300">{orText(refund.claimCode, MISSING.id)}</span> ·{" "}
          {inr(refund.approvedAmount ?? refund.requestedAmount)} will be refunded to the customer through the payment gateway.
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {error}
              <span className="mt-1 block text-neutral-500">You can pay it by bank transfer from the refund's detail page instead.</span>
            </span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
            Pay Refund
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
              Claim <span className="font-mono text-neutral-700 dark:text-neutral-300">{orText(refund.claimCode, MISSING.id)}</span> · Requested{" "}
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
            Reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. Bill aur claim match nahi kar rahe."
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
            disabled={submitting || !note.trim()}
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
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "withdrawn", label: "Withdrawn" },
];

function matchesTab(row, tab) {
  if (tab === "all") return true;
  return row.statusBucket === tab;
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

// Every page of refunds; tabs, filters and pagination are client-side.
const WORKLIST_PARAMS = {};

export default function Refund() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: worklistRes,
    isPending: loading,
    isFetching,
    error,
    refetch,
  } = useAllRefunds(WORKLIST_PARAMS);
  const loadError = error?.message ?? "";
  const refunds = useMemo(
    () =>
      (worklistRes?.data?.data ?? []).map((raw) => {
        const row = normalizeRefundRow(raw);
        // `_patch` = optimistic overrides from patchRefund; the refetch the
        // write triggers replaces the raw row, dropping it.
        return raw._patch
          ? { ...row, ...raw._patch, statusBucket: bucketRefundStatus(raw._patch.status ?? row.status) }
          : row;
      }),
    [worklistRes]
  );
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  // Instant update of one row after an action succeeds. The flags are
  // derived (not raw API fields), so they ride on the cached raw row as
  // `_patch`; the refetch the interceptor already started brings the
  // server's real values.
  const patchRefund = (id, patch) =>
    queryClient.setQueryData(queryKeys.refunds.view("all", WORKLIST_PARAMS), (prev) =>
      prev?.data?.data
        ? {
            ...prev,
            data: {
              ...prev.data,
              data: prev.data.data.map((raw) =>
                raw._id === id ? { ...raw, _patch: { ...raw._patch, ...patch } } : raw
              ),
            },
          }
        : prev
    );
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const stats = useMemo(() => {
    const pending = refunds.filter((r) => r.statusBucket === "pending");
    const approved = refunds.filter((r) => r.statusBucket === "approved");
    const rejected = refunds.filter((r) => r.statusBucket === "rejected");
    const withdrawn = refunds.filter((r) => r.statusBucket === "withdrawn");
    const sum = (rows) => rows.reduce((s, r) => s + r.requestedAmount, 0);
    return {
      all: { amount: sum(refunds), count: refunds.length },
      pending: { amount: sum(pending), count: pending.length },
      approved: { amount: sum(approved), count: approved.length },
      rejected: { amount: sum(rejected), count: rejected.length },
      withdrawn: { amount: sum(withdrawn), count: withdrawn.length },
    };
  }, [refunds]);

  // Week-over-week KPIs. Requests and requested amount going up is bad
  // news, so those trend badges render inverted (red when rising).
  const kpis = useMemo(() => {
    const summarize = (rows) => {
      const approved = rows.filter((r) => r.statusBucket === "approved");
      // Decided = approved or rejected; withdrawn requests were never decided.
      const decided = rows.filter((r) => r.statusBucket === "approved" || r.statusBucket === "rejected");
      return {
        requested: rows.reduce((s, r) => s + r.requestedAmount, 0),
        count: rows.length,
        approvedAmount: approved.reduce((s, r) => s + (r.approvedAmount ?? r.requestedAmount), 0),
        approvalRate: decided.length ? (approved.length / decided.length) * 100 : 0,
        decided: decided.length,
      };
    };
    const all = summarize(refunds);
    const { cur, prev } = weekOverWeek(refunds, summarize);
    return {
      ...all,
      requestedTrend: pctChange(cur.requested, prev.requested),
      countTrend: pctChange(cur.count, prev.count),
      approvedTrend: pctChange(cur.approvedAmount, prev.approvedAmount),
      approvalRateTrend: prev.decided ? cur.approvalRate - prev.approvalRate : cur.decided ? null : 0,
    };
  }, [refunds]);

  // Ranks every reason by how many refunds cite it, across all fetched
  // refunds (not just the current search/date filter) so this stays a
  // stable "what's driving refunds" summary. Past the top 6, the rest
  // fold into "Other" rather than crowding the card with long-tail rows.
  const reasonBreakdown = useMemo(() => {
    const map = new Map();
    refunds.forEach((r) => {
      const key = orText(r.reason, "Unspecified");
      map.set(key, (map.get(key) || 0) + 1);
    });
    const rows = Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    const TOP_N = 6;
    if (rows.length <= TOP_N) return rows;
    const otherCount = rows.slice(TOP_N - 1).reduce((s, r) => s + r.count, 0);
    return [...rows.slice(0, TOP_N - 1), { name: "Other", count: otherCount }];
  }, [refunds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      const inTab = matchesTab(r, activeTab);
      const inSearch =
        !q ||
        r.claimCode.toLowerCase().includes(q) ||
        r.brandId.toLowerCase().includes(q) ||
        r.subBrandId.toLowerCase().includes(q) ||
        r.reasonNote.toLowerCase().includes(q) ||
        r.vendorNote.toLowerCase().includes(q) ||
        r.customerId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      const inDateFrom = !dateFrom || r.date >= dateFrom;
      const inDateTo = !dateTo || r.date <= dateTo;
      return inTab && inSearch && inDateFrom && inDateTo;
    });
  }, [refunds, activeTab, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  // An action can move rows out of the tab and shrink the list — never
  // stay on a page past the end.
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  /* ---- Multi-select + bulk actions ----------------------------------- */
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkKind, setBulkKind] = useState(null);

  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());
  // Changing the tab, search or dates starts over on page 1 and drops the
  // selection, so bulk actions never touch rows that are no longer shown.
  const resetView = () => {
    setPage(1);
    clearSelection();
  };
  const selectedRows = refunds.filter((r) => selectedIds.has(r.id));

  // One entry per bulk action: who it applies to, what to fill in, the API
  // call, and how the row looks right after it succeeds.
  const BULK = {
    approve: {
      label: "Approve", title: "Approve refunds", icon: Check, input: "note",
      eligible: (r) => r.canDecide && !r.needsOverride,
      run: (r, p) => approveRefund(r.id, { note: p.text }),
      result: (r) => approvedPatch(r, false),
    },
    // Vendor rejected / timed out — needs a written override reason each.
    override: {
      label: "Override & Approve", title: "Override vendor and approve", icon: Check, input: "reason",
      eligible: (r) => r.canDecide && r.needsOverride,
      run: (r, p) => approveRefund(r.id, { overrideReason: p.text }),
      result: (r) => approvedPatch(r, true),
    },
    reject: {
      label: "Reject", title: "Reject refunds", icon: Ban, input: "reason", tone: "red",
      eligible: (r) => r.canDecide,
      run: (r, p) => rejectRefund(r.id, { note: p.text }),
      result: { status: "ADMIN_REJECTED", statusLabel: "Admin Rejected", canDecide: false, canPay: false, canPayToBank: false },
    },
    pay: {
      label: "Pay Refund", title: "Pay refunds (gateway)", icon: Wallet, input: "none",
      eligible: (r) => r.canPay,
      run: (r) => payRefund(r.id),
      result: { status: "PROCESSING", statusLabel: "Processing", canPay: false },
    },
    payToBank: {
      label: "Pay to Bank", title: "Start bank payouts", icon: Landmark, input: "none",
      eligible: (r) => r.canPayToBank,
      run: (r) => payToBank(r.id),
      result: { status: "PROCESSING", statusLabel: "Processing", canPayToBank: false, canConfirmBankPayout: true },
    },
    confirmBank: {
      label: "Confirm Bank Payout", title: "Confirm bank payouts", icon: Upload, input: "utr",
      eligible: (r) => r.canConfirmBankPayout,
      run: (r, p) => confirmBankPayout(r.id, p),
      result: { status: "COMPLETED", statusLabel: "Completed", canConfirmBankPayout: false },
    },
  };
  // "Select all" groups — every refund needing that next step, across pages.
  const SELECT_GROUPS = [
    { key: "decide", label: "Awaiting decision", match: (r) => r.canDecide },
    { key: "pay", label: "Ready to pay", match: (r) => r.canPay || r.canPayToBank },
    { key: "bank", label: "Bank payout open", match: (r) => r.canConfirmBankPayout },
  ];
  const bulkRows = bulkKind ? selectedRows.filter(BULK[bulkKind].eligible) : [];

  const runBulkOne = async (row, payload) => {
    const { run, result } = BULK[bulkKind];
    await run(row, payload);
    patchRefund(row.id, typeof result === "function" ? result(row) : result);
  };
  const closeBulk = () => {
    setBulkKind(null);
    clearSelection();
  };

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
      { label: "Sub Brand Id", key: "subBrandId" },
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
      { label: "Vendor Respond By", key: "vendorRespondBy" },
      { label: "Vendor Decision At", key: "vendorDecisionAt" },
      { label: "Vendor Decision By", key: "vendorDecisionBy" },
      { label: "Vendor Note", key: "vendorNote" },
      { label: "Updated At", key: "updatedAt" },
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

  const handleApprove = async (text) => {
    setActionSubmitting(true);
    setActionError("");
    try {
      const override = approveTarget.needsOverride;
      await approveRefund(approveTarget.id, override ? { overrideReason: text } : { note: text });
      // Flip the pill at once (Approved → next step Pay); the list refetches by itself.
      patchRefund(approveTarget.id, approvedPatch(approveTarget, override));
      setApproveTarget(null);
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
      patchRefund(rejectTarget.id, { status: "ADMIN_REJECTED", statusLabel: "Admin Rejected", canDecide: false, canPay: false });
      setRejectTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handlePay = async () => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await payRefund(payTarget.id);
      patchRefund(payTarget.id, { status: "PROCESSING", statusLabel: "Processing", canPay: false });
      setPayTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          aria-label="Select all on this page"
          checked={pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id))}
          onChange={(e) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              pageRows.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id)));
              return next;
            })
          }
          className="h-4 w-4 cursor-pointer accent-emerald-500"
        />
      ),
      width: "w-10",
      render: (r) => (
        <input
          type="checkbox"
          aria-label={`Select ${r.claimCode}`}
          checked={selectedIds.has(r.id)}
          onChange={() => toggleSelected(r.id)}
          className="h-4 w-4 cursor-pointer accent-emerald-500"
        />
      ),
    },
    {
      key: "claimCode",
      label: "Claim",
      render: (r) => (
        <button
          onClick={() => navigate(`/refund/${r.id}`)}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <ValueOr value={r.claimCode} fallback={MISSING.id} />
        </button>
      ),
    },
    {
      key: "brandId",
      label: "Brand",
      render: (r) => (
        <div className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400">
          <p><ValueOr value={r.brandId} fallback="No brand" /></p>
          {r.subBrandId && <p className="mt-0.5 text-[11px] text-neutral-400">Sub · {r.subBrandId}</p>}
        </div>
      ),
    },
    { key: "customerId", label: "Customer", render: (r) => <span className="font-mono text-[12px] text-neutral-500 dark:text-neutral-400"><ValueOr value={r.customerId} fallback="No customer" /></span> },
    {
      key: "reason",
      label: "Reason",
      render: (r) => (
        <div className="max-w-48">
          <p className="text-neutral-800 dark:text-neutral-100"><ValueOr value={r.reason} fallback={MISSING.reason} /></p>
          {r.reasonNote && (
            <p className="mt-0.5 truncate text-[11.5px] text-neutral-500" title={r.reasonNote}>
              {r.reasonNote}
            </p>
          )}
        </div>
      ),
    },
    { key: "method", label: "Method", render: (r) => <ValueOr value={refundMethodLabel(r.method)} fallback={MISSING.method} /> },
    {
      key: "vendorDecision",
      label: "Vendor Decision",
      render: (r) =>
        r.vendorDecisionAt ? (
          <div className="max-w-48">
            <p className="text-[12px] text-neutral-500">
              {formatDate(localDateStr(r.vendorDecisionAt))} · {fmtTime(r.vendorDecisionAt)}
            </p>
            {r.vendorNote && (
              <p className="mt-0.5 truncate text-[11.5px] text-neutral-700 dark:text-neutral-300" title={r.vendorNote}>
                “{r.vendorNote}”
              </p>
            )}
          </div>
        ) : r.vendorRespondBy ? (
          <span className="text-[12px] text-amber-600 dark:text-amber-400">
            Respond by {formatDate(localDateStr(r.vendorRespondBy))} · {fmtTime(r.vendorRespondBy)}
          </span>
        ) : (
          <span className="text-neutral-400">No response</span>
        ),
    },
    {
      key: "date",
      label: "Date",
      render: (r) => !r.date ? (
        <ValueOr value={null} fallback={MISSING.date} />
      ) : (
        <span>
          {formatDate(r.date)} <span className="ml-1 text-neutral-500">· {orText(r.time, "Time not recorded")}</span>
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
          {r.approvedAmount != null ? inr(r.approvedAmount) : r.statusBucket === "pending" ? "Not yet" : "Not approved"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      // Status pill doubles as the workflow button: Approve → Pay Refund
      // (gateway), or Pay to Bank → Confirm Payout (manual bank — those
      // steps need the details page's forms, so the pill opens it).
      render: (r) => {
        const step = r.canDecide
          ? r.needsOverride ? "Override" : "Approve"
          : r.canPay
          ? r.status === "FAILED" ? "Retry Pay" : "Pay Refund"
          : r.canPayToBank
          ? "Pay to Bank"
          : r.canConfirmBankPayout
          ? "Confirm Payout"
          : null;
        return (
          <StatusStepButton
            label={r.statusLabel || r.status}
            tone={refundTone(r.status)}
            stepLabel={step}
            onClick={() => {
              setActionError("");
              if (r.canDecide) setApproveTarget(r);
              else if (r.canPay) setPayTarget(r);
              else navigate(`/refund/${r.id}`);
            }}
          />
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.canDecide && (
            <button
              onClick={() => setRejectTarget(r)}
              aria-label="Reject refund"
              title="Reject"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Ban size={15} />
            </button>
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Refunds
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Review and action refund requests raised against redeemed vouchers.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* KPI cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Wallet} label="Total Requested" value={inr(kpis.requested)} trend={kpis.requestedTrend} invert />
          <KpiCard icon={RotateCcw} label="Refund Requests" value={kpis.count.toLocaleString("en-IN")} trend={kpis.countTrend} invert />
          <KpiCard icon={CheckCircle2} label="Approved Amount" value={inr(kpis.approvedAmount)} trend={kpis.approvedTrend} invert />
          <KpiCard
            icon={Percent}
            label="Approval Rate"
            value={`${kpis.approvalRate.toFixed(1)}%`}
            trend={kpis.approvalRateTrend}
            trendSuffix=" pts"
          />
        </div>

        {/* Refunds per day + reason mix */}
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DailyBarsCard
            className="lg:col-span-2"
            title="Refund Overview"
            subtitle="Requested refund amount per day"
            icon={BarChart3}
            rows={refunds}
            getValue={getRequestedAmount}
            countLabel="refunds"
            emptyText="No refund requests in this period."
            gradientId="refundDailyBar"
          />
          <MixCard
            title="Top refund reasons"
            icon={ListChecks}
            total={refunds.length}
            totalLabel="refunds"
            items={reasonBreakdown}
            emptyText="No refunds yet."
          />
        </div>

        <PillTabs
          tabs={TABS.map((t) => ({ ...t, count: stats[t.key]?.count }))}
          active={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            resetView();
          }}
        />

        {/* Toolbar — search, date range and export in one wrapping row,
            matching Settlement/Transaction's filter layout. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetView();
              }}
              placeholder="Search claim code, brand ID, customer ID, reason..."
              className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 sm:w-64"
            />
          </div>
          <DateRangeFilter
            startDate={dateFrom}
            endDate={dateTo}
            onStartChange={(v) => {
              setDateFrom(v);
              resetView();
            }}
            onEndChange={(v) => {
              setDateTo(v);
              resetView();
            }}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
              resetView();
            }}
          />
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex h-9.5 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <Loader label="Loading refunds…" />
        ) : loadError ? (
          <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load refunds"
              description={`${loadError} — check your connection and try again.`}
              action={{ label: "Try again", onClick: () => refetch() }}
            />
          </div>
        ) : (
          <>
          <BulkSelectBar
            groups={SELECT_GROUPS.map((g) => ({
              key: g.key,
              label: g.label,
              count: filtered.filter(g.match).length,
              onSelect: () => setSelectedIds(new Set(filtered.filter(g.match).map((r) => r.id))),
            }))}
            selectedCount={selectedIds.size}
            selectedTotal={inr(selectedRows.reduce((sum, r) => sum + (Number(r.requestedAmount) || 0), 0))}
            actions={Object.entries(BULK).map(([key, b]) => ({
              key,
              label: b.label,
              icon: b.icon,
              tone: b.tone,
              count: selectedRows.filter(b.eligible).length,
              onClick: () => setBulkKind(key),
            }))}
            onClear={clearSelection}
          />
          <Table columns={columns} data={pageRows} emptyIcon={refunds.length ? "search" : "refund"} emptyTitle={refunds.length ? "No refunds match your filters" : "No refund requests yet"} emptyDescription={refunds.length ? "No refund requests match this status or search. Try a different filter." : "Refund requests from customers show up here for review."} />
          </>
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
                  currentPage === n
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
      {bulkKind && (
        <BulkActionModal
          title={BULK[bulkKind].title}
          actionLabel={BULK[bulkKind].label}
          input={BULK[bulkKind].input}
          templateName={`refunds-${bulkKind}`}
          rows={bulkRows}
          getRef={(r) => r.claimCode !== "—" ? r.claimCode : r.id}
          getAmount={(r) => r.approvedAmount ?? r.requestedAmount}
          getSubtitle={(r) => orText(r.reason, MISSING.reason)}
          onRun={runBulkOne}
          onClose={closeBulk}
        />
      )}
      {payTarget && (
        <PayRefundModal
          refund={payTarget}
          onClose={() => {
            if (actionSubmitting) return;
            setPayTarget(null);
            setActionError("");
          }}
          onSubmit={handlePay}
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
