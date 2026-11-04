import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, LogOut, User, Settings as SettingsIcon, Mail, Phone, ShieldCheck, BadgeCheck } from "lucide-react";
import { useAuthStore } from "../../features/auth/store/authStore";
import ThemeToggle from "../common/ThemeToggle";
import NotificationBell from "./NotificationBell";

const greetingFor = (date) => {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// Current date/time, re-read every minute so the greeting and the date
// chip roll over on their own (e.g. a tab left open past midnight).
function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

const ROLE_LABELS = { ADMIN: "Admin", SUPER_ADMIN: "Super admin", SUB_ADMIN: "Sub admin" };

// "9800000000" → "+91 98000 00000"
const formatPhone = (raw) => {
  const d = String(raw || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : raw;
};

// Profile photo when the account has one (set on My profile), else initials.
function Avatar({ initials, image, size = "md", dot = true }) {
  const box = size === "lg" ? "h-12 w-12 text-[15px]" : "h-9 w-9 text-[12px]";
  return (
    <span className="relative shrink-0">
      {image ? (
        <img src={image} alt="" className={`${box} rounded-full object-cover`} />
      ) : (
        <span className={`flex ${box} items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 font-bold text-white`}>
          {initials}
        </span>
      )}
      {/* signed in */}
      {dot && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />}
    </span>
  );
}

// Live date + clock. Ticks every second by itself so only this re-renders.
function TodayClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  const [clock, ampm] = time.split(/\s+/);
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="hidden items-center rounded-2xl border border-white/80 bg-white/70 py-1.5 pl-1.5 pr-3.5 backdrop-blur-xl md:flex dark:border-white/5 dark:bg-neutral-900/60">
      <span className="flex h-8 w-8 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white">
        <span className="text-[7.5px] font-bold uppercase leading-none tracking-wider">{now.toLocaleDateString("en-IN", { month: "short" })}</span>
        <span className="text-[13px] font-bold leading-none">{now.getDate()}</span>
      </span>
      <span className="ml-2.5 leading-tight">
        <span className="block text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">
          {now.toLocaleDateString("en-IN", { weekday: "long" })}
        </span>
        <span className="block text-[10.5px] text-neutral-500">
          {now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </span>
      <span className="mx-3 h-7 w-px bg-neutral-200 dark:bg-neutral-700" />
      <span className="flex items-baseline gap-1 tabular-nums" aria-label={`Current time ${time}`}>
        <span className="text-[17px] font-bold leading-none tracking-tight text-neutral-900 dark:text-neutral-50">{clock}</span>
        <span className="w-[18px] text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">:{seconds}</span>
        <span className="text-[10.5px] font-bold uppercase text-neutral-500">{ampm}</span>
      </span>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-medium transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }`}
    >
      <Icon size={15} className={danger ? "" : "text-neutral-400"} />
      {label}
    </button>
  );
}

export default function Header({ mobileOpen, setMobileOpen }) {
  const [userMenu, setUserMenu] = useState(false);
  const today = useToday();
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Everything here comes from the login response (verify-otp → data.user).
  const displayName = (user?.name || "").trim() || "Admin";
  const roleLabel = ROLE_LABELS[user?.role] || "Admin";
  const phone = user?.whatsappNumber || user?.mobile || "";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

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
    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50";

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center gap-2 border-b border-white/60 bg-white/45 px-4 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-950/50 sm:gap-3 sm:px-6">
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-neutral-500 transition-colors hover:bg-white hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 lg:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      {/* Greeting — full name from the login response */}
      <div className="hidden min-w-0 lg:block">
        <p className="truncate text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {greetingFor(today)}, <span className="text-emerald-600 dark:text-emerald-400">{displayName}</span> 👋
        </p>
        <p className="truncate text-[11.5px] text-neutral-500">Here's what's happening on Trydood today</p>
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <TodayClock />

        {/* Theme + notifications in one glass capsule */}
        <div className="flex items-center gap-0.5 rounded-2xl border border-white/80 bg-white/70 p-1 backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60">
          <ThemeToggle className={iconButtonClass} />
          <NotificationBell buttonClass={iconButtonClass} />
        </div>

        {/* User menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setUserMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={userMenu}
            className={`flex items-center gap-2.5 rounded-2xl border py-1 pl-1 pr-1.5 text-left backdrop-blur-xl transition-colors sm:pr-3 ${
              userMenu
                ? "border-white/80 bg-white dark:border-white/5 dark:bg-neutral-900"
                : "border-white/80 bg-white/70 hover:bg-white dark:border-white/5 dark:bg-neutral-900/60 dark:hover:bg-neutral-900"
            }`}
          >
            <Avatar initials={initials} image={user?.image} />
            {/* Hidden on narrow phones so a long name never forces the
                header to overflow horizontally. */}
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block max-w-36 truncate text-[12.5px] font-semibold text-neutral-900 dark:text-neutral-50">{displayName}</span>
              <span className="block text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">{roleLabel}</span>
            </span>
            <ChevronDown
              size={14}
              className={`hidden shrink-0 text-neutral-400 transition-transform duration-150 dark:text-neutral-500 sm:block ${
                userMenu ? "rotate-180" : ""
              }`}
            />
          </button>

          {userMenu && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:bg-neutral-900 dark:shadow-black/40"
            >
              {/* Who's signed in */}
              <div className="flex items-center gap-3 px-2.5 pb-3 pt-2.5">
                <Avatar initials={initials} image={user?.image} size="lg" dot={false} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-neutral-900 dark:text-neutral-50">{displayName}</p>
                  <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={11} /> {roleLabel}
                  </p>
                </div>
              </div>

              {/* normal-case: the app-wide capitalize would paint emails as
                  "Name@Gmail.Com". Long values wrap instead of cutting off. */}
              {(user?.email || phone || user?.uniqueId) && (
                <div className="mx-1 mb-1.5 space-y-1.5 rounded-xl bg-neutral-50 px-3 py-2.5 text-[11.5px] text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                  {user?.email && (
                    <p title={user.email} className="flex items-start gap-2 break-all normal-case">
                      <Mail size={12} className="mt-0.5 shrink-0 text-neutral-400" /> {user.email.toLowerCase()}
                    </p>
                  )}
                  {phone && (
                    <p className="flex items-center gap-2 tabular-nums">
                      <Phone size={12} className="shrink-0 text-neutral-400" /> {formatPhone(phone)}
                    </p>
                  )}
                  {user?.uniqueId && (
                    <p className="flex items-center gap-2 font-mono text-[11px] normal-case">
                      <BadgeCheck size={12} className="shrink-0 text-neutral-400" /> {user.uniqueId}
                    </p>
                  )}
                </div>
              )}

              <MenuItem
                icon={User}
                label="My profile"
                onClick={() => {
                  setUserMenu(false);
                  navigate("/profile");
                }}
              />
              <MenuItem
                icon={SettingsIcon}
                label="Settings"
                onClick={() => {
                  setUserMenu(false);
                  navigate("/settings");
                }}
              />
              <div className="mx-2 my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
              <MenuItem icon={LogOut} label="Log out" onClick={handleLogout} danger />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
