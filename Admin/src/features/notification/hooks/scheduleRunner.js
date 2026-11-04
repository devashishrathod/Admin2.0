import { broadcastNotification } from "../services/NotificationApi";
import { historyStore } from "./historyStore";
import { SCHEDULE } from "../notificationConfig";
import { statusOf, summarizeBroadcast } from "../utils/notificationUtils";

/* Sends a history entry that hasn't gone out yet (scheduled, missed or
 * cancelled) — used by the scheduler when it's due and by History's
 * "Send now". `from` is the status it must still be in; if another tab
 * already took it, nothing is sent. */
export async function deliverEntry(entry, from = entry.status) {
  if (!historyStore.claim(entry.id, from, { status: "sending" })) return;
  try {
    const res = await broadcastNotification(entry.payload);
    const stats = summarizeBroadcast(res);
    historyStore.update(entry.id, (e) => ({
      ...e,
      stats,
      status: statusOf(stats),
      broadcastId: stats.broadcastId,
      sentAt: new Date().toISOString(),
      error: null,
    }));
  } catch (err) {
    historyStore.update(entry.id, (e) => ({ ...e, status: "failed", error: err.message, sentAt: new Date().toISOString() }));
  }
}

/* Sends every scheduled entry that is due — see NotificationScheduler.jsx
 * for when this runs and how late / multi-tab cases are handled. */
let running = false;

export async function runDueSchedules(now = Date.now()) {
  if (running) return;
  running = true;
  try {
    const due = historyStore
      .get()
      .filter((e) => e.status === "scheduled" && new Date(e.scheduledFor).getTime() <= now);

    for (const entry of due) {
      if (now - new Date(entry.scheduledFor).getTime() > SCHEDULE.graceMs) {
        historyStore.claim(entry.id, "scheduled", { status: "missed" });
      } else {
        await deliverEntry(entry, "scheduled");
      }
    }
  } finally {
    running = false;
  }
}
