import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Check, Ban, History, Wallet, Landmark, CheckCircle2, XCircle } from "lucide-react";
import {
  getRefundById,
  approveRefund,
  rejectRefund,
  payRefund,
  requestBankDetails,
  payToBank,
  confirmBankPayout,
  failBankPayout,
} from "./services/RefundApi";
import { canAdminDecide } from "./refundUtils";
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
    case "VENDOR_APPROVED":
    case "ADMIN_APPROVED":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "ADMIN_REJECTED":
    case "CANCELLED":
    case "WITHDRAWN":
      return "rejected";
    // FAILED is not final — the refund stays isOpen (statusLabel "Refund
    // failed — we are on it") and the admin retries /pay or switches to
    // manual bank, so it gets its own bucket rather than "rejected".
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

const STATUS_BADGE = {
  approved: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400",
  rejected: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
  failed: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
  pending: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
};

// Timeline events carry an `action` (CLAIM_CREATED, PAYMENT_CAPTURED,
// REFUND_REQUESTED, REFUND_APPROVED, REFUND_FAILED, …) — colour by that,
// since refund events have no toStatus.
function timelineDot(action = "") {
  if (/FAILED|REJECTED|CANCELLED/.test(action)) return "bg-red-400";
  if (/APPROVED|CAPTURED|COMPLETED|PAID|REDEEMED/.test(action)) return "bg-emerald-400";
  if (/REQUESTED|CREATED|INITIATED|PROCESSING/.test(action)) return "bg-amber-400";
  return "bg-neutral-400";
}

