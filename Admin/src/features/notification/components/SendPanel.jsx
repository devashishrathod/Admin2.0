import { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, History, Loader2, Send } from "lucide-react";
import { LIMITS } from "../notificationConfig";
import { formatCount, formatWhen, scheduleError } from "../utils/notificationUtils";
import { Button, Checkbox, Notice, SectionCard, Segmented } from "./NotificationUi";
import SchedulePicker from "./SchedulePicker";
import { innerTile } from "./notificationStyles";

function ResultBox({ result, onOpenHistory, onOpenScheduled }) {
  if (result.error) return <Notice tone="error">{result.error}</Notice>;
  if (result.scheduledFor)
    return (
      <Notice tone="success">
        <p className="font-semibold">Scheduled for {formatWhen(result.scheduledFor)}</p>
        <p className="mt-0.5 normal-case">It waits in the Scheduled tab — send it early, reschedule or cancel it there.</p>
        <button type="button" onClick={onOpenScheduled} className="mt-1 flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
          <CalendarClock size={11} /> Open Scheduled
        </button>
      </Notice>
    );
  const s = result.stats;
  const failed = s.push.failed + s.email.failed;
  return (
    <Notice tone={failed ? "warning" : "success"}>
      <p className="font-semibold">{result.message}</p>
      <p className="mt-0.5 normal-case">
        {s.resolved} recipients · {s.inApp} in-app · push {s.push.sent}/{s.push.devices} devices · email {s.email.sent}
        {failed > 0 && ` · ${failed} failed`}
      </p>
      <button type="button" onClick={onOpenHistory} className="mt-1 flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
        <History size={11} /> See it in History
      </button>
    </Notice>
  );
}

function CheckRow({ ok, children }) {
  const Icon = ok ? CheckCircle2 : Circle;
  return (
    <li className={`flex items-center gap-2 text-[12px] normal-case ${ok ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400"}`}>
      <Icon size={14} className={`shrink-0 ${ok ? "text-emerald-500" : ""}`} />
      {children}
    </li>
  );
}

const SubLabel = ({ children }) => (
  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">{children}</p>
);

/* The send card, top to bottom: how many people (and from which roles),
 * channels, a readiness checklist, notes, Send now / Schedule, the button,
 * the outcome. Wide sends need an explicit confirmation either way. */
export default function SendPanel({ resolved, reach, breakdown, message, push, inApp, errors, warnings, sending, result, onSend, onSchedule, onOpenHistory, onOpenScheduled }) {
  const [confirmed, setConfirmed] = useState(false);
  const [when, setWhen] = useState("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const scheduling = when === "schedule";
  const timeError = scheduling ? scheduleError(scheduleAt) : "";

  const count = reach.count;
  const wide = Boolean(resolved.target?.all) || (count ?? 0) > LIMITS.confirmAbove;
  const blocked = errors.length > 0 || sending || (wide && !confirmed) || Boolean(timeError);

  // Errors that aren't one of the three checklist rows (limits, bad URL…).
  const otherErrors = errors.filter((e) => !["Pick who receives it.", "Add a title.", "Add a message.", "Turn on at least one channel."].includes(e));

  const handleSend = async () => {
    if (scheduling) {
      onSchedule(new Date(scheduleAt).toISOString());
      setScheduleAt("");
    } else {
      await onSend();
    }
    setConfirmed(false);
  };

  return (
    <SectionCard icon={Send} title="Send" subtitle="Check, then send">
      {/* Going to */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 p-4 text-white shadow-[0_12px_30px_rgba(16,185,129,0.3)]">
        <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white/80">Going to</p>
          {resolved.target && !reach.loading && (
            <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold">{reach.exact ? "Server checked" : "Estimate"}</span>
          )}
        </div>
        <p className="relative mt-1.5 flex items-center gap-2 text-[32px] font-bold leading-none tabular-nums">
          {formatCount(count, reach.exact || !resolved.target)}
          {reach.loading && <Loader2 size={16} className="animate-spin text-white/80" />}
        </p>
        <p className="relative mt-1.5 line-clamp-2 text-[12px] normal-case text-white/90">{resolved.label}</p>

        {breakdown.length > 0 && (
          <div className="relative mt-3 grid grid-cols-3 gap-1.5">
            {breakdown.map((r) => (
              <div key={r.key} className="rounded-xl bg-white/20 px-2 py-1.5 text-center backdrop-blur-sm">
                <p className="text-[14px] font-bold leading-none tabular-nums">{r.loading ? "…" : formatCount(r.count, r.exact)}</p>
                <p className="mt-1 truncate text-[10px] text-white/85">{r.label}</p>
              </div>
            ))}
          </div>
        )}
        {reach.error && <p className="relative mt-2 text-[10.5px] normal-case text-white/85">Server count unavailable: {reach.error}</p>}
      </div>

      {/* Channels */}
      <div className="mt-4">
        <SubLabel>Channels</SubLabel>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["Push", push],
            ["In-app", inApp],
            ["Email · auto", true],
          ].map(([label, on]) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                on ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-300" : "bg-neutral-200/70 text-neutral-400 line-through dark:bg-neutral-800"
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div className="mt-4">
        <SubLabel>Ready to send</SubLabel>
        <ul className={`space-y-2 rounded-2xl p-3 ${innerTile}`}>
          <CheckRow ok={push || inApp}>Channel on</CheckRow>
          <CheckRow ok={Boolean(resolved.target)}>Audience picked</CheckRow>
          <CheckRow ok={Boolean(message.title.trim())}>Title added</CheckRow>
          <CheckRow ok={Boolean(message.body.trim())}>Message added</CheckRow>
          {otherErrors.map((e) => (
            <li key={e} className="flex items-start gap-2 text-[12px] normal-case text-red-600 dark:text-red-400">
              <AlertTriangle size={14} className="shrink-0" /> {e}
            </li>
          ))}
        </ul>
      </div>

      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5 text-[11px] normal-case text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}

      {/* When */}
      <div className="mt-4">
        <SubLabel>When</SubLabel>
        <Segmented
          stretch
          size="sm"
          value={when}
          onChange={setWhen}
          options={[
            { key: "now", label: "Send now", icon: Send },
            { key: "schedule", label: "Schedule", icon: CalendarClock },
          ]}
        />
        {scheduling && (
          <div className="mt-2.5">
            <SchedulePicker value={scheduleAt} onChange={setScheduleAt} />
          </div>
        )}
      </div>

      {wide && errors.length === 0 && (
        <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] p-3">
          <Checkbox
            checked={confirmed}
            onChange={setConfirmed}
            label={
              <span className="normal-case">
                Yes, {scheduling ? "schedule for" : "send to"} <b>{resolved.target?.all ? "everyone on the platform" : `${formatCount(count, reach.exact)} people`}</b>
              </span>
            }
          />
        </div>
      )}

      <Button
        variant="primary"
        icon={scheduling ? CalendarClock : Send}
        loading={sending}
        disabled={blocked}
        onClick={handleSend}
        className="mt-4 w-full justify-center py-2.5 text-[13.5px]"
      >
        {sending ? "Sending…" : scheduling ? (scheduleAt && !timeError ? `Schedule for ${formatWhen(new Date(scheduleAt).toISOString())}` : "Schedule") : "Send now"}
      </Button>

      {result && (
        <div className="mt-3">
          <ResultBox result={result} onOpenHistory={onOpenHistory} onOpenScheduled={onOpenScheduled} />
        </div>
      )}
    </SectionCard>
  );
}
