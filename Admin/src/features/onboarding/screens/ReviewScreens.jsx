import { CheckCircle2, CircleDashed, MinusCircle, Pencil, Clock3, XCircle, PartyPopper, Hourglass, Send } from "lucide-react";
import { ScreenShell, StepFooter, PrimaryButton, SecondaryButton, Note, KeyValue, Section, StatusBadge, tileCls } from "../ui";
import { useStepAction } from "../useStepAction";
import { submitOnboarding } from "../services/onboardingApi";
import { buildStepper, kycPathLabel, entityLabel } from "../onboardingFlow";

const STATE_ICON = {
  DONE: <CheckCircle2 size={17} className="text-emerald-600 dark:text-emerald-400" />,
  SKIPPED: <MinusCircle size={17} className="text-amber-500" />,
  CURRENT: <CircleDashed size={17} className="text-sky-600" />,
  UPCOMING: <CircleDashed size={17} className="text-neutral-300 dark:text-neutral-600" />,
};

const CHECK_LABELS = {
  GST_VERIFIED: "GST verified",
  GST_ACTIVE: "GST active",
  PAN_VERIFIED: "PAN verified",
  GST_PAN_NAME_MATCH: "GST and PAN names match",
  BANK_VERIFIED: "Bank account verified",
  BANK_NAME_MATCH: "Bank name matches",
};

const LEVEL_TONE = { STRONG: "ok", MEDIUM: "warn", LOW: "error" };

