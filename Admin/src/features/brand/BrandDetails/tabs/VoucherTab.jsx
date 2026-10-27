import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, Ticket, RefreshCw } from "lucide-react";
import { EmptyState } from "../../BrandShared";
import CommonEmptyState from "../../../../components/common/EmptyState";
import Loader from "../../../../components/common/Loader";
import { glassClass } from "../components/bentoStyles";
import { useBrandVoucherList } from "../detailsUtils";
import VoucherCard from "../../../voucher/components/VoucherCard";
import { apiVersionToRow } from "../../../voucher/voucherUtils";

/* -------------------------------------------------------------------------
 * Voucher tab — this brand's vouchers (GET /vouchers/versions/get-all
 * ?brandId=…) as the shared VoucherCard (same card as the Vouchers pages),
 * with status filter chips + search, 10 at a time ("Show more"). Clicking
 * a card opens the voucher on the Vouchers page; its Back returns here.
 * ---------------------------------------------------------------------- */

const PAGE_STEP = 10;

const STATUS_ORDER = ["PUBLISHED", "APPROVED", "UNDER_REVIEW", "PAUSED", "DRAFT", "REJECTED", "EXPIRED", "ARCHIVED"];
const statusLabel = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function VoucherTab({ brand }) {
  const { vouchers, total, loading, error, refetch } = useBrandVoucherList(brand.id);
  const navigate = useNavigate();
  // Opens the voucher (by version id) on the Vouchers page; its Back
  // returns here, to this brand's Voucher tab.
  const openVoucher = (row) => navigate(`/vendor-listing?open=${row.id}`);

  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_STEP);

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
  // Same row shape the Vouchers pages use, so the shared card fits.
  const shown = useMemo(() => filtered.slice(0, visible).map(apiVersionToRow), [filtered, visible]);

  if (loading) return <Loader label="Loading vouchers…" />;

  if (error) {
    return (
      <CommonEmptyState
        variant="compact"
        tone="error"
        icon="error"
        title="Couldn't load vouchers"
        description={error}
        action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
      />
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

      {/* Cards — the shared VoucherCard, view-only here (just opens) */}
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((row) => (
            <VoucherCard key={row.id} voucher={row} onOpen={openVoucher} />
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
