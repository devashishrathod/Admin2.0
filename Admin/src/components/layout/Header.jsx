import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Bell, ChevronDown, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { useAuthStore } from "../../features/auth/store/authStore";
import ThemeToggle from "../common/ThemeToggle";

const UNREAD_NOTIFICATIONS = 3;

export default function Header({ mobileOpen, setMobileOpen }) {
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const displayName = user?.name || "Navnit";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    if (!userMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenu]);

  function handleLogout() {
    setUserMenu(false);
    logout();
    navigate("/login");
  }

  const iconButtonClass =
    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50";

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-2 bg-white px-4 backdrop-blur-md dark:bg-neutral-950/80 sm:gap-3 sm:px-6">
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 lg:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      <div className="hidden min-w-0 flex-col lg:flex">
        <p className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
          {displayName ? `Welcome back, ${displayName.split(" ")[0]}` : "Welcome back"}
        </p>
        <p className="truncate text-[11.5px] text-neutral-500">Here's what's happening today</p>
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <ThemeToggle />

        <button aria-label="Notifications" className={iconButtonClass}>
          <Bell size={18} />
          {UNREAD_NOTIFICATIONS > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-neutral-950">
              {UNREAD_NOTIFICATIONS > 9 ? "9+" : UNREAD_NOTIFICATIONS}
            </span>
          )}
        </button>

        <span className="mx-1 hidden h-6 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800 sm:block" />

        {/* User menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setUserMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={userMenu}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-[12.5px] font-semibold text-neutral-900 transition-colors hover:bg-white dark:text-neutral-50 dark:hover:bg-neutral-800 sm:pr-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 text-[11px] font-bold text-neutral-950">
              {initials}
            </div>
            {/* Hidden on narrow phones so a long name never forces the
                header to overflow horizontally. */}
            <span className="hidden max-w-[120px] truncate sm:inline">{displayName}</span>
            <ChevronDown
              size={13}
              className={`hidden shrink-0 text-neutral-400 transition-transform duration-150 dark:text-neutral-500 sm:block ${
                userMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {userMenu && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-xl shadow-black/5 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30"
            >
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-lime-400 text-[11px] font-bold text-neutral-950">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="truncate text-[11.5px] text-neutral-500">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

              <button
                role="menuitem"
                onClick={() => setUserMenu(false)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] text-neutral-600 transition-colors hover:bg-[#f4f7fb] dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <User size={14} className="text-neutral-500" />
                Profile
              </button>

              <button
                role="menuitem"
                onClick={() => {
                  setUserMenu(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] text-neutral-600 transition-colors hover:bg-[#f4f7fb] dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <SettingsIcon size={14} className="text-neutral-500" />
                Settings
              </button>

              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
