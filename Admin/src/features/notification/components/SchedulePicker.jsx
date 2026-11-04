import { CalendarClock, Info } from "lucide-react";
import { SCHEDULE } from "../notificationConfig";
import { formatWhen, scheduleError } from "../utils/notificationUtils";
import { innerTile, inputClass } from "./notificationStyles";

// Date → "YYYY-MM-DDTHH:mm" in local time, what <input type="datetime-local"> takes.
const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const at = (dayOffset, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
};

function presets(now) {
  const inHour = new Date(now.getTime() + 60 * 60_000);
  inHour.setSeconds(0, 0);
  return [
    { label: "In 1 hour", date: inHour },
    { label: "Today 7 PM", date: at(0, 19) },
    { label: "Tomorrow 9 AM", date: at(1, 9) },
    { label: "Tomorrow 6 PM", date: at(1, 18) },
  ].filter((p) => p.date.getTime() - now.getTime() >= SCHEDULE.minLeadMs);
}

/* Date + time for a scheduled send, with one-tap presets. `value` is the
 * datetime-local string. */
export default function SchedulePicker({ value, onChange }) {
  const now = new Date();
  const min = toLocalInput(new Date(now.getTime() + SCHEDULE.minLeadMs));
  const error = value ? scheduleError(value) : "";

  return (
    <div className={`space-y-2.5 rounded-2xl p-3 ${innerTile}`}>
      <div className="flex flex-wrap gap-1.5">
        {presets(now).map((p) => {
          const v = toLocalInput(p.date);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(v)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                value === v
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-neutral-600 hover:bg-emerald-400/10 hover:text-emerald-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <CalendarClock size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input type="datetime-local" value={value} min={min} onChange={(e) => onChange(e.target.value)} className={`${inputClass} pl-9`} />
      </div>

      {value && !error && (
        <p className="text-[11.5px] font-semibold normal-case text-emerald-700 dark:text-emerald-300">Goes out {formatWhen(new Date(value).toISOString())}</p>
      )}
      {error && <p className="text-[11.5px] normal-case text-red-600 dark:text-red-400">{error}</p>}

      <p className="flex items-start gap-1.5 text-[10.5px] normal-case leading-snug text-neutral-500">
        <Info size={11} className="mt-0.5 shrink-0 text-sky-500" />
        Sent from this admin panel — keep it open in a tab (any page) at that time. If it's closed, it goes out when you next
        open the panel, or is marked missed if that's over {SCHEDULE.graceMs / 3_600_000} hours late.
      </p>
    </div>
  );
}
