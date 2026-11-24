import { KycPathChip, ScreenChip, StrengthChip, VerifiedBadgeChips } from "../BrandStageChips";
import { useBrandRaw, useStatusRaw } from "./hooks";
import { Chip } from "./shared";
import { approvalState } from "./util";

/* -------------------------------------------------------------------------
 * Brand detail header, onboarding v2 line (admin guide §4 item 1): legal
 * name, kycPath, the OWNER's current screen, editMode, progress, approval
 * state, verified badge and profile strength — all as the server sent them
 * (GET /brands/onboarding/status + GET /brands/get).
 * ---------------------------------------------------------------------- */

const EDIT_MODE = {
  FIRST_PASS: { label: "Onboarding", tone: "sky", title: "First pass — the vendor is filling the steps" },
  LOCKED: { label: "Locked", tone: "neutral", title: "Submitted or approved — the vendor can only add" },
  REMEDIATION: { label: "Fixing", tone: "amber", title: "Sent back — the vendor's locked fields are open" },
};

export default function BrandV2HeaderChips({ brand }) {
  const statusQuery = useStatusRaw(brand.id);
  const rawQuery = useBrandRaw(brand.id);
  const status = statusQuery.data;
  const raw = rawQuery.data;
  if (!status && !raw) return null;

  const approval = approvalState(status?.verification);
  const editMode = EDIT_MODE[status?.editMode];
  const progress = status?.progress;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {raw?.legalBusinessName && (
        <p className="truncate text-[12px] text-neutral-500">
          Legal name: <span className="font-medium capitalize text-neutral-700 dark:text-neutral-300">{raw.legalBusinessName}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone={approval.tone} title="Admin decision (status.verification)">{approval.label}</Chip>
        {status?.kycPath && <KycPathChip kycPath={status.kycPath} />}
        <ScreenChip screen={status?.currentScreen} />
        {editMode && (
          <Chip tone={editMode.tone} title={editMode.title}>
            {editMode.label}
          </Chip>
        )}
        {progress?.percent != null && (
          <Chip tone="neutral" title={`Step group ${progress.group} of ${progress.groupCount}`}>
            {progress.percent}% done
          </Chip>
        )}
        <VerifiedBadgeChips isVerified={raw?.isVerified ?? status?.isVerified} badgeGrantedAt={raw?.badgeGrantedAt} badgeAtRisk={Boolean(raw?.badgeAtRisk ?? brand.badgeAtRisk) || (status?.profileStrength?.badgeBlockers || []).includes("STRENGTH_BELOW_75")} />
        <StrengthChip strength={status?.profileStrength} />
      </div>
    </div>
  );
}
