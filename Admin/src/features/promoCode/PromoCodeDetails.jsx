import React from "react";
import {
  ArrowLeft,
  Tag,
  Receipt,
  Store,
  Hash,
  Layers,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gift,
  RefreshCw,
} from "lucide-react";
import Table from "../../components/common/Table";
import { usePromoCode } from "./queries/promoCodeQueries";
import { PROMO_DISCOUNT_TYPES as DISCOUNT_TYPES } from "./promoCodeEnums";
import Loader from "../../components/common/Loader";
import ValueOr from "../../components/common/ValueOr";
import EmptyState from "../../components/common/EmptyState";
import NotFoundPage from "../../components/common/NotFoundPage";
import { MISSING, isNotFoundMessage } from "../../utils/helpers";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tint}`}>
          <Icon size={13} />
        </span>
        <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
      <p className="mt-2 text-[18px] font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
    </div>
  );
}

const USAGE_STATUS_STYLES = {
  CONSUMED: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  RESERVED: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  RELEASED: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400",
};

function UsageStatusBadge({ status }) {
  const style = USAGE_STATUS_STYLES[status] || "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>{status}</span>;
}

/* -------------------------------------------------------------------------
 * Promo code details — fetched fresh from GET /promoCodes/get/:id, which
 * returns richer usage info (including "released") and recent redemptions
 * that the list endpoint doesn't provide.
 * ---------------------------------------------------------------------- */

export default function PromoCodeDetails({ id, onBack }) {
  const { data: res, isPending: loading, error, refetch } = usePromoCode(id);
  const data = res?.data ?? null;
  const loadError = error?.message ?? "";
  // A "not found" reply (or a reply with no code in it) = this code doesn't
  // exist — the common "not found" page, not a raw error.
  const notFound = !loading && (isNotFoundMessage(loadError) || (!loadError && !data?.promoCode));

  const promo = data?.promoCode;
  const usage = data?.usage || {};
  const recentUsages = data?.recentUsages || [];

  const usageColumns = [
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <Store size={13} />
          </span>
          <div>
            <p className="font-medium text-neutral-800 dark:text-neutral-200"><ValueOr value={row.brandId?.brandName} fallback="No brand" /></p>
            <p className="text-[11px] text-neutral-500"><ValueOr value={row.brandId?.merchantId} fallback={MISSING.id} /></p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <UsageStatusBadge status={row.status} />,
    },
    {
      key: "discountAmount",
      label: "Discount Amount",
      align: "right",
      render: (row) => <span className="font-semibold text-neutral-800 dark:text-neutral-200">₹{row.discountAmount ?? 0}</span>,
    },
    {
      key: "transactionId",
      label: "Transaction",
      render: (row) => (
        <span className="flex items-center gap-1 font-mono text-[11.5px] text-neutral-500 dark:text-neutral-400">
          <Hash size={10} />
          <ValueOr value={row.transactionId} fallback="No transaction" />
        </span>
      ),
    },
    {
      key: "consumedAt",
      label: "Consumed At",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400"><ValueOr value={formatDateTime(row.consumedAt)} fallback="Not consumed" /></span>,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to promo codes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <ArrowLeft size={16} />
          </button>
          {promo && (
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
                <Tag size={18} />
              </span>
              <div>
                <p className="font-mono text-[17px] font-bold tracking-wide text-neutral-900 dark:text-neutral-50">{promo.code}</p>
                <p className="mt-0.5 text-[12.5px] text-neutral-500">
                  {promo.discountType === DISCOUNT_TYPES.PERCENT
                    ? `${promo.discountPercent}% off${promo.usedCount ? ` · used ${promo.usedCount} time${promo.usedCount === 1 ? "" : "s"}` : ""}`
                    : `₹${promo.discountAmount} off${promo.usedCount ? ` · used ${promo.usedCount} time${promo.usedCount === 1 ? "" : "s"}` : ""}`}
                </p>
              </div>
              <span className="ml-auto text-[19px] font-bold text-emerald-600 dark:text-emerald-400">
                {promo.discountType === DISCOUNT_TYPES.PERCENT ? `${promo.discountPercent}%` : `₹${promo.discountAmount}`}
              </span>
            </div>
          )}
        </div>

        {loading && (
          <Loader label="Loading promo code details…" />
        )}

        {notFound && (
          <NotFoundPage title="Promo code not found" icon="promo" backLabel="Back to Promo Codes" onBack={onBack} />
        )}

        {!loading && loadError && !notFound && (
          <EmptyState
            tone="error"
            icon="error"
            title="Couldn't load this promo code"
            description={loadError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
            secondaryAction={{ label: "Back to Promo Codes", onClick: onBack }}
          />
        )}

        {!loading && !loadError && promo && (
          <>
            {/* Usage summary */}
            <div className="mb-5 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
                  Usage Summary
                </p>
                {promo.totalUsageLimit > 0 && (
                  <span className="text-[11.5px] text-neutral-500">
                    {Math.round(((promo.usedCount ?? 0) / promo.totalUsageLimit) * 100)}% of limit used
                  </span>
                )}
              </div>

              {promo.totalUsageLimit > 0 && (
                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(100, ((promo.usedCount ?? 0) / promo.totalUsageLimit) * 100)}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard icon={Layers} label="Total Limit" value={promo.totalUsageLimit ?? 0} tint="bg-sky-400/10 text-sky-600 dark:text-sky-400" />
                <StatCard icon={Tag} label="Used" value={promo.usedCount ?? 0} tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" />
                <StatCard icon={CheckCircle2} label="Consumed" value={usage.consumed ?? 0} tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" />
                <StatCard icon={Clock} label="Reserved" value={usage.reserved ?? 0} tint="bg-amber-400/10 text-amber-600 dark:text-amber-400" />
                <StatCard icon={RotateCcw} label="Released" value={usage.released ?? 0} tint="bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400" />
                <StatCard icon={Gift} label="Remaining" value={usage.remaining ?? 0} tint="bg-fuchsia-400/10 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
            </div>

            {/* Recent usages */}
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
                <Receipt size={13} />
                Recent Usages ({recentUsages.length})
              </p>
              <Table
                columns={usageColumns}
                data={recentUsages}
                rowKey="_id"
                emptyTitle="No redemptions yet" emptyDescription="Redemptions appear here as soon as someone uses this code." emptyIcon="promo"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