function StrengthBar({ strength }) {
  if (!strength || strength.score == null) return null;
  const score = Math.max(0, Math.min(100, Number(strength.score) || 0));
  const todo = (strength.sections || []).flatMap((s) => s.items || []).filter((i) => i.available && !i.done && i.action);
  return (
    <Section
      title="Profile strength"
      description="How complete the brand page looks to customers. 75+ is needed for the verified badge."
      badge={<StatusBadge tone={LEVEL_TONE[strength.level] || "muted"}>{score}%{strength.level ? ` · ${String(strength.level).toLowerCase()}` : ""}</StatusBadge>}
    >
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all duration-500" style={{ width: `${score}%` }} />
      </div>
      {todo.length > 0 && (
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {todo.slice(0, 4).map((i) => (
            <li key={i.key} className="flex items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
              <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-px text-[11.5px] font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">+{i.points}</span>
              {i.action}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// Live before submit; the same checks run again on submit. Points only, no total score.
function SystemChecks({ checks }) {
  if (!checks?.length) return null;
  const passed = checks.filter((c) => c.passed && !c.skipped).length;
  const counted = checks.filter((c) => !c.skipped).length;
  return (
    <Section
      title="System checks"
      description="Run again on submit. Only advice; the verification team decides."
      badge={<StatusBadge tone={passed === counted ? "ok" : "warn"}>{passed} of {counted} passed</StatusBadge>}
    >
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 text-[13.5px] dark:bg-neutral-800/60">
            {c.skipped ? (
              <MinusCircle size={16} className="shrink-0 text-neutral-400" />
            ) : c.passed ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span className="min-w-0 flex-1 text-neutral-800 dark:text-neutral-200">{CHECK_LABELS[c.key] || c.key}</span>
            <span className="shrink-0 text-[12px] text-neutral-400">{c.skipped ? "n/a" : `${c.points} pts`}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ---- ONBOARDING_REVIEW --------------------------------------------- */
// POST /brands/onboarding/submit → UNDER_REVIEW. 422 lists what's missing.
export function ReviewScreen({ brandId, brand, status, eyebrow, onAdvance, onBack, onGoTo }) {
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
      intro="Check everything once. After submitting, the brand goes to the verification team and the system checks run again."
      error={error}
      footer={
        <StepFooter
          onBack={onBack}
          primary={
            <PrimaryButton busy={busy === "submit"} onClick={() => run("submit", () => submitOnboarding(brandId))}>
              {busy !== "submit" && <Send size={15} />} Submit for review
            </PrimaryButton>
          }
        />
      }
    >
      <Section title="Brand summary">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
          <KeyValue label="Legal name" value={brand?.legalBusinessName} />
          <KeyValue label="Brand name" value={brand?.brandName} />
          <KeyValue label="Category" value={brand?.category?.name || brand?.categoryName} />
          <KeyValue label="Business status" value={kycPathLabel(status.kycPath)} />
          <KeyValue label="Business type" value={entityLabel(brand?.businessEntityType)} />
          <KeyValue label="Owner WhatsApp" value={brand?.whatsappNumber || brand?.user?.whatsappNumber} />
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <StrengthBar strength={status.profileStrength} />
        <SystemChecks checks={status.systemChecks} />
      </div>

      {skipped.length > 0 && (
        <Note tone="warn">
          Skipped: {skipped.map((s) => s.label).join(", ")}. The brand can still be submitted; the verification team will ask for these later.
        </Note>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">All steps</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(groups).map(([group, items]) => {
            const done = items.filter((r) => r.state === "DONE" || r.state === "SKIPPED").length;
            return (
              <div key={group} className={`${tileCls} flex flex-col`}>
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-white/5">
                  <span className="text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">{group}</span>
                  <StatusBadge tone={done === items.length ? "ok" : "muted"}>
                    {done}/{items.length}
                  </StatusBadge>
                </div>
                <ul className="m-0 flex list-none flex-col p-1.5">
                  {items.map((r) => (
                    <li key={r.key} className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <span className="flex min-w-0 items-center gap-2.5 text-[14px] text-neutral-800 dark:text-neutral-200">
                        {STATE_ICON[r.state]}
                        <span className="truncate">{r.label}</span>
                        {r.state === "SKIPPED" && <StatusBadge tone="warn">Skipped</StatusBadge>}
                      </span>
                      {/* The vendor's locks don't bind the admin: every passed screen can be reopened (#25h note 2). */}
                      {r.reachable && (
                        <button
                          type="button"
                          onClick={() => onGoTo(r.key)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}

/* ---- After submit: UNDER_REVIEW / DASHBOARD ----------------------- */
export function UnderReviewScreen({ status, onOpenBrand, onOpenWaiting }) {
  const v = status.verification;
  // Approved = verification.isApproved. The vendor's screen moves to
  // DASHBOARD only when they acknowledge the approval on their first login,
  // so an approved brand can still read UNDER_REVIEW here.
  const live = status.currentScreen === "DASHBOARD" || Boolean(v.isApproved);
  const awaitingVendor = live && status.currentScreen !== "DASHBOARD";
  const Icon = live ? PartyPopper : Hourglass;
  return (
    <ScreenShell
      eyebrow={live ? "Onboarding complete" : "Submitted"}
      title={live ? "The brand is live" : "Submitted for review"}
      intro={
        live
          ? awaitingVendor
            ? "The brand is approved — manage it from Live Brands. The vendor sees the approval (and confirms an offline deed) on their first login; nothing to do here."
            : "Verification is done and the brand is approved. Manage it from Live Brands."
          : "The brand is now with the verification team. It shows in Brand Waiting until it's approved or sent back for changes."
      }
      footer={
        <>
          <div />
          <div className="flex flex-wrap gap-2">
            {!live && (
              <SecondaryButton onClick={onOpenWaiting}>
                <Clock3 size={14} /> Open Brand Waiting
              </SecondaryButton>
            )}
            <PrimaryButton onClick={onOpenBrand}>Open brand</PrimaryButton>
          </div>
        </>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br from-emerald-50 to-white px-6 py-8 text-center dark:from-emerald-400/10 dark:to-transparent">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_30px_rgba(5,150,105,0.35)]">
          <Icon size={28} />
        </span>
        <p className="m-0 max-w-[460px] text-[14.5px] text-neutral-600 dark:text-neutral-300">
          {live ? "No more onboarding steps." : "If the team sends it back, the brand returns to onboarding with the reason shown. Open it again from New Onboarding."}
        </p>
      </div>
      {(status.submittedAt || v.attemptNumber > 0 || v.status) && (
        <Section title="Submission">
          <div className="grid gap-4 sm:grid-cols-3">
            {status.submittedAt && <KeyValue label="Submitted at" value={new Date(status.submittedAt).toLocaleString("en-IN")} />}
            {v.attemptNumber > 0 && <KeyValue label="Attempt" value={String(v.attemptNumber)} />}
            {v.status && <KeyValue label="Review status" value={String(v.status).replace(/_/g, " ").toLowerCase()} />}
          </div>
        </Section>
      )}
      <SystemChecks checks={status.systemChecks} />
    </ScreenShell>
  );
}
