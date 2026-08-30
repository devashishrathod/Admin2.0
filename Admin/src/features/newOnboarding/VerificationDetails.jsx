import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  User,
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
} from "lucide-react";
import Table from "../../components/common/Table";
import { BrandAvatar, StatusBadge, InfoRow, SectionCard, EmptyState, ToggleSwitch } from "../brand/BrandShared";
import { getVerificationHistory } from "./services/NewOnboardingApi";

const STATUS_LABELS = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  MANUAL_REVIEW: "Manual Review",
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

// Reconstructs the review timeline from the record's own timestamp fields
// — the API doesn't return an explicit audit-log array.
function buildTimeline(v) {
  const entries = [];
  if (v.createdAt) {
    entries.push({ action: "Submitted", date: v.createdAt, by: null, remarks: `Verification attempt #${v.attemptNumber}.` });
  }
  if (v.verifiedAt) {
    entries.push({ action: "System Verified", date: v.verifiedAt, by: v.verifiedBy, remarks: `Automated score: ${v.score}/100.` });
  }
  if (v.reviewedAt) {
    entries.push({ action: "Reviewed", date: v.reviewedAt, by: v.reviewedByAdmin?.name || v.reviewedByAdminId, remarks: null });
  }
  if (v.adminApprovedAt) {
    entries.push({ action: "Approved", date: v.adminApprovedAt, by: v.verifiedByAdmin?.name, remarks: "Approved by admin." });
  }
  if (v.rejectedAt) {
    entries.push({
      action: "Rejected",
      date: v.rejectedAt,
      by: v.rejectedByAdmin?.name || v.rejectedBy,
      remarks: v.rejectionReason,
    });
  }
  if (v.revokedAt) {
    entries.push({
      action: "Revoked",
      date: v.revokedAt,
      by: v.revokedByAdmin?.name || v.revokedBy,
      remarks: v.revokeReason,
    });
  }
  return entries
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((e) => ({ ...e, date: formatDateTime(e.date) }));
}

const HISTORY_ICONS = {
  Submitted: FileText,
  "System Verified": ShieldCheck,
  Reviewed: BadgeCheck,
  Approved: CheckCircle2,
  Rejected: XCircle,
  Revoked: RotateCcw,
};
const HISTORY_COLORS = {
  Submitted: "text-neutral-500 bg-neutral-200 dark:text-neutral-400 dark:bg-neutral-700/40",
  "System Verified": "text-sky-600 bg-sky-400/10 dark:text-sky-400",
  Reviewed: "text-sky-600 bg-sky-400/10 dark:text-sky-400",
  Approved: "text-emerald-600 bg-emerald-400/10 dark:text-emerald-400",
  Rejected: "text-red-600 bg-red-500/10 dark:text-red-400",
  Revoked: "text-orange-600 bg-orange-400/10 dark:text-orange-400",
};

