import React, { useState } from "react";
import { Menu, Search, Bell, ChevronDown } from "lucide-react";

export default function Header({ setMobileOpen }) {
  const [userMenu, setUserMenu] = useState(false);

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

      <div
        onClick={() => setUserMenu((v) => !v)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 pl-1.5 pr-2.5 text-[12.5px] font-semibold text-neutral-50"
      >
        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-lime-400 text-[10px] font-bold text-neutral-950">
          NV
        </div>
        Navnit
        <ChevronDown
          size={13}
          className={`transition-transform duration-150 ${userMenu ? "rotate-180" : ""}`}
        />
      </div>
    </header>
  );
}