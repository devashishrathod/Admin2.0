import React, { useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tags,
  Layers,
  BadgeCheck,
  UserPlus,
  Hourglass,
  Clock,
  PencilLine,
  ImageUp,
  CalendarX,
  TimerOff,
  CreditCard,
  Repeat,
  Gift,
  Ticket,
  ArrowLeftRight,
  Undo2,
  HandCoins,
  Megaphone,
  Image,
  MonitorPlay,
  X,
  Percent,
  Bell,
  HelpCircle,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// Grouped nav — each group renders with an uppercase label (hidden when
// collapsed). Ordered the way an admin works through the platform: the big
// picture and the money first, the catalog structure, then brands and
// vouchers (each in lifecycle order: new → waiting for approval → live),
// plans, customers, marketing, reports, and system config last.
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analysis-all", label: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    label: "Payments",
    items: [
      { id: "transaction", label: "Transactions", icon: ArrowLeftRight, path: "/transaction" },
      { id: "refund", label: "Refunds", icon: Undo2, path: "/refund" },
      { id: "settlements", label: "Settlements", icon: HandCoins, path: "/settlements" },
    ],
  },  {
    label: "Catalog",
    items: [
      { id: "main-category", label: "Main Category", icon: Tags, path: "/main-category" },
      { id: "sub-category", label: "Sub Category", icon: Layers, path: "/sub-category" },
    ],
  },
  {
    label: "Brands",
    items: [
      { id: "new-onboarding", label: "New Onboarding", icon: UserPlus, path: "/new-onboarding" },
      { id: "brand-waiting", label: "Brand Waiting", icon: Hourglass, path: "/brand-waiting" },
      { id: "brand", label: "Live Brands", icon: BadgeCheck, path: "/brand" },
      { id: "brand-expired", label: "Expired Brands", icon: CalendarX, path: "/brand/expired" },
      { id: "brand-dummy", label: "Dummy Brands", icon: FlaskConical, path: "/brand/dummy" },
    ],
  },
  {
    label: "Vouchers",
    items: [
      { id: "voucher-drafts", label: "Draft Vouchers", icon: PencilLine, path: "/voucher-drafts" },
      { id: "voucher-waiting", label: "Voucher Waiting", icon: Clock, path: "/voucher-waiting" },
      { id: "voucher-banners", label: "Banner Approval", icon: ImageUp, path: "/voucher-banners" },
      { id: "voucher-listing", label: "Live Vouchers", icon: Gift, path: "/vendor-listing" },
      { id: "voucher-expired", label: "Expired Vouchers", icon: TimerOff, path: "/voucher-expired" },
      { id: "voucher-dummy", label: "Dummy Vouchers", icon: FlaskConical, path: "/voucher-dummy" },
    ],
  },
  {
    label: "Plans",
    items: [
      { id: "vendor-plan", label: "Vendor Plans", icon: CreditCard, path: "/vendor-plan" },
      { id: "subscriptions", label: "Subscriptions", icon: Repeat, path: "/subscriptions" },
      { id: "subscriptions-dummy", label: "Dummy Subscriptions", icon: FlaskConical, path: "/subscriptions/dummy" },
      // Hidden from the sidebar for now — page and route still exist.
      // (Re-add the Wallet icon import when un-commenting.)
      // { id: "user-plan", label: "Customer Plans", icon: Wallet, path: "/user-plan" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customer", label: "Customers", icon: Users, path: "/customer" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "banner", label: "Banners", icon: Image, path: "/banner" },
      { id: "promotional-ticker", label: "Promotional Ticker", icon: MonitorPlay, path: "/promotional-ticker" },
      { id: "settings", label: "Feature Campaign", icon: Megaphone, path: "/feature_campaign" },
      { id: "promo-code", label: "Promo Codes", icon: Percent, path: "/promo-code" },
    ],
  },
  {
    label: "Reports",
    items: [
      // Hidden from the sidebar for now — pages and routes still exist.
      // (Re-add the ClipboardList / PieChart icon imports when un-commenting.)
      // { id: "analysis-report-catalog", label: "Vendor Report", icon: ClipboardList, path: "/analysis-report-vendor" },
      // { id: "analysis-report-customer", label: "Customer Report", icon: PieChart, path: "/analysis-report-customer" },
      { id: "promo-code-reports", label: "Promo Code Report", icon: TrendingUp, path: "/promo-code/reports" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
      { id: "faq", label: "FAQ", icon: HelpCircle, path: "/faq" },
      { id: "accessibility", label: "Accessibility", icon: Ticket, path: "/assebility" },
      { id: "app-settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

function GrowthMark() {
  // Concentric "growth ring" mark — the signature brand glyph.
  return (
    <div className="relative h-8.5 w-8.5 shrink-0">
      <svg viewBox="0 0 40 40" width={34} height={34}>
        <circle
          className="animate-pulse fill-none stroke-emerald-400"
          cx="20"
          cy="20"
          r="6"
          strokeWidth="1.4"
        />
        <circle
          className="animate-pulse fill-none stroke-emerald-400 opacity-50"
          cx="20"
          cy="20"
          r="11"
          strokeWidth="1.4"
          style={{ animationDelay: "150ms" }}
        />
        <circle
          className="animate-pulse fill-none stroke-emerald-400 opacity-30"
          cx="20"
          cy="20"
          r="16"
          strokeWidth="1.4"
          style={{ animationDelay: "300ms" }}
        />
        <circle cx="20" cy="20" r="3.4" className="fill-emerald-400" />
      </svg>
    </div>
  );
}

function NavButton({ item, isActive, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex h-10.5 w-full items-center gap-3 rounded-2xl px-3 text-left text-[13px] font-medium no-underline transition-all duration-200
        ${isActive
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)]"
          : "text-neutral-600 hover:bg-white/75 hover:text-emerald-700 hover:shadow-sm dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-emerald-300"
        }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors ${
          isActive
            ? "bg-white/20"
            : "bg-white/60 text-neutral-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 dark:bg-white/5 dark:text-neutral-400 dark:group-hover:bg-emerald-500/10 dark:group-hover:text-emerald-300"
        }`}
      >
        <Icon size={15} />
      </span>
      <span
        className={`overflow-hidden whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
      >
        {item.label}
      </span>
      {item.badge != null && !collapsed && !isActive && (
        <span className="ml-auto rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-neutral-950">
          {item.badge}
        </span>
      )}
      {/* collapsed badge dot */}
      {item.badge != null && collapsed && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
      {isActive && !collapsed && (
        <ChevronRight size={15} className="ml-auto shrink-0 text-white/80" />
      )}
    </Link>
  );
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const location = useLocation();

  // Lock body scroll while the mobile drawer is open — otherwise the page
  // behind it scrolls too, showing two competing scrollbars at once.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <aside
        // Frosted glass over the app's green gradient. More opaque on mobile,
        // where it's a drawer floating over page content.
        className={`fixed top-0 z-30 flex h-dvh flex-col border-r border-white/70 bg-white/90 backdrop-blur-2xl transition-all duration-300 dark:border-white/5 dark:bg-neutral-950/90 lg:sticky lg:bg-white/50 dark:lg:bg-neutral-950/50
          ${collapsed ? "lg:w-19" : "lg:w-63"}
          ${mobileOpen ? "left-0 w-60" : "-left-65 w-60 lg:left-0"}
        `}
      >
        {/* Head */}
        <div className="flex min-h-18 items-center gap-2.5 border-b border-white/70 px-4.5 py-4 dark:border-white/5">
          <GrowthMark />
          <div
            className={`overflow-hidden whitespace-nowrap transition-opacity duration-150 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            <p className="text-[17px] font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50">Trydood</p>
            <p className="text-[10.5px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Admin Console</p>
          </div>
          {/* Collapse-to-icons toggle — desktop only. Mobile's drawer width
              is fixed regardless of `collapsed`, so this control has no
              effect there and would be a dead button if shown. */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="ml-auto hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-neutral-500 shadow-sm transition-colors hover:bg-white hover:text-emerald-600 dark:border-white/5 dark:bg-white/5 dark:text-neutral-400 dark:hover:text-emerald-400 lg:flex"
          >
            <ChevronLeft
              size={14}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"}`}
            />
          </button>

          {/* Close button — mobile drawer only. */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="ml-auto flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-red-500/60 hover:text-red-500 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:text-red-400 lg:hidden"
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div
                className={`flex items-center gap-2 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700/60 transition-opacity duration-150 dark:text-emerald-400/50 ${collapsed ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"
                  }`}
              >
                {group.label}
                <span className="h-px flex-1 bg-gradient-to-r from-emerald-200/80 to-transparent dark:from-emerald-500/20" />
              </div>
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.path}
                  collapsed={collapsed}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Foot */}
        <div className="border-t border-white/70 p-3 dark:border-white/5">
          <div className="relative flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 px-3 py-3 shadow-[0_10px_24px_-8px_rgba(16,185,129,0.6)]">
            <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/25 blur-xl" />
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/25 text-xs font-bold text-white ring-1 ring-white/40">
              TD
            </div>
            <div
              className={`relative overflow-hidden transition-opacity duration-150 ${collapsed ? "opacity-0" : "opacity-100"
                }`}
            >
              <div className="whitespace-nowrap text-[12.5px] font-semibold text-white">
                Trydood
              </div>
              <div className="flex items-center gap-1 whitespace-nowrap text-[11px] text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-200" />
                Super Admin
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
        />
      )}
    </>
  );
}