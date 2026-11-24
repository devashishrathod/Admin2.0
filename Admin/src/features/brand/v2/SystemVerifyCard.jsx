import { ShieldCheck, CheckCircle2, XCircle, MinusCircle, Info, AlertTriangle } from "lucide-react";
import { kycPathLabel } from "../../onboarding/onboardingFlow";
import Loader from "../../../components/common/Loader";
import { OWNER_ID_MANUAL_NOTE, ownerIdManual } from "../../newOnboarding/verificationData";
import { useBrandRaw, useStatusRaw } from "./hooks";
import { V2Card, Chip, KV } from "./shared";
import { fmtDateTime, humanize } from "./util";

/* -------------------------------------------------------------------------
 * System verification block (admin guide §4 item 7). Source: GET
 * /brands/get → `systemVerify` — the current attempt's kycPath, checks[],
 * skippedItems, remarkCodes / remarks, latestScore / latestStatus and the
 * match details. Before the first submit there is no attempt (`null`), so
 * the path's checks come from GET /brands/onboarding/status → systemChecks.
 *
 * Advice only: the system never approves or rejects a brand (§4 ⚠️). No
 * score colours, no thresholds, no checklist of our own.
 * ---------------------------------------------------------------------- */

const CHECK_LABELS = {
  GST_VERIFIED: "GST verified",
  GST_ACTIVE: "GST active",
  PAN_VERIFIED: "PAN verified",
  GST_PAN_NAME_MATCH: "GST name matches PAN name",
  BANK_VERIFIED: "Bank verified",
  BANK_NAME_MATCH: "Bank holder name matches",
};

const REMARK_LABELS = {
  CHECK_FAILED: "A check failed",
  BANK_SKIPPED: "Bank skipped by the vendor",
  DOCUMENTS_SKIPPED: "Documents skipped by the vendor",
  DOCUMENTS_PROVIDED: "Documents provided",
  OWNER_ID_MANUAL: "Owner ID — check by hand",
  ENTITY_DIFFERS_FROM_PAN_TYPE: "Entity differs from the PAN type",
  GST_CONSTITUTION_UNMAPPED: "GST constitution not mapped",
  DUPLICATE_WHATSAPP: "WhatsApp used by another brand",
  DUPLICATE_EMAIL: "Email used by another brand",
};

const VERDICT_LABELS = {
  APPROVED: "Looks good",
  MANUAL_REVIEW: "Needs a manual check",
  REJECTED: "Found problems",
};

const DUPLICATE_GROUPS = [
  ["PAN", "panBrandIds"],
  ["GST", "gstBrandIds"],
  ["Bank", "bankBrandIds"],
  ["WhatsApp", "whatsappBrandIds"],
  ["Email", "emailBrandIds"],
];

