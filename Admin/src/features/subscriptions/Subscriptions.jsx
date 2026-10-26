import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search,
  CreditCard,
  Gift,
  X,
  Eye,
  Receipt,
  UserCog,
  ExternalLink,
  Hash,
  Calendar,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Table from "../../components/common/Table";
import { useAllSubscriptionPages } from "./queries/subscriptionsQueries";
import { formatBatch, MISSING, isNotFoundMessage } from "../../utils/helpers";
import EmptyState from "../../components/common/EmptyState";
import ValueOr from "../../components/common/ValueOr";
import Loader from "../../components/common/Loader";
import SubscriptionsOverview from "./SubscriptionsOverview";

const PRICING_COLORS = { list: "#22c55e", discount: "#f59e0b", gst: "#38bdf8", payable: "#a78bfa" };

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
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING.date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(amount) {
  if (amount == null) return MISSING.amount;
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDateTime(iso) {
  if (!iso) return MISSING.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return MISSING.date;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] shadow-md dark:bg-neutral-800">
      <div className="mb-0.5 text-neutral-500 dark:text-neutral-400">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{children}</p>;
}

/* bento tile — only renders when `value` is present, so each section
 * naturally adapts to whichever fields a given record has (a
 * PAYMENT-sourced record carries pricing + transactionId, an ADMIN_MANUAL
 * grant carries adminNote + grantedByAdminId instead). */
function InfoRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-neutral-900">
      <p className="truncate text-[10.5px] text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{value}</p>
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

  const totalDays =
    row.startDate && row.endDate
      ? Math.max(1, Math.round((new Date(row.endDate) - new Date(row.startDate)) / 86400000))
      : null;
  const elapsedPct =
    totalDays != null
      ? Math.min(100, Math.max(0, ((totalDays - (row.isLapsed ? 0 : row.daysRemaining ?? totalDays)) / totalDays) * 100))
      : 0;

  const pieData = p
    ? [
        { name: "Taxable Value", value: p.taxableValue || 0, color: PRICING_COLORS.list },
        { name: "Discount", value: p.discountAmount || 0, color: PRICING_COLORS.discount },
        { name: "GST", value: p.gstAmount || 0, color: PRICING_COLORS.gst },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-neutral-900"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Subscriptions / {row.brand?.brandName || "No brand"}</p>
            <h2 className="mt-1 text-[26px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">
              {formatCurrency(row.paidAmount)}
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">
              {row.isLapsed ? "Expired" : row.endDate ? `Valid till ${formatDate(row.endDate)}` : "No end date"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onOpenBrand(row.brand?._id)}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Open Brand Page
              <ExternalLink size={11} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            >
              <X size={15} />
            </button>
          </div>
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

        {/* Plan card + mini info + progress — matching the reference's
            Cards / Card-details / Spending-limits row. */}
        <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-4 text-white">
            <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-medium text-emerald-100">{row.plan?.name || MISSING.plan}</p>
              <CreditCard size={16} className="text-emerald-100" />
            </div>
            <p className="relative mt-2 text-[20px] font-bold leading-tight">{formatCurrency(row.plan?.price)}</p>
            <div className="relative mt-4 flex items-center justify-between text-[11px] text-emerald-100">
              <span>{row.plan?.type === "MONTHLY" ? "Monthly" : "Yearly"}</span>
              <span>{row.source || MISSING.method}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex-1 space-y-2 rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-neutral-500">
                  <Hash size={12} /> Transaction ID
                </span>
                <span className="font-mono text-[11px] text-neutral-800 dark:text-neutral-200"><ValueOr value={row.transactionId} fallback={MISSING.id} /></span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-neutral-500">
                  <Calendar size={12} /> Start
                </span>
                <span className="text-neutral-800 dark:text-neutral-200">{formatDate(row.startDate)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-neutral-500">
                  <Calendar size={12} /> End
                </span>
                <span className="text-neutral-800 dark:text-neutral-200">{formatDate(row.endDate)}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-950/60">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Time Elapsed</span>
                <span>{row.isLapsed ? "Expired" : row.daysRemaining != null ? `${row.daysRemaining}d left` : "No end date"}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full ${row.isLapsed ? "bg-red-400" : "bg-emerald-400"}`}
                  style={{ width: `${elapsedPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {pieData.length > 0 && (
          <div className="mb-5 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-950/60">
            <SectionLabel>Pricing Breakdown</SectionLabel>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <ResponsiveContainer width="100%" height={160} className="sm:max-w-40">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {pieData.map((s) => (
                      <Cell key={s.name} fill={s.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5">
                {pieData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatCurrency(s.value)}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2 text-[12px] font-semibold dark:border-neutral-800">
                  <span className="text-neutral-700 dark:text-neutral-300">Total Payable</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalPayable)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
            <SectionLabel>Brand</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoRow label="Brand Name" value={row.brand?.brandName} />
              <InfoRow label="Merchant ID" value={row.brand?.merchantId} />
              <InfoRow label="Brand ID" value={row.brand?._id} />
              <InfoRow label="Sub-Brands Used" value={row.brand?.subBrandsUsed != null ? `${row.brand.subBrandsUsed} / ${row.brand.subBrandsLimit || "∞"}` : null} />
              <InfoRow label="Franchises Used" value={row.brand?.franchisesUsed != null ? `${row.brand.franchisesUsed} / ${row.brand.franchisesLimit || "∞"}` : null} />
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
            <SectionLabel>Plan</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoRow label="Plan Name" value={row.plan?.name} />
              <InfoRow label="Plan Type" value={row.plan?.type} />
              <InfoRow label="List Price" value={formatCurrency(row.plan?.price)} />
              <InfoRow label="Source" value={row.source} />
              <InfoRow label="Payment Mode" value={row.paymentMode} />
              <InfoRow label="Number of Upgrades" value={row.numberOfUpgrade} />
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
            <SectionLabel>Validity</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoRow label="Start Date" value={formatDateTime(row.startDate)} />
              <InfoRow label="End Date" value={formatDateTime(row.endDate)} />
              <InfoRow label="Days Remaining" value={row.isLapsed ? "Expired" : row.daysRemaining} />
              <InfoRow label="Granted / Created On" value={formatDateTime(row.createdAt)} />
            </div>
          </div>

          <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
            <SectionLabel>Payment</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoRow label="Plan Price" value={formatCurrency(row.price)} />
              <InfoRow label="Paid Amount" value={formatCurrency(row.paidAmount)} />
              <InfoRow label="Due Amount" value={row.dueAmount ? formatCurrency(row.dueAmount) : null} />
              <InfoRow label="Transaction ID" value={row.transactionId} />
            </div>
          </div>

          {p && (
            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
              <div className="mb-3 flex items-center gap-2">
                <Receipt size={13} className="text-neutral-500" />
                <SectionLabel>Pricing &amp; Tax Breakdown</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:shadow-black/20">
              <div className="mb-3 flex items-center gap-2">
                <UserCog size={13} className="text-neutral-500" />
                <SectionLabel>Admin Grant</SectionLabel>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

// Test/demo subscription — its own flag, or one under a dummy brand.
const isDummySubscription = (r) => Boolean(r.isDummy ?? r.brand?.isDummy);

/* scope "all" (sidebar: Subscriptions) = real ones only;
   scope "dummy" (sidebar: Dummy Subscriptions) = isDummy ones only. */
export default function Subscriptions({ scope = "all" }) {
  const navigate = useNavigate();
  const isDummyScope = scope === "dummy";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [selected, setSelected] = useState(null);

  // The API can't filter on isDummy, so every page is loaded and split
  // here — paging is then done client-side over this scope's rows.
  // Every row matching the server-side filters, both real and dummy.
  const {
    data: allRows = [],
    isPending: loading,
    isFetching,
    error,
    refetch,
  } = useAllSubscriptionPages(
    {
      search: debouncedSearch,
      status: status === "All" ? undefined : status,
      source: source === "All" ? undefined : source,
    },
    { placeholderData: keepPreviousData }
  );
  // A "not found" reply just means nothing matches — the table's empty
  // state, not an error.
  const rawLoadError = error?.message ?? "";
  const loadError = isNotFoundMessage(rawLoadError) ? "" : rawLoadError;

  const scopedRows = useMemo(
    () => allRows.filter((r) => isDummySubscription(r) === isDummyScope),
    [allRows, isDummyScope]
  );
  const total = scopedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rows = scopedRows.slice((page - 1) * limit, page * limit);

  // Debounce search — the query refetches when debouncedSearch (or the
  // status / source filters) change; paging is local, so no refetch.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const columns = [
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <button onClick={() => setSelected(row)} className="text-left">
          <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400">
            <ValueOr value={row.brand?.brandName} fallback="No brand" />
          </p>
          <p className="text-[11.5px] text-neutral-500"><ValueOr value={row.brand?.merchantId} fallback="No merchant ID" /></p>
          {isDummySubscription(row) && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              <FlaskConical size={9} />
              D
            </span>
          )}
          {isDummySubscription(row) && (row.dummyBatch || row.brand?.dummyBatch) && (
            <p className="mt-0.5 font-mono text-[10.5px] text-violet-600 dark:text-violet-400">
              {formatBatch(row.dummyBatch || row.brand?.dummyBatch)}
            </p>
          )}
        </button>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200"><ValueOr value={row.plan?.name} fallback={MISSING.plan} /></p>
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
            {row.source || MISSING.method}
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
            {!row.startDate && !row.endDate ? (
              <ValueOr value={null} fallback="Dates not set" />
            ) : (
              `${formatDate(row.startDate)} → ${row.endDate ? formatDate(row.endDate) : "No end date"}`
            )}
          </p>
          <p className={`text-[11px] ${row.isLapsed ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
            {row.isLapsed ? "Expired" : row.daysRemaining != null ? `${row.daysRemaining} days left` : "No end date"}
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard size={19} />
          </span>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {isDummyScope ? "D Subscriptions" : "Subscriptions"}
            </h1>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              {isDummyScope
                ? `Test / demo subscriptions — kept separate from real ones. ${total} total.`
                : `Every brand's plan, across the whole platform — ${total} total.`}
            </p>
          </div>
        </div>

        {/* Overview — every subscription matching the filters below (status,
            source, search), across all pages, not just the table page. */}
        <SubscriptionsOverview rows={scopedRows} loading={isFetching} />

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
          <Loader label="Loading subscriptions…" />
        )}

        {!loading && loadError && (
          <EmptyState
            tone="error"
            icon="error"
            title="Couldn't load subscriptions"
            description={loadError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
          />
        )}

        {!loading && !loadError && (
          <>
            <Table
              columns={columns}
              data={tableRows}
              emptyTitle={isDummyScope ? "No D subscriptions" : "No subscriptions found"} emptyDescription={isDummyScope ? "Test / demo subscriptions will show up here." : "No subscriptions match this status, source or search. Try a different filter."} emptyIcon="subscription"
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
