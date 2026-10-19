import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeftRight, Undo2, ChevronRight } from "lucide-react";
import { EmptyState, SectionCard } from "./BrandShared";
import StatusStepButton from "../../components/common/StatusStepButton";
import { getVoucherClaimPayments } from "../transaction/services/TransactionApi";
import { getRefundWorklist } from "../refund/services/RefundApi";
import { normalizeClaimStatus, formatPaymentMethod, fmtTime, inr } from "../transaction/transactionUtils";
import { isNotFoundMessage } from "../../utils/helpers";
import Loader from "../../components/common/Loader";

/* -------------------------------------------------------------------------
 * Transactions + Refunds tabs on a brand's detail page — this brand's own
 * records, fetched by the brand's id. Neither list endpoint is confirmed to
 * filter on brandId, so the rows are also filtered by brand here (every
 * record carries its brand). Rows open the existing detail pages.
 * ---------------------------------------------------------------------- */

// Full ISO timestamp → "11 Oct 2026" (transactionUtils.formatDate expects a
// bare "YYYY-MM-DD" string, so it isn't used here).
const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const humanize = (v) =>
  String(v || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/* Shared fetch-and-filter hook: loads up to 100 records, keeps this brand's. */
function useBrandRecords(brand, fetcher, belongsToBrand, map) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetcher({ brandId: brand.id, page: 1, limit: 100 });
        const list = res?.data?.data ?? res?.data ?? [];
        const mine = (Array.isArray(list) ? list : []).filter((item) => belongsToBrand(item, brand)).map(map);
        if (!cancelled) setRows(mine);
      } catch (err) {
        if (!cancelled) {
          if (isNotFoundMessage(err.message)) setRows([]);
          else setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetcher / belongsToBrand / map are module-level, so only the brand matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id]);

  return { rows, loading, error };
}

