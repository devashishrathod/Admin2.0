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
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  CalendarClock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { getSettlements, getSettlementById, getSettlementTransactions, raiseTicket } from "./services/SettlementApi";


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

// Real backend status enums aren't confirmed yet, so this maps any
// reasonable variant onto the 3 states this UI already renders
// (StatusBadge / DueBadge / STATUS_OPTIONS) — unrecognized values fall
// back to "Processing" rather than crashing the badge lookup.
function mapSettlementStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (["COMPLETED", "DONE", "SETTLED", "SUCCESS", "SETTLEMENT_DONE"].includes(s)) return "Settlement done";
  if (["ON_HOLD", "HOLD", "ONHOLD"].includes(s)) return "On hold";
  return "Processing";
}

// Normalizes the amount-breakup sub-object — field names aren't confirmed
// against a real response yet, so this tries a few reasonable aliases and
// defaults every unknown figure to 0 rather than inventing one.
function normalizeBreakup(raw) {
  const b = raw.breakup || raw.amountBreakup || {};
  return {
    discount: Number(b.discount ?? b.discountAmount) || 0,
    dealPack: Number(b.dealPack ?? b.dealPackAmount) || 0,
    membership: Number(b.membership ?? b.membershipAmount) || 0,
    gst: Number(b.gst ?? b.gstAmount) || 0,
    processingFee: Number(b.processingFee) || 0,
    serviceCharge: Number(b.serviceCharge) || 0,
    refundFee: Number(b.refundFee) || 0,
    paid: Number(b.paid ?? b.settledAmount ?? raw.amount) || 0,
  };
}

