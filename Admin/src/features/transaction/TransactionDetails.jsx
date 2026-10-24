import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  FileDown,
  Building2,
  User,
  Calendar,
  Clock,
  CreditCard,
  Receipt,
  Hash,
  Store,
  MapPin,
  Wallet,
  Coins,
  Users,
  Tag,
  Layers,
  Percent,
  Landmark,
  History,
  Phone,
  Mail,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useVoucherClaim } from "./queries/transactionQueries";
import { useCustomer } from "../customer/queries/customerQueries";
import { useVoucher } from "../voucher/queries/voucherQueries";
import { TxnStatusBadge } from "./Transaction";
import { releaseTransactionHold } from "./services/TransactionApi";
import {
  inr,
  formatDate,
  fmtTime,
  formatPaymentMethod,
  normalizeClaimStatus,
} from "./transactionUtils";
import { localDateStr } from "../../utils/overviewStats";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import { MISSING, isMissing, orText } from "../../utils/helpers";

// "8839999017" -> "+91 88399 99017" — the real Customer API returns a bare
// 10-digit WhatsApp number with no country code (see Customer.jsx).
function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 10) return raw || "—";
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return `${formatDate(localDateStr(iso))} · ${fmtTime(iso)}`;
}

const CARD_TINTS = {
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

// A single labeled fact — small muted label (with an optional icon) above a
// bold value. Used inside every Card below.
function Field({ icon: Icon, label, value, mono, fallback = MISSING.generic }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        {Icon && <Icon size={12} className="shrink-0 text-neutral-400 dark:text-neutral-500" />}
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 ${
          mono ? "font-mono text-[12.5px]" : ""
        }`}
        title={typeof value === "string" && !isMissing(value) ? value : undefined}
      >
        <ValueOr value={value} fallback={fallback} />
      </p>
    </div>
  );
}

// One line of an itemized price receipt — label (+ optional muted sub-note)
// on the left, amount on the right. `tone` colors the amount so discounts
// read green and the final total reads bold, like a real bill.
function PriceRow({ label, sub, value, tone, strong }) {
  const valueTone =
    tone === "discount" || tone === "save"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-neutral-800 dark:text-neutral-100";
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 ${strong ? "pt-3.5" : ""}`}>
      <div>
        <p
          className={`text-[13px] ${
            strong
              ? "font-semibold text-neutral-900 dark:text-neutral-50"
              : "text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {label}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{sub}</p>}
      </div>
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

// Shared card shell — a colored icon badge next to the title, an optional
// element pinned to the right (thumbnail, chip), and a responsive tile grid
// of Fields below.
function Card({ icon: Icon, tint = "neutral", title, right, children }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
          {Icon && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${CARD_TINTS[tint]}`}>
              <Icon size={14} />
            </span>
          )}
          {title}
        </h3>
        {right}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

// A compact fact chip for the "at a glance" strip right under the header.
function QuickFact({ icon: Icon, label, value, fallback = MISSING.generic }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10.5px] uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-50"><ValueOr value={value} fallback={fallback} /></p>
      </div>
    </div>
  );
}

// Dot color follows the claim's status right after that event — a status
// this UI already colors consistently (StatusBadge/TxnStatusBadge use the
// same palette); unknown/future statuses fall back to neutral rather than
// guessing a color.
const TIMELINE_DOT = {
  PENDING: "bg-amber-400",
  REDEEMED: "bg-emerald-400",
  FAILED: "bg-red-400",
  CANCELLED: "bg-neutral-400",
  EXPIRED: "bg-neutral-400",
};

const PRICE_SLICE_COLORS = ["#34d399", "#f59e0b", "#38bdf8", "#a78bfa", "#f87171"];

function TimelineEvent({ event, isLast }) {
  const dotColor = TIMELINE_DOT[event.toStatus] || "bg-neutral-400";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
        {!isLast && <span className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
      </div>
      <div className={isLast ? "" : "pb-5"}>
        <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
          {event.label || event.action}
        </p>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          {orText(formatDateTime(event.at), "Time not recorded")}
          {event.by && ` · by ${event.by}`}
          {event.amount != null && ` · ${inr(event.amount)}`}
        </p>
      </div>
    </div>
  );
}

