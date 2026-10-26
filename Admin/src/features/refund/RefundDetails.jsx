import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import NotFoundPage from "../../components/common/NotFoundPage";
import { ArrowLeft, Loader2, AlertTriangle, Check, Ban, History, Wallet, Landmark, CheckCircle2, XCircle, Copy, RefreshCw } from "lucide-react";
import { useRefund } from "./queries/refundQueries";
import {
  approveRefund,
  rejectRefund,
  payRefund,
  requestBankDetails,
  payToBank,
  confirmBankPayout,
  failBankPayout,
} from "./services/RefundApi";
import { canAdminDecide, needsOverrideReason, isAdminApproved, isValidUtr, refundMethodLabel } from "./refundUtils";
import { inr, formatDate, fmtTime } from "../transaction/transactionUtils";
import { localDateStr } from "../../utils/overviewStats";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, isMissing, orText } from "../../utils/helpers";

// Values wrap instead of being cut off, so full dates and IDs show; mono
// IDs also get a copy button.
function Field({ label, value, mono, fallback = MISSING.generic }) {
  const [copied, setCopied] = useState(false);
  const canCopy = mono && typeof value === "string" && !isMissing(value);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (insecure origin / permissions) — the ID is still selectable.
    }
  };

  return (
    <div className="min-w-0">
      <p className="text-[11.5px] text-neutral-500">{label}</p>
      <div className="mt-0.5 flex items-start gap-1.5">
        <p
          className={`min-w-0 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 ${
            mono ? "break-all font-mono text-[12.5px]" : "break-words"
          }`}
        >
          <ValueOr value={value} fallback={fallback} />
        </p>
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${label}`}
            title={copied ? "Copied" : "Copy"}
            className="mt-0.5 shrink-0 text-neutral-400 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

// `cols={2}` for cards of long values (IDs), so they wrap less.
function Card({ title, cols = 3, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
      <div className={`grid grid-cols-2 gap-4 ${cols === 3 ? "sm:grid-cols-3" : ""}`}>{children}</div>
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
  return `${formatDate(localDateStr(iso))} · ${fmtTime(iso)}`;
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
    // VENDOR_APPROVED is not here — it still waits on the admin's release.
    case "APPROVED":
    case "ADMIN_APPROVED":
    case "ADMIN_OVERRIDE":
    case "COMPLETED":
      return "approved";
    case "REJECTED":
    case "ADMIN_REJECTED":
      return "rejected";
    // The customer took it back — nobody rejected it.
    case "CANCELLED":
    case "WITHDRAWN":
      return "withdrawn";
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
  withdrawn: "bg-neutral-200 text-neutral-600 ring-neutral-300/60 dark:bg-neutral-700/40 dark:text-neutral-400",
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
            {event.label || orText(humanizeEnum(event.action), "Event")}
          </p>
          {event.by && (
            <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ACTOR_CHIP[event.by] || ACTOR_CHIP.SYSTEM}`}>
              {humanizeEnum(event.by)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          {orText(formatDateTime(event.at), "Time not recorded")}
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
              <p className="truncate text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{voucher.name || "Unnamed voucher"}</p>
              <p className="truncate text-[12px] text-neutral-500">{claim.brandSnapshot?.name || "No brand"}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Claim Code" value={claim.claimCode} mono fallback={MISSING.id} />
          <Field label="Claim Status" value={humanizeEnum(claim.status)} fallback="No status" />
          <Field label="Brand" value={claim.brandSnapshot?.name} fallback="No brand" />
          <Field label="Outlet" value={outlet.uniqueId} mono fallback="No outlet" />
          <Field label="Store ID" value={outlet.storeId} mono fallback={MISSING.id} />
          <Field label="State" value={outlet.state} fallback="Not added" />
          <Field label="Claimed At" value={formatDateTime(claim.createdAt)} fallback={MISSING.date} />
          <Field label="Paid At" value={formatDateTime(claim.paidAt)} fallback="Not yet" />
          <Field label="Redeemed At" value={formatDateTime(claim.redeemedAt)} fallback="Not yet" />
          <Field label="Offer Applied" value={claim.offerApplied ? "Yes" : "No"} />
          <Field label="Once Per User" value={claim.isOncePerUser ? "Yes" : "No"} />
          <Field label="Voucher ID" value={claim.voucherId} mono fallback={MISSING.id} />
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
  // Still with the vendor, or waiting on the admin's decision.
  if (canDecide || !(isAdminApproved(status) || ["PROCESSING", "FAILED", "AWAITING_BANK_DETAILS"].includes(status))) return 0;
  if (!manual) return 1;
  if (status === "PROCESSING") return 3;
  if (status === "FAILED") return 2; // bank leg bounced — retry Pay to Bank
  if (status === "AWAITING_BANK_DETAILS" && !refund.customerBankAccountId) return 1;
  return 2;
}

