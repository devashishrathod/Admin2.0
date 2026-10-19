import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Ticket as TicketIcon,
  Wallet,
  Landmark,
  Receipt,
  CheckCircle2,
  Clock3,
  Upload,
  RefreshCw,
  Eye,
  PauseCircle,
  PlayCircle,
  Ban,
  RotateCcw,
  CalendarClock,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Percent,
  Users2,
  History,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  getSettlements,
  getSettlementById,
  getSettlementTransactions,
  raiseTicket,
  approveSettlement,
  startSettlementPayout,
  confirmSettlementPayout,
  retrySettlementPayout,
  reverseSettlementPayout,
  holdSettlement,
  unholdSettlement,
  cancelSettlement,
} from "./services/SettlementApi";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import BulkActionModal from "../../components/common/BulkActionModal";
import BulkSelectBar from "../../components/common/BulkSelectBar";
import StatusStepButton from "../../components/common/StatusStepButton";
import { mapSettlementStatus, SETTLEMENT_TONES } from "./settlementUtils";
import SelectDropdown from "../../components/common/SelectDropdown";
import { downloadCsv } from "../../utils/exportTable";
import { todayStr } from "../transaction/transactionUtils";
import { KpiCard, DailyBarsCard, MixCard, PillTabs } from "../../components/common/Overview";
import { pctChange, weekOverWeek } from "../../utils/overviewStats";
import Loader from "../../components/common/Loader";


/* -------------------------------------------------------------------------
 * T+2 day settlement logic
 * -------------------------------------------------------------------------
 * Rule: payment customer se jis din aata hai (paymentReceivedDate = T),
 * uska settlement 2 calendar days baad due hota hai (T+2).
 *  - dueDate == today            -> "Today" (Today Settlement)
 *  - dueDate < today             -> "Overdue by Xd" (already due, ab tak settle nahi hua)
 *  - dueDate == today + 1        -> "Tomorrow"
 *  - dueDate > today             -> "In X days" (abhi pending, 2 din complete nahi hue)
 *  - status === "Settlement done"-> "Completed" (already settled)
 * Change SETTLEMENT_CYCLE_DAYS agar aapko T+1 / T+3 chahiye.
 * ---------------------------------------------------------------------- */

const SETTLEMENT_CYCLE_DAYS = 2;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "28 Feb 2025" -> Date object. Returns null for missing/"—" dates.
function parseDMY(str) {
  if (!str || str === "—") return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const monthIdx = MONTHS.indexOf(parts[1]);
  const year = parseInt(parts[2], 10);
  if (monthIdx === -1 || Number.isNaN(day) || Number.isNaN(year)) return null;
  return new Date(year, monthIdx, day);
}

// Date object -> "28 Feb 2025"
function formatDMY(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Whole calendar days between two dates (b - a)
function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b) - startOfDay(a)) / MS_PER_DAY);
}

/**
 * Core T+2 eligibility calculator.
 * Given a settlement row, works out its due date and a human label.
 */
function getSettlementSchedule(settlement, today = new Date()) {
  const received = parseDMY(settlement.paymentReceivedDate);
  if (!received) {
    return {
      dueDate: null,
      dueLabel: "—",
      isToday: false,
      isOverdue: false,
      isPending: false,
      daysLeft: null,
    };
  }

  const dueDate = addDays(received, SETTLEMENT_CYCLE_DAYS);
  const daysLeft = daysBetween(today, dueDate); // dueDate - today

  if (settlement.status === "Settlement done") {
    return { dueDate, dueLabel: "Completed", isToday: false, isOverdue: false, isPending: false, daysLeft };
  }
  // Terminal/paused states — a due-date countdown isn't meaningful once a
  // settlement has left the normal pending → processing → paid path.
  if (["Cancelled", "On hold", "Reversed", "Failed", "Abandoned"].includes(settlement.status)) {
    return { dueDate, dueLabel: "—", isToday: false, isOverdue: false, isPending: false, daysLeft };
  }

  if (daysLeft === 0) {
    return { dueDate, dueLabel: "Today", isToday: true, isOverdue: false, isPending: true, daysLeft };
  }
  if (daysLeft < 0) {
    return {
      dueDate,
      dueLabel: `Overdue by ${Math.abs(daysLeft)}d`,
      isToday: false,
      isOverdue: true,
      isPending: true,
      daysLeft,
    };
  }
  if (daysLeft === 1) {
    return { dueDate, dueLabel: "Tomorrow", isToday: false, isOverdue: false, isPending: true, daysLeft };
  }
  return {
    dueDate,
    dueLabel: `In ${daysLeft} days`,
    isToday: false,
    isOverdue: false,
    isPending: true,
    daysLeft,
  };
}


// ISO datetime -> "28 Feb 2025", matching the DMY string shape the T+2
// schedule math and the rest of this page already work with.
function formatDMYFromISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return formatDMY(d);
}

// mapSettlementStatus (raw status → label) lives in ./settlementUtils.

// Amount breakup — confirmed against the real GET /settlements response.
// These are the platform's actual settlement ledger fields (gross
// collected minus vendor promo cost, platform commission + its tax/
// deduction, refund/chargeback adjustments, and any reserve held back),
// not the earlier guessed discount/dealPack/membership/gst fields.
function normalizeBreakup(raw) {
  return {
    grossCollected: Number(raw.grossCollected) || 0,
    vendorPromoCost: Number(raw.vendorPromoCost) || 0,
    commissionAmount: Number(raw.commissionAmount) || 0,
    commissionTax: Number(raw.commissionTax) || 0,
    commissionDeduction: Number(raw.commissionDeduction) || 0,
    refundAdjustment: Number(raw.refundAdjustment) || 0,
    chargebackAdjustment: Number(raw.chargebackAdjustment) || 0,
    reserveHeld: Number(raw.reserveHeld) || 0,
    reservePercent: Number(raw.reservePercent) || 0,
    reserveReleased: Number(raw.reserveReleased) || 0,
    netPayable: Number(raw.netPayable) || 0,
  };
}

