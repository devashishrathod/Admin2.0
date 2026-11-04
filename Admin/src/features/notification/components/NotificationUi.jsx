import { AlertTriangle, CheckCircle2, ChevronDown, Info, Loader2, X } from "lucide-react";
import { TINTS, glass, innerTile, inputClass } from "./notificationStyles";

/* -------------------------------------------------------------------------
 * Small building blocks for the Notifications screen, in the Dashboard's
 * look (Dashbaord.jsx): frosted-glass bento cards, emerald accents,
 * pill-shaped segmented controls, soft inner tiles.
 * ---------------------------------------------------------------------- */

/* ---- Cards -------------------------------------------------------------- */

export function GlassCard({ className = "", children }) {
  return <div className={`${glass} p-4 sm:p-5 ${className}`}>{children}</div>;
}

// Numbered composer step: "1 · Channels" + subtitle, optional right slot.
export function SectionCard({ step, icon: Icon, title, subtitle, right, className = "", children }) {
  return (
    <section className={`${glass} p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {step != null ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-[12px] font-bold text-white shadow-[0_6px_16px_rgba(16,185,129,0.3)]">
              {step}
            </span>
          ) : (
            Icon && (
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${TINTS.emerald}`}>
                <Icon size={14} />
              </span>
            )
          )}
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-neutral-900 dark:text-neutral-50">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11.5px] text-neutral-500">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ---- Controls ----------------------------------------------------------- */

