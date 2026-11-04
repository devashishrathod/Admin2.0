import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CopyPlus, Loader2, PencilLine, Send, Trash2, Users } from "lucide-react";
import CommonEmptyState from "../../../components/common/EmptyState";
import { formatWhen, scheduleError } from "../utils/notificationUtils";
import { Button, GlassCard, Notice, Pill, SectionCard } from "./NotificationUi";
import { innerTile } from "./notificationStyles";
import SchedulePicker from "./SchedulePicker";

// Re-render every 30s so the countdowns stay current.
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function countdown(iso, now) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "due now";
  const m = Math.round(diff / 60_000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}${h % 24 ? ` ${h % 24}h` : ""}`;
}

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const LOOK = {
  scheduled: { tint: "violet", label: "Scheduled", tile: "bg-violet-400/10 text-violet-600 dark:text-violet-400" },
  sending: { tint: "sky", label: "Sending…", tile: "bg-sky-400/10 text-sky-600 dark:text-sky-400" },
  missed: { tint: "amber", label: "Missed", tile: "bg-amber-400/10 text-amber-600 dark:text-amber-400" },
  cancelled: { tint: "neutral", label: "Cancelled", tile: "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
};

function ScheduleCard({ entry, now, busy, onSendNow, onCancel, onReschedule, onDuplicate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(entry.scheduledFor));
  const look = LOOK[entry.status] || LOOK.scheduled;
  const when = new Date(entry.scheduledFor);
  const editError = scheduleError(value);

  return (
    <div className={`rounded-2xl border border-white/80 p-4 dark:border-white/5 ${innerTile}`}>
      <div className="flex items-start gap-3">
        {/* Date tile */}
        <div className={`flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 ${look.tile}`}>
          <span className="text-[10px] font-bold uppercase">{when.toLocaleDateString("en-IN", { month: "short" })}</span>
          <span className="text-[20px] font-bold leading-none tabular-nums">{when.getDate()}</span>
          <span className="mt-0.5 text-[10px] font-semibold tabular-nums">
            {when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill tint={look.tint}>
              {entry.status === "sending" && <Loader2 size={9} className="animate-spin" />}
              {look.label}
            </Pill>
            {entry.status === "scheduled" && <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">{countdown(entry.scheduledFor, now)}</span>}
            {entry.push && <Pill tint="sky">Push</Pill>}
            {entry.inApp !== false && <Pill tint="violet">In-app</Pill>}
          </div>
          <p className="mt-1.5 truncate text-[13.5px] font-bold text-neutral-900 dark:text-neutral-50">{entry.title}</p>
          <p className="line-clamp-2 text-[11.5px] normal-case text-neutral-500">{entry.body}</p>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] normal-case text-neutral-500">
            <Users size={11} /> {entry.audienceLabel}
            {entry.targeted != null && <span className="text-neutral-400"> · ~{entry.targeted}</span>}
            {entry.by && <span className="text-neutral-400"> · by {entry.by}</span>}
          </p>
          {entry.status === "missed" && (
            <p className="mt-1 flex items-center gap-1 text-[11px] normal-case text-amber-600 dark:text-amber-400">
              <AlertTriangle size={11} /> The panel was closed at send time — send it now or reschedule.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {entry.status !== "sending" && (
            <>
              <Button size="icon" variant="soft" icon={Send} loading={busy} disabled={busy} title="Send now" aria-label="Send now" onClick={() => onSendNow(entry)} />
              <Button size="icon" icon={PencilLine} title="Reschedule" aria-label="Reschedule" onClick={() => setEditing((v) => !v)} />
              {entry.status === "scheduled" && (
                <Button size="icon" icon={Ban} title="Cancel" aria-label="Cancel" onClick={() => onCancel(entry)} />
              )}
              <Button size="icon" icon={CopyPlus} title="Duplicate into Compose" aria-label="Duplicate" onClick={() => onDuplicate(entry)} />
              {entry.status !== "scheduled" && (
                <Button size="icon" variant="danger" icon={Trash2} title="Remove" aria-label="Remove" onClick={() => onRemove(entry.id)} />
              )}
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <SchedulePicker value={value} onChange={setValue} />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" onClick={() => setEditing(false)}>
              Close
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={CalendarClock}
              disabled={Boolean(editError)}
              onClick={() => {
                onReschedule(entry, new Date(value).toISOString());
                setEditing(false);
              }}
            >
              Save new time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, subtitle, entries, ...cardProps }) {
  if (!entries.length) return null;
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <p className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-200">{title}</p>
        <span className="text-[11px] text-neutral-400">
          {entries.length} · {subtitle}
        </span>
      </div>
      <div className="space-y-2.5">
        {entries.map((e) => (
          <ScheduleCard key={e.id} entry={e} {...cardProps} busy={cardProps.busyId === e.id} />
        ))}
      </div>
    </div>
  );
}

/* Everything that hasn't gone out yet: upcoming sends (soonest first),
 * missed ones that need a decision, and cancelled ones. Sending, reschedule
 * and cancel all write to the shared history store, so the background
 * scheduler and other tabs pick the change up straight away. */
export default function ScheduledTab({ entries, onSendNow, onCancel, onReschedule, onDuplicate, onRemove, onCompose }) {
  const now = useNow();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const groups = useMemo(() => {
    const by = (s) => entries.filter((e) => e.status === s);
    const soonest = (a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor);
    return {
      upcoming: [...by("scheduled"), ...by("sending")].sort(soonest),
      missed: by("missed").sort(soonest),
      cancelled: by("cancelled").sort(soonest),
    };
  }, [entries]);

  const sendNow = async (entry) => {
    setBusyId(entry.id);
    setError("");
    try {
      await onSendNow(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const next = groups.upcoming.find((e) => e.status === "scheduled");
  const cardProps = { now, busyId, onSendNow: sendNow, onCancel, onReschedule, onDuplicate, onRemove };

  if (!groups.upcoming.length && !groups.missed.length && !groups.cancelled.length)
    return (
      <GlassCard>
        <CommonEmptyState
          icon={CalendarClock}
          title="Nothing scheduled"
          description='In Compose, switch the Send card to "Schedule" and pick a time.'
          action={{ label: "Go to Compose", onClick: onCompose }}
          className="py-10"
        />
      </GlassCard>
    );

  return (
    <SectionCard
      icon={CalendarClock}
      title="Scheduled notifications"
      subtitle={next ? `Next one goes out ${formatWhen(next.scheduledFor)} (${countdown(next.scheduledFor, now)})` : "Nothing upcoming"}
    >
      {error && (
        <Notice tone="error" className="mb-3">
          {error}
        </Notice>
      )}
      <Notice tone="info" className="mb-4">
        <span className="normal-case">Scheduled sends go out from this admin panel — keep it open in a tab (any page) at send time.</span>
      </Notice>
      <div className="space-y-5">
        <Group title="Upcoming" subtitle="soonest first" entries={groups.upcoming} {...cardProps} />
        <Group title="Needs attention" subtitle="missed while the panel was closed" entries={groups.missed} {...cardProps} />
        <Group title="Cancelled" subtitle="won't go out" entries={groups.cancelled} {...cardProps} />
      </div>
    </SectionCard>
  );
}
