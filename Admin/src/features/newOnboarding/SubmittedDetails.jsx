import {
  ArrowUpRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Hash,
  ImageIcon,
  Layers,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Navigation,
  Phone,
  ScrollText,
  Store,
  Tag,
  UserRound,
  XCircle,
} from "lucide-react";
import { SectionCard, EmptyState } from "../brand/BrandShared";
import ValueOr from "../../components/common/ValueOr";
import { MISSING } from "../../utils/helpers";
import { formatScreen } from "./onboardingBrand";

/* -------------------------------------------------------------------------
 * Business Details — everything the vendor filled in during onboarding, read
 * straight from GET /brands/get?brandId=… (the raw payload, so nothing the
 * vendor entered is dropped by a mapper):
 *   Onboarding progress · Business profile (logo, cover, about, category)
 *   · Owner & contact · First outlet (address, map) · Working hours
 * PAN / GST / Bank live on the Account Details tab; the plan in the sidebar.
 * ---------------------------------------------------------------------- */

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];

// Unpopulated refs come back as id strings — only objects carry data.
const obj = (v) => (v && typeof v === "object" ? v : null);

// "PRIVATE_LIMITED" → "Private Limited"; LLP / OPC / NGO / HUF stay upper.
function humanize(value) {
  if (!value) return null;
  return String(value)
    .split("_")
    .map((w) => (["LLP", "OPC", "NGO", "HUF", "GST", "PAN"].includes(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* Label / value tile. */
function Tile({ icon: Icon, label, value, fallback = MISSING.generic, mono = false, wide = false }) {
  return (
    <div className={`min-w-0 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60 ${wide ? "col-span-full" : ""}`}>
      <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
        {Icon && <Icon size={11} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </p>
      <p
        className={`mt-1 text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 ${wide ? "break-words" : "truncate"} ${
          mono ? "font-mono text-[12px]" : ""
        }`}
      >
        <ValueOr value={value} fallback={fallback} />
      </p>
    </div>
  );
}

/* Contact value + verified / unverified chip. */
function ContactLine({ icon: Icon, label, value, verified, href }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-950/60">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] text-neutral-500">{label}</p>
        <p className="truncate text-[12.5px] font-medium normal-case text-neutral-800 dark:text-neutral-200">
          {value ? (
            href ? (
              <a href={href} className="hover:text-emerald-600 hover:underline dark:hover:text-emerald-400">
                {value}
              </a>
            ) : (
              value
            )
          ) : (
            <span className="text-neutral-400">Not added</span>
          )}
        </p>
      </div>
      {value && (
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            verified ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
          }`}
        >
          {verified ? <BadgeCheck size={11} /> : <Circle size={9} />}
          {verified ? "Verified" : "Not verified"}
        </span>
      )}
    </div>
  );
}

/* Clickable image preview (opens full size in a new tab). */
function ImagePreview({ src, alt, className }) {
  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800/60 ${className}`}>
        <ImageIcon size={18} />
        <span className="text-[10.5px]">Not added</span>
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className={`group relative block overflow-hidden rounded-xl ${className}`} title="Open full size">
      <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowUpRight size={12} />
      </span>
    </a>
  );
}

export default function SubmittedDetails({ raw }) {
  if (!raw) return <EmptyState label="No business details available." />;

  const user = obj(raw.user) || {};
  const outlet = obj(raw.firstSubBrand);
  const location = obj(outlet?.location);
  const workHours = obj(outlet?.workHours) || obj(user.workHours) || obj(raw.workHours);
  const category = obj(raw.category);
  const subCategory = obj(raw.subCategory);
  const unregistered = raw.businessRegistrationStatus === "UNREGISTERED";

  // Each onboarding step and whether the vendor has done it — from the data
  // itself, so it's right even when the vendor's screen pointer isn't.
  const steps = [
    { label: "Business name", done: Boolean(raw.brandName), detail: raw.brandName },
    { label: "Registration status", done: Boolean(raw.businessRegistrationStatus), detail: humanize(raw.businessRegistrationStatus) },
    { label: "Entity type", done: Boolean(raw.businessEntityType), detail: humanize(raw.businessEntityType) },
    { label: "PAN verified", done: Boolean(obj(raw.pan)?.isVerified), detail: obj(raw.pan)?.pan },
    ...(unregistered ? [] : [{ label: "GST verified", done: Boolean(obj(raw.gst)?.isVerified), detail: obj(raw.gst)?.gstNumber }]),
    { label: "Bank verified", done: Boolean(obj(raw.bank)?.isVerified), detail: obj(raw.bank)?.bankName },
    { label: "System verification", done: Boolean(raw.systemVerify), detail: raw.systemVerify ? `Score ${raw.systemVerify.score ?? 0}` : null },
    { label: "Partnership deed", done: Boolean(raw.hasAcceptedPartnershipDeed), detail: raw.hasAcceptedPartnershipDeed ? "Accepted" : null },
    { label: "Plan subscribed", done: Boolean(obj(raw.subscribed) || raw.isSubscribed), detail: obj(raw.subscribed)?.status ? humanize(raw.subscribed.status) : null },
    { label: "First outlet", done: Boolean(outlet), detail: outlet?.storeId },
    { label: "Outlet location", done: Boolean(location), detail: location?.city },
    { label: "Working hours", done: Boolean(workHours), detail: null },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  const coords = Array.isArray(location?.geo?.coordinates)
    ? location.geo.coordinates
    : Array.isArray(outlet?.geo?.coordinates)
    ? outlet.geo.coordinates
    : null;
  const mapHref = coords ? `https://www.google.com/maps?q=${coords[1]},${coords[0]}` : null;
  const addressLines = location
    ? [location.addressLine1, location.addressLine2, [location.city, location.district].filter(Boolean).join(", "), [location.state, location.zipcode].filter(Boolean).join(" "), location.country]
        .filter(Boolean)
        .filter((line, i, all) => all.indexOf(line) === i)
    : [];

  return (
    <div className="space-y-4">
      {/* Onboarding progress */}
      <SectionCard title="Onboarding Progress" icon={ListChecks} tint="emerald">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-neutral-600 dark:text-neutral-300">
                {doneCount} of {steps.length} steps done
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-neutral-800">
              <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          {user.currentScreen && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-400/10 px-3 py-1.5 text-[11.5px] font-semibold text-sky-700 dark:text-sky-300">
              <Navigation size={12} /> On: {formatScreen(user.currentScreen)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.label}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px] ${
                s.done
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950/60"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {s.done ? (
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle size={14} className="shrink-0 text-neutral-400" />
                )}
                <span className="truncate text-neutral-700 dark:text-neutral-300">{s.label}</span>
              </span>
              <span className={`min-w-0 truncate text-right text-[11.5px] font-medium ${s.done ? "text-emerald-700 dark:text-emerald-400" : "text-neutral-400"}`}>
                {s.done ? s.detail || "Done" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Business profile */}
      <SectionCard title="Business Profile" icon={Building2} tint="violet">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="space-y-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Logo</p>
            <ImagePreview src={raw.logo} alt="Brand logo" className="aspect-square w-full max-w-[180px]" />
          </div>
          <div className="space-y-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-neutral-500">Cover image</p>
            <ImagePreview src={raw.coverImage} alt="Brand cover" className="aspect-[16/7] w-full" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile icon={Store} label="Brand name" value={raw.brandName} fallback="Not added" />
          <Tile icon={Building2} label="Legal business name" value={raw.legalBusinessName} fallback="Not added" />
          <Tile icon={Briefcase} label="Entity type" value={humanize(raw.businessEntityType)} fallback="Not added" />
          <Tile icon={ScrollText} label="Registration" value={humanize(raw.businessRegistrationStatus)} fallback="Not added" />
          <Tile icon={Hash} label="Brand ID" value={raw.uniqueId} fallback={MISSING.id} mono />
          <Tile icon={Hash} label="Merchant ID" value={raw.merchantId} fallback={MISSING.id} mono />
          <Tile icon={Calendar} label="Joined" value={formatDateTime(raw.joinedDate || raw.createdAt)} fallback={MISSING.date} />
          <Tile icon={Clock} label="Last updated" value={formatDateTime(raw.updatedAt)} fallback={MISSING.date} />
          <Tile icon={ScrollText} label="Partnership deed" value={raw.hasAcceptedPartnershipDeed ? "Accepted" : "Not accepted"} />
        </div>

        {/* Category › sub-category */}
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ["Category", category, Layers],
            ["Sub-category", subCategory, Tag],
          ].map(([label, c, Icon]) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
                {c?.image ? <img src={c.image} alt="" className="h-full w-full object-cover" /> : <Icon size={16} className="text-neutral-400" />}
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] text-neutral-500">{label}</p>
                <p className="truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{c?.name || "Not selected"}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
          <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
            <ScrollText size={11} /> About / description
          </p>
          <p className="mt-1 whitespace-pre-line text-[12.5px] normal-case leading-relaxed text-neutral-700 dark:text-neutral-300">
            {raw.description || <span className="text-neutral-400">No description added yet.</span>}
          </p>
        </div>
      </SectionCard>

      {/* Owner & contact */}
      <SectionCard title="Owner & Contact" icon={UserRound} tint="sky">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <ContactLine
            icon={MessageCircle}
            label="WhatsApp (sign-in)"
            value={user.whatsappNumber || raw.whatsappNumber}
            verified={Boolean(user.isWhatsappVerified)}
          />
          <ContactLine
            icon={Phone}
            label="Mobile"
            value={raw.mobile || user.mobile}
            verified={Boolean(user.isMobileVerified)}
            href={raw.mobile || user.mobile ? `tel:${raw.mobile || user.mobile}` : undefined}
          />
          <ContactLine
            icon={Mail}
            label="Email"
            value={raw.email || user.email}
            verified={Boolean(user.isEmailVerified)}
            href={raw.email || user.email ? `mailto:${raw.email || user.email}` : undefined}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile icon={Hash} label="Vendor ID" value={user.uniqueId} fallback={MISSING.id} mono />
          <Tile icon={UserRound} label="Account" value={humanize(user.accountState) || (user.isActive === false ? "Inactive" : "Active")} />
          <Tile icon={Calendar} label="Signed up" value={formatDateTime(user.createdAt)} fallback={MISSING.date} />
          <Tile icon={BadgeCheck} label="First verified" value={formatDateTime(user.firstVerifiedAt)} fallback={MISSING.date} />
          <Tile icon={Clock} label="Last login" value={formatDateTime(user.lastLoginAt)} fallback={MISSING.date} />
          <Tile icon={Monitor} label="Signed up on" value={humanize(user.signupClient?.platform)} fallback="Unknown" />
        </div>
      </SectionCard>

      {/* First outlet + working hours */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard title="Outlet & Location" icon={MapPin} tint="amber">
          {outlet ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Tile icon={Store} label="Store ID" value={outlet.storeId} fallback={MISSING.id} mono />
                <Tile icon={Hash} label="Outlet ID" value={outlet.uniqueId} fallback={MISSING.id} mono />
                <Tile icon={Tag} label="Type" value={humanize(outlet.outletType)} />
                <Tile icon={MessageCircle} label="Outlet WhatsApp" value={outlet.whatsappNumber} fallback={MISSING.phone} />
                <Tile icon={CheckCircle2} label="Status" value={outlet.isActive === false ? "Inactive" : "Active"} />
                <Tile icon={Calendar} label="Created" value={formatDateTime(outlet.joinedDate || outlet.createdAt)} fallback={MISSING.date} />
              </div>

              <div className="mt-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10.5px] text-neutral-500">
                      <MapPin size={11} /> Address {location?.addressType ? `· ${humanize(location.addressType)}` : ""}
                    </p>
                    {location ? (
                      <>
                        <p className="mt-1 text-[12.5px] font-semibold normal-case text-neutral-800 dark:text-neutral-200">
                          {location.formattedAddress || addressLines.join(", ")}
                        </p>
                        {location.formattedAddress && addressLines.length > 0 && (
                          <p className="mt-1 text-[11.5px] normal-case text-neutral-500">{addressLines.join(" · ")}</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-1 text-[12.5px] text-neutral-400">Location not added yet.</p>
                    )}
                  </div>
                  {mapHref && (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-400/20 dark:text-emerald-300"
                    >
                      <MapPin size={12} /> Map <ArrowUpRight size={12} />
                    </a>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState label="The vendor hasn't created an outlet yet." icon="brand" />
          )}
        </SectionCard>

        <SectionCard title="Working Hours" icon={Clock} tint="sky">
          {workHours ? (
            <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800">
              {DAYS.map(([key, label]) => {
                const day = obj(workHours[key]);
                const open = Boolean(day?.isOpen);
                return (
                  <div key={key} className="flex items-center justify-between py-2 text-[12.5px] first:pt-0 last:pb-0">
                    <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${
                        open ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800"
                      }`}
                    >
                      {open ? `${day.start} – ${day.end}` : "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState label="Working hours not added yet." icon="document" />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
