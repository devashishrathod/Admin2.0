import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { broadcastNotification } from "../services/NotificationApi";
import { useBroadcastReach, useRoleReach } from "../queries/notificationQueries";
import { AUDIENCE_GROUPS } from "../notificationConfig";
import { useDebouncedValue } from "../hooks/useNotificationState";
import { buildPayload, newId, resolveAudience, statusOf, summarizeBroadcast, validateDraft } from "../utils/notificationUtils";
import { SectionCard } from "./NotificationUi";
import ChannelPicker from "./ChannelPicker";
import AudienceSection from "./audience/AudienceSection";
import MessageEditor from "./MessageEditor";
import NotificationPreview from "./NotificationPreview";
import SendPanel from "./SendPanel";
import PushSetupCard from "./PushSetupCard";

/* -------------------------------------------------------------------------
 * Compose — channels → audience → message on the left, live preview and
 * the send card on the right. All of it reads one persisted draft.
 * ---------------------------------------------------------------------- */
export default function ComposeTab({ draftApi, directory, adminName, onSent, onSaveTemplate, onOpenHistory, onOpenScheduled }) {
  const { draft } = draftApi;
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Per-role counts — a dry run per role, else the loaded list's total.
  // Feeds the role cards, the Send card breakdown and the fallback total.
  const roleQueries = useRoleReach(AUDIENCE_GROUPS.map((g) => g.role));
  const roleStats = AUDIENCE_GROUPS.map((g, i) => {
    const q = roleQueries[i];
    const exact = q?.data != null;
    return {
      ...g,
      count: exact ? q.data : directory[g.key].loading ? null : directory[g.key].total,
      exact,
      loading: Boolean(q?.isPending) || (!exact && directory[g.key].loading),
    };
  });
  const roleCounts = Object.fromEntries(roleStats.map((r) => [r.role, r.count]));
  const roleCountsKey = JSON.stringify(roleCounts);

  const resolved = useMemo(
    () => resolveAudience(draft.audience, directory, JSON.parse(roleCountsKey)),
    [draft.audience, directory, roleCountsKey]
  );
  const { errors, warnings } = useMemo(() => validateDraft(draft, resolved), [draft, resolved]);

  // Real count: a dry run on the audience, once it stops changing. Until it
  // answers (or if it can't), the local estimate stands in, marked as such.
  const targetKey = JSON.stringify(resolved.target);
  const debouncedKey = useDebouncedValue(targetKey, 600);
  const debouncedTarget = useMemo(() => JSON.parse(debouncedKey), [debouncedKey]);
  const reachQuery = useBroadcastReach(debouncedTarget);
  const settled = debouncedKey === targetKey;
  const exact = Boolean(resolved.target) && settled && reachQuery.data != null;
  const reach = {
    count: !resolved.target ? 0 : exact ? reachQuery.data : resolved.estimate ?? null,
    exact,
    loading: Boolean(resolved.target) && (!settled || reachQuery.isFetching),
    error: settled && reachQuery.error ? reachQuery.error.message : "",
  };
  // Which groups this send touches — for the Send card breakdown.
  const breakdown =
    draft.audience.mode === "role"
      ? roleStats.filter((r) => draft.audience.everyone || draft.audience.roles.includes(r.role))
      : [];

  const send = async () => {
    if (errors.length || sending) return;
    setSending(true);
    setResult(null);
    const entry = buildEntry();
    const { payload } = entry;
    try {
      const res = await broadcastNotification(payload);
      const stats = summarizeBroadcast(res);
      onSent({ ...entry, stats, status: statusOf(stats), broadcastId: stats.broadcastId, sentAt: entry.createdAt });
      setResult({ message: res?.message || "Notification sent", stats });
    } catch (err) {
      onSent({ ...entry, stats: null, status: "failed", error: err.message });
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  // Scheduled sends are saved to History as "scheduled"; NotificationScheduler
  // (in Layout) sends them when due. The audience is frozen now, like a send.
  const schedule = (scheduledFor) => {
    if (errors.length) return;
    onSent({ ...buildEntry(), stats: null, status: "scheduled", scheduledFor });
    setResult({ scheduledFor });
  };

  function buildEntry() {
    const payload = buildPayload(draft, resolved.target);
    return {
      id: newId(),
      createdAt: new Date().toISOString(),
      by: adminName,
      title: payload.title,
      body: payload.body,
      severity: payload.severity,
      push: draft.push,
      inApp: draft.inApp,
      audienceLabel: resolved.label,
      targeted: reach.count,
      payload,
      draft,
    };
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <SectionCard step={1} icon={Radio} title="Channels" subtitle="Where this update goes out.">
          <ChannelPicker values={{ push: draft.push, inApp: draft.inApp }} onToggle={draftApi.setChannel} />
        </SectionCard>
        <AudienceSection draftApi={draftApi} directory={directory} resolved={resolved} reach={reach} roleStats={roleStats} />
        <MessageEditor
          message={draft.message}
          onChange={draftApi.patchMessage}
          onSaveTemplate={(name) => onSaveTemplate({ name, push: draft.push, inApp: draft.inApp, message: draft.message })}
        />
      </div>

      <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
        <NotificationPreview message={draft.message} push={draft.push} inApp={draft.inApp} />
        <SendPanel
          resolved={resolved}
          reach={reach}
          breakdown={breakdown}
          message={draft.message}
          push={draft.push}
          inApp={draft.inApp}
          errors={errors}
          warnings={warnings}
          sending={sending}
          result={result}
          onSend={send}
          onSchedule={schedule}
          onOpenHistory={onOpenHistory}
          onOpenScheduled={onOpenScheduled}
        />
        <PushSetupCard />
      </div>
    </div>
  );
}
