import  { useEffect } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NAV_GROUPS } from "@/constants/navGroups";
import NavButton from "../common/NavButton";
import logo from "@/assets/Logo1.png";

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
          {/* Logo1.png is the full logo (mark + wordmark); this crops it to
              just the shop mark — same crop as VenderPanel's DashboardHeader. */}
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-2 ring-white/40">
            <img
              src={logo}
              alt="Trydood"
              className="absolute -left-[34px] -top-[2.25px] h-[75px] w-[105px] max-w-none"
            />
          </div>
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