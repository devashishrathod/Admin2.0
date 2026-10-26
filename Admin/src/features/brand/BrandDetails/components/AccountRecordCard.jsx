import { Check, X, History, RotateCcw } from "lucide-react";
import { CardHeader } from "./Bento";
import { cardClass, innerTile, tints, has } from "./bentoStyles";

// Raw approval/lifecycle flags + timeline from the brand detail payload
// (brand.record, see mapBrandDetail). Shown on the Overview tab.

const fmtDateTime = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// `bad` flags read red when true (rejected, revoked, deleted); the rest
// read green when true.
const RECORD_FLAGS = [
  ["isApproved", "Approved"],
  ["isReviewed", "Reviewed"],
  ["isApprovalAcknowledged", "Approval acknowledged"],
  ["isSubscribed", "Subscribed"],
  ["isActive", "Active"],
  ["isRejected", "Rejected", true],
  ["isRevoked", "Revoked", true],
  ["isDeleted", "Deleted", true],
];

export default function AccountRecordCard({ brand }) {
  const r = brand.record || {};
  const dates = [
    ["Joined", r.joinedDate],
    ["Created", r.createdAt],
    ["Top brand since", brand.isTopBrand ? r.topAddedAt : null],
    ["Last updated", r.updatedAt],
  ].filter(([, v]) => fmtDateTime(v));

  return (
    <div className={cardClass}>
      <CardHeader
        icon={History}
        tint="violet"
        title="Account record"
        subtitle="Approval flags and timeline"
        action={
          has(r.status) && (
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wider ${tints.violet}`}>
              {String(r.status).replace(/_/g, " ")}
            </span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {RECORD_FLAGS.map(([key, label, bad]) => {
          const v = r[key];
          const tint = v == null ? "neutral" : v ? (bad ? "red" : "emerald") : bad ? "neutral" : "amber";
          return (
            <div key={key} className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-semibold ${tints[tint]}`}>
              {v ? <Check size={11} className="shrink-0" /> : <X size={11} className="shrink-0" />}
              <span className="truncate" title={label}>{label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <div className={`${innerTile} flex items-center justify-between gap-3 px-3 py-2.5`}>
          <span className="flex items-center gap-2 text-[12px] text-neutral-500">
            <RotateCcw size={13} className="text-neutral-400" />
            Verification attempts
          </span>
          <span className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">{r.verificationAttemptCount ?? "—"}</span>
        </div>
        {dates.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {dates.map(([label, v]) => (
              <div key={label} className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                <p className="truncate text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200">{fmtDateTime(v)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
