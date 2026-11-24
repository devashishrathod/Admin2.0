import { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  History,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  BadgeX,
  ScrollText,
  PenLine,
  FileCheck2,
  MapPin,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useVerificationHistory } from "../../newOnboarding/queries/onboardingReviewQueries";
import { kycPathLabel } from "../../onboarding/onboardingFlow";
import { isNotFoundMessage } from "../../../utils/helpers";
import Loader from "../../../components/common/Loader";
import { V2Card, Chip, Btn } from "./shared";
import { fmtDateTime, humanize } from "./util";

/* -------------------------------------------------------------------------
 * Verification timeline (admin guide §4 item 8) — GET
 * /brands/verifications/history?brandId= (#25), newest first. Every row
 * shows the action, who did it (`performedByUser.name`; SYSTEM rows have
 * none), `reason` (note / reject / revoke reason all live here — #25 note
 * 0), `previousStatus → newStatus` and a short line read from `metadata`.
 * With `systemVerifyId` the admin can narrow it to one attempt (server
 * filter, not a browser one).
 * ---------------------------------------------------------------------- */

const PAGE_SIZE = 20;

const ACTIONS = {
  SYSTEM_VERIFIED: { icon: ShieldCheck, tone: "violet", title: "Submitted — system check ran" },
  RESUBMITTED: { icon: RotateCcw, tone: "sky", title: "Resubmitted" },
  DETAIL_ADDED: { icon: PlusCircle, tone: "sky", title: "Detail added after submit" },
  REMEDIATION_UPDATED: { icon: FileText, tone: "sky", title: "Vendor fixed a section" },
  REVIEWED: { icon: Eye, tone: "sky", title: "Marked as reviewed" },
  UNREVIEWED: { icon: Eye, tone: "neutral", title: "Reviewed flag cleared" },
  APPROVED: { icon: CheckCircle2, tone: "emerald", title: "Approved" },
  REJECTED: { icon: XCircle, tone: "red", title: "Rejected" },
  REVOKED: { icon: XCircle, tone: "red", title: "Approval revoked" },
  APPROVAL_ACKNOWLEDGED: { icon: CheckCircle2, tone: "emerald", title: "Vendor saw the approval" },
  BADGE_GRANTED: { icon: BadgeCheck, tone: "emerald", title: "Verified badge granted" },
  BADGE_REMOVED: { icon: BadgeX, tone: "amber", title: "Verified badge removed" },
  DEED_ACCEPTED: { icon: ScrollText, tone: "emerald", title: "Partnership deed recorded" },
  DEED_CONFIRMED: { icon: ScrollText, tone: "emerald", title: "Vendor confirmed the deed" },
  LEGAL_EDIT_BY_ADMIN: { icon: PenLine, tone: "violet", title: "Legal details edited by admin" },
  DOCUMENT_REVIEWED: { icon: FileCheck2, tone: "sky", title: "Document reviewed" },
  BILLING_ADDRESS_CHANGED: { icon: MapPin, tone: "sky", title: "Billing address changed" },
};

const ACTOR_TONE = { ADMIN: "sky", VENDOR: "amber", SYSTEM: "neutral" };

const DOT_TONES = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
};

const list = (v) => (Array.isArray(v) ? v.map(humanize).join(", ") : humanize(v));

/** One readable line from the row's metadata (only keys the doc / stage send). */
function describe(row) {
  const m = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const parts = [];
  switch (row.action) {
    case "SYSTEM_VERIFIED":
    case "RESUBMITTED":
      if (m.kycPath) parts.push(kycPathLabel(m.kycPath));
      if (m.systemStatus) parts.push(`system advice: ${humanize(m.systemStatus)}`);
      if (m.skippedItems?.length) parts.push(`skipped: ${list(m.skippedItems)}`);
      break;
    case "DETAIL_ADDED":
      if (m.item) parts.push(`Added ${humanize(m.item)}`);
      if (m.latestScore != null) parts.push(`new score ${m.latestScore}${m.latestStatus ? ` (${humanize(m.latestStatus)})` : ""}`);
      break;
    case "REMEDIATION_UPDATED":
    case "LEGAL_EDIT_BY_ADMIN":
      if (m.section) parts.push(humanize(m.section));
      if (m.changeType) parts.push(humanize(m.changeType).toLowerCase());
      if (m.fields?.length) parts.push(`fields: ${list(m.fields)}`);
      break;
    case "APPROVED":
    case "REJECTED":
    case "REVOKED":
      if (m.systemScore != null) parts.push(`system score ${m.systemScore}`);
      if (m.manualOverride) parts.push("decided over the system's advice");
      break;
    case "APPROVAL_ACKNOWLEDGED":
      if (m.newScreen) parts.push(`vendor moved to ${humanize(m.newScreen)}`);
      break;
    case "BADGE_GRANTED":
    case "BADGE_REMOVED":
      if (m.automatic) parts.push("removed automatically by the reject / revoke");
      if (m.strengthScore != null) parts.push(`strength ${m.strengthScore}${m.strengthLevel ? ` (${humanize(m.strengthLevel)})` : ""}`);
      if (m.badgeBlockers?.length) parts.push(`blockers: ${list(m.badgeBlockers)}`);
      break;
    case "DEED_ACCEPTED":
    case "DEED_CONFIRMED":
      if (m.mode) parts.push(humanize(m.mode));
      if (m.version) parts.push(`version ${m.version}`);
      if (m.replaced) parts.push("proof replaced");
      break;
    case "DOCUMENT_REVIEWED":
      if (m.documentType || m.type) parts.push(humanize(m.documentType || m.type));
      if (m.status || m.reviewStatus) parts.push(humanize(m.status || m.reviewStatus));
      break;
    default:
      break;
  }
  return parts.join(" · ");
}

