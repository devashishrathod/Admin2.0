import { useMemo } from "react";
import {
  Wallet,
  Landmark,
  CalendarClock,
  Receipt,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  PauseCircle,
  XCircle,
  RotateCcw,
  Ban,
  AlertTriangle,
  Wrench,
  AlarmClock,
  Coins,
  Store,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { FIN_STATUS, fullInr, rangeLabel, dailySeries, weekTrends, sumBy } from "../../utils/financeOverview";
import { OverviewShell, KpiTile, DailyBarsCard, DonutCard, StateRowsCard, RankListCard } from "../../components/common/FinanceOverviewParts";

/* -------------------------------------------------------------------------
 * Settlements overview — analysis of exactly the rows the page's filters
 * select (status tab, due-today toggle, date range, search). Built from the
 * normalized GET /settlements row (status, netPayable, breakup, flags):
 *   row 1: KPI tiles — paid out, awaiting payout, due today, avg settlement
 *          (week-over-week trend only when no date range is set)
 *   row 2: net payable per day (follows the date range) · status donut ·
 *          needs attention
 *   row 3: where the money goes (breakup) · top brands
 * Shared look with Transactions / Refunds (FinanceOverviewParts).
 * ---------------------------------------------------------------------- */

const STATUS = {
  "Settlement done": { label: "Settled", color: FIN_STATUS.good, icon: CheckCircle2 },
  "Pending Approval": { label: "Pending approval", color: FIN_STATUS.warning, icon: Clock3 },
  Approved: { label: "Approved", color: FIN_STATUS.info, icon: ShieldCheck },
  Processing: { label: "Processing", color: FIN_STATUS.violet, icon: Loader2 },
  "On hold": { label: "On hold", color: FIN_STATUS.serious, icon: PauseCircle },
  Failed: { label: "Failed", color: FIN_STATUS.critical, icon: XCircle },
  Reversed: { label: "Reversed", color: FIN_STATUS.neutral, icon: RotateCcw },
};
const OTHER = { label: "Other", color: FIN_STATUS.neutral, icon: Ban };
const AWAITING_PAYOUT = ["Pending Approval", "Approved", "Processing"];

const amountOf = (s) => s.amount;
const dateOf = (s) => s.dateForFilter;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const part = (key, label, color, icon, list) => ({ key, label, color, icon, count: list.length, amount: sumBy(list, amountOf) });

function useOverview(rows, schedules, dateFrom, dateTo) {
  return useMemo(() => {
    const paid = rows.filter((s) => s.status === "Settlement done");
    const awaiting = rows.filter((s) => AWAITING_PAYOUT.includes(s.status));
    const dueToday = rows.filter((s) => schedules[s.id]?.isToday);
    const net = sumBy(rows, amountOf);

    // Status donut — known statuses get their own slice, the rest "Other".
    const byStatus = new Map();
    rows.forEach((s) => {
      const cfg = STATUS[s.status] ? s.status : "Other";
      byStatus.set(cfg, [...(byStatus.get(cfg) || []), s]);
    });
    const statusParts = [...byStatus]
      .map(([key, list]) => {
        const c = STATUS[key] || OTHER;
        return part(key, c.label, c.color, c.icon, list);
      })
      .sort((a, b) => b.count - a.count);

    const attention = [
      part("failed", "Payout failed", FIN_STATUS.critical, XCircle, rows.filter((s) => s.status === "Failed")),
      part("hold", "On hold", FIN_STATUS.serious, PauseCircle, rows.filter((s) => s.status === "On hold")),
      part("revalidate", "Needs revalidation", FIN_STATUS.warning, Wrench, rows.filter((s) => s.needsRevalidation)),
      part("overdue", "Overdue payout", FIN_STATUS.critical, AlarmClock, rows.filter((s) => schedules[s.id]?.isOverdue)),
    ];

    // Where the money goes — sums of the settlement breakup.
    const b = (k) => sumBy(rows, (s) => s.breakup?.[k]);
    const money = [
      { name: "Gross collected", value: b("grossCollected") },
      { name: "Commission + tax", value: b("commissionAmount") + b("commissionTax") + b("commissionDeduction") },
      { name: "Vendor promo cost", value: b("vendorPromoCost") },
      { name: "Refunds & chargebacks", value: b("refundAdjustment") + b("chargebackAdjustment") },
      { name: "Reserve held", value: b("reserveHeld") - b("reserveReleased") },
      { name: "Net payable", value: b("netPayable") || net },
    ]
      .map((m) => ({ ...m, value: Math.abs(m.value) }))
      .filter((m) => m.value > 0);

    const brands = new Map();
    rows.forEach((s) => {
      const name = s.vendor && s.vendor !== "—" ? s.vendor : "No brand";
      const e = brands.get(name) || { name, value: 0, n: 0 };
      e.value += s.amount;
      e.n += 1;
      brands.set(name, e);
    });

    return {
      total: rows.length,
      paidCount: paid.length,
      paidOut: sumBy(paid, amountOf),
      awaitingCount: awaiting.length,
      awaitingAmount: sumBy(awaiting, amountOf),
      dueCount: dueToday.length,
      dueAmount: sumBy(dueToday, amountOf),
      avg: rows.length ? net / rows.length : 0,
      settledRate: rows.length ? (paid.length / rows.length) * 100 : 0,
      trends: weekTrends(
        rows,
        (l) => ({
          count: l.length,
          paidOut: sumBy(
            l.filter((s) => s.status === "Settlement done"),
            amountOf
          ),
          avg: l.length ? sumBy(l, amountOf) / l.length : 0,
        }),
        { getDate: dateOf, dateFrom, dateTo }
      ),
      series: dailySeries(rows, { getDate: dateOf, getValue: amountOf, dateFrom, dateTo }),
      statusParts,
      attention,
      attentionTotal: attention.reduce((s, p) => s + p.count, 0),
      money,
      topBrands: [...brands.values()]
        .sort((a, b2) => b2.value - a.value)
        .slice(0, 5)
        .map((e) => ({ ...e, sub: plural(e.n, "settlement") })),
    };
  }, [rows, schedules, dateFrom, dateTo]);
}

export default function SettlementsOverview({ rows, schedules, delayDays, dateFrom, dateTo, loading }) {
  const { isDark } = useTheme();
  const data = useOverview(rows, schedules, dateFrom, dateTo);
  const t = data.trends;
  const ranged = Boolean(dateFrom || dateTo);
  const days = data.series.daily.length;

  return (
    <OverviewShell
      icon={Landmark}
      title="Settlements overview"
      subtitle={`${plural(data.total, "settlement")} · ${rangeLabel(dateFrom, dateTo)}`}
      loading={loading}
    >
      <KpiTile highlight icon={Wallet} label="Paid out" value={fullInr(data.paidOut)} trend={t?.paidOut} note={plural(data.paidCount, "settlement") + " settled"} />
      <KpiTile
        icon={Landmark}
        tint="sky"
        label="Awaiting payout"
        value={fullInr(data.awaitingAmount)}
        note={`${plural(data.awaitingCount, "settlement")} · pending, approved, processing`}
      />
      <KpiTile icon={CalendarClock} tint="violet" label="Due today" value={fullInr(data.dueAmount)} note={`${data.dueCount} due today · T+${delayDays} cycle`} />
      <KpiTile icon={Receipt} tint="amber" label="Avg. settlement" value={fullInr(data.avg)} trend={t?.avg} note={t ? "Trends: last 7 days vs the 7 before" : "Within the selected filters"} />

      <DailyBarsCard
        icon={BarChart3}
        title="Net payable per day"
        subtitle={ranged ? `Selected range · ${days} days · by period end` : `Last ${days} days · by period end`}
        series={data.series}
        isDark={isDark}
        countLabel="settlements"
        emptyText="No settlements in this period."
      />
      <DonutCard
        icon={ShieldCheck}
        title="Status"
        subtitle={plural(data.total, "settlement")}
        parts={data.statusParts}
        total={data.total}
        centerNote={`${data.settledRate.toFixed(0)}% settled`}
        isDark={isDark}
        emptyText="No settlements match these filters."
      />
      <StateRowsCard
        icon={AlertTriangle}
        title="Needs attention"
        subtitle="Failed, held, flagged or overdue"
        parts={data.attention}
        total={data.attentionTotal}
        emptyText="Nothing needs attention."
      />

      <RankListCard icon={Coins} title="Where the money goes" subtitle="Gross collected → net payable" items={data.money} isDark={isDark} money emptyText="No settlement amounts yet." />
      <RankListCard icon={Store} title="Top brands" subtitle="By net payable" items={data.topBrands} isDark={isDark} money emptyText="No settlements match these filters." />
    </OverviewShell>
  );
}