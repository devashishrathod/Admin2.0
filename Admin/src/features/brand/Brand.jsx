import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutGrid,
  List,
  BadgeCheck,
  Crown,
  ChevronRight,
  Trash2,
  FileDown,
  AlertTriangle,
  SlidersHorizontal,
  Check,
  MoreVertical,
  ChevronLeft,
  Loader2,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  Users,
  Store,
  CalendarDays,
  Phone,
  Mail,
  Clock,
  Eye,
  FlaskConical,
  Layers,
  EyeOff,
  Copy,
  ChevronDown,
  ShieldCheck,
  ShieldX,
  ListChecks,
  IdCard,
  Receipt,
  Landmark,
  X,
  Pencil,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from "recharts";
import Table from "../../components/common/Table";
import { useBrands } from "./BrandContext";

const STATUS_TABS = ["All", "Active Brand", "Deactive Brand", "Expired Brand", "Top Brand"];
const STATUS_TAB_LABELS = {
  All: "All",
  "Active Brand": "Verified",
  "Deactive Brand": "Inactive",
  "Expired Brand": "Expired",
  "Top Brand": "Top Brand",
};

const isExpiredBrand = (b) => b.planPrice !== "—" && b.expiredInDays <= 0;

const getBrandStatusLabel = (b) => {
  if (isExpiredBrand(b)) return "Expired";
  return b.active ? "Active" : "Deactive";
};

/* -------------------------------------------------------------------------
 * CSV export helper
 * ---------------------------------------------------------------------- */
function exportBrandsToCsv(brandList) {
  if (!brandList?.length) return;

  const headers = [
    "Brand Id", "Brand Name", "Category", "Location", "Status",
    "Sub-Brand", "Owner", "Phone", "Email", "GST Number", "PAN Number", "Plan",
  ];

  const rows = brandList.map((b) => [
    b.brandId, b.brandName, b.category, b.location, b.status,
    b.subBrandCount, b.ownerName, b.contactPhone, b.contactEmail,
    b.gstNumber, b.panNumber, b.subscriptionPlan,
  ]);

  const escapeCell = (cell) => {
    const value = String(cell ?? "");
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };

  const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `brands-${dateStamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

const BRAND_STATUS_STYLES = {
  Active: { pill: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400" },
  Deactive: { pill: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400", dot: "bg-neutral-500" },
  Expired: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-400" },
  Pending: { pill: "bg-amber-400/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
  Rejected: { pill: "bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-400" },
};

// Instagram-style verified tick: solid blue badge, white check. Every brand
// on these pages is admin-approved, so it's shown on all of them.
function VerifiedTick({ size = 16 }) {
  return (
    <BadgeCheck size={size} className="shrink-0" fill="#0095F6" stroke="#ffffff" strokeWidth={2.2} aria-label="Verified brand" />
  );
}

function BrandStatusBadge({ brand }) {
  const label = brand.status === "Pending" || brand.status === "Rejected" ? brand.status : getBrandStatusLabel(brand);
  const style = BRAND_STATUS_STYLES[label] || BRAND_STATUS_STYLES.Deactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label === "Active" ? "Verified" : label === "Deactive" ? "Inactive" : label}
    </span>
  );
}

function useConfirmDelete(onConfirm) {
  return (brand) => {
    const ok = window.confirm(
      `Delete "${brand.brandName}"? This will permanently remove the brand and cannot be undone.`
    );
    if (ok) onConfirm(brand);
  };
}

/* -------------------------------------------------------------------------
 * Brand card (list view) — listing-style card: inset cover photo with pill
 * tags, then headline, location, tagline, an icon stats row and owner.
 * ---------------------------------------------------------------------- */

const CARD_TAG_STYLES = {
  Active: "text-emerald-600",
  Deactive: "text-neutral-500",
  Expired: "text-red-500",
  Pending: "text-amber-600",
  Rejected: "text-red-500",
};

function BrandStat({ icon: Icon, children }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
      <Icon size={15} className="shrink-0 text-neutral-500 dark:text-neutral-400" />
      <span className="truncate">{children}</span>
    </span>
  );
}

const compactCount = (n) => {
  const v = Number(n) || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;
};

// Plan-usage meter: green < 70%, amber 70–90%, red > 90%; unlimited plans
// show a full muted bar and "used / ∞".
function UsageBar({ label, item }) {
  const used = item?.used ?? 0;
  const unlimited = Boolean(item?.isUnlimited);
  const limit = item?.limit ?? 0;
  const pct = unlimited ? 100 : limit > 0 ? Math.min(100, (used / limit) * 100) : used > 0 ? 100 : 0;
  const tone = unlimited
    ? "bg-sky-400/50"
    : pct > 90
    ? "bg-red-500"
    : pct >= 70
    ? "bg-amber-500"
    : "bg-emerald-500";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-neutral-800 dark:text-neutral-200">
          {used}/{unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const ONBOARDING_FLAG_LABELS = [
  ["hasPan", "PAN"],
  ["hasGst", "GST"],
  ["hasBank", "Bank"],
  ["hasLocation", "Location"],
  ["hasWorkHours", "Work hours"],
  ["hasFirstOutlet", "First outlet"],
  ["hasSystemVerification", "System verification"],
  ["hasAcceptedPartnershipDeed", "Partnership deed"],
];

/* Instant, styled hover tooltip (the native `title` one is slow and plain).
   `lines` = [[text, ok], ...] — each row gets a green ✓ or grey ✗. Uses a
   named group so it doesn't react to the card's own `group` hover. */
function HoverTip({ title, lines = [], className = "", children }) {
  return (
    <span className={`group/tip relative flex shrink-0 ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[220px] -translate-x-1/2 translate-y-1 rounded-xl bg-neutral-900 px-3 py-2 text-left opacity-0 shadow-xl shadow-black/30 ring-1 ring-white/10 transition-all duration-150 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 dark:bg-neutral-800"
      >
        <span className="block text-[11px] font-semibold text-white">{title}</span>
        {lines.length > 0 && (
          <span className="mt-1.5 flex flex-col gap-1">
            {lines.map(([text, ok]) => (
              <span key={text} className="flex items-center gap-1.5 text-[10.5px] text-neutral-300">
                {ok ? (
                  <Check size={11} className="shrink-0 text-emerald-400" />
                ) : (
                  <X size={11} className="shrink-0 text-neutral-500" />
                )}
                {text}
              </span>
            ))}
          </span>
        )}
        {/* Arrow */}
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-neutral-900 dark:bg-neutral-800" />
      </span>
    </span>
  );
}