const ACTOR_CHIP = {
  CUSTOMER: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  VENDOR: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  ADMIN: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  SYSTEM: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function TimelineEvent({ event, isLast }) {
  const snap = event.snapshot || {};
  const refs = [
    snap.razorpayOrderId && `Order ${snap.razorpayOrderId}`,
    snap.razorpayPaymentId && `Payment ${snap.razorpayPaymentId}`,
    snap.attempt != null && `Attempt ${snap.attempt}`,
    snap.from && `From ${humanizeEnum(snap.from)}`,
  ].filter(Boolean);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${timelineDot(event.action)}`} />
        {!isLast && <span className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
      </div>
      <div className={`min-w-0 ${isLast ? "" : "pb-5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
            {event.label || humanizeEnum(event.action) || "Event"}
          </p>
          {event.by && (
            <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ACTOR_CHIP[event.by] || ACTOR_CHIP.SYSTEM}`}>
              {humanizeEnum(event.by)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          {formatDateTime(event.at)}
          {event.amount != null && ` · ${inr(event.amount)}`}
          {event.fromStatus && event.toStatus && ` · ${humanizeEnum(event.fromStatus)} → ${humanizeEnum(event.toStatus)}`}
        </p>
        {event.reason && (
          <p className="mt-1 text-[12.5px] text-neutral-600 dark:text-neutral-300">“{event.reason}”</p>
        )}
        {refs.length > 0 && (
          <p className="mt-1 break-all font-mono text-[11px] text-neutral-400">{refs.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * The claim this refund was raised against — voucher/brand/outlet
 * snapshots plus the original pricing the customer paid, so the admin
 * can sanity-check the refund split against what was actually charged.
 * ---------------------------------------------------------------------- */

function ClaimSection({ claim }) {
  const voucher = claim.voucherSnapshot || {};
  const outlet = claim.outletSnapshot || {};
  const p = claim.pricing || {};
  const gst = Number(p.gstAmount) || 0;
  const promo = Number(p.promoDiscount) || 0;
  const commission = Number(p.commissionAmount) || 0;

  return (
    <>
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Claim</h3>
        {(voucher.imageUrl || voucher.bannerThumbnail) && (
          <div className="mb-4 flex items-center gap-3">
            <img
              src={voucher.imageUrl || voucher.bannerThumbnail}
              alt={voucher.name || "Voucher"}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{voucher.name || "—"}</p>
              <p className="truncate text-[12px] text-neutral-500">{claim.brandSnapshot?.name || "—"}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Claim Code" value={claim.claimCode} mono />
          <Field label="Claim Status" value={humanizeEnum(claim.status)} />
          <Field label="Brand" value={claim.brandSnapshot?.name} />
          <Field label="Outlet" value={outlet.uniqueId} mono />
          <Field label="Store ID" value={outlet.storeId} mono />
          <Field label="State" value={outlet.state} />
          <Field label="Claimed At" value={formatDateTime(claim.createdAt)} />
          <Field label="Paid At" value={formatDateTime(claim.paidAt)} />
          <Field label="Redeemed At" value={formatDateTime(claim.redeemedAt)} />
          <Field label="Offer Applied" value={claim.offerApplied ? "Yes" : "No"} />
          <Field label="Once Per User" value={claim.isOncePerUser ? "Yes" : "No"} />
          <Field label="Voucher ID" value={claim.voucherId} mono />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <h3 className="mb-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Original Payment</h3>
        {p.offerTitle && <p className="text-[12px] text-neutral-500">{p.offerTitle}</p>}
        <div className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
          <PriceRow label="Bill Amount" value={inr(p.billAmount ?? claim.billAmount)} />
          {Number(p.offerDiscount) > 0 && <PriceRow label="Offer Discount" value={`− ${inr(p.offerDiscount)}`} tone="discount" />}
          {promo > 0 && (
            <PriceRow label={`Promo Discount${p.promoCode ? ` (${p.promoCode})` : ""}`} value={`− ${inr(promo)}`} tone="discount" />
          )}
          <PriceRow label="Net Bill" value={inr(p.netBill)} />
          <PriceRow label="Convenience Fee" value={inr(p.convenienceFee)} />
          {gst > 0 && <PriceRow label={`GST (${p.gstPercentage}%)`} value={inr(gst)} />}
          <PriceRow label="Total Paid" value={inr(p.totalPayable)} strong />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <Field label="Customer Saved" value={inr(p.youSaved)} />
          <Field label="Vendor Payable" value={inr(p.vendorPayable)} />
          {commission > 0 && <Field label={`Commission (${p.commissionPercent}%)`} value={inr(commission)} />}
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------
 * Step-wise admin workflow. Two paths, picked by the refund's method:
 *  Gateway:     Approve → Pay (/pay) → Refunded
 *  Manual bank: Approve → Bank Details (/request-bank-details)
 *               → Pay to Bank (/pay-to-bank)
 *               → Confirm Payout (/confirm-bank-payout, or
 *                 /fail-bank-payout and retry Pay to Bank)
 * ---------------------------------------------------------------------- */

const GATEWAY_STEPS = ["Admin Approve", "Pay Refund", "Refunded"];
const MANUAL_STEPS = ["Admin Approve", "Bank Details", "Pay to Bank", "Confirm Payout", "Refunded"];

// Index of the step currently waiting on someone; steps before it are done.
function currentStepIndex({ status, canDecide, refund }) {
  const manual = refund.method === "MANUAL_BANK";
  const steps = manual ? MANUAL_STEPS : GATEWAY_STEPS;
  if (status === "COMPLETED") return steps.length;
  if (canDecide) return 0;
  if (!manual) return 1;
  if (status === "PROCESSING") return 3;
  if (status === "FAILED") return 2; // bank leg bounced — retry Pay to Bank
  if (status === "AWAITING_BANK_DETAILS" && !refund.customerBankAccountId) return 1;
  return 2;
}

function RefundSteps({ status, bucket, canDecide, refund }) {
  if (bucket === "rejected") return null;
  const steps = refund.method === "MANUAL_BANK" ? MANUAL_STEPS : GATEWAY_STEPS;
  const current = currentStepIndex({ status, canDecide, refund });
  const failed = status === "FAILED";

  return (
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Refund Progress</h3>
      <ol className="flex flex-wrap items-center gap-y-3">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const activeFailed = active && failed;
          return (
            <li key={label} className="flex items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done
                    ? "bg-emerald-400 text-neutral-950"
                    : activeFailed
                    ? "bg-red-400/15 text-red-600 ring-1 ring-red-400/50 dark:text-red-400"
                    : active
                    ? "bg-amber-400/15 text-amber-600 ring-1 ring-amber-400/50 dark:text-amber-400"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                }`}
              >
                {done ? <Check size={12} /> : activeFailed ? <XCircle size={12} /> : i + 1}
              </span>
              <span
                className={`ml-2 text-[12.5px] ${
                  done || active ? "font-medium text-neutral-800 dark:text-neutral-100" : "text-neutral-400"
                }`}
              >
                {label}
                {activeFailed && <span className="ml-1 text-red-600 dark:text-red-400">· Failed</span>}
              </span>
              {i < steps.length - 1 && (
                <span className={`mx-3 h-px w-6 sm:w-10 ${done ? "bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-800"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
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
  const [actionSuccess, setActionSuccess] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showBankDetailsBox, setShowBankDetailsBox] = useState(false);
  const [bankDetailsReason, setBankDetailsReason] = useState("");
  const [showConfirmBankBox, setShowConfirmBankBox] = useState(false);
  const [confirmBankForm, setConfirmBankForm] = useState({ utr: "", mode: "NEFT", paidAt: "" });
  const [showFailBankBox, setShowFailBankBox] = useState(false);
  const [failBankReason, setFailBankReason] = useState("");

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
  // `fn` returns the API response, whose own message (e.g. "Payout
  // started. Make the transfer, then confirm it with the UTR.") is shown
  // back to the admin as the next-step hint.
  const runAction = async (fn) => {
    setActionSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fn();
      setActionSuccess(res?.message || "Done.");
      await fetchDetails();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleApprove = () =>
    runAction(async () => {
      const res = await approveRefund(refundRequestId, { note: approveNote.trim() || undefined });
      setShowApproveBox(false);
      setApproveNote("");
      return res;
    });

  const handleReject = () =>
    runAction(async () => {
      const res = await rejectRefund(refundRequestId, { note: rejectNote.trim() || undefined });
      setShowRejectBox(false);
      setRejectNote("");
      return res;
    });

  // No body — triggers the actual Razorpay/gateway payout for an
  // already-approved refund. Can 422 (e.g. "Razorpay could not process
  // this refund: Refund failed"); that message surfaces via actionError
  // so the admin can fall back to Request Bank Details instead.
  const handlePay = () => runAction(() => payRefund(refundRequestId));

  const handleRequestBankDetails = () =>
    runAction(async () => {
      const res = await requestBankDetails(refundRequestId, { reason: bankDetailsReason.trim() });
      setShowBankDetailsBox(false);
      setBankDetailsReason("");
      return res;
    });

  // MANUAL_BANK-only next step after the customer's bank details are on
  // file — opens a payout "leg" and moves the refund to PROCESSING.
  const handlePayToBank = () => runAction(() => payToBank(refundRequestId));

  const handleConfirmBankPayout = () =>
    runAction(async () => {
      const res = await confirmBankPayout(refundRequestId, {
        utr: confirmBankForm.utr.trim(),
        mode: confirmBankForm.mode,
        paidAt: confirmBankForm.paidAt ? new Date(confirmBankForm.paidAt).toISOString() : new Date().toISOString(),
      });
      setShowConfirmBankBox(false);
      setConfirmBankForm({ utr: "", mode: "NEFT", paidAt: "" });
      return res;
    });

  // The other way to close a PROCESSING manual-bank leg — the bank
  // bounced the NEFT, so the admin marks it failed (with a reason) and
  // can retry /pay-to-bank.
  const handleFailBankPayout = () =>
    runAction(async () => {
      const res = await failBankPayout(refundRequestId, { reason: failBankReason.trim() });
      setShowFailBankBox(false);
      setFailBankReason("");
      return res;
    });

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center gap-2 px-4 py-6 text-[13px] text-neutral-500">
        <Loader2 size={16} className="animate-spin" />
        Loading refund details…
      </div>
    );
  }

  if (error || !details?.refund) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 px-4 py-6 text-center">
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
  //    on the admin to confirm the NEFT with its UTR (/confirm-bank-payout)
  //    or mark it bounced (/fail-bank-payout)
  //  - MANUAL_BANK + bank account on file, not yet PROCESSING -> pay to
  //    bank again (covers the retry after a failed leg)
  // Approve/Reject gate — see canAdminDecide (the API's canDecide is
  // vendor-scoped, so VENDOR_APPROVED still needs the admin's decision).
  //  - FAILED (still isOpen) + non-MANUAL_BANK -> the gateway refund
  //    failed (refund.failureReason); retry /pay or switch to manual bank
  const isManualBank = refund.method === "MANUAL_BANK";
  const isOpen = refund.isOpen !== false;
  const isFailed = status === "FAILED";
  const canDecide = canAdminDecide({ canDecide: refund.canDecide, isOpen: refund.isOpen, status });
  const canPay = isOpen && !isManualBank && (status === "ADMIN_APPROVED" || isFailed);
  const canRequestBankDetails = isOpen && (status === "ADMIN_APPROVED" || (isFailed && !isManualBank));
  const canPayToBank =
    isManualBank &&
    refund.isOpen !== false &&
    !["PROCESSING", "COMPLETED"].includes(status) &&
    bucket !== "rejected" &&
    (status === "ADMIN_APPROVED" || Boolean(refund.customerBankAccountId));
  const canConfirmBankPayout = status === "PROCESSING" && isManualBank;
  const canFailBankPayout = canConfirmBankPayout;
  const showActions =
    canDecide || canPay || canRequestBankDetails || canPayToBank || canConfirmBankPayout || canFailBankPayout;

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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
            <p className="text-[11.5px] text-neutral-500">
              Claim {refund.claimCode || "—"}
              {claim?.brandSnapshot?.name && ` · ${claim.brandSnapshot.name}`}
              {claim?.voucherSnapshot?.name && ` · ${claim.voucherSnapshot.name}`}
            </p>
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
            <span className="text-[11.5px] text-neutral-500">
              {humanizeEnum(refund.method)} · {isOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        <RefundSteps status={status} bucket={bucket} canDecide={canDecide} refund={refund} />

        {isFailed && (
          <div className="mb-6 rounded-2xl bg-red-500/5 p-4 ring-1 ring-red-400/30">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle size={15} className="shrink-0" />
              Refund failed{refund.failureReason ? `: ${refund.failureReason}` : ""}
            </p>
            <p className="mt-1 text-[12px] text-neutral-500">
              Initiated {formatDateTime(refund.initiatedAt)} · Failed {formatDateTime(refund.failedAt)} · Attempt{" "}
              {refund.attemptCount ?? 0}
            </p>
            {isOpen && (
              <p className="mt-2 text-[12.5px] text-neutral-600 dark:text-neutral-300">
                {isManualBank
                  ? "Retry the bank payout with Pay to Bank below."
                  : "Retry the gateway refund with Retry Pay Refund, or switch to a manual NEFT with Request Bank Details."}
              </p>
            )}
          </div>
        )}

        {/* Outside the actions card on purpose — that card can disappear
            once the last step completes, and the message should still show. */}
        {actionSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-400/10 px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} className="shrink-0" />
            {actionSuccess}
          </div>
        )}

        {/* Refund Actions — Approve → Pay (or Request Bank Details as a
            fallback) → done; Reject at any point while still decidable.
            Gated on the real canDecide flag plus the ADMIN_APPROVED status
            for pay/bank-details, so an action never shows once the refund
            has moved past that stage. */}
        {showActions && (
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">Refund Actions</h3>
            <div className="flex flex-wrap gap-2">
              {canDecide && (
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
                  {isFailed ? "Retry Pay Refund" : "Pay Refund"}
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
              {canFailBankPayout && (
                <button
                  onClick={() => setShowFailBankBox((v) => !v)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <XCircle size={14} />
                  Mark Payout Failed
                </button>
              )}
              {canDecide && (
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

            {showFailBankBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  Reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  value={failBankReason}
                  onChange={(e) => setFailBankReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Beneficiary account name mismatch - bank ne wapas kiya."
                  className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFailBankBox(false)}
                    className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFailBankPayout}
                    disabled={actionSubmitting || !failBankReason.trim()}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-3.5 text-[13px] font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Confirm Failed
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
            <Field label="Method" value={humanizeEnum(refund.method)} />
            <Field label="Full Refund" value={split.isFullRefund ? "Yes" : "No"} />
            <Field label="Is Override" value={refund.isOverride ? "Yes" : "No"} />
            <Field label="Requested At" value={formatDateTime(refund.createdAt)} />
            <Field label="Vendor Respond By" value={formatDateTime(refund.vendorRespondBy)} />
            <Field label="Vendor Decision At" value={formatDateTime(refund.vendorDecisionAt)} />
            <Field label="Admin Decision At" value={formatDateTime(refund.adminDecisionAt)} />
            <Field label="Refund Initiated At" value={formatDateTime(refund.initiatedAt)} />
            {refund.failedAt && <Field label="Failed At" value={formatDateTime(refund.failedAt)} />}
            {refund.failureReason && <Field label="Failure Reason" value={refund.failureReason} />}
            <Field label="Completed At" value={formatDateTime(refund.completedAt)} />
            <Field label="Last Updated" value={formatDateTime(refund.updatedAt)} />
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
            <Field label="Sub Brand ID" value={refund.subBrandId} mono />
            <Field label="Vendor Decision By" value={refund.vendorDecisionBy} mono />
            <Field label="Admin Decision By" value={refund.adminDecisionBy} mono />
            <Field label="Customer ID" value={refund.customerId} mono />
            {refund.customerBankAccountId && (
              <Field label="Customer Bank Account ID" value={refund.customerBankAccountId} mono />
            )}
          </Card>

          {refund.reasonNote && (
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
              <h3 className="mb-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Reason Note</h3>
              <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">{refund.reasonNote}</p>
            </div>
          )}

          {refund.vendorNote && (
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
              <h3 className="mb-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Vendor Note</h3>
              <p className="text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">{refund.vendorNote}</p>
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

          {claim && <ClaimSection claim={claim} />}
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
