import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Tag, AlertTriangle, Store, Search, ChevronRight, ChevronDown, Ticket, Clock3 } from "lucide-react";
import { EmptyState } from "../../BrandShared";
import Loader from "../../../../components/common/Loader";
import VoucherStatusPill from "../components/VoucherStatusPill";
import { glassClass } from "../components/bentoStyles";
import { useBrandVoucherList } from "../detailsUtils";

/* -------------------------------------------------------------------------
 * Voucher tab — this brand's vouchers (GET /vouchers/versions/get-all
 * ?brandId=…) as coupon tickets in a 2-column grid, with status filter
 * chips + search, 10 at a time ("Show more"). Clicking a ticket opens the
 * voucher on the Vouchers page; its Back returns here.
 * ---------------------------------------------------------------------- */

const PAGE_STEP = 10;
const DAY = 24 * 60 * 60 * 1000;

// Stub colour per status, so a ticket reads at a glance.
const STUB = {
  PUBLISHED: "from-emerald-400 to-emerald-500 text-neutral-950",
  APPROVED: "from-sky-400 to-sky-500 text-white",
  UNDER_REVIEW: "from-amber-300 to-amber-400 text-neutral-950",
  PAUSED: "from-orange-300 to-orange-400 text-neutral-950",
  REJECTED: "from-red-400 to-red-500 text-white",
};
const STUB_MUTED = "from-neutral-300 to-neutral-400 text-neutral-800 dark:from-neutral-700 dark:to-neutral-600 dark:text-neutral-100";

const STATUS_ORDER = ["PUBLISHED", "APPROVED", "UNDER_REVIEW", "PAUSED", "DRAFT", "REJECTED", "EXPIRED", "ARCHIVED"];
const statusLabel = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

function discountText(offer) {
  if (!offer) return { big: "", small: "No offer" };
  return offer.discountType === "PERCENTAGE"
    ? { big: `${offer.discountValue}%`, small: "Off" }
    : { big: rupees(offer.discountValue), small: "Flat off" };
}

// "12 days left" / "Starts in 3 days" / "Ended" — from the voucher's dates.
function timeChip(voucher, now) {
  const start = voucher.startAt ? new Date(voucher.startAt).getTime() : null;
  const end = voucher.endAt ? new Date(voucher.endAt).getTime() : null;
  if (start && start > now) {
    const d = Math.ceil((start - now) / DAY);
    return { text: d <= 1 ? "Starts tomorrow" : `Starts in ${d} days`, tone: "bg-sky-400/10 text-sky-600 dark:text-sky-400" };
  }
  if (!end) return null;
  if (end < now) return { text: "Ended", tone: "bg-neutral-200/70 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" };
  const d = Math.ceil((end - now) / DAY);
  return {
    text: d <= 1 ? "Ends today" : `${d} days left`,
    tone: d <= 7 ? "bg-amber-400/10 text-amber-600 dark:text-amber-400" : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  };
}

/* A coupon ticket: coloured discount stub with punched notches, a dashed
 * tear line, then the details. The whole ticket opens the voucher. */
