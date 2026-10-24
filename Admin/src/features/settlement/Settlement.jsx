import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Wallet,
  Landmark,
  Receipt,
  CheckCircle2,
  Clock3,
  Upload,
  RefreshCw,
  Eye,
  PauseCircle,
  Wrench,
  XCircle,
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
  approveSettlement,
  startSettlementPayout,
  confirmSettlementPayout,
  retrySettlementPayout,
  reverseSettlementPayout,
  holdSettlement,
  cancelSettlement,
  failSettlementPayout,
  abandonSettlement,
  rebuildSettlement,
  writeOffBrandDebt,
} from "./services/SettlementApi";
import {
  useAllSettlements,
  useSettlement,
  useSettlementTransactions,
  usePayoutHealth,
  useBrandSettlementDebt,
} from "./queries/settlementQueries";
import { useSettings } from "../settings/queries/settingsQueries";
import { isValidUtr } from "../refund/refundUtils";
import { queryKeys } from "../../lib/query";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import BulkActionModal from "../../components/common/BulkActionModal";
import BulkSelectBar from "../../components/common/BulkSelectBar";
import StatusStepButton from "../../components/common/StatusStepButton";
import { mapSettlementStatus, SETTLEMENT_TONES, settlementNeedsAttention } from "./settlementUtils";
import SelectDropdown from "../../components/common/SelectDropdown";
import { downloadCsv } from "../../utils/exportTable";
import { todayStr } from "../transaction/transactionUtils";
import { KpiCard, DailyBarsCard, MixCard, PillTabs } from "../../components/common/Overview";
import { pctChange, weekOverWeek, localDateStr } from "../../utils/overviewStats";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, orText } from "../../utils/helpers";


/* -------------------------------------------------------------------------
 * T+N day settlement logic
 * -------------------------------------------------------------------------
 * Rule: payment customer se jis din aata hai (paymentReceivedDate = T),
 * uska settlement N calendar days baad due hota hai (T+N), where N is the
 * backend's own `customer.settlement.delayDays` setting (default 3 per the
 * super admin API doc) — never a number hardcoded here.
 *  - dueDate == today            -> "Today" (Today Settlement)
 *  - dueDate < today             -> "Overdue by Xd" (already due, ab tak settle nahi hua)
 *  - dueDate == today + 1        -> "Tomorrow"
 *  - dueDate > today             -> "In X days" (abhi pending, N din complete nahi hue)
 *  - status === "Settlement done"-> "Completed" (already settled)
 * ---------------------------------------------------------------------- */

const DEFAULT_DELAY_DAYS = 3;

