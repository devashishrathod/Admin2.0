import { useEffect } from "react";
import { SCHEDULE } from "./notificationConfig";
import { runDueSchedules } from "./hooks/scheduleRunner";

/* -------------------------------------------------------------------------
 * Fires scheduled notifications. The API has no scheduling endpoint, so the
 * admin panel itself sends them: this renders nothing and is mounted in
 * Layout, so it runs on every logged-in page. Every SCHEDULE.tickMs it
 * sends whatever is due through the same POST /notifications/broadcast.
 *
 *   - Several tabs open → historyStore.claim lets only one of them send.
 *   - Panel closed at send time → it goes out when the panel next opens,
 *     unless it's more than SCHEDULE.graceMs late; then it's marked
 *     "missed" for the admin to send by hand rather than going out stale.
 * ---------------------------------------------------------------------- */

export default function NotificationScheduler() {
  useEffect(() => {
    runDueSchedules();
    const id = setInterval(() => runDueSchedules(), SCHEDULE.tickMs);
    return () => clearInterval(id);
  }, []);
  return null;
}
