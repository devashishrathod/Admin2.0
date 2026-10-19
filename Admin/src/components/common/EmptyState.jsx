import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  FileText,
  HandCoins,
  Image as ImageIcon,
  Inbox,
  Layers,
  Megaphone,
  MonitorPlay,
  Percent,
  Repeat,
  SearchX,
  Store,
  Tags,
  Ticket,
  Undo2,
  UserPlus,
  Users,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * EmptyState — the one "nothing here" UI used across the panel: empty
 * lists / tables / grids, filters that match nothing, and records that
 * don't exist ("Brand not found").
 *
 *   <EmptyState
 *     icon="brand"                 // preset key (below) or a lucide icon
 *     title="Brand not found"
 *     description="It may have been deleted, or the link is no longer valid."
 *     action={{ label: "Back to Brands", onClick, icon: ArrowLeft }}
 *     secondaryAction={{ label: "Try again", onClick }}
 *     variant="page"               // "page" | "card" (default) | "compact"
 *     tone="error"                 // "default" (green) | "error" (red)
 *   />
 *
 * Icons can be given as a preset key so callers don't have to import (and
 * risk clashing with) lucide names of their own.
 * ---------------------------------------------------------------------- */

const ICON_PRESETS = {
  brand: Store,
  voucher: Ticket,
  banner: ImageIcon,
  category: Tags,
  subcategory: Layers,
  campaign: Megaphone,
  document: FileText,
  promo: Percent,
  report: BarChart3,
  ticker: MonitorPlay,
  refund: Undo2,
  subscription: Repeat,
  transaction: ArrowLeftRight,
  customer: Users,
  notification: Bell,
  settlement: HandCoins,
  onboarding: UserPlus,
  search: SearchX,
  error: AlertTriangle,
  default: Inbox,
};

const SIZES = {
  page: {
    wrap: "min-h-[60vh] px-6 py-16",
    tile: "h-20 w-20 rounded-3xl",
    icon: 34,
    ring1: "h-32 w-32",
    ring2: "h-44 w-44",
    title: "text-[20px]",
    desc: "max-w-md text-[13.5px]",
  },
  card: {
    wrap: "px-6 py-12",
    tile: "h-16 w-16 rounded-2xl",
    icon: 26,
    ring1: "h-24 w-24",
    ring2: "h-32 w-32",
    title: "text-[16px]",
    desc: "max-w-sm text-[12.5px]",
  },
  compact: {
    wrap: "px-4 py-8",
    tile: "h-12 w-12 rounded-2xl",
    icon: 20,
    ring1: "h-18 w-18",
    ring2: "h-24 w-24",
    title: "text-[14px]",
    desc: "max-w-xs text-[12px]",
  },
};

const TONES = {
  default: {
    tile: "bg-gradient-to-br from-emerald-400 to-teal-400 text-white shadow-[0_10px_24px_-8px_rgba(16,185,129,0.6)]",
    ring: "border-emerald-300/50 dark:border-emerald-400/20",
    glow: "bg-emerald-300/30 dark:bg-emerald-500/10",
  },
  error: {
    tile: "bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-[0_10px_24px_-8px_rgba(244,63,94,0.55)]",
    ring: "border-red-300/50 dark:border-red-400/20",
    glow: "bg-red-300/25 dark:bg-red-500/10",
  },
};

function ActionButton({ action, primary, tone }) {
  if (!action) return null;
  const Icon = action.icon;
  const primaryCls =
    tone === "error"
      ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_8px_20px_-8px_rgba(244,63,94,0.7)]"
      : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_8px_20px_-8px_rgba(16,185,129,0.7)]";
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all hover:-translate-y-0.5 ${
        primary
          ? primaryCls
          : "border border-neutral-200 bg-white/80 text-neutral-600 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-300 dark:hover:text-emerald-300"
      }`}
    >
      {Icon && <Icon size={14} />}
      {action.label}
    </button>
  );
}

export default function EmptyState({
  icon = "default",
  title = "Nothing here yet",
  description,
  action,
  secondaryAction,
  variant = "card",
  tone = "default",
  className = "",
}) {
  const Icon = typeof icon === "string" ? ICON_PRESETS[icon] || ICON_PRESETS.default : icon || Inbox;
  const s = SIZES[variant] || SIZES.card;
  const t = TONES[tone] || TONES.default;

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center normal-case ${s.wrap} ${className}`}
    >
      {/* Icon tile inside two soft rings + a glow */}
      <div className="relative mb-5 flex items-center justify-center">
        <span className={`absolute rounded-full blur-2xl ${s.ring2} ${t.glow}`} />
        <span className={`absolute rounded-full border border-dashed ${s.ring2} ${t.ring}`} />
        <span className={`absolute rounded-full border ${s.ring1} ${t.ring}`} />
        <span className={`relative flex items-center justify-center ${s.tile} ${t.tile}`}>
          <Icon size={s.icon} strokeWidth={1.8} />
        </span>
      </div>

      <p className={`font-bold tracking-tight text-neutral-900 dark:text-neutral-50 ${s.title}`}>{title}</p>
      {description && (
        <p className={`mt-1.5 leading-relaxed text-neutral-500 dark:text-neutral-400 ${s.desc}`}>{description}</p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <ActionButton action={action} primary tone={tone} />
          <ActionButton action={secondaryAction} tone={tone} />
        </div>
      )}
    </div>
  );
}
