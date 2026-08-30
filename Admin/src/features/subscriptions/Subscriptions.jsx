import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  CreditCard,
  Gift,
  X,
  Eye,
  Receipt,
  UserCog,
  ExternalLink,
} from "lucide-react";
import Table from "../../components/common/Table";
import { getAllSubscriptions } from "./services/SubscriptionsApi";

const STATUS_OPTIONS = ["All", "ACTIVE", "PENDING", "EXPIRED", "UPGRADED"];
const SOURCE_OPTIONS = ["All", "PAYMENT", "ADMIN_PAYMENT", "ADMIN_MANUAL"];

const STATUS_TONES = {
  ACTIVE: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  PENDING: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  EXPIRED: "bg-red-500/10 text-red-600 dark:text-red-400",
  UPGRADED: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
};

function StatusPill({ status, isLapsed }) {
  const tone = STATUS_TONES[status] || "bg-neutral-200 dark:bg-neutral-700/40 text-neutral-500 dark:text-neutral-400";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {status}
      </span>
      {isLapsed && (
        <span className="text-[10.5px] font-medium text-red-600 dark:text-red-400">Lapsed</span>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  if (amount == null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SectionLabel({ children }) {
  return <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{children}</p>;
}

/* label-left / value-right row — only renders when `value` is present, so
 * each section naturally adapts to whichever fields a given record has
 * (a PAYMENT-sourced record carries pricing + transactionId, an
 * ADMIN_MANUAL grant carries adminNote + grantedByAdminId instead). */
function InfoRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800 dark:text-neutral-200">{value}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Full-detail slide-over for one subscription record. Renders straight from
 * the row already loaded by the list fetch — there's no confirmed
 * "get subscription by id" endpoint, and the list already carries every
 * field, so a second round-trip isn't needed.
 * ---------------------------------------------------------------------- */
function SubscriptionDetailPanel({ row, onClose, onOpenBrand }) {
  const p = row.pricing;
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Subscription Record</p>
            <h2 className="mt-1 text-[17px] font-semibold text-neutral-900 dark:text-neutral-50">{row.brand?.brandName || "—"}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-neutral-400 dark:text-neutral-600">{row._id}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <StatusPill status={row.status} isLapsed={row.isLapsed} />
          {row.isFreeGrant && (
            <span className="flex items-center gap-1 rounded-full bg-violet-400/10 px-2.5 py-1 text-[10.5px] font-medium text-violet-600 dark:text-violet-400">
              <Gift size={10} />
              Free grant
            </span>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
            <SectionLabel>Brand</SectionLabel>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
              <InfoRow label="Brand Name" value={row.brand?.brandName} />
              <InfoRow label="Merchant ID" value={row.brand?.merchantId} />
              <InfoRow label="Brand ID" value={row.brand?._id} />
              <InfoRow label="Sub-Brands Used" value={row.brand?.subBrandsUsed != null ? `${row.brand.subBrandsUsed} / ${row.brand.subBrandsLimit || "∞"}` : null} />
              <InfoRow label="Franchises Used" value={row.brand?.franchisesUsed != null ? `${row.brand.franchisesUsed} / ${row.brand.franchisesLimit || "∞"}` : null} />
            </div>
            <button
              onClick={() => onOpenBrand(row.brand?._id)}
              className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              Open Brand Page
              <ExternalLink size={11} />
            </button>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
            <SectionLabel>Plan</SectionLabel>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
              <InfoRow label="Plan Name" value={row.plan?.name} />
              <InfoRow label="Plan Type" value={row.plan?.type} />
              <InfoRow label="List Price" value={formatCurrency(row.plan?.price)} />
              <InfoRow label="Source" value={row.source} />
              <InfoRow label="Payment Mode" value={row.paymentMode} />
              <InfoRow label="Number of Upgrades" value={row.numberOfUpgrade} />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
            <SectionLabel>Validity</SectionLabel>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
              <InfoRow label="Start Date" value={formatDateTime(row.startDate)} />
              <InfoRow label="End Date" value={formatDateTime(row.endDate)} />
              <InfoRow label="Days Remaining" value={row.isLapsed ? "Expired" : row.daysRemaining} />
              <InfoRow label="Granted / Created On" value={formatDateTime(row.createdAt)} />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
            <SectionLabel>Payment</SectionLabel>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
              <InfoRow label="Plan Price" value={formatCurrency(row.price)} />
              <InfoRow label="Paid Amount" value={formatCurrency(row.paidAmount)} />
              <InfoRow label="Due Amount" value={row.dueAmount ? formatCurrency(row.dueAmount) : null} />
              <InfoRow label="Transaction ID" value={row.transactionId} />
            </div>
          </div>

          {p && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Receipt size={13} className="text-neutral-500" />
                <SectionLabel>Pricing &amp; Tax Breakdown</SectionLabel>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                <InfoRow label="Currency" value={p.currency} />
                <InfoRow label="List Price" value={formatCurrency(p.listPrice)} />
                <InfoRow
                  label="Discount"
                  value={
                    p.discountAmount
                      ? `${p.discountType === "PERCENT" ? `${p.discountPercent}%` : formatCurrency(p.discountAmount)} (${formatCurrency(p.discountAmount)})`
                      : null
                  }
                />
                <InfoRow label="Promo Code" value={p.promoCode} />
                <InfoRow label="Promo Discount" value={p.promoDiscount ? formatCurrency(p.promoDiscount) : null} />
                <InfoRow label="Taxable Value" value={formatCurrency(p.taxableValue)} />
                <InfoRow label="Tax Type" value={p.taxType} />
                <InfoRow label="GST %" value={p.gstPercentage != null ? `${p.gstPercentage}%${p.isGstInclusive ? " (inclusive)" : ""}` : null} />
                <InfoRow label="CGST" value={p.cgst ? formatCurrency(p.cgst) : null} />
                <InfoRow label="SGST" value={p.sgst ? formatCurrency(p.sgst) : null} />
                <InfoRow label="IGST" value={p.igst ? formatCurrency(p.igst) : null} />
                <InfoRow label="GST Amount" value={formatCurrency(p.gstAmount)} />
                <InfoRow label="HSN/SAC Code" value={p.hsnSacCode} />
                <InfoRow label="Place of Supply" value={p.placeOfSupplyState ? `${p.placeOfSupplyState} (${p.placeOfSupplyStateCode})` : null} />
                <InfoRow label="You Saved" value={p.youSaved ? formatCurrency(p.youSaved) : null} />
                <InfoRow label="Total Payable" value={formatCurrency(p.totalPayable)} />
              </div>
            </div>
          )}

          {(row.adminNote || row.grantedByAdminId) && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <UserCog size={13} className="text-neutral-500" />
                <SectionLabel>Admin Grant</SectionLabel>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                <InfoRow label="Granted By (Admin ID)" value={row.grantedByAdminId} />
                <InfoRow label="Note" value={row.adminNote} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Subscriptions() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [selected, setSelected] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getAllSubscriptions({
        page,
        limit,
        search,
        status: status === "All" ? undefined : status,
        source: source === "All" ? undefined : source,
      });
      setRows(res?.data?.data ?? []);
      setTotal(res?.data?.total ?? 0);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, source]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSubscriptions();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on filter / page change
  useEffect(() => {
    fetchSubscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, source, page]);

  const columns = [
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <button onClick={() => setSelected(row)} className="text-left">
          <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400">
            {row.brand?.brandName || "—"}
          </p>
          <p className="text-[11.5px] text-neutral-500">{row.brand?.merchantId || "—"}</p>
        </button>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">{row.plan?.name || "—"}</p>
          <p className="text-[11.5px] text-neutral-500">
            {row.plan?.type === "MONTHLY" ? "Monthly" : "Yearly"} · {formatCurrency(row.plan?.price)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} isLapsed={row.isLapsed} />,
    },
    {
      key: "source",
      label: "Source",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-700 dark:text-neutral-300">
            {row.source || "—"}
          </span>
          {row.isFreeGrant && (
            <span className="flex items-center gap-1 text-[10.5px] font-medium text-violet-600 dark:text-violet-400">
              <Gift size={10} />
              Free grant
            </span>
          )}
        </div>
      ),
    },
    {
      key: "paidAmount",
      label: "Paid",
      align: "right",
      render: (row) => (
        <div>
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(row.paidAmount)}</p>
          {row.dueAmount > 0 && <p className="text-[11px] text-amber-600 dark:text-amber-400">Due {formatCurrency(row.dueAmount)}</p>}
        </div>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => (
        <div>
          <p className="text-[12.5px] text-neutral-700 dark:text-neutral-300">
            {formatDate(row.startDate)} → {formatDate(row.endDate)}
          </p>
          <p className={`text-[11px] ${row.isLapsed ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
            {row.isLapsed ? "Expired" : `${row.daysRemaining ?? "—"} days left`}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Granted On",
      render: (row) => <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "view",
      label: "",
      align: "right",
      render: (row) => (
        <button
          onClick={() => setSelected(row)}
          aria-label="View full details"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Eye size={13} />
        </button>
      ),
    },
  ];

  const tableRows = rows.map((r) => ({ ...r, id: r._id }));

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard size={19} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Subscriptions</h1>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              Every brand's plan, across the whole platform — {total} total.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs sm:flex-1">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand name, merchant ID…"
              className="w-full bg-transparent text-[13.5px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-44"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value);
            }}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-48"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Sources" : s}
              </option>
            ))}
          </select>
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading subscriptions…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load subscriptions: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            <Table
              columns={columns}
              data={tableRows}
              emptyMessage="No subscriptions match these filters."
            />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <SubscriptionDetailPanel
          row={selected}
          onClose={() => setSelected(null)}
          onOpenBrand={(brandId) => {
            setSelected(null);
            navigate(`/brands/${brandId}`);
          }}
        />
      )}
    </div>
  );
}
