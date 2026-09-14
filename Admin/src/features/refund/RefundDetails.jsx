import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Check, Ban, History, Wallet, Landmark, CheckCircle2 } from "lucide-react";
import {
  getRefundById,
  approveRefund,
  rejectRefund,
  payRefund,
  requestBankDetails,
  payToBank,
  confirmBankPayout,
} from "./services/RefundApi";
import { inr, formatDate, fmtTime } from "../transaction/transactionUtils";

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11.5px] text-neutral-500">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 ${
          mono ? "font-mono text-[12.5px]" : ""
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

// One line of the refund's split ledger — same PriceRow pattern used on
// the Transaction details page, since a refund's split is exactly that
// kind of itemized breakdown.
function PriceRow({ label, value, tone, strong }) {
  const valueTone =
    tone === "discount" || tone === "save"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-neutral-800 dark:text-neutral-100";
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 ${strong ? "pt-3.5" : ""}`}>
      <p
        className={`text-[13px] ${
          strong ? "font-semibold text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-300"
        }`}
      >
        {label}
      </p>
      <span
        className={`shrink-0 font-medium ${
          strong ? "text-[16px] font-semibold text-neutral-900 dark:text-neutral-50" : `text-[13.5px] ${valueTone}`
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return `${formatDate(new Date(iso).toISOString().slice(0, 10))} · ${fmtTime(iso)}`;
}

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

const STATUS_BADGE = {
  approved: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400",
  rejected: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
  pending: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
};

const TIMELINE_DOT = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-400",
  COMPLETED: "bg-emerald-400",
  REJECTED: "bg-red-400",
  CANCELLED: "bg-neutral-400",
};

function TimelineEvent({ event, isLast }) {
  const dotColor = TIMELINE_DOT[event.toStatus || event.status] || "bg-neutral-400";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        {!isLast && <span className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
      </div>
      <div className={isLast ? "" : "pb-5"}>
        <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
          {event.label || event.action || "Event"}
        </p>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          {formatDateTime(event.at)}
          {event.by && ` · by ${event.by}`}
          {event.amount != null && ` · ${inr(event.amount)}`}
        </p>
      </div>
    </div>
  );
}

