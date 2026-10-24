import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Wallet,
  Clock,
  ChevronDown,
  Landmark,
  CalendarDays,
  FileText,
  ArrowUpRight,
  TrendingDown,
  Receipt,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { EmptyState } from "../../BrandShared";
import { useSettlements } from "../../../settlement/queries/settlementQueries";
import { retryUnlessNotFound } from "../../queries/brandQueries";
import { mapSettlementStatus, SETTLEMENT_TONES } from "../../../settlement/settlementUtils";
import StatusStepButton from "../../../../components/common/StatusStepButton";
import { isNotFoundMessage, MISSING } from "../../../../utils/helpers";
import ValueOr from "../../../../components/common/ValueOr";
import Loader from "../../../../components/common/Loader";
import { inrAmount, shortDate } from "../detailsUtils";
import { CardHeader, CopyButton } from "../components/Bento";
import { glassClass, cardClass, heroClass, innerTile, tints, has } from "../components/bentoStyles";

/* -------------------------------------------------------------------------
 * Settlements tab — this brand's payouts (GET /settlements?brandId=…),
 * bento style:
 *   row 1: Paid-out hero (5) · Money flow across all settlements (7)
 *   row 2: filter tabs + expandable settlement cards (breakup, bank,
 *          failure note, document)
 * Rows are also filtered by brandId here, since it isn't confirmed the
 * backend applies that filter. Breakup fields are flat on the record
 * (same as the main Settlement page's normalizeBreakup).
 * ---------------------------------------------------------------------- */

const PENDING = ["Pending Approval", "Approved", "Processing", "On hold"];
const ATTENTION = ["Failed", "On hold", "Reversed"];

const num = (r, key) => Number(r.breakup?.[key] ?? r[key]) || 0;

function toRow(r) {
  return {
    id: r._id,
    number: r.settlementNumber || r._id,
    period: r.periodStart && r.periodEnd ? `${shortDate(r.periodStart)} – ${shortDate(r.periodEnd)}` : shortDate(r.createdAt),
    paidAt: r.paidAt,
    createdAt: r.createdAt,
    cycleType: r.cycleType,
    payoutProvider: r.payoutProvider,
    transactionCount: Number(r.transactionCount) || 0,
    amount: Number(r.netPayable) || 0,
    status: mapSettlementStatus(r.status),
    needsRevalidation: Boolean(r.needsRevalidation),
    failureNote: r.failureNote || "",
    documentUrl: r.documentUrl || null,
    bank: r.bankSnapshot || null,
    breakup: {
      grossCollected: num(r, "grossCollected"),
      vendorPromoCost: num(r, "vendorPromoCost"),
      commissionAmount: num(r, "commissionAmount"),
      commissionTax: num(r, "commissionTax"),
      commissionDeduction: num(r, "commissionDeduction"),
      refundAdjustment: num(r, "refundAdjustment"),
      chargebackAdjustment: num(r, "chargebackAdjustment"),
      reserveHeld: num(r, "reserveHeld"),
      reserveReleased: num(r, "reserveReleased"),
      netPayable: Number(r.netPayable) || 0,
    },
  };
}

// Breakup lines, in money-flow order. `sign` is how the line moves the total.
const FLOW = [
  ["grossCollected", "Gross collected", "+", "emerald"],
  ["vendorPromoCost", "Vendor promo cost", "−", "amber"],
  ["commissionAmount", "Platform commission", "−", "violet"],
  ["commissionTax", "Tax on commission", "−", "violet"],
  ["commissionDeduction", "Commission deduction", "−", "violet"],
  ["refundAdjustment", "Refund adjustment", "−", "red"],
  ["chargebackAdjustment", "Chargeback adjustment", "−", "red"],
  ["reserveHeld", "Reserve held", "−", "sky"],
  ["reserveReleased", "Reserve released", "+", "sky"],
];

const BAR = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  red: "bg-red-500",
  sky: "bg-sky-500",
};

/* ---- Row 1 ------------------------------------------------------------ */

