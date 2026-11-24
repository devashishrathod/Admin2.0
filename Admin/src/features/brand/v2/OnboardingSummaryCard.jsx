import { ListChecks, CheckCircle2, MinusCircle, CircleDashed, Eye, EyeOff } from "lucide-react";
import { GROUP_LABELS, screenMeta, kycPathLabel } from "../../onboarding/onboardingFlow";
import { formatScreenLabel } from "../brandStage";
import Loader from "../../../components/common/Loader";
import { useStatusRaw } from "./hooks";
import { V2Card, Chip, KV } from "./shared";
import { approvalState, fmtDateTime, humanize } from "./util";

/* -------------------------------------------------------------------------
 * Onboarding steps checklist (admin guide §4 item 2). Every state comes
 * from GET /brands/onboarding/status — `groups[].screens[].status`
 * (DONE / SKIPPED / MISSING, only the brand's path) and `items` — so the
 * panel never decides what "done" means.
 * ---------------------------------------------------------------------- */

const GROUP_TONE = { DONE: "emerald", IN_PROGRESS: "sky", UPCOMING: "neutral" };
const SCREEN_ICON = { DONE: CheckCircle2, SKIPPED: MinusCircle, MISSING: CircleDashed };

const ITEM_LABELS = { gst: "GST", pan: "PAN", ownerVerification: "Owner verification", documents: "Business documents", bank: "Bank account" };
const ITEM_TONE = { PROVIDED: "emerald", SKIPPED: "amber", NOT_STARTED: "neutral", NOT_APPLICABLE: "neutral" };

const VISIBILITY_REASONS = {
  BRAND_NOT_LIVE: "Not approved / active",
  NO_OUTLET: "No active outlet",
  NO_LOCATED_OUTLET: "No outlet with an address",
  NO_VERIFIED_OUTLET: "No outlet with a verified manager",
  NO_VISIBLE_SHOWCASE: "No visible showcase album",
};

export default function OnboardingSummaryCard({ brandId }) {
  const query = useStatusRaw(brandId);
  const status = query.data;

  if (query.isPending) {
    return (
      <V2Card icon={ListChecks} title="Onboarding" subtitle="GET /brands/onboarding/status">
        <Loader variant="inline" label="Loading onboarding…" />
      </V2Card>
    );
  }
  if (!status) {
    return (
      <V2Card icon={ListChecks} tint="red" title="Onboarding" subtitle="Couldn't load the onboarding status">
        <p className="text-[12.5px] text-red-600 dark:text-red-400">{query.error?.message || "No status."}</p>
      </V2Card>
    );
  }

  const v = status.verification || {};
  const approval = approvalState(v);
  const items = status.items || {};
  const hints = status.customerVisibilityHints;

  return (
    <V2Card
      icon={ListChecks}
      title="Onboarding"
      subtitle={`${kycPathLabel(status.kycPath)} · owner on ${formatScreenLabel(status.currentScreen) || "—"}`}
      action={<Chip tone={approval.tone}>{approval.label}</Chip>}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KV label="Owner's screen" value={formatScreenLabel(status.currentScreen)} />
        <KV label="Edit mode" value={humanize(status.editMode)} />
        <KV label="Progress" value={status.progress?.percent != null ? `${status.progress.percent}%` : null} />
        <KV label="First submitted" value={fmtDateTime(v.submittedAt)} empty="Not submitted" />
        <KV label="Attempt" value={v.attemptNumber ? `#${v.attemptNumber}` : null} empty="None yet" />
        <KV label="Edit lock" value={humanize(status.editLock)} empty="None" />
        <KV label="Billing address" value={status.hasBillingAddress ? "Saved" : null} empty="Missing" />
        <KV label="Owner ID / docs" value={items.documentCount != null ? `${items.documentCount} document${items.documentCount === 1 ? "" : "s"}` : null} />
      </div>

      {(v.rejectionReason || v.revokeReason) && (
        <p className="mt-3 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-700 dark:text-red-300">
          {v.isRevoked ? "Revoke reason" : "Reject reason"}: {v.revokeReason || v.rejectionReason}
        </p>
      )}

      {/* Steps — the brand's own path, in the server's order */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(status.groups || []).map((g) => (
          <div key={g.key} className="rounded-2xl bg-white/60 p-3 ring-1 ring-neutral-200/60 dark:bg-neutral-950/40 dark:ring-white/5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">{GROUP_LABELS[g.key] || humanize(g.key)}</p>
              <Chip tone={GROUP_TONE[g.state] || "neutral"}>{humanize(g.state)}</Chip>
            </div>
            <ul className="space-y-1">
              {(g.screens || []).map((s) => {
                const Icon = SCREEN_ICON[s.status] || CircleDashed;
                const current = s.screen === status.currentScreen;
                return (
                  <li key={s.screen} className="flex items-center gap-2 text-[12.5px]">
                    <Icon size={14} className={s.status === "DONE" ? "text-emerald-500" : s.status === "SKIPPED" ? "text-amber-500" : "text-neutral-400"} />
                    <span className={`min-w-0 flex-1 truncate ${current ? "font-semibold text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-300"}`}>
                      {screenMeta(s.screen)?.label || formatScreenLabel(s.screen)}
                    </span>
                    {current && <Chip tone="sky">Owner here</Chip>}
                    {s.status === "SKIPPED" && <Chip tone="amber">Skipped</Chip>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* KYC items */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.entries(ITEM_LABELS).map(([key, label]) =>
          items[key] ? (
            <Chip key={key} tone={ITEM_TONE[items[key]] || "neutral"} title={items[key]}>
              {label}: {humanize(items[key])}
              {key === "ownerVerification" && items.ownerVerificationMethod ? ` (${humanize(items.ownerVerificationMethod)})` : ""}
            </Chip>
          ) : null
        )}
      </div>

      {hints && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
          {hints.isVisible ? <Eye size={13} className="text-emerald-500" /> : <EyeOff size={13} className="text-amber-500" />}
          <span>{hints.isVisible ? "Customers can see this brand." : "Customers can't see this brand:"}</span>
          {(hints.reasons || []).map((r) => (
            <Chip key={r} tone="amber">{VISIBILITY_REASONS[r] || humanize(r)}</Chip>
          ))}
        </div>
      )}
    </V2Card>
  );
}
