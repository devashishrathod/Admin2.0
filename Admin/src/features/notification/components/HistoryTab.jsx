import { useMemo, useState } from "react";
import { CalendarClock, CopyPlus, History, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
import CommonEmptyState from "../../../components/common/EmptyState";
import { HISTORY_STATUSES } from "../notificationConfig";
import { failedCount, formatWhen } from "../utils/notificationUtils";
import { Button, Notice, Pill, SectionCard } from "./NotificationUi";
import { inputClass } from "./notificationStyles";

const STATUS_PILL = {
  sent: ["emerald", "Sent"],
  partial: ["amber", "Partly failed"],
  failed: ["red", "Failed"],
  scheduled: ["violet", "Scheduled"],
  sending: ["sky", "Sending…"],
  missed: ["amber", "Missed"],
  cancelled: ["neutral", "Cancelled"],
};

// Not sent yet — can be sent by hand from here.
const UNSENT = new Set(["scheduled", "missed", "cancelled"]);

const CHANNEL_FILTERS = [
  { value: "all", label: "All channels" },
  { value: "push", label: "With push" },
  { value: "inApp", label: "In-app only" },
];

function Delivery({ entry }) {
  const [tint, label] = STATUS_PILL[entry.status] || STATUS_PILL.sent;
  const s = entry.stats;
  if (UNSENT.has(entry.status) || entry.status === "sending")
    return (
      <div>
        <Pill tint={tint}>
          {entry.status === "sending" && <Loader2 size={9} className="animate-spin" />}
          {label}
        </Pill>
        <p className="mt-1 text-[10.5px] normal-case text-neutral-500">
          {entry.status === "scheduled" && `Goes out ${formatWhen(entry.scheduledFor)}`}
          {entry.status === "missed" && "The panel was closed at send time — send it by hand."}
          {entry.status === "cancelled" && "Won't go out."}
          {entry.status === "sending" && "Going out now"}
        </p>
      </div>
    );
  if (!s)
    return (
      <div>
        <Pill tint={tint}>{label}</Pill>
        <p className="mt-1 line-clamp-2 text-[10.5px] text-red-500">{entry.error}</p>
      </div>
    );
  const pct = s.push.devices ? Math.round((s.push.sent / s.push.devices) * 100) : 0;
  const noDevice = Math.max(0, s.resolved - s.push.devices);
  return (
    <div className="min-w-[150px]">
      <Pill tint={tint}>{label}</Pill>
      {entry.push && (
        <>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100/80 dark:bg-neutral-800">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[10.5px] text-neutral-500">
            {s.push.devices ? `${s.push.sent} of ${s.push.devices} devices` : "No push delivered"}
            {s.push.failed > 0 && <span className="text-red-500"> · {s.push.failed} failed</span>}
          </p>
          {noDevice > 0 && <p className="text-[10.5px] text-neutral-400">{noDevice} had no registered device</p>}
        </>
      )}
      <p className="text-[10.5px] text-neutral-400">
        {s.inApp} in-app · {s.email.sent} email{s.email.failed > 0 && <span className="text-red-500"> · {s.email.failed} failed</span>}
      </p>
    </div>
  );
}

/* Every send made from this browser with the numbers its response carried.
 * Duplicate reloads the whole draft (audience included); Retry resends with
 * the broadcastId so people who already got it are skipped. */
export default function HistoryTab({ entries, onDuplicate, onRetry, onRemove }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [retrying, setRetrying] = useState(null);
  const [retryError, setRetryError] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (status === "all" || e.status === status) &&
        (channel === "all" || (channel === "push" ? e.push : !e.push)) &&
        (!q || [e.title, e.body, e.audienceLabel].some((v) => (v || "").toLowerCase().includes(q)))
    );
  }, [entries, query, status, channel]);

  const retry = async (entry) => {
    setRetrying(entry.id);
    setRetryError("");
    try {
      await onRetry(entry);
    } catch (err) {
      setRetryError(err.message);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <SectionCard icon={History} title="Sent notifications" subtitle="Everything sent from this browser, newest first — scheduled ones live in the Scheduled tab">
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, message or audience" className={`${inputClass} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
          {HISTORY_STATUSES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>
          {CHANNEL_FILTERS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {retryError && (
        <Notice tone="error" className="mb-3">
          Retry failed: {retryError}
        </Notice>
      )}

      {rows.length ? (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-emerald-700/70 dark:text-emerald-400/70">
                <th className="px-2 pb-2.5 font-semibold">Notification</th>
                <th className="px-2 pb-2.5 font-semibold">Channels</th>
                <th className="px-2 pb-2.5 font-semibold">Audience</th>
                <th className="px-2 pb-2.5 font-semibold">Delivery</th>
                <th className="px-2 pb-2.5 font-semibold">When</th>
                <th className="px-2 pb-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70 dark:divide-neutral-800/70">
              {rows.map((e) => (
                <tr key={e.id} className="align-top transition-colors hover:bg-white/60 dark:hover:bg-neutral-800/30">
                  <td className="max-w-[260px] px-2 py-3">
                    <p className="truncate font-semibold text-neutral-900 dark:text-neutral-50">{e.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500">{e.body}</p>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col items-start gap-1">
                      {e.push && <Pill tint="sky">Push</Pill>}
                      {e.inApp !== false && <Pill tint="violet">In-app</Pill>}
                    </div>
                  </td>
                  <td className="max-w-[180px] px-2 py-3">
                    <p className="line-clamp-2 text-neutral-700 dark:text-neutral-300">{e.audienceLabel}</p>
                    <p className="text-[10.5px] text-neutral-400">
                      {e.stats ? `${e.stats.resolved} resolved` : e.targeted != null ? `${e.targeted} targeted` : ""}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    <Delivery entry={e} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-[11px] text-neutral-500">
                    {e.scheduledFor ? (
                      <p className="flex items-center gap-1 font-medium text-violet-600 dark:text-violet-400">
                        <CalendarClock size={11} /> {formatWhen(e.scheduledFor)}
                      </p>
                    ) : (
                      formatWhen(e.sentAt || e.createdAt)
                    )}
                    {e.scheduledFor && e.sentAt && <p className="text-neutral-400">sent {formatWhen(e.sentAt)}</p>}
                    {e.by && <p className="text-neutral-400">by {e.by}</p>}
                    {e.retries > 0 && <p className="text-neutral-400">retried {e.retries}×</p>}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(e.status === "failed" || failedCount(e.stats) > 0) && (
                        <Button
                          size="icon"
                          variant="soft"
                          icon={RotateCcw}
                          loading={retrying === e.id}
                          disabled={Boolean(retrying)}
                          title={e.broadcastId ? "Retry the ones that missed it" : "Send again"}
                          aria-label="Retry"
                          onClick={() => retry(e)}
                        />
                      )}
                      <Button size="icon" icon={CopyPlus} title="Duplicate into Compose" aria-label="Duplicate" onClick={() => onDuplicate(e)} />
                      <Button size="icon" variant="danger" icon={Trash2} title="Remove from history" aria-label="Remove" onClick={() => onRemove(e.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CommonEmptyState
          variant="compact"
          icon={History}
          title={entries.length ? "Nothing matches these filters" : "Nothing sent yet"}
          description={entries.length ? undefined : "Sends from Compose show up here with their delivery numbers."}
          className="py-10"
        />
      )}
    </SectionCard>
  );
}
