import {
  Phone,
  Mail,
  ShieldCheck,
  AlertTriangle,
  MessageSquareWarning,
  X,
  ShieldX,
  ListChecks,
  Crown,
  Check,
  Gauge,
  Building2,
  Landmark,
  IdCard,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Hourglass,
} from "lucide-react";
import { ONBOARDING_STEPS } from "../../data/BrandData";
import { UsageBar, VerifiedMark } from "../../BrandShared";
import { ONBOARDING_FLAG_LABELS, brandCardFacts } from "../../brandCardUtils";
import { CardHeader, CopyButton } from "../components/Bento";
import { cardClass, heroClass, innerTile, tints, has } from "../components/bentoStyles";
import ValueOr from "../../../../components/common/ValueOr";
import { MISSING, orText } from "../../../../utils/helpers";

/* -------------------------------------------------------------------------
 * Overview — a bento grid in the dashboard's style: frosted-glass cards
 * (light + dark), one emerald "hero" card for the subscription, and
 * tinted icon chips. 12 columns on wide screens:
 *   row 1: Subscription (5) · Plan usage (4) · Contact (3)
 *   row 2: Onboarding (5)   · Business & KYC (4) · Listing (3)
 * Followers, avoided, outlets, merchant ID and joined date are in the page
 * header, so they aren't repeated here.
 * ---------------------------------------------------------------------- */

