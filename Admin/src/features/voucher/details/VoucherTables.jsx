import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Percent, Layers3, ChevronLeft, ChevronRight } from "lucide-react";
import { isMissing, orText, MISSING } from "../../../utils/helpers";
import { VoucherStatusBadge } from "../components/VoucherBadges";
import { DetailCard } from "./DetailsUI";
import { ACCENT_STYLES } from "./detailsConstants";

/* Full-width tables under the two columns: this version's offers, then
 * every version of the voucher. One colour per row (fixed order, never
 * cycled per render) so rows are easy to tell apart. Display only. */

const th = "px-3 py-2.5 font-semibold";

const humanize = (v) =>
  v ? String(v).toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : null;

// One offer as a coupon tile: big discount stub | title + terms, then the
// usage / applies-on facts and Active state. The accent colour (fixed
// order) matches the offer's slot.
function OfferTile({ offer, index }) {
  const accent = ACCENT_STYLES[index % ACCENT_STYLES.length];
  const pct = offer.discountType === "PERCENTAGE";
  return (
    // Width = exactly 3 per row on wide screens (2 on tablets, ~1 on
    // phones); gap-3 → the two gaps are subtracted before dividing.
    <div
      className={`flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white/70 ring-1 ring-neutral-200/60 sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)] dark:bg-neutral-950/50 dark:ring-white/5 ${
        offer.isActive ? "" : "opacity-70"
      }`}
    >
      <div className="flex flex-1">
        {/* Discount stub */}
        <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-emerald-400/10 px-2 py-3.5 text-emerald-700 dark:text-emerald-300">
          <span className="text-[21px] font-extrabold leading-none tracking-tight">{pct ? `${offer.discountValue}%` : `₹${offer.discountValue}`}</span>
          <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-wider opacity-80">{pct ? "Off" : "Flat off"}</span>
        </div>
        {/* Title (full, up to 2 lines) + terms */}
        <div className="min-w-0 flex-1 border-l border-dashed border-emerald-400/40 px-3.5 py-3">
          <p className="flex items-start gap-1.5 text-[13.5px] font-semibold leading-snug text-neutral-900 dark:text-neutral-50" title={offer.title}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
            <span className="line-clamp-2 break-words">{offer.title || `Offer ${index + 1}`}</span>
          </p>
          <p className="mt-1.5 text-[11.5px] leading-snug text-neutral-500">
            {isMissing(offer.minBillAmount) ? "No minimum bill" : `Min bill ₹${offer.minBillAmount}`}
            {" · "}
            {isMissing(offer.maxDiscountAmount) ? "No cap" : `Up to ₹${offer.maxDiscountAmount} off`}
          </p>
        </div>
      </div>
      {/* Facts row: usage · applies on · active */}
      <div className="flex items-center gap-3 border-t border-neutral-200/60 px-3.5 py-2 text-[11.5px] dark:border-white/5">
        <span className="min-w-0 truncate text-neutral-500">
          <span className="text-neutral-400">Usage </span>
          <b className="font-semibold text-neutral-700 dark:text-neutral-200">{humanize(offer.usageType) || "—"}</b>
        </span>
        <span className="min-w-0 truncate text-neutral-500">
          <span className="text-neutral-400">On </span>
          <b className="font-semibold text-neutral-700 dark:text-neutral-200">{humanize(offer.discountApplicableOn) || "—"}</b>
        </span>
        <span
          title={offer.isActive ? "Active" : "Inactive"}
          className={`ml-auto inline-flex shrink-0 items-center gap-1 font-semibold ${
            offer.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"
          }`}
        >
          {offer.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
          {offer.isActive ? "Active" : "Inactive"}
        </span>
      </div>
    </div>
  );
}

// Offers on this version — one row of coupon tiles, exactly 3 in view on
// wide screens; any more scroll sideways (snapping per tile).
export function OffersCard({ offers }) {
  const count = offers?.length ?? 0;
  const active = offers?.filter((o) => o.isActive).length ?? 0;
  const rowRef = useRef(null);
  // ‹ › buttons only when the row actually overflows (more than fit).
  const [scroll, setScroll] = useState({ overflow: false, atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScroll({ overflow: max > 2, atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2 });
  }, []);

  useEffect(() => {
    measure();
    const el = rowRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, count]);

  // One "page" (the visible width) per click; snapping lines the tiles up.
  const page = (dir) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth, behavior: "smooth" });
  const navBtn =
    "flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

  return (
    <DetailCard
      icon={Percent}
      tint="emerald"
      title="Offers"
      subtitle={count ? `${count} on this version · ${active} active` : "None on this version"}
      right={
        scroll.overflow && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => page(-1)} disabled={scroll.atStart} aria-label="Previous offers" className={navBtn}>
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => page(1)} disabled={scroll.atEnd} aria-label="More offers" className={navBtn}>
              <ChevronRight size={16} />
            </button>
          </div>
        )
      }
    >
      {count ? (
        <div ref={rowRef} onScroll={measure} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
          {offers.map((o, i) => (
            <OfferTile key={o._id || i} offer={o} index={i} />
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-neutral-500">No offers on this version.</p>
      )}
    </DetailCard>
  );
}

export function VersionsCard({ versions, versionCount, viewingId }) {
  return (
    <DetailCard icon={Layers3} tint="violet" title="Version history" subtitle={`${versionCount ?? versions.length} version${(versionCount ?? versions.length) === 1 ? "" : "s"}`} bodyClass="">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-[12.5px]">
          <thead className="bg-neutral-50 text-[10.5px] uppercase tracking-wide text-neutral-400 dark:bg-neutral-950/60">
            <tr>
              <th className={`${th} pl-5`}>Version</th>
              <th className={th}>Status</th>
              <th className={th}>Validity</th>
              <th className={`${th} pr-5 text-right`}>Claims</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v, i) => {
              const accent = ACCENT_STYLES[i % ACCENT_STYLES.length];
              const viewing = v.id === viewingId;
              return (
                <tr key={v.id} className={`border-t border-neutral-100 dark:border-neutral-800 ${viewing ? "bg-emerald-400/[0.05]" : ""}`}>
                  <td className={`border-l-4 px-5 py-3 ${accent.left}`}>
                    <span className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${accent.dot}`} />
                      {orText(v.versionCode, "No code")}
                      {viewing && (
                        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Viewing</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <VoucherStatusBadge status={v.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-neutral-600 dark:text-neutral-300">
                    {orText(v.startDate, MISSING.date)} → {orText(v.endDate, "No end date")}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-200">{v.claimCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DetailCard>
  );
}