/* Hover overlay on a brand card's logo: View + Edit. Spans with
   role="button" (not <button>) because the whole card is already a button;
   stopPropagation keeps the click from also firing the card's own onOpen. */
function LogoActions({ onView, onEdit, size = "sm" }) {
  const btn = size === "lg" ? "h-8 w-8" : "h-6.5 w-6.5";
  const icon = size === "lg" ? 15 : 12;
  const fire = (fn) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.();
  };
  const keyFire = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") fire(fn)(e);
  };
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-neutral-950/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover/logo:opacity-100">
      <span
        role="button"
        tabIndex={0}
        title="View brand"
        aria-label="View brand"
        onClick={fire(onView)}
        onKeyDown={keyFire(onView)}
        className={`flex ${btn} items-center justify-center rounded-full bg-white text-sky-600 shadow-md transition-transform hover:scale-110`}
      >
        <Eye size={icon} />
      </span>
      <span
        role="button"
        tabIndex={0}
        title="Edit brand"
        aria-label="Edit brand"
        onClick={fire(onEdit)}
        onKeyDown={keyFire(onEdit)}
        className={`flex ${btn} items-center justify-center rounded-full bg-white text-emerald-600 shadow-md transition-transform hover:scale-110`}
      >
        <Pencil size={icon} />
      </span>
    </span>
  );
}

// Enum words kept upper-case when the entity type key is prettified.
const ENTITY_ACRONYMS = new Set(["LLP", "OPC", "HUF", "NGO"]);

