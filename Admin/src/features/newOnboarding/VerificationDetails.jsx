import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Store,
  Phone,
  Mail,
  Hash,
  AlertTriangle,
  Clock,
  FileText,
  RotateCcw,
  BadgeCheck,
  Loader2,
  CreditCard,
  Receipt,
  Tag,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import { BrandAvatar, StatusBadge, SectionCard, EmptyState, ToggleSwitch, StatChip, RingStat } from "../brand/BrandShared";
import { REJECTION_REASONS } from "../brand/data/BrandData";
import { getBrandDetails } from "../brand/services/brandApi";
import { mapBrandDetail } from "../brand/brandMapper";
import { getVouchers } from "../voucher/services/VoucherApi";
import { getVerificationHistory } from "./services/NewOnboardingApi";
import { isNotFoundMessage } from "../../utils/helpers";

const STATUS_LABELS = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  MANUAL_REVIEW: "Manual Review",
};

const STATUS_ACCENTS = {
  APPROVED: "from-emerald-400/40 via-emerald-400/5",
  REJECTED: "from-red-400/40 via-red-400/5",
  REVOKED: "from-orange-400/40 via-orange-400/5",
  MANUAL_REVIEW: "from-amber-400/40 via-amber-400/5",
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function scoreColor(score) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// Local bento-tile variant of BrandShared's InfoRow. Not reusing InfoRow
// itself here since it's shared across other layouts that still want the
// plain divider-row look.
function DetailTile({ icon: Icon, label, value }) {
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

// Every automated check the backend ran for this attempt — the duplicate
// flags are inverted (a duplicate = bad), so "ok" always means "good".
function buildChecklist(flags = {}) {
  return [
    { label: "PAN Verified", ok: Boolean(flags.panVerified) },
    { label: "GST Verified", ok: Boolean(flags.gstVerified) },
    { label: "Bank Verified", ok: Boolean(flags.bankVerified) },
    { label: "PAN Matched With GST", ok: Boolean(flags.panMatchedWithGST) },
    { label: "PAN Matched With Brand", ok: Boolean(flags.panMatchedWithBrand) },
    { label: "GST Matched With Brand", ok: Boolean(flags.gstMatchedWithBrand) },
    { label: "Bank Name Matched", ok: Boolean(flags.bankMatched) },
    { label: "Business Entity Matched", ok: Boolean(flags.businessEntityMatched) },
    { label: "GST Active", ok: Boolean(flags.gstActive) },
    { label: "No Duplicate PAN", ok: !flags.duplicatePAN },
    { label: "No Duplicate GST", ok: !flags.duplicateGST },
    { label: "No Duplicate Bank", ok: !flags.duplicateBank },
    { label: "No Duplicate WhatsApp", ok: !flags.duplicateWhatsapp },
    { label: "No Duplicate Email", ok: !flags.duplicateEmail },
  ];
}

// "APPROVAL_ACKNOWLEDGED" -> "Approval Acknowledged"
function formatAction(action) {
  if (!action) return "—";
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function colorForActor(performedByType = "") {
  if (performedByType === "ADMIN") return "text-sky-600 bg-sky-400/10 dark:text-sky-400";
  if (performedByType === "VENDOR") return "text-amber-600 bg-amber-400/10 dark:text-amber-400";
  if (performedByType === "SYSTEM")
    return "text-neutral-500 bg-neutral-200 dark:text-neutral-400 dark:bg-neutral-700/40";
  return "text-neutral-500 bg-neutral-200 dark:text-neutral-400 dark:bg-neutral-700/40";
}

// Flattens an audit-trail entry's `metadata` into a short human-readable line.
function summarizeMetadata(entry) {
  if (entry.reason) return entry.reason;
  const meta = entry.metadata;
  if (!meta || typeof meta !== "object") return null;
  const parts = [];
  if (meta.previousScreen || meta.newScreen) {
    parts.push(`${meta.previousScreen || "—"} → ${meta.newScreen || "—"}`);
  }
  return parts.length ? parts.join(", ") : null;
}

function ScoreRing({ label, value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const radius = 24;
  const dash = 2 * Math.PI * radius;
  const ringColor = pct >= 80 ? "stroke-emerald-400" : pct >= 50 ? "stroke-amber-400" : "stroke-red-400";

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} className="fill-none stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`fill-none transition-[stroke-dashoffset] duration-700 ease-out ${ringColor}`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={dash}
            strokeDashoffset={dash * (1 - pct / 100)}
          />
        </svg>
        <span className={`text-[13px] font-bold ${scoreColor(value)}`}>{value ?? 0}%</span>
      </div>
      <p className="text-center text-[11px] leading-tight text-neutral-500">{label}</p>
    </div>
  );
}

// Per-action visual identity + plain-English copy, matched to the real
// action strings the audit-trail API sends.
const ACTION_META = {
  APPROVED: {
    icon: CheckCircle2,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    title: "Verification approved",
    desc: "All verification checks passed successfully.",
  },
  REJECTED: {
    icon: XCircle,
    tint: "bg-red-500/10 text-red-600 dark:text-red-400",
    title: "Verification rejected",
    desc: "The verification did not pass and was rejected.",
  },
  REVOKED: {
    icon: XCircle,
    tint: "bg-red-500/10 text-red-600 dark:text-red-400",
    title: "Verification revoked",
    desc: "A previously approved verification was revoked.",
  },
  RESUBMITTED: {
    icon: RotateCcw,
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    title: "Verification resubmitted",
    desc: "Vendor has updated the details and resubmitted for review.",
  },
  REMEDIATION_UPDATED: {
    icon: FileText,
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    title: "Details updated",
    desc: "Vendor updated their submitted details.",
  },
  SYSTEM_VERIFIED: {
    icon: ShieldCheck,
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    title: "Verification submitted",
    desc: "Vendor has submitted the verification details.",
  },
  REVIEWED: {
    icon: BadgeCheck,
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    title: "Marked as reviewed",
    desc: "Admin marked this verification as reviewed.",
  },
  UNREVIEWED: {
    icon: BadgeCheck,
    tint: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
    title: "Marked as unreviewed",
    desc: "Admin cleared the reviewed flag.",
  },
};
const DEFAULT_ACTION_META = {
  icon: ShieldCheck,
  tint: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
  title: null,
  desc: null,
};

function reasonBoxClass(action = "") {
  if (action.includes("REJECT") || action.includes("REVOK")) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400";
  }
  if (action.includes("APPROV")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400";
  }
  return "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300";
}

// One node in the real audit-trail history — a connected timeline (dot +
// line down the left), colored and captioned per action type, with the
// reason (if any) always visible and a "View Details" toggle for the rest.
function TimelineEntry({ entry, isLast }) {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[entry.action] || DEFAULT_ACTION_META;
  const Icon = meta.icon;
  const title = meta.title || formatAction(entry.action);
  const desc = meta.desc || summarizeMetadata(entry);
  const performedBy =
    entry.performedByUser?.name ||
    entry.performedByUser?.uniqueId ||
    (entry.performedByType === "SYSTEM" ? "System" : entry.performedByType) ||
    "—";

  return (
    <div className={`relative flex gap-3 ${isLast ? "" : "pb-5"}`}>
      {!isLast && <span className="absolute bottom-0 left-[13px] top-7 w-px bg-neutral-200 dark:bg-neutral-800" />}

      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${meta.tint}`}>
        <Icon size={13} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
              <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${colorForActor(entry.performedByType)}`}>
                {entry.action}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              by <span className="font-medium text-neutral-700 dark:text-neutral-300">{performedBy}</span> ·{" "}
              {formatDateTime(entry.createdAt)}
            </p>
            {desc && !entry.reason && (
              <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-400">{desc}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            View Details
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {entry.reason && (
          <div className={`mt-2 rounded-xl border px-3 py-2 ${reasonBoxClass(entry.action)}`}>
            <p className="text-[11.5px] font-semibold">Reason</p>
            <p className="mt-0.5 text-[12px] leading-relaxed opacity-90">{entry.reason}</p>
          </div>
        )}

        {open && (entry.previousStatus || entry.newStatus) && (
          <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-[12px] text-neutral-600 dark:text-neutral-400">
              Status: {entry.previousStatus || "—"} → {entry.newStatus || "—"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerificationDetails({
  verification,
  onBack,
  onApprove,
  onReject,
  onMarkReviewed,
  onForceReviewed,
  onRevoke,
  busyAction,
  actionError,
}) {
  const { brand, flags, nameMatch, bankNameMatch, entityMatch, duplicateDetails } = verification;
  const checklist = buildChecklist(flags);
  const statusLabel = STATUS_LABELS[verification.derivedStatus] || verification.derivedStatus;
  const accent = STATUS_ACCENTS[verification.derivedStatus] || "from-neutral-500/20 via-neutral-500/0";
  const checksPassedPct = checklist.length ? (checklist.filter((c) => c.ok).length / checklist.length) * 100 : 0;

  const [approveNote, setApproveNote] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReasonChoice, setRejectReasonChoice] = useState(REJECTION_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeBox, setShowRevokeBox] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  const canReview = verification.derivedStatus === "MANUAL_REVIEW" || verification.derivedStatus === "REJECTED";
  const canRevoke = verification.derivedStatus === "APPROVED";

  // Per-action busy flags — only the button actually clicked spins, but
  // every action button is disabled while any one request is in flight so
  // the same record can't take two conflicting actions at once.
  const anyBusy = Boolean(busyAction);
  const approveBusy = busyAction === "approve";
  const rejectBusy = busyAction === "reject";
  const reviewedBusy = busyAction === "reviewed";
  const forceOnBusy = busyAction === "force-on";
  const forceOffBusy = busyAction === "force-off";
  const revokeBusy = busyAction === "revoke";

  // Real audit trail — GET /brands/verifications/history?brandId=...
  const brandId = verification.brandId || brand?.id;
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // The brand's full history can span several past attempts — only show
  // the ones belonging to this attempt (the "parent" being reviewed here),
  // not every attempt's events mixed together.
  const currentAttemptHistory = history.filter((h) => h.systemVerifyId === verification.id);

  const fetchHistory = useCallback(async () => {
    if (!brandId) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await getVerificationHistory({ brandId, page: historyPage, limit: 20 });
      const payload = res?.data ?? {};
      setHistory(payload.data ?? []);
      setHistoryTotalPages(payload.totalPages ?? 1);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [brandId, historyPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Plan / Subscription snapshot — GET /brands/get?brandId=... (same
  // fully-populated payload the Brand folder's detail page uses).
  const [brandDetail, setBrandDetail] = useState(null);
  const [brandDetailLoading, setBrandDetailLoading] = useState(true);
  const [brandDetailError, setBrandDetailError] = useState("");

  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    (async () => {
      setBrandDetailLoading(true);
      setBrandDetailError("");
      try {
        const res = await getBrandDetails(brandId);
        if (!cancelled) setBrandDetail(mapBrandDetail(res?.data || res));
      } catch (err) {
        if (!cancelled) setBrandDetailError(err.message);
      } finally {
        if (!cancelled) setBrandDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);


  // Listing data — the vouchers this brand has created, GET
  // /vouchers/versions/get-all?brandId=...
  const [vouchers, setVouchers] = useState([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [vouchersError, setVouchersError] = useState("");

  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    (async () => {
      setVouchersLoading(true);
      setVouchersError("");
      try {
        const res = await getVouchers({ brandId, page: 1, limit: 20 });
        if (!cancelled) setVouchers(res?.data?.data ?? []);
      } catch (err) {
        // The backend throws a "not found"-style message (e.g. "No any
        // voucherversion found") when a brand simply has zero vouchers yet
        // — that's a normal empty state, not a real failure, so don't show
        // it as an error.
        if (!cancelled) {
          if (isNotFoundMessage(err.message)) setVouchers([]);
          else setVouchersError(err.message);
        }
      } finally {
        if (!cancelled) setVouchersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    onApprove(approveNote.trim());
    setApproveNote("");
    setShowApproveBox(false);
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (rejectReasonChoice === "Other" && !rejectNote.trim()) {
      setRejectError("Describe the reason so the vendor knows what to fix.");
      return;
    }
    const finalReason =
      rejectReasonChoice === "Other"
        ? rejectNote.trim()
        : rejectNote.trim()
        ? `${rejectReasonChoice} — ${rejectNote.trim()}`
        : rejectReasonChoice;
    onReject(finalReason);
    setRejectReasonChoice(REJECTION_REASONS[0]);
    setRejectNote("");
    setShowRejectBox(false);
    setRejectError("");
  };

  const handleRevokeSubmit = (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) {
      setRevokeError("A reason is required so there's a record of why approval was revoked.");
      return;
    }
    onRevoke(revokeReason.trim());
    setRevokeReason("");
    setShowRevokeBox(false);
    setRevokeError("");
  };

  const duplicateGroups = [
    { label: "PAN", ids: duplicateDetails?.panBrandIds },
    { label: "GST", ids: duplicateDetails?.gstBrandIds },
    { label: "Bank", ids: duplicateDetails?.bankBrandIds },
    { label: "WhatsApp", ids: duplicateDetails?.whatsappBrandIds },
    { label: "Email", ids: duplicateDetails?.emailBrandIds },
  ].filter((g) => g.ids?.length);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Back */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <button
            onClick={onBack}
            aria-label="Back to onboarding"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <RingStat
              pct={verification.score ?? 0}
              label="Verification Score"
              caption={`Attempt #${verification.attemptNumber}`}
              tint={verification.score >= 80 ? "emerald" : verification.score >= 50 ? "amber" : "red"}
            />
            <RingStat
              pct={checksPassedPct}
              label="Checks Passed"
              caption={`${checklist.filter((c) => c.ok).length}/${checklist.length}`}
              tint="sky"
            />
          </div>
        </div>

        {/* Header card */}
        <div className="relative mb-5 overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent} opacity-90`} />

          <div className="relative flex flex-wrap items-start gap-4 p-6">
            <div className="rounded-2xl shadow-sm ring-4 ring-neutral-50 dark:ring-neutral-950">
              <BrandAvatar brand={brand} size="xl" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                  {brand.brandName}
                </h1>
                <StatusBadge status={statusLabel} activeLabel="Approved" />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-neutral-500">
                <Hash size={11} /> {brand.uniqueId} · {brand.legalBusinessName}
              </p>
            </div>
          </div>

          {/* Quick-glance stat strip */}
          <div className="relative flex flex-wrap items-center gap-2 border-t border-neutral-200/80 px-6 py-3 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-2.5 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
              <span className={`text-[15px] font-bold ${scoreColor(verification.score)}`}>{verification.score}</span>
              <span className="text-[10px] text-neutral-500">/100</span>
            </div>
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Attempt #{verification.attemptNumber}
            </span>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

            {/* Reviewed toggle — Case D: { action: "REVIEWED" }, plain flip,
                no explicit direction. */}
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-3 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
              <BadgeCheck size={13} className={verification.isReviewed ? "text-sky-600 dark:text-sky-400" : "text-neutral-500"} />
              <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Reviewed</span>
              {reviewedBusy && <Loader2 size={11} className="animate-spin text-neutral-500" />}
              <ToggleSwitch checked={Boolean(verification.isReviewed)} onChange={anyBusy ? undefined : onMarkReviewed} />
            </div>

            {/* Force reviewed flag — Case D2: { action: "REVIEWED", isReviewed }.
                Explicit override in either direction, independent of the
                toggle above. */}
            <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-neutral-50/60 px-2.5 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
              <span className="text-[11px] font-medium text-neutral-500">Force</span>
              <button
                onClick={() => onForceReviewed(true)}
                disabled={anyBusy}
                title="Force isReviewed = true"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400"
              >
                {forceOnBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              </button>
              <button
                onClick={() => onForceReviewed(false)}
                disabled={anyBusy}
                title="Force isReviewed = false"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-700/40"
              >
                {forceOffBusy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              </button>
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
          {/* Left */}
          <div className="min-w-0 space-y-4">
            {/* Verification checklist */}
            <SectionCard title="Verification Checklist">
              {checklist.length ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {checklist.map((c) => (
                    <div
                      key={c.label}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] ${
                        c.ok
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                          : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5"
                      }`}
                    >
                      <span className="text-neutral-700 dark:text-neutral-300">{c.label}</span>
                      {c.ok ? (
                        <span className="flex shrink-0 items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} /> Pass
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                          <XCircle size={13} /> Fail
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No checks recorded." />
              )}
            </SectionCard>

            {/* Listing Data — vouchers this brand has created, GET
                /vouchers/versions/get-all?brandId=... */}
            <SectionCard title="Listing Data" icon={Tag}>
              {vouchersLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-neutral-500">
                  <Loader2 size={14} className="animate-spin" /> Loading listings…
                </div>
              ) : vouchersError ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0" /> Failed to load listings: {vouchersError}
                </div>
              ) : vouchers.length ? (
                <div className="space-y-2">
                  {vouchers.map((v) => (
                    <div
                      key={v._id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 transition-colors hover:bg-neutral-100 dark:bg-neutral-950/60 dark:hover:bg-neutral-900"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                          <Tag size={13} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{v.name}</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500">{v.versionCode || "—"}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {v.status ? v.status.replace(/_/g, " ") : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No vouchers created by this brand yet." />
              )}
            </SectionCard>

            <SectionCard title="Business Entity Match" icon={Store}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                  <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
                      <Store size={13} />
                    </span>
                    GST Constitution
                  </span>
                  <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{entityMatch?.gstConstitution || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                  <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
                      <Store size={13} />
                    </span>
                    Brand Entity Type
                  </span>
                  <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{entityMatch?.brandEntityType || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                  <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        entityMatch?.matched ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-400/10 text-red-500 dark:text-red-400"
                      }`}
                    >
                      {entityMatch?.matched ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    </span>
                    Matched
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      entityMatch?.matched
                        ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-400/10 text-red-500 dark:text-red-400"
                    }`}
                  >
                    {entityMatch?.matched ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Duplicate details */}
            <SectionCard title="Duplicate Detection">
              {duplicateGroups.length ? (
                <div className="space-y-2.5">
                  {duplicateGroups.map((g) => (
                    <div key={g.label} className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                      <p className="mb-1 text-[11.5px] font-semibold text-red-700 dark:text-red-300">Duplicate {g.label}</p>
                      <p className="text-[11.5px] text-red-700/80 dark:text-red-300/80">{g.ids.join(", ")}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> No duplicates found across PAN, GST, bank, WhatsApp or email.
                </p>
              )}
            </SectionCard>

            {/* Remarks */}
            {verification.remarks?.length > 0 && (
              <SectionCard title="Remarks">
                <ul className="space-y-2">
                  {verification.remarks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-amber-700 dark:text-amber-300">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* Review Timeline — the real audit trail, GET
                /brands/verifications/history?brandId=..., so dates always
                match what actually happened (not a client-side guess).
                Each entry is collapsed by default — click to expand. */}
            <SectionCard title="Review Timeline">
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-neutral-500">
                  <Loader2 size={14} className="animate-spin" /> Loading timeline…
                </div>
              ) : historyError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0" /> Failed to load timeline: {historyError}
                </div>
              ) : currentAttemptHistory.length ? (
                <>
                  <div className="px-1">
                    {currentAttemptHistory.map((h, i) => (
                      <TimelineEntry key={h._id} entry={h} isLast={i === currentAttemptHistory.length - 1} />
                    ))}
                  </div>
                  {historyTotalPages > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                      >
                        Prev
                      </button>
                      <span className="text-[12px] text-neutral-500">
                        Page {historyPage} of {historyTotalPages}
                      </span>
                      <button
                        onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                        disabled={historyPage === historyTotalPages}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState label="No timeline events recorded yet." />
              )}
            </SectionCard>
          </div>

          {/* Right */}
          <div className="min-w-0 space-y-4">
            {/* Verification status + admin review actions */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <div className="mb-4 flex items-center gap-1.5 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" /> Verification Status
              </div>

              {verification.derivedStatus === "APPROVED" && (
                <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-emerald-400/10 p-3.5">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[12.5px] text-emerald-700 dark:text-emerald-300">This brand has been approved by admin.</p>
                </div>
              )}
              {verification.derivedStatus === "REJECTED" && (
                <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5">
                  <XCircle size={16} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-[12.5px] font-medium text-red-700 dark:text-red-300">Rejected</p>
                    <p className="mt-0.5 text-[12.5px] text-red-700/80 dark:text-red-300/80">
                      {verification.rejectionReason || "No reason recorded."}
                    </p>
                  </div>
                </div>
              )}
              {verification.derivedStatus === "REVOKED" && (
                <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-orange-400/10 p-3.5">
                  <RotateCcw size={16} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-[12.5px] font-medium text-orange-700 dark:text-orange-300">Revoked</p>
                    <p className="mt-0.5 text-[12.5px] text-orange-700/80 dark:text-orange-300/80">
                      {verification.revokeReason || "No reason recorded."}
                    </p>
                  </div>
                </div>
              )}
              {verification.derivedStatus === "MANUAL_REVIEW" && (
                <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-amber-400/10 p-3.5">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-[12.5px] text-amber-700 dark:text-amber-300">
                    Flagged for manual review — awaiting an admin decision.
                  </p>
                </div>
              )}

              {/* Approve / Reject — available while pending review, and as a
                  manual override on a previously rejected verification. */}
              {canReview && !showApproveBox && (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowApproveBox(true)}
                    disabled={anyBusy}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {approveBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectBox(true)}
                    disabled={anyBusy}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}

              {canReview && showApproveBox && (
                <form onSubmit={handleApproveSubmit} className="space-y-3">
                  <label className="mb-1.5 block text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                    Note <span className="text-neutral-500">(optional — e.g. manual override reason)</span>
                  </label>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Bank passbook manually verified over call"
                    disabled={anyBusy}
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                  />
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowApproveBox(false);
                        setApproveNote("");
                      }}
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {approveBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Confirm Approve
                    </button>
                  </div>
                </form>
              )}

              {/* Revoke Approval — available on an approved verification,
                  backed by Case E: { action: "REVOKED", revokeReason }. */}
              {canRevoke && !showRevokeBox && (
                <button
                  onClick={() => setShowRevokeBox(true)}
                  disabled={anyBusy}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-orange-400/40 text-[13px] font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-orange-400"
                >
                  <RotateCcw size={15} /> Revoke Approval
                </button>
              )}

              {canRevoke && showRevokeBox && (
                <form onSubmit={handleRevokeSubmit} className="space-y-3">
                  <label className="mb-1.5 block text-[12px] font-medium text-orange-600 dark:text-orange-400">
                    Reason for revoking approval <span className="text-neutral-500">(required)</span>
                  </label>
                  <textarea
                    value={revokeReason}
                    onChange={(e) => {
                      setRevokeReason(e.target.value);
                      if (revokeError) setRevokeError("");
                    }}
                    rows={3}
                    placeholder="e.g. GST was cancelled by the department after approval. Brand suspended pending fresh documents."
                    disabled={anyBusy}
                    className={`w-full resize-none rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                      revokeError
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                        : "border-neutral-200 focus:border-orange-400/60 focus:ring-orange-400/60 dark:border-neutral-800"
                    }`}
                  />
                  {revokeError && (
                    <p className="flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                      <AlertTriangle size={11} /> {revokeError}
                    </p>
                  )}
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRevokeBox(false);
                        setRevokeError("");
                      }}
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revokeBusy ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                      Confirm Revoke
                    </button>
                  </div>
                </form>
              )}

            </div>

            {/* Plan Details — GET /brands/get?brandId=... */}
            <SectionCard title="Plan Details">
              {brandDetailLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-neutral-500">
                  <Loader2 size={14} className="animate-spin" /> Loading plan…
                </div>
              ) : brandDetailError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0" /> Failed to load plan: {brandDetailError}
                </div>
              ) : brandDetail ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <StatChip icon={BadgeCheck} label="Plan" value={brandDetail.subscriptionPlan} tint="emerald" />
                  <StatChip icon={CreditCard} label="Price" value={brandDetail.planPrice} tint="violet" />
                  <StatChip icon={Tag} label="Type" value={brandDetail.planType} tint="sky" />
                  <StatChip icon={Clock} label="Term" value={brandDetail.subscriptionTerm} tint="amber" />
                  <StatChip icon={Calendar} label="Expiry" value={`${brandDetail.expiredInDays}d left`} tint="emerald" />
                </div>
              ) : (
                <EmptyState label="No plan data available." />
              )}
            </SectionCard>

            {/* Subscribe Details — brandDetail.subscriptionDetail, same
                fully-populated `subscribed` record the Brand folder shows. */}
            <SectionCard title="Subscribe Details" icon={CreditCard}>
              {brandDetailLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-[12.5px] text-neutral-500">
                  <Loader2 size={14} className="animate-spin" /> Loading subscription…
                </div>
              ) : brandDetailError ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0" /> Failed to load subscription: {brandDetailError}
                </div>
              ) : brandDetail?.subscriptionDetail ? (
                <>
                  {/* Payment summary — gradient card, matching the reference's transaction card */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 text-white">
                    <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                    <div className="relative flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10.5px] font-medium text-emerald-100">Paid Amount</p>
                        <p className="mt-0.5 text-[18px] font-bold leading-tight">
                          ₹{Number(brandDetail.subscriptionDetail.paidAmount).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10.5px] font-medium text-emerald-100">Due Amount</p>
                        <p className="mt-0.5 text-[18px] font-bold leading-tight">
                          ₹{Number(brandDetail.subscriptionDetail.dueAmount).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="relative mt-4 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          brandDetail.subscriptionDetail.isActive ? "bg-white/20 text-white" : "bg-white/10 text-emerald-100"
                        }`}
                      >
                        {brandDetail.subscriptionDetail.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                        {brandDetail.subscriptionDetail.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                      <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-600 dark:text-violet-400">
                          <Receipt size={13} />
                        </span>
                        Subscription ID
                      </span>
                      <span className="font-mono text-[11.5px] tracking-tight text-neutral-800 dark:text-neutral-200">
                        {brandDetail.subscriptionDetail.subscriptionId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                      <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-violet-600 dark:text-violet-400">
                          <Receipt size={13} />
                        </span>
                        Transaction ID
                      </span>
                      <span className="font-mono text-[11.5px] tracking-tight text-neutral-800 dark:text-neutral-200">
                        {brandDetail.subscriptionDetail.transactionId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                      <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
                          <Calendar size={13} />
                        </span>
                        Start Date
                      </span>
                      <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{brandDetail.subscriptionDetail.startDateDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
                      <span className="flex items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
                          <Calendar size={13} />
                        </span>
                        End Date
                      </span>
                      <span className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{brandDetail.subscriptionDetail.endDateDisplay}</span>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState label="No subscription record for this brand yet." />
              )}
            </SectionCard>

            {/* Brand */}
            <SectionCard title="Brand">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <DetailTile icon={Hash} label="Merchant ID" value={brand.merchantId || "—"} />
                <DetailTile icon={Phone} label="Mobile" value={brand.mobile || "—"} />
                <DetailTile icon={Phone} label="WhatsApp" value={brand.whatsappNumber || "—"} />
                <DetailTile icon={Mail} label="Email" value={brand.email || "—"} />
                <DetailTile icon={Store} label="Entity Type" value={brand.businessEntityType || "—"} />
                <DetailTile icon={Store} label="Registration" value={brand.businessRegistrationStatus || "—"} />
                <DetailTile icon={RotateCcw} label="Verification Attempts" value={brand.verificationAttemptCount ?? 0} />
              </div>
            </SectionCard>

            {/* Quick facts */}
            <SectionCard title="Quick Facts">
              <div className="space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Submissions</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{verification.submissionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Rejections</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{verification.rejectionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Revocations</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{verification.revocationCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Submitted</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatDateTime(verification.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Last Updated</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatDateTime(verification.updatedAt)}</span>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Match scores — full width, spanning past where the two columns
            above end, instead of being squeezed into the narrower left
            column. */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SectionCard title="Name Match Scores">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <ScoreRing label="PAN ↔ GST" value={nameMatch?.panGstScore ?? 0} />
              <ScoreRing label="PAN ↔ Brand" value={nameMatch?.panBrandScore ?? 0} />
              <ScoreRing label="GST ↔ Brand" value={nameMatch?.gstBrandScore ?? 0} />
              <ScoreRing label="Average" value={nameMatch?.averageScore ?? 0} />
            </div>
          </SectionCard>

          <SectionCard title="Bank Name Match Scores">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <ScoreRing label="Bank ↔ PAN" value={bankNameMatch?.bankPanScore ?? 0} />
              <ScoreRing label="Bank ↔ GST" value={bankNameMatch?.bankGstScore ?? 0} />
              <ScoreRing label="Bank ↔ Brand" value={bankNameMatch?.bankBrandScore ?? 0} />
              <ScoreRing label="Highest" value={bankNameMatch?.highestScore ?? 0} />
            </div>
          </SectionCard>
        </div>
      </div>

      {showRejectBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Verification</h2>
                <p className="mt-1 text-[12.5px] text-neutral-500">
                  Tell the vendor why{" "}
                  <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> is being rejected.
                  This reason is shown to them.
                </p>
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
                  Reason
                </label>
                <select
                  value={rejectReasonChoice}
                  onChange={(e) => setRejectReasonChoice(e.target.value)}
                  disabled={anyBusy}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 focus:border-red-400/60 focus:outline-none focus:ring-1 focus:ring-red-400/60 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                  {rejectReasonChoice === "Other" ? "Describe the reason" : "Additional note (optional)"}
                  {rejectReasonChoice === "Other" && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => {
                    setRejectNote(e.target.value);
                    if (rejectError) setRejectError("");
                  }}
                  rows={3}
                  placeholder="Add specific details to help the vendor fix the issue..."
                  disabled={anyBusy}
                  className={`w-full resize-none rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
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
                  disabled={anyBusy}
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={anyBusy}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-white px-4 py-2 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/40 dark:bg-neutral-900 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  {rejectBusy && <Loader2 size={13} className="animate-spin" />}
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
