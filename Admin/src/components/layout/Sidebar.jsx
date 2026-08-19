import React from "react";
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  Tags,
  BadgeCheck,
  CreditCard,
  Ticket,
  UserCog,
  ClipboardList,
  ArrowLeftRight,
  HandCoins,
  Image,
} from "lucide-react";
import { Link } from "react-router-dom";

// Grouped nav — each group renders with an uppercase label (hidden when collapsed).
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analysis-all", label: "Analysis ALL", icon: BarChart3, path: "/analytics" },
      { id: "main-category", label: "Main Category", icon: Tags, path: "/main-category" },
      { id: "sub-category", label: "Sub - Catergory", icon: Tags, path: "/sub-category" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "brand", label: "Brand", icon: BadgeCheck, path: "/brand" },
      { id: "banner", label: "Banner", icon: Image, path: "/banner" },
      { id: "vendor-plan", label: "Vendor Plan", icon: CreditCard, path: "/vendor-plan" },
            { id: "vendor-plan", label: "Vendor Listing", icon: CreditCard, path: "/vendor-listing" },
      { id: "new-onboarding", label: "New Onboarding", icon: BadgeCheck, path: "/new-onboarding" },
      { id: "analysis-report-catalog", label: "Vender Analysis Report", icon: ClipboardList, path: "/analysis-report-vendor" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customer", label: "Customer", icon: Users, path: "/customer" },
      { id: "user-plan", label: "Customer  Plan", icon: CreditCard, path: "/user-plan" },
      { id: "analysis-report-customer", label: "Customer Analysis Report", icon: ClipboardList, path: "/analysis-report-customer" },
      // { id: "employee", label: "Employee", icon: UserCog, path: "/employee" },
    ], 
  },
  {
    label: "Sales",
    items: [
      { id: "transaction", label: "Transacation", icon: ArrowLeftRight, path: "/transaction" },
      { id: "settlements", label: "Settlements", icon: HandCoins, path: "/settlements" },
      { id: "accessibility", label: "Accessibility", icon: Ticket, path: "/assebility" },
      { id: "settings", label: "Feature Campaign", icon: Settings, path: "/feature_campaign" },
          { id: "settlements", label: "Coupon Code", icon: HandCoins, path: "/coupon" },
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
      className={`group relative flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-[13.5px] font-medium no-underline transition-colors duration-150
        ${
          isActive
            ? "bg-emerald-400/10 text-emerald-400"
            : "text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-50"
        }`}
    >
      {/* active rail */}
      <span
        className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-emerald-400 transition-opacity duration-150 ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      />
      <Icon size={17} className="shrink-0" />
      <span
        className={`overflow-hidden whitespace-nowrap transition-opacity duration-150 ${
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        }`}
      >
        {item.label}
      </span>
      {item.badge != null && !collapsed && (
        <span className="ml-auto rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-neutral-950">
          {item.badge}
        </span>
      )}
      {/* collapsed badge dot */}
      {item.badge != null && collapsed && (
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
    </Link>
  );
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  active,
  setActive,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-neutral-800 bg-neutral-900 transition-all duration-300 md:sticky
          ${collapsed ? "md:w-[76px]" : "md:w-[252px]"}
          ${mobileOpen ? "left-0 w-[240px]" : "-left-[260px] w-[240px] md:left-0"}
        `}
      >
        {/* Head */}
        <div className="flex min-h-[68px] items-center gap-2.5 border-b border-neutral-800 px-4.5 py-5">
          <GrowthMark />
          <span
            className={`overflow-hidden whitespace-nowrap font-semibold text-[17px] tracking-tight text-neutral-50 transition-opacity duration-150
              ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}
          >
            Trydood
          </span>
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="ml-auto flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-800 text-neutral-400 transition-colors hover:border-emerald-600 hover:text-emerald-400"
          >
            <ChevronLeft
              size={14}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <div
                className={`px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-600 transition-opacity duration-150 ${
                  collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
                }`}
              >
                {group.label}
              </div>
              {group.items.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={active === item.id}
                  collapsed={collapsed}
                  onClick={() => {
                    setActive(item.id);
                    setMobileOpen(false);
                  }}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Foot */}
        <div className="flex items-center gap-2.5 border-t border-neutral-800 px-4 py-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 text-xs font-bold text-neutral-950">
            AK
          </div>
          <div
            className={`overflow-hidden transition-opacity duration-150 ${
              collapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="whitespace-nowrap text-[12.5px] font-semibold text-neutral-50">
              Trydood
            </div>
            <div className="whitespace-nowrap text-[11px] text-neutral-500">
              Super Admin
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
        />
      )}
    </>
  );
}