function BrandCard({ brand, onOpen, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Verification details (business, onboarding, KYC) start collapsed too.
  const [verifyOpen, setVerifyOpen] = useState(false);
  const toggleVerify = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setVerifyOpen((o) => !o);
  };
  const [copied, setCopied] = useState(false);
  // Plan-usage meters start collapsed to keep the card compact.
  const [usageOpen, setUsageOpen] = useState(false);
  const toggleUsage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUsageOpen((o) => !o);
  };
  const outletCount = brand.outletCount ?? (Number(String(brand.subBrandCount).split("/")[0]) || 0);
  const hasPlan = brand.subscriptionPlan && brand.subscriptionPlan !== "—";
  const statusLabel = brand.status === "Pending" || brand.status === "Rejected" ? brand.status : getBrandStatusLabel(brand);
  const cover = brand.coverImage || brand.ambiencePhotos?.[0];
  const usage = brand.usage;
  const flags = brand.onboardingFlags || {};
  const onboardingDone = ONBOARDING_FLAG_LABELS.filter(([k]) => flags[k]).length;
  const onboardingMissing = ONBOARDING_FLAG_LABELS.length - onboardingDone;
  // businessRegistrationStatus "REGISTERED" (mapper also gives "GST Registered").
  const isRegistered = brand.registrationKey ? brand.registrationKey === "REGISTERED" : brand.businessStatus === "GST Registered";
  // "REGISTERED" → "Registered", "UNREGISTERED" → "Unregistered".
  const registrationLabel = brand.registrationKey
    ? brand.registrationKey.charAt(0) + brand.registrationKey.slice(1).toLowerCase().replace(/_/g, " ")
    : isRegistered
    ? "Registered"
    : "Unregistered";
  // Full entity type straight from the enum key: "PRIVATE_LIMITED" → "Private Limited".
  const entityTypeLabel = brand.entityTypeKey
    ? brand.entityTypeKey
        .split("_")
        .map((w) => (ENTITY_ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
        .join(" ")
    : brand.businessType !== "—"
    ? brand.businessType
    : "";
  const subCategory = brand.subCategory && brand.subCategory !== brand.category ? brand.subCategory : "";
  const merchantId = brand.merchantToken && brand.merchantToken !== "—" ? brand.merchantToken : null;

  const copyMerchantId = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(merchantId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  return (
    <div className="group relative flex flex-col rounded-[22px] border border-neutral-200/80 bg-white p-2.5 text-left shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.10)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/30">
      {/* Menu */}
      <div className="absolute right-5 top-5 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          aria-label={`More actions for ${brand.brandName}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
              <button
                onClick={() => { setMenuOpen(false); onDelete(brand); }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800"
              >
                <Trash2 size={13} />
                Delete Brand
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={() => onOpen(brand)} className="flex flex-1 flex-col text-left" aria-label={`Open ${brand.brandName}`}>
        {/* Cover — the brand's coverImage (or first ambience photo), with the
            logo overlapping its bottom edge; with no cover at all, the logo
            itself is blown up and blurred as a backdrop with the crisp logo
            centred on top. */}
        <div className="relative">
        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 dark:from-emerald-950/60 dark:via-neutral-800 dark:to-teal-950/40">
          {cover ? (
            <>
              <img src={cover} alt={brand.brandName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/20" />
            </>
          ) : (
            <>
              {brand.logo && (
                <img
                  src={brand.logo}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full scale-150 object-cover opacity-80 blur-2xl saturate-150 dark:opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10" />
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="group/logo relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-4 ring-white/60 transition-transform duration-500 group-hover:scale-105 dark:bg-neutral-900 dark:ring-neutral-900/60">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-[40px] font-bold text-emerald-500">
                      {brand.brandName?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                  <LogoActions size="lg" onView={() => onOpen(brand)} onEdit={() => onEdit?.(brand)} />
                </div>
              </div>
            </>
          )}

          {/* Pill tags */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 pr-12">
            {/* "Verified" is the blue tick next to the name below;
                Expired / Inactive still get their own pill here. */}
            {brand.isDummy && (
              <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm dark:bg-neutral-900 dark:text-violet-400">
                <FlaskConical size={12} />
                Dummy
              </span>
            )}
            {statusLabel !== "Active" && (
              <span className={`rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide shadow-sm dark:bg-neutral-900 ${CARD_TAG_STYLES[statusLabel] || CARD_TAG_STYLES.Deactive}`}>
                {statusLabel === "Deactive" ? "Inactive" : statusLabel}
              </span>
            )}
            {brand.isTopBrand && (
              <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-amber-600 shadow-sm dark:bg-neutral-900 dark:text-amber-400">
                <Sparkles size={11} />
                Top #{brand.topOrder}
              </span>
            )}
          </div>
        </div>

        {/* Logo overlapping the cover's bottom edge (only when there's a real
            cover — otherwise the logo is already centred on the backdrop). */}
        {cover && (
          <div className="group/logo absolute -bottom-7 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-4 ring-white dark:bg-neutral-900 dark:ring-neutral-900">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.brandName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[24px] font-bold text-emerald-500">{brand.brandName?.charAt(0)?.toUpperCase() || "?"}</span>
            )}
            <LogoActions onView={() => onOpen(brand)} onEdit={() => onEdit?.(brand)} />
          </div>
        )}
        </div>

        {/* Details */}
        <div className={`flex flex-1 flex-col px-2.5 pb-1 ${cover ? "pt-9" : "pt-4"}`}>
          <h3 className="flex items-center gap-1.5 text-[18px] font-bold leading-tight tracking-tight text-emerald-600 dark:text-emerald-400">
            <span className="truncate">{brand.brandName}</span>
            <VerifiedTick size={18} />
          </h3>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
            {brand.categoryImage && (
              <img src={brand.categoryImage} alt="" className="h-4 w-4 shrink-0 rounded object-cover" />
            )}
            <span className="truncate">
              {brand.category}
              {subCategory && <span className="text-neutral-400"> › {subCategory}</span>}
            </span>
          </p>
          {brand.isDummy && brand.dummyBatch && (
            <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-violet-600 dark:text-violet-400">
              <Layers size={11} className="shrink-0" /> {brand.dummyBatch}
            </p>
          )}
          <p className="mt-2.5 line-clamp-1 text-[13px] font-medium text-neutral-800 dark:text-neutral-100">
            {brand.tagline || "No description added yet"}
          </p>

          {/* Audience + reach */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <BrandStat icon={Users}>{compactCount(brand.followers)} followers</BrandStat>
            <BrandStat icon={EyeOff}>{compactCount(brand.avoidanceCount)} avoided</BrandStat>
            <BrandStat icon={Store}>{outletCount} {outletCount === 1 ? "outlet" : "outlets"}</BrandStat>
          </div>

          {/* Plan usage + Onboarding — side by side in one row. Each tile
              toggles its panel, which opens full-width underneath (content
              unchanged). Opening one closes the other. Spans with
              role="button" (not <button>) because the whole card is already a
              button; the toggles stopPropagation so the brand doesn't open. */}
          <div className="mt-3.5 grid grid-cols-2 gap-1.5">
            <span
              role="button"
              tabIndex={0}
              aria-expanded={verifyOpen}
              onClick={(e) => {
                toggleVerify(e);
                setUsageOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  toggleVerify(e);
                  setUsageOpen(false);
                }
              }}
              className={`flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl p-2.5 transition-colors ${
                verifyOpen ? "bg-emerald-400/10 ring-1 ring-emerald-400/30" : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  <ListChecks size={11} /> Onboarding
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-neutral-500 transition-transform duration-200 ${verifyOpen ? "rotate-180" : ""}`}
                />
              </span>
              <span className="flex items-center whitespace-nowrap text-[11.5px] font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">{onboardingDone} done</span>
                <span className={onboardingMissing ? "text-red-500 dark:text-red-400" : "text-neutral-400"}>
                  &nbsp;· {onboardingMissing} missing
                </span>
              </span>
            </span>

            {usage ? (
              <span
                role="button"
                tabIndex={0}
                aria-expanded={usageOpen}
                onClick={(e) => {
                  toggleUsage(e);
                  setVerifyOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleUsage(e);
                    setVerifyOpen(false);
                  }
                }}
                className={`flex min-w-0 cursor-pointer flex-col gap-1 rounded-xl p-2.5 transition-colors ${
                  usageOpen ? "bg-emerald-400/10 ring-1 ring-emerald-400/30" : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Plan usage</span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-neutral-500 transition-transform duration-200 ${usageOpen ? "rotate-180" : ""}`}
                  />
                </span>
                <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-bold text-neutral-800 dark:text-neutral-200">
                  <Crown size={11} className="shrink-0 text-amber-500" />
                  <span className="truncate">{hasPlan ? brand.subscriptionPlan : "No plan"}</span>
                </span>
              </span>
            ) : (
              <span className="flex min-w-0 flex-col gap-1 rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-800/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Plan usage</span>
                <span className="text-[11.5px] font-bold text-neutral-400">—</span>
              </span>
            )}
          </div>

          {verifyOpen && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
              {ONBOARDING_FLAG_LABELS.map(([k, label]) => (
                <span
                  key={k}
                  className={`flex min-w-0 items-center gap-1 text-[10.5px] ${
                    flags[k] ? "text-neutral-700 dark:text-neutral-300" : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {flags[k] ? (
                    <Check size={11} className="shrink-0 text-emerald-500" />
                  ) : (
                    <X size={11} className="shrink-0 text-red-500" />
                  )}
                  <span className="truncate">{label}</span>
                </span>
              ))}
            </div>
          )}

          {usage && usageOpen && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/50">
              <UsageBar label="Sub-brands" item={usage.subBrands} />
              <UsageBar label="Franchises" item={usage.franchises} />
              <UsageBar label="Vouchers" item={usage.vouchers} />
              <UsageBar label="Showcase" item={usage.showcase} />
            </div>
          )}

          {/* Business + KYC — one line, text never truncated (wraps only if
              the card is very narrow). Registration status
              (businessRegistrationStatus) first, as an icon only: green
              shield ✓ = registered, red shield ✗ = unregistered; then the full
              entity type, then PAN / GST / Bank. Missing → red with ✗. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1">
            <span
              title={registrationLabel}
              aria-label={registrationLabel}
              className={`flex shrink-0 items-center justify-center rounded-lg px-2 py-1.5 ${
                isRegistered
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {isRegistered ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
            </span>
            <span
              title={entityTypeLabel || "Entity type missing"}
              className={`flex flex-auto items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-[10px] font-semibold ${
                entityTypeLabel
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {entityTypeLabel || "Entity type"}
              {!entityTypeLabel && <X size={10} className="shrink-0" />}
            </span>
            {[
              ["PAN", flags.hasPan],
              ["GST", flags.hasGst],
              ["Bank", flags.hasBank],
            ].map(([label, ok]) => (
              <span
                key={label}
                title={`${label} ${ok ? "verified" : "missing"}`}
                className={`flex flex-auto items-center justify-center gap-0.5 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-[10px] font-semibold ${
                  ok
                    ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {label}
                {!ok && <X size={10} className="shrink-0" />}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Footer — outside the card's button so the copy button isn't nested
          inside another button. */}
      <div className="mx-2.5 mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pb-1.5 pt-3 dark:border-neutral-800">
        {merchantId ? (
          <button
            onClick={copyMerchantId}
            title="Copy merchant ID"
            className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <span className="truncate">{merchantId}</span>
            {copied ? <Check size={11} className="shrink-0 text-emerald-500" /> : <Copy size={11} className="shrink-0" />}
          </button>
        ) : (
          <span className="text-[11px] text-neutral-400">—</span>
        )}
        {brand.joinedDate && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-neutral-500">
            <CalendarDays size={11} />
            Joined {new Date(brand.joinedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — list only. Clicking a brand navigates to /brands/:id, which
 * BrandDetailsPage.jsx (a separate route) renders. This page never renders
 * <BrandDetails> itself anymore.
 * ---------------------------------------------------------------------- */
const PAGE_SIZE = 6;

// scope "live" = Live Brands (every approved brand); "expired" = Expired
// Brands (only approved brands whose plan has run out).
const isExpired = (b) => b.status === "Expired" || isExpiredBrand(b);

export default function Brand({ scope = "live" }) {
  const navigate = useNavigate();
  const isExpiredScope = scope === "expired";
  const isDummyScope = scope === "dummy";
  const {
    brands: liveBrands,
    dummyBrands,
    loading,
    error,
    fetchBrands,
    deleteBrandById,
  } = useBrands();
  // Everything below (charts, tabs, filters, table) works on this list.
  const brands = isDummyScope ? dummyBrands : isExpiredScope ? liveBrands.filter(isExpired) : liveBrands;

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  const [view, setView] = useState("table");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [page, setPage] = useState(1);

  const hasValue = (v) => Boolean(v) && v !== "—";
  const categories = [...new Set(brands.map((b) => b.category).filter(hasValue))].sort();
  // Plans the live brands are actually on (Pro Plus, Free Trial, …) — a
  // hard-coded list missed real plan names, so those could never be picked.
  const plans = [...new Set(brands.map((b) => b.subscriptionPlan).filter(hasValue))]
    .sort()
    .map((name) => ({ name }));

  const filtered = brands.filter((b) => {
    const matchesSearch =
      b.brandName?.toLowerCase().includes(search.toLowerCase()) ||
      b.location?.toLowerCase().includes(search.toLowerCase()) ||
      b.category?.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      statusTab === "All"
        ? true
        : statusTab === "Active Brand"
        ? b.active && !isExpiredBrand(b)
        : statusTab === "Deactive Brand"
        ? !b.active && !isExpiredBrand(b)
        : statusTab === "Expired Brand"
        ? isExpiredBrand(b)
        : statusTab === "Top Brand"
        ? Boolean(b.isTopBrand)
        : true;

    const matchesPlan = planFilter === "All Plans" || b.subscriptionPlan === planFilter;
    const matchesCategory = categoryFilter === "All Categories" || b.category === categoryFilter;

    return matchesSearch && matchesTab && matchesPlan && matchesCategory;
  })
    // Top brands first in their topOrder (#1, #2, #3…), the rest keep the
    // API order after them. sort() is stable, so ties stay put.
    .sort((a, b) => {
      const rank = (x) => (x.isTopBrand ? Number(x.topOrder) || Infinity : Infinity);
      return rank(a) - rank(b) || 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const applyFilter = (setter) => (value) => { setter(value); setPage(1); };
  const setStatusTabAndReset = applyFilter(setStatusTab);
  const setSearchAndReset = applyFilter(setSearch);
  const setPlanFilterAndReset = applyFilter(setPlanFilter);
  const setCategoryFilterAndReset = applyFilter(setCategoryFilter);

  const resetFilters = () => {
    setSearch("");
    setStatusTab("All");
    setPlanFilter("All Plans");
    setCategoryFilter("All Categories");
    setPage(1);
  };
  const filtersActive =
    Boolean(search) || statusTab !== "All" || planFilter !== "All Plans" || categoryFilter !== "All Categories";

  // Overview charts — real, derived from the full brand list (not the
  // current page/filter), so they always reflect the true totals.
  const activeCount = brands.filter((b) => b.active && !isExpiredBrand(b)).length;
  const deactiveCount = brands.filter((b) => !b.active && !isExpiredBrand(b)).length;
  const expiredCount = brands.filter(isExpiredBrand).length;
  const statusMix = [
    { name: "Verified", value: activeCount, color: "#2FDE8C" },
    { name: "Deactive", value: deactiveCount, color: "#A3A3A3" },
    { name: "Expired", value: expiredCount, color: "#F87171" },
  ].filter((s) => s.value > 0);

  const topBrandsByFollowers = [...brands]
    .sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0))
    .slice(0, 5)
    .map((b) => ({ name: b.brandName, followers: Number(b.followers) || 0 }));

  const planMix = Object.entries(
    brands.reduce((acc, b) => {
      const plan = b.subscriptionPlan || "—";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const deleteBrand = useConfirmDelete((brand) => {
    deleteBrandById(brand);
  });

  // Single source of truth for "open a brand" — always goes through the
  // router so the URL carries the id (/brands/:id), works with browser
  // back/forward, refresh, and direct/shared links.
  const handleOpenBrand = (brand) => {
    navigate(`/brands/${brand.id}`);
  };
  // Opens the details page with its Edit modal already up.
  const handleEditBrand = (brand) => {
    navigate(`/brands/${brand.id}`, { state: { openEdit: true } });
  };

  const handleExport = () => exportBrandsToCsv(filtered);

  // Table view — same look as the voucher table, filled only with fields
  // the brand list API actually returns (it has no location, so no
  // Location column).
  const columns = [
    {
      key: "sno", label: "#", width: "w-12",
      render: (_row, index) => (
        <span className="font-mono text-[12px] text-neutral-400">{String((safePage - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span>
      ),
    },
    {
      key: "brand", label: "Brand",
      // Wide enough that the name stays on one line; badges get their own row.
      cellClass: "min-w-72 max-w-80 whitespace-normal",
      render: (row) => (
        <button onClick={() => handleOpenBrand(row)} className="group flex w-full items-center gap-3 text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700">
            {row.logo ? (
              <img src={row.logo} alt={row.brandName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[15px] font-semibold text-neutral-500">{row.brandName?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1 font-semibold text-neutral-900 group-hover:text-emerald-600 dark:text-neutral-50 dark:group-hover:text-emerald-400">
              <span className="truncate">{row.brandName}</span>
              <VerifiedTick size={14} />
            </p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-500">
              {row.category !== "—" ? row.category : "—"}
              {row.subCategory && row.subCategory !== row.category && <span className="text-neutral-400"> › {row.subCategory}</span>}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                {row.brandId}
              </span>
              {row.isTopBrand && (
                <span className="flex items-center gap-0.5 rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles size={9} />Top #{row.topOrder}
                </span>
              )}
              {row.isDummy && (
                <span className="flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                  <FlaskConical size={9} />{row.dummyBatch || "Dummy"}
                </span>
              )}
            </div>
          </div>
        </button>
      ),
    },
    {
      key: "owner", label: "Owner",
      cellClass: "min-w-44 max-w-52 whitespace-normal",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium capitalize text-neutral-800 dark:text-neutral-200">{row.vendorName || row.ownerName || "—"}</p>
          {row.vendorName && row.ownerName && row.ownerName !== row.vendorName && (
            <p className="truncate text-[11px] text-neutral-500">{row.ownerName}</p>
          )}
          <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] text-neutral-500">
            <Phone size={10} className="shrink-0" /> {row.contactPhone}
          </p>
          {row.contactEmail !== "—" && (
            <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
              <Mail size={10} className="shrink-0" /> <span className="truncate normal-case">{row.contactEmail.toLowerCase()}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reach", label: "Reach",
      render: (row) => (
        <div className="space-y-1 text-[11.5px] text-neutral-600 dark:text-neutral-300">
          <p className="flex items-center gap-1.5"><Store size={11} className="text-neutral-400" /><b className="font-semibold">{row.outletCount ?? 0}</b> outlets</p>
          <p className="flex items-center gap-1.5"><Users size={11} className="text-neutral-400" /><b className="font-semibold">{compactCount(row.followers)}</b> followers</p>
          <p className="flex items-center gap-1.5"><EyeOff size={11} className="text-neutral-400" /><b className="font-semibold">{compactCount(row.avoidanceCount)}</b> avoided</p>
        </div>
      ),
    },
    {
      key: "usage", label: "Plan Usage",
      cellClass: "min-w-40 whitespace-nowrap",
      render: (row) =>
        row.usage ? (
          <div className="w-36 space-y-1.5">
            <UsageBar label="Sub-brands" item={row.usage.subBrands} />
            <UsageBar label="Franchises" item={row.usage.franchises} />
            <UsageBar label="Vouchers" item={row.usage.vouchers} />
          </div>
        ) : (
          <span className="text-neutral-400">—</span>
        ),
    },
    {
      key: "plan", label: "Plan",
      render: (row) => {
        const hasPlan = row.subscriptionPlan && row.subscriptionPlan !== "—";
        const days = Number(row.expiredInDays);
        const tone = !hasPlan || days <= 0
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : days <= 15
          ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
          : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400";
        return (
          <div>
            <p className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200">
              <Crown size={12} className="text-amber-500" /> {hasPlan ? row.subscriptionPlan : "No plan"}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {row.planIsFree ? "Free grant" : row.planPrice !== "—" ? row.planPrice : ""}
            </p>
            {hasPlan && (
              <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
                <Clock size={10} /> {days > 0 ? `${days} days left` : "Expired"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "kyc", label: "KYC",
      render: (row) => (
        <div className="flex items-center gap-1">
          {[
            ["PAN", row.panVerified, IdCard],
            ["GST", row.gstVerified, Receipt],
            ["Bank", row.bankVerified, Landmark],
          ].map(([label, ok, Icon]) => (
            <HoverTip key={label} title={label} lines={[[ok ? "Verified" : "Not verified", Boolean(ok)]]}>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  ok ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                <Icon size={13} />
              </span>
            </HoverTip>
          ))}
        </div>
      ),
    },
    {
      key: "status", label: "Status",
      render: (row) => <BrandStatusBadge brand={row} />,
    },
    {
      key: "action", label: "Action", align: "right", sticky: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenBrand(row)}
            aria-label={`View ${row.brandName}`}
            title="View details"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-sky-400/40 hover:text-sky-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-sky-400"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => deleteBrand(row)}
            aria-label={`Delete ${row.brandName}`}
            title="Delete"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{isDummyScope ? "Dummy Brands" : isExpiredScope ? "Expired Brands" : "Live Brands"}</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              {isDummyScope
                ? "Test / demo brands (isDummy) — kept separate from Live Brands."
                : isExpiredScope
                ? "Approved brands whose plan has expired — they need a renewal to go live again."
                : "Approved brands that are live on the platform — open one to see its full profile."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
            >
              <FileDown size={14} />
              Export
            </button>

            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "grid" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  view === "table" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Overview charts — real data, independent of filters; kept small */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-neutral-900 dark:text-neutral-50">
              <PieChartIcon size={13} className="text-emerald-500" /> Status Mix
            </div>
            <div className="flex items-center gap-2.5">
              {/* Box is larger than the donut's diameter (2 × outerRadius)
                  plus Recharts' 5px margin, so the ring never gets clipped. */}
              <div className="relative h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={30}
                      outerRadius={42}
                      paddingAngle={3}
                      cornerRadius={4}
                      isAnimationActive={false}
                    >
                      {statusMix.map((s) => (
                        <Cell key={s.name} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[16px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{brands.length}</span>
                  <span className="mt-0.5 text-[9px] text-neutral-500">Total</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {statusMix.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[10.5px]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-neutral-500">{s.name}</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-50">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={13} className="text-emerald-500" /> Top Brands
            </div>
            <p className="mb-1 text-[10px] text-neutral-500">By followers</p>
            {topBrandsByFollowers.length ? (
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={topBrandsByFollowers} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#8C9A91", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => v.slice(0, 6)} />
                  <Tooltip />
                  <Bar dataKey="followers" name="Followers" fill="#2FDE8C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-22.5 items-center justify-center text-[11px] text-neutral-500">No data yet.</div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={13} className="text-emerald-500" /> Summary Report
            </div>
            <p className="mb-1 text-[10px] text-neutral-500">Brands per plan</p>
            {planMix.length ? (
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={planMix} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#8C9A91", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} tickFormatter={(v) => v.slice(0, 6)} />
                  <Tooltip />
                  <Bar dataKey="count" name="Brands" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-22.5 items-center justify-center text-[11px] text-neutral-500">No data yet.</div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
            <button onClick={() => fetchBrands()} className="font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}

        {/* Status tabs + Search + filters */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status tabs only on Live Brands — every row here is already expired */}
            {!isExpiredScope && STATUS_TABS.map((tab) => {
              const count =
                tab === "All"
                  ? brands.length
                  : tab === "Active Brand"
                  ? brands.filter((b) => b.active && !isExpiredBrand(b)).length
                  : tab === "Deactive Brand"
                  ? brands.filter((b) => !b.active && !isExpiredBrand(b)).length
                  : tab === "Expired Brand"
                  ? brands.filter((b) => isExpiredBrand(b)).length
                  : brands.filter((b) => b.isTopBrand).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTabAndReset(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusTab === tab
                      ? tab === "Top Brand"
                        ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {tab === "Top Brand" && <Sparkles size={12} />}
                  {STATUS_TAB_LABELS[tab]}
                  <span
                    className={`rounded-full px-1.5 text-[10.5px] ${
                      statusTab === tab
                        ? tab === "Top Brand"
                          ? "bg-amber-400/20"
                          : "bg-emerald-400/20"
                        : "bg-neutral-200 dark:bg-neutral-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900">
              <Search size={16} className="shrink-0 text-neutral-500" />
              <input
                value={search}
                onChange={(e) => setSearchAndReset(e.target.value)}
                placeholder="Search brand, location, category..."
                className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setPlanMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  planFilter !== "All Plans"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                Plan: {planFilter === "All Plans" ? "All" : planFilter}
              </button>

              {planMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPlanMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
                    <button
                      onClick={() => { setPlanFilterAndReset("All Plans"); setPlanMenuOpen(false); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      All Plans
                      {planFilter === "All Plans" && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
                    {plans.map((plan) => (
                      <button
                        key={plan.name}
                        onClick={() => { setPlanFilterAndReset(plan.name); setPlanMenuOpen(false); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <span>{plan.name}</span>
                        {planFilter === plan.name && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setCategoryMenuOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
                  categoryFilter !== "All Categories"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
                }`}
              >
                Category: {categoryFilter === "All Categories" ? "All" : categoryFilter}
              </button>

              {categoryMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCategoryMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/10 dark:bg-neutral-900 dark:shadow-black/40">
                    <button
                      onClick={() => { setCategoryFilterAndReset("All Categories"); setCategoryMenuOpen(false); }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      All Categories
                      {categoryFilter === "All Categories" && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    </button>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-800" />
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => { setCategoryFilterAndReset(cat); setCategoryMenuOpen(false); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        {cat}
                        {categoryFilter === cat && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={resetFilters}
              disabled={!filtersActive}
              title="Reset all filters"
              aria-label="Reset all filters"
              className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                filtersActive
                  ? "border-neutral-200 bg-white text-neutral-700 hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-red-400"
                  : "cursor-not-allowed border-neutral-200/60 bg-neutral-100/60 text-neutral-400 dark:border-neutral-800/60 dark:bg-neutral-900/60 dark:text-neutral-700"
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-4 py-16 text-neutral-500 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <Loader2 size={20} className="animate-spin" />
            Loading brands…
          </div>
        ) : view === "grid" ? (
          paged.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-4 py-16 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-500">
                <BadgeCheck size={22} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">No brands found</p>
                <p className="mt-0.5 text-[12.5px] text-neutral-500">
                  {filtersActive
                    ? "Try a different search or filter."
                    : isDummyScope
                    ? "No dummy brands right now."
                    : isExpiredScope
                    ? "No brands with an expired plan right now."
                    : "Approved brands will appear here."}
                </p>
              </div>
              {filtersActive && (
                <button
                  onClick={resetFilters}
                  className="rounded-xl border border-neutral-200 px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            // items-start: each card keeps its own height, so expanding Plan
            // usage / Onboarding on one card doesn't stretch its neighbours.
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((brand) => (
                <BrandCard key={brand.id} brand={brand} onOpen={handleOpenBrand} onEdit={handleEditBrand} onDelete={deleteBrand} />
              ))}
            </div>
          )
        ) : (
          <Table columns={columns} data={paged} emptyMessage="No brands found." minWidth={1180} />
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[12.5px] text-neutral-500">
              Showing {rangeStart} to {rangeEnd} of {filtered.length} brand{filtered.length === 1 ? "" : "s"}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                      n === safePage ? "bg-emerald-400 text-neutral-950" : "border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}