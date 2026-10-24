import {
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  Tag,
  Globe,
  MessageSquareWarning,
  Briefcase,
  Activity,
  Sparkles,
  Eye,
  EyeOff,
  ListChecks,
  Layers,
  ScrollText,
  UserRound,
  ArrowUpRight,
  Hourglass,
  Check,
  X,
} from "lucide-react";
import { VerifiedMark } from "../../BrandShared";
import { brandCardFacts } from "../../brandCardUtils";
import { CardHeader, CopyButton } from "../components/Bento";
import { cardClass, heroClass, innerTile, tints, has } from "../components/bentoStyles";
import ValueOr from "../../../../components/common/ValueOr";
import { MISSING, orText } from "../../../../utils/helpers";

/* -------------------------------------------------------------------------
 * Brand Info — a bento grid in the dashboard's style (glass cards, one
 * emerald hero). 12 columns on wide screens:
 *   row 1: About hero (7) · Status & visibility (5)
 *   row 2: Business (6) · Contact & owner (6)
 * Logo, name, status, location, IDs and joined date live in the page
 * header, so this tab doesn't repeat them.
 * ---------------------------------------------------------------------- */

/* ---------------------------- Row 1 ------------------------------------ */

// Hero — what the brand is about. Logo, name, status, location, IDs and
// joined date are already in the page header, so they aren't repeated.
function AboutCard({ brand }) {
  const { subCategory } = brandCardFacts(brand);
  const website = has(brand.website) ? String(brand.website) : null;
  const websiteHref = website && (/^https?:\/\//i.test(website) ? website : `https://${website}`);

  return (
    <div className={heroClass}>
      <div className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />

      <div className="relative flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
          <ScrollText size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-neutral-900/60 dark:text-neutral-300">About the brand</p>
          <p className="flex items-center gap-1.5 truncate text-[15px] font-bold text-neutral-950 dark:text-neutral-50">
            <Building2 size={14} className="shrink-0 opacity-60" />
            {has(brand.legalBusinessName) ? brand.legalBusinessName : "Legal name not added"}
          </p>
        </div>
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 transition-colors hover:bg-white dark:bg-white/10 dark:text-emerald-300 dark:hover:bg-white/15"
          >
            <Globe size={12} />
            Website
            <ArrowUpRight size={12} />
          </a>
        )}
      </div>

      <p className="relative mt-4 line-clamp-4 text-[13px] normal-case leading-relaxed text-neutral-900/75 dark:text-neutral-300">
        {has(brand.about) ? brand.about : "No description added yet."}
      </p>

      {/* Category › sub-category */}
      <div className="relative mt-auto flex items-center gap-3 pt-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/80 ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
          {brand.categoryImage ? (
            <img src={brand.categoryImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <Layers size={18} className="text-neutral-400" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-900/50 dark:text-neutral-400">Category</p>
          <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-100">
            <span className="truncate"><ValueOr value={has(brand.category) ? brand.category : null} fallback={MISSING.category} /></span>
            {subCategory && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-white/10 dark:text-amber-300">
                <Tag size={10} />
                {subCategory}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Status tile: tinted icon, label, value.
function StatusTile({ icon: Icon, label, value, tint }) {
  return (
    <div className={`${innerTile} flex items-center gap-3 p-3`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
        <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">{value}</p>
      </div>
    </div>
  );
}

function StatusCard({ brand }) {
  const { onboardingDone, onboardingMissing } = brandCardFacts(brand);
  const total = onboardingDone + onboardingMissing || 1;
  const approval =
    brand.status === "Active" || brand.status === "Deactive"
      ? { value: "Verified", tint: "emerald" }
      : brand.status === "Rejected" || brand.status === "Revoked"
      ? { value: brand.status, tint: "red" }
      : { value: orText(brand.status, "Unknown"), tint: "amber" };

  return (
    <div className={cardClass}>
      <CardHeader icon={ShieldCheck} tint="sky" title="Status & visibility" subtitle="How the brand appears right now" />
      <div className="grid grid-cols-2 gap-2">
        <StatusTile icon={ShieldCheck} label="Approval" value={approval.value} tint={approval.tint} />
        {/* (Active/Inactive is the header switch — not repeated here.) */}
        <StatusTile
          icon={Hourglass}
          label="Coming soon (RD)"
          value={brand.isRealDummy ? "On" : "Off"}
          tint={brand.isRealDummy ? "violet" : "neutral"}
        />
        <StatusTile
          icon={brand.hiddenFromCustomers ? EyeOff : Eye}
          label="Customers"
          value={brand.hiddenFromCustomers ? "Hidden" : "Visible"}
          tint={brand.hiddenFromCustomers ? "amber" : "emerald"}
        />
        <StatusTile
          icon={Sparkles}
          label="Top brand"
          value={brand.isTopBrand ? `#${brand.topOrder}` : "No"}
          tint={brand.isTopBrand ? "amber" : "neutral"}
        />
      </div>

      {/* Onboarding progress */}
      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="flex items-center gap-1.5 font-medium text-neutral-500">
            <ListChecks size={12} />
            Onboarding
          </span>
          <span className="font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">{onboardingDone} done</span>
            <span className={onboardingMissing ? "text-red-500 dark:text-red-400" : "text-neutral-400"}> · {onboardingMissing} missing</span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${onboardingMissing ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${(onboardingDone / total) * 100}%` }}
          />
        </div>
      </div>

      {has(brand.rejectionReason) && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-500/[0.06] px-3 py-2.5 ring-1 ring-red-500/20">
          <MessageSquareWarning size={14} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-[12px] normal-case text-red-700 dark:text-red-300">{brand.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Row 2 ------------------------------------ */

function BusinessCard({ brand }) {
  const { entityTypeLabel, registrationLabel, isRegistered, flags } = brandCardFacts(brand);
  const rows = [
    { icon: Briefcase, label: "Entity type", value: entityTypeLabel || (has(brand.businessType) ? brand.businessType : null), ok: Boolean(entityTypeLabel) },
    { icon: Activity, label: "Registration", value: registrationLabel || (has(brand.businessStatus) ? brand.businessStatus : null), ok: Boolean(isRegistered) },
    { icon: ScrollText, label: "Partnership deed", value: flags.hasAcceptedPartnershipDeed ? "Accepted" : "Not accepted", ok: Boolean(flags.hasAcceptedPartnershipDeed) },
  ];
  return (
    <div className={cardClass}>
      <CardHeader icon={Briefcase} tint="violet" title="Business" subtitle="Legal setup of the brand" />
      <div className={`${innerTile} mt-auto divide-y divide-neutral-200/70 dark:divide-white/5`}>
        {rows.map(({ icon: Icon, label, value, ok }) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="flex shrink-0 items-center gap-2 text-[12px] text-neutral-500">
              <Icon size={13} className="text-neutral-400" />
              {label}
            </span>
            <span
              className={`inline-flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? tints.emerald : tints.red}`}
            >
              {ok ? <Check size={11} className="shrink-0" /> : <X size={11} className="shrink-0" />}
              <span className="truncate">{value || "Missing"}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactCard({ brand }) {
  const rows = [
    { icon: Phone, label: "Phone", value: brand.contactPhone, href: `tel:${brand.contactPhone}`, verified: Boolean(brand.vendorUser?.isMobileVerified) },
    { icon: Mail, label: "Email", value: brand.contactEmail, href: `mailto:${brand.contactEmail}`, verified: Boolean(brand.vendorUser?.isEmailVerified), lower: true },
  ];
  return (
    <div className={cardClass}>
      <CardHeader icon={UserRound} tint="sky" title="Contact & owner" subtitle={has(brand.vendorName) ? brand.vendorName : "Brand owner"} />
      <div className="mt-auto space-y-2">
        {rows.map(({ icon: Icon, label, value, href, verified, lower }) => (
          <div key={label} className={`${innerTile} flex items-center gap-2.5 p-2.5`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tints.sky}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
              <p className={`flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-neutral-800 dark:text-neutral-200 ${lower ? "normal-case" : ""}`}>
                <span className="truncate">
                  <ValueOr value={has(value) ? value : null} fallback={label === "Phone" ? MISSING.phone : MISSING.email} />
                </span>
                <VerifiedMark verified={verified} size={14} />
              </p>
            </div>
            {has(value) && (
              <div className="flex shrink-0 items-center">
                <CopyButton value={value} label={label.toLowerCase()} />
                <a
                  href={href}
                  title={label === "Phone" ? "Call" : "Send email"}
                  aria-label={label === "Phone" ? "Call brand" : "Email brand"}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-sky-400/10 hover:text-sky-600 dark:hover:text-sky-400"
                >
                  <ArrowUpRight size={13} />
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- Tab -------------------------------------- */

export default function BrandInfoTab({ brand }) {
  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AboutCard brand={brand} />
        </div>
        <div className="lg:col-span-5">
          <StatusCard brand={brand} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <BusinessCard brand={brand} />
        <ContactCard brand={brand} />
      </div>
    </div>
  );
}
