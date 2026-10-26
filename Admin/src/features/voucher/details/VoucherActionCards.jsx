import { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  UploadCloud,
  FileText,
  PauseCircle,
  Clock,
  Lock,
  Image as ImageIcon,
  Plus,
  RefreshCw,
} from "lucide-react";
import StatusStepButton from "../../../components/common/StatusStepButton";
import { VOUCHER_STATUSES } from "../services/VoucherApi";
import { BannerAddModal, BannerThumb, BannerReviewModal } from "../VoucherImageGallery";
import { DetailCard } from "./DetailsUI";
import { BANNER_STATUS_TONES, bannerStatusLabel } from "./detailsConstants";

/* Right-column action sections of the voucher details page. Every
 * condition and callback is the same as before the split — the parent
 * (VoucherDetails) still owns the reject reason boxes and all actions. */

// "View only · D voucher" notice for dummy vouchers.
export function ReadOnlyNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
      <Lock size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400" />
      <div>
        <p className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">View only · D voucher</p>
        <p className="mt-0.5 text-[12px] text-violet-700/80 dark:text-violet-300/80">
          Test / demo data — it can't be approved, published, paused, edited or deleted.
        </p>
      </div>
    </div>
  );
}

function Note({ tone, icon: Icon, children }) {
  const tones = {
    sky: "bg-sky-400/10 text-sky-700 dark:text-sky-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
    orange: "bg-orange-400/10 text-orange-700 dark:text-orange-300",
    neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-400",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-[12.5px] ${tones[tone]}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const primaryBtn =
  "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60";
const dangerBtn =
  "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/10 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400";

// Super Admin approval — what to do next for the voucher's status.
// (The parent hides this once PUBLISHED and for read-only vouchers.)
export function ApprovalPanel({ voucher, status, busy, onApprove, onPublish, onOpenReject }) {
  return (
    <DetailCard icon={ShieldCheck} tint="emerald" title="Super Admin approval">
      {status === VOUCHER_STATUSES.UNDER_REVIEW && (
        <div className="space-y-3">
          <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">This voucher is awaiting review before it can go live.</p>
          <div className="flex gap-2.5">
            <button onClick={onApprove} disabled={busy} className={primaryBtn}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Approve
            </button>
            <button onClick={onOpenReject} disabled={busy} className={dangerBtn}>
              <XCircle size={15} /> Reject
            </button>
          </div>
        </div>
      )}

      {status === VOUCHER_STATUSES.APPROVED && (
        <div className="space-y-3">
          <Note tone="sky" icon={CheckCircle2}>
            Approved — publish it to make this voucher live in the app.
          </Note>
          <button onClick={onPublish} disabled={busy} className={`${primaryBtn} w-full`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            Publish Voucher
          </button>
        </div>
      )}

      {status === VOUCHER_STATUSES.REJECTED && (
        <Note tone="red" icon={XCircle}>
          <p className="font-medium">Rejected</p>
          <p className="mt-0.5 opacity-80">{voucher.rejectionReason || "No reason recorded."}</p>
        </Note>
      )}

      {status === VOUCHER_STATUSES.DRAFT && (
        <Note tone="neutral" icon={FileText}>
          Still a draft — the vendor hasn't submitted it for review yet.
        </Note>
      )}

      {status === VOUCHER_STATUSES.PAUSED && (
        <Note tone="orange" icon={PauseCircle}>
          Paused — customers can't see this voucher. Resume it to put it back in the app as it was.
        </Note>
      )}

      {[VOUCHER_STATUSES.EXPIRED, VOUCHER_STATUSES.ARCHIVED].includes(status) && (
        <Note tone="neutral" icon={Clock}>
          This voucher is {status.toLowerCase()} and no longer actionable.
        </Note>
      )}
    </DetailCard>
  );
}

const replaceBtn =
  "flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-emerald-400";

function BannerRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-neutral-100 py-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:gap-3 dark:border-neutral-800">
      <span className="w-28 shrink-0 text-[12px] text-neutral-500">{label}</span>
      <div className="min-w-0 flex-1 text-[12.5px]">{children}</div>
    </div>
  );
}

// Banner — a separate approval gate on the parent voucher. Shown even with
// no banner yet, so the admin can add one.
export function BannerCard({ voucher, readOnly, busy, canReviewBanner, onUploadBanner, onApproveBanner, onRejectBanner, onOpenBannerReject }) {
  // Banner upload modal: null (closed) | "add" | "replace-current" | "replace-pending"
  const [bannerModal, setBannerModal] = useState(null);
  // Banner viewer / review: null (closed) | "current" | "pending"
  const [bannerView, setBannerView] = useState(null);
  const canUpload = onUploadBanner && !readOnly;

  return (
    <DetailCard
      icon={ImageIcon}
      tint="amber"
      title="Banner"
      right={
        canUpload && (
          <button
            onClick={() => setBannerModal("add")}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-[12px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={13} /> Add Banner
          </button>
        )
      }
    >
      <div>
        <BannerRow label="Current">
          {voucher.banner?.current?.url ? (
            <div className="flex flex-wrap items-center gap-3">
              <BannerThumb media={voucher.banner?.current} label="Current" onClick={() => setBannerView("current")} />
              {canUpload && (
                <button onClick={() => setBannerModal("replace-current")} className={replaceBtn}>
                  <RefreshCw size={12} /> Replace
                </button>
              )}
            </div>
          ) : (
            <span className="text-neutral-400 dark:text-neutral-600">No live banner yet</span>
          )}
        </BannerRow>
        <BannerRow label="Pending">
          {voucher.banner?.pending?.url ? (
            <div className="flex flex-wrap items-center gap-3">
              <BannerThumb media={voucher.banner?.pending} label="Pending" onClick={() => setBannerView("pending")} />
              {canUpload && (
                <button onClick={() => setBannerModal("replace-pending")} className={replaceBtn}>
                  <RefreshCw size={12} /> Replace
                </button>
              )}
            </div>
          ) : (
            <span className="text-neutral-400 dark:text-neutral-600">Nothing awaiting review</span>
          )}
        </BannerRow>
        <BannerRow label="Status">
          {/* Same status-pill pattern as vouchers: a banner waiting
              for review offers "Review", which opens the viewer. */}
          <StatusStepButton
            label={bannerStatusLabel(voucher.banner)}
            tone={BANNER_STATUS_TONES[voucher.banner?.status] || (voucher.banner?.current?.url ? "emerald" : "neutral")}
            stepLabel={canReviewBanner && voucher.banner?.pending?.url ? "Review" : null}
            onClick={() => setBannerView("pending")}
          />
        </BannerRow>
        {voucher.banner?.rejectionReason && (
          <BannerRow label="Rejection Reason">
            <span className="text-red-600 dark:text-red-400">{voucher.banner?.rejectionReason}</span>
          </BannerRow>
        )}
        {(voucher.banner?.reviewedBy || voucher.banner?.reviewedAt) && (
          <BannerRow label="Reviewed">
            <span className="text-neutral-700 dark:text-neutral-300">
              {[voucher.banner?.reviewedBy, voucher.banner?.reviewedAt].filter(Boolean).join(" · ")}
            </span>
          </BannerRow>
        )}
      </div>

      {voucher.banner?.pending && !readOnly && canReviewBanner && (
        <div className="mt-3 flex gap-2.5">
          <button onClick={onApproveBanner} disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Approve Banner
          </button>
          <button onClick={onOpenBannerReject} disabled={busy} className={dangerBtn}>
            <XCircle size={15} /> Reject Banner
          </button>
        </div>
      )}

      {bannerView && (
        <BannerReviewModal
          current={voucher.banner?.current}
          pending={voucher.banner?.pending}
          focus={bannerView}
          busy={busy}
          onApprove={readOnly || !canReviewBanner ? undefined : onApproveBanner}
          onReject={readOnly || !canReviewBanner ? undefined : onRejectBanner}
          onClose={() => setBannerView(null)}
        />
      )}

      {bannerModal && <BannerAddModal mode={bannerModal} onUpload={onUploadBanner} onClose={() => setBannerModal(null)} />}
    </DetailCard>
  );
}
