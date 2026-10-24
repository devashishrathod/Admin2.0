import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Image as ImageIcon,
  FileVideo,
  Play,
  Pencil,
  Repeat,
  Trash2,
  Loader2,
  Film,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Full-screen gallery for one showcase album — handles albums with many
 * photos/videos:
 *   • grid   — thumbnails, 24 per page (Prev / Next), filter All / Photos / Videos
 *   • viewer — one item large, ‹ › (or ← →) to move, thumbnail strip below,
 *              Edit / Replace / Video clips / Delete for the current item
 * Reads the live `media` list, so edits/deletes show as soon as the
 * showcase cache refreshes. Esc goes viewer → grid → closed.
 * ---------------------------------------------------------------------- */

// Thumbnails per grid page (3 rows of 8 on wide screens).
const GRID_PAGE_SIZE = 24;

const FILTERS = [
  ["all", "All"],
  ["photo", "Photos"],
  ["video", "Videos"],
];

function formatDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// Small thumbnail: image, video poster (or first frame), or a placeholder.
function Thumb({ media, className = "" }) {
  if (!media.url) {
    return (
      <div className={`flex items-center justify-center bg-neutral-800 text-neutral-500 ${className}`}>
        {media.isVideo ? <FileVideo size={16} /> : <ImageIcon size={16} />}
      </div>
    );
  }
  if (media.isVideo) {
    return media.thumbnail ? (
      <img src={media.thumbnail} alt="" className={`object-cover ${className}`} />
    ) : (
      <video src={media.url} muted playsInline preload="metadata" className={`object-cover ${className}`} />
    );
  }
  return <img src={media.url} alt={media.altText || ""} loading="lazy" className={`object-cover ${className}`} />;
}

const barBtn =
  "flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60";