export default function RefundDetails() {
  const { refundRequestId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showBankDetailsBox, setShowBankDetailsBox] = useState(false);
  const [bankDetailsReason, setBankDetailsReason] = useState("");
  const [showConfirmBankBox, setShowConfirmBankBox] = useState(false);
  const [confirmBankForm, setConfirmBankForm] = useState({ utr: "", mode: "NEFT", paidAt: "" });

  const fetchDetails = useCallback(async () => {
    if (!refundRequestId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getRefundById(refundRequestId);
      setDetails(res?.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refundRequestId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Approve → Pay (or Request Bank Details as a fallback) → Reject — the
  // real admin refund workflow, confirmed via Postman against
  // /refunds/admin/:id/{approve,reject,pay,request-bank-details}.
  const runAction = async (fn) => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await fn();
      await fetchDetails();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleApprove = () =>
    runAction(async () => {
      await approveRefund(refundRequestId, { note: approveNote.trim() || undefined });
      setShowApproveBox(false);
      setApproveNote("");
    });

  const handleReject = () =>
    runAction(async () => {
      await rejectRefund(refundRequestId, { note: rejectNote.trim() || undefined });
      setShowRejectBox(false);
      setRejectNote("");
    });

  // No body — triggers the actual Razorpay/gateway payout for an
  // already-approved refund. Can 422 (e.g. "Razorpay could not process
  // this refund: Refund failed"); that message surfaces via actionError
  // so the admin can fall back to Request Bank Details instead.
  const handlePay = () => runAction(() => payRefund(refundRequestId));

  const handleRequestBankDetails = () =>
    runAction(async () => {
      await requestBankDetails(refundRequestId, { reason: bankDetailsReason.trim() });
      setShowBankDetailsBox(false);
      setBankDetailsReason("");
    });

  // MANUAL_BANK-only next step after the customer's bank details are on
  // file — opens a payout "leg" and moves the refund to PROCESSING.
  const handlePayToBank = () => runAction(() => payToBank(refundRequestId));

  const handleConfirmBankPayout = () =>
    runAction(async () => {
      await confirmBankPayout(refundRequestId, {
        utr: confirmBankForm.utr.trim(),
        mode: confirmBankForm.mode,
        paidAt: confirmBankForm.paidAt ? new Date(confirmBankForm.paidAt).toISOString() : new Date().toISOString(),
      });
      setShowConfirmBankBox(false);
      setConfirmBankForm({ utr: "", mode: "NEFT", paidAt: "" });
    });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 p-6 text-[13px] text-neutral-500">
        <Loader2 size={16} className="animate-spin" />
        Loading refund details…
      </div>
    );
  }

  if (error || !details?.refund) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-neutral-800 dark:text-neutral-200">
          <AlertTriangle size={16} className="text-red-500" />
          {error ? "Failed to load refund" : "Refund not found"}
        </p>
        {error && <p className="text-[13px] text-neutral-500">{error}</p>}
        <button
          onClick={() => navigate("/refund")}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={13} />
          Back to Refunds
        </button>
      </div>
    );
  }

  // The real GET /refunds/:refundRequestId response is
  // { refund, claim, timeline, viewer } — `claim` is explicitly `null`
  // when there's no populated claim (not just absent), so it's coalesced
  // here rather than relying on a destructuring default (which only
  // covers `undefined`, not `null`).
  const { refund, timeline = [], viewer } = details;
  const claim = details.claim || null;

  const status = String(refund.status || "PENDING").toUpperCase();
  const bucket = bucketRefundStatus(status);
  const split = refund.split || {};

  // Not real API flags — inferred from the confirmed status values (see
  // the same reasoning in Refund.jsx's normalizeRefundRow):
  //  - ADMIN_APPROVED + non-MANUAL_BANK -> pay via the gateway (/pay)
  //  - ADMIN_APPROVED + MANUAL_BANK     -> pay to bank (/pay-to-bank)
  //  - ADMIN_APPROVED (any method)      -> can still switch to manual bank
  //    via /request-bank-details (e.g. after a failed /pay attempt)
  //  - PROCESSING + MANUAL_BANK         -> a payout leg is open, waiting
  //    on the admin to confirm the NEFT with its UTR
  const canPay = status === "ADMIN_APPROVED" && refund.method !== "MANUAL_BANK";
  const canRequestBankDetails = status === "ADMIN_APPROVED";
  const canPayToBank = status === "ADMIN_APPROVED" && refund.method === "MANUAL_BANK";
  const canConfirmBankPayout = status === "PROCESSING" && refund.method === "MANUAL_BANK";
  const showActions = refund.canDecide || canPay || canRequestBankDetails || canPayToBank || canConfirmBankPayout;

  const splitRows = [
    { key: "netBillRefund", label: "Net Bill Refund" },
    { key: "convenienceFeeRefund", label: "Convenience Fee Refund" },
    { key: "taxRefund", label: "Tax Refund" },
    { key: "commissionReversal", label: "Commission Reversal" },
    { key: "commissionTaxReversal", label: "Commission Tax Reversal" },
    { key: "commissionDeductionReversal", label: "Commission Deduction Reversal" },
    { key: "vendorClawback", label: "Vendor Clawback" },
    { key: "platformPromoReversal", label: "Platform Promo Reversal" },
    { key: "vendorPromoReversal", label: "Vendor Promo Reversal" },
    { key: "gatewayFeeAbsorbed", label: "Gateway Fee Absorbed" },
  ].filter((row) => Number(split[row.key]) !== 0);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/refund")}
          className="mb-5 flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ArrowLeft size={14} />
          Back to Refunds
        </button>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11.5px] text-neutral-500">Claim {refund.claimCode || "—"}</p>
            <h1 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
              Refund Requested — {inr(refund.requestedAmount)}
            </h1>
            {refund.approvedAmount != null && (
              <p className="mt-2 text-[22px] font-semibold text-emerald-600 dark:text-emerald-400">
                {inr(refund.approvedAmount)} approved
              </p>
            )}
            {viewer && (
              <p className="mt-1.5 text-[11.5px] text-neutral-500">
                Viewing as {viewer.role} · Scope: {viewer.scope}
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${STATUS_BADGE[bucket]}`}>
              {refund.statusLabel || status}
            </span>
          </div>
        </div>

        {/* Refund Actions — Approve → Pay (or Request Bank Details as a
            fallback) → done; Reject at any point while still decidable.
            Gated on the real canDecide flag plus the ADMIN_APPROVED status
            for pay/bank-details, so an action never shows once the refund
            has moved past that stage. */}
        {showActions && (
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Refund Actions</h3>
            <div className="flex flex-wrap gap-2">
              {refund.canDecide && (
                <button
                  onClick={() => setShowApproveBox((v) => !v)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={14} />
                  Approve
                </button>
              )}
              {canPay && (
                <button
                  onClick={handlePay}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                  Pay Refund
                </button>
              )}
              {canRequestBankDetails && (
                <button
                  onClick={() => setShowBankDetailsBox((v) => !v)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Landmark size={14} />
                  Request Bank Details
                </button>
              )}
              {canPayToBank && (
                <button
                  onClick={handlePayToBank}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
                  Pay to Bank
                </button>
              )}
              {canConfirmBankPayout && (
                <button
                  onClick={() => setShowConfirmBankBox((v) => !v)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <CheckCircle2 size={14} />
                  Confirm Bank Payout
                </button>
              )}
              {refund.canDecide && (
                <button
                  onClick={() => setShowRejectBox((v) => !v)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Ban size={14} />
                  Reject
                </button>
              )}
            </div>

            {showApproveBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  Note (optional)
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Customer ki baat sahi hai - approve."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
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
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Confirm Approve
                  </button>
                </div>
              </div>
            )}

            {showRejectBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  Note (optional)
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. Bill aur claim match nahi kar rahe."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectBox(false)}
                    className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionSubmitting}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-3.5 text-[13px] font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            )}

            {showBankDetailsBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  Reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  value={bankDetailsReason}
                  onChange={(e) => setBankDetailsReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Gateway refund window closed - manual NEFT karenge."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBankDetailsBox(false)}
                    className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestBankDetails}
                    disabled={actionSubmitting || !bankDetailsReason.trim()}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
                    Confirm
                  </button>
                </div>
              </div>
            )}

            {showConfirmBankBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                      UTR
                    </label>
                    <input
                      value={confirmBankForm.utr}
                      onChange={(e) => setConfirmBankForm((p) => ({ ...p, utr: e.target.value }))}
                      placeholder="PMFXIIR0000001"
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                      Mode
                    </label>
                    <select
                      value={confirmBankForm.mode}
                      onChange={(e) => setConfirmBankForm((p) => ({ ...p, mode: e.target.value }))}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                    >
                      {["NEFT", "IMPS", "RTGS", "UPI"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                      Paid At
                    </label>
                    <input
                      type="datetime-local"
                      value={confirmBankForm.paidAt}
                      onChange={(e) => setConfirmBankForm((p) => ({ ...p, paidAt: e.target.value }))}
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmBankBox(false)}
                    className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBankPayout}
                    disabled={actionSubmitting || !confirmBankForm.utr.trim()}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Confirm Payout
                  </button>
                </div>
              </div>
            )}

            {actionError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                <AlertTriangle size={14} className="shrink-0" />
                {actionError}
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Refund Info">
            <Field label="Requested Amount" value={inr(refund.requestedAmount)} />
            <Field label="Approved Amount" value={refund.approvedAmount != null ? inr(refund.approvedAmount) : "—"} />
            <Field label="Reason" value={humanizeEnum(refund.reason)} />
            <Field label="Method" value={refund.method} />
            <Field label="Full Refund" value={split.isFullRefund ? "Yes" : "No"} />
            <Field label="Is Override" value={refund.isOverride ? "Yes" : "No"} />
            <Field label="Requested At" value={formatDateTime(refund.createdAt)} />
            <Field label="Admin Decision At" value={formatDateTime(refund.adminDecisionAt)} />
            <Field label="Completed At" value={formatDateTime(refund.completedAt)} />
            <Field label="Reminders Sent" value={refund.remindersSent ?? 0} />
            <Field label="Attempt Count" value={refund.attemptCount ?? 0} />
            <Field label="Razorpay Refund ID" value={refund.razorpayRefundId} mono />
            {refund.bankDetailsRequestedAt && (
              <Field label="Bank Details Requested At" value={formatDateTime(refund.bankDetailsRequestedAt)} />
            )}
            {refund.bankDetailsRemindersSent != null && (
              <Field label="Bank Details Reminders Sent" value={refund.bankDetailsRemindersSent} />
            )}
            {refund.vendorAlreadyPaid !== undefined && (
              <Field label="Vendor Already Paid" value={refund.vendorAlreadyPaid ? "Yes" : "No"} />
            )}
          </Card>

          <Card title="Related IDs">
            <Field label="Claim ID" value={refund.claimId} mono />
            <Field label="Transaction ID" value={refund.transactionId} mono />
            <Field label="Brand ID" value={refund.brandId} mono />
            <Field label="Customer ID" value={refund.customerId} mono />
          </Card>

          {refund.reasonNote && (
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
              <h3 className="mb-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Reason Note</h3>
              <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">{refund.reasonNote}</p>
            </div>
          )}

          {refund.adminNote && (
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
              <h3 className="mb-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Admin Note</h3>
              <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">{refund.adminNote}</p>
            </div>
          )}

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
            <h3 className="mb-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Refund Split</h3>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {splitRows.map((row) => (
                <PriceRow key={row.key} label={row.label} value={inr(split[row.key])} />
              ))}
              <PriceRow label="Total Refund" value={inr(split.totalRefund)} strong />
            </div>
          </div>

          {claim && (
            <Card title="Claim">
              <Field label="Claim Code" value={claim.claimCode} mono />
              <Field label="Claim Status" value={claim.status} />
              <Field label="Voucher" value={claim.voucherSnapshot?.name} />
            </Card>
          )}
        </div>

        {timeline.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <History size={14} />
              </span>
              Timeline
            </h3>
            <div>
              {timeline.map((event, i) => (
                <TimelineEvent key={event._id || i} event={event} isLast={i === timeline.length - 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
