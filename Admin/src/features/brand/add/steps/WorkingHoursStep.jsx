import { Copy } from "lucide-react";
import ToggleSwitch from "../../../../components/common/ToggleSwitch";
import { FormSection } from "../components/FormControls";
import { DAYS } from "../brandFormConfig";

const timeInput =
  "rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:[color-scheme:dark]";

export default function WorkingHoursStep({ form, errors, setSection }) {
  const { workingHours } = form;

  const setDay = (day, patch) =>
    setSection("workingHours", (prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  // Copies only the timings — each day keeps its own open/closed state.
  const copyMondayToAll = () =>
    setSection("workingHours", (prev) =>
      Object.fromEntries(
        DAYS.map((day) => [day, { ...prev[day], start: prev.monday.start, end: prev.monday.end }])
      )
    );

  return (
    <FormSection title="Opening hours" description="Customers see the outlet as open or closed based on these timings.">
      <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {DAYS.map((day) => {
          const hours = workingHours[day];
          const error = errors[`workingHours.${day}`];
          return (
            <div key={day} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="w-24 text-[13px] font-medium capitalize text-neutral-800 dark:text-neutral-200">{day}</span>
                <div className="flex w-20 items-center gap-2">
                  <ToggleSwitch checked={hours.isOpen} onChange={() => setDay(day, { isOpen: !hours.isOpen })} />
                  <span className={`text-[11.5px] ${hours.isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}`}>
                    {hours.isOpen ? "Open" : "Closed"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${day} opening time`}
                    value={hours.start}
                    disabled={!hours.isOpen}
                    onChange={(e) => setDay(day, { start: e.target.value })}
                    className={timeInput}
                  />
                  <span className="text-[12px] text-neutral-400">to</span>
                  <input
                    type="time"
                    aria-label={`${day} closing time`}
                    value={hours.end}
                    disabled={!hours.isOpen}
                    onChange={(e) => setDay(day, { end: e.target.value })}
                    className={timeInput}
                  />
                </div>
                {day === "monday" && (
                  <button
                    type="button"
                    onClick={copyMondayToAll}
                    className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/10 dark:text-emerald-400"
                  >
                    <Copy size={12} />
                    Copy to all days
                  </button>
                )}
              </div>
              {error && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{error}</p>}
            </div>
          );
        })}
      </div>
    </FormSection>
  );
}
