import React, { useState } from "react";
import {
  ArrowLeft,
  Tag,
  Layers,
  Calendar,
  Percent,
  IndianRupee,
  CheckCircle2,
  XCircle,
  UploadCloud,
  Clock,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Store,
  Phone,
  BadgeCheck,
  Hash,
  Layers3,
} from "lucide-react";
import { computeStatus, VoucherStatusBadge } from "./VoucherList";
import { VOUCHER_STATUSES } from "./services/VoucherApi";

/* -------------------------------------------------------------------------
 * VoucherDetails
 * -------------------------------------------------------------------------
 * Read-only info card for the voucher itself (category, offers, images,
 * tags), plus a Super-Admin approval panel whose contents change with the
 * voucher's real backend status:
 *
 *   UNDER_REVIEW -> Approve / Reject buttons (reject requires a reason,
 *                    which gets POSTed to the backend along with the
 *                    rejected version)
 *   APPROVED      -> Publish button (makes it live)
 *   PUBLISHED     -> "Live" info, no further action
 *   REJECTED      -> shows the reason the vendor needs to fix
 *   DRAFT         -> not submitted yet, nothing for admin to do
 *   EXPIRED / PAUSED / ARCHIVED -> terminal/inactive info only
 *
 * The actual approve/reject/publish network calls happen one level up in
 * VoucherList.jsx — this component only calls the callbacks it's given and
 * reflects the `busy` / `actionError` state passed down.
 * ---------------------------------------------------------------------- */

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
        <Icon size={14} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-[13.5px] font-medium text-neutral-100">{value}</p>
      </div>
    </div>
  );
}

const HISTORY_ICONS = {
  Created: FileText,
  Submitted: FileText,
  Approved: CheckCircle2,
  Rejected: XCircle,
  Published: UploadCloud,
  Expired: Clock,
  Archived: Clock,
};

const HISTORY_COLORS = {
  Created: "text-neutral-400 bg-neutral-700/40",
  Submitted: "text-sky-400 bg-sky-400/10",
  Approved: "text-emerald-400 bg-emerald-400/10",
  Rejected: "text-red-400 bg-red-500/10",
  Published: "text-emerald-400 bg-emerald-400/10",
  Expired: "text-neutral-400 bg-neutral-700/40",
  Archived: "text-neutral-400 bg-neutral-700/40",
};

