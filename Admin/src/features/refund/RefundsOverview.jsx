import { useMemo, useState } from "react";
import {
  Wallet,
  RotateCcw,
  Percent,
  Receipt,
  BarChart3,
  ShieldCheck,
  ListChecks,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock3,
  Hourglass,
  Ban,
  Gavel,
  AlarmClock,
  Inbox,
  ThumbsUp,
  ThumbsDown,
  Loader,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { FIN_STATUS, fullInr, rangeLabel, dailySeries, weekTrends, sumBy } from "../../utils/financeOverview";
import { OverviewShell, KpiTile, DailyBarsCard, DonutCard, StateRowsCard, RankListCard } from "../../components/common/FinanceOverviewParts";
import { refundMethodLabel } from "./refundUtils";

/* -------------------------------------------------------------------------
 * Refunds overview — analysis of exactly the rows the page's filters select
 * (tab, date range, search). Two scopes, two questions:
 *   "requests" (Refund Requests) — what needs action: open requests, the
 *       ones waiting on you, vendor replies past their deadline, vendor
 *       response split.
 *   "all" (Refunds) — what happened: approved amount, approval rate, status
 *       split, payout progress.
 * Both also show amount per day (follows the date range), top reasons and
 * refund method. Shared look with Transactions / Settlements
 * (FinanceOverviewParts). Requests rising is bad news, so those trends are
 * inverted (red when going up).
 * ---------------------------------------------------------------------- */

const requestedOf = (r) => r.requestedAmount;
const approvedOf = (r) => r.approvedAmount ?? r.requestedAmount;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Group rows → [{ name, value, sub }] by count, top 5.
function topBy(rows, getName) {
  const map = new Map();
  rows.forEach((r) => {
    const name = getName(r);
    map.set(name, (map.get(name) || 0) + 1);
  });
  return [...map]
    .map(([name, value]) => ({ name, value, sub: `${Math.round((value / (rows.length || 1)) * 100)}%` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

const reasonName = (r) => (r.reason && r.reason !== "—" ? r.reason : "Unspecified");
const methodName = (r) => {
  const label = refundMethodLabel(r.method);
  return label && label !== "—" ? label : "Not set";
};

function useOverview(rows, scope, dateFrom, dateTo, now) {
  return useMemo(() => {
    const base = {
      total: rows.length,
      requested: sumBy(rows, requestedOf),
      series: dailySeries(rows, { getDate: (r) => r.date, getValue: requestedOf, dateFrom, dateTo }),
      reasons: topBy(rows, reasonName),
      methods: topBy(rows, methodName),
    };

    if (scope === "requests") {
      const decide = rows.filter((r) => r.canDecide);
      const vendor = rows.filter((r) => !r.canDecide);
      const overdue = vendor.filter((r) => r.vendorRespondBy && new Date(r.vendorRespondBy).getTime() < now);
      const byStatus = (status) => rows.filter((r) => r.status === status);
      return {
        ...base,
        decide,
        vendor,
        overdue,
        trends: weekTrends(rows, (l) => ({ count: l.length, requested: sumBy(l, requestedOf) }), { dateFrom, dateTo }),
        split: [
          { key: "vendor", label: "Awaiting vendor", color: FIN_STATUS.warning, icon: Hourglass, count: vendor.length, amount: sumBy(vendor, requestedOf) },
          { key: "decide", label: "Needs your decision", color: FIN_STATUS.info, icon: Gavel, count: decide.length, amount: sumBy(decide, requestedOf) },
        ],
        response: [
          ["PENDING", "Awaiting vendor reply", FIN_STATUS.warning, Clock3],
          ["VENDOR_APPROVED", "Vendor approved", FIN_STATUS.good, ThumbsUp],
          ["VENDOR_REJECTED", "Vendor rejected", FIN_STATUS.critical, ThumbsDown],
          ["VENDOR_TIMEOUT", "Vendor didn't reply", FIN_STATUS.serious, AlarmClock],
        ].map(([key, label, color, icon]) => {
          const list = byStatus(key);
          return { key, label, color, icon, count: list.length, amount: sumBy(list, requestedOf) };
        }),
      };
    }

    // scope "all" — decided refunds.
    const inBucket = (b) => rows.filter((r) => r.statusBucket === b);
    const approved = inBucket("approved");
    const rejected = inBucket("rejected");
    const approvedAmount = sumBy(approved, approvedOf);
    const decided = approved.length + rejected.length;
    const payoutRows = rows.filter((r) => r.statusBucket === "approved" || r.statusBucket === "pending");
    const byStatus = (list) => payoutRows.filter((r) => list.includes(r.status));
    return {
      ...base,
      approvedCount: approved.length,
      approvedAmount,
      approvalRate: decided ? (approved.length / decided) * 100 : 0,
      avgRefund: approved.length ? approvedAmount / approved.length : 0,
      trends: weekTrends(
        rows,
        (l) => {
          const ok = l.filter((r) => r.statusBucket === "approved");
          const dec = ok.length + l.filter((r) => r.statusBucket === "rejected").length;
          return { count: l.length, approvedAmount: sumBy(ok, approvedOf), rate: dec ? (ok.length / dec) * 100 : 0 };
        },
        { dateFrom, dateTo, points: ["rate"] }
      ),
      split: [
        ["approved", "Approved", FIN_STATUS.good, CheckCircle2],
        ["pending", "In payout", FIN_STATUS.info, Loader],
        ["rejected", "Rejected", FIN_STATUS.critical, XCircle],
        ["withdrawn", "Withdrawn", FIN_STATUS.neutral, Ban],
      ].map(([key, label, color, icon]) => {
        const list = inBucket(key);
        return { key, label, color, icon, count: list.length, amount: sumBy(list, requestedOf) };
      }),
      payoutTotal: payoutRows.length,
      payout: [
        ["done", "Refunded to customer", ["COMPLETED"], FIN_STATUS.good, CheckCircle2],
        ["processing", "Processing", ["PROCESSING"], FIN_STATUS.info, Loader],
        ["failed", "Payment failed", ["FAILED"], FIN_STATUS.critical, XCircle],
        ["awaiting", "Approved, not paid yet", ["ADMIN_APPROVED", "ADMIN_OVERRIDE", "APPROVED"], FIN_STATUS.warning, Hourglass],
      ].map(([key, label, statuses, color, icon]) => {
        const list = byStatus(statuses);
        return { key, label, color, icon, count: list.length, amount: sumBy(list, approvedOf) };
      }),
    };
  }, [rows, scope, dateFrom, dateTo, now]);
}

export default function RefundsOverview({ rows, scope = "all", dateFrom, dateTo, loading }) {
  const { isDark } = useTheme();
  // "Now" for the overdue check, fixed when the page opens (render stays pure).
  const [now] = useState(() => Date.now());
  const data = useOverview(rows, scope, dateFrom, dateTo, now);
  const t = data.trends;
  const ranged = Boolean(dateFrom || dateTo);
  const requests = scope === "requests";
  const days = data.series.daily.length;

  return (
    <OverviewShell
      icon={requests ? Inbox : RotateCcw}
      title={requests ? "Refund requests overview" : "Refunds overview"}
      subtitle={`${plural(data.total, requests ? "open request" : "refund")} · ${rangeLabel(dateFrom, dateTo)}`}
      loading={loading}
    >
      {requests ? (
        <>
          <KpiTile highlight icon={Wallet} label="Requested amount" value={fullInr(data.requested)} trend={t?.requested} invert note="Across these open requests" />
          <KpiTile
            icon={Inbox}
            tint="sky"
            label="Open requests"
            value={data.total.toLocaleString("en-IN")}
            trend={t?.count}
            invert
            note={`${data.vendor.length} awaiting vendor · ${data.decide.length} need you`}
          />
          <KpiTile
            icon={Gavel}
            tint="violet"
            label="Needs your decision"
            value={data.decide.length.toLocaleString("en-IN")}
            note={data.decide.length ? `${fullInr(sumBy(data.decide, requestedOf))} to approve or reject` : "Nothing waiting on you"}
          />
          <KpiTile
            icon={AlarmClock}
            tint="red"
            label="Vendor reply overdue"
            value={data.overdue.length.toLocaleString("en-IN")}
            note={data.overdue.length ? "Past the vendor's reply deadline" : "All vendors within their deadline"}
          />
        </>
      ) : (
        <>
          <KpiTile
            highlight
            icon={Wallet}
            label="Approved amount"
            value={fullInr(data.approvedAmount)}
            trend={t?.approvedAmount}
            invert
            note={plural(data.approvedCount, "approved refund")}
          />
          <KpiTile
            icon={RotateCcw}
            tint="sky"
            label="Refunds"
            value={data.total.toLocaleString("en-IN")}
            trend={t?.count}
            invert
            note={data.split.map((s) => `${s.count} ${s.label.toLowerCase()}`).slice(0, 3).join(" · ")}
          />
          <KpiTile
            icon={Percent}
            tint="violet"
            label="Approval rate"
            value={`${data.approvalRate.toFixed(1)}%`}
            trend={t?.rate}
            trendSuffix=" pts"
            note="Approved out of approved + rejected"
          />
          <KpiTile icon={Receipt} tint="amber" label="Avg. refund" value={fullInr(data.avgRefund)} note={t ? "Trends: last 7 days vs the 7 before" : "Within the selected filters"} />
        </>
      )}

      <DailyBarsCard
        icon={BarChart3}
        title={requests ? "Requests per day" : "Refund amount per day"}
        subtitle={ranged ? `Selected range · ${days} days · requested amount` : `Last ${days} days · requested amount`}
        series={data.series}
        isDark={isDark}
        countLabel="requests"
        emptyText="No refunds in this period."
      />
      <DonutCard
        icon={ShieldCheck}
        title={requests ? "Who's on it" : "Status"}
        subtitle={plural(data.total, requests ? "open request" : "refund")}
        parts={data.split}
        total={data.total}
        centerNote={requests ? `${data.decide.length} need you` : `${data.approvalRate.toFixed(0)}% approved`}
        isDark={isDark}
        emptyText="Nothing matches these filters."
      />
      {requests ? (
        <StateRowsCard
          icon={Clock3}
          title="Vendor response"
          subtitle="Where each request stands with the vendor"
          parts={data.response}
          total={data.total}
          emptyText="No open requests."
        />
      ) : (
        <StateRowsCard
          icon={Landmark}
          title="Payout progress"
          subtitle="Approved refunds — money back to customers"
          parts={data.payout}
          total={data.payoutTotal}
          emptyText="No approved refunds yet."
        />
      )}

      <RankListCard icon={ListChecks} title="Top reasons" subtitle="Why customers ask for refunds" items={data.reasons} isDark={isDark} emptyText="No refunds match these filters." />
      <RankListCard icon={Landmark} title="Refund method" subtitle="How the money goes back" items={data.methods} isDark={isDark} emptyText="No refunds match these filters." />
    </OverviewShell>
  );
}