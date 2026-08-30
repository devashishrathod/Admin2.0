import React, { useState } from "react";
import {
  ArrowLeft,
  Tag,
  Layers,
  Calendar,
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
  UserRound,
  Lock,
  Building2,
  Wallet,
  Coins,
  Smartphone,
  Globe,
  X,
} from "lucide-react";
import Table from "../../components/common/Table";
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
    <div className="flex items-start gap-2.5 py-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon size={12} />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100">{value}</p>
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
  Created: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Submitted: "text-sky-600 dark:text-sky-400 bg-sky-400/10",
  Approved: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Rejected: "text-red-600 dark:text-red-400 bg-red-500/10",
  Published: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Expired: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Archived: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
};

const OFFER_COLUMNS = [
  { key: "title", label: "Offer", render: (o) => <span className="font-medium text-neutral-800 dark:text-neutral-100">{o.title}</span> },
  {
    key: "discount",
    label: "Discount",
    render: (o) => (
      <span className="text-neutral-700 dark:text-neutral-300">
        {o.discountType === "PERCENTAGE" ? `${o.discountValue}%` : `₹${o.discountValue}`}
      </span>
    ),
  },
  { key: "minBillAmount", label: "Min Bill", render: (o) => <span className="text-neutral-700 dark:text-neutral-300">₹{o.minBillAmount}</span> },
  {
    key: "maxDiscountAmount",
    label: "Max Discount",
    render: (o) => <span className="text-neutral-700 dark:text-neutral-300">₹{o.maxDiscountAmount}</span>,
  },
  { key: "usageType", label: "Usage", render: (o) => <span className="text-neutral-500 dark:text-neutral-400">{o.usageType}</span> },
  {
    key: "discountApplicableOn",
    label: "Applicable On",
    render: (o) => <span className="text-neutral-500 dark:text-neutral-400">{o.discountApplicableOn}</span>,
  },
  { key: "sortOrder", label: "Order", render: (o) => <span className="text-neutral-500 dark:text-neutral-400">{o.sortOrder ?? "—"}</span> },
  {
    key: "isActive",
    label: "Active",
    render: (o) =>
      o.isActive ? (
        <span className="text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={14} />
        </span>
      ) : (
        <span className="text-neutral-400 dark:text-neutral-600">
          <XCircle size={14} />
        </span>
      ),
  },
];

