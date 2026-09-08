import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Check, Ban } from "lucide-react";
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
import { getRefundById, approveRefund, rejectRefund } from "./services/RefundApi";
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

// One line of an itemized price receipt — same pattern as the Transaction
// details page's pricing breakdown, reused here since a refund always
// traces back to the original claim's pricing.
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
            strong ? "font-semibold text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-300"
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

function formatDateTime(iso) {
  if (!iso) return "—";
  return `${formatDate(new Date(iso).toISOString().slice(0, 10))} · ${fmtTime(iso)}`;
}

const STATUS_BADGE = {
  PENDING: "bg-amber-400/10 text-amber-600 ring-amber-400/30 dark:text-amber-400",
  APPROVED: "bg-emerald-400/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-400",
  REJECTED: "bg-red-400/10 text-red-600 ring-red-400/30 dark:text-red-400",
};

const TIMELINE_DOT = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-400",
  REJECTED: "bg-red-400",
  REDEEMED: "bg-emerald-400",
  CANCELLED: "bg-neutral-400",
};

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
          {formatDateTime(event.at)}
          {event.by && ` · by ${event.by}`}
          {event.amount != null && ` · ${inr(event.amount)}`}
        </p>
      </div>
    </div>
  );
}

const PRICE_SLICE_COLORS = ["#34d399", "#f59e0b", "#38bdf8", "#a78bfa", "#f87171"];

export default function RefundDetails() {
  const { refundRequestId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

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

  const handleApprove = async () => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await approveRefund(refundRequestId, { approvedAmount: details.refund.requestedAmount });
      await fetchDetails();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReject = async () => {
    setActionSubmitting(true);
    setActionError("");
    try {
      await rejectRefund(refundRequestId, {});
      await fetchDetails();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

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

  const { refund, claim = {}, brand = {}, outlet = {}, timeline = [] } = details;
  const pricing = claim.pricing || {};
  const status = String(refund.status || "PENDING").toUpperCase();
  const hasPromo = Boolean(pricing.promoCode);
  const hasGst = Boolean(pricing.isGstEnabled);
  const hasOfferCap = Boolean(pricing.offerMinBillAmount || pricing.offerMaxDiscountAmount);
  const hasFeeSlab = Boolean(pricing.feeSlabSize);

  const priceBreakdown = [
    { name: "Net Bill (Vendor)", value: Number(pricing.netBill) || 0 },
    { name: "Offer Discount", value: Number(pricing.offerDiscount) || 0 },
    { name: "Convenience Fee", value: Number(pricing.convenienceFee) || 0 },
    { name: "Promo Discount", value: Number(pricing.promoDiscount) || 0 },
    { name: "GST", value: Number(pricing.gstAmount) || 0 },
  ].filter((d) => d.value > 0);

  const amountFlow = [
    { name: "Bill Amount", value: Number(pricing.billAmount) || 0 },
    { name: "Requested Refund", value: Number(refund.requestedAmount) || 0 },
    { name: "Approved Refund", value: Number(refund.approvedAmount) || 0 },
    { name: "Net Bill", value: Number(pricing.netBill) || 0 },
  ];

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
          <div className="flex items-center gap-4">
            {brand.logo && (
              <img src={brand.logo} alt={brand.brandName} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-[11.5px] text-neutral-500">
                Claim {claim.claimCode || "—"} · {claim.voucherSnapshot?.name || "Voucher"}
              </p>
              <h1 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
                Refund Requested — {inr(refund.requestedAmount)}
              </h1>
              {refund.approvedAmount != null && (
                <p className="mt-2 text-[22px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {inr(refund.approvedAmount)} approved
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ring-1 ${
                STATUS_BADGE[status] || STATUS_BADGE.PENDING
              }`}
            >
              {status}
            </span>
            {status === "PENDING" && (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={actionSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-[12px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/20 disabled:opacity-60 dark:text-emerald-400"
                >
                  {actionSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Approve Full Amount
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-red-400/10 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-400/20 disabled:opacity-60 dark:text-red-400"
                >
                  {actionSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card title="Refund Info">
            <Field label="Requested Amount" value={inr(refund.requestedAmount)} />
            <Field label="Approved Amount" value={refund.approvedAmount != null ? inr(refund.approvedAmount) : "—"} />
            <Field label="Reason" value={refund.reason} />
            <Field label="Note" value={refund.note} />
            <Field label="Requested At" value={formatDateTime(refund.createdAt || refund.requestedAt)} />
            <Field label="Decided At" value={formatDateTime(refund.decidedAt)} />
          </Card>

          <Card title="Claim & Outlet">
            <Field label="Claim Code" value={claim.claimCode} mono />
            <Field label="Claim Status" value={claim.status} />
            <Field label="Voucher" value={claim.voucherSnapshot?.name} />
            <Field label="Customer" value={refund.customerId || claim.customerId} mono />
            <Field label="Vendor" value={brand.brandName} />
            <Field label="Outlet" value={outlet.uniqueId || claim.outletSnapshot?.uniqueId} />
            <Field label="Store ID" value={outlet.storeId || claim.outletSnapshot?.storeId} mono />
            <Field label="State" value={claim.outletSnapshot?.state} />
          </Card>

          {Object.keys(pricing).length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
              <h3 className="mb-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                Original Bill — Offer & Pricing
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
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    value={`+ ${inr(pricing.gstAmount)}`}
                  />
                )}
                <PriceRow label="Net Bill" value={inr(pricing.netBill)} />
                <PriceRow label="You Saved" value={inr(pricing.youSaved)} tone="save" />
                <PriceRow label="Total Payable" value={inr(pricing.totalPayable)} strong />
              </div>
            </div>
          )}
        </div>

        {priceBreakdown.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                Price Breakdown
              </h3>
              <div className="flex items-center gap-5">
                <div className="relative h-[140px] w-[140px] shrink-0">
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
                      <Tooltip formatter={(v, n) => [inr(v), n]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
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
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">{inr(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Amount Flow</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={amountFlow} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 11, fill: "#737373" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v) => [inr(v), "Amount"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#34d399" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {timeline.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <h3 className="mb-4 text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">Timeline</h3>
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