// Pill rail — the Dashboard's 3M / 6M / 12M switch, with optional icons,
// count badges and disabled ("Soon") options.
export function Segmented({ options, value, onChange, stretch = false, size = "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-[11.5px]" : "px-3.5 py-1.5 text-[12.5px]";
  return (
    <div
      role="tablist"
      className={`${stretch ? "flex w-full" : "inline-flex"} flex-wrap items-center gap-1 rounded-full border border-white/80 bg-white/70 p-1 dark:border-white/5 dark:bg-neutral-900/60`}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={o.disabled}
            onClick={() => onChange(o.key)}
            className={`${stretch ? "flex-1" : ""} flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${
              active
                ? "bg-emerald-500 text-white shadow-[0_6px_16px_rgba(16,185,129,0.28)]"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {Icon && <Icon size={size === "sm" ? 12 : 14} />}
            {o.label}
            {o.badge != null && (
              <span
                className={`rounded-full px-1.5 text-[10.5px] font-bold ${
                  active ? "bg-white/25 text-white" : "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {o.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Page-level tabs — the Analytics Report tab bar (glass pill bar, active tab
// in the green gradient), plus optional icon and count badge per tab.
export function PageTabs({ tabs, value, onChange }) {
  return (
    <div
      role="tablist"
      className="flex w-full max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-white/80 bg-white/60 p-1.5 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl [scrollbar-width:none] sm:w-fit dark:border-white/5 dark:bg-neutral-900/60 [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all sm:px-4 ${
              active
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.7)]"
                : "text-neutral-500 hover:bg-white/70 hover:text-emerald-700 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-emerald-300"
            }`}
          >
            {Icon && <Icon size={14} />}
            {t.label}
            {t.badge ? (
              <span
                className={`min-w-[18px] rounded-full px-1.5 text-center text-[10.5px] font-bold leading-[18px] ${
                  active ? "bg-white/25 text-white" : t.alert ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800"
                }`}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// <select> with our input look and a chevron (native arrow hidden).
// options = [{ value, label }]
export function Select({ value, onChange, options, icon: Icon, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} cursor-pointer appearance-none pr-9 ${Icon ? "pl-9" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
    </div>
  );
}

// Text/date input with a leading icon and an optional clear (×) button.
export function IconInput({ icon: Icon, value, onChange, onClear, className = "", ...rest }) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />}
      <input value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} ${Icon ? "pl-9" : ""} ${onClear ? "pr-8" : ""}`} {...rest} />
      {onClear && value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

export function Field({ label, hint, counter, max, children, className = "" }) {
  const over = max != null && counter > max;
  return (
    <div className={className}>
      {label && <span className="mb-1.5 block text-[12px] font-semibold text-neutral-600 dark:text-neutral-300">{label}</span>}
      {children}
      {(hint || counter != null) && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[10.5px] text-neutral-400">
          <span>{hint}</span>
          {counter != null && (
            <span className={`tabular-nums ${over ? "font-semibold text-red-500" : ""}`}>
              {counter}
              {max != null && ` / ${max}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className = "" }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-[12.5px] text-neutral-600 dark:text-neutral-300 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 accent-emerald-500 dark:border-neutral-700"
      />
      {label}
    </label>
  );
}

// iOS-style on/off switch. Without `onChange` it renders as a plain
// <span> (display only) so it can sit inside a clickable card/button.
export function Switch({ checked, onChange, disabled = false, label }) {
  const Tag = onChange ? "button" : "span";
  return (
    <Tag
      {...(onChange
        ? { type: "button", role: "switch", "aria-checked": checked, "aria-label": label, disabled, onClick: () => onChange(!checked) }
        : { "aria-hidden": true })}
      className={`relative block h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
      } ${disabled ? "opacity-60" : ""} ${onChange && !disabled ? "cursor-pointer" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
      />
    </Tag>
  );
}

const BUTTONS = {
  primary:
    "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.28)] hover:bg-emerald-600 disabled:shadow-none",
  ghost:
    "border border-white/80 bg-white/70 text-neutral-700 hover:bg-white dark:border-white/5 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:bg-neutral-900",
  soft: "bg-emerald-400/10 text-emerald-700 hover:bg-emerald-400/20 dark:text-emerald-300",
  danger: "text-neutral-400 hover:bg-red-500/10 hover:text-red-500",
};

export function Button({ variant = "ghost", icon: Icon, loading, size = "md", className = "", children, ...rest }) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[11.5px]" : size === "icon" ? "h-8 w-8 justify-center" : "px-4 py-2 text-[12.5px]";
  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 rounded-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${BUTTONS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

/* ---- Display ------------------------------------------------------------ */

export function Pill({ tint = "neutral", className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TINTS[tint]} ${className}`}>
      {children}
    </span>
  );
}

export function IconTile({ icon: Icon, tint = "emerald", size = "md" }) {
  const box = size === "sm" ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-xl";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${TINTS[tint]}`}>
      <Icon size={size === "sm" ? 14 : 16} />
    </span>
  );
}

export function Avatar({ name, src, initials }) {
  if (src) return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10" />;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 text-[11.5px] font-bold text-white">
      {initials || (name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

const NOTICE = {
  info: { cls: "border-sky-400/30 bg-sky-400/[0.07] text-sky-700 dark:text-sky-300", icon: Info },
  warning: { cls: "border-amber-400/30 bg-amber-400/[0.07] text-amber-700 dark:text-amber-300", icon: AlertTriangle },
  error: { cls: "border-red-500/30 bg-red-500/[0.06] text-red-600 dark:text-red-400", icon: AlertTriangle },
  success: { cls: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
};

export function Notice({ tone = "info", className = "", children }) {
  const { cls, icon: Icon } = NOTICE[tone];
  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-[12px] ${cls} ${className}`}>
      <Icon size={13} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Inner stat chip — "40 / emails" style counters.
export function MiniStat({ value, label, tint = "neutral" }) {
  const text = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
    neutral: "text-neutral-900 dark:text-neutral-50",
  }[tint];
  return (
    <div className={`rounded-2xl px-3 py-2.5 text-center ${innerTile}`}>
      <p className={`text-[18px] font-bold leading-none tabular-nums ${text}`}>{value}</p>
      <p className="mt-1 text-[10.5px] text-neutral-500">{label}</p>
    </div>
  );
}
