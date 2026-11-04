import { useMemo } from "react";
import {
  Wallet,
  ArrowLeftRight,
  Receipt,
  CheckCircle2,
  Clock3,
  XCircle,
  Undo2,
  BarChart3,
  ShieldCheck,
  CreditCard,
  Store,
  Landmark,
  Hourglass,
  PauseCircle,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { FIN_STATUS, fullInr, rangeLabel, dailySeries, weekTrends, sumBy } from "../../utils/financeOverview";
import { OverviewShell, KpiTile,DailyBarsCard, DonutCard, StateRowsCard, RankListCard } from "../../components/common/FinanceOverviewParts";

/* -------------------------------------------------------------------------
 * Transactions overview — analysis of exactly the rows the page's filters
 * select (tab, payment method, date range, search). Built from the
 * GET /voucher-claims/payments row (status, amount, paymentMethod, brand,
 * settlement fields):
 *   row 1: KPI tiles — revenue, transactions, avg order value, success rate
 *          (week-over-week trend only when no date range is set)
 *   row 2: revenue per day (follows the date range) · status donut ·
 *          vendor payout (paid / awaiting / on hold)
 *   row 3: payment methods · top brands by revenue
 * Shared look with the Refunds / Settlements overviews (FinanceOverviewParts).
 * ---------------------------------------------------------------------- */

const STATUS = [
  { key: "Success", color: FIN_STATUS.good, icon: CheckCircle2 },
  { key: "Pending", color: FIN_STATUS.warning, icon: Clock3 },
  { key: "Failed", color: FIN_STATUS.critical, icon: XCircle },
  { key: "Refunded", color: FIN_STATUS.neutral, icon: Undo2 },
];
const PAYOUT = [
  { key: "paid", label: "Paid to vendor", color: FIN_STATUS.good, icon: Landmark },
  { key: "awaiting", label: "Awaiting settlement", color: FIN_STATUS.info, icon: Hourglass },
  { key: "held", label: "On hold", color: FIN_STATUS.serious, icon: PauseCircle },
];
const amountOf = (r) => r.amount;

function useOverview(rows, dateFrom, dateTo) {
  return useMemo(() => {
    const success = rows.filter((r) => r.status === "Success");
    const revenue = sumBy(success, amountOf);
    const byStatus = STATUS.map((s) => {
      const list = rows.filter((r) => r.status === s.key);
      return { ...s, label: s.key, count: list.length, amount: sumBy(list, amountOf) };
    });
    const trends = weekTrends(
      rows,
      (list) => {
        const ok = list.filter((r) => r.status === "Success");
        const rev = sumBy(ok, amountOf);
        return { count: list.length, revenue: rev, aov: ok.length ? rev / ok.length : 0, rate: list.length ? (ok.length / list.length) * 100 : 0 };
      },
      { dateFrom, dateTo, points: ["rate"] }
    );
    const methods = new Map();
    rows.forEach((r) => {
      const name = r.method && r.method !== "—" ? r.method : "Not recorded";
      methods.set(name, (methods.get(name) || 0) + 1);
    });
    const brands = new Map();
    success.forEach((r) => {
      const name = r.vendor && r.vendor !== "—" ? r.vendor : "No brand";
      const b = brands.get(name) || { name, logo: r.brandLogo, value: 0, n: 0 };
      b.value += r.amount;
      b.n += 1;
      brands.set(name, b);
    });
    return {
      total: rows.length,
      successCount: success.length,
      revenue,
      aov: success.length ? revenue / success.length : 0,
      successRate: rows.length ? (success.length / rows.length) * 100 : 0,
      byStatus,
      trends,
      series: dailySeries(success, { getDate: (r) => r.date, getValue: amountOf, dateFrom, dateTo }),
      payout: PAYOUT.map((p) => {
        const list = success.filter((r) => r.payoutState === p.key);
        return { ...p, count: list.length, amount: sumBy(list, amountOf) };
      }),
      methods: [...methods].map(([name, value]) => ({ name, value, sub: `${Math.round((value / (rows.length || 1)) * 100)}%` })).sort((a, b) => b.value - a.value).slice(0, 5),
      topBrands: [...brands.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((b) => ({ ...b, sub: `${b.n} payment${b.n === 1 ? "" : "s"}` })),
    };
  }, [rows, dateFrom, dateTo]);
}

export default function TransactionsOverview({ rows, dateFrom, dateTo, loading }) {
  const { isDark } = useTheme();
  const data = useOverview(rows, dateFrom, dateTo);
  const t = data.trends;
  const count = (k) => data.byStatus.find((s) => s.key === k)?.count || 0;
  const ranged = Boolean(dateFrom || dateTo);

  return (
    <OverviewShell
      icon={ArrowLeftRight}
      title="Transactions overview"
      subtitle={`${data.total.toLocaleString("en-IN")} transaction${data.total === 1 ? "" : "s"} · ${rangeLabel(dateFrom, dateTo)}`}
      loading={loading}
    >
      <KpiTile
        highlight
        icon={Wallet}
        tint="emerald"
        label="Revenue collected"
        value={fullInr(data.revenue)}
        trend={t?.revenue}
        note={`${data.successCount} successful payment${data.successCount === 1 ? "" : "s"}`}
      />
      <KpiTile
        icon={ArrowLeftRight}
        tint="sky"
        label="Transactions"
        value={data.total.toLocaleString("en-IN")}
        trend={t?.count}
        note={`${count("Success")} success · ${count("Failed")} failed · ${count("Pending")} pending`}
      />
      <KpiTile icon={Receipt} tint="violet" label="Avg. order value" value={fullInr(data.aov)} trend={t?.aov} note="Per successful payment" />
      <KpiTile
        icon={CheckCircle2}
        tint="amber"
        label="Success rate"
        value={`${data.successRate.toFixed(1)}%`}
        trend={t?.rate}
        trendSuffix=" pts"
        note={t ? "Trends: last 7 days vs the 7 before" : "Within the selected filters"}
      />

      <DailyBarsCard
        icon={BarChart3}
        title="Revenue per day"
        subtitle={ranged ? `Selected range · ${data.series.daily.length} days` : `Last ${data.series.daily.length} days · successful payments`}
        series={data.series}
        isDark={isDark}
        countLabel="payments"
        emptyText="No successful payments in this period."
      />
      <DonutCard
        icon={ShieldCheck}
        title="Status"
        subtitle={`${data.total} transaction${data.total === 1 ? "" : "s"}`}
        parts={data.byStatus}
        total={data.total}
        centerNote={`${data.successRate.toFixed(0)}% success`}
        isDark={isDark}
        emptyText="No transactions match these filters."
      />
      <StateRowsCard
        icon={Landmark}
        title="Vendor payout"
        subtitle="Successful payments by settlement state"
        parts={data.payout}
        total={data.successCount}
        emptyText="No successful payments to settle."
      />
      <RankListCard icon={CreditCard} title="Payment methods" subtitle="By number of transactions" items={data.methods} isDark={isDark} emptyText="No transactions match these filters." />
      <RankListCard
        icon={Store}
        title="Top brands"
        subtitle="By successful revenue"
        items={data.topBrands}
        isDark={isDark}
        money
        showLogo
        emptyText="No successful payments yet."
      />
    </OverviewShell>
  );
}
