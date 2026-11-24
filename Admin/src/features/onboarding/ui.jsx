import { createContext, useContext } from "react";
import { Loader2, AlertTriangle, Info, CheckCircle2, XCircle, ArrowLeft, Check, Upload, FileText } from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared pieces for the onboarding screens. A compact, quiet look that sits
 * with the admin's glass cards (features/brand/BrandDetails/components/
 * bentoStyles.js): frosted white cards, emerald (the admin theme recolours
 * it) for primary and "done", amber for optional / warnings, neutral greys
 * for text. Every piece has a dark variant.
 * ---------------------------------------------------------------------- */

/** The frosted card every screen and the header sit in. */
export const cardCls =
  "rounded-2xl border border-white/80 bg-white/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/80 dark:shadow-black/30";

/** A solid tile inside a card (sub-sections, list rows). */
export const tileCls = "rounded-xl border border-neutral-200/80 bg-white dark:border-white/10 dark:bg-neutral-950/50";

export const inputCls =
  "h-10 w-full rounded-lg border border-neutral-300/80 bg-white px-3 text-[14px] text-neutral-900 outline-none transition placeholder:text-neutral-400 hover:border-neutral-400 focus:border-emerald-600 focus:ring-[3px] focus:ring-emerald-600/15 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600 dark:hover:border-neutral-600 dark:focus:border-emerald-500 dark:disabled:bg-neutral-900";

/* ---- Step context ---------------------------------------------------
 * The wizard tells the screen where it is (icon, step number, group, a
 * back-edit or not), so ScreenShell can draw its header without every
 * screen passing it on. */
const StepContext = createContext(null);

/** value: { icon, num, total, group, editing } */
export function StepProvider({ value, children }) {
  return <StepContext.Provider value={value}>{children}</StepContext.Provider>;
}

/* ---- Form pieces ----------------------------------------------------- */

export function Field({ label, hint, error, children, optional }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
        {label}
        {optional && <span className="text-[11.5px] font-normal text-neutral-400">Optional</span>}
      </span>
      {children}
      {error ? (
        <span className="text-[12px] font-medium text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">{hint}</span>
      ) : null}
    </label>
  );
}

/** A choice as a full card (business status, entity type, plans …). */
export function RadioCard({ name, checked, onChange, title, description, extra, disabled }) {
  return (
    <label
      className={`relative flex items-start gap-3 rounded-xl border p-3.5 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-emerald-600/20 ${
        checked
          ? "border-emerald-600 bg-emerald-50/70 shadow-[inset_0_0_0_1px_rgb(5_150_105)] dark:border-emerald-500 dark:bg-emerald-400/10"
          : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950/60 dark:hover:border-neutral-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
        {description && <span className="text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">{description}</span>}
        {extra}
      </span>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${
          checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
    </label>
  );
}

/** A pill you can switch on / off (categories, document types). */
export function ChoiceChip({ active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-emerald-600 hover:text-emerald-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-emerald-500"
      }`}
    >
      {active && <Check size={12} strokeWidth={3} />}
      {children}
    </button>
  );
}

/** A file picker drawn as a drop area. `onPick(file | null)`. */
export function FileDrop({ file, onPick, accept, label = "Choose a file", hint, disabled }) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 transition has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-emerald-600/20 ${
        file
          ? "border-emerald-600/60 bg-emerald-50/60 dark:border-emerald-500/40 dark:bg-emerald-400/5"
          : "border-neutral-300 bg-neutral-50/80 hover:border-emerald-600 dark:border-neutral-700 dark:bg-neutral-950/40 dark:hover:border-emerald-500"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          file ? "bg-emerald-600 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700"
        }`}
      >
        {file ? <FileText size={16} /> : <Upload size={16} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100">{file ? file.name : label}</span>
        <span className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · click to change` : hint || "Click to browse"}
        </span>
      </span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files?.[0] || null);
          e.target.value = ""; // the same file can be picked again
        }}
      />
    </label>
  );
}

/* ---- Display pieces -------------------------------------------------- */

const NOTE_TONES = {
  info: { box: "border-sky-200/70 bg-sky-50/70 text-sky-900 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200", icon: "text-sky-600 dark:text-sky-300", Icon: Info },
  warn: { box: "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200", icon: "text-amber-600 dark:text-amber-300", Icon: AlertTriangle },
  error: { box: "border-red-200/80 bg-red-50/70 text-red-900 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200", icon: "text-red-600 dark:text-red-300", Icon: XCircle },
  ok: { box: "border-emerald-200/80 bg-emerald-50/70 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200", icon: "text-emerald-600 dark:text-emerald-300", Icon: CheckCircle2 },
  muted: { box: "border-neutral-200/80 bg-neutral-50/80 text-neutral-600 dark:border-white/5 dark:bg-neutral-800/60 dark:text-neutral-300", icon: "text-neutral-400", Icon: Info },
};