function VoucherTicketCard({ voucher, now, onOpen }) {
  const offer = voucher.offers?.[0];
  const { big, small } = discountText(offer);
  const chip = timeChip(voucher, now);
  const start = fmtDate(voucher.startAt);
  const end = fmtDate(voucher.endAt);
  const terms = [
    offer?.minBillAmount ? `Min bill ${rupees(offer.minBillAmount)}` : null,
    offer?.maxDiscountAmount && offer.discountType === "PERCENTAGE" ? `Up to ${rupees(offer.maxDiscountAmount)}` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open voucher details"
      className={`${glassClass} group flex w-full overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(16,185,129,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60`}
    >
      {/* Stub */}
      <div className={`relative flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 bg-gradient-to-br px-2 py-4 ${STUB[voucher.status] || STUB_MUTED}`}>
        {big && <p className="text-[21px] font-extrabold leading-none tabular-nums">{big}</p>}
        {small && <p className="text-[9.5px] font-semibold uppercase tracking-wide opacity-75">{small}</p>}
        <span className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-neutral-100 dark:bg-neutral-950" />
        <span className="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-neutral-100 dark:bg-neutral-950" />
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-l border-dashed border-neutral-300 p-3.5 dark:border-neutral-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-1 text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50" title={voucher.name}>
              {voucher.name || "Untitled voucher"}
            </p>
            {voucher.versionCode && (
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[10.5px] normal-case text-neutral-400">
                <Tag size={10} /> {voucher.versionCode}
              </p>
            )}
          </div>
          <VoucherStatusPill status={voucher.status} />
        </div>

        {terms.length > 0 && <p className="text-[11.5px] text-neutral-600 dark:text-neutral-300">{terms.join(" · ")}</p>}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-neutral-500">
          {(start || end) && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {start || "No start date"} → {end || "No end"}
            </span>
          )}
          {chip && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${chip.tone}`}>
              <Clock3 size={10} /> {chip.text}
            </span>
          )}
          {voucher.category?.name && (
            <span className="flex items-center gap-1">
              <Store size={11} />
              {voucher.category.name}
              {voucher.subCategory?.name ? ` · ${voucher.subCategory.name}` : ""}
            </span>
          )}
          {voucher.offers?.length > 1 && (
            <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
              +{voucher.offers.length - 1} more offer{voucher.offers.length > 2 ? "s" : ""}
            </span>
          )}
          <ChevronRight size={14} className="ml-auto shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500" />
        </div>
      </div>
    </button>
  );
}

export default function VoucherTab({ brand }) {
  const { vouchers, total, loading, error } = useBrandVoucherList(brand.id);
  const navigate = useNavigate();
  // Opens the voucher (by version id) on the Vouchers page; its Back
  // returns here, to this brand's Voucher tab.
  const openVoucher = (v) => navigate(`/vendor-listing?open=${v._id}`);

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_STEP);
  const [now] = useState(() => Date.now());

  // Only statuses that actually occur, in a sensible order.
  const statusCounts = useMemo(() => {
    const c = {};
    vouchers.forEach((v) => {
      c[v.status] = (c[v.status] || 0) + 1;
    });
    return c;
  }, [vouchers]);
  const chips = [
    ["ALL", "All", vouchers.length],
    ...STATUS_ORDER.filter((s) => statusCounts[s]).map((s) => [s, statusLabel(s), statusCounts[s]]),
    ...Object.keys(statusCounts)
      .filter((s) => !STATUS_ORDER.includes(s))
      .map((s) => [s, statusLabel(s) || "Unknown", statusCounts[s]]),
  ];

  const q = search.trim().toLowerCase();
  const filtered = vouchers.filter(
    (v) =>
      (status === "ALL" || v.status === status) &&
      (!q || [v.name, v.versionCode, v.category?.name, v.subCategory?.name].some((x) => String(x || "").toLowerCase().includes(q)))
  );
  const shown = filtered.slice(0, visible);

  if (loading) return <Loader label="Loading vouchers…" />;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
        <AlertTriangle size={14} className="shrink-0" />
        Failed to load vouchers: {error}
      </div>
    );
  }

  if (!vouchers.length) return <EmptyState label="No vouchers created by this brand yet." />;

  const setFilter = (key) => {
    setStatus(key);
    setVisible(PAGE_STEP);
  };

  return (
    <div className="space-y-4">
      {/* Header: title + count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <Ticket size={16} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Vouchers</p>
            <p className="text-[12px] text-neutral-500">
              {total} voucher{total === 1 ? "" : "s"} · {statusCounts.PUBLISHED || 0} published
              {total > vouchers.length ? ` · showing the latest ${vouchers.length}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Status chips + search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className={`${glassClass} no-scrollbar flex w-fit max-w-full items-center gap-1 overflow-x-auto !rounded-full p-1`}>
          {chips.map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                status === key ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {label} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
        <div className={`${glassClass} flex items-center gap-2 !rounded-full px-3.5 py-2 sm:w-64`}>
          <Search size={14} className="shrink-0 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisible(PAGE_STEP);
            }}
            placeholder="Search vouchers…"
            className="w-full bg-transparent text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
          />
        </div>
      </div>

      {/* Tickets */}
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((v) => (
            <VoucherTicketCard key={v._id} voucher={v} now={now} onOpen={() => openVoucher(v)} />
          ))}
        </div>
      ) : (
        <EmptyState label="No vouchers match this filter." />
      )}

      {filtered.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((n) => n + PAGE_STEP)}
          className="mx-auto flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-4 py-2 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
        >
          <ChevronDown size={13} /> Show {Math.min(PAGE_STEP, filtered.length - visible)} more ({filtered.length - visible} left)
        </button>
      )}
    </div>
  );
}