function RefundSteps({ status, bucket, canDecide, refund }) {
  if (bucket === "rejected" || bucket === "withdrawn") return null;
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
  const {
    data: details = null,
    isPending: loading,
    error: loadError,
    refetch,
  } = useRefund(refundRequestId, { select: (res) => res?.data || null });
  const error = loadError?.message ?? "";
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
  const [showPayBox, setShowPayBox] = useState(false);
  const [failBankReason, setFailBankReason] = useState("");

  // Approve → Pay (or Request Bank Details as a fallback) → Reject — the
  // real admin refund workflow, confirmed via Postman against
  // /refunds/admin/:id/{approve,reject,pay,request-bank-details}.
  // `fn` returns the API response, whose own message (e.g. "Payout
  // started. Make the transfer, then confirm it with the UTR.") is shown
  // back to the admin as the next-step hint. The refund refetches by
  // itself after the write (shared interceptor).
  const runAction = async (fn) => {
    setActionSubmitting(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fn();
      setActionSuccess(res?.message || "Done.");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // Over a vendor's "no" or silence the text is the required overrideReason.
  const handleApprove = () =>
    runAction(async () => {
      const text = approveNote.trim() || undefined;
      const override = needsOverrideReason(String(details?.refund?.status || "").toUpperCase());
      const res = await approveRefund(
        refundRequestId,
        override ? { overrideReason: text } : { note: text }
      );
      setShowApproveBox(false);
      setApproveNote("");
      return res;
    });

  const handleReject = () =>
    runAction(async () => {
      const res = await rejectRefund(refundRequestId, { note: rejectNote.trim() });
      setShowRejectBox(false);
      setRejectNote("");
      return res;
    });

  // No body — triggers the actual Razorpay/gateway payout for an
  // already-approved refund. Can 422 (e.g. "Razorpay could not process
  // this refund: Refund failed"); that message surfaces via actionError
  // so the admin can fall back to Request Bank Details instead.
  const handlePay = () =>
    runAction(async () => {
      const res = await payRefund(refundRequestId);
      setShowPayBox(false);
      return res;
    });

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
      <Loader variant="page" label="Loading refund details…" />
    );
  }

  if (error) {
    return (
      <EmptyState
        variant="page"
        tone="error"
        icon="error"
        title="Couldn't load this refund"
        description={`${error} — check your connection and try again.`}
        action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
        secondaryAction={{ label: "Back to Refunds", onClick: () => navigate("/refund") }}
      />
    );
  }

  if (!details?.refund) {
    return (
      <NotFoundPage
        title="Refund not found"
        icon="refund"
        description="We couldn't find a refund request with this link. It may have been removed, or the link is no longer valid."
        backLabel="Back to Refunds"
        onBack={() => navigate("/refund")}
      />
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
  // Approve/Reject gate — see canAdminDecide (only after the vendor has
  // approved, rejected or timed out, per the super admin API doc).
  //  - FAILED (still isOpen) + non-MANUAL_BANK -> the gateway refund
  //    failed (refund.failureReason); retry /pay or switch to manual bank
  const isManualBank = refund.method === "MANUAL_BANK";
  const isOpen = refund.isOpen !== false;
  const isFailed = status === "FAILED";
  const approved = isAdminApproved(status);
  const canDecide = canAdminDecide({ isOpen: refund.isOpen, status });
  const canPay = isOpen && !isManualBank && (approved || isFailed);
  const canRequestBankDetails = isOpen && (approved || (isFailed && !isManualBank));
  const canPayToBank =
    isManualBank &&
    refund.isOpen !== false &&
    !["PROCESSING", "COMPLETED"].includes(status) &&
    bucket !== "rejected" &&
    bucket !== "withdrawn" &&
    (approved || Boolean(refund.customerBankAccountId));
  const needsOverride = needsOverrideReason(status);

  // Confirm Bank Payout checks: `paidAt` is when the bank moved the money,
  // so it can't be in the future; the UTR must look like a bank reference.
  const utrValid = isValidUtr(confirmBankForm.utr);
  const paidAtInFuture = Boolean(confirmBankForm.paidAt) && new Date(confirmBankForm.paidAt) > new Date();
  const nowLocalInput = `${localDateStr(new Date())}T${new Date().toTimeString().slice(0, 5)}`;
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
    // Missing keys read as 0 and are hidden, not shown as ₹0.00 rows.
  ].filter((row) => (Number(split[row.key]) || 0) !== 0);
  const hasSplitTotal = split.totalRefund != null;

  // Opening another action box clears the last action's error.
  const toggleBox = (setter) => {
    setActionError("");
    setter((v) => !v);
  };

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
              Claim {orText(refund.claimCode, MISSING.id)}
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
              {refundMethodLabel(refund.method)} · {isOpen ? "Open" : "Closed"}
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
                  onClick={() => toggleBox(setShowApproveBox)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={14} />
                  {needsOverride ? "Override & Approve" : "Approve"}
                </button>
              )}
              {canPay && (
                <button
                  onClick={() => toggleBox(setShowPayBox)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Wallet size={14} />
                  {isFailed ? "Retry Pay Refund" : "Pay Refund"}
                </button>
              )}
              {canRequestBankDetails && (
                <button
                  onClick={() => toggleBox(setShowBankDetailsBox)}
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
                  onClick={() => toggleBox(setShowConfirmBankBox)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <CheckCircle2 size={14} />
                  Confirm Bank Payout
                </button>
              )}
              {canFailBankPayout && (
                <button
                  onClick={() => toggleBox(setShowFailBankBox)}
                  disabled={actionSubmitting}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <XCircle size={14} />
                  Mark Payout Failed
                </button>
              )}
              {canDecide && (
                <button
                  onClick={() => toggleBox(setShowRejectBox)}
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
                {needsOverride && (
                  <p className="mb-3 text-[12.5px] text-amber-700 dark:text-amber-400">
                    {status === "VENDOR_TIMEOUT"
                      ? "The outlet never answered. Say why you are approving it yourself."
                      : "The outlet rejected this refund. Say why you are overruling it."}
                  </p>
                )}
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  {needsOverride ? (
                    <>
                      Override reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
                    </>
                  ) : (
                    "Note (optional)"
                  )}
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
                    disabled={actionSubmitting || (needsOverride && !approveNote.trim())}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {needsOverride ? "Confirm Override" : "Confirm Approve"}
                  </button>
                </div>
              </div>
            )}

            {/* Money leaves through the gateway with no undo — confirm first,
                same as the list page's Pay modal. */}
            {showPayBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <p className="text-[13px] text-neutral-700 dark:text-neutral-300">
                  {inr(refund.approvedAmount ?? refund.requestedAmount)} will be refunded to the customer through the
                  payment gateway. This cannot be undone.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPayBox(false)}
                    className="flex h-9 items-center rounded-xl border border-neutral-200 px-3.5 text-[13px] font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={actionSubmitting}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                    Confirm Pay
                  </button>
                </div>
              </div>
            )}

            {showRejectBox && (
              <div className="mt-4 rounded-xl bg-neutral-50 p-4 dark:bg-neutral-950">
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  Reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
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
                    disabled={actionSubmitting || !rejectNote.trim()}
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
                      placeholder="HDFCN52026102200123"
                      className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                    />
                    {confirmBankForm.utr.trim() && !utrValid && (
                      <p className="mt-1 text-[11.5px] text-red-600 dark:text-red-400">12–22 letters or digits</p>
                    )}
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
                      max={nowLocalInput}
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
                    disabled={actionSubmitting || !utrValid || paidAtInFuture}
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
            <Field label="Approved Amount" value={refund.approvedAmount != null ? inr(refund.approvedAmount) : null} fallback={bucket === "pending" ? "Not yet" : "Not approved"} />
            <Field label="Reason" value={humanizeEnum(refund.reason)} fallback={MISSING.reason} />
            <Field label="Method" value={refundMethodLabel(refund.method)} fallback={MISSING.method} />
            <Field label="Full Refund" value={split.isFullRefund ? "Yes" : "No"} />
            <Field label="Is Override" value={refund.isOverride ? "Yes" : "No"} />
            <Field label="Requested At" value={formatDateTime(refund.createdAt)} fallback={MISSING.date} />
            {/* Step dates show once that step has happened, not as "—". */}
            {refund.vendorDecisionAt ? (
              <Field label="Vendor Decision At" value={formatDateTime(refund.vendorDecisionAt)} />
            ) : (
              <Field label="Vendor Respond By" value={formatDateTime(refund.vendorRespondBy)} fallback="No deadline set" />
            )}
            {refund.adminDecisionAt && <Field label="Admin Decision At" value={formatDateTime(refund.adminDecisionAt)} />}
            {refund.initiatedAt && <Field label="Refund Initiated At" value={formatDateTime(refund.initiatedAt)} />}
            {refund.failedAt && <Field label="Failed At" value={formatDateTime(refund.failedAt)} />}
            {refund.failureReason && <Field label="Failure Reason" value={refund.failureReason} />}
            {refund.completedAt && <Field label="Completed At" value={formatDateTime(refund.completedAt)} />}
            <Field label="Last Updated" value={formatDateTime(refund.updatedAt)} fallback={MISSING.date} />
            <Field label="Reminders Sent" value={refund.remindersSent ?? 0} />
            <Field label="Attempt Count" value={refund.attemptCount ?? 0} />
            {refund.razorpayRefundId && <Field label="Razorpay Refund ID" value={refund.razorpayRefundId} mono />}
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

          <Card title="Related IDs" cols={2}>
            <Field label="Claim ID" value={refund.claimId} mono fallback={MISSING.id} />
            <Field label="Transaction ID" value={refund.transactionId} mono fallback={MISSING.id} />
            <Field label="Brand ID" value={refund.brandId} mono fallback={MISSING.id} />
            {refund.subBrandId && <Field label="Sub Brand ID" value={refund.subBrandId} mono />}
            <Field label="Customer ID" value={refund.customerId} mono fallback={MISSING.id} />
            {refund.vendorDecisionBy && <Field label="Vendor Decision By" value={refund.vendorDecisionBy} mono />}
            {refund.adminDecisionBy && <Field label="Admin Decision By" value={refund.adminDecisionBy} mono />}
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
            {splitRows.length === 0 && !hasSplitTotal ? (
              <p className="py-2.5 text-[12.5px] text-neutral-500">The refund split hasn't been calculated yet.</p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {splitRows.map((row) => (
                  <PriceRow key={row.key} label={row.label} value={inr(split[row.key])} />
                ))}
                <PriceRow label="Total Refund" value={hasSplitTotal ? inr(split.totalRefund) : "Not calculated"} strong />
              </div>
            )}
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