export function Note({ tone = "info", children }) {
  const t = NOTE_TONES[tone] || NOTE_TONES.info;
  const Icon = t.Icon;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px] leading-snug ${t.box}`}>
      <Icon size={15} className={`mt-px shrink-0 ${t.icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const BADGE_TONES = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300",
  error: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300",
  info: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300",
  muted: "bg-neutral-100 text-neutral-600 ring-neutral-500/15 dark:bg-neutral-800 dark:text-neutral-300",
};

/** A small status pill ("Saved", "Required", "2 of 3 done" …). */
export function StatusBadge({ tone = "muted", icon: Icon, children }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${BADGE_TONES[tone] || BADGE_TONES.muted}`}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

/**
 * A titled block inside a screen: optional step number, title, a badge on
 * the right and a short description. `dashed` for "add something" blocks,
 * `dimmed` for a block that isn't available yet.
 */
export function Section({ number, title, description, badge, dashed, dimmed, children }) {
  return (
    <div
      className={`flex flex-col gap-3.5 rounded-xl p-4 ${
        dashed ? "border border-dashed border-neutral-300 bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-950/30" : tileCls
      } ${dimmed ? "opacity-60" : ""}`}
    >
      {(title || badge) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            {number != null && (
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white dark:bg-white dark:text-neutral-900">
                {number}
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="m-0 text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>}
              {description && <p className="m-0 mt-0.5 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">{description}</p>}
            </div>
          </div>
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

/** Label / value pair for verification results and the review screen. */
export function KeyValue({ label, value, mono, fallback = "Not provided" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11.5px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      {value ? (
        <span className={`break-words text-[13.5px] font-medium text-neutral-900 dark:text-neutral-100 ${mono ? "font-mono" : ""}`}>{value}</span>
      ) : (
        <span className="text-[13.5px] text-neutral-400 dark:text-neutral-500">{fallback}</span>
      )}
    </div>
  );
}

/* ---- Buttons --------------------------------------------------------- */

const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const SIZE = { md: "min-h-10 px-4 text-[13.5px]", sm: "min-h-8 px-3 text-[12.5px]" };

export function PrimaryButton({ children, busy, disabled, onClick, type = "button", tone = "green", size = "md" }) {
  const tones = {
    green: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 focus-visible:ring-emerald-600/30",
    dark: "bg-neutral-900 text-white shadow-sm hover:bg-black focus-visible:ring-neutral-500/30 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
  };
  return (
    <button type={type} onClick={onClick} disabled={busy || disabled} className={`${BTN} ${SIZE[size] || SIZE.md} ${tones[tone] || tones.green}`}>
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, busy, disabled, onClick, size = "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`${BTN} ${SIZE[size] || SIZE.md} border border-neutral-300 bg-white font-medium text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 focus-visible:ring-neutral-400/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800`}
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---- Screen frame ---------------------------------------------------- */

/**
 * The frame every step uses: header (icon, "Step N of M · Group", title,
 * intro), body, then a footer that stays in view while the body scrolls
 * (Back · Skip · primary). Without a StepProvider it shows `eyebrow`.
 */
export function ScreenShell({ eyebrow, title, intro, children, error, footer }) {
  const step = useContext(StepContext);
  const Icon = step?.icon;
  return (
    <section className={`${cardCls} flex flex-col`}>
      <header className="flex items-start gap-3.5 border-b border-neutral-200/70 px-5 py-4 sm:px-6 dark:border-white/5">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon size={17} />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1">
          {step ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-neutral-500 dark:text-neutral-400">
              <span className="font-medium">
                Step {step.num} of {step.total}
              </span>
              {step.group && (
                <>
                  <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-600">/</span>
                  <span>{step.group}</span>
                </>
              )}
              {step.editing && <StatusBadge tone="warn">Editing a finished step</StatusBadge>}
            </div>
          ) : eyebrow ? (
            <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{eyebrow}</span>
          ) : null}
          <h1 className="m-0 text-[18px] font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50">{title}</h1>
          {intro && <p className="m-0 max-w-[680px] text-[13.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">{intro}</p>}
        </div>
      </header>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
        {children}
        {error && <Note tone="error">{error}</Note>}
      </div>
      {footer && (
        <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-neutral-200/70 bg-white/95 px-5 py-3 backdrop-blur-md sm:px-6 dark:border-white/5 dark:bg-neutral-900/95">
          {footer}
        </footer>
      )}
    </section>
  );
}

/** Footer layout: Back on the left; Skip + primary on the right. */
export function StepFooter({ onBack, onSkip, skipBusy, primary }) {
  return (
    <>
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13.5px] font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={skipBusy}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-400/10"
          >
            {skipBusy && <Loader2 size={13} className="animate-spin" />}
            Skip for now
          </button>
        )}
        {primary}
      </div>
    </>
  );
}