// Normalizes one real settlement record (GET /settlements or
// /settlements/:id) into the flat shape this page's table/detail view
// already expect. Since no real response body was confirmed for this
// endpoint yet, field names use defensive fallbacks — tighten these once
// a real response is pasted, same as every other page in this app.
function normalizeSettlement(raw) {
  return {
    id: raw._id || raw.settlementId || raw.id || "—",
    vendor: raw.vendor || raw.brand?.brandName || raw.brandName || "—",
    paymentReceivedDate:
      formatDMYFromISO(raw.paymentReceivedDate || raw.paymentReceivedAt || raw.createdAt) || "—",
    settlementDate: formatDMYFromISO(raw.settlementDate || raw.settledAt) || "—",
    transactionId: raw.transactionId || raw.txnId || "—",
    amount: Number(raw.amount ?? raw.settledAmount) || 0,
    status: mapSettlementStatus(raw.status),
    bankName: raw.bankName || raw.bankAccount?.bankName || "—",
    requestId: raw.requestId || raw.settlementRequestId || "—",
    breakup: normalizeBreakup(raw),
    transactions: [],
    tickets: [],
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

const STATUS_OPTIONS = ["All", "Settlement done", "Processing", "On hold"];
const FORM_STATUS_OPTIONS = ["Processing", "On hold", "Settlement done"];

const VENDOR_OPTIONS = [
  "Rajwada Sweets & Namkeen",
  "Kavya Mehndi Art Studio",
  "UrbanFit Studio",
];

const EMPTY_FORM = {
  id: null,
  settlementId: "",
  vendor: VENDOR_OPTIONS[0],
  paymentReceivedDate: "",
  settlementDate: "",
  transactionId: "",
  bankName: "",
  requestId: "",
  status: "Processing",
  discount: "",
  dealPack: "",
  membership: "",
  gst: "",
  processingFee: "",
  serviceCharge: "",
  refundFee: "",
  paid: "",
};

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const inr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const styles = {
    "Settlement done": "bg-emerald-400/10 text-emerald-400 ring-emerald-400/30",
    Processing: "bg-amber-400/10 text-amber-400 ring-amber-400/30",
    "On hold": "bg-red-400/10 text-red-400 ring-red-400/30",
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

function StatCard({ icon: Icon, label, amount, sub, live }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500 dark:text-neutral-400">
        <Icon size={15} className="text-emerald-400" />
        {label}
        {live && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live Update
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
 * Detail view (mirrors the vendor-side settlement detail screen)
 * ---------------------------------------------------------------------- */

function SettlementDetail({ settlement, detailLoading, onBack }) {
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

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13.5px] font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
        >
          <ArrowLeft size={16} />
          {settlement.id}
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

      {/* Settlement information */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Settlement Information
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="To Credit Amount" value={inr(settlement.amount)} accent />
          <Field label="Settlement Id" value={settlement.id} />
          <Field label="Settlement Bank Name" value={settlement.bankName} />
          <Field label="Settlement Request Id" value={settlement.requestId} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={settlement.status} />
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
            <CalendarClock size={13} />
            T+{SETTLEMENT_CYCLE_DAYS} due{schedule.dueDate ? `: ${formatDMY(schedule.dueDate)}` : ""}
          </span>
          <DueBadge schedule={schedule} />
        </div>
      </section>

      {/* Amount breakup */}
      <section className="mb-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
          Amount Breakup Information
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Discount Summary" value={inr(b.discount)} />
          <Field label="Deal Pack Summary" value={inr(b.dealPack)} />
          <Field label="Membership Summary" value={inr(b.membership)} />
          <Field label="GST Summary" value={inr(b.gst)} />
          <Field label="Processing Fee" value={inr(b.processingFee)} />
          <Field label="Refund Fee" value={inr(b.refundFee)} />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-400/10 px-4 py-3">
          <span className="text-[13px] text-neutral-700 dark:text-neutral-300">
            Your intended amount has been credited
          </span>
          <span className="text-[14px] font-semibold text-emerald-400">
            {inr(b.paid)}
          </span>
        </div>
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

/* -------------------------------------------------------------------------
 * Add / Edit Settlement form modal
 * ---------------------------------------------------------------------- */

const NUMBER_FIELDS = [
  { key: "discount", label: "Discount Summary" },
  { key: "dealPack", label: "Deal Pack Summary" },
  { key: "membership", label: "Membership Summary" },
  { key: "gst", label: "GST Summary" },
  { key: "processingFee", label: "Processing Fee" },
  { key: "serviceCharge", label: "Service Charge" },
  { key: "refundFee", label: "Refund Fee" },
];

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

function SettlementFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const isEdit = Boolean(form.id);

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const autoFillPaid = () => {
    const sum =
      Number(form.discount || 0) +
      Number(form.dealPack || 0) +
      Number(form.membership || 0) +
      Number(form.gst || 0) -
      Number(form.processingFee || 0) -
      Number(form.serviceCharge || 0) -
      Number(form.refundFee || 0);
    setForm((prev) => ({ ...prev, paid: sum > 0 ? sum : 0 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.vendor) nextErrors.vendor = "Select a vendor";
    if (!form.settlementId.trim())
      nextErrors.settlementId = "Settlement id is required";
    if (!form.transactionId.trim())
      nextErrors.transactionId = "Transaction id is required";
    if (!form.paid || Number(form.paid) <= 0)
      nextErrors.paid = "Enter a valid settlement amount";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 py-8 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              {isEdit ? "Edit Settlement" : "Add Settlement"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit
                ? "Update this vendor's settlement record."
                : "Manually create a settlement record for a vendor."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {/* Vendor + identifiers */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Vendor
              </label>
              <select
                value={form.vendor}
                onChange={setField("vendor")}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              >
                {VENDOR_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {errors.vendor && (
                <p className="mt-1.5 text-[12px] text-red-400">{errors.vendor}</p>
              )}
            </div>
            <TextField
              label="Settlement Id"
              value={form.settlementId}
              onChange={setField("settlementId")}
              placeholder="setl_XXXXXXXXXXXX"
              error={errors.settlementId}
            />
            <TextField
              label="Transaction Id"
              value={form.transactionId}
              onChange={setField("transactionId")}
              placeholder="e.g. 05B00076"
              error={errors.transactionId}
            />
            <TextField
              label="Settlement Request Id"
              value={form.requestId}
              onChange={setField("requestId")}
              placeholder="Optional"
            />
            <TextField
              label="Bank Name"
              value={form.bankName}
              onChange={setField("bankName")}
              placeholder="e.g. Kotak Mahindra Bank"
            />
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Status
              </label>
              <select
                value={form.status}
                onChange={setField("status")}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              >
                {FORM_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <TextField
                label="Payment Received Date"
                type="date"
                value={form.paymentReceivedDate}
                onChange={setField("paymentReceivedDate")}
              />
              <p className="mt-1.5 text-[11.5px] text-neutral-600">
                Settlement due date auto-calculates as T+{SETTLEMENT_CYCLE_DAYS} from this date.
              </p>
            </div>
            <TextField
              label="Settlement Date"
              type="date"
              value={form.settlementDate}
              onChange={setField("settlementDate")}
            />
          </div>

          {/* Amount breakup */}
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Amount Breakup
            </label>
            <button
              type="button"
              onClick={autoFillPaid}
              className="text-[12px] font-medium text-emerald-400 hover:underline"
            >
              Auto-calculate settlement amount
            </button>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {NUMBER_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                type="number"
                value={form[f.key]}
                onChange={setField(f.key)}
                placeholder="0"
              />
            ))}
          </div>

          <div className="mb-6">
            <TextField
              label="Settlement Amount (paid to vendor)"
              type="number"
              value={form.paid}
              onChange={setField("paid")}
              placeholder="0"
              error={errors.paid}
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              {isEdit ? "Save Changes" : "Add Settlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * List / overview view
 * ---------------------------------------------------------------------- */

export default function Settlement() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // -> detail view
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
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
    setDetailLoading(true);
    try {
      const [detailRes, txnRes] = await Promise.all([
        getSettlementById(row.id),
        getSettlementTransactions(row.id, { page: 1, limit: 50 }),
      ]);
      const rawDetail = detailRes?.data?.settlement ?? detailRes?.data ?? null;
      const txnRows = (txnRes?.data?.data ?? txnRes?.data ?? []).map(normalizeSettlementTransaction);
      setSelected((prev) => ({
        ...prev,
        ...(rawDetail ? normalizeSettlement(rawDetail) : {}),
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

  const handleAddClick = () => {
    setEditingSettlement(null);
    setModalOpen(true);
  };

  const handleEdit = (s) => {
    setEditingSettlement({
      id: s.id,
      settlementId: s.id,
      vendor: s.vendor,
      paymentReceivedDate: s.paymentReceivedDate,
      settlementDate: s.settlementDate,
      transactionId: s.transactionId,
      bankName: s.bankName,
      requestId: s.requestId,
      status: s.status,
      discount: s.breakup.discount,
      dealPack: s.breakup.dealPack,
      membership: s.breakup.membership,
      gst: s.breakup.gst,
      processingFee: s.breakup.processingFee,
      serviceCharge: s.breakup.serviceCharge,
      refundFee: s.breakup.refundFee,
      paid: s.breakup.paid,
    });
    setModalOpen(true);
  };

  const handleDelete = (s) => {
    setSettlements((prev) => prev.filter((row) => row.id !== s.id));
  };

  const handleSave = (form) => {
    const breakup = {
      discount: Number(form.discount || 0),
      dealPack: Number(form.dealPack || 0),
      membership: Number(form.membership || 0),
      gst: Number(form.gst || 0),
      processingFee: Number(form.processingFee || 0),
      serviceCharge: Number(form.serviceCharge || 0),
      refundFee: Number(form.refundFee || 0),
      paid: Number(form.paid || 0),
    };

    if (form.id) {
      // Update existing settlement
      setSettlements((prev) =>
        prev.map((row) =>
          row.id === form.id
            ? {
                ...row,
                id: form.settlementId.trim(),
                vendor: form.vendor,
                paymentReceivedDate: form.paymentReceivedDate || row.paymentReceivedDate,
                settlementDate: form.settlementDate || row.settlementDate,
                transactionId: form.transactionId.trim(),
                bankName: form.bankName,
                requestId: form.requestId,
                status: form.status,
                amount: breakup.paid,
                breakup,
              }
            : row
        )
      );
    } else {
      // Create a new settlement record
      setSettlements((prev) => [
        {
          id: form.settlementId.trim(),
          vendor: form.vendor,
          paymentReceivedDate: form.paymentReceivedDate || "—",
          settlementDate: form.settlementDate || "—",
          transactionId: form.transactionId.trim(),
          bankName: form.bankName,
          requestId: form.requestId,
          status: form.status,
          amount: breakup.paid,
          breakup,
          transactions: [
            {
              stage: "Collection Payment",
              title: "Payment received from customer",
              date: form.paymentReceivedDate || "—",
              meta: [{ label: "Payment Platform", value: "—" }],
            },
          ],
          tickets: [],
        },
        ...prev,
      ]);
    }
    setModalOpen(false);
    setEditingSettlement(null);
  };

  const filtered = useMemo(() => {
    return settlements.filter((s) => {
      const matchesSearch =
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.vendor.toLowerCase().includes(search.toLowerCase()) ||
        s.transactionId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      const matchesToday = !showTodayOnly || schedules[s.id]?.isToday;
      return matchesSearch && matchesStatus && matchesToday;
    });
  }, [settlements, search, statusFilter, showTodayOnly, schedules]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRows = filtered.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  if (selected) {
    return (
      <div className="min-h-screen p-6">
        <SettlementDetail
          settlement={selected}
          detailLoading={detailLoading}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Settlement
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Monitor payment settlements across all vendors with complete
              transparency. Settlement cycle: T+{SETTLEMENT_CYCLE_DAYS} days from payment received.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddClick}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              <Plus size={15} />
              Add Settlement
            </button>
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

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Wallet}
            label="Previous settlement"
            amount={previousSettlement?.amount || 0}
            sub={previousSettlement ? `Settled on ${previousSettlement.settlementDate}` : "No settlements yet"}
          />
          <StatCard
            icon={CalendarClock}
            label="Today settlement"
            amount={todaySettlementStats.amount}
            sub={`No. of Count : ${String(todaySettlementStats.count).padStart(2, "0")} · T+${SETTLEMENT_CYCLE_DAYS} due today`}
            live
          />
          <StatCard
            icon={Landmark}
            label="Available balance"
            amount={0}
            sub="No live balance API yet"
          />
          <StatCard
            icon={Receipt}
            label="GST balance"
            amount={0}
            sub="No live balance API yet"
          />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            Settlement Overview
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
              <Search size={15} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search settlement id, vendor, txn id..."
                className="w-56 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-1 dark:border-neutral-800 dark:bg-neutral-900">
              <Filter size={14} className="ml-1.5 text-neutral-500" />
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowTodayOnly((v) => !v);
                setPage(1);
              }}
              className={`flex h-[38px] items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-medium transition-colors ${
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
            <button className="flex h-[38px] items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading settlements…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load settlements: {loadError}
          </div>
        ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[11.5px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                <th className="px-5 py-4 font-medium">Settlement Id</th>
                <th className="px-5 py-4 font-medium">Vendor</th>
                <th className="px-5 py-4 font-medium">Payment Received</th>
                <th className="px-5 py-4 font-medium">Settlement Due (T+{SETTLEMENT_CYCLE_DAYS})</th>
                <th className="px-5 py-4 font-medium">Transaction Id</th>
                <th className="px-5 py-4 text-right font-medium">Amount</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Actions</th>
                <th className="px-5 py-4 text-right font-medium">Info</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
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
                      className={`text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/30 ${
                        schedule?.isToday ? "bg-cyan-400/[0.04]" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleOpenSettlement(s)}
                          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {s.id}
                        </button>
                      </td>
                      <td className="px-5 py-4">{s.vendor}</td>
                      <td className="px-5 py-4">{s.paymentReceivedDate}</td>
                      <td className="px-5 py-4">
                        <DueBadge schedule={schedule} />
                      </td>
                      <td className="px-5 py-4">{s.transactionId}</td>
                      <td className="px-5 py-4 text-right font-medium text-neutral-900 dark:text-neutral-50">
                        {inr(s.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(s)}
                            aria-label="Edit settlement"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            aria-label="Delete settlement"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setExpandedId(open ? null : s.id)}
                          aria-label="Toggle breakup"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
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
                      <tr className="bg-neutral-50 dark:bg-neutral-950/60">
                        <td colSpan={9} className="px-6 py-4">
                          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                            Amount Breakup
                          </p>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
                            <Field
                              label="Discount Summary"
                              value={inr(s.breakup.discount)}
                            />
                            <Field
                              label="Deal Pack Summary"
                              value={inr(s.breakup.dealPack)}
                            />
                            <Field
                              label="Membership Summary"
                              value={inr(s.breakup.membership)}
                            />
                            <Field label="GST Summary" value={inr(s.breakup.gst)} />
                            <Field
                              label="Processing Fee"
                              value={inr(s.breakup.processingFee)}
                            />
                            <Field
                              label="Service Charge"
                              value={inr(s.breakup.serviceCharge)}
                            />
                            <Field label="Paid Amount" value={inr(s.breakup.paid)} accent />
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

      <SettlementFormModal
        open={modalOpen}
        initialData={editingSettlement}
        onClose={() => {
          setModalOpen(false);
          setEditingSettlement(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}