// Normalizes one real settlement record (GET /settlements or
// /settlements/:id) into the flat shape this page's table/detail view
// use. `id` stays the Mongo `_id` (what the detail/transactions endpoints
// actually take as :settlement_id) — `settlementNumber` is the separate
// human-readable reference ("TD/STL/26-27/000123") shown in the UI.
// The endpoint doesn't embed the brand's name — only `brandId` — so
// "Vendor" shows the raw id rather than a fabricated brand name.
function normalizeSettlement(raw) {
  return {
    id: raw._id || raw.id || "—",
    settlementNumber: raw.settlementNumber || null,
    vendor: raw.brandId || "—",
    paymentReceivedDate: formatDMYFromISO(raw.periodEnd || raw.periodStart || raw.createdAt) || "—",
    // Raw ISO "YYYY-MM-DD" (not the "DD Mon YYYY" display string above) so
    // the date-range filter can compare it directly against a native
    // <input type="date"> value.
    dateForFilter: (raw.periodEnd || raw.periodStart || raw.createdAt || "").slice(0, 10) || null,
    settlementDate: formatDMYFromISO(raw.paidAt) || "—",
    createdAt: formatDMYFromISO(raw.createdAt) || "—",
    periodStart: formatDMYFromISO(raw.periodStart) || "—",
    periodEnd: formatDMYFromISO(raw.periodEnd) || "—",
    cycleType: raw.cycleType || "—",
    payoutProvider: raw.payoutProvider || "—",
    transactionCount: Number(raw.transactionCount) || 0,
    amount: Number(raw.netPayable) || 0,
    status: mapSettlementStatus(raw.status),
    bankName: raw.bankSnapshot?.bankName || "—",
    accountHolderName: raw.bankSnapshot?.accountHolderName || "—",
    maskedAccountNumber: raw.bankSnapshot?.maskedAccountNumber || "—",
    ifscCode: raw.bankSnapshot?.ifscCode || "—",
    requestId: raw.idempotencyKey || raw.documentToken || "—",
    idempotencyKey: raw.idempotencyKey || "—",
    documentToken: raw.documentToken || "—",
    reserveLabel: raw.reserveLabel || null,
    reserveBasis: {
      disputeCount: Number(raw.reserveBasis?.disputeCount) || 0,
      paymentCount: Number(raw.reserveBasis?.paymentCount) || 0,
      disputeRatePercent: Number(raw.reserveBasis?.disputeRatePercent) || 0,
      lookbackDays: Number(raw.reserveBasis?.lookbackDays) || 0,
    },
    breakup: normalizeBreakup(raw),
    // Real admin-workflow flags (confirmed on GET /settlements) — say
    // which of the approve/pay/retry actions are valid right now, so the
    // UI never shows an action the backend would reject.
    canApprove: Boolean(raw.canApprove),
    canPay: Boolean(raw.canPay),
    canRetry: Boolean(raw.canRetry),
    isOpen: Boolean(raw.isOpen),
    needsRevalidation: Boolean(raw.needsRevalidation),
    attemptCount: Number(raw.attemptCount) || 0,
    transactions: [],
    tickets: [],
    // Populated straight from GET /settlements/admin/:id — legs and
    // timeline are siblings of `settlement` in that response, not nested
    // inside it, so handleOpenSettlement merges them in separately.
    legs: [],
    timeline: [],
    viewer: null,
  };
}

// Normalizes one statement line (GET /settlements/:id/transactions) into
// the timeline-step shape SettlementDetail already renders.
function normalizeSettlementTransaction(raw) {
  const ts = raw.createdAt || raw.date || raw.occurredAt;
  const d = ts ? new Date(ts) : null;
  const dateLabel =
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleString("en-IN", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : raw.date || "—";
  const metaSource = raw.meta && typeof raw.meta === "object" ? raw.meta : {};
  return {
    stage: raw.stage || raw.type || "Transaction",
    title: raw.title || raw.description || raw.label || "Transaction",
    date: dateLabel,
    meta: Object.entries(metaSource).map(([label, value]) => ({ label, value: String(value) })),
  };
}

const STATUS_OPTIONS = [
  "All",
  "Pending Approval",
  "Approved",
  "Processing",
  "Settlement done",
  "Reversed",
  "On hold",
  "Cancelled",
  "Failed",
  "Abandoned",
];

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const styles = {
    "Pending Approval": "bg-amber-400/10 text-amber-400 ring-amber-400/30",
    Approved: "bg-sky-400/10 text-sky-400 ring-sky-400/30",
    Processing: "bg-amber-400/10 text-amber-400 ring-amber-400/30",
    "Settlement done": "bg-emerald-400/10 text-emerald-400 ring-emerald-400/30",
    Reversed: "bg-violet-400/10 text-violet-400 ring-violet-400/30",
    "On hold": "bg-red-400/10 text-red-400 ring-red-400/30",
    Cancelled: "bg-neutral-200 text-neutral-600 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
    Failed: "bg-red-400/10 text-red-400 ring-red-400/30",
    Abandoned: "bg-neutral-200 text-neutral-500 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${
        styles[status] || "bg-neutral-200 text-neutral-600 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
      }`}
    >
      {status}
    </span>
  );
}

// Status badge for one ledger leg (leg-level PAID/FAILED/PROCESSING/...),
// distinct from the settlement-level StatusBadge above.
function LegStatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const styles = {
    PAID: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400",
    FAILED: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
    PROCESSING: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
    PENDING: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
        styles[s] || "bg-neutral-200 text-neutral-600 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
      }`}
    >
      {s || "—"}
    </span>
  );
}

// Shows the T+2 due state: Today / Tomorrow / In X days / Overdue / Completed
function DueBadge({ schedule }) {
  if (!schedule || schedule.dueLabel === "—") {
    return <span className="text-[12px] text-neutral-600">—</span>;
  }
  if (schedule.dueLabel === "Completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-neutral-500">
        <CheckCircle2 size={13} className="text-emerald-500" />
        Completed
      </span>
    );
  }
  const cls = schedule.isToday
    ? "bg-cyan-400/10 text-cyan-400 ring-cyan-400/30"
    : schedule.isOverdue
    ? "bg-red-400/10 text-red-400 ring-red-400/30"
    : "bg-neutral-200 text-neutral-600 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${cls}`}
    >
      {schedule.isToday && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
      )}
      {schedule.dueLabel}
    </span>
  );
}

// Overview widgets — status colours mirror StatusBadge above.
const STATUS_MIX_COLORS = {
  "Pending Approval": "#F59E0B",
  Approved: "#38BDF8",
  Processing: "#FBBF24",
  "Settlement done": "#10B981",
  Reversed: "#8B5CF6",
  "On hold": "#F87171",
  Cancelled: "#A3A3A3",
  Failed: "#EF4444",
  Abandoned: "#D4D4D4",
};

const STATUS_TABS = [
  { key: "All", label: "All" },
  { key: "Pending Approval", label: "Pending Approval" },
  { key: "Approved", label: "Approved" },
  { key: "Processing", label: "Processing" },
  { key: "Settlement done", label: "Settled" },
];

const AWAITING_PAYOUT = ["Pending Approval", "Approved", "Processing"];

const getSettlementDate = (s) => s.dateForFilter;
const getSettlementAmount = (s) => s.amount;

/* -------------------------------------------------------------------------
 * Detail view (mirrors the vendor-side settlement detail screen)
 * ---------------------------------------------------------------------- */

