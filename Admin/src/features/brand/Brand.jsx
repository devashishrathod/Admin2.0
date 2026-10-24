import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  Sparkles,
  Hourglass,
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
  Power,
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
  Lock,
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
import { ToggleActiveConfirmModal, UsageBar } from "./BrandShared";
import { ONBOARDING_FLAG_LABELS, compactCount, brandCardFacts } from "./brandCardUtils";
import TopBrandModal from "./BrandDetails/modals/TopBrandModal";
import ComingSoonModal from "./ComingSoonModal";
import RdBadge from "./RdBadge";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import { formatBatch, MISSING } from "../../utils/helpers";
import ValueOr from "../../components/common/ValueOr";
import Loader from "../../components/common/Loader";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { localDateStr } from "../../utils/overviewStats";

const STATUS_TABS = ["All", "Active Brand", "Deactive Brand", "Hidden Brand", "Top Brand"];
const STATUS_TAB_LABELS = {
  All: "All",
  "Active Brand": "Verified",
  "Deactive Brand": "Inactive",
  "Hidden Brand": "Hidden",
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
      {/* No Edit for view-only (dummy) brands — onEdit is left undefined. */}
      {onEdit && (
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
      )}
    </span>
  );
}

/* Compact icon + switch used on the brand card's top-right. `tone` is the
   "on" colour: emerald for Active, amber for Hidden-from-customers. */
