import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  MapPin,
  ShieldCheck,
  ArrowLeft,
  Image as ImageIcon,
  Store,
  Sparkles,
  Home,
  IdCard,
  Ticket,
  HandCoins,
  Repeat,
  UserCog,
  ArrowLeftRight,
  Undo2,
  FlaskConical,
  Lock,
  Hourglass,
  ChevronLeft,
  ChevronRight,
  Hash,
  CalendarDays,
} from "lucide-react";
import { DETAIL_TABS } from "../data/BrandData";
import {
  BrandAvatar,
  ToggleSwitch,
  ToggleActiveConfirmModal,
  OnboardingBadge,
  ApprovalDropdown,
  StatusBadge,
} from "../BrandShared";
import { compactCount, brandCardFacts } from "../brandCardUtils";
import { SubscriptionTab } from "../SubscriptionCenter";
import { TransactionsTab, RefundsTab } from "../BrandMoneyTabs";
import { formatBatch, isMissing, MISSING } from "../../../utils/helpers";
import ValueOr from "../../../components/common/ValueOr";
import ListingFeaturesTab from "../ListingFeaturesTab";
import { VerificationHistory, LiveSubscriptionPanel } from "../BrandAdminExtras";
import { BrandDebtSection } from "../../settlement/Settlement";
import { useBrands } from "../BrandContext";
import ComingSoonModal from "../ComingSoonModal";
import RdBadge from "../RdBadge";
import EditBrandModal from "./modals/EditBrandModal";
import TopBrandModal from "./modals/TopBrandModal";
import { CopyButton } from "./components/Bento";
import OverviewTab from "./tabs/OverviewTab";
import BrandInfoTab from "./tabs/BrandInfoTab";
import AmbienceTab from "./tabs/AmbienceTab";
import SubBrandTab from "./tabs/SubBrandTab";
import ListingsTab from "./tabs/ListingsTab";
import SettlementsTab from "./tabs/SettlementsTab";
import VoucherTab from "./tabs/VoucherTab";
import AccountDetailsTab from "./tabs/AccountDetailsTab";
import SystemVerificationTab from "./tabs/SystemVerificationTab";

const STATUS_ACCENTS = {
  Active: "from-emerald-400/25 via-emerald-400/0",
  Pending: "from-amber-400/25 via-amber-400/0",
  Rejected: "from-red-400/25 via-red-400/0",
  Draft: "from-amber-400/25 via-amber-400/0",
};

// Small leading icon per tab, purely visual — matches each tab's content.
// One cell of the header stat strip; `pct` adds a thin usage bar.
function HeaderStat({ label, value, sub, pct, tint = "bg-emerald-500" }) {
  return (
    <div className="min-w-[88px] px-4">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-neutral-400">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-[14px] font-semibold tabular-nums leading-tight text-neutral-900 dark:text-neutral-50">
        {value}
        {sub && <span className="ml-1 text-[10.5px] font-medium text-neutral-500">{sub}</span>}
      </p>
      {pct != null && (
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div className={`h-full rounded-full ${tint}`} style={{ width: `${Math.max(0, Math.min(100, Number(pct) || 0))}%` }} />
        </div>
      )}
    </div>
  );
}

