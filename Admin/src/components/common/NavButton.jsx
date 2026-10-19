import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// One sidebar nav link — icon, label, optional badge, and the active pill.
// Label and badge collapse to an icon-only button when `collapsed`.
export default function NavButton({ item, isActive, collapsed, onClick }) {
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
