// Shared active/inactive switch — used wherever a page needs a status
// toggle (Brand / Listing Feature / Customer / Legal doc active, ...).
// `disabled` keeps it visible but inert (with a reason in `title`) rather
// than hiding the control outright, so it's always obvious the capability
// exists and why it's locked right now.
export default function ToggleSwitch({ checked, onChange, disabled, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={title}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 ring-inset transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
        checked
          ? "bg-emerald-500 ring-emerald-600/20 hover:bg-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          : "bg-neutral-200 ring-black/5 hover:bg-neutral-300 dark:bg-neutral-700 dark:ring-white/10 dark:hover:bg-neutral-600"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