const HISTORY_COLUMNS = [
  {
    key: "action",
    label: "Action",
    render: (h) => {
      const Icon = HISTORY_ICONS[h.action] || Clock;
      const color = HISTORY_COLORS[h.action] || "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40";
      return (
        <span className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color}`}>
            <Icon size={12} />
          </span>
          {h.action}
        </span>
      );
    },
  },
  { key: "by", label: "By", render: (h) => <span className="text-neutral-700 dark:text-neutral-300">{h.by || "—"}</span> },
  { key: "date", label: "Date", render: (h) => <span className="text-neutral-500 dark:text-neutral-400">{h.date}</span> },
  { key: "remarks", label: "Remarks", render: (h) => <span className="text-neutral-500 dark:text-neutral-400">{h.remarks || "—"}</span> },
];

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
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to vouchers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{voucher.title}</h1>
                <VoucherStatusBadge status={status} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-neutral-500">
                <Tag size={11} /> {voucher.versionCode} · {voucher.brandName}
              </p>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: voucher info */}
          <div className="min-w-0 space-y-4">
            {/* Images */}
            {voucher.images?.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {voucher.images.map((img, i) => (
                  <div key={img.url || i} className="relative aspect-video overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                    <img src={img.url} alt={`${voucher.title} ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      #{img.sortOrder ?? i + 1}
                    </span>
                    {img.provider && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-white">
                        {img.provider}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Voucher Details
              </p>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800/70">
                <InfoRow icon={Hash} label="Voucher Code" value={voucher.voucherCode} />
                <InfoRow
                  icon={Layers3}
                  label="Version"
                  value={`${voucher.versionCode}`}
                />
                <InfoRow
                  icon={UserRound}
                  label="Created By"
                  value={`${voucher.creator?.name || "—"}${voucher.creator?.role ? ` · ${voucher.creator.role}` : ""}`}
                />
                <InfoRow icon={Layers} label="Category" value={`${voucher.category} · ${voucher.subCategory}`} />
                <InfoRow icon={Calendar} label="Created" value={voucher.createdAtDisplay} />
                <InfoRow icon={Clock} label="Last Updated" value={voucher.updatedAtDisplay} />
                {/* Only shown once the voucher has actually been published —
                    no fallback to createdAt, so a DRAFT never shows this. */}
                {voucher.publishedDate && (
                  <InfoRow icon={Calendar} label="Published" value={voucher.publishedDate} />
                )}
                <InfoRow icon={Calendar} label="Validity" value={`${voucher.startDate} → ${voucher.endDate}`} />
                {/* <InfoRow icon={Store} label="Sub-Brands Attached" value={voucher.attachedSubBrandsCount ?? 0} />*/}
                <InfoRow 
                  icon={Lock}
                  label="Immutable"
                  value={voucher.isImmutable ? "Yes — locked from further edits" : "No — still editable"}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    voucher.isActive
                      ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                  }`}
                >
                  {voucher.isActive ? "Active" : "Inactive"}
                </span>
                {voucher.isDeleted && (
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                    Deleted
                  </span>
                )}
              </div>
              {voucher.description && (
                <div className="mt-3 rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">Description</p>
                  <p className="text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">{voucher.description}</p>
                </div>
              )}
              {voucher.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {voucher.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Category & Sub-Category */}
            {(voucher.categoryDetails || voucher.subCategoryDetails) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {voucher.categoryDetails && (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">Category</p>
                    <div className="flex items-center gap-3">
                      {voucher.categoryDetails.image ? (
                        <img
                          src={voucher.categoryDetails.image}
                          alt={voucher.categoryDetails.name}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          <Layers size={16} />
                        </div>
                      )}
                      <div>
                        <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">
                          {voucher.categoryDetails.name}
                        </p>
                        {voucher.categoryDetails.description && (
                          <p className="mt-0.5 text-[12px] text-neutral-500">{voucher.categoryDetails.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {voucher.subCategoryDetails && (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">Sub-Category</p>
                    <div className="flex items-center gap-3">
                      {voucher.subCategoryDetails.image ? (
                        <img
                          src={voucher.subCategoryDetails.image}
                          alt={voucher.subCategoryDetails.name}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          <Layers3 size={16} />
                        </div>
                      )}
                      <div>
                        <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">
                          {voucher.subCategoryDetails.name}
                        </p>
                        {voucher.subCategoryDetails.description && (
                          <p className="mt-0.5 text-[12px] text-neutral-500">{voucher.subCategoryDetails.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offers */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Offers ({voucher.offers?.length ?? 0})
              </p>
              {voucher.offers?.length ? (
                <Table columns={OFFER_COLUMNS} data={voucher.offers} rowKey="_id" emptyMessage="No offers on this version." />
              ) : (
                <p className="text-[12.5px] text-neutral-500">No offers on this version.</p>
              )}
            </div>

            {/* History timeline */}
            {voucher.history?.length > 0 && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Approval History
                </p>
                <Table columns={HISTORY_COLUMNS} data={voucher.history} rowKey="action" emptyMessage="No history yet." />
              </div>
            )}
          </div>

          {/* Right: Super Admin approval panel + brand + quick facts */}
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
                <ShieldCheck size={16} className="text-emerald-500 dark:text-emerald-400" /> Super Admin Approval
              </div>

              {/* ---- Under review: Approve / Reject ---- */}
              {status === VOUCHER_STATUSES.UNDER_REVIEW && (
                <div className="space-y-3">
                  <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    This voucher is awaiting review before it can go live.
                  </p>

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
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* ---- Approved: ready to publish ---- */}
              {status === VOUCHER_STATUSES.APPROVED && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded-xl bg-sky-400/10 p-3.5">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
                    <p className="text-[12.5px] text-sky-700 dark:text-sky-300">
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
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[12.5px] text-emerald-700 dark:text-emerald-300">This voucher is live in the app.</p>
                </div>
              )}

              {/* ---- Rejected: reason ---- */}
              {status === VOUCHER_STATUSES.REJECTED && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-[12.5px] font-medium text-red-700 dark:text-red-300">Rejected</p>
                    <p className="mt-0.5 text-[12.5px] text-red-700/80 dark:text-red-300/80">
                      {voucher.rejectionReason || "No reason recorded."}
                    </p>
                  </div>
                </div>
              )}

              {/* ---- Draft: nothing to review yet ---- */}
              {status === VOUCHER_STATUSES.DRAFT && (
                <div className="flex items-start gap-2.5 rounded-xl bg-neutral-200 p-3.5 dark:bg-neutral-800/60">
                  <FileText size={16} className="mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    Still a draft — the vendor hasn't submitted it for review yet.
                  </p>
                </div>
              )}

              {/* ---- Expired / Paused / Archived: terminal states ---- */}
              {[VOUCHER_STATUSES.EXPIRED, VOUCHER_STATUSES.PAUSED, VOUCHER_STATUSES.ARCHIVED].includes(status) && (
                <div className="flex items-start gap-2.5 rounded-xl bg-neutral-200 p-3.5 dark:bg-neutral-800/60">
                  <Clock size={16} className="mt-0.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                    This voucher is {status.toLowerCase()} and no longer actionable.
                  </p>
                </div>
              )}
            </div>

            {/* Brand */}
            {voucher.brand && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Brand
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                    {voucher.brand.logo ? (
                      <img src={voucher.brand.logo} alt={voucher.brand.name} className="h-full w-full object-contain" />
                    ) : (
                      <Store size={16} className="text-neutral-500 dark:text-neutral-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{voucher.brand.name}</p>
                    <p className="text-[11.5px] text-neutral-500">{voucher.brand.legalName}</p>
                  </div>
                </div>
                <div className="mt-2 divide-y divide-neutral-200 dark:divide-neutral-800/70">
                  <InfoRow icon={BadgeCheck} label="Brand ID" value={voucher.brand.uniqueId} />
                  <InfoRow icon={Store} label="Merchant ID" value={voucher.brand.merchantId} />
                  <InfoRow icon={Phone} label="WhatsApp" value={voucher.brand.whatsappNumber} />
                  <InfoRow icon={Building2} label="Business Type" value={voucher.brand.businessEntityType} />
                  <InfoRow icon={FileText} label="Registration Status" value={voucher.brand.businessRegistrationStatus} />
                  <InfoRow icon={Calendar} label="Joined" value={voucher.brand.joinedDate} />
                </div>
                {voucher.brand.description && (
                  <div className="mt-3 rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
                    <p className="mb-1 text-[11px] uppercase tracking-wide text-neutral-500">About</p>
                    <p className="text-[12.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{voucher.brand.description}</p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60">
                    <p className="text-neutral-500">Franchises</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {voucher.brand.franchises.used}{voucher.brand.franchises.unlimited ? " / Unlimited" : ` / ${voucher.brand.franchises.limit}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60">
                    <p className="text-neutral-500">Sub-Brands</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {voucher.brand.subBrands.used}{voucher.brand.subBrands.unlimited ? " / Unlimited" : ` / ${voucher.brand.subBrands.limit}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60">
                    <p className="text-neutral-500">Showcase</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {voucher.brand.showcase.used}{voucher.brand.showcase.unlimited ? " / Unlimited" : ` / ${voucher.brand.showcase.limit}`}
                    </p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-950/60">
                    <p className="text-neutral-500">Vouchers</p>
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {voucher.brand.vouchers.used}{voucher.brand.vouchers.unlimited ? " / Unlimited" : ` / ${voucher.brand.vouchers.limit}`}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.brand.isApproved
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.brand.isApproved ? "Brand Approved" : "Brand Pending Approval"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.brand.isSubscribed
                        ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.brand.isSubscribed ? "Subscribed" : "Not Subscribed"}
                  </span>
                  <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    Onboarding: {voucher.brand.onboardingStatus}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.brand.isReviewed
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.brand.isReviewed ? "Reviewed" : "Not Reviewed"}
                  </span>
                  {voucher.brand.isRevoked && (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                      Revoked
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Created By (vendor user) */}
            {voucher.creatorUser && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Created By (Vendor User)
                </p>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800/70">
                  <InfoRow icon={UserRound} label="Unique ID" value={voucher.creatorUser.uniqueId} />
                  <InfoRow icon={BadgeCheck} label="Role" value={voucher.creatorUser.role} />
                  <InfoRow icon={Smartphone} label="Login Type" value={voucher.creatorUser.loginType} />
                  <InfoRow icon={Phone} label="WhatsApp" value={voucher.creatorUser.whatsappNumber} />
                  <InfoRow icon={Tag} label="Referral Code" value={voucher.creatorUser.referralCode} />
                  <InfoRow icon={Wallet} label="Wallet Balance" value={voucher.creatorUser.walletBalance} />
                  <InfoRow icon={Coins} label="tCoins Balance" value={voucher.creatorUser.tCoinsBalance} />
                  <InfoRow icon={Globe} label="Current Screen" value={voucher.creatorUser.currentScreen} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.creatorUser.isMobileVerified
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.creatorUser.isMobileVerified ? "Mobile Verified" : "Mobile Not Verified"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.creatorUser.isEmailVerified
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.creatorUser.isEmailVerified ? "Email Verified" : "Email Not Verified"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.creatorUser.isOnBoardingCompleted
                        ? "bg-sky-400/10 text-sky-600 dark:text-sky-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.creatorUser.isOnBoardingCompleted ? "Onboarding Complete" : "Onboarding Incomplete"}
                  </span>
                </div>
              </div>
            )}

            {/* Parent voucher record */}
            {voucher.parentVoucher && (
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Parent Voucher Record
                </p>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800/70">
                  <InfoRow icon={FileText} label="Normalized Name" value={voucher.parentVoucher.normalizedName} />
                  <InfoRow icon={Globe} label="Timezone" value={voucher.parentVoucher.timezone} />
                  <InfoRow icon={Layers3} label="Current Version" value={voucher.parentVoucher.currentVersion} />
                  <InfoRow icon={ShieldCheck} label="Parent Status" value={voucher.parentVoucher.status} />
                  <InfoRow icon={Calendar} label="Created" value={voucher.parentVoucher.createdAtDisplay} />
                  <InfoRow icon={Clock} label="Last Updated" value={voucher.parentVoucher.updatedAtDisplay} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      voucher.parentVoucher.isActive
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                    }`}
                  >
                    {voucher.parentVoucher.isActive ? "Active" : "Inactive"}
                  </span>
                  {voucher.parentVoucher.isDeleted && (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                      Deleted
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick facts */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Quick Facts
              </p>
              <div className="space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{STATUS_LABEL(status)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Voucher code</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{voucher.voucherCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Vendor</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{voucher.brand?.name || voucher.brandName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Version number</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{voucher.versionNumber ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Last updated</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{voucher.updatedAtDisplay}</span>
                </div>
              </div>
            </div>

            {!voucher.images?.length && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-[12px] text-neutral-500 dark:border-neutral-800">
                <ImageIcon size={16} className="shrink-0" />
                No images uploaded for this voucher.
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <XCircle size={17} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Voucher</h2>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">
                    Tell the vendor why <span className="text-neutral-700 dark:text-neutral-300">{voucher.title}</span> is
                    being rejected. This reason is shown to the vendor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowRejectBox(false);
                  setRejectError("");
                }}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                  Reason for rejection <span className="text-red-600 dark:text-red-400">*</span>
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
                  className={`w-full resize-none rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                    rejectError
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-red-400/60 focus:ring-red-400/60 dark:border-neutral-800"
                  }`}
                />
                {rejectError && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} /> {rejectError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectBox(false);
                    setRejectError("");
                  }}
                  disabled={busy}
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy && <Loader2 size={13} className="animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