// PATCH /transactions/admin/:id/release-hold — a settlement hold is set
// the moment a refund is asked for; one nobody releases keeps the
// vendor's money out of every settlement, silently. The API refuses while
// a refund is open or a chargeback unresolved — that message shows here.
function ReleaseHold({ transactionId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await releaseTransactionHold(transactionId, { reason: reason.trim() });
      setDone(res?.message || "Hold released — this payment can be settled again.");
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return <p className="text-[12.5px] text-emerald-700 dark:text-emerald-400">{done}</p>;

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 text-[12.5px] font-medium text-amber-700 hover:bg-amber-400/10 dark:text-amber-400"
        >
          <ShieldCheck size={13} />
          Release settlement hold
        </button>
      ) : (
        <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950">
          <label className="mb-1.5 block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
            Reason<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Refund was rejected — vendor should be paid."
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg border border-neutral-200 px-3 text-[12.5px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !reason.trim()}
              className="h-8 rounded-lg bg-emerald-400 px-3 text-[12.5px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Releasing…" : "Release Hold"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function TransactionDetails() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const {
    data: details = null,
    isPending: loading,
    error: claimError,
    refetch,
  } = useVoucherClaim(claimId, { select: (res) => res?.data || null });
  const error = claimError?.message ?? "";

  // Follow-up reads keyed off the claim's ids — they wait for the claim
  // (enabled turns on once the id is known). Their failures stay silent:
  // the cards just don't render, as before.
  const customerId = details?.payment?.customerId || details?.claim?.customerId;
  const voucherId = details?.claim?.voucherId || details?.payment?.voucherId;
  const { data: customer = null } = useCustomer(customerId, {
    select: (res) => res?.data?.customer ?? res?.data ?? null,
  });
  const { data: voucherInfo = null } = useVoucher(voucherId, {
    select: (res) => res?.data?.data?.[0] ?? null,
  });

  if (loading) {
    return (
      <Loader variant="page" label="Loading claim details…" />
    );
  }

  if (error || !details?.payment) {
    return (
      <EmptyState
        variant="page"
        tone={error ? "error" : "default"}
        icon={error ? "error" : "transaction"}
        title={error ? "Couldn't load this claim" : "Claim not found"}
        description={
          error
            ? `${error} — check your connection and try again.`
            : "We couldn't find a voucher claim with this link. It may have been removed, or the link is no longer valid."
        }
        action={{ label: "Back to Transactions", icon: ArrowLeft, onClick: () => navigate("/transaction") }}
        secondaryAction={error ? { label: "Try again", onClick: () => refetch() } : undefined}
      />
    );
  }

  const { payment, claim = {}, brand = {}, outlet = {}, timeline = [] } = details;
  const pricing = claim.pricing || {};
  const status = normalizeClaimStatus(payment.status);
  const dateSrc = payment.createdAt || payment.verifiedAt;
  const dateStr = localDateStr(dateSrc);
  const hasPromo = Boolean(pricing.promoCode);
  const hasGst = Boolean(pricing.isGstEnabled);
  const hasOfferCap = Boolean(pricing.offerMinBillAmount || pricing.offerMaxDiscountAmount);
  const hasFeeSlab = Boolean(pricing.feeSlabSize);

  // The claim response's `customer` block (admin token) covers identity and
  // contact; wallet / T-Coins / followers still need GET /customers/admin/:id.
  const embeddedCustomer = details.customer || {};
  const hasCustomer = Boolean(details.customer || customer);
  const customerName = embeddedCustomer.fullName || customer?.fullName || customer?.account?.name || "—";
  const customerInitial = customerName !== "—" ? customerName.charAt(0).toUpperCase() : "?";

  const priceBreakdown = [
    { name: "Net Bill (Vendor)", value: Number(pricing.netBill) || 0 },
    { name: "Offer Discount", value: Number(pricing.offerDiscount) || 0 },
    { name: "Convenience Fee", value: Number(pricing.convenienceFee) || 0 },
    { name: "Promo Discount", value: Number(pricing.promoDiscount) || 0 },
    { name: "GST", value: Number(pricing.gstAmount) || 0 },
  ].filter((d) => d.value > 0);

  const amountFlow = [
    { name: "Bill Amount", value: Number(pricing.billAmount) || 0 },
    { name: "Net Bill", value: Number(pricing.netBill) || 0 },
    { name: "Total Payable", value: Number(pricing.totalPayable) || 0 },
    { name: "Vendor Payable", value: Number(pricing.vendorPayable) || 0 },
    { name: "Net Received", value: Number(payment.netReceived) || 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/transaction")}
          className="mb-5 flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ArrowLeft size={14} />
          Back to Transactions
        </button>

        {/* Header */}
        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white to-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:via-neutral-900 dark:to-neutral-900 dark:shadow-black/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-1 ring-black/5 dark:bg-neutral-950 dark:ring-white/10">
                {brand.logo ? (
                  <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
                ) : (
                  <Building2 size={24} className="text-neutral-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
                  <Building2 size={12} className="shrink-0" />
                  <ValueOr value={brand.brandName} fallback="No brand" />
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <Tag size={12} className="shrink-0" />
                  {claim.voucherSnapshot?.name || "Voucher"}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[13px] font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                    {orText(payment.razorpayPaymentId, MISSING.id)}
                  </span>
                </div>
                <p className="mt-2 text-[26px] font-bold leading-none text-neutral-900 dark:text-neutral-50">
                  {inr(payment.amount)}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2.5 sm:items-end">
              <div className="flex flex-wrap items-center gap-2">
                <TxnStatusBadge status={status} />
                {payment.verified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-600 ring-1 ring-emerald-400/30 dark:text-emerald-400">
                    <ShieldCheck size={12} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 ring-1 ring-neutral-300/60 dark:bg-neutral-700/40 dark:text-neutral-400">
                    <ShieldAlert size={12} />
                    Unverified
                  </span>
                )}
              </div>
              {payment.invoiceDownloadUrl && (
                <a
                  href={payment.invoiceDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
                >
                  <FileDown size={13} />
                  Download Invoice
                </a>
              )}
            </div>
          </div>

          {/* At-a-glance strip */}
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-200/70 pt-4 dark:border-neutral-800/70 sm:grid-cols-4">
            <QuickFact
              icon={Calendar}
              label="Date & Time"
              value={dateStr ? `${formatDate(dateStr)} · ${fmtTime(dateSrc)}` : null}
              fallback={MISSING.date}
            />
            <QuickFact icon={CreditCard} label="Method" value={formatPaymentMethod(payment.paymentMethod)} fallback={MISSING.method} />
            <QuickFact icon={Store} label="Outlet" value={outlet.uniqueId || claim.outletSnapshot?.uniqueId} fallback="No outlet" />
            <QuickFact icon={MapPin} label="State" value={claim.outletSnapshot?.state} fallback="Not added" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card icon={CreditCard} tint="sky" title="Payment Info">
            <Field icon={Building2} label="Vendor" value={brand.brandName} fallback="No brand" />
            <Field icon={User} label="Customer" value={customerName !== "—" ? customerName : payment.customerId} mono={customerName === "—"} fallback={MISSING.name} />
            <Field icon={Calendar} label="Date" value={dateStr ? formatDate(dateStr) : null} fallback={MISSING.date} />
            <Field icon={Clock} label="Time" value={dateSrc ? fmtTime(dateSrc) : null} fallback="Not recorded" />
            <Field icon={CreditCard} label="Method" value={formatPaymentMethod(payment.paymentMethod)} fallback={MISSING.method} />
            <Field label="Currency" value={payment.currency} fallback="Not recorded" />
            <Field icon={Receipt} label="Invoice" value={payment.invoiceId} fallback="Not issued" />
            <Field icon={Hash} label="Razorpay Order ID" value={payment.razorpayOrderId} mono fallback={MISSING.id} />
            <Field label="Amount Refunded" value={inr(payment.amountRefunded)} />
          </Card>

          <Card icon={Tag} tint="emerald" title="Claim & Redemption">
            <Field icon={Hash} label="Claim Code" value={claim.claimCode} mono fallback={MISSING.id} />
            <Field label="Claim Status" value={claim.status} fallback="No status" />
            <Field icon={Tag} label="Voucher" value={claim.voucherSnapshot?.name} fallback="No voucher" />
            <Field icon={Calendar} label="Redeemed At" value={formatDateTime(claim.redeemedAt)} fallback="Not yet" />
            <Field icon={Calendar} label="Paid At" value={formatDateTime(claim.paidAt)} fallback="Not yet" />
            <Field icon={Store} label="Outlet" value={outlet.uniqueId || claim.outletSnapshot?.uniqueId} fallback="No outlet" />
            <Field icon={Hash} label="Store ID" value={outlet.storeId || claim.outletSnapshot?.storeId} mono fallback={MISSING.id} />
            <Field icon={MapPin} label="State" value={claim.outletSnapshot?.state} fallback="Not added" />
          </Card>

          {hasCustomer && (
            <Card
              tint="violet"
              title="Customer"
              right={
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-400/10 text-[13px] font-bold text-violet-600 dark:text-violet-400">
                  {customerInitial}
                </span>
              }
            >
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50"><ValueOr value={customerName} fallback={MISSING.name} /></p>
              </div>
              <Field icon={Hash} label="Unique ID" value={embeddedCustomer.uniqueId || customer?.uniqueId} mono fallback={MISSING.id} />
              <Field
                icon={Phone}
                label="Phone"
                value={formatPhone(
                  embeddedCustomer.mobile ||
                    embeddedCustomer.whatsappNumber ||
                    customer?.whatsappNumber ||
                    customer?.account?.whatsappNumber
                )}
                fallback={MISSING.phone}
              />
              <Field icon={Mail} label="Email" value={embeddedCustomer.email || customer?.email || customer?.account?.email} fallback={MISSING.email} />
              {customer && (
                <>
                  <Field icon={Wallet} label="Wallet Balance" value={inr(customer.account?.walletBalance)} />
                  <Field icon={Coins} label="T-Coins" value={customer.account?.tCoinsBalance ?? 0} />
                  <Field icon={Users} label="Followers" value={customer.account?.followerCount ?? 0} />
                  <Field
                    icon={ShieldCheck}
                    label="Account Active"
                    value={customer.isAccountActive === false || customer.account?.isActive === false ? "No" : "Yes"}
                  />
                </>
              )}
            </Card>
          )}

          {voucherInfo && (
            <Card
              tint="amber"
              title="Voucher"
              right={
                voucherInfo.images?.[0]?.url ? (
                  <img
                    src={voucherInfo.images[0].url}
                    alt={voucherInfo.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5 dark:ring-white/10"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-600 dark:text-amber-400">
                    <Tag size={16} />
                  </span>
                )
              }
            >
              <div className="col-span-2 sm:col-span-3">
                <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{voucherInfo.name}</p>
                {voucherInfo.category?.name && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <Tag size={10} />
                    {voucherInfo.category.name}
                  </span>
                )}
              </div>
              <Field icon={Hash} label="Voucher Code" value={voucherInfo.voucher?.voucherCode} mono fallback={MISSING.id} />
              <Field icon={Layers} label="Sub-Category" value={voucherInfo.subCategory?.name} fallback={MISSING.category} />
              <Field icon={Building2} label="Brand" value={voucherInfo.brand?.brandName} fallback="No brand" />
              <Field
                icon={Calendar}
                label="Validity"
                value={
                  voucherInfo.startAt && voucherInfo.endAt
                    ? `${formatDateTime(voucherInfo.startAt)} → ${formatDateTime(voucherInfo.endAt)}`
                    : null
                }
                fallback={MISSING.date}
              />
              {voucherInfo.offers?.[0] && (
                <Field
                  icon={Percent}
                  label="Offer"
                  value={`${voucherInfo.offers[0].title || "Untitled offer"}${
                    voucherInfo.offers[0].minBillAmount ? ` · min ${inr(voucherInfo.offers[0].minBillAmount)}` : ""
                  }`}
                />
              )}
              {voucherInfo.description && (
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[11.5px] text-neutral-500">Description</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-100">
                    {voucherInfo.description}
                  </p>
                </div>
              )}
            </Card>
          )}

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <h3 className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                <Receipt size={14} />
              </span>
              Offer & Pricing
            </h3>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <PriceRow label="Bill Amount" value={inr(pricing.billAmount)} />
              {pricing.offerTitle && (
                <PriceRow
                  label={`Offer — ${pricing.offerTitle}`}
                  sub={
                    hasOfferCap
                      ? `Min bill ${inr(pricing.offerMinBillAmount)} · Max ${inr(pricing.offerMaxDiscountAmount)} off`
                      : `${pricing.offerDiscountType === "PERCENTAGE" ? `${pricing.offerDiscountValue}% off` : `${inr(pricing.offerDiscountValue)} off`}`
                  }
                  value={`− ${inr(pricing.offerDiscount)}`}
                  tone="discount"
                />
              )}
              {hasPromo && (
                <PriceRow
                  label={`Promo — ${pricing.promoCode}`}
                  sub={[pricing.promoAppliesTo, pricing.promoBase ? `on ${inr(pricing.promoBase)}` : null]
                    .filter(Boolean)
                    .join(" · ") || undefined}
                  value={`− ${inr(pricing.promoDiscount)}`}
                  tone="discount"
                />
              )}
              <PriceRow
                label="Convenience Fee"
                sub={
                  hasFeeSlab
                    ? `${inr(pricing.feePerSlab)} per ${inr(pricing.feeSlabSize)} · capped at ${inr(pricing.feeMaxFee)}`
                    : undefined
                }
                value={`+ ${inr(pricing.convenienceFee)}`}
              />
              {hasGst && (
                <PriceRow
                  label={`GST (${pricing.gstPercentage}%)`}
                  sub={[
                    pricing.isGstInclusive ? "Inclusive" : "Exclusive",
                    pricing.cgst ? `CGST ${inr(pricing.cgst)}` : null,
                    pricing.sgst ? `SGST ${inr(pricing.sgst)}` : null,
                    pricing.igst ? `IGST ${inr(pricing.igst)}` : null,
                    pricing.sacCode ? `SAC ${pricing.sacCode}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  value={`+ ${inr(pricing.gstAmount)}`}
                />
              )}
              {pricing.taxOnTop > 0 && (
                <PriceRow label="Tax on Top" value={`+ ${inr(pricing.taxOnTop)}`} />
              )}
              <PriceRow label="Net Bill" value={inr(pricing.netBill)} />
              <PriceRow label="You Saved" value={inr(pricing.youSaved)} tone="save" />
              <PriceRow label="Total Payable" value={inr(pricing.totalPayable)} strong />
            </div>
          </div>

          <Card icon={Landmark} tint="sky" title="Vendor & Settlement">
            <Field icon={Wallet} label="Vendor Payable" value={inr(pricing.vendorPayable)} />
            <Field
              icon={Percent}
              label="Commission"
              value={`${pricing.commissionPercent ?? 0}% (${inr(pricing.commissionAmount)})`}
            />
            {(pricing.commissionTax || pricing.commissionDeduction) && (
              <>
                <Field label="Commission Tax" value={inr(pricing.commissionTax)} />
                <Field label="Commission Deduction" value={inr(pricing.commissionDeduction)} />
              </>
            )}
            <Field icon={CreditCard} label="Gateway Fee" value={inr(payment.gatewayFee)} />
            <Field icon={Landmark} label="Net Received" value={inr(payment.netReceived)} />
            <Field label="Settlement Stage" value={payment.settlementStage} fallback={MISSING.date} />
            <Field label="Settlement Hold" value={payment.settlementHold ? "Yes" : "No"} />
            {payment.settlementHold && payment._id && (
              <div className="col-span-2 sm:col-span-3">
                <ReleaseHold transactionId={payment._id} />
              </div>
            )}
            <Field icon={ShieldAlert} label="Disputed" value={payment.isDisputed ? "Yes" : "No"} />
          </Card>
        </div>

        {priceBreakdown.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                Price Breakdown
              </h3>
              <div className="flex items-center gap-5">
                <div className="relative h-35 w-35 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={68}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {priceBreakdown.map((entry, i) => (
                          <Cell key={entry.name} fill={PRICE_SLICE_COLORS[i % PRICE_SLICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v, n) => [inr(v), n]}
                        contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-neutral-500">Bill Amount</span>
                    <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">
                      {inr(pricing.billAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {priceBreakdown.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PRICE_SLICE_COLORS[i % PRICE_SLICE_COLORS.length] }}
                        />
                        {entry.name}
                      </span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">
                        {inr(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                Amount Flow
              </h3>
              <div className="h-55">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amountFlow} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 11, fill: "#737373" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [inr(v), "Amount"]}
                      contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="var(--color-emerald-400)" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

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
                <TimelineEvent
                  key={event._id || i}
                  event={event}
                  isLast={i === timeline.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