// `delayDays` from GET /settings (customer.settlement), or the doc default.
function useSettlementDelayDays() {
  const { data } = useSettings();
  const n = Number((data?.data ?? data)?.customer?.settlement?.delayDays);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_DAYS;
}

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
function getSettlementSchedule(settlement, delayDays, today = new Date()) {
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

  const dueDate = addDays(received, delayDays);
  const daysLeft = daysBetween(today, dueDate); // dueDate - today

  if (settlement.status === "Settlement done") {
    return { dueDate, dueLabel: "Completed", isToday: false, isOverdue: false, isPending: false, daysLeft };
  }
  // Terminal/paused states — a due-date countdown isn't meaningful once a
  // settlement has left the normal pending → processing → paid path.
  if (["Cancelled", "On hold", "Reversed", "Failed", "Abandoned", "Carried forward", "Draft"].includes(settlement.status)) {
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
// The endpoint doesn't embed the brand's name yet — only `brandId` — so
// "Vendor" shows the brand name when sent and the raw id otherwise.
function normalizeSettlement(raw) {
  const brandId = typeof raw.brandId === "object" ? raw.brandId?._id : raw.brandId;
  return {
    id: raw._id || raw.id || "—",
    settlementNumber: raw.settlementNumber || null,
    brandId: brandId || null,
    vendor: raw.brandName || raw.brand?.brandName || raw.brandId?.brandName || brandId || "—",
    paymentReceivedDate: formatDMYFromISO(raw.periodEnd || raw.periodStart || raw.createdAt) || "—",
    // Local (IST) "YYYY-MM-DD" (not the "DD Mon YYYY" display string above)
    // so the date-range filter and daily chart compare it directly
    // against a native <input type="date"> value.
    dateForFilter: localDateStr(raw.periodEnd || raw.periodStart || raw.createdAt),
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
    documentUrl: raw.documentUrl || null,
    // Why it's stuck / who approved — admin-only fields per the doc.
    failureNote: raw.failureNote || "",
    approvedBy: raw.approvedBy?.name || raw.approvedBy?.fullName || (typeof raw.approvedBy === "string" ? raw.approvedBy : "") || "",
    approvedAt: raw.approvedAt || null,
    taintedTransactionIds: Array.isArray(raw.taintedTransactionIds) ? raw.taintedTransactionIds.map(String) : [],
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

// GET /transactions/admin/health → the signals worth an admin's look.
// The doc names the three settlement signals and their levels; each may
// come as a count, an array, or an object with a count — read all three.
const HEALTH_SIGNALS = [
  { key: "unconfirmedPayouts", level: "critical", text: "payout leg(s) started 24h+ ago with no UTR — money may have moved and the system doesn't know" },
  { key: "overdueSettlements", level: "attention", text: "settlement(s) unpaid for 7+ days — the alert was already sent" },
  { key: "strandedDrafts", level: "attention", text: "empty draft(s) older than 6h — the cleanup job isn't running" },
];

function signalCount(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  if (value && typeof value === "object") return Number(value.count ?? value.total ?? (Array.isArray(value.items) ? value.items.length : 0)) || 0;
  return 0;
}

function readHealthSignals(res) {
  const d = res?.data ?? res ?? {};
  const source = d.signals ?? d.settlements ?? d;
  return HEALTH_SIGNALS.map((s) => ({ ...s, count: signalCount(source?.[s.key]) })).filter((s) => s.count > 0);
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
      {s || "No status"}
    </span>
  );
}

// Shows the T+2 due state: Today / Tomorrow / In X days / Overdue / Completed
function DueBadge({ schedule }) {
  if (!schedule || schedule.dueLabel === "—") {
    return <span className="text-[12px] text-neutral-400 dark:text-neutral-500">No due date</span>;
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

// The admin worklist tab — flagged / Failed / On hold (doc's needsAttention).
const NEEDS_ATTENTION = "Needs attention";

const STATUS_TABS = [
  { key: "All", label: "All" },
  { key: NEEDS_ATTENTION, label: "Needs attention" },
  { key: "Pending Approval", label: "Pending Approval" },
  { key: "Approved", label: "Approved" },
  { key: "Processing", label: "Processing" },
  { key: "Settlement done", label: "Settled" },
];

const AWAITING_PAYOUT = ["Pending Approval", "Approved", "Processing"];

const getSettlementDate = (s) => s.dateForFilter;
const getSettlementAmount = (s) => s.amount;

// A big payout can go out in several NEFT legs; the settlement is PAID
// only once they add up. The confirm response says where it stands.
function confirmSettled(res) {
  const d = res?.data ?? res ?? {};
  return d.settled !== false;
}

function confirmMessage(res) {
  const d = res?.data ?? res ?? {};
  if (d.settled === false) {
    return `Leg confirmed. Paid so far ${inr(d.paidSoFar)}, remaining ${inr(d.remaining)} — confirm the next leg once it lands.`;
  }
  return res?.message || "Payout confirmed.";
}

/* -------------------------------------------------------------------------
 * Detail view (mirrors the vendor-side settlement detail screen)
 * ---------------------------------------------------------------------- */

function SettlementDetail({ settlement, delayDays, detailLoading, onBack, onViewReserveBasis }) {
  const b = settlement.breakup;
  const schedule = useMemo(() => getSettlementSchedule(settlement, delayDays), [settlement, delayDays]);

  // Approve → Start Payout → Confirm Payout — the real admin workflow.
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showConfirmBox, setShowConfirmBox] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ utr: "", mode: "NEFT", reference: "", paidAt: "" });
  const [showReverseBox, setShowReverseBox] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  // The other actions share one inline box (see ACTION_BOXES below).
  const [openBox, setOpenBox] = useState(null);
  const [boxText, setBoxText] = useState("");

  // The detail, its statement lines and the list behind it all refetch
  // after the write by themselves (shared interceptor → ["settlements"]).
  // `fn` may return a success message to show (e.g. legs still remaining).
  const runAction = async (fn) => {
    setActionSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const message = await fn();
      if (message) setActionSuccess(message);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Opening any action box clears the last action's error.
  const toggleBox = (setter) => {
    setActionError("");
    setter((v) => !v);
  };
  const toggleSharedBox = (key) => {
    setActionError("");
    setBoxText("");
    setOpenBox((k) => (k === key ? null : key));
  };

  const handleApprove = () =>
    runAction(async () => {
      const res = await approveSettlement(settlement.id, { note: approveNote.trim() || undefined });
      setShowApproveBox(false);
      setApproveNote("");
      return res?.message;
    });

  const handleConfirmPayout = () =>
    runAction(async () => {
      const res = await confirmSettlementPayout(settlement.id, {
        utr: confirmForm.utr.trim(),
        mode: confirmForm.mode,
        reference: confirmForm.reference.trim() || undefined,
        paidAt: confirmForm.paidAt ? new Date(confirmForm.paidAt).toISOString() : new Date().toISOString(),
      });
      setShowConfirmBox(false);
      setConfirmForm({ utr: "", mode: "NEFT", reference: "", paidAt: "" });
      return confirmMessage(res);
    });

  const handleRetry = () =>
    runAction(async () => (await retrySettlementPayout(settlement.id))?.message);

  // Reverse only makes sense once a settlement has actually been paid out
  // (PAID → REVERSED in the confirmed lifecycle) — no real "canReverse"
  // flag exists yet, so this is inferred from the status itself.
  const handleReverse = () =>
    runAction(async () => {
      const res = await reverseSettlementPayout(settlement.id, { reason: reverseReason.trim() });
      setShowReverseBox(false);
      setReverseReason("");
      return res?.message;
    });

  // Confirm Payout checks: the UTR must look like a bank reference and
  // `paidAt` (when the bank moved the money) can't be in the future.
  const utrValid = isValidUtr(confirmForm.utr);
  const paidAtInFuture = Boolean(confirmForm.paidAt) && new Date(confirmForm.paidAt) > new Date();

  // Which lifecycle actions apply — the API sends canApprove / canPay /
  // canRetry; the rest follow the doc's state table.
  const st = settlement.status;
  const canReverse = st === "Settlement done";
  const canConfirm = st === "Processing";

  // Actions that need only a confirm (and maybe a required text) — one box
  // each, per the super admin API doc's settlement endpoints.
  const ACTION_BOXES = {
    pay: {
      show: settlement.canPay,
      button: "Start Payout",
      icon: Wallet,
      primary: true,
      note: `${inr(settlement.amount)} goes to ${settlement.accountHolderName} · ${settlement.maskedAccountNumber}. A NEFT can't be recalled; if the bank account changed since the build, it goes On hold instead.`,
      confirm: "Confirm Start Payout",
      run: () => startSettlementPayout(settlement.id),
    },
    fail: {
      show: canConfirm,
      button: "Mark Payout Failed",
      icon: XCircle,
      tone: "red",
      label: "What the bank said",
      placeholder: "e.g. Beneficiary name mismatch — bank returned the NEFT.",
      note: "The bounced leg is kept on record. Fix the account, then Retry.",
      confirm: "Mark Failed",
      run: (text) => failSettlementPayout(settlement.id, { note: text }),
    },
    abandon: {
      show: st === "Failed",
      button: "Abandon",
      icon: Ban,
      tone: "red",
      label: "Reason",
      placeholder: "e.g. Vendor closed the account; pay in the next cycle.",
      note: "Rows are released and the money comes back in a later settlement. Use Retry instead if this same payout should go again.",
      confirm: "Abandon Settlement",
      run: (text) => abandonSettlement(settlement.id, { note: text }),
    },
    hold: {
      show: st === "Pending Approval",
      button: "Hold",
      icon: PauseCircle,
      label: "Reason (staff only — the vendor just sees \"on hold\")",
      placeholder: "e.g. Refund raised after the build — checking.",
      confirm: "Hold",
      run: (text) => holdSettlement(settlement.id, { reason: text }),
    },
    rebuild: {
      show: st === "On hold",
      button: "Rebuild",
      icon: Wrench,
      note: "Drops only the flagged rows; clean rows stay in this settlement. If nothing (or less than the minimum payout) is left, it is carried forward.",
      confirm: "Rebuild",
      run: () => rebuildSettlement(settlement.id),
    },
    cancel: {
      show: st === "On hold" || st === "Approved",
      button: "Cancel Settlement",
      icon: Ban,
      tone: "red",
      label: "Reason",
      placeholder: "e.g. Wrong period — rebuilding next cycle.",
      note: "Every row moves to the next cycle.",
      confirm: "Cancel Settlement",
      run: (text) => cancelSettlement(settlement.id, { reason: text }),
    },
  };
  const box = openBox ? ACTION_BOXES[openBox] : null;

  const handleBoxConfirm = () =>
    runAction(async () => {
      const res = await box.run(boxText.trim());
      setOpenBox(null);
      setBoxText("");
      return res?.message;
    });

  const showActions =
    settlement.canApprove ||
    settlement.canRetry ||
    canConfirm ||
    canReverse ||
    Object.values(ACTION_BOXES).some((a) => a.show);

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
        >
          <ArrowLeft size={16} />
          {orText(settlement.settlementNumber || settlement.id, MISSING.id)}
        </button>
        <div className="flex items-center gap-2">
          {detailLoading && (
            <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
              <Loader2 size={13} className="animate-spin" />
              Refreshing…
            </span>
          )}
          {/* The statement PDF generator isn't built yet (doc: "abhi nahi
              bana") — the button shows only once a document URL exists. */}
          {settlement.documentUrl && (
            <a
              href={settlement.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              <Download size={14} />
              Download Statement
            </a>
          )}
        </div>
      </div>

      {/* Why this settlement is stuck — admin-only details per the doc. */}
      {settlement.needsRevalidation && (
        <div className="mb-4 rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-amber-700 dark:text-amber-400">
            <ShieldAlert size={15} className="shrink-0" />
            Needs revalidation — a refund or dispute arrived after this settlement was built
          </p>
          <p className="mt-1 text-[12.5px] text-neutral-600 dark:text-neutral-300">
            Approve will be refused until it's rebuilt. Put it on hold, then Rebuild to drop only the affected rows.
          </p>
          {settlement.taintedTransactionIds.length > 0 && (
            <p className="mt-2 break-all font-mono text-[11.5px] text-neutral-500">
              Affected transactions: {settlement.taintedTransactionIds.join(", ")}
            </p>
          )}
        </div>
      )}
      {settlement.failureNote && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl bg-red-500/5 p-4 text-[13px] text-red-600 ring-1 ring-red-400/30 dark:text-red-400">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold">Failure note:</span> {settlement.failureNote}
          </span>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={14} className="shrink-0" />
          {actionSuccess}
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
                onClick={() => toggleBox(setShowApproveBox)}
                disabled={actionSubmitting}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
            )}
            {Object.entries(ACTION_BOXES)
              .filter(([, a]) => a.show)
              .map(([key, a]) => {
                const Icon = a.icon;
                return (
                  <button
                    key={key}
                    onClick={() => toggleSharedBox(key)}
                    disabled={actionSubmitting}
                    className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      a.primary
                        ? "bg-emerald-400 font-semibold text-neutral-950 hover:bg-emerald-300"
                        : a.tone === "red"
                        ? "border border-red-400/40 font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        : "border border-neutral-200 font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <Icon size={14} />
                    {a.button}
                  </button>
                );
              })}
            {canConfirm && (
              <button
                onClick={() => toggleBox(setShowConfirmBox)}
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
                onClick={() => toggleBox(setShowReverseBox)}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextField
                  label="UTR"
                  value={confirmForm.utr}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, utr: e.target.value }))}
                  placeholder="HDFCN52026102200123"
                  error={confirmForm.utr.trim() && !utrValid ? "12–22 letters or digits" : ""}
                />
                <TextField
                  label="Reference (optional — defaults to the UTR)"
                  value={confirmForm.reference}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, reference: e.target.value }))}
                  placeholder="Bank statement reference"
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
                  label="Paid At (when the bank sent it — not now)"
                  type="datetime-local"
                  value={confirmForm.paidAt}
                  onChange={(e) => setConfirmForm((p) => ({ ...p, paidAt: e.target.value }))}
                  error={paidAtInFuture ? "Can't be in the future" : ""}
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
                  disabled={actionSubmitting || !utrValid || paidAtInFuture}
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

          {box && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
              {box.note && <p className="mb-3 text-[12.5px] text-neutral-600 dark:text-neutral-300">{box.note}</p>}
              {box.label && (
                <TextField
                  label={box.label}
                  value={boxText}
                  onChange={(e) => setBoxText(e.target.value)}
                  placeholder={box.placeholder}
                />
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenBox(null)}
                  className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBoxConfirm}
                  disabled={actionSubmitting || (box.label && !boxText.trim())}
                  className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    box.tone === "red" ? "bg-red-500 text-white hover:bg-red-400" : "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
                  }`}
                >
                  {actionSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {box.confirm}
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
          <Field label="Settlement Id" value={settlement.settlementNumber || settlement.id} fallback={MISSING.id} />
          <Field label="Settlement Bank Name" value={settlement.bankName} fallback="Not added" />
          <Field label="Settlement Request Id" value={settlement.requestId} fallback={MISSING.id} />
          <Field label="Account Holder" value={settlement.accountHolderName} fallback="Not added" />
          <Field label="Bank Account" value={settlement.maskedAccountNumber} fallback="Not added" />
          <Field label="IFSC Code" value={settlement.ifscCode} fallback="Not added" />
          <Field label="Transactions" value={settlement.transactionCount ?? 0} />
          <Field label="Cycle Type" value={settlement.cycleType} fallback={MISSING.date} />
          <Field label="Payout Provider" value={settlement.payoutProvider} fallback={MISSING.method} />
          <Field label="Created On" value={settlement.createdAt} fallback={MISSING.date} />
          <Field label="Statement Token" value={settlement.documentToken} fallback="Not issued" />
          <Field label="Period Start" value={settlement.periodStart} fallback={MISSING.date} />
          <Field label="Period End" value={settlement.periodEnd} fallback={MISSING.date} />
          {settlement.approvedBy && <Field label="Approved By" value={settlement.approvedBy} />}
          {settlement.approvedAt && <Field label="Approved At" value={formatGenericValue(settlement.approvedAt)} />}
          {settlement.attemptCount > 0 && <Field label="Payout Attempts" value={settlement.attemptCount} />}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={settlement.status} />
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <CalendarClock size={13} />
            T+{delayDays} due{schedule.dueDate ? `: ${formatDMY(schedule.dueDate)}` : ""}
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

      {settlement.brandId && <BrandDebtSection brandId={settlement.brandId} />}

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
                  <Field label="UTR" value={leg.utr} fallback="No UTR yet" />
                  <Field label="Mode" value={leg.mode} fallback={MISSING.method} />
                  <Field label="Provider" value={leg.provider} fallback={MISSING.method} />
                  <Field label="Bank Last4" value={leg.bankLast4} fallback="Not added" />
                  <Field label="Initiated At" value={formatGenericValue(leg.initiatedAt)} fallback="Not yet" />
                  <Field label="Paid At" value={formatGenericValue(leg.paidAt)} fallback="Not yet" />
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
                      <ValueOr value={formatGenericValue(ev.at)} fallback="Time not recorded" />
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
                            <span className="text-neutral-700 dark:text-neutral-200"><ValueOr value={m.value} /></span>
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

      {/* No settlement-ticket API exists, so there is no ticket section. */}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Brand debt — GET /settlements/admin/debt/:brandId and its write-off.
 * A settlement with netPayable <= 0 carries forward; once the brand stops
 * selling, that debt just sits on our books (doc: "Settlements — jo 12 me
 * nahi the"). Fetched only when asked, since most brands owe nothing.
 * ---------------------------------------------------------------------- */
export function BrandDebtSection({ brandId }) {
  const [asked, setAsked] = useState(false);
  const debtQuery = useBrandSettlementDebt(asked ? brandId : null);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [form, setForm] = useState({ reason: "", olderThanDays: "90" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const debt = debtQuery.data?.data ?? debtQuery.data ?? null;
  // The response shape isn't documented — show its scalar fields as-is.
  const entries = debt && typeof debt === "object"
    ? Object.entries(debt).filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
    : [];
  const days = Number(form.olderThanDays);
  const formValid = form.reason.trim() && Number.isInteger(days) && days >= 0;

  const handleWriteOff = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await writeOffBrandDebt(brandId, { reason: form.reason.trim(), olderThanDays: days });
      setSuccess(res?.message || "Debt written off.");
      setShowWriteOff(false);
      setForm({ reason: "", olderThanDays: "90" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Brand Debt</h3>
        {!asked ? (
          <button
            onClick={() => setAsked(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[12.5px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Landmark size={13} />
            Check debt
          </button>
        ) : (
          <button
            onClick={() => {
              setError("");
              setShowWriteOff((v) => !v);
            }}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-red-400/40 px-3 text-[12.5px] font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            Write off
          </button>
        )}
      </div>

      {asked && debtQuery.isPending && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-neutral-500">
          <Loader2 size={13} className="animate-spin" /> Loading…
        </p>
      )}
      {asked && debtQuery.error && (
        <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">{debtQuery.error.message}</p>
      )}
      {asked && !debtQuery.isPending && !debtQuery.error && (
        entries.length ? (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {entries.map(([k, v]) => (
              <Field key={k} label={humanizeKey(k)} value={typeof v === "number" && /amount|debt|total|owed/i.test(k) ? inr(v) : formatGenericValue(v)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-neutral-500">No debt recorded for this brand.</p>
        )
      )}

      {showWriteOff && (
        <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
          <p className="mb-3 text-[12.5px] text-neutral-600 dark:text-neutral-300">
            Writes off this brand's carried-forward debt older than the given days. The loss is booked as platform cost.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <TextField
                label="Reason"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Brand closed in March; not recoverable."
              />
            </div>
            <TextField
              label="Older than (days)"
              type="number"
              value={form.olderThanDays}
              onChange={(e) => setForm((p) => ({ ...p, olderThanDays: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowWriteOff(false)}
              className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleWriteOff}
              disabled={submitting || !formValid}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-3.5 text-[13px] font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Confirm Write Off
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
      {success && <p className="mt-3 text-[12.5px] text-emerald-700 dark:text-emerald-400">{success}</p>}
    </section>
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
          Reserve Basis · {orText(settlement.settlementNumber || settlement.id, MISSING.id)}
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
          <Field label="Reserve Reason" value={settlement.reserveLabel} fallback={MISSING.reason} />
        </div>
      </section>
    </div>
  );
}

// Values wrap instead of being cut off, so long ids/tokens show in full.
function Field({ label, value, accent, fallback = MISSING.generic }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 break-words text-[13.5px] font-medium ${
          accent ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        <ValueOr value={value} fallback={fallback} />
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
  // There is no "unhold" — per the doc an ON_HOLD settlement is rebuilt
  // (or cancelled from the detail page).
  if (s.status === "On hold") return { key: "rebuild", label: "Rebuild" };
  return null;
}

// What a row looks like right after a step succeeds — applied instantly so
// the pill changes on click, then the silent refetch brings the real data.
// Rebuild's outcome (back to approval, or carried forward) is the
// server's call, so it waits for the refetch.
const STEP_RESULT = {
  approve: { status: "Approved", canApprove: false, canPay: true },
  payout: { status: "Processing", canPay: false },
  confirm: { status: "Settlement done" },
  // FAILED → APPROVED with a new leg — it still has to be paid again.
  retry: { status: "Approved", canRetry: false, canPay: true },
  // PAID → REVERSED: the bank pulled the credit back after payout.
  reverse: { status: "Reversed" },
  hold: { status: "On hold", canApprove: false },
  rebuild: {},
};

// Confirm only flips to "Settlement done" once every leg is paid.
function stepPatch(stepKey, res) {
  if (stepKey === "confirm" && !confirmSettled(res)) return {};
  return STEP_RESULT[stepKey];
}

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
  retry: { title: "Retry payout?", description: "It goes back to Approved with a fresh bank snapshot, ready to pay again.", action: "Retry Payout" },
  rebuild: { title: "Rebuild settlement?", description: "Drops only the flagged rows; if too little is left it is carried forward.", action: "Rebuild" },
};

function SettlementStepModal({ settlement, step, submitting, error, onClose, onConfirm }) {
  const copy = STEP_COPY[step.key];
  const [note, setNote] = useState("");
  const [confirmForm, setConfirmForm] = useState({ utr: "", mode: "NEFT", reference: "", paidAt: "" });
  const needsUtr = step.key === "confirm";
  const utrValid = isValidUtr(confirmForm.utr);
  const paidAtInFuture = Boolean(confirmForm.paidAt) && new Date(confirmForm.paidAt) > new Date();

  const submit = () => {
    if (step.key === "approve") return onConfirm({ note: note.trim() || undefined });
    if (needsUtr) {
      return onConfirm({
        utr: confirmForm.utr.trim(),
        mode: confirmForm.mode,
        reference: confirmForm.reference.trim() || undefined,
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
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{orText(settlement.settlementNumber || settlement.id, MISSING.id)}</span>
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
              placeholder="HDFCN52026102200123"
              error={confirmForm.utr.trim() && !utrValid ? "12–22 letters or digits" : ""}
            />
            <TextField
              label="Reference (optional — defaults to the UTR)"
              value={confirmForm.reference}
              onChange={(e) => setConfirmForm((p) => ({ ...p, reference: e.target.value }))}
              placeholder="Bank statement reference"
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
                error={paidAtInFuture ? "Can't be in the future" : ""}
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
            disabled={submitting || (needsUtr && (!utrValid || paidAtInFuture))}
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

// Every page of settlements; search, filters and pagination are client-side.
const LIST_PARAMS = {};

// The list response keeps its rows at `data.data` or straight at `data` —
// maps `fn` over them wherever they are, keeping the response's shape.
function mapRawSettlements(res, fn) {
  if (Array.isArray(res?.data?.data)) return { ...res, data: { ...res.data, data: res.data.data.map(fn) } };
  if (Array.isArray(res?.data)) return { ...res, data: res.data.map(fn) };
  return res;
}

export default function Settlement() {
  const queryClient = useQueryClient();
  const delayDays = useSettlementDelayDays();
  const {
    data: listRes,
    isPending: loading,
    isFetching,
    error,
    refetch,
  } = useAllSettlements(LIST_PARAMS);
  // Payout health: failures that look like nothing happened (doc).
  const { data: healthRes } = usePayoutHealth();
  const healthSignals = useMemo(() => readHealthSignals(healthRes), [healthRes]);
  const loadError = error?.message ?? "";
  const settlements = useMemo(
    () =>
      (listRes?.data?.data ?? listRes?.data ?? []).map((raw) =>
        // `_patch` = optimistic overrides from patchSettlement; the refetch
        // the write triggers replaces the raw row, dropping it.
        raw._patch ? { ...normalizeSettlement(raw), ...raw._patch } : normalizeSettlement(raw)
      ),
    [listRes]
  );
  // Flip a row to its next state at once after a step succeeds. The fields
  // are normalized (display status, flags), so they ride on the cached raw
  // row as `_patch` until the interceptor's refetch lands.
  const patchSettlement = (id, patch) =>
    queryClient.setQueryData(queryKeys.settlements.view("all", LIST_PARAMS), (prev) =>
      mapRawSettlements(prev, (raw) =>
        (raw._id || raw.id) === id ? { ...raw, _patch: { ...raw._patch, ...patch } } : raw
      )
    );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null); // -> detail view
  const [showReserveBasis, setShowReserveBasis] = useState(false); // -> reserve basis page

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

  // List rows are lightweight — pull the full breakup + real statement
  // lines (transactions) once a settlement is opened, same lightweight-list
  // -> full-detail pattern as Brand/Customer.
  const handleOpenSettlement = (row) => {
    setSelectedRow(row);
    setShowReserveBasis(false);
  };
  const detailQuery = useSettlement(selectedRow?.id);
  const statementQuery = useSettlementTransactions(selectedRow?.id);
  const detailLoading = Boolean(selectedRow) && (detailQuery.isFetching || statementQuery.isFetching);

  const selected = useMemo(() => {
    if (!selectedRow) return null;
    const detailRes = detailQuery.data;
    const txnRes = statementQuery.data;
    // Keep showing the lightweight list row until both detail reads have
    // succeeded (or if either fails) — same as the old Promise.all.
    if (!detailRes || !txnRes) return selectedRow;
    // The detail endpoint's `data` carries `settlement`, `legs`,
    // `timeline` and `viewer` as siblings — legs/timeline/viewer are
    // NOT nested inside `settlement`, so they're pulled out here.
    const detailData = detailRes?.data ?? {};
    const rawDetail = detailData.settlement ?? (detailData._id ? detailData : null);
    const txnRows = (txnRes?.data?.data ?? txnRes?.data ?? []).map(normalizeSettlementTransaction);
    return {
      ...selectedRow,
      ...(rawDetail ? normalizeSettlement(rawDetail) : {}),
      legs: Array.isArray(detailData.legs) ? detailData.legs : [],
      timeline: Array.isArray(detailData.timeline) ? detailData.timeline : [],
      viewer: detailData.viewer || null,
      transactions: txnRows,
    };
  }, [selectedRow, detailQuery.data, statementQuery.data]);

  // T+N schedule computed fresh against "now" whenever settlements change
  const schedules = useMemo(() => {
    const now = new Date();
    const map = {};
    settlements.forEach((s) => {
      map[s.id] = getSettlementSchedule(s, delayDays, now);
    });
    return map;
  }, [settlements, delayDays]);

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
    const counts = { All: settlements.length, [NEEDS_ATTENTION]: 0 };
    settlements.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
      if (settlementNeedsAttention(s)) counts[NEEDS_ATTENTION] += 1;
    });
    return counts;
  }, [settlements]);

  const handleHoldConfirm = async (reason) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      await holdSettlement(holdTarget.id, { reason });
      patchSettlement(holdTarget.id, STEP_RESULT.hold);
      setHoldTarget(null);
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
    rebuild: (id) => rebuildSettlement(id),
  };

  const handleStepConfirm = async (payload) => {
    setRowActionSubmitting(true);
    setRowActionError("");
    try {
      const { row, step } = stepTarget;
      const res = await STEP_ACTIONS[step.key](row.id, payload);
      setStepTarget(null);
      // Flip the row's pill to its next state at once; the list refetches
      // by itself (no table spinner) for the server's real status and flags.
      patchSettlement(row.id, stepPatch(step.key, res));
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
      patchSettlement(reverseTarget.id, STEP_RESULT.reverse);
      setReverseTarget(null);
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
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === NEEDS_ATTENTION ? settlementNeedsAttention(s) : s.status === statusFilter);
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
  // An action can move rows out of the tab — never stay past the last page.
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
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
  // Changing the tab, search, status or dates starts over on page 1 and
  // drops the selection, so bulk actions never touch hidden rows.
  const resetView = () => {
    setPage(1);
    clearSelection();
  };

  const selectedRows = settlements.filter((s) => selectedIds.has(s.id));
  // Each bulk action only runs on the selected settlements it's valid for.
  const BULK_ELIGIBLE = {
    approve: (s) => s.canApprove,
    payout: (s) => s.canPay,
    confirm: (s) => s.status === "Processing",
    reverse: (s) => s.status === "Settlement done",
    hold: (s) => s.status === "Pending Approval",
    rebuild: (s) => s.status === "On hold",
  };
  const BULK_COPY = {
    approve: { title: "Approve settlements", action: "Approve", input: "note" },
    payout: { title: "Start payout", action: "Start Payout", input: "none" },
    confirm: { title: "Confirm payouts", action: "Confirm Payouts", input: "utr" },
    reverse: { title: "Reverse payouts", action: "Reverse", input: "reason" },
    hold: { title: "Put on hold", action: "Hold", input: "reason" },
    rebuild: { title: "Rebuild settlements", action: "Rebuild", input: "none" },
  };
  const bulkRows = bulkKind ? selectedRows.filter(BULK_ELIGIBLE[bulkKind]) : [];

  // Called once per settlement by the bulk dialog; a throw marks that row failed.
  const runBulkOne = async (row, payload) => {
    // The shared modal sends a note/reason as `text`; approve takes `note`, reverse takes `reason`.
    const body = bulkKind === "approve" ? { note: payload.text } : ["reverse", "hold"].includes(bulkKind) ? { reason: payload.text } : payload;
    const res = await STEP_ACTIONS[bulkKind](row.id, body);
    patchSettlement(row.id, stepPatch(bulkKind, res));
  };
  const closeBulk = () => {
    setBulkKind(null);
    clearSelection();
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
          delayDays={delayDays}
          detailLoading={detailLoading}
          onBack={() => setSelectedRow(null)}
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
              transparency. Settlement cycle: T+{delayDays} days from payment received (from Settings).
            </p>
          </div>
          <div className="flex gap-2">
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

        {/* Payout health — the doc's "fails by looking like nothing
            happened" signals; shown only when something is off. */}
        {healthSignals.length > 0 && (
          <div className="mb-4 space-y-2">
            {healthSignals.map((s) => (
              <div
                key={s.key}
                className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] ring-1 ${
                  s.level === "critical"
                    ? "bg-red-500/5 text-red-600 ring-red-400/30 dark:text-red-400"
                    : "bg-amber-400/10 text-amber-700 ring-amber-400/30 dark:text-amber-400"
                }`}
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">{s.level === "critical" ? "Critical" : "Attention"}:</span> {s.count} {s.text}.
                </span>
              </div>
            ))}
          </div>
        )}

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
            sub={`${todaySettlementStats.count} due today · T+${delayDays} cycle`}
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
            resetView();
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
                resetView();
              }}
              placeholder="Search settlement id or number, vendor..."
              className="w-44 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 sm:w-56"
            />
          </div>
          <SelectDropdown
            value={statusFilter}
            options={STATUS_OPTIONS}
            icon={Filter}
            onChange={(s) => {
              setStatusFilter(s);
              resetView();
            }}
          />
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
            onClick={() => {
              setShowTodayOnly((v) => !v);
              resetView();
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
              { key: "rebuild", label: "Rebuild", icon: Wrench },
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
                  <th className="px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Due (T+{delayDays})</th>
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
                            {orText(s.settlementNumber || s.id, MISSING.id)}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[12px] text-neutral-500 dark:text-neutral-400"><ValueOr value={s.vendor} fallback="No brand" /></td>
                        <td className="whitespace-nowrap px-4 py-3.5"><ValueOr value={s.paymentReceivedDate} fallback={MISSING.date} /></td>
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
                            {(s.status === "Approved" || s.status === "On hold") && (
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
          getSubtitle={(s) => orText(s.vendor, "No brand")}
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