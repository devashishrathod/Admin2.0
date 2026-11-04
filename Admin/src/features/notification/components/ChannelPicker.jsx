import { useState } from "react";
import { Clock3, Info, Sparkles } from "lucide-react";
import { CHANNELS } from "../notificationConfig";
import { Switch } from "./NotificationUi";
import { TINTS, innerTile } from "./notificationStyles";

const LIVE = CHANNELS.filter((c) => c.mode !== "soon");
const SOON = CHANNELS.filter((c) => c.mode === "soon");

const ACTIVE = {
  sky: "border-sky-400/60 bg-sky-400/[0.06]",
  violet: "border-violet-400/50 bg-violet-400/[0.05]",
  amber: "border-amber-400/50 bg-amber-400/[0.05]",
};

const EMAIL_REASON = "Email goes out automatically to people with an email, when email delivery is on in Settings.";

/* Step 1 — three live channels as compact, equal cards. Push and In-app
 * toggle on click (values = { push, inApp }); Email follows the recipient
 * and Settings, so a click explains that. Not-yet-wired channels sit in a
 * slim strip below. */
export default function ChannelPicker({ values, onToggle }) {
  const [showEmailReason, setShowEmailReason] = useState(false);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {LIVE.map((c) => {
          const toggle = c.mode === "toggle";
          const on = toggle ? Boolean(values[c.key]) : true;
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => (toggle ? onToggle(c.key, !on) : setShowEmailReason((v) => !v))}
              aria-pressed={toggle ? on : undefined}
              className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 ${
                on ? ACTIVE[c.tint] : `border-white/80 dark:border-white/5 ${innerTile}`
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${on ? TINTS[c.tint] : TINTS.neutral}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{c.label}</p>
                <p className="truncate text-[10.5px] normal-case text-neutral-500">
                  {toggle ? (on ? "On · " : "Off · ") : ""}
                  {c.note}
                </p>
              </div>
              {toggle ? (
                <Switch checked={on} />
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles size={9} /> Auto
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showEmailReason && (
        <p className="flex items-center gap-1.5 px-1 text-[11px] normal-case text-neutral-500">
          <Info size={12} className="shrink-0 text-sky-500" /> {EMAIL_REASON}
        </p>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-1.5 ${innerTile}`}>
        <span className="flex items-center gap-1 text-[10.5px] font-semibold text-neutral-400">
          <Clock3 size={11} /> Coming soon
        </span>
        {SOON.map((c) => {
          const Icon = c.icon;
          return (
            <span
              key={c.key}
              title={c.description}
              className="flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[10.5px] font-medium text-neutral-400 dark:border-neutral-700"
            >
              <Icon size={10} /> {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
