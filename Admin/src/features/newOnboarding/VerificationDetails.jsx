import { useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData } from "@tanstack/react-query";
import {
  Info,
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
  ChevronRight,
  RefreshCw,
  LayoutDashboard,
  Landmark,
  History,
  Eye,
} from "lucide-react";
import { BrandAvatar, StatusBadge, SectionCard, EmptyState, ToggleSwitch, StatChip, RingStat } from "../brand/BrandShared";
import CommonEmptyState from "../../components/common/EmptyState";
import { REJECTION_REASONS } from "../brand/data/BrandData";
import { useBrandDetails } from "../brand/queries/brandQueries";
import { mapBrandDetail } from "../brand/brandMapper";
import { useVouchers } from "../voucher/queries/voucherQueries";
import { useVerificationHistory } from "./queries/onboardingReviewQueries";
import ShowcaseAlbums from "../brand/ShowcaseAlbums";
import AccountDetailsTab from "../brand/BrandDetails/tabs/AccountDetailsTab";
import SubmittedDetails from "./SubmittedDetails";
import { REVIEW_TEXT_MAX } from "./reviewGate";
import { OWNER_ID_MANUAL_NOTE, ownerIdManual } from "./verificationData";
import { isNotFoundMessage, MISSING, orText } from "../../utils/helpers";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";

// GET /brands/get response → the flat brand-detail shape, plus the untouched
// payload as `raw` for the Business Details tab (stable reference so
// `select` only re-runs when the data changes).
const selectBrandDetail = (res) => {
  const raw = res?.data || res;
  return raw ? { ...mapBrandDetail(raw), raw } : null;
};

// Card chrome shared by the hero, sidebar panels and loading/error boxes.
const CARD =
  "rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";

// The ADMIN's decision (verificationData.deriveStatus). The system's verdict
// is advice only and has its own labels below — never "Approved".
const STATUS_LABELS = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  PENDING: "Awaiting decision",
};

const STATUS_ACCENTS = {
  APPROVED: "from-emerald-400/40 via-emerald-400/5",
  REJECTED: "from-red-400/40 via-red-400/5",
  REVOKED: "from-orange-400/40 via-orange-400/5",
  PENDING: "from-amber-400/40 via-amber-400/5",
};

const SYSTEM_VERDICT_LABELS = {
  APPROVED: "looks good",
  MANUAL_REVIEW: "needs a manual check",
  REJECTED: "found problems",
};

function formatDateTime(iso) {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING.date;
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
function DetailTile({ icon: Icon, label, value, fallback = MISSING.generic }) {
  return (
    <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
      <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
        {Icon && <Icon size={11} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-200"><ValueOr value={value} fallback={fallback} /></p>
    </div>
  );
}

// Label ↔ value row used inside the sidebar panels.
function FactRow({ icon: Icon, label, children, tint = "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
      <span className="flex min-w-0 items-center gap-2.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tint}`}>
            <Icon size={13} />
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="min-w-0 truncate text-right text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{children}</span>
    </div>
  );
}

// Small pill in the hero's meta row.
function MetaPill({ icon: Icon, children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-white/70 px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400 ${className}`}
    >
      {Icon && <Icon size={12} className="shrink-0" />}
      {children}
    </span>
  );
}

// Every automated check the backend ran for this attempt — the duplicate
// flags are inverted (a duplicate = bad), so "ok" always means "good".
// `note` explains a failure the admin resolves by hand (OWNER_ID_MANUAL).
function buildChecklist(flags = {}, remarkCodes = []) {
  const panNote = !flags.panVerified && ownerIdManual(remarkCodes) ? OWNER_ID_MANUAL_NOTE : null;
  return [
    { label: "PAN Verified", ok: Boolean(flags.panVerified), note: panNote },
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
  if (!action) return "Unknown action";
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
    parts.push(`${meta.previousScreen || "None"} → ${meta.newScreen || "None"}`);
  }
  return parts.length ? parts.join(", ") : null;
}

function ScoreRing({ label, value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const radius = 24;
  const dash = 2 * Math.PI * radius;
  const ringColor = pct >= 80 ? "stroke-emerald-400" : pct >= 50 ? "stroke-amber-400" : "stroke-red-400";

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
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
    "Unknown";

  return (
    <div className={`relative flex gap-3 ${isLast ? "" : "pb-5"}`}>
      {!isLast && <span className="absolute bottom-0 left-3.25 top-7 w-px bg-neutral-200 dark:bg-neutral-800" />}

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
              Status: {entry.previousStatus || "None"} → {entry.newStatus || "None"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading / error wrapper for anything fed by GET /brands/get.
function BrandDetailState({ loading, error, onRetry, what, children }) {
  if (loading) {
    return (
      <div className={`${CARD} p-5`}>
        <Loader variant="inline" center className="py-6" label={`Loading ${what}…`} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${CARD} p-5`}>
        <CommonEmptyState
          variant="compact"
          tone="error"
          icon="error"
          title={`Couldn't load ${what}`}
          description={error}
          action={{ label: "Try again", icon: RefreshCw, onClick: onRetry }}
        />
      </div>
    );
  }
  return children;
}

