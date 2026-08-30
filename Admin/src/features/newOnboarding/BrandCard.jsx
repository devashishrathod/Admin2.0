import React from "react";
import { CheckCircle2, XCircle, User, RefreshCcw, AlertTriangle } from "lucide-react";
import { BrandAvatar, StatusBadge } from "../brand/BrandShared";

/* -------------------------------------------------------------------------
 * Brand verification card (grid view) — shows a vendor's brand-onboarding
 * verification attempt: automated check score, key flags, vendor identity,
 * and the admin's decision (if any).
 * ---------------------------------------------------------------------- */

const STATUS_STYLES = {
  APPROVED: { badge: "Approved", accent: "from-emerald-400/25 via-emerald-400/0" },
  REJECTED: { badge: "Rejected", accent: "from-red-400/25 via-red-400/0" },
  REVOKED: { badge: "Revoked", accent: "from-orange-400/25 via-orange-400/0" },
  MANUAL_REVIEW: { badge: "Manual Review", accent: "from-amber-400/25 via-amber-400/0" },
};

function scoreColor(score) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const KEY_FLAGS = [
  { key: "panVerified", label: "PAN" },
  { key: "gstVerified", label: "GST" },
  { key: "bankVerified", label: "Bank" },
];

export default function BrandCard({ verification, onOpen }) {
  const { brand, vendor, flags } = verification;
  const statusMeta = STATUS_STYLES[verification.derivedStatus] || {
    badge: verification.derivedStatus,
    accent: "from-neutral-500/20 via-neutral-500/0",
  };

  return (
    <button
      onClick={() => onOpen(verification)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-lg hover:shadow-black/30 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      {/* Ambient accent glow */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${statusMeta.accent} opacity-70`}
      />

      <div className="relative flex flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl ring-2 ring-white dark:ring-neutral-950">
              <BrandAvatar brand={brand} />
            </div>
            <div>
              <h3 className="text-[14.5px] font-semibold leading-tight text-neutral-900 dark:text-neutral-50">
                {brand.brandName}
              </h3>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-neutral-500">
                {brand.legalBusinessName || "—"}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 text-right text-[15px] font-bold ${scoreColor(verification.score)}`}
          >
            {verification.score}
            <span className="text-[10px] font-medium text-neutral-600">/100</span>
          </span>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={statusMeta.badge} activeLabel="Approved" />
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            Attempt #{verification.attemptNumber}
          </span>
        </div>

        {/* Key verification flags */}
        <div className="mb-3 flex items-center gap-3">
          {KEY_FLAGS.map((f) => (
            <span
              key={f.key}
              className={`flex items-center gap-1 text-[11px] font-medium ${
                flags[f.key] ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400/80"
              }`}
            >
              {flags[f.key] ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {f.label}
            </span>
          ))}
        </div>

        <div className="mb-3.5 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 dark:border-neutral-800/80 dark:bg-neutral-950/60">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <User size={12} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
              {vendor?.name || "Unknown vendor"}
            </p>
            <p className="truncate text-[10px] text-neutral-500">{vendor?.mobile || vendor?.email}</p>
          </div>
        </div>

        {verification.remarks?.length > 0 && (
          <div className="mb-3.5 flex items-start gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{verification.remarks[0]}</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2.5 text-[11px] text-neutral-500 dark:bg-neutral-950/60">
          <span className="flex items-center gap-1">
            <RefreshCcw size={11} />
            {verification.submissionCount} submission{verification.submissionCount === 1 ? "" : "s"}
          </span>
          <span className="font-semibold text-emerald-600 transition-transform group-hover:translate-x-0.5 dark:text-emerald-400">
            View →
          </span>
        </div>
      </div>
    </button>
  );
}
