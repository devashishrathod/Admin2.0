import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useAuthStore } from "../../features/auth/store/authStore";

export default function Header({ setMobileOpen }) {
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

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3.5 border-b border-neutral-800 bg-neutral-950/70 px-5 backdrop-blur-md">
      <button
        onClick={() => setMobileOpen(true)}
        className="flex text-neutral-400 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden w-80 max-w-[40vw] items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-500 focus-within:border-emerald-600 md:flex">
        <Search size={15} />
        <input
          placeholder="Search projects, people, tasks…"
          className="w-full bg-transparent text-[13px] text-neutral-50 outline-none placeholder:text-neutral-500"
        />
      </div>

      <div className="flex-1" />

      <button
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-emerald-600 hover:text-emerald-400"
      >
        <Bell size={16} />
        <span className="absolute right-2 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      </button>

      {/* User menu */}
      <div ref={menuRef} className="relative">
        <div
          onClick={() => setUserMenu((v) => !v)}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-1.5 pr-2.5 text-[12.5px] font-semibold text-neutral-50"
        >
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-lime-400 text-[10px] font-bold text-neutral-950">
            {initials}
          </div>
          {displayName}
          <ChevronDown
            size={13}
            className={`transition-transform duration-150 ${userMenu ? "rotate-180" : ""}`}
          />
        </div>

        {userMenu && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-48 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 py-1.5 shadow-xl">
            <div className="border-b border-neutral-800 px-3.5 py-2.5">
              <p className="truncate text-[12.5px] font-semibold text-neutral-50">
                {displayName}
              </p>
              {user?.email && (
                <p className="truncate text-[11.5px] text-neutral-500">{user.email}</p>
              )}
            </div>

            <button
              onClick={() => setUserMenu(false)}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12.5px] text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              <User size={14} className="text-neutral-500" />
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12.5px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}