import { Check } from "lucide-react";

/* Horizontal progress bar for the wizard. Steps already reached are
   clickable; steps ahead stay locked so they can't be skipped. */
export default function Stepper({ steps, current, maxReached, onSelect }) {
  return (
    <nav aria-label="Add brand progress" className="-mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center px-1">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= maxReached;
          return (
            <li key={step.key} className="flex items-center">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className="group flex items-center gap-2 rounded-lg px-1.5 py-1 disabled:cursor-not-allowed"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold transition-colors ${
                    active
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : done
                      ? "bg-emerald-400 text-neutral-950"
                      : reachable
                      ? "border border-neutral-300 text-neutral-600 group-hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-300"
                      : "border border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
                  }`}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[12.5px] font-medium ${
                    active
                      ? "text-neutral-900 dark:text-neutral-50"
                      : reachable
                      ? "text-neutral-600 dark:text-neutral-300"
                      : "text-neutral-400 dark:text-neutral-600"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span
                  className={`mx-1.5 h-px w-6 shrink-0 sm:w-8 ${
                    done ? "bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-800"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
