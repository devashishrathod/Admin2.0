import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Tag, Loader2, Receipt, Store, Hash } from "lucide-react";
import Table from "../../components/common/Table";
import { getPromoCodeById, DISCOUNT_TYPES } from "./services/PromoCodeApi";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3">
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-[16px] font-semibold text-neutral-50">{value}</p>
    </div>
  );
}

const USAGE_STATUS_STYLES = {
  CONSUMED: "bg-emerald-400/10 text-emerald-400",
  RESERVED: "bg-amber-400/10 text-amber-400",
  RELEASED: "bg-neutral-700/40 text-neutral-400",
};

function UsageStatusBadge({ status }) {
  const style = USAGE_STATUS_STYLES[status] || "bg-neutral-700/40 text-neutral-400";
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
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">
            <Store size={13} />
          </span>
          <div>
            <p className="font-medium text-neutral-200">{row.brandId?.brandName || "—"}</p>
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
      render: (row) => <span className="font-semibold text-neutral-200">₹{row.discountAmount ?? 0}</span>,
    },
    {
      key: "transactionId",
      label: "Transaction",
      render: (row) => (
        <span className="flex items-center gap-1 font-mono text-[11.5px] text-neutral-400">
          <Hash size={10} />
          {row.transactionId || "—"}
        </span>
      ),
    },
    {
      key: "consumedAt",
      label: "Consumed At",
      render: (row) => <span className="text-neutral-400">{formatDateTime(row.consumedAt)}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back to promo codes"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <ArrowLeft size={16} />
          </button>
          {promo && (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-[16px] font-semibold tracking-wide text-neutral-50">
                <Tag size={14} className="text-emerald-400" />
                {promo.code}
              </span>
              <span className="text-[15px] font-semibold text-emerald-400">
                {promo.discountType === DISCOUNT_TYPES.PERCENT ? `${promo.discountPercent}%` : `₹${promo.discountAmount}`}
              </span>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading promo code details…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load promo code details: {loadError}
          </div>
        )}

        {!loading && !loadError && promo && (
          <>
            {/* Usage summary */}
            <div className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-neutral-500">
                Usage Summary
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Total Limit" value={promo.totalUsageLimit ?? 0} />
                <StatCard label="Used" value={promo.usedCount ?? 0} />
                <StatCard label="Consumed" value={usage.consumed ?? 0} />
                <StatCard label="Reserved" value={usage.reserved ?? 0} />
                <StatCard label="Released" value={usage.released ?? 0} />
                <StatCard label="Remaining" value={usage.remaining ?? 0} />
              </div>
            </div>

            {/* Recent usages */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
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
