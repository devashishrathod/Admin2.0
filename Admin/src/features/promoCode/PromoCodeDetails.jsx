import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Tag,
  Loader2,
  Receipt,
  Store,
  Hash,
  Layers,
  CheckCircle2,
  Clock,
  RotateCcw,
  Gift,
} from "lucide-react";
import Table from "../../components/common/Table";
import { getPromoCodeById, DISCOUNT_TYPES } from "./services/PromoCodeApi";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getPromoCodeById(id);
      setData(res?.data ?? null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

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
            <p className="font-medium text-neutral-800 dark:text-neutral-200">{row.brandId?.brandName || "—"}</p>
            <p className="text-[11px] text-neutral-500">{row.brandId?.merchantId || "—"}</p>
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
          {row.transactionId || "—"}
        </span>
      ),
    },
    {
      key: "consumedAt",
      label: "Consumed At",
      render: (row) => <span className="text-neutral-500 dark:text-neutral-400">{formatDateTime(row.consumedAt)}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
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
            <div className="flex flex-1 items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
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
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading promo code details…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load promo code details: {loadError}
          </div>
        )}

        {!loading && !loadError && promo && (
          <>
            {/* Usage summary */}
            <div className="mb-5 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
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
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-3 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
                <Receipt size={13} />
                Recent Usages ({recentUsages.length})
              </p>
              <Table
                columns={usageColumns}
                data={recentUsages}
                rowKey="_id"
                emptyMessage="No redemptions yet."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