function TabState({ loading, error, label }) {
  if (loading) {
    return (
      <Loader label={`Loading ${label}…`} />
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
      <AlertTriangle size={14} className="shrink-0" /> Failed to load {label}: {error}
    </div>
  );
}

const tableWrap = "overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";
const thClass = "px-4 py-3 font-semibold";

/* ---- Transactions ---------------------------------------------------- */

// The list endpoint returns { payment, claim, brand, … } per record (or a
// flatter shape on some records) — same unwrapping as the Transactions page.
const paymentBrandId = (item) => {
  const payment = item?.payment ?? item ?? {};
  return item?.brand?._id ?? payment.brandId ?? item?.claim?.brandId ?? payment.brand?._id ?? null;
};

function belongsToBrandTxn(item, brand) {
  const id = paymentBrandId(item);
  if (id) return String(id) === String(brand.id);
  // No id on the record — fall back to the brand name.
  return (item?.brand?.brandName ?? item?.payment?.brand?.brandName) === brand.brandName;
}

function mapTxn(item) {
  const payment = item?.payment ?? item ?? {};
  const claim = item?.claim ?? {};
  const ts = payment.createdAt || payment.verifiedAt || null;
  return {
    id: payment._id || item?._id,
    claimId: claim._id || payment.claimId || item?._id || payment._id,
    reference: payment.razorpayPaymentId || payment.invoiceId || payment._id || "—",
    customer: payment.customerId || claim.customerId || "—",
    ts,
    amount: Number(payment.amount) || 0,
    method: formatPaymentMethod(payment.paymentMethod),
    status: normalizeClaimStatus(payment.status),
  };
}

const TXN_TONES = { Success: "emerald", Pending: "amber", Failed: "red" };

export function TransactionsTab({ brand }) {
  const navigate = useNavigate();
  const { rows, loading, error } = useBrandRecords(brand, getVoucherClaimPayments, belongsToBrandTxn, mapTxn);

  if (loading || error) return <TabState loading={loading} error={error} label="transactions" />;
  if (!rows.length) return <EmptyState label="No transactions for this brand yet." />;

  const success = rows.filter((r) => r.status === "Success");
  const total = (list) => list.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SectionCard title="Transactions">
          <p className="text-[20px] font-bold text-neutral-800 dark:text-neutral-200">{rows.length}</p>
        </SectionCard>
        <SectionCard title="Collected">
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{inr(total(success))}</p>
          <p className="text-[11.5px] text-neutral-500">{success.length} successful</p>
        </SectionCard>
        <SectionCard title="Pending">
          <p className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{rows.filter((r) => r.status === "Pending").length}</p>
        </SectionCard>
        <SectionCard title="Failed">
          <p className="text-[20px] font-bold text-red-600 dark:text-red-400">{rows.filter((r) => r.status === "Failed").length}</p>
        </SectionCard>
      </div>

      <div className={tableWrap}>
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead className="bg-neutral-100/80 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/50">
              <tr>
                <th className={thClass}>Payment</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Method</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Status</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => r.claimId && navigate(`/transaction/${r.claimId}`)}
                  className="cursor-pointer border-t border-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2 font-mono text-[12px] text-neutral-800 dark:text-neutral-200">
                      <ArrowLeftRight size={13} className="text-neutral-400" /> {r.reference}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11.5px] text-neutral-500">{r.customer}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]">
                    {r.ts ? `${formatDate(r.ts)} · ${fmtTime(r.ts)}` : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]">{r.method}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-50">{inr(r.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusStepButton label={r.status} tone={TXN_TONES[r.status]} />
                  </td>
                  <td className="px-2 py-3 text-neutral-400">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---- Refunds --------------------------------------------------------- */

const belongsToBrandRefund = (item, brand) => String(item?.brandId) === String(brand.id);

function mapRefund(raw) {
  const status = String(raw.status || "PENDING").toUpperCase();
  return {
    id: raw._id,
    claimCode: raw.claimCode || "—",
    reason: humanize(raw.reason) || "—",
    method: humanize(raw.method) || "—",
    ts: raw.createdAt,
    requested: Number(raw.requestedAmount) || 0,
    approved: raw.approvedAmount != null ? Number(raw.approvedAmount) : null,
    status,
    statusLabel: raw.statusLabel || humanize(status),
  };
}

// Refund status → pill colour (same grouping as the Refunds page).
function refundTone(status) {
  if (["COMPLETED", "APPROVED", "VENDOR_APPROVED"].includes(status)) return "emerald";
  if (status === "ADMIN_APPROVED") return "sky";
  if (status === "PROCESSING") return "violet";
  if (["REJECTED", "ADMIN_REJECTED", "CANCELLED", "WITHDRAWN", "FAILED"].includes(status)) return "red";
  return "amber";
}

export function RefundsTab({ brand }) {
  const navigate = useNavigate();
  const { rows, loading, error } = useBrandRecords(brand, getRefundWorklist, belongsToBrandRefund, mapRefund);

  if (loading || error) return <TabState loading={loading} error={error} label="refunds" />;
  if (!rows.length) return <EmptyState label="No refunds for this brand yet." />;

  const sum = (list, key) => list.reduce((s, r) => s + (r[key] || 0), 0);
  const refunded = rows.filter((r) => r.status === "COMPLETED");
  const open = rows.filter((r) => refundTone(r.status) === "amber" || ["ADMIN_APPROVED", "PROCESSING"].includes(r.status));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SectionCard title="Refund Requests">
          <p className="text-[20px] font-bold text-neutral-800 dark:text-neutral-200">{rows.length}</p>
          <p className="text-[11.5px] text-neutral-500">{inr(sum(rows, "requested"))} requested</p>
        </SectionCard>
        <SectionCard title="Refunded">
          <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">{inr(sum(refunded, "approved"))}</p>
          <p className="text-[11.5px] text-neutral-500">{refunded.length} completed</p>
        </SectionCard>
        <SectionCard title="Open">
          <p className="text-[20px] font-bold text-amber-600 dark:text-amber-400">{open.length}</p>
        </SectionCard>
        <SectionCard title="Rejected">
          <p className="text-[20px] font-bold text-red-600 dark:text-red-400">{rows.filter((r) => refundTone(r.status) === "red").length}</p>
        </SectionCard>
      </div>

      <div className={tableWrap}>
        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="bg-neutral-100/80 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-950/50">
              <tr>
                <th className={thClass}>Claim</th>
                <th className={thClass}>Reason</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Method</th>
                <th className={`${thClass} text-right`}>Requested</th>
                <th className={`${thClass} text-right`}>Approved</th>
                <th className={thClass}>Status</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/refund/${r.id}`)}
                  className="cursor-pointer border-t border-neutral-100 text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-800/60 dark:text-neutral-300 dark:hover:bg-neutral-800/30"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-50">
                      <Undo2 size={13} className="text-neutral-400" /> {r.claimCode}
                    </span>
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-[12px]">{r.reason}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]">{r.ts ? formatDate(r.ts) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px]">{r.method}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-50">{inr(r.requested)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                    {r.approved != null ? inr(r.approved) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusStepButton label={r.statusLabel} tone={refundTone(r.status)} />
                  </td>
                  <td className="px-2 py-3 text-neutral-400">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
