import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Gift,
  Receipt,
  UserCog,
  ExternalLink,
  Hash,
  Calendar,
  CalendarClock,
  RefreshCw,
  Copy,
  Check,
  FileX,
  Link2,
  ChevronDown,
  FlaskConical,
  Building2,
  Layers,
  PieChart as PieIcon,
  Braces,
  Wallet,
  Clock,
  RotateCw,
  Loader2,
  AlertTriangle,
  Download,
  X,
  Eye,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAllSubscriptionPages } from "./queries/subscriptionsQueries";
import { regenerateInvoice } from "./services/SubscriptionsApi";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import useBackLayer from "../../lib/useBackLayer";
import { MISSING, formatBatch, isNotFoundMessage } from "../../utils/helpers";
import EmptyState from "../../components/common/EmptyState";
import NotFoundPage from "../../components/common/NotFoundPage";
import ValueOr from "../../components/common/ValueOr";
import Loader from "../../components/common/Loader";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  pick,
  idOf,
  isDummySubscription,
} from "./subscriptionUtils";
import StatusPill from "./components/StatusPill";

const PRICING_COLORS = { list: "#22c55e", discount: "#f59e0b", gst: "#38bdf8", payable: "#a78bfa" };

const CARD_TINTS = {
  sky: "bg-sky-400/10 text-sky-600 dark:text-sky-400",
  emerald: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  violet: "bg-violet-400/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  neutral: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

// Dashboard bento look — frosted glass cards over the page's soft gradient.
// Sections inside a card are split by spacing and soft tiles, never by
// divider lines.
const glassClass =
  "rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30";
// h-full: cards in one bento row share a height.
const cardClass = `${glassClass} flex h-full flex-col p-5`;
// Inner tiles inside a glass card.
const innerTile = "rounded-2xl bg-white/70 dark:bg-neutral-950/50";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] shadow-md dark:bg-neutral-800">
      {payload.map((p) => (
        <div key={p.name} className="font-bold" style={{ color: p.payload.color }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

// Bento card — tinted icon badge + bold title (+ subtitle), an optional
// action on the right, then the body.
function Card({ icon: Icon, tint = "emerald", title, subtitle, action, className = "", children }) {
  return (
    <div className={`${cardClass} ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
            {Icon && (
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${CARD_TINTS[tint]}`}>
                <Icon size={14} />
              </span>
            )}
            {title}
          </h3>
          {subtitle && <p className="mt-1 text-[11.5px] text-neutral-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// KPI tile, as on the dashboard. `highlight` = the green gradient lead tile;
// `mono` shrinks the value for long ids.
function StatCard({ icon: Icon, label, value, sub, tint = "emerald", highlight = false, mono = false, children }) {
  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden p-4 ${
        highlight
          ? "rounded-3xl border border-white/80 bg-gradient-to-br from-emerald-200/80 via-emerald-100/70 to-white/60 shadow-[0_8px_30px_rgba(16,185,129,0.15)] backdrop-blur-xl dark:border-emerald-400/10 dark:from-emerald-500/30 dark:via-emerald-600/10 dark:to-neutral-900/60"
          : glassClass
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/60 blur-2xl dark:bg-emerald-400/10" />}
      <span
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${
          highlight ? "bg-white/80 text-emerald-600 dark:bg-white/10 dark:text-emerald-300" : CARD_TINTS[tint]
        }`}
      >
        <Icon size={16} />
      </span>
      <p className={`relative mt-3 text-[11.5px] font-medium ${highlight ? "text-neutral-900/70 dark:text-neutral-300" : "text-neutral-500"}`}>
        {label}
      </p>
      <p
        className={`relative truncate font-bold leading-tight tracking-tight text-neutral-900 dark:text-neutral-50 ${
          mono ? "mt-1 font-mono text-[16px]" : "text-[24px]"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
      {sub && (
        <p className={`relative mt-0.5 truncate text-[11px] ${highlight ? "text-neutral-900/70 dark:text-neutral-300" : "text-neutral-500"}`}>{sub}</p>
      )}
      {/* Pinned to the bottom so tiles in a row line up. */}
      {children && <div className="relative mt-auto pt-3">{children}</div>}
    </div>
  );
}

// A single labeled fact — hidden when the record doesn't carry it, so each
// card adapts to the source (a PAYMENT record has pricing + transaction, an
// ADMIN_MANUAL grant has a grant note + granting admin instead).
function Field({ icon: Icon, label, value, mono = false }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        {Icon && <Icon size={12} className="shrink-0 text-neutral-400 dark:text-neutral-500" />}
        {label}
      </p>
      <p
        className={`mt-1 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 ${
          mono ? "break-all font-mono text-[12px]" : "truncate"
        }`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

// One line of the itemized invoice — label (+ muted sub-note) left, amount
// right; discounts read green, the total reads bold like a real bill.
function PriceRow({ label, sub, value, tone, strong }) {
  const valueTone =
    tone === "discount"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "due"
        ? "text-amber-600 dark:text-amber-400"
        : "text-neutral-800 dark:text-neutral-100";
  return (
    <div className={`flex items-start justify-between gap-4 py-2 ${strong ? "pt-2.5" : ""}`}>
      <div>
        <p
          className={`text-[12px] ${
            strong ? "font-semibold text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-300"
          }`}
        >
          {label}
        </p>
        {sub && <p className="mt-0.5 text-[10.5px] text-neutral-400 dark:text-neutral-500">{sub}</p>}
      </div>
      <span
        className={`shrink-0 ${
          strong ? "text-[14px] font-bold text-neutral-900 dark:text-neutral-50" : `text-[12px] font-medium ${valueTone}`
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (key, value) => {
    navigator.clipboard?.writeText(String(value));
    setCopied(key);
    setTimeout(() => setCopied((k) => (k === key ? null : k)), 1200);
  };
  return [copied, copy];
}

function CopyableId({ label, value }) {
  const [copied, copy] = useCopy();
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => copy("id", value)}
      title="Copy"
      className={`group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-emerald-400/10 ${innerTile}`}
    >
      <span className="min-w-0">
        <span className="block text-[10.5px] text-neutral-500">{label}</span>
        <span className="mt-0.5 block break-all font-mono text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-200">{value}</span>
      </span>
      <span className="shrink-0 text-neutral-400 group-hover:text-emerald-500">
        {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </span>
    </button>
  );
}

/* Invoice can sit on the record itself or on its (populated) transaction,
 * either flat or under invoiceSnapshot / invoice — same shape the
 * transaction endpoints use. */
function resolveInvoice(row) {
  const txn = (row.transactionId && typeof row.transactionId === "object" ? row.transactionId : null) || row.transaction || null;
  const sources = [row, row.invoice, row.invoiceSnapshot, txn, txn?.invoice, txn?.invoiceSnapshot];
  return {
    invoiceId: pick(...sources.flatMap((s) => [s?.invoiceId, s?.invoiceNumber])),
    invoiceUrl: pick(...sources.flatMap((s) => [s?.invoiceUrl, s?.invoiceDownloadUrl])),
    issuedAt: pick(...sources.flatMap((s) => [s?.issuedAt, s?.snapshot?.issuedAt])),
    snapshot: pick(...sources.map((s) => s?.snapshot)) ?? null,
    transactionId: pick(idOf(row.transactionId), idOf(row.transaction)),
    razorpayPaymentId: pick(row.razorpayPaymentId, txn?.razorpayPaymentId),
    razorpayOrderId: pick(row.razorpayOrderId, txn?.razorpayOrderId),
    paymentMode: pick(row.paymentMode, txn?.paymentMode),
    gateway: pick(row.gateway, txn?.gateway),
  };
}

/* POST /transactions/invoice/regenerate → one flat shape. The live API puts
 * invoiceId / invoiceDownloadUrl / snapshot straight on `data` (invoiceUrl
 * comes back null — the PDF is the /documents/:token link); the doc's older
 * `data.invoice.{invoiceId, invoiceUrl, issuedAt}` is still read as a fallback. */
function normalizeIssuedInvoice(d = {}) {
  const snapshot = d.snapshot ?? null;
  return {
    invoiceId: pick(d.invoiceId, snapshot?.documentNumber, d.invoice?.invoiceId),
    invoiceUrl: pick(d.invoiceDownloadUrl, d.invoiceUrl, d.invoice?.invoiceUrl),
    issuedAt: pick(snapshot?.issuedAt, d.invoice?.issuedAt),
    snapshot,
    backfilled: Boolean(d.snapshotBackfilled ?? d.wasBackfilled),
  };
}

const fmtPercent = (n) => `${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;

/* Saves the invoice as "<invoice-number>.pdf". The link is the API's
 * cross-origin /documents/:token, where an <a download> is ignored — so it's
 * fetched as a blob. If that fails (CORS) or the server sends a page rather
 * than a PDF, it opens in a new tab instead, where it can be saved/printed. */
async function downloadInvoice(url, invoiceId) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    if (!blob.type.includes("pdf")) throw new Error("not a pdf");
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${String(invoiceId || "invoice").replace(/[^\w-]+/g, "-")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

// Every primitive in the record as dotted-path rows, for the raw dump.
function flattenRecord(obj, prefix = "", out = []) {
  Object.entries(obj || {}).forEach(([key, val]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) flattenRecord(val, path, out);
    else if (Array.isArray(val)) out.push([path, val.length ? JSON.stringify(val) : "[]"]);
    else out.push([path, val == null ? "null" : String(val)]);
  });
  return out;
}

/* -------------------------------------------------------------------------
 * The fetched invoice in a compact modal: invoice number + close in the
 * header, the bill scrolling in the middle, every action in a footer that
 * stays put (Re-issue left; Copy link / Open / Download right). Rendered
 * into document.body so the page layout never clips it; Esc / Back /
 * backdrop close it.
 * ---------------------------------------------------------------------- */
function InvoiceModal({ inv, title, issuing, downloading, onDownload, onReissue, onClose, children }) {
  const [copied, copy] = useCopy();
  useBackLayer(true, onClose);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition-colors hover:border-sky-400/50 hover:text-sky-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Receipt size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{title}</p>
              <button
                type="button"
                onClick={() => copy("no", inv.invoiceId)}
                title="Copy invoice number"
                className="flex max-w-full items-center gap-1.5 font-mono text-[13.5px] font-bold text-neutral-900 dark:text-neutral-50"
              >
                <span className="truncate">{inv.invoiceId}</span>
                {copied === "no" ? <Check size={12} className="shrink-0 text-emerald-500" /> : <Copy size={11} className="shrink-0 text-neutral-400" />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invoice"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* Bill */}
        <div className="flex-1 overflow-y-auto">{children}</div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 bg-neutral-50 px-4 py-3 dark:bg-neutral-950/60">
          <button
            type="button"
            disabled={issuing}
            onClick={onReissue}
            className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[11.5px] font-semibold text-neutral-500 transition-colors hover:text-emerald-600 disabled:opacity-60 dark:text-neutral-400"
          >
            {issuing ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
            Re-issue
          </button>
          {inv.invoiceUrl && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => copy("url", inv.invoiceUrl)} title="Copy link" aria-label="Copy link" className={iconBtn}>
                {copied === "url" ? <Check size={13} className="text-emerald-500" /> : <Link2 size={13} />}
              </button>
              <a href={inv.invoiceUrl} target="_blank" rel="noreferrer" title="Open in new tab" aria-label="Open in new tab" className={iconBtn}>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                disabled={downloading}
                onClick={onDownload}
                className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Small label-over-value pair used across the bill.
function BillMeta({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
      <p className={`mt-0.5 text-[12px] font-medium text-neutral-800 dark:text-neutral-100 ${mono ? "font-mono" : ""}`}>
        {value || MISSING.generic}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * The bill inside the invoice modal, top to bottom like a printed invoice:
 * total + status, from / to, period · supply · HSN, the line item with its
 * itemized tax, the payment timeline, and payment references. Reads the
 * invoice snapshot first (what was frozen onto the legal document) and
 * falls back to the list row.
 * ---------------------------------------------------------------------- */
function InvoiceBill({ row, inv, merchantId, note }) {
  const snap = inv.snapshot;
  const p = snap?.pricing ?? row.pricing;
  const total = p?.totalPayable ?? row.paidAmount;
  const due = row.dueAmount || 0;
  const duration = row.durationValue != null ? `${row.durationValue} ${row.durationUnit || ""}`.trim() : null;
  const gstLabel = p?.gstPercentage != null ? `${fmtPercent(p.gstPercentage)}${p.isGstInclusive ? " incl." : ""}` : null;
  const planDetail = snap?.details?.find((d) => d.label === "Plan")?.value;
  const otherDetails = snap?.details?.filter((d) => d.label !== "Plan") ?? [];
  const timeline = snap?.timeline ?? [];
  const refs = [
    ["Payment mode", inv.paymentMode || (row.isFreeGrant ? "FREE" : null)],
    ["Gateway", inv.gateway],
    ["Transaction ID", inv.transactionId],
    ["Razorpay payment", inv.razorpayPaymentId],
    ["Razorpay order", inv.razorpayOrderId],
  ].filter(([, v]) => v);

  return (
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {note && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-400/10 px-3 py-2 text-[11.5px] text-emerald-700 dark:text-emerald-400">
          <Check size={13} className="mt-0.5 shrink-0" />
          <span>{note}</span>
        </div>
      )}

      {/* Total + status */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-neutral-500">Total payable</p>
          <p className="text-[26px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{formatCurrency(total)}</p>
          {inv.issuedAt && <p className="text-[11px] text-neutral-500">Issued {formatDateTime(inv.issuedAt)}</p>}
        </div>
        <span
          className={`mb-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            due > 0 ? "bg-amber-400/10 text-amber-600 dark:text-amber-400" : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {due > 0 ? `Due ${formatCurrency(due)}` : row.isFreeGrant ? "Free grant" : "Paid"}
        </span>
      </div>

      {/* From / to */}
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">From</p>
          <p className="mt-0.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">{snap?.seller?.name || "Trydood"}</p>
          {snap?.seller?.gstin && <p className="font-mono text-[10.5px] text-neutral-500">GSTIN {snap.seller.gstin}</p>}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Bill to</p>
          <p className="mt-0.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-100">
            <ValueOr value={snap?.billTo?.name || row.brand?.brandName} fallback="No brand" />
          </p>
          {snap?.billTo?.gstin ? (
            <p className="font-mono text-[10.5px] text-neutral-500">GSTIN {snap.billTo.gstin}</p>
          ) : (
            merchantId && <p className="font-mono text-[10.5px] text-neutral-500">{merchantId}</p>
          )}
          {snap?.billTo?.address && <p className="mt-1 text-[10.5px] leading-snug text-neutral-500">{snap.billTo.address}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <BillMeta label="Period" value={`${formatDate(row.startDate)} – ${row.endDate ? formatDate(row.endDate) : "open"}`} />
        <BillMeta label="Place of supply" value={p?.placeOfSupplyState ? `${p.placeOfSupplyState} (${p.placeOfSupplyStateCode})` : null} />
        <BillMeta label="HSN / SAC" value={p?.hsnSacCode} mono />
      </div>

      {/* Line item + itemized amounts */}
      <div className="overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-950/50">
        <div className="flex items-center justify-between gap-3 bg-neutral-100/70 px-3 py-2.5 dark:bg-neutral-900">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard size={13} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
                {planDetail || `${row.plan?.name || MISSING.plan} plan`}
              </p>
              <p className="truncate text-[10.5px] text-neutral-500">
                {otherDetails.length
                  ? otherDetails.map((d) => `${d.label}: ${d.value}`).join(" · ")
                  : [row.plan?.type === "MONTHLY" ? "Monthly" : "Yearly", duration].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100">
            {formatCurrency(p?.listPrice ?? row.plan?.price)}
          </span>
        </div>
        <div className="px-3 py-1">
          {p ? (
            <>
              {p.discountAmount > 0 && (
                <PriceRow
                  label="Discount"
                  sub={p.discountType === "PERCENT" ? `${fmtPercent(p.discountPercent)} off` : "Flat off"}
                  value={`− ${formatCurrency(p.discountAmount)}`}
                  tone="discount"
                />
              )}
              {p.promoDiscount > 0 && (
                <PriceRow label="Promo code" sub={p.promoCode} value={`− ${formatCurrency(p.promoDiscount)}`} tone="discount" />
              )}
              {p.prorationCredit > 0 && (
                <PriceRow label="Upgrade credit" value={`− ${formatCurrency(p.prorationCredit)}`} tone="discount" />
              )}
              <PriceRow label="Taxable value" value={formatCurrency(p.taxableValue)} />
              {p.cgst > 0 && <PriceRow label="CGST" sub={p.gstPercentage != null ? fmtPercent(p.gstPercentage / 2) : null} value={formatCurrency(p.cgst)} />}
              {p.sgst > 0 && <PriceRow label="SGST" sub={p.gstPercentage != null ? fmtPercent(p.gstPercentage / 2) : null} value={formatCurrency(p.sgst)} />}
              {p.igst > 0 && <PriceRow label="IGST" sub={gstLabel} value={formatCurrency(p.igst)} />}
              {!(p.cgst > 0 || p.sgst > 0 || p.igst > 0) && (
                <PriceRow label="GST" sub={[gstLabel, p.taxType].filter(Boolean).join(" · ") || null} value={formatCurrency(p.gstAmount)} />
              )}
              {p.roundOff ? <PriceRow label="Round off" value={formatCurrency(p.roundOff)} /> : null}
              <PriceRow label="Total" value={formatCurrency(total)} strong />
            </>
          ) : (
            <PriceRow label="Total" sub="No pricing breakdown stored on this record" value={formatCurrency(total)} strong />
          )}
        </div>
      </div>

      {p?.youSaved > 0 && (
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-violet-600 dark:text-violet-400">
          <Gift size={12} />
          Vendor saved {formatCurrency(p.youSaved)} on this plan
        </p>
      )}

      {/* Timeline — ordered → paid → term, from the invoice snapshot */}
      {timeline.length > 0 && (
        <ol className="grid grid-cols-2 gap-y-3 sm:grid-cols-4">
          {timeline.map((t, i) => (
            <li key={`${t.label}-${i}`} className="relative pr-2">
              {i < timeline.length - 1 && (
                <span className="absolute left-2.5 right-0 top-[4px] hidden h-px bg-neutral-200 dark:bg-neutral-800 sm:block" />
              )}
              <span
                className={`relative block h-2 w-2 rounded-full ring-4 ring-white dark:ring-neutral-900 ${
                  t.label === "Paid" ? "bg-emerald-500" : t.label === "Plan ends" ? "bg-neutral-400" : "bg-sky-500"
                }`}
              />
              <p className="mt-1.5 text-[11px] font-semibold text-neutral-800 dark:text-neutral-100">{t.label}</p>
              <p className="text-[10.5px] text-neutral-500">{formatDate(t.at)}</p>
            </li>
          ))}
        </ol>
      )}

      {/* Payment references */}
      {refs.length > 0 && (
        <dl className="space-y-1.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/50">
          {refs.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-[11.5px]">
              <dt className="shrink-0 text-neutral-500">{label}</dt>
              <dd className="truncate font-mono text-neutral-800 dark:text-neutral-200" title={String(value)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Invoice card on the page — just the essentials and the actions. The full
 * bill opens in InvoiceModal: "Get invoice" fetches it the first time
 * (POST /transactions/invoice/regenerate) and opens it; after that it just
 * opens. Re-issue lives inside the modal, behind a confirm.
 * ---------------------------------------------------------------------- */
function InvoiceSection({ row, inv, merchantId, onIssued, className = "" }) {
  const [issuing, setIssuing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  // Needs the payment transaction — the invoice lives on it.
  const canIssue = Boolean(inv.transactionId);
  const p = inv.snapshot?.pricing ?? row.pricing;
  const title = inv.snapshot?.title || "Tax Invoice";

  async function issueInvoice() {
    setIssuing(true);
    setIssueError("");
    setIssueNote("");
    try {
      const res = await regenerateInvoice(inv.transactionId);
      const invoice = normalizeIssuedInvoice(res?.data);
      if (!invoice.invoiceId && !invoice.invoiceUrl) throw new Error("The server didn't return an invoice.");
      onIssued(invoice);
      setIssueNote(
        invoice.backfilled
          ? "Invoice rebuilt from the stored pricing — it hadn't been generated before."
          : res?.message || "Invoice fetched."
      );
      setConfirmOpen(false);
      setModalOpen(true);
    } catch (e) {
      setIssueError(e.message);
    } finally {
      setIssuing(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    await downloadInvoice(inv.invoiceUrl, inv.invoiceId);
    setDownloading(false);
  }

  // First click fetches + opens; once the invoice is here it just opens.
  const handleGetInvoice = () => (inv.invoiceId ? setModalOpen(true) : issueInvoice());

  return (
    <Card
      icon={Receipt}
      tint="sky"
      title="Invoice"
      subtitle={
        inv.issuedAt
          ? `Issued ${formatDateTime(inv.issuedAt)}`
          : canIssue
            ? "Not fetched yet — the list doesn't carry it"
            : "No payment transaction linked"
      }
      className={className}
    >
      {/* Invoice number + actions */}
      <div className={`relative overflow-hidden p-4 ${innerTile}`}>
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-400/15 blur-2xl" />
        <p className="relative text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{title}</p>
        <p
          className={`relative mt-1 truncate font-mono text-[19px] font-bold ${
            inv.invoiceId ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          {inv.invoiceId || "Not fetched yet"}
        </p>
        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          {canIssue && (
            <button
              type="button"
              disabled={issuing}
              onClick={handleGetInvoice}
              className="flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-60"
            >
              {issuing ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
              {issuing ? "Fetching…" : inv.invoiceId ? "View invoice" : "Get invoice"}
            </button>
          )}
          {inv.invoiceUrl && (
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-4 py-2 text-[12px] font-semibold text-sky-700 transition-colors hover:bg-sky-500/20 disabled:opacity-60 dark:text-sky-300"
            >
              {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Download
            </button>
          )}
        </div>
      </div>

      {/* Key figures */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Plan", inv.snapshot?.details?.find((d) => d.label === "Plan")?.value || row.plan?.name || MISSING.plan],
          ["Total payable", formatCurrency(p?.totalPayable ?? row.paidAmount)],
          ["Paid", formatCurrency(row.paidAmount)],
          ["Payment mode", inv.paymentMode || (row.isFreeGrant ? "FREE" : MISSING.method)],
        ].map(([label, value]) => (
          <div key={label} className={`min-w-0 px-3 py-2.5 ${innerTile}`}>
            <p className="text-[10.5px] text-neutral-500">{label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-800 dark:text-neutral-100" title={String(value)}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {issueError && !confirmOpen && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{issueError}</span>
        </div>
      )}

      {!inv.invoiceId && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl bg-neutral-100/70 p-3.5 dark:bg-neutral-800/40">
          <FileX size={16} className="mt-0.5 shrink-0 text-neutral-400" />
          <p className="text-[12px] leading-relaxed text-neutral-500">
            {canIssue ? (
              <>
                Click <span className="font-semibold">Get invoice</span> to fetch it from the payment transaction and open the full bill.
              </>
            ) : (
              "No payment transaction is linked to this record, so there's no invoice to fetch."
            )}
          </p>
        </div>
      )}

      {modalOpen && (
        <InvoiceModal
          inv={inv}
          title={title}
          issuing={issuing}
          downloading={downloading}
          onDownload={handleDownload}
          onReissue={() => setConfirmOpen(true)}
          onClose={closeModal}
        >
          <InvoiceBill row={row} inv={inv} merchantId={merchantId} note={issueNote} />
          {/* Inside the modal's portal so it stacks above it. */}
          <ConfirmActionModal
            open={confirmOpen}
            icon={RotateCw}
            title="Re-issue this invoice?"
            description={`The document for ${inv.invoiceId} is rebuilt from the pricing frozen at purchase — amounts don't change.`}
            confirmLabel="Re-issue"
            submitting={issuing}
            error={issueError}
            onConfirm={issueInvoice}
            onClose={() => !issuing && setConfirmOpen(false)}
          />
        </InvoiceModal>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Full-detail page for one subscription record (/subscriptions/:subscribedId).
 * There's no "get subscription by id" endpoint, so the row handed over by
 * the list (router state) renders instantly; opened directly, the record is
 * found in the cached all-pages list instead.
 * ---------------------------------------------------------------------- */
export default function SubscriptionDetails() {
  const { subscribedId } = useParams();
  const navigate = useNavigate();
  const stateRow = useLocation().state?.row;

  const {
    data: fetchedRow,
    isPending,
    error,
    refetch,
  } = useAllSubscriptionPages(
    { search: "" },
    { select: (rows) => rows.find((r) => r._id === subscribedId) ?? null }
  );
  const row = fetchedRow ?? stateRow ?? null;

  const [showRaw, setShowRaw] = useState(false);
  // Invoice returned by "Get / Re-issue invoice" — overrides whatever the
  // list row carried (usually nothing).
  const [issuedInvoice, setIssuedInvoice] = useState(null);
  const rawFields = useMemo(() => (row ? flattenRecord(row).filter(([k]) => k !== "id") : []), [row]);

  const listPath = row && isDummySubscription(row) ? "/subscriptions/dummy" : "/subscriptions";
  const goBack = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(listPath));

  const rawLoadError = error?.message ?? "";
  const loadError = isNotFoundMessage(rawLoadError) ? "" : rawLoadError;

  if (!row && isPending) {
    return <Loader variant="page" label="Loading subscription…" />;
  }

  if (!row && loadError) {
    return (
      <EmptyState
        variant="page"
        tone="error"
        icon="error"
        title="Couldn't load this subscription"
        description={`${loadError} — check your connection and try again.`}
        action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
        secondaryAction={{ label: "Back to Subscriptions", onClick: () => navigate("/subscriptions") }}
      />
    );
  }

  if (!row) {
    return (
      <NotFoundPage
        title="Subscription not found"
        icon="subscription"
        description="We couldn't find a subscription with this link. It may have been removed, or the link is no longer valid."
        backLabel="Back to Subscriptions"
        onBack={() => navigate("/subscriptions")}
      />
    );
  }

  const inv = { ...resolveInvoice(row), ...(issuedInvoice ?? {}) };
  const p = inv.snapshot?.pricing ?? row.pricing;
  const merchantId = pick(row.brand?.merchantId, row.brand?.uniqueId);
  const adminNote = pick(row.adminNote, row.grantNote);
  const grantedBy = pick(idOf(row.grantedByAdminId), idOf(row.grantedBy));
  const isDummy = isDummySubscription(row);
  const brandName = row.brand?.brandName || "No brand";

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

  const remainingPct = 100 - elapsedPct;
  const isLive = row.status === "ACTIVE" && !row.isLapsed;
  const ringLen = 2 * Math.PI * 42;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back to whichever list this was opened from; opened directly → its list. */}
      <button
        onClick={goBack}
        className="mb-5 flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        <ArrowLeft size={14} />
        {isDummy ? "D Subscriptions" : "Subscriptions"}
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-[22px] font-bold uppercase text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)]">
            {brandName.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{brandName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] text-neutral-500">
                <ValueOr value={merchantId} fallback="No merchant ID" />
              </span>
              <StatusPill status={row.status} isLapsed={row.isLapsed} />
              {row.isFreeGrant && (
                <span className="flex items-center gap-1 rounded-full bg-violet-400/10 px-2.5 py-1 text-[10.5px] font-medium text-violet-600 dark:text-violet-400">
                  <Gift size={10} />
                  Free grant
                </span>
              )}
              {isDummy && (
                <span className="flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
                  <FlaskConical size={10} />
                  D {formatBatch(row.dummyBatch || row.brand?.dummyBatch) || ""}
                </span>
              )}
            </div>
          </div>
        </div>
        {row.brand?._id && (
          <button
            onClick={() => navigate(`/brands/${row.brand._id}`)}
            className="flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-colors hover:bg-emerald-600 sm:self-auto"
          >
            Open Brand Page
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* Bento, 12 columns on wide screens:
            1. four KPI tiles
            2. Invoice (7) · Term hero (5)
            3. Amount Split (4) · Plan & Term (4) · References (4)
            4. Brand (8 / 12) · Admin Grant (4)
            5. All Fields */}
      <div className="space-y-4">
        {/* Row 1 — KPI tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            highlight
            icon={Wallet}
            label="Amount paid"
            value={formatCurrency(row.paidAmount)}
            sub={[row.source, p?.youSaved > 0 && `saved ${formatCurrency(p.youSaved)}`].filter(Boolean).join(" · ") || null}
          />
          <StatCard
            icon={CreditCard}
            label="Plan"
            value={row.plan?.name || MISSING.plan}
            sub={`${row.plan?.type === "MONTHLY" ? "Monthly" : "Yearly"} · ${formatCurrency(row.plan?.price)}`}
          />
          <StatCard
            icon={Clock}
            tint={row.isLapsed ? "red" : "amber"}
            label="Time left"
            value={row.isLapsed ? "Expired" : row.daysRemaining != null ? `${row.daysRemaining} days` : "Open-ended"}
            sub={row.endDate ? `Ends ${formatDate(row.endDate)}` : "No end date"}
          >
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full ${row.isLapsed ? "bg-red-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"}`}
                style={{ width: `${row.isLapsed ? 100 : elapsedPct}%` }}
              />
            </div>
          </StatCard>
          <StatCard
            icon={Receipt}
            tint="sky"
            mono
            label="Invoice"
            value={inv.invoiceId || "Not fetched"}
            sub={inv.issuedAt ? `Issued ${formatDate(inv.issuedAt)}` : "Use Get invoice below"}
          />
        </div>

        {/* Row 2 — invoice · term hero */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <InvoiceSection row={row} inv={inv} merchantId={merchantId} onIssued={setIssuedInvoice} className="xl:col-span-7" />

          <div
            className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-5 text-white xl:col-span-5 ${
              isLive
                ? "bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_12px_36px_rgba(16,185,129,0.35)]"
                : "bg-gradient-to-br from-neutral-600 via-neutral-500 to-neutral-400 shadow-[0_12px_36px_rgba(0,0,0,0.2)]"
            }`}
          >
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-teal-200/30 blur-2xl" />
            <div className="relative flex flex-1 flex-col">
              <p className="flex items-center gap-1.5 text-[17px] font-semibold leading-snug">
                <CalendarClock size={17} />
                {row.isLapsed ? "Plan has expired" : isLive ? "Plan is live" : `Plan is ${String(row.status || "").toLowerCase()}`}
              </p>
              <p className="mt-1 text-[12.5px] text-white/85">
                {totalDays != null ? `${totalDays}-day term · ${row.mode || "IMMEDIATE"}` : "No end date on this plan"}
              </p>

              <div className="flex flex-1 items-center justify-center py-4">
                <div className="relative h-36 w-36">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={ringLen}
                      strokeDashoffset={ringLen * (1 - (row.isLapsed ? 0 : remainingPct) / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[28px] font-bold leading-none">
                      {row.isLapsed ? "0" : row.daysRemaining ?? "∞"}
                    </span>
                    <span className="mt-1 text-[10.5px] text-white/80">days left</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Start", formatDate(row.startDate)],
                  ["End", row.endDate ? formatDate(row.endDate) : "—"],
                  ["Used", `${Math.round(row.isLapsed ? 100 : elapsedPct)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/20 px-2 py-2.5 text-center backdrop-blur-sm">
                    <p className="truncate text-[13px] font-bold leading-none">{value}</p>
                    <p className="mt-1 text-[10.5px] text-white/80">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — amount split · plan & term · references */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
          <Card icon={PieIcon} tint="amber" title="Amount Split" subtitle="Where the payable amount goes" className="xl:col-span-4">
            {pieData.length > 0 ? (
              <>
                <div className="flex flex-1 items-center justify-center">
                  <div className="relative h-40 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="96%" paddingAngle={3} cornerRadius={6}>
                          {pieData.map((s) => (
                            <Cell key={s.name} fill={s.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[16px] font-bold text-neutral-900 dark:text-neutral-50">{formatCurrency(p.totalPayable)}</span>
                      <span className="text-[10px] text-neutral-500">Total</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {pieData.map((s) => (
                    <div key={s.name} className={`px-2 py-2 text-center ${innerTile}`}>
                      <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-neutral-500">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] font-bold text-neutral-900 dark:text-neutral-50">{formatCurrency(s.value)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={`flex flex-1 items-center justify-center p-6 text-center text-[12px] text-neutral-500 ${innerTile}`}>
                No pricing breakdown is stored on this record.
              </div>
            )}
          </Card>

          <Card icon={Layers} tint="emerald" title="Plan & Term" subtitle={row.plan?.name ? `${row.plan.name} · ${row.plan.type}` : null} className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Field label="List price" value={row.plan?.price != null ? formatCurrency(row.plan.price) : null} />
              <Field label="Mode" value={row.mode} />
              <Field label="Duration" value={row.durationValue != null ? `${row.durationValue} ${row.durationUnit || ""}`.trim() : null} />
              <Field label="Term days" value={row.termDays} />
              <Field icon={Calendar} label="Start" value={formatDateTime(row.startDate)} />
              <Field icon={CalendarClock} label="End" value={formatDateTime(row.endDate)} />
              <Field label="Created on" value={formatDateTime(row.createdAt)} />
              <Field label="Upgrades" value={row.numberOfUpgrade} />
            </div>
          </Card>

          <Card icon={Hash} tint="violet" title="References" subtitle="Click any id to copy" className="md:col-span-2 xl:col-span-4">
            <div className="space-y-2">
              <CopyableId label="Subscription record ID" value={row._id} />
              <CopyableId label="Invoice number" value={inv.invoiceId} />
              <CopyableId label="Transaction ID" value={inv.transactionId} />
              <CopyableId label="Plan ID" value={pick(idOf(row.plan), idOf(row.subscriptionId))} />
            </div>
          </Card>
        </div>

        {/* Row 4 — brand · admin grant */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card
            icon={Building2}
            tint="sky"
            title="Brand"
            subtitle={brandName}
            className={adminNote || grantedBy ? "xl:col-span-8" : "xl:col-span-12"}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Field label="Brand name" value={row.brand?.brandName} />
              <Field label="Merchant ID" value={merchantId} mono />
              <Field label="Brand ID" value={row.brand?._id} mono />
              <Field label="Sub-brands used" value={row.brand?.subBrandsUsed != null ? `${row.brand.subBrandsUsed} / ${row.brand.subBrandsLimit || "∞"}` : null} />
              <Field label="Franchises used" value={row.brand?.franchisesUsed != null ? `${row.brand.franchisesUsed} / ${row.brand.franchisesLimit || "∞"}` : null} />
            </div>
          </Card>

          {(adminNote || grantedBy) && (
            <Card icon={UserCog} tint="violet" title="Admin Grant" subtitle="Why this plan was given" className="xl:col-span-4">
              {adminNote && (
                <p className={`mb-3 px-3.5 py-3 text-[12.5px] italic leading-relaxed text-neutral-700 dark:text-neutral-300 ${innerTile}`}>
                  “{adminNote}”
                </p>
              )}
              <Field label="Granted by (admin ID)" value={grantedBy} mono />
            </Card>
          )}
        </div>

        {/* Row 5 — every field the API returned, so nothing the backend adds
            is ever hidden behind a missing label above. */}
        <div className={`${glassClass} p-5`}>
          <button type="button" onClick={() => setShowRaw((v) => !v)} className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[14px] font-bold text-neutral-900 dark:text-neutral-50">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${CARD_TINTS.neutral}`}>
                <Braces size={14} />
              </span>
              All Fields
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-500 dark:bg-neutral-800">
                {rawFields.length}
              </span>
            </span>
            <ChevronDown size={15} className={`text-neutral-400 transition-transform ${showRaw ? "rotate-180" : ""}`} />
          </button>
          {showRaw && (
            <div className="mt-4 grid grid-cols-1 gap-1.5 md:grid-cols-2">
              {rawFields.map(([k, v]) => (
                <div key={k} className={`flex items-start justify-between gap-3 px-3 py-2 text-[11.5px] ${innerTile}`}>
                  <span className="shrink-0 font-mono text-neutral-500">{k}</span>
                  <span className="break-all text-right font-mono text-neutral-800 dark:text-neutral-200">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
