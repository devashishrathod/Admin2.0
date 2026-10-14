import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, MinusCircle, Pencil, Clock3 } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Note, KeyValue } from "../ui";
import { useStepAction } from "../useStepAction";
import { submitOnboarding, getProfileStrength } from "../services/onboardingApi";
import { buildStepper } from "../onboardingFlow";

const STATE_ICON = {
  DONE: <CheckCircle2 size={16} className="text-[#0B6E5A]" />,
  SKIPPED: <MinusCircle size={16} className="text-[#B26A00]" />,
  CURRENT: <CircleDashed size={16} className="text-[#1F4FB8]" />,
  UPCOMING: <CircleDashed size={16} className="text-[#9AA0A9]" />,
};

function useProfileStrength(brandId) {
  const [strength, setStrength] = useState(null);
  useEffect(() => {
    let cancelled = false;
    getProfileStrength(brandId)
      .then((res) => !cancelled && setStrength(res?.data ?? res))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [brandId]);
  return strength;
}

function StrengthBar({ strength }) {
  if (!strength || strength.score == null) return null;
  const score = Math.max(0, Math.min(100, Number(strength.score) || 0));
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#E2E3DE] p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between text-[14px]">
        <span className="font-semibold">Profile strength</span>
        <span className="text-[#5B616E]">{score}%{strength.level ? ` · ${strength.level}` : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#EDEEE9] dark:bg-neutral-800">
        <div className="h-full rounded-full bg-[#0B6E5A]" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/* ---- 15 · ONBOARDING_REVIEW --------------------------------------- */
// POST /brands/onboarding/submit → UNDER_REVIEW. 422 lists what's missing.
export function ReviewScreen({ brandId, brand, status, eyebrow, onAdvance, onBack, onGoTo }) {
  const strength = useProfileStrength(brandId);
  const { run, busy, error } = useStepAction(onAdvance);
  const rows = buildStepper(status, "ONBOARDING_REVIEW").filter((r) => r.key !== "ONBOARDING_REVIEW");
  const skipped = rows.filter((r) => r.state === "SKIPPED");
  const groups = rows.reduce((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  return (
    <ScreenShell
      eyebrow={eyebrow}
      title="Review and submit"
      intro="Check everything once. After submitting, the brand goes to the verification team; PAN, GST and bank are re-checked automatically."
      error={error}
      footer={<StepFooter onBack={onBack} primary={<PrimaryButton busy={busy === "submit"} onClick={() => run("submit", () => submitOnboarding(brandId))}>Submit for review</PrimaryButton>} />}
    >
      <div className="grid gap-4 rounded-xl border border-[#E2E3DE] p-4 sm:grid-cols-3 dark:border-neutral-800">
        <KeyValue label="Legal name" value={brand?.legalBusinessName} />
        <KeyValue label="Brand name" value={brand?.brandName} />
        <KeyValue label="Category" value={brand?.subCategory?.name || brand?.category?.name} />
        <KeyValue label="Registration" value={status.kycPath === "UNREGISTERED" ? "Not registered" : "Registered"} />
        <KeyValue label="Entity type" value={brand?.businessEntityType} />
        <KeyValue label="Owner WhatsApp" value={brand?.whatsappNumber || brand?.user?.whatsappNumber} />
      </div>

      <StrengthBar strength={strength} />

      {skipped.length > 0 && (
        <Note tone="warn">
          Skipped: {skipped.map((s) => s.label).join(", ")}. The brand can still be submitted — the verification team will ask for these later.
        </Note>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#5B616E]">{group}</span>
            <ul className="m-0 list-none divide-y divide-[#EDEEE9] rounded-xl border border-[#E2E3DE] p-0 dark:divide-neutral-800 dark:border-neutral-800">
              {items.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2.5 text-[14px]">
                    {STATE_ICON[r.state]} {r.label}
                    {r.state === "SKIPPED" && <span className="rounded-full bg-[#FFF4E0] px-2 py-0.5 text-[11.5px] font-semibold text-[#7A4800]">Skipped</span>}
                  </span>
                  {r.reachable && r.key !== "SUBSCRIBE_PLAN" && r.key !== "PARTNERSHIP_DEED" && (
                    <button type="button" onClick={() => onGoTo(r.key)} className="inline-flex items-center gap-1 text-[13px] font-medium text-[#0B6E5A] hover:underline">
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
}

/* ---- After submit: UNDER_REVIEW / DASHBOARD ----------------------- */
export function UnderReviewScreen({ status, onOpenBrand, onOpenWaiting }) {
  const live = status.currentScreen === "DASHBOARD";
  return (
    <ScreenShell
      eyebrow={live ? "Onboarding complete" : "Submitted"}
      title={live ? "The brand is live" : "Submitted for review"}
      intro={
        live
          ? "Verification is done and the brand is approved. Manage it from Live Brands."
          : "The brand is now with the verification team. It shows in Brand Waiting until it's approved or sent back for changes."
      }
      footer={
        <>
          <div />
          <div className="flex flex-wrap gap-2">
            {!live && <SecondaryButton onClick={onOpenWaiting}><Clock3 size={14} /> Open Brand Waiting</SecondaryButton>}
            <PrimaryButton onClick={onOpenBrand}>Open brand</PrimaryButton>
          </div>
        </>
      }
    >
      {status.submittedAt && <KeyValue label="Submitted at" value={new Date(status.submittedAt).toLocaleString("en-IN")} />}
      <Note tone={live ? "ok" : "info"}>
        {live ? "No more onboarding steps." : "If the team sends it back, the brand returns to onboarding with the steps to fix marked — open it again from New Onboarding."}
      </Note>
    </ScreenShell>
  );
}