function PaidOutHero({ rows, paid, pendingAmount }) {
  const paidAmount = paid.reduce((s, r) => s + r.amount, 0);
  const total = paidAmount + pendingAmount || 1;
  const lastPaid = paid.map((r) => r.paidAt).filter(Boolean).sort().pop();
  return (
    <div className={heroClass}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />
      <div className="relative flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
          <Wallet size={15} />
        </span>
        <p className="text-[12px] font-medium text-neutral-900/60 dark:text-neutral-300">Paid out to this brand</p>
      </div>
      <p className="relative mt-4 text-[32px] font-bold leading-none tracking-tight tabular-nums text-neutral-950 dark:text-neutral-50">
        {inrAmount(paidAmount)}
      </p>
      <p className="relative mt-1.5 text-[12px] text-neutral-900/60 dark:text-neutral-400">
        {paid.length} of {rows.length} settlement{rows.length === 1 ? "" : "s"} paid
        {lastPaid ? ` · last on ${shortDate(lastPaid)}` : ""}
      </p>

      {/* Paid vs pending */}
      <div className="relative mt-auto pt-6">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-white/60 dark:bg-white/10">
          <div className="h-full bg-emerald-500" style={{ width: `${(paidAmount / total) * 100}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${(pendingAmount / total) * 100}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px]">
          <span className="flex items-center gap-1.5 text-neutral-900/70 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid {inrAmount(paidAmount)}
          </span>
          <span className="flex items-center gap-1.5 text-neutral-900/70 dark:text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending {inrAmount(pendingAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Breakup lines with bars scaled to gross collected.
function FlowLines({ breakup, compact = false }) {
  const base = breakup.grossCollected || Math.max(...FLOW.map(([k]) => breakup[k] || 0), 1);
  const lines = FLOW.filter(([k]) => k === "grossCollected" || breakup[k]);
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {lines.map(([key, label, sign, tone]) => (
        <div key={key}>
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
            <span className={`font-semibold tabular-nums ${sign === "−" ? "text-neutral-700 dark:text-neutral-200" : "text-emerald-600 dark:text-emerald-400"}`}>
              {sign === "−" ? "− " : ""}
              {inrAmount(breakup[key])}
            </span>
          </div>
          {!compact && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
              <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.min(100, (breakup[key] / base) * 100)}%` }} />
            </div>
          )}
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-neutral-200/70 pt-2.5 dark:border-white/10">
        <span className="text-[12.5px] font-bold text-neutral-900 dark:text-neutral-50">Net payable</span>
        <span className="text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{inrAmount(breakup.netPayable)}</span>
      </div>
    </div>
  );
}

function MoneyFlowCard({ rows }) {
  const totals = rows.reduce((acc, r) => {
    for (const k of Object.keys(r.breakup)) acc[k] = (acc[k] || 0) + r.breakup[k];
    return acc;
  }, {});
  const deductions = totals.grossCollected - totals.netPayable;
  return (
    <div className={cardClass}>
      <CardHeader
        icon={TrendingDown}
        tint="violet"
        title="Money flow"
        subtitle={`All ${rows.length} settlement${rows.length === 1 ? "" : "s"} · ${inrAmount(Math.max(0, deductions))} deducted`}
      />
      <FlowLines breakup={totals} />
    </div>
  );
}

/* ---- Settlement card -------------------------------------------------- */