// Status chip — green when ok, red when missing.
function OkChip({ ok, children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ok ? tints.emerald : tints.red}`}
    >
      {ok ? <Check size={11} /> : <X size={11} />}
      {children}
    </span>
  );
}

// Circular progress used by the hero + onboarding cards.
function Ring({ pct, size = 64, stroke = 6, className = "stroke-emerald-500", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
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
          strokeDashoffset={c - (clamped / 100) * c}
          className={`${className} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ---------------------------- Row 1 ------------------------------------ */

// Hero — the subscription at a glance.
function SubscriptionCard({ brand, incomplete }) {
  const pct = Math.max(0, Math.min(100, Number(brand.remainderPercent) || 0));
  const days = brand.expiredInDays;
  const tone = pct <= 10 ? "stroke-red-500" : pct <= 25 ? "stroke-amber-500" : "stroke-emerald-600 dark:stroke-emerald-300";

  return (
    <div className={heroClass}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
            <Crown size={15} />
          </span>
          <div>
            <p className="text-[11px] font-medium text-neutral-900/60 dark:text-neutral-300">Subscription</p>
            <p className="text-[20px] font-bold leading-tight tracking-tight text-neutral-950 dark:text-neutral-50">
              {has(brand.subscriptionPlan) ? brand.subscriptionPlan : "No plan"}
            </p>
          </div>
        </div>
        {has(brand.planPrice) && (
          <span className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-bold tabular-nums text-neutral-900 dark:bg-white/10 dark:text-neutral-50">
            {brand.planPrice}
          </span>
        )}
      </div>

      <div className="relative mt-5 flex items-center gap-4">
        {!incomplete && days != null ? (
          <>
            <Ring pct={pct} size={76} stroke={7} className={tone}>
              <span className="text-[14px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{Math.round(pct)}%</span>
            </Ring>
            <div className="min-w-0">
              <p className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-neutral-950 dark:text-neutral-50">
                {days}
                <span className="ml-1 text-[13px] font-semibold text-neutral-900/60 dark:text-neutral-400">days left</span>
              </p>
              <p className="mt-1.5 text-[11.5px] text-neutral-900/60 dark:text-neutral-400">of the current billing period remaining</p>
            </div>
          </>
        ) : (
          <p className="text-[12.5px] text-neutral-900/60 dark:text-neutral-400">Plan starts once onboarding is complete.</p>
        )}
      </div>

      {/* Plan facts */}
      <div className="relative mt-auto grid grid-cols-2 gap-2 pt-5">
        {[
          ["Plan type", brand.planType],
          ["Term", brand.subscriptionTerm],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-900/50 dark:text-neutral-400">{label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100"><ValueOr value={has(value) ? value : null} fallback="Not set" /></p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanUsageCard({ brand }) {
  const usage = brand.usage;
  return (
    <div className={cardClass}>
      <CardHeader icon={Gauge} tint="sky" title="Plan usage" subtitle="Used vs. allowed on the current plan" />
      {usage ? (
        <div className="grid flex-1 grid-cols-2 gap-2">
          {[
            ["Sub-brands", usage.subBrands],
            ["Franchises", usage.franchises],
            ["Vouchers", usage.vouchers],
            ["Showcase", usage.showcase],
          ].map(([label, item]) => (
            <div key={label} className={`${innerTile} flex flex-col justify-center p-3`}>
              <UsageBar label={label} item={item} />
            </div>
          ))}
        </div>
      ) : (
        <p className="flex flex-1 items-center justify-center text-[12px] text-neutral-400">No usage data</p>
      )}
    </div>
  );
}

function ContactCard({ brand }) {
  // Verification comes from the vendor's user record.
  const rows = [
    { icon: Phone, label: "Phone", value: brand.contactPhone, href: `tel:${brand.contactPhone}`, verified: Boolean(brand.vendorUser?.isMobileVerified) },
    { icon: Mail, label: "Email", value: brand.contactEmail, href: `mailto:${brand.contactEmail}`, lower: true, verified: Boolean(brand.vendorUser?.isEmailVerified) },
  ];
  return (
    <div className={cardClass}>
      <CardHeader icon={Phone} tint="violet" title="Contact" subtitle="Brand owner" />
      <div className="flex flex-1 flex-col gap-2">
        {rows.map(({ icon: Icon, label, value, href, lower, verified }) => (
          <div key={label} className={`${innerTile} flex items-center gap-3 p-3`}>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
              <p className={`flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200 ${lower ? "normal-case" : ""}`}>
                <span className="truncate"><ValueOr value={has(value) ? value : null} fallback={label === "Phone" ? MISSING.phone : MISSING.email} /></span>
                <VerifiedMark verified={verified} size={14} />
              </p>
            </div>
            {has(value) && (
              <div className="flex shrink-0 items-center gap-1">
                <CopyButton value={value} label={label.toLowerCase()} />
                <a
                  href={href}
                  title={label === "Phone" ? "Call" : "Send email"}
                  aria-label={label === "Phone" ? "Call brand" : "Email brand"}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:brightness-110 ${tints.violet}`}
                >
                  <Icon size={12} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- Row 2 ------------------------------------ */

function OnboardingCard({ brand }) {
  const { flags, onboardingDone, onboardingMissing } = brandCardFacts(brand);
  const total = onboardingDone + onboardingMissing || 1;
  const pct = (onboardingDone / total) * 100;
  return (
    <div className={cardClass}>
      <CardHeader
        icon={ListChecks}
        tint={onboardingMissing ? "amber" : "emerald"}
        title="Onboarding"
        subtitle={onboardingMissing ? `${onboardingMissing} item${onboardingMissing > 1 ? "s" : ""} still missing` : "Everything is in place"}
      />
      <div className="flex flex-1 items-center gap-5">
        <Ring pct={pct} size={84} stroke={8} className={onboardingMissing ? "stroke-amber-500" : "stroke-emerald-500"}>
          <div className="text-center leading-none">
            <p className="text-[18px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{onboardingDone}</p>
            <p className="mt-0.5 text-[9.5px] font-medium text-neutral-400">of {total}</p>
          </div>
        </Ring>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
          {ONBOARDING_FLAG_LABELS.map(([k, label]) => (
            <span
              key={k}
              className={`flex min-w-0 items-center gap-1.5 text-[12px] ${
                flags[k] ? "text-neutral-700 dark:text-neutral-300" : "font-medium text-red-600 dark:text-red-400"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  flags[k] ? "bg-emerald-500 text-white" : "bg-red-500/15 text-red-500"
                }`}
              >
                {flags[k] ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
              </span>
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BusinessKycCard({ brand }) {
  const { isRegistered, registrationLabel, entityTypeLabel } = brandCardFacts(brand);
  const rows = [
    { icon: IdCard, label: "PAN", ok: Boolean(brand.panVerified), value: brand.panNumber },
    { icon: ShieldCheck, label: "GST", ok: Boolean(brand.gstVerified), value: brand.gstNumber },
    { icon: Landmark, label: "Bank account", ok: Boolean(brand.bankVerified), value: brand.bankName },
  ];
  const verified = rows.filter((r) => r.ok).length;
  return (
    <div className={cardClass}>
      <CardHeader
        icon={isRegistered ? ShieldCheck : ShieldX}
        tint={isRegistered ? "emerald" : "red"}
        title="Business & KYC"
        subtitle={`${verified} of ${rows.length} documents verified`}
      />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <OkChip ok={isRegistered} title="Registration">{registrationLabel}</OkChip>
        <OkChip ok={Boolean(entityTypeLabel)} title="Entity type">{entityTypeLabel || "Entity type missing"}</OkChip>
      </div>
      <div className={`${innerTile} mt-auto divide-y divide-neutral-200/70 dark:divide-white/5`}>
        {rows.map(({ icon: Icon, label, ok, value }) => (
          <div key={label} className="flex items-center justify-between gap-2 px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-neutral-600 dark:text-neutral-300">
              <Icon size={13} className="shrink-0 text-neutral-400" />
              <span className="shrink-0">{label}</span>
              {has(value) && <span className="truncate font-mono text-[11px] normal-case text-neutral-400">{value}</span>}
            </span>
            <VerifiedMark verified={ok} showText />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListingCard({ brand }) {
  const { subCategory } = brandCardFacts(brand);
  const rows = [
    {
      icon: Sparkles,
      label: "Top brand",
      value: brand.isTopBrand ? `#${brand.topOrder}` : "No",
      tone: brand.isTopBrand ? "text-amber-600 dark:text-amber-400" : "",
    },
    {
      icon: brand.hiddenFromCustomers ? EyeOff : Eye,
      label: "Customers",
      value: brand.hiddenFromCustomers ? "Hidden" : "Visible",
      tone: brand.hiddenFromCustomers ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
    },
    brand.isRealDummy && { icon: Hourglass, label: "RD", value: "Coming soon", tone: "text-violet-600 dark:text-violet-400" },
  ].filter(Boolean);

  return (
    <div className={cardClass}>
      <CardHeader icon={Layers} tint="amber" title="Listing" subtitle="Category & visibility" />
      <div className={`${innerTile} flex items-center gap-3 p-3`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200/70 dark:bg-neutral-900 dark:ring-white/10">
          {brand.categoryImage ? (
            <img src={brand.categoryImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 size={16} className="text-neutral-400" />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100"><ValueOr value={has(brand.category) ? brand.category : null} fallback={MISSING.category} /></p>
          <p className="truncate text-[11.5px] text-neutral-500">{subCategory || "No sub-category"}</p>
        </div>
      </div>
      <div className="mt-auto space-y-1.5 pt-3">
        {rows.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="flex items-center justify-between gap-2 text-[12.5px]">
            <span className="flex items-center gap-2 text-neutral-500">
              <Icon size={13} />
              {label}
            </span>
            <span className={`font-semibold text-neutral-800 dark:text-neutral-200 ${tone}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- Alerts ----------------------------------- */

function RejectedAlert({ reason }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-red-500/25 bg-red-500/[0.06] p-4 backdrop-blur-xl">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tints.red}`}>
        <MessageSquareWarning size={15} />
      </span>
      <div>
        <p className="text-[13.5px] font-bold text-red-600 dark:text-red-400">Listing rejected</p>
        <p className="mt-0.5 text-[12.5px] normal-case text-neutral-600 dark:text-neutral-400">{reason}</p>
      </div>
    </div>
  );
}

function IncompleteAlert({ brand }) {
  return (
    <div className="rounded-3xl border border-amber-400/30 bg-amber-400/[0.06] p-4 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tints.amber}`}>
          <AlertTriangle size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-amber-700 dark:text-amber-400">Onboarding not completed</p>
          <p className="mt-0.5 text-[12.5px] text-neutral-600 dark:text-neutral-400">
            Dropped off at <span className="font-semibold text-neutral-800 dark:text-neutral-200">{orText(brand.onboardingStep, "Unknown")}</span> (step{" "}
            {brand.onboardingStepIndex} of {brand.onboardingTotalSteps}) on {orText(brand.lastActiveOn, "an unknown date")}. It won't go live until the owner finishes.
          </p>
          {/* Step tracker */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {ONBOARDING_STEPS.map((step, i) => {
              const done = i + 1 <= brand.onboardingStepIndex;
              return (
                <span
                  key={step}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    done ? tints.emerald : "bg-white/70 text-neutral-400 ring-1 ring-neutral-200/70 dark:bg-neutral-900/60 dark:ring-white/5"
                  }`}
                >
                  {done ? <Check size={11} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  {step}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Tab -------------------------------------- */

export default function OverviewTab({ brand }) {
  const incomplete = brand.onboardingComplete === false;

  return (
    <div className="space-y-4">
      {brand.status === "Rejected" && brand.rejectionReason && <RejectedAlert reason={brand.rejectionReason} />}
      {incomplete && <IncompleteAlert brand={brand} />}

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="md:col-span-2 lg:col-span-5">
          <SubscriptionCard brand={brand} incomplete={incomplete} />
        </div>
        <div className="lg:col-span-4">
          <PlanUsageCard brand={brand} />
        </div>
        <div className="lg:col-span-3">
          <ContactCard brand={brand} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        <div className="md:col-span-2 lg:col-span-5">
          <OnboardingCard brand={brand} />
        </div>
        <div className="lg:col-span-4">
          <BusinessKycCard brand={brand} />
        </div>
        <div className="lg:col-span-3">
          <ListingCard brand={brand} />
        </div>
      </div>
    </div>
  );
}