/** Flat key → value pairs for the "Details" drawer; links are never shown. */
function metadataPairs(metadata) {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata)
    .filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => {
      let text;
      if (typeof v === "string") text = /^https?:\/\//i.test(v) ? "(link hidden)" : v;
      else if (typeof v === "object") text = JSON.stringify(v).replace(/https?:\/\/[^"\s]+/gi, "(link hidden)");
      else text = String(v);
      return [k, text];
    });
}

function Row({ row, isLast }) {
  const [open, setOpen] = useState(false);
  const meta = ACTIONS[row.action] || { icon: History, tone: "neutral", title: humanize(row.action) || "Event" };
  const Icon = meta.icon;
  const who = row.performedByUser?.name || (row.performedByType === "SYSTEM" ? "System" : humanize(row.performedByType)) || "Unknown";
  const line = describe(row);
  const pairs = metadataPairs(row.metadata);
  const hasStatus = row.previousStatus || row.newStatus;

  return (
    <li className={`relative flex gap-3 ${isLast ? "" : "pb-5"}`}>
      {!isLast && <span className="absolute bottom-0 left-3.5 top-8 w-px bg-neutral-200 dark:bg-neutral-800" />}
      <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${DOT_TONES[meta.tone]}`}>
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{meta.title}</p>
          <Chip tone={ACTOR_TONE[row.performedByType] || "neutral"}>{humanize(row.performedByType) || "—"}</Chip>
          {row.attemptNumber != null && <Chip tone="neutral">Attempt #{row.attemptNumber}</Chip>}
          {row.score != null && <Chip tone="neutral">Score {row.score}</Chip>}
        </div>
        <p className="mt-0.5 text-[11.5px] text-neutral-500">
          by <span className="font-medium text-neutral-700 dark:text-neutral-300">{who}</span> · {fmtDateTime(row.createdAt) || "—"}
          {hasStatus ? ` · ${humanize(row.previousStatus) || "—"} → ${humanize(row.newStatus) || "—"}` : ""}
        </p>
        {line && <p className="mt-1 text-[12px] text-neutral-600 dark:text-neutral-400">{line}</p>}
        {row.reason && (
          <p className="mt-1.5 rounded-xl bg-neutral-100/80 px-3 py-2 text-[12px] text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
            “{row.reason}”
          </p>
        )}
        {pairs.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Details <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
        {open && (
          <dl className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-1 rounded-xl bg-neutral-50 px-3 py-2 text-[11.5px] sm:grid-cols-[max-content_1fr] dark:bg-neutral-950/60">
            {pairs.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium text-neutral-500">{k}</dt>
                <dd className="min-w-0 break-words text-neutral-700 dark:text-neutral-300">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

export default function VerificationTimeline({ brandId, systemVerifyId = null }) {
  const [page, setPage] = useState(1);
  const [onlyAttempt, setOnlyAttempt] = useState(false);
  const params = { brandId, page, limit: PAGE_SIZE, sortOrder: "DESC" };
  if (onlyAttempt && systemVerifyId) params.systemVerifyId = systemVerifyId;
  const query = useVerificationHistory(params, { placeholderData: keepPreviousData });

  const rows = query.data?.data?.data ?? [];
  const total = query.data?.data?.total ?? rows.length;
  const totalPages = query.data?.data?.totalPages ?? 1;
  const notFound = query.error && isNotFoundMessage(query.error.message);

  const scopeToggle = systemVerifyId ? (
    <div className="flex gap-1 rounded-full bg-neutral-100 p-0.5 text-[11.5px] font-medium dark:bg-neutral-800">
      {[
        [false, "All attempts"],
        [true, "This attempt"],
      ].map(([val, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => {
            setOnlyAttempt(val);
            setPage(1);
          }}
          className={`rounded-full px-2.5 py-1 ${onlyAttempt === val ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50" : "text-neutral-500"}`}
        >
          {label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <V2Card icon={History} tint="violet" title="Timeline" subtitle={total ? `${total} event${total === 1 ? "" : "s"} · newest first` : "Review history"} action={scopeToggle}>
      {query.isLoading ? (
        <Loader variant="inline" label="Loading the timeline…" />
      ) : query.error && !notFound ? (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-red-600 dark:text-red-400">
          {query.error.message}
          <Btn onClick={() => query.refetch()}>
            <RefreshCw size={12} /> Try again
          </Btn>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[12.5px] text-neutral-500">No events yet — the history starts when the vendor submits.</p>
      ) : (
        <>
          <ol className="px-1">
            {rows.map((row, i) => (
              <Row key={row._id} row={row} isLast={i === rows.length - 1} />
            ))}
          </ol>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 border-t border-neutral-200/70 pt-3 dark:border-neutral-800">
              <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Btn>
              <span className="text-[12px] text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <Btn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Btn>
            </div>
          )}
        </>
      )}
    </V2Card>
  );
}
