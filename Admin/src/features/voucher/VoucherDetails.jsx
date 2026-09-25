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
  Coins,
  Globe,
  Users,
  X,
} from "lucide-react";
import { computeStatus, VoucherStatusBadge } from "./VoucherList";
import { VOUCHER_STATUSES } from "./services/VoucherApi";
import { RingStat } from "../brand/BrandShared";

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
    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
        {Icon && <Icon size={11} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{value || "—"}</p>
    </div>
  );
}

const HISTORY_ICONS = {
  Created: FileText,
  Submitted: FileText,
  Approved: CheckCircle2,
  Rejected: XCircle,
  Published: UploadCloud,
  Paused: Clock,
  Expired: Clock,
  Archived: Clock,
};

const HISTORY_COLORS = {
  Created: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Submitted: "text-sky-600 dark:text-sky-400 bg-sky-400/10",
  Approved: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Rejected: "text-red-600 dark:text-red-400 bg-red-500/10",
  Published: "text-emerald-600 dark:text-emerald-400 bg-emerald-400/10",
  Paused: "text-orange-600 dark:text-orange-400 bg-orange-400/10",
  Expired: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
  Archived: "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40",
};

// A fixed, non-cycled categorical order (blue, orange, teal, amber, pink,
// green, violet, red) — so each offer / each version gets its own distinct
// color instead of blending together, and the same slot index always means
// the same hue. Classes are written out in full (not built from a template
// string) since Tailwind only picks up literal class names it can find in
// source, not ones assembled at runtime.
const ACCENT_STYLES = [
  { dot: "bg-blue-500", left: "border-blue-400" },
  { dot: "bg-orange-500", left: "border-orange-400" },
  { dot: "bg-teal-500", left: "border-teal-400" },
  { dot: "bg-amber-500", left: "border-amber-400" },
  { dot: "bg-pink-500", left: "border-pink-400" },
  { dot: "bg-green-500", left: "border-green-400" },
  { dot: "bg-violet-500", left: "border-violet-400" },
  { dot: "bg-red-500", left: "border-red-400" },
];

