import { BadgeCheck, AlertTriangle } from "lucide-react";
import { KYC_PATH_LABELS, WAITING_CHIPS, STRENGTH_LEVELS, formatScreenLabel } from "./brandStage";

/* Small chips for the v2 list rows (admin guide §3). Each renders nothing
   when the server sent no value, so a row never shows a made-up state. */

const TONES = {
  amber: "bg-amber-400/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  emerald: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

function Chip({ tone = "neutral", title, children }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/** GST / Registered, no GST / Not registered. */
export function KycPathChip({ kycPath }) {
  if (!kycPath) return null;
  return (
    <Chip tone="violet" title="KYC path">
      {KYC_PATH_LABELS[kycPath] || kycPath}
    </Chip>
  );
}

/** WAITING tab status chip (server's waitingChip). */
export function WaitingChip({ chip }) {
  if (!chip) return null;
  const meta = WAITING_CHIPS[chip] || { label: formatScreenLabel(chip), tone: "neutral" };
  return <Chip tone={meta.tone}>{meta.label}</Chip>;
}

/** Profile strength { score, level } from the list row. */
export function StrengthChip({ strength }) {
  if (!strength || strength.score == null) return null;
  const meta = STRENGTH_LEVELS[strength.level] || { label: strength.level || "", tone: "neutral" };
  return (
    <Chip tone={meta.tone} title="Profile strength">
      Strength {strength.score}
      {meta.label ? ` · ${meta.label}` : ""}
    </Chip>
  );
}

/** The vendor's current onboarding screen (NEW tab: "kahan atka hai"). */
export function ScreenChip({ screen }) {
  if (!screen) return null;
  return (
    <Chip tone="sky" title="Vendor's current screen">
      {formatScreenLabel(screen)}
    </Chip>
  );
}

/** Verified badge (isVerified) + at-risk warning — never derived from approval (§11). */
export function VerifiedBadgeChips({ isVerified, badgeGrantedAt, badgeAtRisk }) {
  if (!isVerified) return null;
  const since = badgeGrantedAt ? new Date(badgeGrantedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;
  return (
    <>
      <Chip tone="emerald" title={since ? `Verified badge since ${since}` : "Verified badge"}>
        <BadgeCheck size={11} /> Verified
      </Chip>
      {badgeAtRisk && (
        <Chip tone="amber" title="Badge kept, but profile strength fell below 75">
          <AlertTriangle size={11} /> Badge at risk
        </Chip>
      )}
    </>
  );
}

/** Every subcategory of the brand (subCategories[] in the brand's order). */
export function SubCategoryChips({ names, max = 3 }) {
  if (!names?.length) return null;
  const shown = names.slice(0, max);
  return (
    <>
      {shown.map((n) => (
        <Chip key={n}>{n}</Chip>
      ))}
      {names.length > max && <Chip title={names.slice(max).join(", ")}>+{names.length - max}</Chip>}
    </>
  );
}