function CheckRow({ check, note }) {
  const state = check.passed ? "passed" : check.skipped ? "skipped" : "failed";
  const Icon = state === "passed" ? CheckCircle2 : state === "skipped" ? MinusCircle : XCircle;
  const tone = state === "passed" ? "emerald" : state === "skipped" ? "amber" : "red";
  return (
    <li className="flex items-start gap-2.5 rounded-xl bg-white/60 px-3 py-2 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
      <Icon size={15} className={`mt-0.5 shrink-0 ${tone === "emerald" ? "text-emerald-500" : tone === "amber" ? "text-amber-500" : "text-red-500"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium text-neutral-800 dark:text-neutral-100">
          {CHECK_LABELS[check.key] || humanize(check.key)}
          {state === "failed" && check.key === "PAN_VERIFIED" ? " — not verified" : ""}
        </p>
        {note && <p className="mt-0.5 text-[11.5px] text-amber-700 dark:text-amber-300">{note}</p>}
      </div>
      <Chip tone={tone}>{state === "passed" ? "Passed" : state === "skipped" ? "Skipped by vendor" : "Failed"}</Chip>
      <span className="w-14 shrink-0 text-right text-[11.5px] tabular-nums text-neutral-500">
        {check.points ?? 0}
        {check.max != null ? `/${check.max}` : " pts"}
      </span>
    </li>
  );
}

export default function SystemVerifyCard({ brandId }) {
  const rawQuery = useBrandRaw(brandId);
  const statusQuery = useStatusRaw(brandId);
  const sv = rawQuery.data?.systemVerify ?? null;
  const status = statusQuery.data;

  if (rawQuery.isPending) {
    return (
      <V2Card icon={ShieldCheck} tint="sky" title="System check" subtitle="Advice only">
        <Loader variant="inline" label="Loading the system check…" />
      </V2Card>
    );
  }

  // Before the first submit: the path's checks from the onboarding status.
  if (!sv) {
    const checks = status?.systemChecks || [];
    return (
      <V2Card icon={ShieldCheck} tint="sky" title="System check" subtitle="Advice only · runs when the vendor submits">
        {checks.length ? (
          <>
            <p className="mb-2 text-[12px] text-neutral-500">
              Not submitted yet. These {kycPathLabel(status?.kycPath)} checks will count:
            </p>
            <ul className="space-y-1.5">
              {checks.map((c) => (
                <CheckRow key={c.key} check={c} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[12.5px] text-neutral-500">No system check yet — the vendor hasn't chosen a KYC path.</p>
        )}
      </V2Card>
    );
  }

  const verdict = sv.latestStatus || sv.status;
  const score = sv.latestScore ?? sv.score;
  const rescored = sv.latestScore != null && sv.score != null && sv.latestScore !== sv.score;
  const remarkCodes = sv.remarkCodes || [];
  const ownerIdNote = ownerIdManual(remarkCodes) ? OWNER_ID_MANUAL_NOTE : null;
  const duplicates = DUPLICATE_GROUPS.map(([label, key]) => [label, sv.duplicateDetails?.[key] || []]).filter(([, ids]) => ids.length);
  const nm = sv.nameMatch || {};
  const bm = sv.bankNameMatch || {};
  const em = sv.entityMatch || {};

  return (
    <V2Card
      icon={ShieldCheck}
      tint="sky"
      title="System check"
      subtitle={`Attempt #${sv.attemptNumber ?? "—"} · ${kycPathLabel(sv.kycPath)}`}
      action={
        <Chip tone="neutral" title="The system's verdict is advice — the decision is the admin's">
          Advice only{verdict ? ` · ${VERDICT_LABELS[verdict] || humanize(verdict)}` : ""}
        </Chip>
      }
    >
      <p className="mb-3 flex items-start gap-2 rounded-xl bg-neutral-500/5 px-3 py-2 text-[12px] text-neutral-600 dark:text-neutral-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        The system check never approves or rejects a brand. The decision is yours.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KV label="Score" value={score != null ? `${score}/100` : null} />
        <KV label="Score at submit" value={rescored ? `${sv.score}/100` : null} empty="Same" />
        <KV label="Last scored" value={fmtDateTime(sv.latestScoredAt || sv.createdAt)} />
        <KV label="Skipped by vendor" value={(sv.skippedItems || []).map(humanize).join(", ")} empty="Nothing" />
      </div>

      {(sv.checks || []).length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {sv.checks.map((c) => (
            <CheckRow key={c.key} check={c} note={c.key === "PAN_VERIFIED" && !c.passed ? ownerIdNote : null} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-neutral-500">This attempt is from before onboarding v2 — it has no path-wise checks.</p>
      )}

      {remarkCodes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {remarkCodes.map((code) => (
            <Chip key={code} tone={code === "DOCUMENTS_PROVIDED" ? "emerald" : "amber"} title={code}>
              {REMARK_LABELS[code] || humanize(code)}
            </Chip>
          ))}
        </div>
      )}

      {(sv.remarks || []).length > 0 && (
        <ul className="mt-3 space-y-1">
          {sv.remarks.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-neutral-600 dark:text-neutral-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-500" />
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KV label="PAN ↔ GST name" value={nm.panGstScore != null ? `${nm.panGstScore}/100` : null} empty="—" />
        <KV label="Bank name (best)" value={bm.highestScore != null ? `${bm.highestScore}/100` : null} empty="—" />
        <KV label="GST constitution" value={em.gstConstitution} empty="—" />
        <KV label="Entity">
          {em.brandEntityType ? (
            <span className="inline-flex items-center gap-1.5">
              {humanize(em.brandEntityType)}
              <Chip tone={em.matched ? "emerald" : "neutral"}>{em.matched ? "Matches GST" : "No match"}</Chip>
            </span>
          ) : (
            <span className="font-normal text-neutral-400">—</span>
          )}
        </KV>
      </div>

      {duplicates.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {duplicates.map(([label, ids]) => (
            <p key={label} className="rounded-xl bg-red-500/5 px-3 py-2 text-[12px] text-red-700 dark:text-red-300">
              Same {label} on {ids.length} other brand{ids.length === 1 ? "" : "s"}: <span className="break-all font-mono text-[11px]">{ids.join(", ")}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-neutral-500">No duplicates reported.</p>
      )}
    </V2Card>
  );
}