export default function ShowcaseGallery({
  title,
  media,
  startIndex = 0,
  startMode = "viewer",
  readOnly = false,
  busy = {},
  onClose,
  onEdit,
  onReplace,
  onDelete,
  onToggleClips,
}) {
  const [mode, setMode] = useState(startMode);
  const [filter, setFilter] = useState("all");
  const [index, setIndex] = useState(startIndex);
  const fileRef = useRef(null);
  const stripRef = useRef(null);

  const counts = useMemo(
    () => ({ all: media.length, photo: media.filter((m) => !m.isVideo).length, video: media.filter((m) => m.isVideo).length }),
    [media]
  );
  const list = useMemo(
    () => (filter === "photo" ? media.filter((m) => !m.isVideo) : filter === "video" ? media.filter((m) => m.isVideo) : media),
    [media, filter]
  );
  // Clamp: the list can shrink under us after a delete.
  const safeIndex = Math.min(index, Math.max(0, list.length - 1));
  const current = list[safeIndex];

  // Grid is paged (GRID_PAGE_SIZE per page) so a big album stays light.
  const [page, setPage] = useState(() => Math.floor(startIndex / GRID_PAGE_SIZE));
  const pageCount = Math.max(1, Math.ceil(list.length / GRID_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * GRID_PAGE_SIZE;
  const pageItems = list.slice(pageStart, pageStart + GRID_PAGE_SIZE);
  // Back to the grid on the page that holds the item being viewed.
  const showGrid = () => {
    setPage(Math.floor(safeIndex / GRID_PAGE_SIZE));
    setMode("grid");
  };

  const go = (delta) => setIndex((i) => (list.length ? (Math.min(i, list.length - 1) + delta + list.length) % list.length : 0));

  // Nothing left (last item deleted) → close.
  useEffect(() => {
    if (!media.length) onClose();
  }, [media.length, onClose]);

  // Keyboard: ← → in the viewer; Esc steps back.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === "Escape") {
        if (mode === "viewer" && startMode === "grid") showGrid();
        else onClose();
      } else if (mode === "viewer" && e.key === "ArrowRight") go(1);
      else if (mode === "viewer" && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Lock page scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Keep the active thumbnail in view.
  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-idx="${safeIndex}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [safeIndex, mode]);

  const openAt = (i) => {
    setIndex(i);
    setMode("viewer");
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-neutral-950/95 normal-case text-white backdrop-blur-md">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{title}</p>
          <p className="text-[11.5px] text-white/50">
            {mode === "viewer" && current
              ? `${safeIndex + 1} / ${list.length} · ${current.isVideo ? "Video" : "Photo"}${current.title ? ` · ${current.title}` : ""}`
              : `${counts.photo} photo${counts.photo === 1 ? "" : "s"} · ${counts.video} video${counts.video === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setIndex(0);
                setPage(0);
              }}
              disabled={!counts[key]}
              className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors disabled:opacity-40 ${
                filter === key ? "bg-white text-neutral-900" : "text-white/70 hover:text-white"
              }`}
            >
              {label} <span className="opacity-60">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {mode === "viewer" && current && !readOnly && (
            <>
              {current.isVideo && (
                <button
                  type="button"
                  onClick={() => onToggleClips(current)}
                  disabled={busy.togglingClips}
                  className={`${barBtn} ${current.isShowInVideoClips ? "!bg-emerald-400/20 text-emerald-300" : ""}`}
                >
                  {busy.togglingClips ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                  <span className="hidden md:inline">{current.isShowInVideoClips ? "In video clips" : "Show in clips"}</span>
                </button>
              )}
              <button type="button" onClick={() => onEdit(current)} className={barBtn}>
                <Pencil size={13} />
                <span className="hidden md:inline">Edit</span>
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy.replacing} className={barBtn}>
                {busy.replacing ? <Loader2 size={13} className="animate-spin" /> : <Repeat size={13} />}
                <span className="hidden md:inline">Replace</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(current)}
                disabled={busy.deletingId === current.id}
                className={`${barBtn} !bg-red-500/20 text-red-300 hover:!bg-red-500/30`}
              >
                {busy.deletingId === current.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span className="hidden md:inline">Delete</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onReplace(current, file);
                }}
              />
            </>
          )}
          {mode === "viewer" && (
            <button type="button" onClick={showGrid} className={barBtn} title="Show all as a grid">
              <LayoutGrid size={14} />
              <span className="hidden md:inline">All</span>
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close gallery" className={`${barBtn} w-9 justify-center !px-0`}>
            <X size={16} />
          </button>
        </div>
      </div>

      {mode === "grid" ? (
        /* Grid — one page of items */
        <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          {list.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {pageItems.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openAt(pageStart + i)}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10 transition-all hover:ring-2 hover:ring-emerald-400"
                >
                  <Thumb media={m} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
                  {m.isVideo && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium">
                      <Play size={9} fill="currentColor" />
                      {formatDuration(m.duration) || "Video"}
                    </span>
                  )}
                  {!m.isActive && (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">Inactive</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-[13px] text-white/50">Nothing in this filter.</p>
          )}

          {pageCount > 1 && (
            <div className="mt-auto flex items-center justify-center gap-3 pt-5">
              <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage === 0} className={`${barBtn} disabled:opacity-30`}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-[12px] tabular-nums text-white/60">
                {pageStart + 1}–{pageStart + pageItems.length} of {list.length}
                <span className="mx-1.5 text-white/30">·</span>
                Page {safePage + 1} / {pageCount}
              </span>
              <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount - 1} className={`${barBtn} disabled:opacity-30`}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Viewer — current item */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-4 sm:px-16">
            {current ? (
              !current.url ? (
                <div className="flex flex-col items-center gap-2 text-white/50">
                  {current.isVideo ? <FileVideo size={28} /> : <ImageIcon size={28} />}
                  <span className="text-[12px]">No preview</span>
                </div>
              ) : current.isVideo ? (
                <video key={current.id} src={current.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-2xl bg-black" />
              ) : (
                <img key={current.id} src={current.url} alt={current.altText || ""} className="max-h-full max-w-full rounded-2xl object-contain" />
              )
            ) : null}

            {list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:left-4"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-4"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
            {current && !current.isActive && (
              <span className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-amber-400/20 px-3 py-1 text-[11px] font-semibold text-amber-300">
                Inactive — hidden from customers
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          {list.length > 1 && (
            <div ref={stripRef} className="no-scrollbar flex gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 sm:px-6">
              {list.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  data-idx={i}
                  onClick={() => setIndex(i)}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all ${
                    i === safeIndex ? "ring-2 ring-emerald-400" : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <Thumb media={m} className="h-full w-full" />
                  {m.isVideo && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Play size={14} fill="currentColor" className="drop-shadow" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>,
    document.body
  );
}
