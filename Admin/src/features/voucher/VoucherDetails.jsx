import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { computeStatus } from "./voucherUtils";
import { VOUCHER_STATUSES } from "./services/VoucherApi";
import VoucherDetailsHeader from "./details/VoucherDetailsHeader";
import VoucherImagesCard from "./details/VoucherImagesCard";
import { VoucherInfoCard, ClaimsRevenueCard, ApprovalHistoryCard } from "./details/VoucherInfoCards";
import { ReadOnlyNotice, ApprovalPanel, BannerCard } from "./details/VoucherActionCards";
import { BrandCard, OutletsCard, ParentVoucherCard, QuickFactsCard } from "./details/VoucherMetaCards";
import { OffersCard, VersionsCard } from "./details/VoucherTables";
import RejectReasonModal from "./details/RejectReasonModal";

/* -------------------------------------------------------------------------
 * VoucherDetails
 * -------------------------------------------------------------------------
 * Read-only info for the voucher itself (category, offers, images, tags),
 * plus a Super-Admin approval panel whose contents change with the
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
 *
 * Each section lives in its own file under ./details/ (display only); this
 * file keeps all the state and decides which sections show.
 * ---------------------------------------------------------------------- */

export default function VoucherDetails({
  voucher,
  onBack,
  onApprove,
  onReject,
  onPublish,
  onApproveBanner,
  onRejectBanner,
  onReorderImages,
  onUploadBanner,
  onRequestStep,
  canReviewBanner = false,
  busy,
  actionError,
}) {
  // Dummy (isDummy) vouchers are view-only: no approve/reject/publish,
  // pause/resume, banner review/upload or image reorder.
  const readOnly = Boolean(voucher.isDummy);
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <VoucherDetailsHeader
        voucher={voucher}
        status={status}
        readOnly={readOnly}
        busy={busy}
        onBack={onBack}
        onRequestStep={onRequestStep}
      />

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {actionError}
        </div>
      )}

      {/* Offers first — the heart of a voucher — as a bento grid of
          coupon tiles, full width under the header. */}
      <div className="mb-4">
        <OffersCard offers={voucher.offers} />
      </div>

      {/* Two independent columns, bento cards (same look as the brand
          Overview tab). Each column stacks its own cards top to bottom, so
          no card is ever stretched or left half-empty:
            main (8)  — the voucher itself: images, details,
                        claims & revenue, approval history
            side (4)  — status & records: at a glance, approval, brand,
                        banner, outlets, parent record
          Offers sit full width above the columns; the Version history
          table full width at the very bottom. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* ---- Main column ---- */}
        <div className="min-w-0 space-y-4 lg:col-span-8">
          <VoucherImagesCard
            images={voucher.images || []}
            title={voucher.title}
            onReorder={readOnly ? undefined : onReorderImages}
            // Backend only reorders DRAFT / REJECTED versions (API doc #57d) —
            // a published/approved version's images are part of what was approved.
            lockedReason={
              [VOUCHER_STATUSES.DRAFT, VOUCHER_STATUSES.REJECTED].includes(voucher.approvalStatus)
                ? null
                : "order can only be changed on a Draft or Rejected version (create a new version to reorder)"
            }
          />
          <VoucherInfoCard voucher={voucher} />
          {voucher.stats && <ClaimsRevenueCard stats={voucher.stats} />}
          {voucher.history?.length > 0 && <ApprovalHistoryCard history={voucher.history} />}
        </div>

        {/* ---- Side column ---- */}
        <div className="min-w-0 space-y-4 lg:col-span-4">
          <QuickFactsCard voucher={voucher} status={status} />
          {readOnly && <ReadOnlyNotice />}
          {/* Hidden once the voucher is live (PUBLISHED) — there's nothing left
              to approve; for every other status it holds the actions / info. */}
          {status !== VOUCHER_STATUSES.PUBLISHED && !readOnly && (
            <ApprovalPanel
              voucher={voucher}
              status={status}
              busy={busy}
              onApprove={onApprove}
              onPublish={onPublish}
              onOpenReject={() => setShowRejectBox(true)}
            />
          )}
          {voucher.brand && <BrandCard brand={voucher.brand} />}
          <BannerCard
            voucher={voucher}
            readOnly={readOnly}
            busy={busy}
            canReviewBanner={canReviewBanner}
            onUploadBanner={onUploadBanner}
            onApproveBanner={onApproveBanner}
            onRejectBanner={onRejectBanner}
            onOpenBannerReject={() => setShowBannerRejectBox(true)}
          />
          {voucher.outlets?.length > 0 && <OutletsCard voucher={voucher} />}
          {voucher.parentVoucher && <ParentVoucherCard parentVoucher={voucher.parentVoucher} />}
        </div>
      </div>

      {/* Version history table — full width at the very bottom. */}
      {voucher.versions?.length > 0 && (
        <div className="mt-4">
          <VersionsCard versions={voucher.versions} versionCount={voucher.versionCount} viewingId={voucher.id} />
        </div>
      )}

      {showRejectBox && (
        <RejectReasonModal
          title="Reject Voucher"
          subject={voucher.title}
          value={rejectReason}
          onChange={(text) => {
            setRejectReason(text);
            if (rejectError) setRejectError("");
          }}
          error={rejectError}
          placeholder="e.g. Discount exceeds category cap. Please revise."
          busy={busy}
          onCancel={() => {
            setShowRejectBox(false);
            setRejectError("");
          }}
          onSubmit={handleRejectSubmit}
        >
          Tell the vendor why
        </RejectReasonModal>
      )}

      {showBannerRejectBox && (
        <RejectReasonModal
          title="Reject Banner"
          subject={voucher.title}
          value={bannerRejectReason}
          onChange={(text) => {
            setBannerRejectReason(text);
            if (bannerRejectError) setBannerRejectError("");
          }}
          error={bannerRejectError}
          placeholder="e.g. Text card size par padha nahi ja raha."
          busy={busy}
          onCancel={() => {
            setShowBannerRejectBox(false);
            setBannerRejectError("");
          }}
          onSubmit={handleBannerRejectSubmit}
        >
          Tell the vendor why the pending banner for
        </RejectReasonModal>
      )}
    </div>
  );
}