// "APPROVAL_ACKNOWLEDGED" -> "Approval Acknowledged"
function formatAction(action) {
  if (!action) return "—";
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function iconForAction(action = "") {
  if (action.includes("APPROV")) return CheckCircle2;
  if (action.includes("REJECT")) return XCircle;
  if (action.includes("REVOK")) return RotateCcw;
  if (action.includes("REVIEW")) return BadgeCheck;
  if (action.includes("SUBMIT") || action.includes("CREATE")) return FileText;
  return ShieldCheck;
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

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className={`font-semibold ${scoreColor(value)}`}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${
            value >= 80 ? "bg-emerald-400" : value >= 50 ? "bg-amber-400" : "bg-red-400"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
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
  const { brand, vendor, flags, nameMatch, bankNameMatch, entityMatch, duplicateDetails } = verification;
  const checklist = buildChecklist(flags);
  const timeline = buildTimeline(verification);
  const statusLabel = STATUS_LABELS[verification.derivedStatus] || verification.derivedStatus;

  const [approveNote, setApproveNote] = useState("");
  const [showApproveBox, setShowApproveBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
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

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    onApprove(approveNote.trim());
    setApproveNote("");
    setShowApproveBox(false);
  };

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

  const checklistColumns = [
    {
      key: "label",
      label: "Check",
      render: (row) => <span className="text-neutral-700 dark:text-neutral-300">{row.label}</span>,
    },
    {
      key: "ok",
      label: "Result",
      align: "right",
      render: (row) =>
        row.ok ? (
          <span className="flex items-center justify-end gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} /> Pass
          </span>
        ) : (
          <span className="flex items-center justify-end gap-1.5 text-[12px] font-medium text-red-600 dark:text-red-400">
            <XCircle size={13} /> Fail
          </span>
        ),
    },
  ];

  const timelineColumns = [
    {
      key: "action",
      label: "Step",
      render: (row) => {
        const Icon = HISTORY_ICONS[row.action] || Clock;
        const color =
          HISTORY_COLORS[row.action] ||
          "text-neutral-500 bg-neutral-200 dark:text-neutral-400 dark:bg-neutral-700/40";
        return (
          <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color}`}>
              <Icon size={12} />
            </span>
            {row.action}
          </span>
        );
      },
    },
    { key: "by", label: "By", render: (row) => <span className="text-neutral-700 dark:text-neutral-300">{row.by || "—"}</span> },
    { key: "date", label: "Date", render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{row.date}</span> },
    { key: "remarks", label: "Remarks", render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{row.remarks || "—"}</span> },
  ];

  // Audit trail — backed by GET /brands/verifications/history
  const auditColumns = [
    {
      key: "action",
      label: "Action",
      render: (row) => {
        const Icon = iconForAction(row.action);
        return (
          <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-sky-600 dark:text-sky-400">
              <Icon size={12} />
            </span>
            {formatAction(row.action)}
          </span>
        );
      },
    },
    {
      key: "performedByType",
      label: "By",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${colorForActor(row.performedByType)}`}>
          {row.performedByType || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status Change",
      render: (row) =>
        row.previousStatus || row.newStatus ? (
          <span className="text-neutral-700 dark:text-neutral-300">
            {row.previousStatus || "—"} → {row.newStatus || "—"}
          </span>
        ) : (
          <span className="text-neutral-500">—</span>
        ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "details",
      label: "Details",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{summarizeMetadata(row) || "—"}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              aria-label="Back to onboarding"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <BrandAvatar brand={brand} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{brand.brandName}</h1>
                  <StatusBadge status={statusLabel} activeLabel="Approved" />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-neutral-500">
                  <Hash size={11} /> {brand.uniqueId} · {brand.legalBusinessName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            <span className={`text-[20px] font-bold ${scoreColor(verification.score)}`}>
              {verification.score}
              <span className="text-[11px] font-medium text-neutral-600">/100</span>
            </span>
            <span className="rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Attempt #{verification.attemptNumber}
            </span>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800" />

            {/* Reviewed toggle — Case D: { action: "REVIEWED" }, plain flip,
                no explicit direction. */}
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
              <BadgeCheck size={13} className={verification.isReviewed ? "text-sky-600 dark:text-sky-400" : "text-neutral-500"} />
              <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Reviewed</span>
              {reviewedBusy && <Loader2 size={11} className="animate-spin text-neutral-500" />}
              <ToggleSwitch checked={Boolean(verification.isReviewed)} onChange={anyBusy ? undefined : onMarkReviewed} />
            </div>

            {/* Force reviewed flag — Case D2: { action: "REVIEWED", isReviewed }.
                Explicit override in either direction, independent of the
                toggle above. */}
            <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
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
              <Table columns={checklistColumns} data={checklist} rowKey="label" emptyMessage="No checks recorded." />
            </SectionCard>

            {/* Match scores */}
            <SectionCard title="Name Match Scores">
              <div className="space-y-3">
                <ScoreBar label="PAN ↔ GST" value={nameMatch?.panGstScore ?? 0} />
                <ScoreBar label="PAN ↔ Brand" value={nameMatch?.panBrandScore ?? 0} />
                <ScoreBar label="GST ↔ Brand" value={nameMatch?.gstBrandScore ?? 0} />
                <ScoreBar label="Average" value={nameMatch?.averageScore ?? 0} />
              </div>
            </SectionCard>

            <SectionCard title="Bank Name Match Scores">
              <div className="space-y-3">
                <ScoreBar label="Bank ↔ PAN" value={bankNameMatch?.bankPanScore ?? 0} />
                <ScoreBar label="Bank ↔ GST" value={bankNameMatch?.bankGstScore ?? 0} />
                <ScoreBar label="Bank ↔ Brand" value={bankNameMatch?.bankBrandScore ?? 0} />
                <ScoreBar label="Highest" value={bankNameMatch?.highestScore ?? 0} />
              </div>
            </SectionCard>

            <SectionCard title="Business Entity Match">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <InfoRow icon={Store} label="GST Constitution" value={entityMatch?.gstConstitution || "—"} />
                <InfoRow icon={Store} label="Brand Entity Type" value={entityMatch?.brandEntityType || "—"} />
                <InfoRow
                  icon={entityMatch?.matched ? CheckCircle2 : XCircle}
                  label="Matched"
                  value={entityMatch?.matched ? "Yes" : "No"}
                />
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

            {/* Review timeline — reconstructed from this record's own timestamps */}
            <SectionCard title="Review Timeline">
              {timeline.length ? (
                <Table columns={timelineColumns} data={timeline} rowKey="action" emptyMessage="No history yet." />
              ) : (
                <EmptyState label="No timeline events recorded yet." />
              )}
            </SectionCard>

            {/* Verification audit trail — GET /brands/verifications/history */}
            <SectionCard title="Verification Audit Trail">
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-neutral-500">
                  <Loader2 size={14} className="animate-spin" /> Loading audit trail…
                </div>
              ) : historyError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3.5 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                  <AlertTriangle size={13} className="shrink-0" /> Failed to load audit trail: {historyError}
                </div>
              ) : history.length ? (
                <>
                  <Table columns={auditColumns} data={history} rowKey="_id" emptyMessage="No audit events yet." />
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
                <EmptyState label="No audit trail events recorded yet." />
              )}
            </SectionCard>
          </div>

          {/* Right */}
          <div className="min-w-0 space-y-4">
            {/* Verification status + admin review actions */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
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
                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3.5">
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
                <div className="flex items-start gap-2.5 rounded-xl bg-orange-400/10 p-3.5">
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
              {canReview && !showApproveBox && !showRejectBox && (
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

              {canReview && showRejectBox && (
                <form onSubmit={handleRejectSubmit} className="space-y-3">
                  <label className="mb-1.5 block text-[12px] font-medium text-red-600 dark:text-red-400">
                    Reason for rejection <span className="text-neutral-500">(required)</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError("");
                    }}
                    rows={3}
                    placeholder="e.g. GST registration is cancelled. Please upload an active GST certificate."
                    disabled={anyBusy}
                    className={`w-full resize-none rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                      rejectError
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                        : "border-neutral-200 focus:border-red-400/60 focus:ring-red-400/60 dark:border-neutral-800"
                    }`}
                  />
                  {rejectError && (
                    <p className="flex items-center gap-1 text-[11.5px] text-red-600 dark:text-red-400">
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
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={anyBusy}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rejectBusy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Confirm Reject
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

            {/* Vendor */}
            <SectionCard title="Vendor">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <InfoRow icon={User} label="Name" value={vendor?.name || "—"} />
                <InfoRow icon={Phone} label="Mobile" value={vendor?.mobile || "—"} />
                <InfoRow icon={Mail} label="Email" value={vendor?.email || "—"} />
                <InfoRow icon={BadgeCheck} label="Onboarding Screen" value={vendor?.currentScreen || "—"} />
              </div>
            </SectionCard>

            {/* Brand */}
            <SectionCard title="Brand">
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                <InfoRow icon={Hash} label="Merchant ID" value={brand.merchantId || "—"} />
                <InfoRow icon={Phone} label="Mobile" value={brand.mobile || "—"} />
                <InfoRow icon={Phone} label="WhatsApp" value={brand.whatsappNumber || "—"} />
                <InfoRow icon={Mail} label="Email" value={brand.email || "—"} />
                <InfoRow icon={Store} label="Entity Type" value={brand.businessEntityType || "—"} />
                <InfoRow icon={Store} label="Registration" value={brand.businessRegistrationStatus || "—"} />
                <InfoRow icon={RotateCcw} label="Verification Attempts" value={brand.verificationAttemptCount ?? 0} />
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
      </div>
    </div>
  );
}
