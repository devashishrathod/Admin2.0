import { Phone, Check, X, Hourglass, ArrowUpRight, AlertTriangle } from "lucide-react";
import { isMissing, MISSING } from "../../utils/helpers";
import { KycPathChip, ScreenChip, StrengthChip, SubCategoryChips, WaitingChip } from "../brand/BrandStageChips";
import { daysSince } from "./onboardingBrand";

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
function CardAction({ tone, disabled, title, onClick, children }) {
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
      title={title}
      onClick={run}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") run(e);
      }}
      className={`flex h-7 cursor-pointer items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${CARD_ACTION_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/* Onboarding card for the NEW and WAITING tabs (admin guide §3). Every value
   is the server's: current screen, KYC path, profile strength, waitingChip.
   `dateField: "submitted"` (Brand Waiting) counts from onboarding.submittedAt
   — the first submit. `actions` ({ onApprove?, onReject?, approveBlockedReason?,
   rejectBlockedReason?, busy }) adds small Approve / Reject buttons. */
export default function OnboardingCard({ brand, onOpen, now, dateField = "joined", actions }) {
  const iso = dateField === "submitted" ? brand.submittedAt : brand.joinedDate;
  const days = daysSince(iso, now);
  const stale = days != null && days > 7;
  const hasCategory = brand.category && brand.category !== "—";

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

        {/* Status chips — all from the server */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {brand.waitingChip ? (
            <WaitingChip chip={brand.waitingChip} />
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
              <Hourglass size={11} />
              {brand.onboardingScreen ? "Onboarding in progress" : "Not started yet"}
            </span>
          )}
          <KycPathChip kycPath={brand.kycPath} />
          <StrengthChip strength={brand.profileStrength} />
          {stale && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle size={11} /> {days} days — follow up
            </span>
          )}
        </div>

        {/* Where the vendor is */}
        <div className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
          <div className="min-w-0">
            <p className="text-[11px] text-neutral-500">Vendor's current screen</p>
            <div className="mt-1">
              {brand.onboardingScreen ? <ScreenChip screen={brand.onboardingScreen} /> : <span className="text-[12px] font-semibold text-neutral-400">Hasn't started</span>}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 flex-col items-stretch gap-1">
              {actions.onApprove && (
                <CardAction
                  tone="approve"
                  disabled={actions.busy || Boolean(actions.approveBlockedReason)}
                  title={actions.approveBlockedReason || "Approve"}
                  onClick={() => actions.onApprove(brand)}
                >
                  <Check size={12} /> Approve
                </CardAction>
              )}
              {actions.onReject && (
                <CardAction
                  tone="reject"
                  disabled={actions.busy || Boolean(actions.rejectBlockedReason)}
                  title={actions.rejectBlockedReason || "Reject"}
                  onClick={() => actions.onReject(brand)}
                >
                  <X size={12} /> Reject
                </CardAction>
              )}
            </div>
          )}
        </div>

        {/* Brand + contact details — pinned to the bottom so every card in a row lines up */}
        <div className="mt-auto w-full divide-y divide-neutral-100 px-1 pt-3 dark:divide-neutral-800">
          <DetailRow label="Category" muted={!hasCategory}>
            {hasCategory ? (
              <span className="flex flex-wrap justify-end gap-1">
                <span>{brand.category}</span>
                <SubCategoryChips names={brand.subCategories} max={2} />
              </span>
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
          <DetailRow label={dateField === "submitted" ? "Submitted" : "Joined"} muted={!iso}>
            {iso ? (
              <span className={stale ? "text-red-600 dark:text-red-400" : ""}>
                {formatDate(iso)}
                <span className="font-normal text-neutral-400">
                  {" · "}
                  {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}
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