// All tabs on one row; the scrollbar is hidden and ‹ › buttons appear on
// whichever side has more tabs. The active tab is scrolled into view.
function DetailTabBar({ tabs, active, onChange }) {
  const scrollerRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 2,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
    });
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollerRef.current
      ?.querySelector(`[data-tab="${CSS.escape(active)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [active]);

  const scrollBy = (dir) => scrollerRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  const arrow = (dir) => {
    const show = dir < 0 ? edges.left : edges.right;
    const Icon = dir < 0 ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={() => scrollBy(dir)}
        aria-label={dir < 0 ? "Previous tabs" : "Next tabs"}
        tabIndex={show ? 0 : -1}
        className={`absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-md transition-opacity hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:text-white ${
          dir < 0 ? "left-0" : "right-0"
        } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Icon size={15} />
      </button>
    );
  };

  return (
    <div className="relative">
      {/* edge fades under the arrows */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 z-[5] w-12 bg-gradient-to-r from-white to-transparent transition-opacity dark:from-neutral-900 ${edges.left ? "opacity-100" : "opacity-0"}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 z-[5] w-12 bg-gradient-to-l from-white to-transparent transition-opacity dark:from-neutral-900 ${edges.right ? "opacity-100" : "opacity-0"}`} />
      {arrow(-1)}
      {arrow(1)}

      {/* Room for the arrows when they show, so no tab sits under one. */}
      <div
        ref={scrollerRef}
        className={`no-scrollbar flex gap-1 overflow-x-auto scroll-smooth transition-[padding] ${edges.left ? "pl-9" : ""} ${edges.right ? "pr-9" : ""}`}
      >
        {tabs.map((t) => {
          const TabIcon = TAB_ICONS[t];
          const isActive = active === t;
          return (
            <button
              key={t}
              data-tab={t}
              onClick={() => onChange(t)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                isActive
                  ? "bg-emerald-400 text-neutral-950 shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {TabIcon && <TabIcon size={12} />}
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TAB_ICONS = {
  Overview: Home,
  "Brand Info": IdCard,
  "Showcase Media": ImageIcon,
  "Listing Features": Sparkles,
  "Sub-Brand": Store,
  Listings: Ticket,
  Settlements: HandCoins,
  Transactions: ArrowLeftRight,
  Refunds: Undo2,
  Voucher: Ticket,
  Subscription: Repeat,
  "System Verification": ShieldCheck,
  "Account Details": UserCog,
};

/* -------------------------------------------------------------------------
 * BrandDetails — full page with tab navigation
 *
 * Props:
 *  - brand           : the brand object to display
 *  - onBack()         : go back to the list page
 *  - onToggleActive(brand)
 *        → calls BrandContext.toggleActive(brand), which sends
 *          { status, isActive, hideFromCustomers: false } to the backend
 *  - onDelete(brand)
 *  - onUpdate(id, updates)               : save edits from "Edit Brand Details"
 *  - onDecision(brand, status, reason)   : approve/reject a Pending brand
 *  - onSetTopBrand(brand, { isTopBrand, topOrder })
 *        : PUT /brands/admin/top-brands/:brandId
 *          body -> { brandId, isTopBrand, topOrder }
 * ---------------------------------------------------------------------- */

// `onDelete` is still passed by BrandDetailsPage but unused while the
// Delete Brand button is commented out.
export default function BrandDetails({
  brand,
  onBack,
  onToggleActive,
  onUpdate,
  onDecision,
  onSetTopBrand,
}) {
  // The open tab lives in the URL (?tab=Voucher), so it survives a page
  // refresh and coming back from a voucher opened in that tab. Each tab
  // switch is its own history entry, so Back (browser or the page's Back
  // button, which uses history) steps through the tabs one by one before
  // leaving the page. Clicking the tab that's already open adds nothing.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = DETAIL_TABS.includes(tabParam) ? tabParam : "Overview";
  const setTab = (next) => {
    if (next === tab) return;
    // Only the tab — a tab's own view params (e.g. ?showcase=) start fresh.
    setSearchParams({ tab: next });
  };
  // The Brand list's logo-hover "Edit" opens this page with { openEdit: true }.
  const location = useLocation();
  // Dummy (isDummy) brands are view-only: no edit, delete, top-brand,
  // approve/reject, activate/deactivate, subscription or showcase changes.
  const readOnly = Boolean(brand.isDummy);
  const [showEditModal, setShowEditModal] = useState(!readOnly && Boolean(location.state?.openEdit));
  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showTopBrandModal, setShowTopBrandModal] = useState(false);
  // "Coming soon" on/off — its own modal (ComingSoonModal).
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const { setComingSoon } = useBrands();

  const tabContent = {
    Overview: <OverviewTab brand={brand} readOnly={readOnly} onComingSoon={() => setShowComingSoonModal(true)} />,
    "Brand Info": <BrandInfoTab brand={brand} />,
    "Showcase Media": <AmbienceTab brand={brand} readOnly={readOnly} />,
    "Listing Features": <ListingFeaturesTab brand={brand} readOnly={readOnly} />,
    // The add-ons below each tab cover super admin API doc endpoints the
    // tab didn't use yet; the tab's own content is unchanged.
    "Sub-Brand": <SubBrandTab brand={brand} readOnly={readOnly} />,
    Listings: <ListingsTab brand={brand} />,
    Settlements: (
      <>
        <SettlementsTab brand={brand} />
        {brand.id && (
          <div className="mt-4">
            <BrandDebtSection brandId={brand.id} />
          </div>
        )}
      </>
    ),
    Transactions: <TransactionsTab brand={brand} />,
    Refunds: <RefundsTab brand={brand} />,
    Voucher: <VoucherTab brand={brand} />,
    Subscription: (
      <>
        <SubscriptionTab brand={brand} onUpdate={onUpdate} readOnly={readOnly} />
        <LiveSubscriptionPanel brandId={brand.id} readOnly={readOnly} />
      </>
    ),
    "System Verification": (
      <>
        <SystemVerificationTab brand={brand} />
        <VerificationHistory brandId={brand.id} />
      </>
    ),
    "Account Details": <AccountDetailsTab brand={brand} />,
  };

  const incomplete = brand.onboardingComplete === false;
  const accent = STATUS_ACCENTS[brand.status] || "from-neutral-500/20 via-neutral-500/0";
  const headerCover = brand.coverImage || brand.ambiencePhotos?.[0];
  // Same outlet count the brand card shows.
  const headerOutletCount = brandCardFacts(brand).outletCount;

  // Outlets ring: used = the real outlet total; limit from the list's
  // "used/limit" (sub-brand + franchise pools). Unlimited → caption "4/∞".
  const outletsLimitStr = String(brand.subBrandCount || "").split("/")[1] ?? "";
  const outletsUsed = headerOutletCount;
  const outletsLimit = Number(outletsLimitStr);
  // No known limit → just the count (no "/—").
  const outletsCaption = isMissing(outletsLimitStr) ? `${outletsUsed}` : `${outletsUsed}/${outletsLimitStr}`;
  const outletUsagePct = Number.isFinite(outletsLimit) && outletsLimit > 0 ? Math.min(100, (outletsUsed / outletsLimit) * 100) : 0;

  const handleSetTopBrand = async (brandArg, payload) => {
    if (!onSetTopBrand) return;
    await onSetTopBrand(brandArg, payload);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <ArrowLeft size={13} />
            Back to Brands
          </button>

          {readOnly ? (
            <span
              title="D brands can't be edited or deleted"
              className="flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-[12.5px] font-medium text-violet-600 dark:text-violet-400"
            >
              <Lock size={13} />
              View only · D brand
            </span>
          ) : (
          <div className="flex flex-wrap items-center gap-2">
            {/* "Coming soon" (PUT /brands/admin/real-dummy/:id) — own modal */}
            <button
              onClick={() => setShowComingSoonModal(true)}
              title={brand.isRealDummy ? brand.realDummyNote || "Marked as RD brand" : "Mark this brand as RD brand"}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                brand.isRealDummy
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-violet-400/40 hover:text-violet-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-violet-400"
              }`}
            >
              <Hourglass size={13} />
              <span className="hidden sm:inline">{brand.isRealDummy ? "Remove RD" : "Mark as RD"}</span>
              <span className="sm:hidden">RD</span>
            </button>
            {onSetTopBrand && (
              <button
                onClick={() => setShowTopBrandModal(true)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${brand.isTopBrand
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-amber-400/40 hover:text-amber-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-amber-400"
                  }`}
              >
                <Sparkles size={13} />
                <span className="hidden sm:inline">{brand.isTopBrand ? `Top Brand · #${brand.topOrder}` : "Mark as Top Brand"}</span>
                <span className="sm:hidden">{brand.isTopBrand ? `#${brand.topOrder}` : "Top Brand"}</span>
              </button>
            )}
            {/* Edit Brand Details + Delete Brand — commented out for now.
                Delete has no API (it only removed the brand locally); Edit
                saves just name / about / email / logo.
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-emerald-400"
            >
              <Pencil size={13} />
              <span className="hidden sm:inline">Edit Brand Details</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={() => onDelete(brand)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete Brand</span>
            </button>
            */}
          </div>
          )}
        </div>

        {/* Header card — compact cover banner, identity + stats in one row,
            then the tab bar (one row with ‹ › buttons). */}
        <div className="relative mb-5 rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-neutral-200/70 dark:bg-neutral-900 dark:shadow-black/20 dark:ring-neutral-800/80">
          {/* Cover banner: cover image → first ambience photo → blurred logo → status glow */}
          <div className="relative h-20 overflow-hidden rounded-t-3xl sm:h-24">
            {headerCover ? (
              <img src={headerCover} alt="" className="h-full w-full object-cover" />
            ) : brand.logo ? (
              // No cover: a soft wash of the logo's colours — kept low so a
              // bright logo doesn't turn the banner neon.
              <div className="h-full w-full bg-neutral-100 dark:bg-neutral-900">
                <img src={brand.logo} alt="" aria-hidden="true" className="h-full w-full scale-150 object-cover opacity-30 blur-3xl saturate-50" />
              </div>
            ) : (
              <div className={`h-full w-full bg-gradient-to-br ${accent} to-transparent`} />
            )}
            {/* fade the banner into the card */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-white/90 dark:to-neutral-900/90" />

            {!brand.coverImage && (
              <span className="absolute left-4 top-2.5 flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur">
                <ImageIcon size={10} />
                {headerCover ? "Ambience photo" : "No cover image"}
              </span>
            )}

            {/* Active/Inactive works on dummy brands too (one of their two actions). */}
            <div className="absolute right-4 top-2.5 flex items-center gap-2 rounded-full bg-black/30 py-0.5 pl-2.5 pr-0.5 text-[11px] font-medium text-white backdrop-blur">
              {brand.active ? "Active" : "Inactive"}
              <ToggleSwitch
                checked={brand.active}
                onChange={() => setShowToggleConfirm(true)}
                title={brand.active ? "Deactivate" : "Activate"}
              />
            </div>
          </div>

          {/* Identity (left) + stats (right) */}
          <div className="flex flex-col gap-3 px-5 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-end gap-3.5">
              <div className="-mt-9 shrink-0 rounded-2xl bg-white p-1 shadow-lg ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
                <BrandAvatar brand={brand} size="lg" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h1 className="text-[17px] font-semibold capitalize leading-tight text-neutral-900 dark:text-neutral-50">{brand.brandName}</h1>
                  {incomplete ? (
                    <OnboardingBadge brand={brand} />
                  ) : brand.status === "Pending" && onDecision && !readOnly ? (
                    <ApprovalDropdown brand={brand} onDecision={onDecision} size="sm" />
                  ) : (
                    <StatusBadge status={brand.status} activeLabel="Active" />
                  )}
                  {brand.isRealDummy && (
                    <RdBadge
                      brand={brand}
                      iconSize={10}
                      className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400"
                    />
                  )}
                  {brand.isDummy && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
                      <FlaskConical size={10} />
                      D{brand.dummyBatch ? ` · ${formatBatch(brand.dummyBatch)}` : ""}
                    </span>
                  )}
                </div>

                {/* Meta — each item has its own icon (no dot separators, so a
                    wrap never leaves a dangling "·" at the end of a line) */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-neutral-500">
                  {brand.location && brand.location !== "—" && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="shrink-0 text-neutral-400" />
                      {brand.location}
                    </span>
                  )}
                  {brand.merchantToken && brand.merchantToken !== "—" && (
                    <span title="Merchant ID" className="flex items-center gap-1 font-mono text-[11px] normal-case">
                      <IdCard size={11} className="shrink-0 text-neutral-400" />
                      {brand.merchantToken}
                      {/* negative margin keeps the 28px button from growing the meta row */}
                      <span className="-my-2 -ml-1">
                        <CopyButton value={brand.merchantToken} label="merchant ID" />
                      </span>
                    </span>
                  )}
                  {brand.brandId && (
                    <span title="Brand ID" className="flex items-center gap-1 normal-case">
                      <Hash size={11} className="shrink-0 text-neutral-400" />
                      {String(brand.brandId).replace(/^#/, "")}
                    </span>
                  )}
                  {brand.joinedDate && (
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} className="shrink-0 text-neutral-400" />
                      Joined {new Date(brand.joinedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats — one compact strip */}
            <div className="flex flex-wrap gap-y-2 rounded-2xl border border-neutral-200/80 bg-white py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.06)] sm:flex-nowrap sm:divide-x sm:divide-neutral-200 dark:border-neutral-800 dark:bg-neutral-950/50 dark:shadow-black/20 dark:sm:divide-neutral-800">
              <HeaderStat label="Followers" value={compactCount(brand.followers)} />
              <HeaderStat label="Avoided" value={compactCount(brand.avoidanceCount)} />
              <HeaderStat label="Outlets" value={outletsCaption} pct={outletUsagePct} tint="bg-sky-500" />
              {!incomplete && (
                <>
                  <HeaderStat
                    label="Plan"
                    value={<ValueOr value={brand.subscriptionPlan} fallback={MISSING.plan} />}
                    sub={isMissing(brand.planPrice) ? null : brand.planPrice}
                  />
                  <HeaderStat
                    label="Validity"
                    value={brand.expiredInDays != null ? `${brand.expiredInDays}d left` : <ValueOr value={null} fallback={MISSING.date} />}
                    pct={brand.remainderPercent}
                    tint="bg-emerald-500"
                  />
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-neutral-100 px-3 py-2.5 dark:border-neutral-800">
            <DetailTabBar tabs={DETAIL_TABS} active={tab} onChange={setTab} />
          </div>
        </div>

        {/* Tab content */}
        {tabContent[tab]}
      </div>

      {showEditModal && !readOnly && (
        <EditBrandModal
          brand={brand}
          onClose={() => setShowEditModal(false)}
          onSave={onUpdate}
        />
      )}

      {showToggleConfirm && (
        <ToggleActiveConfirmModal
          brand={brand}
          willActivate={!brand.active}
          onClose={() => setShowToggleConfirm(false)}
          onConfirm={(hideFromCustomers) => {
            // Pass the modal's "Also hide from customers" choice through.
            onToggleActive(brand, hideFromCustomers);
            setShowToggleConfirm(false);
          }}
        />
      )}

      {showComingSoonModal && !readOnly && (
        <ComingSoonModal brand={brand} onClose={() => setShowComingSoonModal(false)} onSubmit={setComingSoon} />
      )}

      {showTopBrandModal && !readOnly && (
        <TopBrandModal
          brand={brand}
          onClose={() => setShowTopBrandModal(false)}
          onSubmit={handleSetTopBrand}
        />
      )}
    </div>
  );
}
