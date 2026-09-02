import React, { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Tag,
  Calendar,
  Wallet,
  Building2,
  MessageSquareWarning,
  RotateCcw,
  Power,
  Clock,
} from "lucide-react";
import {
  computeCampaignStatus,
  CampaignStatusBadge,
  PlatformBadges,
  getAdAccountChecklist,
  isAdAccountComplete,
} from "./FeatureCampaign";

/* -------------------------------------------------------------------------
 * Reasons a Super Admin can pick from (or override) when rejecting a
 * campaign. Kept local to this file since only the review screen needs it.
 * ---------------------------------------------------------------------- */
const CAMPAIGN_REJECTION_REASONS = [
  "Ad account details incomplete",
  "Billing not verified",
  "Admin access not granted on ad account",
  "Budget doesn't match declared value",
  "Creative / description doesn't meet guidelines",
  "Duplicate campaign",
  "Other",
];

function SectionCard({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${className}`}>
      {title && (
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          {Icon && <Icon size={12} />}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[12.5px] text-neutral-500">{label}</span>
      <span className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{value || "—"}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Reject Reason Modal — mirrors the pattern used on the Brand approvals so
 * a rejection can never go out without a stated reason.
 * ---------------------------------------------------------------------- */
function RejectReasonModal({ campaign, onClose, onConfirm }) {
  const [reasonChoice, setReasonChoice] = useState(CAMPAIGN_REJECTION_REASONS[0]);
  const [note, setNote] = useState("");

  const finalReason =
    reasonChoice === "Other"
      ? note.trim()
      : note.trim()
      ? `${reasonChoice} — ${note.trim()}`
      : reasonChoice;

  const canSubmit = reasonChoice !== "Other" || note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Campaign</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              Tell {campaign.brandName} why <span className="text-neutral-700 dark:text-neutral-300">{campaign.title}</span>{" "}
              is being rejected. This reason is shown to the brand.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Reason</span>
            <select
              value={reasonChoice}
              onChange={(e) => setReasonChoice(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 outline-none focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            >
              {CAMPAIGN_REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              {reasonChoice === "Other" ? "Describe the reason" : "Additional note (optional)"}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add specific details to help the brand fix the issue..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 outline-none focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(finalReason)}
            className="rounded-xl bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Approve confirmation — only reachable when the ad account is complete;
 * lets the admin add an optional remark that gets logged to history.
 * ---------------------------------------------------------------------- */
function ApproveModal({ campaign, onClose, onConfirm }) {
  const [remarks, setRemarks] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Approve Campaign</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              <span className="text-neutral-700 dark:text-neutral-300">{campaign.title}</span> will go live on{" "}
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{campaign.platforms.join(" & ")}</span> once approved.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Remarks (optional)</span>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="e.g. Ad account verified, all details in order."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 outline-none focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(remarks.trim())}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            Confirm Approval
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Ad Account checklist card — this is the "sab details aa gaya hai na"
 * check. Each item can be toggled by the Super Admin while reviewing (for
 * campaigns not yet Approved); Approve stays disabled until every item is
 * checked off.
 * ---------------------------------------------------------------------- */
function AdAccountChecklistCard({ campaign, onToggleField }) {
  const checklist = getAdAccountChecklist(campaign.adAccount);
  const complete = isAdAccountComplete(campaign.adAccount);
  const editable = campaign.approvalStatus === "Pending";

  return (
    <SectionCard title="Ad Account Verification" icon={ShieldCheck}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex items-center gap-3">
          <InfoRow label="Account ID" value={campaign.adAccount?.accountId} />
        </div>
      </div>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
        <InfoRow label="Account Name" value={campaign.adAccount?.accountName} />
        <InfoRow label="Ad Platform" value={campaign.adAccount?.platform} />
      </div>

      <div className="mt-4 space-y-2">
        {checklist.map((item) => (
          <div
            key={item.key}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${
              item.done ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 bg-amber-400/5"
            }`}
          >
            <span className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
              {item.done ? (
                <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X size={13} className="text-amber-600 dark:text-amber-400" />
              )}
              {item.label}
            </span>
            {editable && (item.key === "accessGranted" || item.key === "billingVerified") && (
              <button
                onClick={() => onToggleField(item.key)}
                className="rounded-full border border-neutral-300 px-2.5 py-1 text-[10.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
              >
                Mark as {item.done ? "not done" : "done"}
              </button>
            )}
          </div>
        ))}
      </div>

      <div
        className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] font-medium ${
          complete ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
        }`}
      >
        {complete ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
        {complete
          ? "All ad account details are complete — ready for approval."
          : "Ad account details are incomplete — approval is blocked until every item above is checked off."}
      </div>
    </SectionCard>
  );
}

function HistoryTimeline({ history }) {
  if (!history?.length) return null;
  return (
    <SectionCard title="History" icon={Clock}>
      <div className="space-y-4">
        {[...history].reverse().map((h, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-600" />
              {i !== history.length - 1 && <span className="mt-1 w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />}
            </div>
            <div className="pb-1">
              <p className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">
                {h.action} <span className="font-normal text-neutral-500">by {h.by}</span>
              </p>
              <p className="mt-0.5 text-[11.5px] text-neutral-500">{h.date}</p>
              {h.remarks && <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">{h.remarks}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------
 * CampaignDetails — full review page
 *
 * Props:
 *  - campaign
 *  - onBack()
 *  - onApprove(remarks)
 *  - onReject(reason)
 *  - onReopen()
 *  - onToggleActive()
 *  - onToggleAdAccountField(field)
 *  - onEdit | null   (null when campaign is Approved — locked from editing)
 * ---------------------------------------------------------------------- */
export default function CampaignDetails({
  campaign,
  onBack,
  onApprove,
  onReject,
  onReopen,
  onToggleActive,
  onToggleAdAccountField,
  onEdit,
}) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const status = computeCampaignStatus(campaign);
  const complete = isAdAccountComplete(campaign.adAccount);
  const isPending = campaign.approvalStatus === "Pending";
  const isRejected = campaign.approvalStatus === "Rejected";
  const isApproved = campaign.approvalStatus === "Approved";

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <ArrowLeft size={13} />
            Back to Campaigns
          </button>

          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-emerald-400"
            >
              <Pencil size={13} />
              Edit Campaign
            </button>
          )}
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[19px] font-semibold text-neutral-900 dark:text-neutral-50">{campaign.title}</h1>
                <CampaignStatusBadge status={status} />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-neutral-500">
                <Building2 size={13} />
                {campaign.brandName}
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <Tag size={12} />
                {campaign.id}
              </p>
              <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-400">{campaign.description}</p>
            </div>
            <PlatformBadges campaign={campaign} />
          </div>

          {/* Quick stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-neutral-50 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950/60 dark:shadow-black/20">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Wallet size={13} />
              </span>
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">Budget</p>
              <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">
                ₹{campaign.budget.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950/60 dark:shadow-black/20">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Wallet size={13} />
              </span>
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">Spent</p>
              <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">
                ₹{(campaign.spentAmount || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950/60 dark:shadow-black/20">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Calendar size={13} />
              </span>
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">Start</p>
              <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{campaign.startDate}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950/60 dark:shadow-black/20">
              <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Calendar size={13} />
              </span>
              <p className="text-[10.5px] uppercase tracking-wide text-neutral-500">End</p>
              <p className="mt-0.5 text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100">{campaign.endDate}</p>
            </div>
          </div>
        </div>

        {/* Rejected banner */}
        {isRejected && campaign.rejectionReason && (
          <SectionCard className="mb-4 border border-red-500/30 bg-red-500/[0.04]">
            <div className="flex items-start gap-3">
              <MessageSquareWarning size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-red-600 dark:text-red-400">Campaign Rejected</p>
                <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">{campaign.rejectionReason}</p>
                <button
                  onClick={onReopen}
                  className="mt-3 flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/50 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-emerald-400"
                >
                  <RotateCcw size={12} />
                  Reopen for review
                </button>
              </div>
            </div>
          </SectionCard>
        )}

        <div className="space-y-4">
          {/* Ad account verification — the core "sab details aa gaya hai" check */}
          <AdAccountChecklistCard campaign={campaign} onToggleField={onToggleAdAccountField} />

          {/* Platform targeting */}
          <SectionCard title="Platform Targeting" icon={Smartphone}>
            <p className="mb-3 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              The brand requested ads on the platform(s) below. They only go live once this
              campaign is approved.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Android", "iOS"].map((platform) => {
                const requested = campaign.platforms?.includes(platform);
                const live = requested && isApproved && status !== "Inactive";
                return (
                  <div
                    key={platform}
                    className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 ${
                      !requested
                        ? "border-neutral-200 bg-neutral-50/60 text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-600"
                        : live
                        ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-600 dark:text-emerald-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
                    }`}
                  >
                    <Smartphone size={14} />
                    <div>
                      <p className="text-[13px] font-medium">{platform}</p>
                      <p className="text-[11px] opacity-80">
                        {!requested ? "Not requested" : live ? "Live now" : "Requested — awaiting approval"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <HistoryTimeline history={campaign.history} />
        </div>

        {/* Sticky-ish action bar */}
        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center justify-end gap-2.5 rounded-2xl bg-white/95 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur dark:bg-neutral-900/95 dark:shadow-black/20">
          {isPending && (
            <>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/30 px-4 py-2.5 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 dark:text-red-400"
              >
                <X size={14} />
                Reject
              </button>
              <button
                onClick={() => complete && setShowApproveModal(true)}
                disabled={!complete}
                title={!complete ? "Ad account details are incomplete" : "Approve campaign"}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                  complete
                    ? "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
                    : "cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                }`}
              >
                <Check size={14} />
                Approve
              </button>
            </>
          )}

          {isApproved && (
            <button
              onClick={onToggleActive}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-2.5 text-[13px] font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
            >
              <Power size={14} />
              {campaign.isActive ? "Pause Campaign" : "Resume Campaign"}
            </button>
          )}
        </div>
      </div>

      {showApproveModal && (
        <ApproveModal
          campaign={campaign}
          onClose={() => setShowApproveModal(false)}
          onConfirm={(remarks) => {
            onApprove(remarks);
            setShowApproveModal(false);
          }}
        />
      )}

      {showRejectModal && (
        <RejectReasonModal
          campaign={campaign}
          onClose={() => setShowRejectModal(false)}
          onConfirm={(reason) => {
            onReject(reason);
            setShowRejectModal(false);
          }}
        />
      )}
    </div>
  );
}