export default function VoucherDetails({ voucher, onBack, onApprove, onReject, onPublish, busy, actionError }) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const status = computeStatus(voucher);

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError("A reason is required so the vendor knows what to fix.");
      return;
    }
    onReject(rejectReason.trim());
    setRejectReason("");
    setShowRejectBox(false);
    setRejectError("");
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to vouchers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[19px] font-semibold tracking-tight text-neutral-50">{voucher.title}</h1>
                <VoucherStatusBadge status={status} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-neutral-500">
                <Tag size={11} /> {voucher.versionCode} · {voucher.brandName}
              </p>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: voucher info */}
          <div className="space-y-4">
            {/* Images */}
            {voucher.images?.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {voucher.images.map((url, i) => (
                  <div key={i} className="aspect-video overflow-hidden rounded-xl bg-neutral-800">
                    <img src={url} alt={`${voucher.title} ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Voucher Details
              </p>
              <div className="divide-y divide-neutral-800/70">
                <InfoRow icon={Hash} label="Voucher Code" value={voucher.voucherCode} />
                <InfoRow icon={Layers3} label="Version" value={`${voucher.versionCode} `} />
                <InfoRow icon={Layers} label="Category" value={`${voucher.category} · ${voucher.subCategory}`} />
                <InfoRow icon={Calendar} label="Published" value={voucher.publishedDate} />
                <InfoRow icon={Calendar} label="Validity" value={`${voucher.startDate} → ${voucher.endDate}`} />
                <InfoRow icon={Store} label="Sub-Brands Attached" value={voucher.attachedSubBrandsCount ?? 0} />
              </div>
              {voucher.description && (
                <div className="mt-3 rounded-xl bg-neutral-950/60 p-3.5">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">Description</p>
                  <p className="text-[13px] leading-relaxed text-neutral-300">{voucher.description}</p>
                </div>
              )}
              {voucher.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {voucher.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Brand */}
            {voucher.brand && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Brand
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-800">
                    {voucher.brand.logo ? (
                      <img src={voucher.brand.logo} alt={voucher.brand.name} className="h-full w-full object-cover" />
                    ) : (
                      <Store size={18} className="text-neutral-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-neutral-50">{voucher.brand.name}</p>
                    <p className="text-[11.5px] text-neutral-500">{voucher.brand.legalName}</p>
                  </div>
                </div>
                <div className="mt-2 divide-y divide-neutral-800/70">
                  <InfoRow icon={BadgeCheck} label="Brand ID" value={voucher.brand.uniqueId} />
                  <InfoRow icon={Store} label="Merchant ID" value={voucher.brand.merchantId} />
                  <InfoRow icon={Phone} label="WhatsApp" value={voucher.brand.whatsappNumber} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.brand.isApproved ? "bg-emerald-400/10 text-emerald-400" : "bg-neutral-700/40 text-neutral-400"
                    }`}
                  >
                    {voucher.brand.isApproved ? "Brand Approved" : "Brand Pending Approval"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.brand.isSubscribed ? "bg-sky-400/10 text-sky-400" : "bg-neutral-700/40 text-neutral-400"
                    }`}
                  >
                    {voucher.brand.isSubscribed ? "Subscribed" : "Not Subscribed"}
                  </span>
                  <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                    Onboarding: {voucher.brand.onboardingStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Offers */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Offers ({voucher.offers?.length ?? 0})
              </p>
              {voucher.offers?.length ? (
                <div className="space-y-2.5">
                  {voucher.offers.map((offer, i) => (
                    <div
                      key={offer._id || i}
                      className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400">
                        <Percent size={14} />
                      </span>
                      <div>
                        <p className="text-[13.5px] font-medium text-neutral-100">{offer.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-neutral-500">
                          <IndianRupee size={10} /> Min bill ₹{offer.minBillAmount} · Max discount ₹
                          {offer.maxDiscountAmount} · {offer.usageType} · on {offer.discountApplicableOn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12.5px] text-neutral-500">No offers on this version.</p>
              )}
            </div>

            {/* History timeline */}
            {voucher.history?.length > 0 && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Approval History
                </p>
                <div className="space-y-4">
                  {voucher.history.map((h, i) => {
                    const Icon = HISTORY_ICONS[h.action] || Clock;
                    const color = HISTORY_COLORS[h.action] || "text-neutral-400 bg-neutral-700/40";
                    return (
                      <div key={i} className="flex gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <p className="text-[13px] font-semibold text-neutral-100">{h.action}</p>
                            <span className="text-[11px] text-neutral-500">
                              {h.by ? `${h.by} · ` : ""}
                              {h.date}
                            </span>
                          </div>
                          {h.remarks && <p className="mt-0.5 text-[12.5px] text-neutral-400">{h.remarks}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Super Admin approval panel */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-neutral-50">
                <ShieldCheck size={16} className="text-emerald-400" /> Super Admin Approval
              </div>

              {/* ---- Under review: Approve / Reject ---- */}
              {status === VOUCHER_STATUSES.UNDER_REVIEW && (
                <div className="space-y-3">
                  <p className="text-[12.5px] text-neutral-400">
                    This voucher is awaiting review before it can go live.
                  </p>

                  {!showRejectBox ? (
                    <>
                      <div className="flex gap-2.5">
                        <button
                          onClick={onApprove}
                          disabled={busy}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectBox(true)}
                          disabled={busy}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleRejectSubmit} className="space-y-3">
                      <label className="mb-1.5 block text-[12px] font-medium text-red-400">
                        Reason for rejection <span className="text-neutral-500">(required)</span>
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => {
                          setRejectReason(e.target.value);
                          if (rejectError) setRejectError("");
                        }}
                        rows={3}
                        placeholder="e.g. Discount exceeds category cap. Please revise."
                        disabled={busy}
                        className={`w-full resize-none rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 disabled:opacity-60 ${
                          rejectError
                            ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                            : "border-neutral-800 focus:border-red-400/60 focus:ring-red-400/60"
                        }`}
                      />
                      {rejectError && (
                        <p className="flex items-center gap-1 text-[11.5px] text-red-400">
                          <AlertTriangle size={11} /> {rejectError}
                        </p>
                      )}
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectBox(false);
                            setRejectError("");
                          }}
                          disabled={busy}
                          className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-800 text-[13px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={busy}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                          Confirm Reject
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ---- Approved: ready to publish ---- */}
              {status === VOUCHER_STATUSES.APPROVED && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl bg-sky-400/10 p-3.5">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sky-400" />
                    <p className="text-[12.5px] text-sky-300">
                      Approved — publish it to make this voucher live in the app.
                    </p>
                  </div>
                  <button
                    onClick={onPublish}
                    disabled={busy}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
                    Publish Voucher
                  </button>
                </div>
              )}

              {/* ---- Published: live ---- */}
              {status === VOUCHER_STATUSES.PUBLISHED && (
                <div className="flex items-start gap-2.5 rounded-xl bg-emerald-400/10 p-3.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  <p className="text-[12.5px] text-emerald-300">This voucher is live in the app.</p>
                </div>
              )}

              {/* ---- Rejected: reason ---- */}
              {status === VOUCHER_STATUSES.REJECTED && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                  <div>
                    <p className="text-[12.5px] font-medium text-red-300">Rejected</p>
                    <p className="mt-0.5 text-[12.5px] text-red-300/80">
                      {voucher.rejectionReason || "No reason recorded."}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Draft: nothing to review yet ---- */}
              {status === VOUCHER_STATUSES.DRAFT && (
                <div className="flex items-start gap-2.5 rounded-xl bg-neutral-800/60 p-3.5">
                  <FileText size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                  <p className="text-[12.5px] text-neutral-400">
                    Still a draft — the vendor hasn't submitted it for review yet.
                  </p>
                </div>
              )}

              {/* ---- Expired / Paused / Archived: terminal states ---- */}
              {[VOUCHER_STATUSES.EXPIRED, VOUCHER_STATUSES.PAUSED, VOUCHER_STATUSES.ARCHIVED].includes(status) && (
                <div className="flex items-start gap-2.5 rounded-xl bg-neutral-800/60 p-3.5">
                  <Clock size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                  <p className="text-[12.5px] text-neutral-400">
                    This voucher is {status.toLowerCase()} and no longer actionable.
                  </p>
                </div>
              )}
            </div>

            {/* Quick facts */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Quick Facts
              </p>
              <div className="space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-medium text-neutral-200">{STATUS_LABEL(status)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Voucher code</span>
                  <span className="font-medium text-neutral-200">{voucher.voucherCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Vendor</span>
                  <span className="font-medium text-neutral-200">{voucher.brand?.name || voucher.brandName}</span>
                </div>
              </div>
            </div>

            {!voucher.images?.length && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-neutral-800 px-4 py-6 text-[12px] text-neutral-500">
                <ImageIcon size={16} className="shrink-0" />
                No images uploaded for this voucher.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function STATUS_LABEL(status) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
