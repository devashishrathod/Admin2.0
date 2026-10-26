import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Briefcase,
  BadgeCheck,
  BadgeX,
  Scale,
  Landmark,
  Copy as CopyIcon,
  ListChecks,
  MessageSquareWarning,
  History,
  Building2,
  ArrowRight,
} from "lucide-react";
import { EmptyState } from "../../BrandShared";
import { CardHeader } from "../components/Bento";
import { cardClass, heroClass, innerTile, tints, has } from "../components/bentoStyles";
import ValueOr from "../../../../components/common/ValueOr";

/* -------------------------------------------------------------------------
 * System Verification — the automated KYC check (brand.systemVerify), in
 * the dashboard's bento style:
 *   row 1: Trust-score hero (5) · Checks — 9 verification flags + 5
 *          duplicate checks (7)
 *   row 2: Name match (6) · Bank name match (6)
 *   row 3: Entity match (4) · Remarks (8)  /  Review trail timeline
 * ---------------------------------------------------------------------- */

const scoreTone = (s) => (s >= 80 ? "emerald" : s >= 50 ? "amber" : "red");
const STROKE = { emerald: "stroke-emerald-500", amber: "stroke-amber-500", red: "stroke-red-500" };
const BAR = { emerald: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500" };
const TEXT = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

function Ring({ pct, size = 112, stroke = 10, tone = "emerald", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-neutral-900/10 dark:stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className={`${STROKE[tone]} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function Chip({ tint = "neutral", children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tints[tint]}`}>{children}</span>;
}

// One score line: label, %, coloured bar.
function ScoreBar({ label, value, emphasis = false }) {
  const v = Number(value);
  const known = Number.isFinite(v);
  const tone = known ? scoreTone(v) : "red";
  return (
    <div className={emphasis ? `${innerTile} px-3 py-2.5` : ""}>
      <div className="flex items-baseline justify-between gap-2 text-[12px]">
        <span className={emphasis ? "font-semibold text-neutral-800 dark:text-neutral-100" : "text-neutral-600 dark:text-neutral-300"}>{label}</span>
        <span className={`font-bold tabular-nums ${known ? TEXT[tone] : "text-neutral-400"}`}>{known ? `${v}%` : "No score"}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${known ? Math.min(100, v) : 0}%` }} />
      </div>
    </div>
  );
}

function MatchCard({ icon, tint, title, rows, summary }) {
  return (
    <div className={cardClass}>
      <CardHeader icon={icon} tint={tint} title={title} subtitle="How closely the names agree" />
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <ScoreBar key={label} label={label} value={value} />
        ))}
      </div>
      <div className="mt-auto pt-4">
        <ScoreBar label={summary[0]} value={summary[1]} emphasis />
      </div>
    </div>
  );
}

export default function SystemVerificationTab({ brand }) {
  const sv = brand.systemVerify;
  if (!sv) return <EmptyState label="No system verification record yet." />;

  const flags = sv.flags || {};
  const checks = [
    ["PAN verified", flags.panVerified],
    ["GST verified", flags.gstVerified],
    ["Bank verified", flags.bankVerified],
    ["PAN ↔ GST", flags.panMatchedWithGST],
    ["PAN ↔ Brand", flags.panMatchedWithBrand],
    ["GST ↔ Brand", flags.gstMatchedWithBrand],
    ["Bank matched", flags.bankMatched],
    ["Entity type", flags.businessEntityMatched],
    ["GST active", flags.gstActive],
  ];
  const duplicates = [
    ["WhatsApp", flags.duplicateWhatsapp],
    ["Email", flags.duplicateEmail],
    ["PAN", flags.duplicatePAN],
    ["GST", flags.duplicateGST],
    ["Bank", flags.duplicateBank],
  ];
  const passed = checks.filter(([, ok]) => ok).length;
  const dupFlagged = duplicates.filter(([, f]) => f).length;
  const tone = sv.score != null ? scoreTone(sv.score) : "red";

  // Review trail — only the events that happened, in order.
  const trail = [
    ["Record created", sv.createdAtDisplay, "neutral"],
    ["Verified", sv.verifiedAtDisplay, "sky", sv.verifiedBy && sv.verifiedBy !== "—" ? `by ${sv.verifiedBy}` : null],
    ["Reviewed", sv.reviewedAtDisplay, "sky"],
    ["Admin approved", sv.adminApprovedAtDisplay, "emerald"],
    ["Rejected", sv.rejectedAtDisplay, "red", sv.rejectionReason],
    ["Revoked", sv.revokedAtDisplay, "red", sv.revokeReason],
    ["Last updated", sv.updatedAtDisplay, "neutral"],
  ].filter(([, at]) => has(at));
  const DOT = { neutral: "bg-neutral-400", sky: "bg-sky-500", emerald: "bg-emerald-500", red: "bg-red-500" };

  return (
    <div className="space-y-4">
      {/* Row 1 — trust score · checks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className={`${heroClass} lg:col-span-5`}>
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />
          <div className="relative flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
              {tone === "red" ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />}
            </span>
            <div>
              <p className="text-[11px] font-medium text-neutral-900/60 dark:text-neutral-300">Trust score</p>
              <p className="text-[12px] font-semibold text-neutral-900/80 dark:text-neutral-200">Attempt #{sv.attemptNumber}</p>
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-5">
            <Ring pct={sv.score ?? 0} tone={tone}>
              <div className="text-center leading-none">
                <p className="text-[28px] font-bold tabular-nums text-neutral-950 dark:text-neutral-50">{sv.score ?? <span className="text-[13px] font-semibold text-neutral-400">No score</span>}</p>
                <p className="mt-1 text-[10px] font-medium text-neutral-900/50 dark:text-neutral-400">out of 100</p>
              </div>
            </Ring>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[15px] font-bold capitalize text-neutral-950 dark:text-neutral-50">{has(sv.status) ? String(sv.status).replace(/_/g, " ").toLowerCase() : "Unknown"}</p>
              <p className="text-[12px] text-neutral-900/60 dark:text-neutral-400">
                <b className="text-neutral-900 dark:text-neutral-100">{passed}</b> of {checks.length} checks passed
              </p>
              <p className="text-[12px] text-neutral-900/60 dark:text-neutral-400">
                {dupFlagged ? (
                  <span className="font-semibold text-red-600 dark:text-red-400">{dupFlagged} duplicate{dupFlagged > 1 ? "s" : ""} flagged</span>
                ) : (
                  "No duplicates found"
                )}
              </p>
            </div>
          </div>

          <div className="relative mt-auto flex flex-wrap gap-1.5 pt-5">
            <Chip tint={sv.isAdminApproved ? "emerald" : "neutral"}>{sv.isAdminApproved ? <BadgeCheck size={11} /> : null}{sv.isAdminApproved ? "Admin approved" : "Not admin approved"}</Chip>
            <Chip tint={sv.isReviewed ? "sky" : "neutral"}>{sv.isReviewed ? "Reviewed" : "Not reviewed"}</Chip>
            {sv.isRejected && <Chip tint="red">Rejected</Chip>}
            {sv.isRevoked && <Chip tint="red">Revoked</Chip>}
            {sv.isSuperseded && <Chip>Superseded</Chip>}
          </div>
        </div>

        <div className={`${cardClass} lg:col-span-7`}>
          <CardHeader icon={ListChecks} tint={passed === checks.length ? "emerald" : "amber"} title="Checks" subtitle={`${passed}/${checks.length} passed · ${dupFlagged}/${duplicates.length} duplicates`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {checks.map(([label, ok]) => (
              <div key={label} className={`${innerTile} flex items-center gap-2 px-3 py-2`}>
                {ok ? <BadgeCheck size={15} className="shrink-0 text-emerald-500" /> : <BadgeX size={15} className="shrink-0 text-red-500" />}
                <span className={`truncate text-[12px] font-medium ${ok ? "text-neutral-700 dark:text-neutral-200" : "text-red-600 dark:text-red-400"}`}>{label}</span>
              </div>
            ))}
          </div>

          <p className="mb-2 mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            <CopyIcon size={11} /> Duplicate checks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {duplicates.map(([label, flagged]) => (
              <Chip key={label} tint={flagged ? "red" : "emerald"}>
                {flagged ? <AlertTriangle size={11} /> : <BadgeCheck size={11} />}
                {label} · {flagged ? "Flagged" : "Clear"}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 — name matches */}
      {(sv.nameMatch || sv.bankNameMatch) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sv.nameMatch && (
            <MatchCard
              icon={Scale}
              tint="sky"
              title="Name match"
              rows={[
                ["PAN ↔ GST", sv.nameMatch.panGstScore],
                ["PAN ↔ Brand", sv.nameMatch.panBrandScore],
                ["GST ↔ Brand", sv.nameMatch.gstBrandScore],
              ]}
              summary={["Average", sv.nameMatch.averageScore]}
            />
          )}
          {sv.bankNameMatch && (
            <MatchCard
              icon={Landmark}
              tint="violet"
              title="Bank name match"
              rows={[
                ["Bank ↔ PAN", sv.bankNameMatch.bankPanScore],
                ["Bank ↔ GST", sv.bankNameMatch.bankGstScore],
                ["Bank ↔ Brand", sv.bankNameMatch.bankBrandScore],
              ]}
              summary={["Highest", sv.bankNameMatch.highestScore]}
            />
          )}
        </div>
      )}

      {/* Row 3 — entity · remarks · trail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {sv.entityMatch && (
          <div className={`${cardClass} lg:col-span-4`}>
            <CardHeader
              icon={Briefcase}
              tint={sv.entityMatch.matched ? "emerald" : "red"}
              title="Business entity"
              subtitle={sv.entityMatch.matched ? "GST and brand agree" : "GST and brand differ"}
            />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className={`${innerTile} px-3 py-2.5`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">GST constitution</p>
                <p className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100"><ValueOr value={sv.entityMatch.gstConstitution} fallback="Not added" /></p>
              </div>
              <div className="flex justify-center text-neutral-300 dark:text-neutral-600">
                <ArrowRight size={14} className="rotate-90" />
              </div>
              <div className={`${innerTile} px-3 py-2.5`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Brand entity type</p>
                <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">
                  <Building2 size={12} className="shrink-0 text-neutral-400" />
                  <ValueOr value={sv.entityMatch.brandEntityType} fallback="Not added" />
                </p>
              </div>
              <div className="mt-1 text-center">
                <Chip tint={sv.entityMatch.matched ? "emerald" : "red"}>
                  {sv.entityMatch.matched ? <BadgeCheck size={11} /> : <BadgeX size={11} />}
                  {sv.entityMatch.matched ? "Matched" : "Not matched"}
                </Chip>
              </div>
            </div>
          </div>
        )}

        <div className={`${cardClass} ${sv.entityMatch ? "lg:col-span-8" : "lg:col-span-12"}`}>
          <CardHeader icon={History} tint="neutral" title="Review trail" subtitle={sv.remarks?.length ? `${sv.remarks.length} remark${sv.remarks.length > 1 ? "s" : ""}` : "What happened to this record"} />

          {sv.remarks?.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {sv.remarks.map((r, i) => (
                <p key={i} className="flex items-start gap-2 rounded-2xl bg-amber-400/10 px-3 py-2 text-[12px] normal-case text-amber-800 dark:text-amber-300">
                  <MessageSquareWarning size={13} className="mt-0.5 shrink-0" /> {r}
                </p>
              ))}
            </div>
          )}

          <ol className="relative space-y-3 pl-5 before:absolute before:bottom-1.5 before:left-[7px] before:top-1.5 before:w-px before:bg-neutral-200 dark:before:bg-neutral-800">
            {trail.map(([label, at, t, note]) => (
              <li key={label} className="relative">
                <span className={`absolute -left-5 top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-neutral-900 ${DOT[t]}`} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <p className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">{label}</p>
                  <span className="text-[11px] text-neutral-400">{at}</span>
                </div>
                {has(note) && <p className="mt-0.5 text-[11.5px] normal-case text-neutral-500">{note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
