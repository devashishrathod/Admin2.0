import React, { useEffect } from "react";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tags,
  Layers,
  BadgeCheck,
  UserPlus,
  CreditCard,
  Repeat,
  Gift,
  Wallet,
  PieChart,
  Ticket,
  UserCog,
  ClipboardList,
  ArrowLeftRight,
  HandCoins,
  Tag,
  Megaphone,
  Image,
  MonitorPlay,
  X,
  Percent,
  Bell,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

// Grouped nav — each group renders with an uppercase label (hidden when collapsed).
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analysis-all", label: "Analysis ALL", icon: BarChart3, path: "/analytics" },
      { id: "main-category", label: "Main Category", icon: Tags, path: "/main-category" },
      { id: "sub-category", label: "Sub - Catergory", icon: Layers, path: "/sub-category" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "brand", label: "Brand", icon: BadgeCheck, path: "/brand" },
      { id: "banner", label: "Banner", icon: Image, path: "/banner" },
      { id: "promotional-ticker", label: "Promotional Ticker", icon: MonitorPlay, path: "/promotional-ticker" },
      { id: "vendor-plan", label: "Vendor Plan", icon: CreditCard, path: "/vendor-plan" },
      { id: "subscriptions", label: "Subscriptions", icon: Repeat, path: "/subscriptions" },
      { id: "voucher-listing", label: "Voucher Listing", icon: Gift, path: "/vendor-listing" },
      { id: "new-onboarding", label: "New Onboarding", icon: UserPlus, path: "/new-onboarding" },
      { id: "analysis-report-catalog", label: "Vender Analysis Report", icon: ClipboardList, path: "/analysis-report-vendor" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customer", label: "Customer", icon: Users, path: "/customer" },
      { id: "user-plan", label: "Customer  Plan", icon: Wallet, path: "/user-plan" },
      { id: "analysis-report-customer", label: "Customer Analysis Report", icon: PieChart, path: "/analysis-report-customer" },
      // { id: "employee", label: "Employee", icon: UserCog, path: "/employee" },
    ],
  },
  {
    label: "Sales",
    items: [
      { id: "transaction", label: "Transacation", icon: ArrowLeftRight, path: "/transaction" },
      { id: "settlements", label: "Settlements", icon: HandCoins, path: "/settlements" },
      { id: "accessibility", label: "Accessibility", icon: Ticket, path: "/assebility" },
      { id: "settings", label: "Feature Campaign", icon: Megaphone, path: "/feature_campaign" },
      { id: "coupon-code", label: "Coupon Code", icon: Tag, path: "/coupon" },
      { id: "promo-code", label: "Promo Code", icon: Percent, path: "/promo-code" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
      { id: "app-settings", label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

function GrowthMark() {
  // Concentric "growth ring" mark — the signature brand glyph.
  return (
    <div className="relative h-[34px] w-[34px] shrink-0">
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
      className={`group relative flex h-[44px] w-full items-center gap-3 rounded-2xl px-3.5 text-left text-[13.5px] font-medium no-underline transition-all duration-150
        ${isActive
          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 dark:bg-emerald-500 dark:text-white"
          : "text-neutral-500 hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-50"
        }`}
    >
      <Icon size={17} className="shrink-0" />
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
        className={`fixed top-0 z-30 flex h-screen flex-col bg-white transition-all duration-300 dark:bg-neutral-950 lg:sticky
          ${collapsed ? "lg:w-[76px]" : "lg:w-[252px]"}
          ${mobileOpen ? "left-0 w-[240px]" : "-left-[260px] w-[240px] lg:left-0"}
        `}
      >
        {/* Head */}
        <div className="flex min-h-[68px] items-center gap-2.5  border-neutral-200 px-4.5 py-5 dark:border-neutral-800">
          <GrowthMark />
          <span
            className={`overflow-hidden whitespace-nowrap font-semibold text-[17px] tracking-tight text-neutral-900 transition-opacity duration-150 dark:text-neutral-50
              ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            Trydood
          </span>
          {/* Collapse-to-icons toggle — desktop only. Mobile's drawer width
              is fixed regardless of `collapsed`, so this control has no
              effect there and would be a dead button if shown. */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="ml-auto hidden h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400 lg:flex"
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
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3.5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <div
                className={`px-3.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 transition-opacity duration-150 dark:text-neutral-600 ${collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
                  }`}
              >
                {group.label}
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
        <div className="p-3.5">
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500 px-3.5 py-3 shadow-sm dark:bg-neutral-800/60 dark:shadow-none">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 text-xs font-bold text-white">
              TD
            </div>
            <div
              className={`overflow-hidden transition-opacity duration-150 ${collapsed ? "opacity-0" : "opacity-100"
                }`}
            >
              <div className="whitespace-nowrap text-[12.5px] font-semibold text-white dark:text-neutral-50">
                Trydood
              </div>
              <div className="whitespace-nowrap text-[11px] text-white">
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