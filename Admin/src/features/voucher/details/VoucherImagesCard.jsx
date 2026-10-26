import { useState } from "react";
import { createPortal } from "react-dom";
import { Images, X, LayoutGrid, Image as ImageIcon } from "lucide-react";
import VoucherImageGallery from "../VoucherImageGallery";
import useBackLayer from "../../../lib/useBackLayer";
import { DetailCard } from "./DetailsUI";

/* -------------------------------------------------------------------------
 * Images on the voucher details page, bento style: up to 3 tiles (one big,
 * two stacked). With more than 3, the 3rd tile shows "+N · View all".
 * Any tile / "View all" opens the full "All images" view — the existing
 * VoucherImageGallery (full-size viewer + drag to reorder, unchanged).
 * ---------------------------------------------------------------------- */

const PREVIEW = 3;

// Full-screen "All images" page over the details page (Back / Esc / ✕ close).
function AllImagesView({ images, title, onReorder, lockedReason, onClose }) {
  useBackLayer(true, onClose);
  return createPortal(
    <div className="fixed inset-0 z-40 overflow-y-auto bg-neutral-100/95 backdrop-blur-sm dark:bg-neutral-950/95">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
              <Images size={16} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-neutral-900 dark:text-neutral-50">All images</p>
              <p className="truncate text-[12px] text-neutral-500">
                {title} · {images.length} image{images.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close all images"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 shadow-sm hover:text-neutral-900 dark:bg-neutral-900 dark:text-neutral-300"
          >
            <X size={16} />
          </button>
        </div>
        <VoucherImageGallery
          key={images.map((img) => img.id || img.url).join("|")}
          images={images}
          title={title}
          onReorder={onReorder}
          lockedReason={lockedReason}
        />
      </div>
    </div>,
    document.body
  );
}

function Tile({ img, label, className = "", onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group relative overflow-hidden rounded-2xl bg-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:bg-neutral-800 ${className}`}
    >
      <img src={img.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      {children}
    </button>
  );
}

export default function VoucherImagesCard({ images = [], title, onReorder, lockedReason }) {
  const [showAll, setShowAll] = useState(false);
  const count = images.length;
  const shown = images.slice(0, PREVIEW);
  const extra = count - PREVIEW;
  const open = () => setShowAll(true);

  return (
    <DetailCard
      icon={ImageIcon}
      tint="emerald"
      title="Images"
      subtitle={count ? `${count} image${count === 1 ? "" : "s"}${onReorder && !lockedReason ? " · open View all to reorder" : ""}` : "None uploaded"}
      right={
        count > 0 && (
          <button
            onClick={open}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <LayoutGrid size={12} /> View all
          </button>
        )
      }
    >
      {count === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-2xl bg-neutral-50 text-[12px] text-neutral-500 dark:bg-neutral-950/60">
          <ImageIcon size={20} className="text-neutral-400" />
          No images uploaded for this voucher.
        </div>
      ) : count === 1 ? (
        <Tile img={shown[0]} label="View image 1" onClick={open} className="block aspect-[16/8] w-full" />
      ) : count === 2 ? (
        <div className="grid h-60 grid-cols-2 gap-2">
          {shown.map((img, i) => (
            <Tile key={img.id || img.url || i} img={img} label={`View image ${i + 1}`} onClick={open} />
          ))}
        </div>
      ) : (
        // One big tile + two stacked; the 3rd says "+N · View all" when there are more.
        <div className="grid h-60 grid-cols-3 grid-rows-2 gap-2 sm:h-64">
          <Tile img={shown[0]} label="View image 1" onClick={open} className="col-span-2 row-span-2" />
          <Tile img={shown[1]} label="View image 2" onClick={open} />
          <Tile img={shown[2]} label={extra > 0 ? `View all ${count} images` : "View image 3"} onClick={open}>
            {extra > 0 && (
              <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-white backdrop-blur-[1px]">
                <span className="text-[22px] font-bold leading-none">+{extra}</span>
                <span className="mt-1 text-[11px] font-medium text-white/85">View all</span>
              </span>
            )}
          </Tile>
        </div>
      )}

      {showAll && (
        <AllImagesView images={images} title={title} onReorder={onReorder} lockedReason={lockedReason} onClose={() => setShowAll(false)} />
      )}
    </DetailCard>
  );
}
