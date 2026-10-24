import { useEffect, useRef, useState } from "react";
import { Phone, Check, X, XCircle, Hourglass, ArrowUpRight, ListChecks, ChevronDown, AlertTriangle } from "lucide-react";
import { ONBOARDING_STEPS, doneStepCount, formatScreen } from "./onboardingBrand";
import { isMissing, MISSING } from "../../utils/helpers";

const STATUS_TONES = {
  amber: "bg-amber-400/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
};

// One labelled row (label left, value right) for the card's details.
function DetailRow({ label, children, muted = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11.5px] text-neutral-500">{label}</span>
      <span
        className={`min-w-0 text-right text-[12px] font-semibold ${
          muted ? "font-normal italic text-neutral-400" : "text-neutral-800 dark:text-neutral-100"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

const CARD_ACTION_TONES = {
  approve: "bg-emerald-400 text-neutral-950 hover:bg-emerald-300",
  reject: "border border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400",
};

// Small inline action inside the card. A span (not a button) because the
// card body is a <button>; stops the click so it doesn't open the brand.
function CardAction({ tone, disabled, onClick, children }) {
  const run = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) onClick();
  };
  return (
    <span
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={run}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") run(e);
      }}
      className={`flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors aria-disabled:cursor-wait aria-disabled:opacity-50 ${CARD_ACTION_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/* Onboarding card — every value has a clear label, nothing is decorative
   filler (these brands usually have no cover/logo yet). The body opens the
   brand. `status` ({ label, tone: "amber" | "red" }) replaces the
   default onboarding-progress pill. `actions` ({ onApprove, onReject?,
   busy }) adds small Approve / Reject buttons beside the Pending steps. */
export default function OnboardingCard({ brand, onOpen, now, status, actions }) {
  const [stepsOpen, setStepsOpen] = useState(false);
  // Close the floating steps panel on an outside click or Esc.
  const stepsRef = useRef(null);
  useEffect(() => {
    if (!stepsOpen) return;
    const onDown = (e) => {
      if (stepsRef.current && !stepsRef.current.contains(e.target)) setStepsOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setStepsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [stepsOpen]);
  const done = doneStepCount(brand);
  const total = ONBOARDING_STEPS.length;
  const pct = Math.round((done / total) * 100);
  const missing = ONBOARDING_STEPS.filter(([key]) => !brand.onboardingFlags?.[key]).map(([, label]) => label);
  const daysSinceJoin = brand.joinedDate
    ? Math.max(0, Math.floor((now - new Date(brand.joinedDate).getTime()) / (24 * 60 * 60 * 1000)))
    : null;
  const stale = daysSinceJoin != null && daysSinceJoin > 7;
  const hasCategory = brand.category && brand.category !== "—";
  const subCategory = brand.subCategory && brand.subCategory !== brand.category ? brand.subCategory : "";
  const toggleSteps = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStepsOpen((o) => !o);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-neutral-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/30">
    <button type="button" onClick={() => onOpen(brand)} className="flex flex-1 flex-col text-left">
      {/* Header — logo, name, ID */}
      <div className="flex w-full items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_16px_-6px_rgba(245,158,11,0.7)]">
          {brand.logo ? (
            <img src={brand.logo} alt={brand.brandName} className="h-full w-full bg-white object-cover" />
          ) : (
            <span className="text-[20px] font-bold">{brand.brandName?.charAt(0)?.toUpperCase() || "?"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{brand.brandName}</h3>
          <p className="mt-0.5 truncate text-[11.5px] text-neutral-500">
            Brand ID <span className="font-mono text-neutral-600 dark:text-neutral-300">{brand.brandId}</span>
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-emerald-400/15 group-hover:text-emerald-600 dark:bg-neutral-800 dark:text-neutral-400">
          <ArrowUpRight size={15} />
        </span>
      </div>

      {/* Status */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {status ? (
          <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[status.tone] || STATUS_TONES.amber}`}>
            {status.tone === "red" ? <XCircle size={11} /> : <Hourglass size={11} />}
            {status.label}
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <Hourglass size={11} />
            {done === 0 ? "Not started yet" : "Onboarding in progress"}
          </span>
        )}
        {stale && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle size={11} /> Waiting {daysSinceJoin} days — follow up
          </span>
        )}
      </div>

      {/* Onboarding progress */}
      <div ref={stepsRef} className="mt-3 w-full rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Onboarding progress</span>
          <span className="text-[12px] font-bold text-neutral-900 dark:text-neutral-50">
            {done} of {total} steps <span className="font-semibold text-emerald-600 dark:text-emerald-400">· {pct}%</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-2 divide-y divide-neutral-200/70 dark:divide-neutral-700/60">
          {/* Current step (left) · Next step (right) */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] text-neutral-500">Current step</p>
              <p className="mt-0.5 truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                {brand.onboardingScreen ? formatScreen(brand.onboardingScreen) : "Hasn't started"}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[11px] text-neutral-500">Next step</p>
              <p
                className={`mt-0.5 truncate text-[12.5px] font-semibold ${
                  missing.length ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {missing.length ? missing[0] : "All done"}
              </p>
            </div>
          </div>
          {(missing.length > 0 || actions) && (
            <div className="flex items-center gap-2 py-1.5">
              {missing.length > 0 && (
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] text-neutral-500">Pending ({missing.length})</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {missing.map((label) => (
                      <span
                        key={label}
                        className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-600 dark:text-red-400"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Small Approve / Reject (Brand Waiting) — spans, since the
                  whole card is already a button. */}
              {actions && (
                <div className="ml-auto flex shrink-0 flex-col items-stretch gap-1">
                  <CardAction tone="approve" disabled={actions.busy} onClick={() => actions.onApprove(brand)}>
                    <Check size={12} /> Approve
                  </CardAction>
                  {actions.onReject && (
                    <CardAction tone="reject" disabled={actions.busy} onClick={() => actions.onReject(brand)}>
                      <X size={12} /> Reject
                    </CardAction>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* All 8 steps with ✓ / ✗ */}
        <span
          role="button"
          tabIndex={0}
          aria-expanded={stepsOpen}
          onClick={toggleSteps}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleSteps(e);
          }}
          className="mt-1 flex cursor-pointer items-center gap-1 text-[11.5px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
        >
          <ListChecks size={12} />
          {stepsOpen ? "Hide all steps" : "View all steps"}
          <ChevronDown size={13} className={`transition-transform duration-200 ${stepsOpen ? "rotate-180" : ""}`} />
        </span>
        {/* Opens inside the same card, over its bottom part (absolute to the
            card), so the card never changes height and nothing spills out —
            the other cards in the row don't get empty space. */}
        {stepsOpen && (
          <div
            role="dialog"
            aria-label="All onboarding steps"
            onClick={(e) => {
              // Clicks inside the panel shouldn't open the brand (the card is a button).
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] dark:border-neutral-700 dark:bg-neutral-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                <ListChecks size={11} /> All steps
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label="Close"
                onClick={toggleSteps}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleSteps(e);
                }}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
              >
                <X size={13} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {ONBOARDING_STEPS.map(([key, label]) => {
              const ok = Boolean(brand.onboardingFlags?.[key]);
              return (
                <span
                  key={key}
                  className={`flex min-w-0 items-center gap-1 text-[11px] ${
                    ok ? "text-neutral-700 dark:text-neutral-300" : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {ok ? <Check size={11} className="shrink-0 text-emerald-500" /> : <X size={11} className="shrink-0" />}
                  <span className="truncate">{label}</span>
                </span>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* Brand + contact details — pinned to the bottom so every card in a row lines up */}
      <div className="mt-auto w-full divide-y divide-neutral-100 px-1 pt-3 dark:divide-neutral-800">
        <DetailRow label="Category" muted={!hasCategory}>
          {hasCategory ? (
            <>
              {brand.category}
              {subCategory && <span className="font-normal text-neutral-400"> › {subCategory}</span>}
            </>
          ) : (
            "Not selected yet"
          )}
        </DetailRow>
        {brand.vendorName && <DetailRow label="Vendor">{brand.vendorName}</DetailRow>}
        <DetailRow label="Phone" muted={isMissing(brand.contactPhone)}>
          {isMissing(brand.contactPhone) ? (
            MISSING.phone
          ) : (
            <span className="inline-flex items-center gap-1">
              <Phone size={11} className="text-neutral-400" />
              {brand.contactPhone}
            </span>
          )}
        </DetailRow>
        <DetailRow label="Joined" muted={!brand.joinedDate}>
          {brand.joinedDate ? (
            <span className={stale ? "text-red-600 dark:text-red-400" : ""}>
              {new Date(brand.joinedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              <span className="font-normal text-neutral-400">
                {" · "}
                {daysSinceJoin === 0 ? "today" : `${daysSinceJoin} day${daysSinceJoin === 1 ? "" : "s"} ago`}
              </span>
            </span>
          ) : (
            MISSING.date
          )}
        </DetailRow>
      </div>
    </button>
    </div>
  );
}