export default function VoucherDetails({
  voucher,
  onBack,
  onApprove,
  onReject,
  onPublish,
  onApproveBanner,
  onRejectBanner,
  busy,
  actionError,
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // Separate state for the banner's own reject flow — it's an independent
  // approval gate from the version reject above, and both can't be
  // in-flight for the same reason box at once.
  const [bannerRejectReason, setBannerRejectReason] = useState("");
  const [showBannerRejectBox, setShowBannerRejectBox] = useState(false);
  const [bannerRejectError, setBannerRejectError] = useState("");

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

  const handleBannerRejectSubmit = (e) => {
    e.preventDefault();
    if (!bannerRejectReason.trim()) {
      setBannerRejectError("A reason is required so the vendor knows what to fix.");
      return;
    }
    onRejectBanner(bannerRejectReason.trim());
    setBannerRejectReason("");
    setShowBannerRejectBox(false);
    setBannerRejectError("");
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to vouchers"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
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

          <div className="flex flex-wrap items-center gap-2.5">
            <RingStat
              pct={voucher.isActive ? 100 : 0}
              label="Status"
              caption={voucher.isActive ? "Active" : "Inactive"}
              tint={voucher.isActive ? "emerald" : "red"}
            />
            <RingStat
              pct={voucher.isImmutable ? 100 : 0}
              label="Editable"
              caption={voucher.isImmutable ? "Locked" : "Open"}
              tint={voucher.isImmutable ? "amber" : "sky"}
            />
          </div>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
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
                  <div key={img?.url || img?.media?.url || i} className="relative aspect-video overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                    <img src={img?.url || img?.media?.url} alt={`${voucher.title} ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      #{img.sortOrder ?? i + 1}
                    </span>
                    {/* {img.provider && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-white">
                        {img.provider}
                      </span>
                    )} */}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Voucher Details
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <InfoRow icon={Hash} label="Voucher Code" value={voucher.voucherCode} />
                <InfoRow
                  icon={Layers3}
                  label="Version"
                  value={`${voucher.versionCode}`}
                />
                <InfoRow icon={UserRound} label="Created By" value={voucher.creator?.role || "—"} />
                <InfoRow icon={Layers} label="Category" value={`${voucher.category} · ${voucher.subCategory}`} />
                <InfoRow icon={Calendar} label="Created" value={voucher.createdAtDisplay} />
                <InfoRow icon={Clock} label="Last Updated" value={voucher.updatedAtDisplay} />
                {/* Only shown once the voucher has actually been published —
                    no fallback to createdAt, so a DRAFT never shows this. */}
                {voucher.publishedDate && (
                  <InfoRow icon={Calendar} label="Published" value={voucher.publishedDate} />
                )}
                <InfoRow icon={Calendar} label="Start Date" value={voucher.startDate} />
                <InfoRow icon={Calendar} label="End Date" value={voucher.endDate} />
                {/* <InfoRow icon={Store} label="Sub-Brands Attached" value={voucher.attachedSubBrandsCount ?? 0} />*/}
                <InfoRow
                  icon={Lock}
                  label="Immutable"
                  value={voucher.isImmutable ? "Yes — locked from further edits" : "No — still editable"}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${voucher.isActive
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
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
                      <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">
                        {voucher.categoryDetails.name}
                      </p>
                    </div>
                  </div>
                )}
                {voucher.subCategoryDetails && (
                  <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
                      <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">
                        {voucher.subCategoryDetails.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Offers — one color per offer (fixed order, never cycled per
                render) so it's easy to tell rows apart at a glance. */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="px-5 pt-5 pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                Offers ({voucher.offers?.length ?? 0})
              </p>
              {voucher.offers?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[12.5px]">
                    <thead className="text-[10.5px] uppercase tracking-wide text-neutral-400">
                      <tr>
                        <th className="px-5 py-2 font-medium">Offer</th>
                        <th className="px-3 py-2 font-medium">Discount</th>
                        <th className="px-3 py-2 font-medium">Min Bill</th>
                        <th className="px-3 py-2 font-medium">Max Discount</th>
                        <th className="px-3 py-2 font-medium">Usage</th>
                        <th className="px-3 py-2 font-medium">Applicable On</th>
                        <th className="px-5 py-2 text-right font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucher.offers.map((o, i) => {
                        const accent = ACCENT_STYLES[i % ACCENT_STYLES.length];
                        return (
                          <tr key={o._id} className="border-t border-neutral-100 dark:border-neutral-800">
                            <td className={`border-l-4 px-5 py-3 ${accent.left}`}>
                              <span className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
                                {o.title}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                              {o.discountType === "PERCENTAGE" ? `${o.discountValue}%` : `₹${o.discountValue}`}
                            </td>
                            <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">₹{o.minBillAmount}</td>
                            <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">₹{o.maxDiscountAmount}</td>
                            <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{o.usageType}</td>
                            <td className="px-3 py-3 text-neutral-600 dark:text-neutral-300">{o.discountApplicableOn}</td>
                            <td className="px-5 py-3 text-right">
                              {o.isActive ? (
                                <CheckCircle2 size={14} className="ml-auto text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle size={14} className="ml-auto text-neutral-400 dark:text-neutral-600" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 pb-5 text-[12.5px] text-neutral-500">No offers on this version.</p>
              )}
            </div>

            {/* Claims & Revenue */}
            {voucher.stats && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Claims & Revenue ({voucher.stats.currency || "INR"})
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <InfoRow icon={Users} label="Total Claims" value={voucher.stats.claims?.total ?? 0} />
                  <InfoRow icon={Clock} label="Pending" value={voucher.stats.claims?.pending ?? 0} />
                  <InfoRow icon={CheckCircle2} label="Paid" value={voucher.stats.claims?.paid ?? 0} />
                  <InfoRow icon={CheckCircle2} label="Redeemed" value={voucher.stats.claims?.redeemed ?? 0} />
                  <InfoRow icon={XCircle} label="Failed" value={voucher.stats.claims?.failed ?? 0} />
                  <InfoRow icon={XCircle} label="Cancelled" value={voucher.stats.claims?.cancelled ?? 0} />
                  <InfoRow icon={Clock} label="Expired" value={voucher.stats.claims?.expired ?? 0} />
                  <InfoRow icon={XCircle} label="Refunded" value={voucher.stats.claims?.refunded ?? 0} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <InfoRow icon={Coins} label="Bill Amount" value={`₹${voucher.stats.revenue?.billAmount ?? 0}`} />
                  <InfoRow icon={Coins} label="Customer Paid" value={`₹${voucher.stats.revenue?.customerPaid ?? 0}`} />
                  <InfoRow icon={Coins} label="Net Customer Paid" value={`₹${voucher.stats.revenue?.netCustomerPaid ?? 0}`} />
                  <InfoRow icon={Coins} label="Offer Discount" value={`₹${voucher.stats.revenue?.offerDiscount ?? 0}`} />
                  <InfoRow icon={Coins} label="Promo Discount" value={`₹${voucher.stats.revenue?.promoDiscount ?? 0}`} />
                  <InfoRow icon={Coins} label="Convenience Fee" value={`₹${voucher.stats.revenue?.convenienceFee ?? 0}`} />
                  <InfoRow icon={Coins} label="Tax" value={`₹${voucher.stats.revenue?.taxOnTop ?? 0}`} />
                  <InfoRow icon={Coins} label="Vendor Payable" value={`₹${voucher.stats.revenue?.vendorPayable ?? 0}`} />
                  <InfoRow icon={Coins} label="Commission" value={`₹${voucher.stats.revenue?.commission ?? 0}`} />
                  <InfoRow icon={Coins} label="Refunded" value={`₹${voucher.stats.revenue?.refunded ?? 0}`} />
                </div>
              </div>
            )}

            {/* History timeline */}
            {voucher.history?.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Approval History
                </p>
                <div>
                  {voucher.history.map((h, i) => {
                    const Icon = HISTORY_ICONS[h.action] || Clock;
                    const color = HISTORY_COLORS[h.action] || "text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700/40";
                    const isLast = i === voucher.history.length - 1;
                    return (
                      <div key={`${h.action}-${i}`} className={`relative flex gap-3 ${isLast ? "" : "pb-4"}`}>
                        {!isLast && <span className="absolute bottom-0 left-[11px] top-6 w-px bg-neutral-200 dark:bg-neutral-800" />}
                        <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${color}`}>
                          <Icon size={12} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                            <p className="text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-100">{h.action}</p>
                            <span className="text-[11px] text-neutral-500">{h.date}</span>
                          </div>
                          <p className="mt-0.5 text-[11.5px] text-neutral-500">
                            {h.by ? <>by <span className="font-medium text-neutral-700 dark:text-neutral-300">{h.by}</span></> : null}
                            {h.by && h.remarks ? " · " : null}
                            {h.remarks || (!h.by ? "—" : null)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* Right: Super Admin approval panel + brand + quick facts */}
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
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

            {/* Banner Approval — a separate gate from the version workflow
                above: the banner lives on the parent voucher and can be
                replaced independently of any version's own review cycle. */}
            {voucher.banner && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <div className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
                  <ImageIcon size={16} className="text-emerald-500 dark:text-emerald-400" /> Banner Approval
                </div>

                <table className="w-full text-left text-[12.5px]">
                  <tbody>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="w-28 py-2.5 align-top text-neutral-500">Current</td>
                      <td className="py-2.5">
                        {voucher.banner.current?.url ? (
                          <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                            <img src={voucher.banner.current.url} alt="Current banner" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-600">No live banner yet</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2.5 align-top text-neutral-500">Pending</td>
                      <td className="py-2.5">
                        {voucher.banner.pending?.url ? (
                          <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
                            <img src={voucher.banner.pending.url} alt="Pending banner" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-600">Nothing awaiting review</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800">
                      <td className="py-2.5 text-neutral-500">Status</td>
                      <td className="py-2.5 font-semibold text-neutral-800 dark:text-neutral-200">
                        {voucher.banner.status || "—"}
                      </td>
                    </tr>
                    {voucher.banner.rejectionReason && (
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="py-2.5 align-top text-neutral-500">Rejection Reason</td>
                        <td className="py-2.5 text-red-600 dark:text-red-400">{voucher.banner.rejectionReason}</td>
                      </tr>
                    )}
                    {(voucher.banner.reviewedBy || voucher.banner.reviewedAt) && (
                      <tr>
                        <td className="py-2.5 text-neutral-500">Reviewed</td>
                        <td className="py-2.5 text-neutral-700 dark:text-neutral-300">
                          {[voucher.banner.reviewedBy, voucher.banner.reviewedAt].filter(Boolean).join(" · ")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {voucher.banner.pending && (
                  <div className="mt-4 flex gap-2.5">
                    <button
                      onClick={onApproveBanner}
                      disabled={busy}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Approve Banner
                    </button>
                    <button
                      onClick={() => setShowBannerRejectBox(true)}
                      disabled={busy}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
                    >
                      <XCircle size={15} /> Reject Banner
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Brand */}
            {voucher.brand && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <InfoRow icon={BadgeCheck} label="Brand ID" value={voucher.brand.uniqueId} />
                  <InfoRow icon={Store} label="Merchant ID" value={voucher.brand.merchantId} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${voucher.brand.isApproved
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                      }`}
                  >
                    {voucher.brand.isApproved ? "Brand Approved" : "Brand Pending Approval"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${voucher.brand.isActive
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                      }`}
                  >
                    {voucher.brand.isActive ? "Brand Active" : "Brand Inactive"}
                  </span>
                </div>
              </div>
            )}

            {/* Attached Outlets */}
            {voucher.outlets?.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Attached Outlets ({voucher.outletCount})
                </p>
                <p className="mb-3 text-[11.5px] text-neutral-500">
                  {voucher.liveOutletCount} live of {voucher.totalBrandOutlets} total brand outlets
                  {voucher.isAppliedOnAllOutlets ? " · Applied on all outlets" : ""}
                </p>
                <div className="space-y-2">
                  {voucher.outlets.map((o) => (
                    <div key={o.id} className="rounded-xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-neutral-800 dark:text-neutral-100">{o.uniqueId}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${o.isActive
                              ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                            }`}
                        >
                          {o.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {o.outletType} · {o.storeId}
                      </p>
                      {o.address && <p className="mt-1 text-[11.5px] text-neutral-600 dark:text-neutral-400">{o.address}</p>}
                      {o.whatsappNumber && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                          <Phone size={10} /> {o.whatsappNumber}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version History — one color per version, same fixed order
                as the Offers table, so a specific version is recognizable
                at a glance between the two tables. */}
            {voucher.versions?.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Version History ({voucher.versionCount})
                </p>
                <table className="w-full text-left text-[12px]">
                  <thead className="text-[10.5px] uppercase tracking-wide text-neutral-400">
                    <tr>
                      <th className="py-1.5 pr-2 font-medium">Version</th>
                      <th className="py-1.5 pr-2 font-medium">Status</th>
                      <th className="py-1.5 pr-2 font-medium">Validity</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Claims</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voucher.versions.map((v, i) => {
                      const accent = ACCENT_STYLES[i % ACCENT_STYLES.length];
                      return (
                        <tr key={v.id} className="border-t border-neutral-100 dark:border-neutral-800">
                          <td className={`border-l-4 py-2 pl-2.5 pr-2 ${accent.left}`}>
                            <span className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
                              {v.versionCode}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <VoucherStatusBadge status={v.status} />
                          </td>
                          <td className="py-2 pr-2 text-neutral-500">
                            {v.startDate} → {v.endDate}
                          </td>
                          <td className="py-2 pr-2 text-right text-neutral-700 dark:text-neutral-300">{v.claimCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Parent voucher record */}
            {voucher.parentVoucher && (
              <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  Parent Voucher Record
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <InfoRow icon={Globe} label="Timezone" value={voucher.parentVoucher.timezone} />
                  <InfoRow icon={Layers3} label="Current Version" value={voucher.parentVoucher.currentVersionNumber} />
                  <InfoRow icon={ShieldCheck} label="Parent Status" value={voucher.parentVoucher.status} />
                  <InfoRow icon={Calendar} label="Created" value={voucher.parentVoucher.createdAtDisplay} />
                  <InfoRow icon={Clock} label="Last Updated" value={voucher.parentVoucher.updatedAtDisplay} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${voucher.parentVoucher.isActive
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
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
              <div className="flex items-center gap-2.5 rounded-2xl bg-neutral-50 px-4 py-6 text-[12px] text-neutral-500 dark:bg-neutral-950/60">
                <ImageIcon size={16} className="shrink-0" />
                No images uploaded for this voucher.
              </div>
            )}
          </div>
        </div>
      </div>

      {showRejectBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
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
                  className={`w-full resize-none rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${rejectError ? "ring-1 ring-red-500/60 focus:ring-red-500/60" : "focus:ring-red-400/60"
                    }`}
                />
                {rejectError && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} /> {rejectError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectBox(false);
                    setRejectError("");
                  }}
                  disabled={busy}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
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

      {showBannerRejectBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <XCircle size={17} />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Banner</h2>
                  <p className="mt-0.5 text-[12.5px] text-neutral-500">
                    Tell the vendor why the pending banner for{" "}
                    <span className="text-neutral-700 dark:text-neutral-300">{voucher.title}</span> is being rejected.
                    This reason is shown to the vendor.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBannerRejectBox(false);
                  setBannerRejectError("");
                }}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleBannerRejectSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                  Reason for rejection <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  value={bannerRejectReason}
                  onChange={(e) => {
                    setBannerRejectReason(e.target.value);
                    if (bannerRejectError) setBannerRejectError("");
                  }}
                  rows={3}
                  placeholder="e.g. Text card size par padha nahi ja raha."
                  disabled={busy}
                  className={`w-full resize-none rounded-xl bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${bannerRejectError ? "ring-1 ring-red-500/60 focus:ring-red-500/60" : "focus:ring-red-400/60"
                    }`}
                />
                {bannerRejectError && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} /> {bannerRejectError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBannerRejectBox(false);
                    setBannerRejectError("");
                  }}
                  disabled={busy}
                  className="rounded-xl bg-neutral-100 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
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
