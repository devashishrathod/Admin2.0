import { useMemo } from "react";
import { BellRing, CalendarClock, CheckCircle2, Users } from "lucide-react";
import { KpiTile } from "../../../components/common/FinanceOverviewParts";
import { historyTotals } from "../utils/notificationUtils";

/* KPI row over the send history — same tiles as the finance overviews
 * (Dashboard StatCard look). Numbers come from what each broadcast
 * response reported back. */
export default function NotificationStats({ entries }) {
  const t = useMemo(() => historyTotals(entries), [entries]);
  const n = (v) => v.toLocaleString("en-IN");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        highlight
        icon={Users}
        label="Recipients reached"
        value={n(t.resolved)}
        note={`Across ${t.sends} send${t.sends === 1 ? "" : "s"}`}
        className=""
      />
      <KpiTile
        icon={CheckCircle2}
        tint="emerald"
        label="Delivered"
        value={`${t.deliveredPct}%`}
        note={`${n(t.delivered)} push and email`}
        className=""
      />
      <KpiTile icon={BellRing} tint="violet" label="Recorded in-app" value={n(t.inApp)} note="Rows in recipients' bells" className="" />
      <KpiTile
        icon={CalendarClock}
        tint={t.needsRetry ? "amber" : "sky"}
        label="Scheduled"
        value={n(t.scheduled)}
        note={t.needsRetry ? `${n(t.needsRetry)} need a retry · ${n(t.failed)} failed` : `${n(t.failed)} failed deliveries`}
        className=""
      />
    </div>
  );
}
