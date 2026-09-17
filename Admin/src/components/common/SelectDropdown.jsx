import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

/* -------------------------------------------------------------------------
 * Shared single-select dropdown for toolbar filters — a closed-by-default
 * trigger + custom panel, styled to match the rest of the app in both
 * themes. Replaces the native <select>/<option> pair, whose dropdown list
 * is drawn by the OS (always a plain white/black listbox on Windows) and
 * can't be themed to match a dark page.
 * ---------------------------------------------------------------------- */
export default function SelectDropdown({ value, options, onChange, icon: Icon, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-3 text-[12.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        {Icon && <Icon size={14} className="shrink-0 text-neutral-500" />}
        {value}
        <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-1.5 max-h-72 w-48 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
                value === opt
                  ? "bg-emerald-400/15 text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {opt}
              {value === opt && <Check size={13} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