// Pill tab bar; `count` shows a small badge (red when `alert`).
function TabBar({ tabs, active, onChange }) {
  return (
    <div className={`${CARD} no-scrollbar flex gap-1 overflow-x-auto p-1.5`} role="tablist">
      {tabs.map((t) => {
        const isActive = active === t.key;
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl px-3.5 py-2 text-[12.5px] font-medium transition-all ${
              isActive
                ? "bg-emerald-400 text-neutral-950 shadow-sm"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Icon size={14} />
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  isActive
                    ? "bg-neutral-950/15 text-neutral-950"
                    : t.alert
                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function VerificationDetails({
  verification,
  onBack,
  // Each resolves true on success; forms keep what was typed until then.
  onApprove,
  onReject,
  onSetReviewed,
  onRevoke,
  // reviewGate.useReviewGate: { approveBlocked, rejectBlocked, approveConfirm, deedMissing }.
  gate = null,
  busyAction,
  actionError,
  // View only (New Onboarding) — no Approve / Reject / Revoke / Reviewed
  // controls; decisions happen on Brand Waiting.
  readOnly = false,
}) {
  const { brand, flags, nameMatch, bankNameMatch, entityMatch, duplicateDetails } = verification;
  const checklist = buildChecklist(flags, verification.remarkCodes);
  const passedCount = checklist.filter((c) => c.ok).length;
  const failedChecks = checklist.filter((c) => !c.ok);
  const statusLabel = STATUS_LABELS[verification.derivedStatus] || verification.derivedStatus;
  const accent = STATUS_ACCENTS[verification.derivedStatus] || "from-neutral-500/20 via-neutral-500/0";
  const checksPassedPct = checklist.length ? (passedCount / checklist.length) * 100 : 0;

  const [tab, setTab] = useState("overview");
  const [approveNote, setApproveNote] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReasonChoice, setRejectReasonChoice] = useState(REJECTION_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevokeBox, setShowRevokeBox] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  // The admin's decision is driven by the brand itself, not the system's
  // verdict (that's only advice — onboarding v2 guide §4). Approve / Reject
  // on any brand that isn't approved, after submit; Approve also needs the
  // deed (gate). A rejected / revoked attempt can still be approved — the
  // form then asks "approve anyway?" (gate.approveConfirm) — but a rejected
  // one can't be rejected again (409). An approved brand can be revoked.
  const brandApproved = Boolean(verification.brand?.isApproved);
  const attemptClosed = verification.isRejected || verification.isRevoked;
  const canReview = !readOnly && !brandApproved;
  const approveConfirm = gate?.approveConfirm || null;
  const canRevoke = !readOnly && brandApproved;
  const approveBlocked = gate?.approveBlocked || null;
  const rejectBlocked = gate?.rejectBlocked || null;
  const systemVerdictText = SYSTEM_VERDICT_LABELS[verification.systemVerdict];
  // The re-score after a post-submit add (latestScore) wins over the submit one.
  const adviceScore = verification.latestScore ?? verification.score;
  // No verification record yet (vendor hasn't submitted) — attemptNumber is 0.
  const attemptCaption = verification.attemptNumber ? `Attempt #${verification.attemptNumber}` : "Not submitted yet";

  // Per-action busy flags — only the button actually clicked spins, but
  // every action button is disabled while any one request is in flight so
  // the same record can't take two conflicting actions at once.
  const anyBusy = Boolean(busyAction);
  const approveBusy = busyAction === "approve";
  const rejectBusy = busyAction === "reject";
  const reviewedBusy = busyAction === "reviewed";
  const revokeBusy = busyAction === "revoke";

  // Real audit trail — GET /brands/verifications/history?brandId=...
  // Review actions are PUTs under /brands, so the interceptor refreshes this
  // and the brand snapshot below on its own.
  const brandId = verification.brandId || brand?.id;
  const [historyPage, setHistoryPage] = useState(1);
  const historyQuery = useVerificationHistory(
    { brandId, page: historyPage, limit: 20 },
    { placeholderData: keepPreviousData }
  );
  const history = historyQuery.data?.data?.data ?? [];
  const historyTotalPages = historyQuery.data?.data?.totalPages ?? 1;
  // isLoading (not isPending): with no brandId the query never runs, and the
  // timeline should show its empty state rather than a spinner.
  const historyLoading = historyQuery.isLoading;
  const historyError = historyQuery.error?.message ?? "";

  // The brand's full history can span several past attempts — only show
  // the ones belonging to this attempt (the "parent" being reviewed here),
  // not every attempt's events mixed together.
  const currentAttemptHistory = history.filter((h) => h.systemVerifyId === verification.id);

  // Account details + Plan / Subscription — GET /brands/get?brandId=...
  // (same fully-populated payload the Brand folder's detail page uses).
  const brandDetailQuery = useBrandDetails(brandId, { select: selectBrandDetail });
  const brandDetail = brandDetailQuery.data ?? null;
  const brandDetailLoading = brandDetailQuery.isPending;
  const brandDetailError = brandDetailQuery.error?.message ?? "";
  const retryBrandDetail = () => brandDetailQuery.refetch();

  // Listing data — the vouchers this brand has created, GET
  // /vouchers/versions/get-all?brandId=...
  const vouchersQuery = useVouchers(
    { brandId, page: 1, limit: 20 },
    {
      enabled: Boolean(brandId),
      // "Not found" just means no vouchers yet (below) — retrying won't help.
      retry: (count, err) => !isNotFoundMessage(err.message) && count < 1,
    }
  );
  const vouchers = vouchersQuery.data?.data?.data ?? [];
  const vouchersLoading = vouchersQuery.isPending;
  // The backend throws a "not found"-style message (e.g. "No any
  // voucherversion found") when a brand simply has zero vouchers yet
  // — that's a normal empty state, not a real failure, so don't show
  // it as an error.
  const vouchersError =
    vouchersQuery.error && !isNotFoundMessage(vouchersQuery.error.message) ? vouchersQuery.error.message : "";

  // Forms are cleared only after the request succeeds; on a failure (e.g. a
  // 409 — the page then re-reads the latest state) the typed text stays.
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (approveBlocked) return;
    if (await onApprove(approveNote.trim())) {
      setApproveNote("");
      setShowApproveBox(false);
    }
  };

  const finalRejectReason =
    rejectReasonChoice === "Other"
      ? rejectNote.trim()
      : rejectNote.trim()
      ? `${rejectReasonChoice} — ${rejectNote.trim()}`
      : rejectReasonChoice;
  const rejectTooLong = finalRejectReason.length > REVIEW_TEXT_MAX;

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (rejectBlocked) return;
    if (rejectReasonChoice === "Other" && !rejectNote.trim()) {
      setRejectError("Describe the reason so the vendor knows what to fix.");
      return;
    }
    if (rejectTooLong) {
      setRejectError(`The reason can be at most ${REVIEW_TEXT_MAX} characters.`);
      return;
    }
    if (await onReject(finalRejectReason)) {
      setRejectReasonChoice(REJECTION_REASONS[0]);
      setRejectNote("");
      setShowRejectBox(false);
      setRejectError("");
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) {
      setRevokeError("A reason is required so there's a record of why approval was revoked.");
      return;
    }
    if (await onRevoke(revokeReason.trim())) {
      setRevokeReason("");
      setShowRevokeBox(false);
      setRevokeError("");
    }
  };

  const duplicateGroups = [
    { label: "PAN", ids: duplicateDetails?.panBrandIds },
    { label: "GST", ids: duplicateDetails?.gstBrandIds },
    { label: "Bank", ids: duplicateDetails?.bankBrandIds },
    { label: "WhatsApp", ids: duplicateDetails?.whatsappBrandIds },
    { label: "Email", ids: duplicateDetails?.emailBrandIds },
  ].filter((g) => g.ids?.length);

  // Brand-card values — the verification record first, then GET /brands/get
  // (most onboarding brands have no verification record yet).
  const brandEmail = brand.email || brandDetail?.contactEmail;
  const brandWhatsapp = brand.whatsappNumber || brandDetail?.contactPhone;
  const legalName = brand.legalBusinessName || brandDetail?.legalBusinessName;

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "business", label: "Business Details", icon: Store },
    { key: "account", label: "Account Details", icon: Landmark },
    { key: "verification", label: "Verification", icon: ShieldCheck, count: failedChecks.length, alert: true },
    { key: "listings", label: "Listings & Showcase", icon: Tag, count: vouchers.length },
    { key: "timeline", label: "Timeline", icon: History, count: currentAttemptHistory.length },
  ];

  /* ---------------------------------------------------------------- tabs */

  const brandCard = (
    <SectionCard title="Brand">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <DetailTile icon={Hash} label="Merchant ID" value={brand.merchantId} fallback={MISSING.id} />
        <DetailTile icon={Phone} label="Mobile" value={brand.mobile} fallback={MISSING.phone} />
        <DetailTile icon={Phone} label="WhatsApp" value={brandWhatsapp} fallback={MISSING.phone} />
        <DetailTile icon={Mail} label="Email" value={brandEmail} fallback={MISSING.email} />
        <DetailTile icon={Store} label="Entity Type" value={brand.businessEntityType} fallback="Not added" />
        <DetailTile icon={Store} label="Registration" value={brand.businessRegistrationStatus} fallback="Not added" />
        <DetailTile icon={RotateCcw} label="Verification Attempts" value={brand.verificationAttemptCount ?? 0} />
        <DetailTile icon={Calendar} label="Submitted" value={verification.createdAt ? formatDateTime(verification.createdAt) : null} fallback={MISSING.date} />
        <DetailTile icon={Clock} label="Last Updated" value={verification.updatedAt ? formatDateTime(verification.updatedAt) : null} fallback={MISSING.date} />
      </div>
    </SectionCard>
  );

  const overviewTab = (
    <div className="space-y-4">
      {brandCard}

      <SectionCard title="Verification Snapshot">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
            <p className="text-[10.5px] text-neutral-500">Score</p>
            <p className={`mt-1 text-[18px] font-bold leading-none ${scoreColor(verification.score)}`}>
              {verification.score ?? 0}
              <span className="ml-0.5 text-[11px] font-medium text-neutral-500">/100</span>
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
            <p className="text-[10.5px] text-neutral-500">Checks Passed</p>
            <p className="mt-1 text-[18px] font-bold leading-none text-neutral-900 dark:text-neutral-50">
              {passedCount}
              <span className="ml-0.5 text-[11px] font-medium text-neutral-500">/{checklist.length}</span>
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
            <p className="text-[10.5px] text-neutral-500">Duplicates</p>
            <p className={`mt-1 text-[18px] font-bold leading-none ${duplicateGroups.length ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {duplicateGroups.length}
            </p>
          </div>
        </div>

        {failedChecks.length ? (
          <div className="mt-4">
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">Needs attention</p>
            <div className="flex flex-wrap gap-1.5">
              {failedChecks.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11.5px] font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400"
                >
                  <XCircle size={12} /> {c.label}
                  {c.note && <span className="font-normal text-red-600/80 dark:text-red-400/80">· {c.note}</span>}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTab("verification")}
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              View full checklist <ChevronRight size={13} />
            </button>
          </div>
        ) : (
          <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} /> All automated checks passed.
          </p>
        )}
      </SectionCard>

      {verification.remarks?.length > 0 && (
        <SectionCard title="Remarks">
          <ul className="space-y-2">
            {verification.remarks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-[12.5px] text-amber-700 dark:text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );

  const verificationTab = (
    <div className="space-y-4">
      <SectionCard title="Verification Checklist">
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
              <span className="min-w-0 text-neutral-700 dark:text-neutral-300">
                {c.label}
                {c.note && <span className="mt-0.5 block text-[11.5px] text-amber-700 dark:text-amber-300">{c.note}</span>}
              </span>
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
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Business Entity Match" icon={Store}>
          <div className="space-y-2">
            <FactRow icon={Store} label="GST Constitution" tint="bg-sky-400/10 text-sky-600 dark:text-sky-400">
              <ValueOr value={entityMatch?.gstConstitution} fallback="Not added" />
            </FactRow>
            <FactRow icon={Store} label="Brand Entity Type" tint="bg-sky-400/10 text-sky-600 dark:text-sky-400">
              <ValueOr value={entityMatch?.brandEntityType} fallback="Not added" />
            </FactRow>
            <FactRow
              icon={entityMatch?.matched ? CheckCircle2 : XCircle}
              label="Matched"
              tint={entityMatch?.matched ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-400/10 text-red-500 dark:text-red-400"}
            >
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  entityMatch?.matched
                    ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-400/10 text-red-500 dark:text-red-400"
                }`}
              >
                {entityMatch?.matched ? "Yes" : "No"}
              </span>
            </FactRow>
          </div>
        </SectionCard>

        <SectionCard title="Duplicate Detection">
          {duplicateGroups.length ? (
            <div className="space-y-2.5">
              {duplicateGroups.map((g) => (
                <div key={g.label} className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                  <p className="mb-1 text-[11.5px] font-semibold text-red-700 dark:text-red-300">Duplicate {g.label}</p>
                  <p className="break-all text-[11.5px] text-red-700/80 dark:text-red-300/80">{g.ids.join(", ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} /> No duplicates found across PAN, GST, bank, WhatsApp or email.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );

  // PAN / GST / Bank + contact — same view as Live Brand's Account Details
  // tab. A step the vendor hasn't done yet has no record ("Not added").
  const accountTab = (
    <BrandDetailState loading={brandDetailLoading} error={brandDetailError} onRetry={retryBrandDetail} what="account details">
      {brandDetail ? (
        <AccountDetailsTab brand={brandDetail} defaultOpen />
      ) : (
        <EmptyState label="No account details available." />
      )}
    </BrandDetailState>
  );

  // Everything the vendor filled in during onboarding — business profile,
  // owner contact, outlet + location, working hours, step-by-step progress.
  const businessTab = (
    <BrandDetailState loading={brandDetailLoading} error={brandDetailError} onRetry={retryBrandDetail} what="business details">
      <SubmittedDetails raw={brandDetail?.raw} />
    </BrandDetailState>
  );

  const listingsTab = (
    <div className="space-y-4">
      {/* Vouchers this brand has created, GET /vouchers/versions/get-all?brandId=... */}
      <SectionCard title="Listing Data" icon={Tag}>
        {vouchersLoading ? (
          <Loader variant="inline" center className="py-6" label="Loading listings…" />
        ) : vouchersError ? (
          <CommonEmptyState
            variant="compact"
            tone="error"
            icon="error"
            title="Couldn't load listings"
            description={vouchersError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => vouchersQuery.refetch() }}
          />
        ) : vouchers.length ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                    <p className="mt-0.5 text-[11px] text-neutral-500">{v.versionCode || "No version"}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {v.status ? v.status.replace(/_/g, " ") : "No status"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No vouchers created by this brand yet." />
        )}
      </SectionCard>

      {/* Showcase — same albums view as Live Brand's details page.
          ShowcaseAlbums has its own heading, hence a plain card. */}
      {brandId && (
        <div className={`${CARD} p-5`}>
          <ShowcaseAlbums brand={{ id: brandId }} readOnly={readOnly} />
        </div>
      )}
    </div>
  );

  // The real audit trail, GET /brands/verifications/history?brandId=...,
  // so dates always match what actually happened.
  const timelineTab = (
    <SectionCard title="Review Timeline">
      {historyLoading ? (
        <Loader variant="inline" center className="py-8" label="Loading timeline…" />
      ) : historyError ? (
        <CommonEmptyState
          variant="compact"
          tone="error"
          icon="error"
          title="Couldn't load timeline"
          description={historyError}
          action={{ label: "Try again", icon: RefreshCw, onClick: () => historyQuery.refetch() }}
        />
      ) : currentAttemptHistory.length ? (
        <>
          <div className="px-1">
            {currentAttemptHistory.map((h, i) => (
              <TimelineEntry key={h._id} entry={h} isLast={i === currentAttemptHistory.length - 1} />
            ))}
          </div>
          {historyTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 border-t border-neutral-200/70 pt-4 dark:border-neutral-800">
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
  );

  const tabContent = {
    overview: overviewTab,
    business: businessTab,
    verification: verificationTab,
    account: accountTab,
    listings: listingsTab,
    timeline: timelineTab,
  }[tab];

  /* ------------------------------------------------------------- sidebar */

  const decisionPanel = (
    <div className={`${CARD} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
          {readOnly ? "Verification Status" : "Decision"}
        </p>
        <StatusBadge status={statusLabel} activeLabel="Approved" />
      </div>

      {brandApproved && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-emerald-400/10 p-3.5">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-[12.5px] text-emerald-700 dark:text-emerald-300">This brand has been approved by admin.</p>
        </div>
      )}
      {/* Awaiting the admin. The system's verdict is shown as advice only. */}
      {!brandApproved && verification.derivedStatus === "PENDING" && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-sky-400/10 p-3.5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
          <p className="text-[12.5px] text-sky-700 dark:text-sky-300">
            {readOnly
              ? "The vendor is still onboarding — once they submit, approve or reject this brand from Brand Waiting."
              : "This brand is awaiting your decision."}
          </p>
        </div>
      )}
      {verification.attemptNumber > 0 && systemVerdictText && !attemptClosed && !brandApproved && (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-xl bg-neutral-500/5 p-3.5">
          <Info size={16} className="mt-0.5 shrink-0 text-neutral-500" />
          <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">Advice only:</span> the system check {systemVerdictText}
            {adviceScore != null ? ` (score ${adviceScore}/100)` : ""}. The decision is yours.
          </p>
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
      {attemptClosed && !readOnly && !brandApproved && (
        <p className="mb-3.5 text-[12px] text-neutral-500">
          Waiting for the vendor to fix the details and resubmit. You can still approve now — you'll be asked to confirm.
        </p>
      )}

      {/* Approve / Reject — after submit; Approve also needs the deed and, on
          a rejected / revoked attempt, an "approve anyway" confirmation. */}
      {canReview && !showApproveBox && (
        <>
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowApproveBox(true)}
              disabled={anyBusy || Boolean(approveBlocked)}
              title={approveBlocked || "Approve"}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approveBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Approve
            </button>
            <button
              onClick={() => setShowRejectBox(true)}
              disabled={anyBusy || Boolean(rejectBlocked)}
              title={rejectBlocked || "Reject"}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400"
            >
              {rejectBusy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Reject
            </button>
          </div>
          {approveBlocked && (
            <p className="mt-2.5 text-[12px] text-amber-700 dark:text-amber-300">
              {approveBlocked}
              {gate?.deedMissing && (
                <>
                  {" "}
                  <Link to={`/brand/onboard/${brandId}`} className="font-semibold underline">
                    Open onboarding
                  </Link>
                </>
              )}
            </p>
          )}
        </>
      )}

      {canReview && showApproveBox && (
        <form onSubmit={handleApproveSubmit} className="space-y-3">
          {approveConfirm && (
            <p className="flex items-start gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700 dark:text-red-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {approveConfirm}
            </p>
          )}
          <label className="mb-1.5 block text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            Note <span className="text-neutral-500">(optional — recorded in the history)</span>
          </label>
          <textarea
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            rows={3}
            maxLength={REVIEW_TEXT_MAX}
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
              disabled={anyBusy || Boolean(approveBlocked)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approveBusy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {approveConfirm ? "Approve anyway" : "Confirm"}
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
          {revokeBusy ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
          Revoke Approval
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
            maxLength={REVIEW_TEXT_MAX}
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

      {/* Reviewed ("seen") flag — always sent as an explicit boolean
          ({ action: "REVIEWED", isReviewed }, #24 note 3); it can't change on
          an approved brand, and needs a submitted attempt. */}
      {!readOnly && !brandApproved && verification.attemptNumber > 0 && (
        <div className="mt-4 flex items-center gap-2 border-t border-neutral-200/70 pt-4 dark:border-neutral-800">
          <BadgeCheck size={14} className={verification.isReviewed ? "text-sky-600 dark:text-sky-400" : "text-neutral-500"} />
          <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Reviewed</span>
          {reviewedBusy && <Loader2 size={11} className="animate-spin text-neutral-500" />}
          <ToggleSwitch checked={Boolean(verification.isReviewed)} onChange={anyBusy ? undefined : () => onSetReviewed(!verification.isReviewed)} />
        </div>
      )}
    </div>
  );

  // Plan + subscription in one panel — GET /brands/get?brandId=...
  const planPanel = (
    <BrandDetailState loading={brandDetailLoading} error={brandDetailError} onRetry={retryBrandDetail} what="plan">
      <SectionCard title="Plan & Subscription" icon={CreditCard}>
        {brandDetail ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <StatChip icon={BadgeCheck} label="Plan" value={brandDetail.subscriptionPlan} tint="emerald" />
              <StatChip icon={CreditCard} label="Price" value={brandDetail.planPrice} tint="violet" />
              <StatChip icon={Tag} label="Type" value={brandDetail.planType} tint="sky" />
              <StatChip icon={Clock} label="Term" value={brandDetail.subscriptionTerm} tint="amber" />
            </div>

            {brandDetail.subscriptionDetail ? (
              <>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 text-white">
                  <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10.5px] font-medium text-emerald-100">Paid Amount</p>
                      <p className="mt-0.5 text-[17px] font-bold leading-tight">
                        ₹{Number(brandDetail.subscriptionDetail.paidAmount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] font-medium text-emerald-100">Due Amount</p>
                      <p className="mt-0.5 text-[17px] font-bold leading-tight">
                        ₹{Number(brandDetail.subscriptionDetail.dueAmount).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        brandDetail.subscriptionDetail.isActive ? "bg-white/20 text-white" : "bg-white/10 text-emerald-100"
                      }`}
                    >
                      {brandDetail.subscriptionDetail.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                      {orText(brandDetail.subscriptionDetail.status, "No status")}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
                      {brandDetail.expiredInDays}d left
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <FactRow icon={Receipt} label="Subscription ID" tint="bg-violet-400/10 text-violet-600 dark:text-violet-400">
                    <span className="font-mono text-[11.5px] tracking-tight">
                      <ValueOr value={brandDetail.subscriptionDetail.subscriptionId} fallback={MISSING.id} />
                    </span>
                  </FactRow>
                  <FactRow icon={Receipt} label="Transaction ID" tint="bg-violet-400/10 text-violet-600 dark:text-violet-400">
                    <span className="font-mono text-[11.5px] tracking-tight">
                      <ValueOr value={brandDetail.subscriptionDetail.transactionId} fallback={MISSING.id} />
                    </span>
                  </FactRow>
                  <FactRow icon={Calendar} label="Start Date" tint="bg-sky-400/10 text-sky-600 dark:text-sky-400">
                    <ValueOr value={brandDetail.subscriptionDetail.startDateDisplay} fallback={MISSING.date} />
                  </FactRow>
                  <FactRow icon={Calendar} label="End Date" tint="bg-sky-400/10 text-sky-600 dark:text-sky-400">
                    <ValueOr value={brandDetail.subscriptionDetail.endDateDisplay} fallback="No end date" />
                  </FactRow>
                </div>
              </>
            ) : (
              <EmptyState label="No subscription record for this brand yet." />
            )}
          </div>
        ) : (
          <EmptyState label="No plan data available." />
        )}
      </SectionCard>
    </BrandDetailState>
  );

  const factsPanel = (
    <SectionCard title="Quick Facts">
      <div className="divide-y divide-neutral-200/70 text-[12.5px] dark:divide-neutral-800">
        {[
          ["Submissions", verification.submissionCount ?? 0],
          ["Rejections", verification.rejectionCount ?? 0],
          ["Revocations", verification.revocationCount ?? 0],
          ["Submitted", formatDateTime(verification.createdAt)],
          ["Last Updated", formatDateTime(verification.updatedAt)],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <span className="text-neutral-500">{label}</span>
            <span className="font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  /* ---------------------------------------------------------------- page */

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top bar — back + breadcrumb */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to onboarding"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-400 dark:shadow-black/20 dark:hover:text-neutral-100"
        >
          <ArrowLeft size={16} />
        </button>
        <nav className="flex min-w-0 items-center gap-1 text-[12.5px] text-neutral-500" aria-label="Breadcrumb">
          <button onClick={onBack} className="shrink-0 hover:text-neutral-800 dark:hover:text-neutral-200">
            {readOnly ? "New Onboarding" : "Brand Waiting"}
          </button>
          <ChevronRight size={13} className="shrink-0" />
          <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">{brand.brandName}</span>
        </nav>
      </div>

      {/* Hero */}
      <div className={`relative mb-4 overflow-hidden ${CARD}`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent} opacity-90`} />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="shrink-0 rounded-2xl shadow-sm ring-4 ring-white/80 dark:ring-neutral-950">
              <BrandAvatar brand={brand} size="xl" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl dark:text-neutral-50">
                  {brand.brandName}
                </h1>
                <StatusBadge status={statusLabel} activeLabel="Approved" />
                {readOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900/5 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
                    <Eye size={11} /> View only
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-[12.5px] text-neutral-500">
                {[brand.uniqueId, legalName].filter(Boolean).join(" · ") || MISSING.id}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <MetaPill icon={RotateCcw}>{attemptCaption}</MetaPill>
                {verification.createdAt && <MetaPill icon={Calendar}>Submitted {formatDateTime(verification.createdAt)}</MetaPill>}
                {brand.businessEntityType && <MetaPill icon={Store}>{brand.businessEntityType.replace(/_/g, " ")}</MetaPill>}
                {brand.merchantId && (
                  <MetaPill icon={Hash} className="font-mono">
                    {brand.merchantId}
                  </MetaPill>
                )}
                {verification.isReviewed && (
                  <MetaPill icon={BadgeCheck} className="border-sky-200 text-sky-600 dark:border-sky-500/30 dark:text-sky-400">
                    Reviewed
                  </MetaPill>
                )}
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2.5">
            <RingStat
              pct={verification.score ?? 0}
              label="Verification Score"
              caption={attemptCaption}
              tint={verification.score >= 80 ? "emerald" : verification.score >= 50 ? "amber" : "red"}
            />
            <RingStat pct={checksPassedPct} label="Checks Passed" caption={`${passedCount}/${checklist.length}`} tint="sky" />
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          {actionError}
        </div>
      )}

      {/* Body — tabbed main column + sticky sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <TabBar tabs={tabs} active={tab} onChange={setTab} />
          <div role="tabpanel">{tabContent}</div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          {decisionPanel}
          {planPanel}
          {factsPanel}
        </aside>
      </div>

      {showRejectBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Reject Verification</h2>
                <p className="mt-1 text-[12.5px] text-neutral-500">
                  Tell the vendor why <span className="text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> is being
                  rejected. This reason is shown to them.
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
                <label className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Reason</label>
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
                <p className={`mt-1 text-right text-[11px] ${rejectTooLong ? "text-red-600 dark:text-red-400" : "text-neutral-400"}`}>
                  {finalRejectReason.length}/{REVIEW_TEXT_MAX}
                </p>
                {rejectError && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} /> {rejectError}
                  </p>
                )}
                {/* The page banner sits behind this overlay — repeat a failed
                    request's error here (the reason stays as typed). */}
                {actionError && (
                  <p className="mt-1.5 flex items-start gap-1 text-[11.5px] text-red-600 dark:text-red-400">
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {actionError}
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
                  disabled={anyBusy || rejectTooLong || Boolean(rejectBlocked)}
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