function MiniToggle({ icon: Icon, checked, tone = "emerald", label, onClick }) {
  const onTrack = tone === "amber" ? "bg-amber-400" : "bg-emerald-500";
  const onIcon = tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex items-center gap-1"
    >
      <Icon size={13} className={`shrink-0 ${checked ? onIcon : "text-neutral-400"}`} />
      {/* Track must be a block box — an inline <span> ignores width/height,
          which let the knob slide outside the pill. */}
      <span
        className={`relative inline-block h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? onTrack : "bg-neutral-300 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute left-[2px] top-[2px] block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[14px]" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/* Search as an icon button; a click opens the input (autofocused). It
   stays open while it has text and folds back to the icon when emptied
   and left — keeps the tabs + filters on one line. */
function CollapsibleSearch({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(Boolean(value));
  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search brands"
        title="Search brands"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-neutral-100"
      >
        <Search size={16} />
      </button>
    );
  }
  return (
    <div className="flex w-56 shrink-0 items-center gap-2 rounded-xl border border-emerald-400/40 bg-white px-3 py-2.5 dark:bg-neutral-900">
      <Search size={15} className="shrink-0 text-neutral-500" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !value && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        aria-label="Close search"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// `onDelete` is still passed in but unused while Delete Brand is commented
// out of the menu (there's no delete API yet — it only removed the card locally).
function BrandCard({ brand, onOpen, onEdit, onToggleActive, onToggleHidden, onSetTopBrand, onSetComingSoon }) {
  // Dummy (isDummy) brands are view-only: no Edit, no Delete.
  const readOnly = Boolean(brand.isDummy);
  // Confirm popup for Active/Inactive (same one the details page uses).
  const [showActiveConfirm, setShowActiveConfirm] = useState(false);
  // Top Brand placement — same modal as the details page.
  const [showTopBrandModal, setShowTopBrandModal] = useState(false);
  // "Coming soon" on/off — its own modal (ComingSoonModal).
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
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
  const statusLabel = brand.status === "Pending" || brand.status === "Rejected" ? brand.status : getBrandStatusLabel(brand);
  const cover = brand.coverImage || brand.ambiencePhotos?.[0];
  const usage = brand.usage;
  // Shared with the brand details Overview (brandCardUtils).
  const {
    outletCount,
    hasPlan,
    flags,
    onboardingDone,
    onboardingMissing,
    isRegistered,
    registrationLabel,
    entityTypeLabel,
    subCategory,
    merchantId,
  } = brandCardFacts(brand);

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
      {/* Keep the existing compact three-dot control; place brand actions in
          its menu instead of taking up space above the cover. */}
      <div className="absolute right-5 top-5 z-20">
        {readOnly ? (
          <span
            title="D brand — view only"
            aria-label="View only"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-violet-600 shadow-sm backdrop-blur dark:bg-neutral-900/80 dark:text-violet-400"
          >
            <Lock size={14} />
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              aria-label={`More actions for ${brand.brandName}`}
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-neutral-900 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <MoreVertical size={15} />
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close brand actions"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 shadow-xl shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/40">
                  <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/70">
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
                      <Power
                        size={14}
                        className={`shrink-0 ${brand.active ? "text-neutral-500" : "text-amber-600 dark:text-amber-400"}`}
                      />
                      Inactive
                    </span>
                    {/* ON = brand is inactive (same sense as "Hide from customers"). */}
                    <MiniToggle
                      icon={Power}
                      checked={!brand.active}
                      tone="amber"
                      label={brand.active ? "Deactivate brand" : "Activate brand"}
                      onClick={() => {
                        setMenuOpen(false);
                        setShowActiveConfirm(true);
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/70">
                    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
                      <EyeOff
                        size={14}
                        className={`shrink-0 ${brand.hiddenFromCustomers ? "text-amber-600 dark:text-amber-400" : "text-neutral-500"}`}
                      />
                      Hide from customers
                    </span>
                    {/* ON = hidden from customers. */}
                    <MiniToggle
                      icon={EyeOff}
                      checked={Boolean(brand.hiddenFromCustomers)}
                      tone="amber"
                      label={brand.hiddenFromCustomers ? "Show to customers" : "Hide from customers"}
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleHidden?.(brand, !brand.hiddenFromCustomers);
                      }}
                    />
                  </div>
                  {onSetTopBrand && (
                    <>
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          setShowTopBrandModal(true);
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-medium text-neutral-700 transition-colors hover:bg-amber-50 dark:text-neutral-300 dark:hover:bg-amber-950/20"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-500" />
                          {brand.isTopBrand ? "Edit Top Brand" : "Mark as Top Brand"}
                        </span>
                        {brand.isTopBrand && (
                          <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            #{brand.topOrder}
                          </span>
                        )}
                      </button>
                    </>
                  )}
                  {onSetComingSoon && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        setShowComingSoonModal(true);
                      }}
                      title={brand.realDummyNote || undefined}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-medium text-neutral-700 transition-colors hover:bg-violet-50 dark:text-neutral-300 dark:hover:bg-violet-950/20"
                    >
                      <span className="flex items-center gap-2">
                        <Hourglass size={14} className="text-violet-500" />
                        {brand.isRealDummy ? "Remove RD" : "Mark as RD"}
                      </span>
                      {brand.isRealDummy && (
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                          ON
                        </span>
                      )}
                    </button>
                  )}
                  {/* Delete Brand — commented out for now: there's no delete
                      API yet, so it only removed the card locally and the
                      brand came back on the next refresh.
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(brand);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} />
                    Delete Brand
                  </button>
                  */}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Portal to <body> — the card's transform/blur would otherwise trap
          the fixed overlay inside the card instead of centring it on screen. */}
      {(showComingSoonModal || showTopBrandModal || showActiveConfirm) &&
        createPortal(
          <>
            {showComingSoonModal && (
              <ComingSoonModal brand={brand} onClose={() => setShowComingSoonModal(false)} onSubmit={onSetComingSoon} />
            )}

            {showTopBrandModal && (
              <TopBrandModal
                brand={brand}
                onClose={() => setShowTopBrandModal(false)}
                onSubmit={onSetTopBrand}
              />
            )}

            {showActiveConfirm && (
              <ToggleActiveConfirmModal
                brand={brand}
                willActivate={!brand.active}
                onClose={() => setShowActiveConfirm(false)}
                onConfirm={(hideFromCustomers) => {
                  onToggleActive?.(brand, hideFromCustomers);
                  setShowActiveConfirm(false);
                }}
              />
            )}
          </>,
          document.body
        )}

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
                  <LogoActions size="lg" onView={() => onOpen(brand)} onEdit={readOnly ? undefined : () => onEdit?.(brand)} />
                </div>
              </div>
            </>
          )}

          {/* Pill tags */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 pr-40">
            {/* "Verified" is the blue tick next to the name below;
                Expired / Inactive still get their own pill here. */}
            {brand.isDummy && (
              <span className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm dark:bg-neutral-900 dark:text-violet-400">
                <FlaskConical size={12} />
                D
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
            {brand.isRealDummy && (
              <RdBadge
                brand={brand}
                className="rounded-full bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-violet-600 shadow-sm dark:bg-neutral-900 dark:text-violet-400"
              />
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
            <LogoActions onView={() => onOpen(brand)} onEdit={readOnly ? undefined : () => onEdit?.(brand)} />
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
              <ValueOr value={brand.category} fallback={MISSING.category} />
              {subCategory && <span className="text-neutral-400"> › {subCategory}</span>}
            </span>
          </p>
          {brand.isDummy && brand.dummyBatch && (
            <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-violet-600 dark:text-violet-400">
              <Layers size={11} className="shrink-0" /> {formatBatch(brand.dummyBatch)}
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
                <span className="text-[11.5px] font-bold text-neutral-400">No usage data</span>
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
          <span className="text-[11px] text-neutral-400">No merchant ID</span>
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
// Multiples of 3 so the 3-column grid always fills complete rows; 9 is the default.
const PAGE_SIZE_OPTIONS = [9, 18, 36];

function paginationItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "end-gap", total];
  if (current >= total - 3) return [1, "start-gap", ...Array.from({ length: 5 }, (_, index) => total - 4 + index)];
  return [1, "start-gap", current - 1, current, current + 1, "end-gap", total];
}

// sessionStorage can throw (private mode / blocked storage) — never let that
// break the page.
function readSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// scope "live" = Live Brands (every approved brand); "expired" = Expired
// Brands (only approved brands whose plan has run out).
const isExpired = (b) => b.status === "Expired" || isExpiredBrand(b);

export default function Brand({ scope = "live" }) {
  const navigate = useNavigate();
  const isExpiredScope = scope === "expired";
  const isDummyScope = scope === "dummy";
  // Real brands shown as "Coming soon" (isRealDummy) — same UI as D Brands.
  const isRealDummyScope = scope === "realDummy";
  // Pages that use the D-Brands layout (KPI tiles, 3 overview charts).
  const isTileScope = isDummyScope || isRealDummyScope;
  const {
    brands: liveBrands,
    dummyBrands,
    loading,
    error,
    fetchBrands,
    deleteBrandById,
    toggleActive,
    setHiddenFromCustomers,
    setTopBrand,
    setComingSoon,
  } = useBrands();
  // Everything below (charts, tabs, filters, table) works on this list.
  const brands = isDummyScope
    ? dummyBrands
    : isRealDummyScope
    ? liveBrands.filter((b) => b.isRealDummy === true)
    : isExpiredScope
    ? liveBrands.filter(isExpired)
    : // Real-dummy brands move to their own "Real Dummy" page.
      liveBrands.filter((b) => !b.isRealDummy);

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("All");
  // Grid by default. View + page are remembered per list (Live / Expired /
  // Dummy) for the session, so Back from a brand returns to the same spot.
  const [view, setView] = useState(() => readSession(`brands:${scope}:view`) || "grid");
  const [planFilter, setPlanFilter] = useState("All Plans");
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  // Joined-date range ("YYYY-MM-DD", IST) — empty = no limit on that side.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(() => Number(readSession(`brands:${scope}:page`)) || 1);
  const [pageSize, setPageSize] = useState(() => {
    const savedPageSize = Number(readSession(`brands:${scope}:pageSize`));
    return PAGE_SIZE_OPTIONS.includes(savedPageSize) ? savedPageSize : PAGE_SIZE_OPTIONS[0];
  });
  useEffect(() => {
    writeSession(`brands:${scope}:view`, view);
    writeSession(`brands:${scope}:page`, String(page));
    writeSession(`brands:${scope}:pageSize`, String(pageSize));
  }, [scope, view, page, pageSize]);

  const hasValue = (v) => Boolean(v) && v !== "—";
  const categories = [...new Set(brands.map((b) => b.category).filter(hasValue))].sort();
  // Plans the live brands are actually on (Pro Plus, Free Trial, …) — a
  // hard-coded list missed real plan names, so those could never be picked.
  const plans = [...new Set(brands.map((b) => b.subscriptionPlan).filter(hasValue))]
    .sort()
    .map((name) => ({ name }));

  const matchesTab = (b, tab) =>
    tab === "All"
      ? true
      : tab === "Active Brand"
      ? b.active && !isExpiredBrand(b)
      : tab === "Deactive Brand"
      ? !b.active && !isExpiredBrand(b)
      : tab === "Hidden Brand"
      ? Boolean(b.hiddenFromCustomers)
      : tab === "Top Brand"
      ? Boolean(b.isTopBrand)
      : true;

  // Search + plan + category + joined date — every filter except the status
  // tab. The tab counts use this, so each tab's number is what that tab
  // would show. A brand with no joined date drops out once a date is set.
  const filterBase = brands.filter((b) => {
    const matchesSearch =
      b.brandName?.toLowerCase().includes(search.toLowerCase()) ||
      b.location?.toLowerCase().includes(search.toLowerCase()) ||
      b.category?.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "All Plans" || b.subscriptionPlan === planFilter;
    const matchesCategory = categoryFilter === "All Categories" || b.category === categoryFilter;
    const joined = localDateStr(b.joinedDate);
    const matchesDate = (!dateFrom || (joined && joined >= dateFrom)) && (!dateTo || (joined && joined <= dateTo));
    return matchesSearch && matchesPlan && matchesCategory && matchesDate;
  });
  const tabCount = (tab) => filterBase.filter((b) => matchesTab(b, tab)).length;

  const filtered = filterBase.filter((b) => matchesTab(b, statusTab))
    // Top brands first in their topOrder (#1, #2, #3…), the rest keep the
    // API order after them. sort() is stable, so ties stay put.
    .sort((a, b) => {
      const rank = (x) => (x.isTopBrand ? Number(x.topOrder) || Infinity : Infinity);
      return rank(a) - rank(b) || 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);
  const pageItems = paginationItems(safePage, totalPages);

  const applyFilter = (setter) => (value) => { setter(value); setPage(1); };
  const setStatusTabAndReset = applyFilter(setStatusTab);
  const setSearchAndReset = applyFilter(setSearch);
  const setPlanFilterAndReset = applyFilter(setPlanFilter);
  const setCategoryFilterAndReset = applyFilter(setCategoryFilter);
  const setDateFromAndReset = applyFilter(setDateFrom);
  const setDateToAndReset = applyFilter(setDateTo);

  const resetFilters = () => {
    setSearch("");
    setStatusTab("All");
    setPlanFilter("All Plans");
    setCategoryFilter("All Categories");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  const filtersActive =
    Boolean(search) ||
    statusTab !== "All" ||
    planFilter !== "All Plans" ||
    categoryFilter !== "All Categories" ||
    Boolean(dateFrom || dateTo);

  // Empty state for both views — wording follows the list and the filters.
  const brandEmpty = filtersActive
    ? {
        icon: "search",
        title: "No brands match your filters",
        description: "Try a different search, status, plan or category — or clear the filters to see every brand.",
        action: { label: "Clear filters", onClick: resetFilters },
      }
    : isDummyScope
    ? {
        icon: "brand",
        title: "No D brands",
        description: "Test / demo brands will show up here once they're added.",
      }
    : isRealDummyScope
    ? {
        icon: "brand",
        title: "No real dummy brands",
        description: "Brands you mark as “Coming soon” (from a brand's ⋮ menu or its details page) show up here.",
      }
    : isExpiredScope
    ? {
        icon: "brand",
        title: "No expired brands",
        description: "Every approved brand has an active plan right now — nothing needs a renewal.",
      }
    : {
        icon: "brand",
        title: "No live brands yet",
        description: "Brands appear here once they finish onboarding and you approve them.",
        action: { label: "Go to Brand Waiting", onClick: () => navigate("/brand-waiting") },
      };

  // Overview charts — follow the current status tab, search, plan and
  // category (every page of the result, not just the visible page), so
  // they always describe the brands the list is showing.
  const activeCount = filtered.filter((b) => b.active && !isExpiredBrand(b)).length;
  const deactiveCount = filtered.filter((b) => !b.active && !isExpiredBrand(b)).length;
  const expiredCount = filtered.filter(isExpiredBrand).length;
  const hiddenFromCustomersCount = filtered.filter((b) => b.hiddenFromCustomers).length;
  const statusMix = [
    { name: "Verified", value: activeCount, color: "#2FDE8C" },
    { name: "Deactive", value: deactiveCount, color: "#A3A3A3" },
    { name: "Expired", value: expiredCount, color: "#F87171" },
  ].filter((s) => s.value > 0);

  const topBrandsByFollowers = [...filtered]
    .sort((a, b) => (Number(b.followers) || 0) - (Number(a.followers) || 0))
    .slice(0, 5)
    .map((b) => ({ name: b.brandName, followers: Number(b.followers) || 0 }));

  const sortedPlanMix = Object.entries(
    filtered.reduce((acc, b) => {
      const plan = b.subscriptionPlan && b.subscriptionPlan !== "—" ? b.subscriptionPlan : "No plan";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const planMix = sortedPlanMix.length > 6
    ? [
        ...sortedPlanMix.slice(0, 5),
        { name: "Other plans", count: sortedPlanMix.slice(5).reduce((sum, plan) => sum + plan.count, 0) },
      ]
    : sortedPlanMix;

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
        <span className="font-mono text-[12px] text-neutral-400">{String((safePage - 1) * pageSize + index + 1).padStart(2, "0")}</span>
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
              <ValueOr value={row.category} fallback={MISSING.category} />
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
                  <FlaskConical size={9} />{formatBatch(row.dummyBatch) || "D"}
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
          <p className="truncate font-medium capitalize text-neutral-800 dark:text-neutral-200"><ValueOr value={row.vendorName || row.ownerName} fallback={MISSING.name} /></p>
          {row.vendorName && row.ownerName && row.ownerName !== row.vendorName && (
            <p className="truncate text-[11px] text-neutral-500">{row.ownerName}</p>
          )}
          <p className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] text-neutral-500">
            <Phone size={10} className="shrink-0" /> <ValueOr value={row.contactPhone} fallback={MISSING.phone} />
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
          <span className="text-[11.5px] text-neutral-400">No usage data</span>
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
          {row.isDummy ? (
            // Dummy brands are view-only — no Delete.
            <span
              title="D brand — view only"
              aria-label="View only"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
            >
              <Lock size={13} />
            </span>
          ) : (
            <button
              onClick={() => deleteBrand(row)}
              aria-label={`Delete ${row.brandName}`}
              title="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          )}
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
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">{isDummyScope ? "D Brands" : isRealDummyScope ? "Real Dummy Brands" : isExpiredScope ? "Expired Brands" : "Live Brands"}</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              {isDummyScope
                ? "Test / demo brands — kept separate from Live Brands."
                : isRealDummyScope
                ? "Real, approved brands shown to customers as “Coming soon” until launch."
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
          </div>
        </div>

        {/* D Brands / Real Dummy — KPI tiles like Live Vouchers; clicking one filters the list. */}
        {isTileScope && (
          <div className={`mb-4 grid grid-cols-2 gap-3 ${isRealDummyScope ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
            <StatTile
              icon={isRealDummyScope ? Hourglass : Store}
              label={isRealDummyScope ? "Coming Soon" : "Total D Brands"}
              value={tabCount("All")}
              hint={isRealDummyScope ? "Shown as coming soon" : "Test / demo brands"}
              tint="emerald"
              active={statusTab === "All"}
              onClick={() => setStatusTabAndReset("All")}
            />
            <StatTile
              icon={ShieldCheck}
              label="Verified"
              value={tabCount("Active Brand")}
              hint="Active right now"
              tint="sky"
              active={statusTab === "Active Brand"}
              onClick={() => setStatusTabAndReset("Active Brand")}
            />
            <StatTile
              icon={Power}
              label="Inactive"
              value={tabCount("Deactive Brand")}
              hint="Switched off"
              tint="neutral"
              active={statusTab === "Deactive Brand"}
              onClick={() => setStatusTabAndReset("Deactive Brand")}
            />
            {/* No Top Brand tab on Real Dummy, so no tile for it either. */}
            {!isRealDummyScope && (
              <StatTile
                icon={Sparkles}
                label="Top Brands"
                value={tabCount("Top Brand")}
                hint="Marked as top"
                tint="amber"
                active={statusTab === "Top Brand"}
                onClick={() => setStatusTabAndReset("Top Brand")}
              />
            )}
            {isRealDummyScope ? (
              <StatTile
                icon={EyeOff}
                label="Hidden"
                value={tabCount("Hidden Brand")}
                hint="Hidden from customers"
                tint="violet"
                active={statusTab === "Hidden Brand"}
                onClick={() => setStatusTabAndReset("Hidden Brand")}
              />
            ) : (
              <StatTile
                icon={Layers}
                label="Batches"
                value={new Set(filtered.map((b) => b.dummyBatch).filter(Boolean)).size}
                hint="Seed batches"
                tint="violet"
              />
            )}
          </div>
        )}

        {/* Overview charts — real data for the current tab + filters; kept small */}
        <div className={`mb-5 grid grid-cols-1 gap-3 ${isTileScope || isExpiredScope ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
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
                  <span className="text-[16px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{filtered.length}</span>
                  <span className="mt-0.5 text-[9px] text-neutral-500">{filtersActive ? "Shown" : "Total"}</span>
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

          {!isTileScope && !isExpiredScope && (
            <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-neutral-900 dark:text-neutral-50">
                <EyeOff size={13} className="text-amber-500" /> Hidden from Customers
              </div>
              <p className="text-[10px] text-neutral-500">Brands hidden using the customer visibility toggle</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-3xl font-bold leading-none text-neutral-900 dark:text-neutral-50">
                  {hiddenFromCustomersCount}
                </span>
                <span className="pb-0.5 text-[11px] text-neutral-500">
                  {hiddenFromCustomersCount === 1 ? "brand" : "brands"}
                </span>
              </div>
            </div>
          )}
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
        {/* One line: tabs on the left (never wrap; scroll sideways on narrow
            screens), filters on the right as compact pills. */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto">
            {/* Status tabs only on Live Brands — every row here is already expired */}
            {!isExpiredScope && STATUS_TABS.filter(
              (tab) => !(isDummyScope && tab === "Hidden Brand") && !(isRealDummyScope && tab === "Top Brand")
            ).map((tab) => {
              const count = tabCount(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTabAndReset(tab)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                    statusTab === tab
                      ? tab === "Top Brand"
                        ? "bg-amber-400/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {tab === "Top Brand" ? <Sparkles size={12} /> : tab === "Hidden Brand" ? <EyeOff size={12} /> : null}
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

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
            <CollapsibleSearch value={search} onChange={setSearchAndReset} placeholder="Search brand, category..." />

            <div className="relative shrink-0">
              <button
                onClick={() => setPlanMenuOpen((o) => !o)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
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

            <div className="relative shrink-0">
              <button
                onClick={() => setCategoryMenuOpen((o) => !o)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors ${
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

            {/* Joined date range — start / end shown in full */}
            <div className="shrink-0" title="Filter by the date the brand joined">
              <DateRangeFilter
                startDate={dateFrom}
                endDate={dateTo}
                onStartChange={setDateFromAndReset}
                onEndChange={setDateToAndReset}
                onClear={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
              />
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

        {/* List controls — keep the result count, page size and view switch
            together above the list. */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-neutral-500">
            {loading
              ? "Loading brands…"
              : filtered.length
              ? `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} brand${filtered.length === 1 ? "" : "s"}`
              : "No brands to show"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] text-neutral-500">
              Per page
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-xl border border-neutral-200 bg-white px-2.5 text-[12px] font-medium text-neutral-700 outline-none focus:border-emerald-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              >
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                title="Grid view"
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                  view === "grid" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setView("table")}
                aria-label="Table view"
                aria-pressed={view === "table"}
                title="Table view"
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                  view === "table" ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <List size={15} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <Loader label="Loading brands…" />
        ) : view === "grid" ? (
          paged.length === 0 ? (
            <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <EmptyState {...brandEmpty} />
            </div>
          ) : (
            // items-start: each card keeps its own height, so expanding Plan
            // usage / Onboarding on one card doesn't stretch its neighbours.
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  onOpen={handleOpenBrand}
                  onEdit={handleEditBrand}
                  onDelete={deleteBrand}
                  onToggleActive={toggleActive}
                  onToggleHidden={setHiddenFromCustomers}
                  onSetTopBrand={setTopBrand}
                  onSetComingSoon={setComingSoon}
                />
              ))}
            </div>
          )
        ) : (
          <Table columns={columns} data={paged} emptyTitle={brandEmpty.title} emptyDescription={brandEmpty.description} emptyIcon={brandEmpty.icon} emptyAction={brandEmpty.action} minWidth={1180} />
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
                {pageItems.map((item) => typeof item === "number" ? (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    aria-label={`Go to page ${item}`}
                    aria-current={item === safePage ? "page" : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors ${
                      item === safePage ? "bg-emerald-400 text-neutral-950" : "border border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
                    }`}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} aria-hidden="true" className="px-1 text-neutral-400">…</span>
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