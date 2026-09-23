// Shared active/inactive switch — used wherever a page needs a status
// toggle (Customer active/inactive, Legal doc active/inactive, ...).
// `disabled` keeps it visible but inert (with a reason in `title`) rather
// than hiding the control outright, so it's always obvious the capability
// exists and why it's locked right now.
export default function ToggleSwitch({ checked, onChange, disabled, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
        checked ? "bg-emerald-400" : "bg-neutral-300 dark:bg-neutral-700"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
