import { Loader2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared pieces for the onboarding screens — the look follows the
 * "Vendor Onboarding v2" design: white cards on a warm grey page, deep green
 * (#0B6E5A) primary, amber for skippable / warnings, blue for lane info.
 * ---------------------------------------------------------------------- */

export const inputCls =
  "h-11 w-full rounded-lg border border-[#CFD1CA] bg-white px-3 text-[15px] text-[#15171C] outline-none transition placeholder:text-[#9AA0A9] focus:border-[#0B6E5A] focus:ring-2 focus:ring-[#0B6E5A]/20 disabled:bg-[#F7F7F4] disabled:text-[#5B616E] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100";

export function Field({ label, hint, error, children, optional }) {
  return (
    <label className="flex flex-col gap-1.5 text-[14px] font-medium text-[#15171C] dark:text-neutral-100">
      <span className="flex items-center gap-2">
        {label}
        {optional && <span className="text-[12px] font-normal text-[#5B616E]">Optional</span>}
      </span>
      {hint && <span className="-mt-0.5 text-[12.5px] font-normal text-[#5B616E] dark:text-neutral-400">{hint}</span>}
      {children}
      {error && <span className="text-[12.5px] font-normal text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

/** Radio as a full-width card (registration status, entity type, plans). */
export function RadioCard({ name, checked, onChange, title, description, extra, disabled }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        checked
          ? "border-[#0B6E5A] bg-[#F3FAF7] ring-1 ring-[#0B6E5A] dark:bg-emerald-400/5"
          : "border-[#E2E3DE] bg-white hover:border-[#B9BCB4] dark:border-neutral-800 dark:bg-neutral-900"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} className="mt-1 h-4 w-4 accent-[#0B6E5A]" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] font-semibold text-[#15171C] dark:text-neutral-50">{title}</span>
        {description && <span className="text-[13.5px] leading-snug text-[#4A505C] dark:text-neutral-400">{description}</span>}
        {extra}
      </span>
    </label>
  );
}

const NOTE_TONES = {
  info: { box: "bg-[#E8EEFB] text-[#1F4FB8] dark:bg-sky-400/10 dark:text-sky-300", Icon: Info },
  warn: { box: "bg-[#FFF4E0] text-[#7A4800] dark:bg-amber-400/10 dark:text-amber-300", Icon: AlertTriangle },
  error: { box: "bg-[#FDECEA] text-[#7F1D14] dark:bg-red-500/10 dark:text-red-300", Icon: AlertTriangle },
  ok: { box: "bg-[#E3F1EC] text-[#08513F] dark:bg-emerald-400/10 dark:text-emerald-300", Icon: CheckCircle2 },
  muted: { box: "bg-[#F1F2EE] text-[#3F4550] dark:bg-neutral-800 dark:text-neutral-300", Icon: Info },
};

export function Note({ tone = "info", children }) {
  const t = NOTE_TONES[tone] || NOTE_TONES.info;
  const Icon = t.Icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13.5px] leading-snug ${t.box}`}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Label / value pair for verification results and the review screen. */
export function KeyValue({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] text-[#5B616E] dark:text-neutral-400">{label}</span>
      <span className={`text-[14px] font-medium text-[#15171C] dark:text-neutral-100 ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}

export function PrimaryButton({ children, busy, disabled, onClick, type = "button", tone = "green" }) {
  const tones = {
    green: "bg-[#0B6E5A] text-white hover:bg-[#08513F]",
    dark: "bg-[#15171C] text-white hover:bg-black dark:bg-white dark:text-neutral-900",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-[14.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, busy, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#CFD1CA] bg-white px-4 text-[14px] font-medium text-[#15171C] transition hover:bg-[#F5F5F2] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/**
 * The frame every step uses: "Step N · Group" eyebrow, heading, intro,
 * body, then the footer (Back · Skip · primary).
 */
export function ScreenShell({ eyebrow, title, intro, children, error, footer }) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-[#E2E3DE] bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex flex-col gap-2">
        {eyebrow && <span className="text-[13px] font-medium text-[#0B6E5A] dark:text-emerald-400">{eyebrow}</span>}
        <h1 className="m-0 text-[24px] font-semibold leading-tight tracking-tight text-[#15171C] dark:text-neutral-50">{title}</h1>
        {intro && <p className="m-0 max-w-[640px] text-[15px] leading-relaxed text-[#4A505C] dark:text-neutral-400">{intro}</p>}
      </header>
      <div className="flex flex-col gap-5">{children}</div>
      {error && <Note tone="error">{error}</Note>}
      {footer && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEEE9] pt-5 dark:border-neutral-800">
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
      <div>{onBack && <SecondaryButton onClick={onBack}>Back</SecondaryButton>}</div>
      <div className="flex flex-wrap items-center gap-2">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={skipBusy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-[14px] font-medium text-[#7A4800] hover:bg-[#FFF4E0] disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-400/10"
          >
            {skipBusy && <Loader2 size={14} className="animate-spin" />}
            Skip for now
          </button>
        )}
        {primary}
      </div>
    </>
  );
}