function SettlementDetail({ settlement, detailLoading, onBack, onRefresh, onViewReserveBasis }) {
  const b = settlement.breakup;
  const [openTicket, setOpenTicket] = useState(
    settlement.tickets[0]?.id || null
  );
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const schedule = useMemo(() => getSettlementSchedule(settlement), [settlement]);

  const handleCreateTicket = async () => {
    setTicketSubmitting(true);
    setTicketError("");
    try {
      await raiseTicket(settlement.id);
    } catch (err) {
      setTicketError(err.message);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Approve → Start Payout → Confirm Payout — the real admin workflow.
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showConfirmBox, setShowConfirmBox] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ utr: "", mode: "NEFT", paidAt: "" });
  const [showReverseBox, setShowReverseBox] = useState(false);
  const [reverseReason, setReverseReason] = useState("");

  const runAction = async (fn) => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await fn();
      onRefresh?.();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleApprove = () =>
    runAction(async () => {
      await approveSettlement(settlement.id, { note: approveNote.trim() || undefined });
      setShowApproveBox(false);
      setApproveNote("");
    });

  const handleStartPayout = () => runAction(() => startSettlementPayout(settlement.id));

  const handleConfirmPayout = () =>
    runAction(async () => {
      await confirmSettlementPayout(settlement.id, {
        utr: confirmForm.utr.trim(),
        mode: confirmForm.mode,
        paidAt: confirmForm.paidAt ? new Date(confirmForm.paidAt).toISOString() : new Date().toISOString(),
      });
      setShowConfirmBox(false);
      setConfirmForm({ utr: "", mode: "NEFT", paidAt: "" });
    });

  const handleRetry = () => runAction(() => retrySettlementPayout(settlement.id));

  // Reverse only makes sense once a settlement has actually been paid out
  // (PAID → REVERSED in the confirmed lifecycle) — no real "canReverse"
  // flag exists yet, so this is inferred from the status itself.
  const handleReverse = () =>
    runAction(async () => {
      await reverseSettlementPayout(settlement.id, { reason: reverseReason.trim() });
      setShowReverseBox(false);
      setReverseReason("");
    });

  const canReverse = settlement.status === "Settlement done";
  const showActions =
    settlement.canApprove || settlement.canPay || settlement.canRetry || settlement.status === "Processing" || canReverse;

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
        >
          <ArrowLeft size={16} />
          {settlement.settlementNumber || settlement.id}
        </button>
        <div className="flex items-center gap-2">
          {detailLoading && (
            <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
              <Loader2 size={13} className="animate-spin" />
              Refreshing…
            </span>
          )}
          <button
            onClick={handleCreateTicket}
            disabled={ticketSubmitting}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            {ticketSubmitting ? <Loader2 size={14} className="animate-spin" /> : <TicketIcon size={14} />}
            Create Ticket
          </button>
          <button className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300">
            <Download size={14} />
            Download Statement
          </button>
        </div>
      </div>

      {ticketError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {ticketError}
        </div>
      )}

      {/* Settlement actions — Approve → Start Payout → Confirm Payout,
          gated by the settlement's own real canApprove/canPay/canRetry
          flags so an action never shows when the backend would reject it. */}
      {showActions && (
        <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
            Settlement Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            {settlement.canApprove && (
              <button
                onClick={() => setShowApproveBox((v) => !v)}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
            )}
            {settlement.canPay && (
              <button
                onClick={handleStartPayout}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                Start Payout
              </button>
            )}
            {settlement.status === "Processing" && (
              <button
                onClick={() => setShowConfirmBox((v) => !v)}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <CheckCircle2 size={14} />
                Confirm Payout (UTR)
              </button>
            )}
            {settlement.canRetry && (
              <button
                onClick={handleRetry}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Retry Payout
              </button>
            )}
            {canReverse && (
              <button
                onClick={() => setShowReverseBox((v) => !v)}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-red-400/40 px-3.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
              >
                <RotateCcw size={14} />
                Reverse Payout
              </button>
            )}
          </div>

          {showApproveBox && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <TextField
                label="Note (optional)"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Numbers checked against the statement."
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApproveBox(false)}
                  className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirm Approve
                </button>
              </div>
            </div>
          )}

          {showConfirmBox && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <TextField
                  label="UTR"
                  value={confirmForm.utr}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, utr: e.target.value }))}
                  placeholder="PNFXSTL000000001"
                />
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                    Mode
                  </label>
                  <select
                    value={confirmForm.mode}
                    onChange={(e) => setConfirmForm((p) => ({ ...p, mode: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                  >
                    {["NEFT", "IMPS", "RTGS", "UPI"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <TextField
                  label="Paid At"
                  type="datetime-local"
                  value={confirmForm.paidAt}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, paidAt: e.target.value }))}
                />
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmBox(false)}
                  className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayout}
                  disabled={actionSubmitting || !confirmForm.utr.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Confirm
                </button>
              </div>
            </div>
          )}

          {showReverseBox && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
              <TextField
                label="Reason"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Wrong bank account, reversing to re-verify."
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReverseBox(false)}
                  className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReverse}
                  disabled={actionSubmitting || !reverseReason.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-3.5 text-[13px] font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Confirm Reverse
                </button>
              </div>
            </div>
          )}

          {actionError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" />
              {actionError}
            </div>
          )}
        </section>
      )}

      {/* Settlement information */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Settlement Information
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="To Credit Amount" value={inr(settlement.amount)} accent />
          <Field label="Settlement Id" value={settlement.settlementNumber || settlement.id} />
          <Field label="Settlement Bank Name" value={settlement.bankName} />
          <Field label="Settlement Request Id" value={settlement.requestId} />
          <Field label="Account Holder" value={settlement.accountHolderName} />
          <Field label="Bank Account" value={settlement.maskedAccountNumber} />
          <Field label="IFSC Code" value={settlement.ifscCode} />
          <Field label="Transactions" value={settlement.transactionCount} />
          <Field label="Cycle Type" value={settlement.cycleType} />
          <Field label="Payout Provider" value={settlement.payoutProvider} />
          <Field label="Created On" value={settlement.createdAt} />
          <Field label="Statement Token" value={settlement.documentToken} />
          <Field label="Period Start" value={settlement.periodStart} />
          <Field label="Period End" value={settlement.periodEnd} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={settlement.status} />
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <CalendarClock size={13} />
            T+{SETTLEMENT_CYCLE_DAYS} due{schedule.dueDate ? `: ${formatDMY(schedule.dueDate)}` : ""}
          </span>
          <DueBadge schedule={schedule} />
          {settlement.viewer && (
            <span className="text-[11.5px] text-neutral-500">
              Viewing as {settlement.viewer.role} · Scope: {settlement.viewer.scope}
            </span>
          )}
        </div>
      </section>

      {/* Amount breakup */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Amount Breakup Information
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Gross Collected" value={inr(b.grossCollected)} />
          <Field label="Vendor Promo Cost" value={inr(b.vendorPromoCost)} />
          <Field label="Commission" value={inr(b.commissionAmount)} />
          <Field label="Commission Tax" value={inr(b.commissionTax)} />
          <Field label="Commission Deduction" value={inr(b.commissionDeduction)} />
          <Field label="Refund Adjustment" value={inr(b.refundAdjustment)} />
          <Field label="Chargeback Adjustment" value={inr(b.chargebackAdjustment)} />
          {b.reserveHeld > 0 && (
            <Field label="Reserve Held" value={`${inr(b.reserveHeld)}${b.reservePercent ? ` (${b.reservePercent}%)` : ""}`} />
          )}
          {b.reserveReleased > 0 && <Field label="Reserve Released" value={inr(b.reserveReleased)} />}
          {settlement.reserveLabel && <Field label="Reserve Reason" value={settlement.reserveLabel} />}
        </div>

        <button
          onClick={onViewReserveBasis}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-neutral-200 px-4 py-3 text-left transition-colors hover:border-emerald-400/40 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950"
        >
          <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            <ShieldAlert size={15} className="text-amber-400" />
            View Reserve Basis
          </span>
          <ChevronRight size={16} className="text-neutral-500" />
        </button>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-400/10 px-4 py-3">
          <span className="text-[13px] text-neutral-700 dark:text-neutral-300">
            Net payable amount credited to the vendor
          </span>
          <span className="text-[14px] font-semibold text-emerald-400">
            {inr(b.netPayable)}
          </span>
        </div>
      </section>

      {/* Ledger legs — from the settlement detail endpoint, kept separate
          from the statement-line transactions fetched below. Each leg gets
          its own card (status badge + a Field grid), same visual language
          as the "Settlement Information" section above, instead of a flat
          key:value dump. */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Ledger Legs
        </h3>
        {settlement.legs.length === 0 ? (
          <p className="text-[13px] text-neutral-500">No ledger legs recorded for this settlement.</p>
        ) : (
          <div className="space-y-3">
            {settlement.legs.map((leg, i) => (
              <div key={leg._id || leg.id || i} className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                    Leg {leg.legNumber ?? i + 1}
                  </span>
                  <LegStatusBadge status={leg.status} />
                </div>
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                  <Field label="Amount" value={inr(leg.amount)} accent />
                  <Field label="UTR" value={leg.utr || "—"} />
                  <Field label="Mode" value={leg.mode || "—"} />
                  <Field label="Provider" value={leg.provider || "—"} />
                  <Field label="Bank Last4" value={leg.bankLast4 || "—"} />
                  <Field label="Initiated At" value={formatGenericValue(leg.initiatedAt)} />
                  <Field label="Paid At" value={formatGenericValue(leg.paidAt)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Settlement timeline — from the settlement detail endpoint, shown
          as the same icon-stepper as "Transaction Information" below
          rather than a flat key:value dump. Each entry's `snapshot` is a
          small object (e.g. released/needsRevalidation/attemptCount) —
          rendered as the same label:value meta pairs the transaction
          stepper already uses. */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Settlement Timeline
        </h3>
        {settlement.timeline.length === 0 ? (
          <p className="text-[13px] text-neutral-500">No timeline events recorded yet.</p>
        ) : (
          <ol className="space-y-5">
            {settlement.timeline.map((ev, i) => {
              const isLast = i === settlement.timeline.length - 1;
              const metaEntries = [
                ...(ev.performedBy ? [{ label: "Performed By", value: ev.performedBy }] : []),
                ...(ev.snapshot && typeof ev.snapshot === "object"
                  ? Object.entries(ev.snapshot).map(([k, v]) => ({ label: humanizeKey(k), value: formatGenericValue(v) }))
                  : []),
              ];
              return (
                <li key={ev._id || i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                      {isLast ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                    </span>
                    {!isLast && <span className="mt-1 h-full w-px flex-1 bg-neutral-800" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-50">
                      {ev.fromStatus
                        ? `${mapSettlementStatus(ev.fromStatus)} → ${mapSettlementStatus(ev.toStatus)}`
                        : mapSettlementStatus(ev.toStatus)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-neutral-500">
                      {formatGenericValue(ev.at)}
                      {ev.by ? ` · by ${ev.by}` : ""}
                    </p>
                    {ev.reason && (
                      <p className="mt-1.5 text-[12.5px] text-neutral-600 dark:text-neutral-300">{ev.reason}</p>
                    )}
                    {metaEntries.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                        {metaEntries.map((m) => (
                          <span key={m.label} className="text-[12px] text-neutral-500 dark:text-neutral-400">
                            {m.label}:{" "}
                            <span className="text-neutral-700 dark:text-neutral-200">{m.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Transaction timeline */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Transaction Information
        </h3>
        <ol className="space-y-5">
          {settlement.transactions.map((t, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
                  {i === settlement.transactions.length - 1 ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Clock3 size={15} />
                  )}
                </span>
                {i < settlement.transactions.length - 1 && (
                  <span className="mt-1 h-full w-px flex-1 bg-neutral-800" />
                )}
              </div>
              <div className="pb-1">
                <p className="text-[13.5px] font-medium text-neutral-900 dark:text-neutral-50">
                  {t.title}
                </p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{t.date}</p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                  {t.meta.map((m) => (
                    <span key={m.label} className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      {m.label}:{" "}
                      <span className="text-neutral-700 dark:text-neutral-200">{m.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Tickets */}
      <section className="mb-8 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Ticket Raise
        </h3>
        {settlement.tickets.length === 0 ? (
          <p className="text-[13px] text-neutral-500">
            No tickets raised for this settlement.
          </p>
        ) : (
          <div className="space-y-2">
            {settlement.tickets.map((tk) => {
              const open = openTicket === tk.id;
              return (
                <div
                  key={tk.id}
                  className="rounded-xl bg-neutral-50 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20"
                >
                  <button
                    onClick={() => setOpenTicket(open ? null : tk.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                      {tk.id}{" "}
                      <span className="ml-2 text-[11.5px] text-neutral-500">
                        {tk.date}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={tk.status === "Open" ? "Processing" : "Settlement done"} />
                      {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>
                  {open && (
                    <p className="border-t border-neutral-200 px-4 py-3 text-[12.5px] leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                      {tk.detail}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// camelCase/snake_case key -> "Title Case" label, for rendering records
// (settlement legs, timeline events) whose exact field names aren't
// confirmed yet — this stays honest about whatever the API actually sends
// instead of guessing specific field names for them.
function humanizeKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatGenericValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("en-IN");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/* -------------------------------------------------------------------------
 * Reserve Basis — dedicated page, opened from the settlement detail's
 * "View Reserve Basis" link. Same visual language as SettlementDetail
 * (header + back button, stat cards, Field grids).
 * ---------------------------------------------------------------------- */

function ReserveMetricCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <Icon size={15} className="text-amber-400" />
        {label}
      </div>
      <div className="mt-3 text-[22px] font-semibold text-neutral-900 dark:text-neutral-50">{value}</div>
      {sub && <div className="mt-1 text-[12px] text-neutral-500">{sub}</div>}
    </div>
  );
}

function SettlementReserveBasis({ settlement, onBack }) {
  const basis = settlement.reserveBasis;
  const b = settlement.breakup;
  const hasActivity = basis.paymentCount > 0 || basis.disputeCount > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
        >
          <ArrowLeft size={16} />
          Reserve Basis · {settlement.settlementNumber || settlement.id}
        </button>
      </div>

      <p className="mb-4 text-[13px] text-neutral-500">
        Snapshot of the dispute and payment activity used to decide this settlement's reserve rate.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <ReserveMetricCard icon={ShieldAlert} label="Dispute Count" value={basis.disputeCount} />
        <ReserveMetricCard icon={Users2} label="Payment Count" value={basis.paymentCount} />
        <ReserveMetricCard icon={Percent} label="Dispute Rate" value={`${basis.disputeRatePercent}%`} />
        <ReserveMetricCard icon={History} label="Lookback Window" value={`${basis.lookbackDays}d`} sub="Trailing days counted" />
      </div>

      {!hasActivity && (
        <div className="mb-4 rounded-2xl border border-dashed border-neutral-200 px-5 py-6 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
          No dispute or payment activity was counted for this settlement's reserve calculation.
        </div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          <ShieldCheck size={14} className="text-emerald-400" />
          Reserve Outcome
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Reserve Held" value={inr(b.reserveHeld)} />
          <Field label="Reserve Percent" value={`${b.reservePercent}%`} />
          <Field label="Reserve Released" value={inr(b.reserveReleased)} />
          <Field label="Reserve Reason" value={settlement.reserveLabel || "—"} />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, accent }) {
  return (
    <div>
      <p className="text-[11.5px] text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13.5px] font-medium ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, error, type = "text" }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
          error
            ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
            : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
        }`}
      />
      {error && <p className="mt-1.5 text-[12px] text-red-400">{error}</p>}
    </div>
  );
}

// Shared reason-prompt modal for the list row's Hold / Cancel icon
// actions — both just need a required reason before calling the real
// PATCH /settlements/admin/:id/{hold,cancel} endpoint.
function SettlementReasonModal({ title, description, actionLabel, tone = "amber", placeholder = "e.g. Bank details need re-verification.", submitting, error, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={submitting ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
        {description && <p className="mt-1 text-[12.5px] text-neutral-500">{description}</p>}

        <div className="mt-4">
          <TextField
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
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
            onClick={() => onConfirm(reason.trim())}
            disabled={submitting || !reason.trim()}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              tone === "red" ? "bg-red-500 text-white hover:bg-red-400" : "bg-amber-400 text-neutral-950 hover:bg-amber-300"
            }`}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Settlement workflow, run straight from the table:
 *   Pending Approval → Approve → Approved → Start Payout → Processing →
 *   Confirm Payout (UTR) → Settlement done.  (Failed → Retry Payout.)
 * Each row offers only the one valid next step, gated by the settlement's
 * real canApprove / canPay / canRetry flags — same rules as the detail page.
 * ---------------------------------------------------------------------- */
function getNextStep(s) {
  if (s.canApprove) return { key: "approve", label: "Approve" };
  if (s.canPay) return { key: "payout", label: "Start Payout" };
  if (s.status === "Processing") return { key: "confirm", label: "Confirm Payout" };
  if (s.canRetry) return { key: "retry", label: "Retry" };
  if (s.status === "On hold") return { key: "unhold", label: "Unhold" };
  return null;
}

// What a row looks like right after a step succeeds — applied instantly so
// the pill changes on click, then the silent refetch brings the real data.
const STEP_RESULT = {
  approve: { status: "Approved", canApprove: false, canPay: true },
  payout: { status: "Processing", canPay: false },
  confirm: { status: "Settlement done" },
  retry: { status: "Processing", canRetry: false },
  // PAID → REVERSED: the bank pulled the credit back after payout.
  reverse: { status: "Reversed" },
  hold: { status: "On hold", canApprove: false },
  unhold: { status: "Pending Approval", canApprove: true },
};

/* The status pill is the workflow button — see components/common/StatusStepButton. */
function SettlementStatusStep({ settlement, onStep }) {
  const step = getNextStep(settlement);
  return (
    <StatusStepButton
      label={settlement.status}
      tone={SETTLEMENT_TONES[settlement.status]}
      stepLabel={step?.label}
      onClick={() => onStep(settlement, step)}
    />
  );
}

const STEP_COPY = {
  approve: { title: "Approve settlement?", description: "It moves to Approved and becomes ready for payout.", action: "Approve" },
  payout: { title: "Start payout?", description: "This starts the bank transfer for this settlement.", action: "Start Payout" },
  confirm: { title: "Confirm payout", description: "Enter the bank UTR once the money has reached the vendor.", action: "Confirm" },
  retry: { title: "Retry payout?", description: "The failed payout will be attempted again.", action: "Retry Payout" },
  unhold: { title: "Take off hold?", description: "It goes back to Pending Approval so it can be approved and paid.", action: "Unhold" },
};

function SettlementStepModal({ settlement, step, submitting, error, onClose, onConfirm }) {
  const copy = STEP_COPY[step.key];
  const [note, setNote] = useState("");
  const [confirmForm, setConfirmForm] = useState({ utr: "", mode: "NEFT", paidAt: "" });
  const needsUtr = step.key === "confirm";

  const submit = () => {
    if (step.key === "approve") return onConfirm({ note: note.trim() || undefined });
    if (needsUtr) {
      return onConfirm({
        utr: confirmForm.utr.trim(),
        mode: confirmForm.mode,
        paidAt: confirmForm.paidAt ? new Date(confirmForm.paidAt).toISOString() : new Date().toISOString(),
      });
    }
    return onConfirm({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={submitting ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{copy.title}</h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{settlement.settlementNumber || settlement.id}</span>
          {" · "}
          {inr(settlement.amount)} — {copy.description}
        </p>

        {step.key === "approve" && (
          <div className="mt-4">
            <TextField
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Numbers checked against the statement."
            />
          </div>
        )}

        {needsUtr && (
          <div className="mt-4 space-y-3">
            <TextField
              label="UTR"
              value={confirmForm.utr}
              onChange={(e) => setConfirmForm((p) => ({ ...p, utr: e.target.value }))}
              placeholder="PNFXSTL000000001"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Mode</label>
                <select
                  value={confirmForm.mode}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, mode: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                >
                  {["NEFT", "IMPS", "RTGS", "UPI"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <TextField
                label="Paid At"
                type="datetime-local"
                value={confirmForm.paidAt}
                onChange={(e) => setConfirmForm((p) => ({ ...p, paidAt: e.target.value }))}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
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
            onClick={submit}
            disabled={submitting || (needsUtr && !confirmForm.utr.trim())}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settlement() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // -> detail view
  const [showReserveBasis, setShowReserveBasis] = useState(false); // -> reserve basis page
  const [detailLoading, setDetailLoading] = useState(false);

  // Hold / Cancel — quick row-level actions, gated on the confirmed
  // lifecycle (ON_HOLD only ever follows Pending Approval, CANCELLED only
  // ever follows Approved), each needing a reason before the real PATCH
  // /settlements/admin/:id/{hold,cancel} call.
  const [holdTarget, setHoldTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rowActionSubmitting, setRowActionSubmitting] = useState(false);
  const [rowActionError, setRowActionError] = useState("");
  // Next workflow step started from a table row — { row, step }.
  const [stepTarget, setStepTarget] = useState(null);

  // `silent` = background refresh after an action — keeps the table on
  // screen instead of swapping it for the loading state.
  const fetchSettlements = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const res = await getSettlements({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(normalizeSettlement);
      setSettlements(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // List rows are lightweight — pull the full breakup + real statement
  // lines (transactions) once a settlement is opened, same lightweight-list
  // -> full-detail pattern as Brand/Customer.
  const handleOpenSettlement = useCallback(async (row) => {
    setSelected(row);
    setShowReserveBasis(false);
    setDetailLoading(true);
    try {
      const [detailRes, txnRes] = await Promise.all([
        getSettlementById(row.id),
        getSettlementTransactions(row.id, { page: 1, limit: 50 }),
      ]);
      // The detail endpoint's `data` carries `settlement`, `legs`,
      // `timeline` and `viewer` as siblings — legs/timeline/viewer are
      // NOT nested inside `settlement`, so they're pulled out here.
      const detailData = detailRes?.data ?? {};
      const rawDetail = detailData.settlement ?? (detailData._id ? detailData : null);
      const txnRows = (txnRes?.data?.data ?? txnRes?.data ?? []).map(normalizeSettlementTransaction);
      setSelected((prev) => ({
        ...prev,
        ...(rawDetail ? normalizeSettlement(rawDetail) : {}),
        legs: Array.isArray(detailData.legs) ? detailData.legs : [],
        timeline: Array.isArray(detailData.timeline) ? detailData.timeline : [],
        viewer: detailData.viewer || null,
        transactions: txnRows,
        tickets: prev?.tickets || [],
      }));
    } catch {
      // Keep showing the lightweight list row if the detail fetch fails.
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // T+2 schedule computed fresh against "now" whenever settlements change
  const schedules = useMemo(() => {
    const now = new Date();
    const map = {};
    settlements.forEach((s) => {
      map[s.id] = getSettlementSchedule(s, now);
    });
    return map;
  }, [settlements]);

  // Settlements due exactly today -> drives the "Today Settlement" stat card
  const todaySettlementStats = useMemo(() => {
    const dueToday = settlements.filter((s) => schedules[s.id]?.isToday);
    return {
      amount: dueToday.reduce((sum, s) => sum + s.amount, 0),
      count: dueToday.length,
    };
  }, [settlements, schedules]);

  // Most recently completed settlement (real, derived from the fetched
  // list) drives the "Previous settlement" stat card. Available/GST
  // balance have no per-settlement source in the 3 confirmed endpoints —
  // shown as 0 rather than invented until a real balance endpoint exists.
  const previousSettlement = useMemo(() => {
    const done = settlements
      .filter((s) => s.status === "Settlement done" && parseDMY(s.settlementDate))
      .sort((a, b) => parseDMY(b.settlementDate) - parseDMY(a.settlementDate));
    return done[0] || null;
  }, [settlements]);

  const kpis = useMemo(() => {
    const summarize = (rows) => {
      const paid = rows.filter((s) => s.status === "Settlement done");
      const awaiting = rows.filter((s) => AWAITING_PAYOUT.includes(s.status));
      return {
        paidOut: paid.reduce((sum, s) => sum + s.amount, 0),
        awaitingAmount: awaiting.reduce((sum, s) => sum + s.amount, 0),
        awaitingCount: awaiting.length,
        avg: rows.length ? rows.reduce((sum, s) => sum + s.amount, 0) / rows.length : 0,
      };
    };
    const all = summarize(settlements);
    const { cur, prev } = weekOverWeek(settlements, summarize, getSettlementDate);
    return {
      ...all,
      paidOutTrend: pctChange(cur.paidOut, prev.paidOut),
      avgTrend: pctChange(cur.avg, prev.avg),
    };
  }, [settlements]);

  const statusMix = useMemo(() => {
    const counts = {};
    settlements.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name: name === "Settlement done" ? "Settled" : name,
      count,
      color: STATUS_MIX_COLORS[name],
    }));
  }, [settlements]);

  const statusCounts = useMemo(() => {
    const counts = { All: settlements.length };
    settlements.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [settlements]);

  const handleHoldConfirm = async (reason) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      await holdSettlement(holdTarget.id, { reason });
      setSettlements((prev) => prev.map((x) => (x.id === holdTarget.id ? { ...x, ...STEP_RESULT.hold } : x)));
      setHoldTarget(null);
      fetchSettlements({ silent: true });
    } catch (err) {
      setRowActionError(err.message);
    } finally {
      setRowActionSubmitting(false);
    }
  };

  const STEP_ACTIONS = {
    approve: (id, payload) => approveSettlement(id, payload),
    payout: (id) => startSettlementPayout(id),
    confirm: (id, payload) => confirmSettlementPayout(id, payload),
    retry: (id) => retrySettlementPayout(id),
    reverse: (id, payload) => reverseSettlementPayout(id, payload),
    hold: (id, payload) => holdSettlement(id, payload),
    unhold: (id) => unholdSettlement(id),
  };

  const handleStepConfirm = async (payload) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      const { row, step } = stepTarget;
      await STEP_ACTIONS[step.key](row.id, payload);
      setStepTarget(null);
      // Flip the row's pill to its next state at once, then quietly refetch
      // (no table spinner) for the server's real status and flags.
      setSettlements((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...STEP_RESULT[step.key] } : x)));
      fetchSettlements({ silent: true });
    } catch (err) {
      setRowActionError(err.message);
    } finally {
      setRowActionSubmitting(false);
    }
  };

  // Reverse — only for a completed payout ("Settlement done"); reason required.
  const [reverseTarget, setReverseTarget] = useState(null);
  const handleReverseConfirm = async (reason) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      await reverseSettlementPayout(reverseTarget.id, { reason });
      setSettlements((prev) => prev.map((x) => (x.id === reverseTarget.id ? { ...x, ...STEP_RESULT.reverse } : x)));
      setReverseTarget(null);
      fetchSettlements({ silent: true });
    } catch (err) {
      setRowActionError(err.message);
    } finally {
      setRowActionSubmitting(false);
    }
  };

  const handleCancelConfirm = async (reason) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      await cancelSettlement(cancelTarget.id, { reason });
      setCancelTarget(null);
      fetchSettlements({ silent: true });
    } catch (err) {
      setRowActionError(err.message);
    } finally {
      setRowActionSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return settlements.filter((s) => {
      const matchesSearch =
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        (s.settlementNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        s.vendor.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      const matchesToday = !showTodayOnly || schedules[s.id]?.isToday;
      const matchesDateFrom = !dateFrom || (s.dateForFilter && s.dateForFilter >= dateFrom);
      const matchesDateTo = !dateTo || (s.dateForFilter && s.dateForFilter <= dateTo);
      return matchesSearch && matchesStatus && matchesToday && matchesDateFrom && matchesDateTo;
    });
  }, [settlements, search, statusFilter, showTodayOnly, schedules, dateFrom, dateTo]);

  // Every scalar field on the normalized row — nothing left out — so the
  // export is a full data dump, not a curated subset of columns.
  const handleExport = () => {
    downloadCsv(`settlements_${todayStr()}`, [
      { label: "Settlement Id", key: "id" },
      { label: "Settlement Number", key: "settlementNumber" },
      { label: "Vendor", key: "vendor" },
      { label: "Payment Received Date", key: "paymentReceivedDate" },
      { label: "Settlement Date", key: "settlementDate" },
      { label: "Created At", key: "createdAt" },
      { label: "Period Start", key: "periodStart" },
      { label: "Period End", key: "periodEnd" },
      { label: "Cycle Type", key: "cycleType" },
      { label: "Payout Provider", key: "payoutProvider" },
      { label: "Transaction Count", key: "transactionCount" },
      { label: "Amount", key: "amount" },
      { label: "Status", key: "status" },
      { label: "Bank Name", key: "bankName" },
      { label: "Account Holder Name", key: "accountHolderName" },
      { label: "Masked Account Number", key: "maskedAccountNumber" },
      { label: "IFSC Code", key: "ifscCode" },
      { label: "Request Id", key: "requestId" },
      { label: "Idempotency Key", key: "idempotencyKey" },
      { label: "Document Token", key: "documentToken" },
      { label: "Reserve Label", key: "reserveLabel" },
      { label: "Reserve Dispute Count", value: (s) => s.reserveBasis.disputeCount },
      { label: "Reserve Payment Count", value: (s) => s.reserveBasis.paymentCount },
      { label: "Reserve Dispute Rate %", value: (s) => s.reserveBasis.disputeRatePercent },
      { label: "Reserve Lookback Days", value: (s) => s.reserveBasis.lookbackDays },
      { label: "Gross Collected", value: (s) => s.breakup.grossCollected },
      { label: "Vendor Promo Cost", value: (s) => s.breakup.vendorPromoCost },
      { label: "Commission Amount", value: (s) => s.breakup.commissionAmount },
      { label: "Commission Tax", value: (s) => s.breakup.commissionTax },
      { label: "Commission Deduction", value: (s) => s.breakup.commissionDeduction },
      { label: "Refund Adjustment", value: (s) => s.breakup.refundAdjustment },
      { label: "Chargeback Adjustment", value: (s) => s.breakup.chargebackAdjustment },
      { label: "Reserve Held", value: (s) => s.breakup.reserveHeld },
      { label: "Reserve Percent", value: (s) => s.breakup.reservePercent },
      { label: "Reserve Released", value: (s) => s.breakup.reserveReleased },
      { label: "Net Payable", value: (s) => s.breakup.netPayable },
      { label: "Can Approve", value: (s) => (s.canApprove ? "Yes" : "No") },
      { label: "Can Pay", value: (s) => (s.canPay ? "Yes" : "No") },
      { label: "Can Retry", value: (s) => (s.canRetry ? "Yes" : "No") },
      { label: "Is Open", value: (s) => (s.isOpen ? "Yes" : "No") },
      { label: "Needs Revalidation", value: (s) => (s.needsRevalidation ? "Yes" : "No") },
      { label: "Attempt Count", key: "attemptCount" },
    ], filtered);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  /* ---- Multi-select + bulk actions ----------------------------------- */
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkKind, setBulkKind] = useState(null); // "approve" | "payout" | "confirm"

  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Selects every settlement of one status (across all pages, within the
  // current search/date filters).
  const selectByStatus = (status) => setSelectedIds(new Set(filtered.filter((s) => s.status === status).map((s) => s.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedRows = settlements.filter((s) => selectedIds.has(s.id));
  // Each bulk action only runs on the selected settlements it's valid for.
  const BULK_ELIGIBLE = {
    approve: (s) => s.canApprove,
    payout: (s) => s.canPay,
    confirm: (s) => s.status === "Processing",
    reverse: (s) => s.status === "Settlement done",
    hold: (s) => s.status === "Pending Approval",
    unhold: (s) => s.status === "On hold",
  };
  const BULK_COPY = {
    approve: { title: "Approve settlements", action: "Approve", input: "note" },
    payout: { title: "Start payout", action: "Start Payout", input: "none" },
    confirm: { title: "Confirm payouts", action: "Confirm Payouts", input: "utr" },
    reverse: { title: "Reverse payouts", action: "Reverse", input: "reason" },
    hold: { title: "Put on hold", action: "Hold", input: "reason" },
    unhold: { title: "Take off hold", action: "Unhold", input: "none" },
  };
  const bulkRows = bulkKind ? selectedRows.filter(BULK_ELIGIBLE[bulkKind]) : [];

  // Called once per settlement by the bulk dialog; a throw marks that row failed.
  const runBulkOne = async (row, payload) => {
    // The shared modal sends a note/reason as `text`; approve takes `note`, reverse takes `reason`.
    const body = bulkKind === "approve" ? { note: payload.text } : ["reverse", "hold"].includes(bulkKind) ? { reason: payload.text } : payload;
    await STEP_ACTIONS[bulkKind](row.id, body);
    setSettlements((prev) => prev.map((x) => (x.id === row.id ? { ...x, ...STEP_RESULT[bulkKind] } : x)));
  };
  const closeBulk = () => {
    setBulkKind(null);
    clearSelection();
    fetchSettlements({ silent: true });
  };


  if (selected && showReserveBasis) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SettlementReserveBasis settlement={selected} onBack={() => setShowReserveBasis(false)} />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SettlementDetail
          settlement={selected}
          detailLoading={detailLoading}
          onBack={() => setSelected(null)}
          // Refresh the open detail and the list behind it, so the rows and
          // stat cards are already current when the admin goes Back.
          onRefresh={() => {
            handleOpenSettlement(selected);
            fetchSettlements({ silent: true });
          }}
          onViewReserveBasis={() => setShowReserveBasis(true)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Settlement
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Monitor payment settlements across all vendors with complete
              transparency. Settlement cycle: T+{SETTLEMENT_CYCLE_DAYS} days from payment received.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchSettlements}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Total Paid Out"
            value={inr(kpis.paidOut)}
            trend={kpis.paidOutTrend}
            sub={
              previousSettlement
                ? `Last ${inr(previousSettlement.amount)} on ${previousSettlement.settlementDate}`
                : "No settlements paid yet"
            }
          />
          <KpiCard
            icon={Landmark}
            label="Awaiting Payout"
            value={inr(kpis.awaitingAmount)}
            sub={`${kpis.awaitingCount} settlement${kpis.awaitingCount === 1 ? "" : "s"} pending · approved · processing`}
          />
          <KpiCard
            icon={CalendarClock}
            label="Due Today"
            value={inr(todaySettlementStats.amount)}
            sub={`${todaySettlementStats.count} due today · T+${SETTLEMENT_CYCLE_DAYS} cycle`}
          />
          <KpiCard icon={Receipt} label="Avg. Settlement" value={inr(kpis.avg)} trend={kpis.avgTrend} />
        </div>

        {/* Net payable per day + status mix */}
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <DailyBarsCard
            className="lg:col-span-2"
            title="Settlement Overview"
            subtitle="Net payable per day (by period end)"
            icon={BarChart3}
            rows={settlements}
            getDate={getSettlementDate}
            getValue={getSettlementAmount}
            countLabel="settlements"
            emptyText="No settlements in this period."
            gradientId="settlementDailyBar"
          />
          <MixCard
            title="Status mix"
            icon={PieChartIcon}
            total={settlements.length}
            totalLabel="settlements"
            items={statusMix}
            emptyText="No settlements yet."
          />
        </div>

        <PillTabs
          tabs={STATUS_TABS.map((t) => ({ ...t, count: statusCounts[t.key] || 0 }))}
          active={statusFilter}
          onChange={(key) => {
            setStatusFilter(key);
            setPage(1);
          }}
        />

        {/* Toolbar — search, status, due-today, date range and export all
            live in one wrapping row so the filter UI reads the same way
            across Settlement/Refund/Transaction. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search settlement id, vendor, txn id..."
              className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 sm:w-56"
            />
          </div>
          <SelectDropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            icon={Filter}
            onChange={(s) => {
              setStatusFilter(s);
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
          <button
            onClick={() => {
              setShowTodayOnly((v) => !v);
              setPage(1);
            }}
            className={`flex h-9.5 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
              showTodayOnly
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-600 dark:text-cyan-400"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            <CalendarClock size={14} />
            Due Today
            {todaySettlementStats.count > 0 && (
              <span className="ml-0.5 rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[10.5px] font-semibold text-cyan-700 dark:text-cyan-300">
                {todaySettlementStats.count}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex h-9.5 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Download size={14} />
            Export
          </button>
        </div>

        {/* Bulk bar — pick settlements by status in one click, then run one
            action on all of them. */}
        {!loading && !loadError && (
          <BulkSelectBar
            groups={["Pending Approval", "Approved", "Processing", "Settlement done", "On hold"].map((status) => ({
              key: status,
              label: status,
              count: filtered.filter((s) => s.status === status).length,
              onSelect: () => selectByStatus(status),
            }))}
            selectedCount={selectedIds.size}
            selectedTotal={inr(selectedRows.reduce((sum, s) => sum + (Number(s.amount) || 0), 0))}
            actions={[
              { key: "approve", label: "Approve", icon: CheckCircle2 },
              { key: "payout", label: "Start Payout", icon: Wallet },
              { key: "confirm", label: "Confirm Payout", icon: Upload },
              { key: "hold", label: "Hold", icon: PauseCircle, tone: "red" },
              { key: "unhold", label: "Unhold", icon: PlayCircle },
              { key: "reverse", label: "Reverse", icon: RotateCcw, tone: "red" },
            ].map((a) => ({ ...a, count: selectedRows.filter(BULK_ELIGIBLE[a.key]).length, onClick: () => setBulkKind(a.key) }))}
            onClear={clearSelection}
          />
        )}

        {/* Table */}
        {loading ? (
          <Loader label="Loading settlements…" />
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load settlements: {loadError}
          </div>
        ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: "1040px" }}>
              <thead>
                <tr className="bg-neutral-100/80 dark:bg-neutral-950/50">
                  <th className="w-10 py-3.5 pl-4">
                    {/* Header checkbox: select / clear every row on this page */}
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      checked={pageRows.length > 0 && pageRows.every((s) => selectedIds.has(s.id))}
                      onChange={(e) =>
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          pageRows.forEach((s) => (e.target.checked ? next.add(s.id) : next.delete(s.id)));
                          return next;
                        })
                      }
                      className="h-4 w-4 cursor-pointer accent-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Settlement Id</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Vendor</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Payment Received</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Due (T+{SETTLEMENT_CYCLE_DAYS})</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Txns</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Amount</th>
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="px-4 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Actions</th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Info</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-10 text-center text-[13px] text-neutral-500"
                    >
                      No settlements match your filters.
                    </td>
                  </tr>
                )}
                {pageRows.map((s) => {
                  const open = expandedId === s.id;
                  const schedule = schedules[s.id];
                  return (
                    <React.Fragment key={s.id}>
                      <tr
                        className={`border-t border-neutral-100 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800/30 ${
                          selectedIds.has(s.id) ? "bg-emerald-400/[0.06]" : schedule?.isToday ? "bg-cyan-400/[0.04]" : ""
                        }`}
                      >
                        <td className="w-10 py-3.5 pl-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${s.settlementNumber || s.id}`}
                            checked={selectedIds.has(s.id)}
                            onChange={() => toggleSelected(s.id)}
                            className="h-4 w-4 cursor-pointer accent-emerald-500"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <button
                            onClick={() => handleOpenSettlement(s)}
                            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            {s.settlementNumber || s.id}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px] text-neutral-500 dark:text-neutral-400">{s.vendor}</td>
                        <td className="whitespace-nowrap px-4 py-3.5">{s.paymentReceivedDate}</td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <DueBadge schedule={schedule} />
                        </td>
                        <td className="px-4 py-3.5 text-center">{s.transactionCount}</td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-neutral-900 dark:text-neutral-50">
                          {inr(s.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <SettlementStatusStep
                            settlement={s}
                            onStep={(row, step) => {
                              setRowActionError("");
                              setStepTarget({ row, step });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenSettlement(s)}
                              aria-label="View settlement"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-sky-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-sky-400"
                            >
                              <Eye size={14} />
                            </button>
                            {s.status === "Pending Approval" && (
                              <button
                                onClick={() => {
                                  setRowActionError("");
                                  setHoldTarget(s);
                                }}
                                aria-label="Hold settlement"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-amber-400/10 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400"
                              >
                                <PauseCircle size={14} />
                              </button>
                            )}
                            {s.status === "Settlement done" && (
                              <button
                                onClick={() => {
                                  setRowActionError("");
                                  setReverseTarget(s);
                                }}
                                aria-label="Reverse payout"
                                title="Reverse payout"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            {s.status === "Approved" && (
                              <button
                                onClick={() => {
                                  setRowActionError("");
                                  setCancelTarget(s);
                                }}
                                aria-label="Cancel settlement"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setExpandedId(open ? null : s.id)}
                            aria-label="Toggle breakup"
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          >
                            {open ? (
                              <ChevronUp size={15} />
                            ) : (
                              <ChevronDown size={15} />
                            )}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-neutral-100 bg-neutral-50 dark:border-neutral-800/60 dark:bg-neutral-950/60">
                          <td colSpan={10} className="px-6 py-4">
                            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                              Amount Breakup
                            </p>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                              <Field label="Gross Collected" value={inr(s.breakup.grossCollected)} />
                              <Field label="Vendor Promo Cost" value={inr(s.breakup.vendorPromoCost)} />
                              <Field label="Commission" value={inr(s.breakup.commissionAmount)} />
                              <Field label="Commission Tax" value={inr(s.breakup.commissionTax)} />
                              <Field label="Commission Deduction" value={inr(s.breakup.commissionDeduction)} />
                              <Field label="Refund Adjustment" value={inr(s.breakup.refundAdjustment)} />
                              <Field label="Chargeback Adjustment" value={inr(s.breakup.chargebackAdjustment)} />
                              <Field label="Net Payable" value={inr(s.breakup.netPayable)} accent />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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

      {holdTarget && (
        <SettlementReasonModal
          title="Hold settlement?"
          description={`Pause "${holdTarget.settlementNumber || holdTarget.id}" pending review.`}
          actionLabel="Hold"
          tone="amber"
          submitting={rowActionSubmitting}
          error={rowActionError}
          onClose={() => {
            if (rowActionSubmitting) return;
            setHoldTarget(null);
            setRowActionError("");
          }}
          onConfirm={handleHoldConfirm}
        />
      )}

      {bulkKind && (
        <BulkActionModal
          title={BULK_COPY[bulkKind].title}
          actionLabel={BULK_COPY[bulkKind].action}
          input={BULK_COPY[bulkKind].input}
          templateName={`settlements-${bulkKind}`}
          rows={bulkRows}
          getRef={(s) => s.settlementNumber || s.id}
          getAmount={(s) => s.amount}
          getSubtitle={(s) => s.vendor}
          onRun={runBulkOne}
          onClose={closeBulk}
        />
      )}

      {stepTarget && (
        <SettlementStepModal
          settlement={stepTarget.row}
          step={stepTarget.step}
          submitting={rowActionSubmitting}
          error={rowActionError}
          onClose={() => {
            if (rowActionSubmitting) return;
            setStepTarget(null);
            setRowActionError("");
          }}
          onConfirm={handleStepConfirm}
        />
      )}

      {reverseTarget && (
        <SettlementReasonModal
          title="Reverse payout?"
          description={`"${reverseTarget.settlementNumber || reverseTarget.id}" (${inr(reverseTarget.amount)}) moves to Reversed — use this when the bank pulled the credit back and the vendor never got the money.`}
          actionLabel="Reverse Payout"
          tone="red"
          placeholder="e.g. Bank ne credit wapas le liya — vendor ko paisa nahi mila."
          submitting={rowActionSubmitting}
          error={rowActionError}
          onClose={() => {
            if (rowActionSubmitting) return;
            setReverseTarget(null);
            setRowActionError("");
          }}
          onConfirm={handleReverseConfirm}
        />
      )}

      {cancelTarget && (
        <SettlementReasonModal
          title="Cancel settlement?"
          description={`Cancel "${cancelTarget.settlementNumber || cancelTarget.id}" entirely.`}
          actionLabel="Cancel Settlement"
          tone="red"
          submitting={rowActionSubmitting}
          error={rowActionError}
          onClose={() => {
            if (rowActionSubmitting) return;
            setCancelTarget(null);
            setRowActionError("");
          }}
          onConfirm={handleCancelConfirm}
        />
      )}
    </div>
  );
}