function SettlementCard({ row, expanded, onToggle }) {
  const attention = ATTENTION.includes(row.status) || row.needsRevalidation;
  return (
    <div className={`${glassClass} overflow-hidden ${expanded ? "!bg-white/80 dark:!bg-neutral-900/80" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${attention ? tints.red : row.status === "Settlement done" ? tints.emerald : tints.amber}`}>
          {attention ? <AlertTriangle size={16} /> : row.status === "Settlement done" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12.5px] font-semibold normal-case text-neutral-900 dark:text-neutral-50">{row.number}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-neutral-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} /> <ValueOr value={row.period} fallback={MISSING.date} />
            </span>
            <span>· {row.transactionCount} txn{row.transactionCount === 1 ? "" : "s"}</span>
            {row.paidAt && <span>· paid {shortDate(row.paidAt)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[15px] font-bold tabular-nums text-neutral-900 dark:text-neutral-50">{inrAmount(row.amount)}</span>
          <StatusStepButton label={row.status} tone={SETTLEMENT_TONES[row.status]} />
        </div>
        <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="grid gap-3 border-t border-neutral-200/60 p-4 lg:grid-cols-5 dark:border-white/5">
          {/* Breakup */}
          <div className={`${innerTile} p-3.5 lg:col-span-3`}>
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <Receipt size={12} /> Amount breakup
            </p>
            <FlowLines breakup={row.breakup} compact />
          </div>

          {/* Facts */}
          <div className="space-y-2 lg:col-span-2">
            {row.failureNote && (
              <p className="flex items-start gap-2 rounded-2xl bg-red-500/[0.06] px-3 py-2.5 text-[12px] normal-case text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {row.failureNote}
              </p>
            )}
            {row.bank && (
              <div className={`${innerTile} flex items-center gap-3 p-3`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tints.violet}`}>
                  <Landmark size={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100"><ValueOr value={row.bank.bankName} fallback="Bank not added" /></p>
                  <p className="truncate font-mono text-[11px] normal-case text-neutral-500">
                    <ValueOr value={row.bank.maskedAccountNumber} fallback="A/c not added" /> ·{" "}
                    <ValueOr value={row.bank.ifscCode} fallback="IFSC not added" />
                  </p>
                  {has(row.bank.accountHolderName) && <p className="truncate text-[11px] text-neutral-500">{row.bank.accountHolderName}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Cycle", row.cycleType, MISSING.method],
                ["Provider", row.payoutProvider, MISSING.method],
                ["Created", shortDate(row.createdAt), MISSING.date],
                ["Paid on", row.paidAt ? shortDate(row.paidAt) : null, "Not paid yet"],
              ].map(([label, value, empty]) => (
                <div key={label} className={`${innerTile} px-3 py-2`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                  <p className="truncate text-[12.5px] font-semibold capitalize text-neutral-800 dark:text-neutral-100">
                    {has(value) ? String(value).toLowerCase().replace(/_/g, " ") : <ValueOr value={null} fallback={empty} />}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${innerTile} inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[11px] normal-case text-neutral-500`}>
                <Hash size={11} /> {row.id}
                <CopyButton value={row.id} label="settlement id" />
              </span>
              {row.documentUrl && (
                <a
                  href={row.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-3 py-1.5 text-[11.5px] font-semibold text-sky-600 transition-colors hover:bg-sky-400/20 dark:text-sky-400"
                >
                  <FileText size={12} /> Statement <ArrowUpRight size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Tab -------------------------------------------------------------- */

const FILTERS = [
  ["all", "All"],
  ["paid", "Paid"],
  ["pending", "Pending"],
  ["attention", "Needs attention"],
];

const inFilter = (r, f) =>
  f === "paid"
    ? r.status === "Settlement done"
    : f === "pending"
    ? PENDING.includes(r.status)
    : f === "attention"
    ? ATTENTION.includes(r.status) || r.needsRevalidation
    : true;

export default function SettlementsTab({ brand }) {
  const settlementsQuery = useSettlements(
    { brandId: brand.id, page: 1, limit: 100 },
    { enabled: Boolean(brand.id), retry: retryUnlessNotFound }
  );
  const rows = useMemo(() => {
    const res = settlementsQuery.data;
    const list = res?.data?.data ?? res?.data ?? [];
    return (Array.isArray(list) ? list : [])
      .filter((r) => String(r.brandId?._id ?? r.brandId) === String(brand.id))
      .map(toRow);
  }, [settlementsQuery.data, brand.id]);

  const [filter, setFilter] = useState("all");
  const [openIds, setOpenIds] = useState(() => new Set());

  const loading = settlementsQuery.isPending;
  // "Not found" just means no settlements yet — shown as the empty state.
  const loadError = settlementsQuery.error?.message ?? "";
  const error = isNotFoundMessage(loadError) ? "" : loadError;

  if (loading) return <Loader label="Loading settlements…" />;
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
        <AlertTriangle size={14} className="shrink-0" /> Failed to load settlements: {error}
      </div>
    );
  }
  if (!rows.length) return <EmptyState label="No settlements for this brand yet." />;

  const sum = (list) => list.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => inFilter(r, "paid"));
  const pending = rows.filter((r) => inFilter(r, "pending"));
  const attention = rows.filter((r) => inFilter(r, "attention"));
  const shown = rows.filter((r) => inFilter(r, filter));
  const counts = { all: rows.length, paid: paid.length, pending: pending.length, attention: attention.length };

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Hero + money flow */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PaidOutHero rows={rows} paid={paid} pendingAmount={sum(pending)} />
        </div>
        <div className="lg:col-span-7">
          <MoneyFlowCard rows={rows} />
        </div>
      </div>

      {/* Row 3 — list */}
      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className={`${glassClass} no-scrollbar flex w-fit max-w-full items-center gap-1 overflow-x-auto !rounded-full p-1`}>
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  filter === key ? "bg-emerald-400 text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {label} <span className="opacity-60">{counts[key]}</span>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] text-neutral-500">Tap a settlement for its breakup and bank details</p>
        </div>

        {shown.length === 0 ? (
          <div className={`${glassClass} py-12 text-center text-[12.5px] text-neutral-500`}>No settlements in this filter.</div>
        ) : (
          <div className="space-y-3">
            {shown.map((r) => (
              <SettlementCard key={r.id} row={r} expanded={openIds.has(r.id)} onToggle={() => toggle(r.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
