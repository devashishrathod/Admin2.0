import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, GripVertical, Maximize2, Loader2, Save, RotateCcw, CheckCircle2, AlertTriangle, ImagePlus, Play, XCircle as XCircleIcon } from "lucide-react";

/* -------------------------------------------------------------------------
 * VoucherImageGallery — the images block on a voucher's details page.
 *
 *  - Click an image → full-size viewer (prev / next, ← → keys, Esc closes).
 *  - Drag an image onto another to reorder. The new order is only sent
 *    when the admin clicks "Save order" (not on every drop); "Reset" puts
 *    it back. Saving calls onReorder(imageIds) — see reorderVoucherImages.
 *  - Reordering needs every image's id; if any is missing it's disabled.
 *  - The parent keys this component on the image list, so fresh images from
 *    the server (e.g. after a save + refetch) remount it with the new order.
 * ---------------------------------------------------------------------- */

const sameOrder = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export default function VoucherImageGallery({ images = [], title = "Voucher", onReorder, lockedReason }) {
  const [order, setOrder] = useState(images);
  const [viewIndex, setViewIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { ok, text }


  const canReorder = Boolean(onReorder) && !lockedReason && order.length > 1 && order.every((img) => img.id);
  const dirty = !sameOrder(order.map((i) => i.id || i.url), images.map((i) => i.id || i.url));

  // Viewer keyboard controls
  useEffect(() => {
    if (viewIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setViewIndex(null);
      if (e.key === "ArrowRight") setViewIndex((i) => (i + 1) % order.length);
      if (e.key === "ArrowLeft") setViewIndex((i) => (i - 1 + order.length) % order.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewIndex, order.length]);

  const moveTo = (from, to) => {
    if (from === null || to === null || from === to) return;
    setOrder((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onReorder(order.map((img) => img.id));
      setMessage({ ok: true, text: "Image order saved." });
    } catch (err) {
      setMessage({ ok: false, text: err.message || "Couldn't save the new order." });
    } finally {
      setSaving(false);
    }
  };

  if (!order.length) return null;
  const viewed = viewIndex !== null ? order[viewIndex] : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] text-neutral-500">
          {canReorder
            ? "Drag images to change their order · #1 is shown to customers when there's no approved banner · click to view"
            : lockedReason
            ? `Click an image to view it · ${lockedReason}`
            : "Click an image to view it full size"}
        </p>
        {dirty && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setOrder(images);
                setMessage(null);
              }}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11.5px] font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RotateCcw size={11} /> Reset
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 rounded-lg bg-emerald-400 px-2.5 py-1 text-[11.5px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-60"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save order
            </button>
          </div>
        )}
      </div>

      {message && (
        <p className={`mb-2 flex items-center gap-1.5 text-[12px] ${message.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {message.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {message.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {order.map((img, i) => (
          <div
            key={img.id || img.url || i}
            draggable={canReorder}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              moveTo(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`group relative aspect-video overflow-hidden rounded-xl bg-neutral-200 transition-all dark:bg-neutral-800 ${
              canReorder ? "cursor-grab active:cursor-grabbing" : ""
            } ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== i ? "ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-neutral-950" : ""}`}
          >
            <button onClick={() => setViewIndex(i)} className="block h-full w-full" aria-label={`View image ${i + 1}`}>
              <img src={img.url} alt={`${title} ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
            </button>
            <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
              #{i + 1}
            </span>
            {canReorder && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <GripVertical size={13} />
              </span>
            )}
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 size={11} />
            </span>
          </div>
        ))}
      </div>

      {/* Full-size viewer */}
      {viewed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4" onClick={() => setViewIndex(null)}>
          <div className="relative flex max-h-full w-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex w-full items-center justify-between text-white">
              <p className="text-[13px] font-medium">
                {title} · {viewIndex + 1} / {order.length}
              </p>
              <button onClick={() => setViewIndex(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <X size={17} />
              </button>
            </div>
            <img src={viewed.url} alt={`${title} ${viewIndex + 1}`} className="max-h-[75vh] w-auto rounded-xl object-contain" />
            {order.length > 1 && (
              <>
                <button
                  onClick={() => setViewIndex((viewIndex - 1 + order.length) % order.length)}
                  aria-label="Previous image"
                  className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:-left-14"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setViewIndex((viewIndex + 1) % order.length)}
                  aria-label="Next image"
                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:-right-14"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="mt-3 flex gap-1.5 overflow-x-auto">
                  {order.map((img, i) => (
                    <button
                      key={img.id || img.url || i}
                      onClick={() => setViewIndex(i)}
                      className={`h-12 w-20 shrink-0 overflow-hidden rounded-lg ring-2 ${i === viewIndex ? "ring-emerald-400" : "ring-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * BannerAddModal — opened from the "Add Banner" button on a voucher's
 * details page (POST /vouchers/:voucherId/banner, API doc #59).
 *
 *  - The type dropdown (Image / Video / GIF) only decides which files the
 *    picker offers and which size cap applies — the server works out the
 *    kind from the file itself, so no type is sent.
 *  - Video needs a poster image (still image, not a GIF / video).
 *  - Size caps (backend defaults): image 10 MB, GIF 15 MB, video 50 MB,
 *    poster 10 MB.
 *  - The banner goes for review (pending); the current one stays live until
 *    it's approved. Calls onUpload(media, poster).
 * ---------------------------------------------------------------------- */
const MB = 1024 * 1024;
const BANNER_KINDS = [
  { value: "IMAGE", label: "Image", accept: "image/png,image/jpeg,image/webp", hint: "PNG, JPG or WebP · up to 10 MB", maxBytes: 10 * MB, matches: (f) => f.type.startsWith("image/") && f.type !== "image/gif" },
  { value: "VIDEO", label: "Video", accept: "video/*", hint: "MP4, WebM or MOV · up to 50 MB", maxBytes: 50 * MB, matches: (f) => f.type.startsWith("video/") },
  { value: "GIF", label: "GIF", accept: "image/gif", hint: "Animated GIF · up to 15 MB", maxBytes: 15 * MB, matches: (f) => f.type === "image/gif" },
];
const POSTER = { accept: "image/png,image/jpeg,image/webp", maxBytes: 10 * MB };

function FilePick({ label, hint, accept, file, preview, isVideo, onPick, onRemove, disabled }) {
  if (file) {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="aspect-[16/7] w-full bg-neutral-100 dark:bg-neutral-950">
          {isVideo ? (
            <video src={preview} className="h-full w-full object-cover" controls muted />
          ) : (
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="min-w-0 truncate text-[12px] text-neutral-600 dark:text-neutral-300">
            {file.name} · {(file.size / MB).toFixed(2)} MB
          </p>
          <button onClick={onRemove} disabled={disabled} className="shrink-0 text-[12px] font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400">
            Remove
          </button>
        </div>
      </div>
    );
  }
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-6 text-center hover:border-emerald-400/60 hover:bg-emerald-400/5 dark:border-neutral-700">
      <ImagePlus size={20} className="text-emerald-500" />
      <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{label}</span>
      <span className="text-[11.5px] text-neutral-500">{hint}</span>
      <input type="file" accept={accept} onChange={onPick} className="hidden" disabled={disabled} />
    </label>
  );
}

// Same upload either way (POST /vouchers/:voucherId/banner) — only the copy
// changes. Re-sending while one is pending replaces that pending file;
// the live (current) banner is never touched until a new one is approved.
const MODE_COPY = {
  add: {
    title: "Add banner",
    description: "It goes for review first — it shows to customers once you approve it.",
  },
  "replace-current": {
    title: "Replace banner",
    description: "The new banner goes for review — the current one stays live until you approve the new one.",
  },
  "replace-pending": {
    title: "Replace pending banner",
    description: "The banner waiting for review hasn't been approved yet, so it's swapped out for this one.",
  },
};

export function BannerAddModal({ mode = "add", onUpload, onClose }) {
  const [kind, setKind] = useState("IMAGE");
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [poster, setPoster] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const meta = BANNER_KINDS.find((k) => k.value === kind);
  const isVideo = kind === "VIDEO";

  // Revoke object URLs when the picked files change / unmount.
  useEffect(() => () => mediaPreview && URL.revokeObjectURL(mediaPreview), [mediaPreview]);
  useEffect(() => () => posterPreview && URL.revokeObjectURL(posterPreview), [posterPreview]);

  const clearMedia = () => {
    setMedia(null);
    setMediaPreview("");
  };
  const clearPoster = () => {
    setPoster(null);
    setPosterPreview("");
  };

  const changeKind = (value) => {
    setKind(value);
    clearMedia(); // a picked file may not match the new type
    clearPoster();
    setError("");
  };

  const pickMedia = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!meta.matches(f)) return setError(`That file isn't a ${meta.label.toLowerCase()} — choose a ${meta.hint.split(" ·")[0]} file.`);
    if (f.size > meta.maxBytes) return setError(`${f.name} is larger than ${meta.maxBytes / MB} MB.`);
    setMedia(f);
    setMediaPreview(URL.createObjectURL(f));
    setError("");
  };

  const pickPoster = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/") || f.type === "image/gif") return setError("The poster has to be a still image (PNG, JPG or WebP).");
    if (f.size > POSTER.maxBytes) return setError(`The poster is larger than ${POSTER.maxBytes / MB} MB.`);
    setPoster(f);
    setPosterPreview(URL.createObjectURL(f));
    setError("");
  };

  const ready = media && (!isVideo || poster);

  const upload = async () => {
    setUploading(true);
    setError("");
    try {
      await onUpload(media, isVideo ? poster : undefined);
      onClose();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={uploading ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{MODE_COPY[mode].title}</h2>
            <p className="mt-1 text-[12.5px] text-neutral-500">{MODE_COPY[mode].description}</p>
          </div>
          <button onClick={onClose} disabled={uploading} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800">
            <X size={15} />
          </button>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Banner type</span>
          <select
            value={kind}
            onChange={(e) => changeKind(e.target.value)}
            disabled={uploading}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
          >
            {BANNER_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <FilePick
            label={`Choose ${meta.label.toLowerCase()}`}
            hint={meta.hint}
            accept={meta.accept}
            file={media}
            preview={mediaPreview}
            isVideo={isVideo}
            onPick={pickMedia}
            onRemove={clearMedia}
            disabled={uploading}
          />
        </div>

        {isVideo && (
          <div className="mt-3">
            <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Poster image <span className="font-normal text-neutral-500">(required for video — shown before it plays)</span>
            </p>
            <FilePick
              label="Choose poster"
              hint="PNG, JPG or WebP · up to 10 MB"
              accept={POSTER.accept}
              file={poster}
              preview={posterPreview}
              isVideo={false}
              onPick={pickPoster}
              onRemove={clearPoster}
              disabled={uploading}
            />
          </div>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-red-600 dark:text-red-400">
            <AlertTriangle size={12} className="shrink-0" /> {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={uploading} className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Cancel
          </button>
          <button onClick={upload} disabled={!ready || uploading} className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
            {uploading && <Loader2 size={14} className="animate-spin" />} Send for review
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Banner review — like the voucher image viewer, so the admin can actually
 * look at a banner before approving it.
 *
 *  - BannerThumb: small preview; video shows its poster (media.thumbnail)
 *    with a play badge instead of a broken <img>.
 *  - BannerReviewModal: full-size view. With a banner waiting for review it
 *    shows "Live now" next to "Waiting for review", plus Approve / Reject
 *    (reject needs a reason — the vendor sees it).
 * Banner media shape (API doc #59): { url, kind: IMAGE|GIF|VIDEO, thumbnail?, … }
 * ---------------------------------------------------------------------- */
const isVideoMedia = (m) => m?.kind === "VIDEO" || /\.(mp4|webm|mov)(\?|$)/i.test(m?.url || "");
const posterOf = (m) => m?.thumbnail || m?.poster || "";

export function BannerThumb({ media, label, onClick }) {
  if (!media?.url) return null;
  const video = isVideoMedia(media);
  return (
    <button
      onClick={onClick}
      title={`View ${label.toLowerCase()} banner`}
      className="group relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800"
    >
      {video ? (
        posterOf(media) ? (
          <img src={posterOf(media)} alt={`${label} banner`} className="h-full w-full object-cover" />
        ) : (
          <video src={media.url} className="h-full w-full object-cover" muted />
        )
      ) : (
        <img src={media.url} alt={`${label} banner`} className="h-full w-full object-cover" />
      )}
      {video && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={11} fill="currentColor" />
          </span>
        </span>
      )}
      {media.kind && (
        <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-white">
          {media.kind}
        </span>
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
        <Maximize2 size={14} />
      </span>
    </button>
  );
}

function BannerMediaLarge({ media, label }) {
  if (!media?.url) {
    return (
      <div className="flex aspect-[16/8] w-full items-center justify-center rounded-xl border border-dashed border-white/20 text-[12.5px] text-white/60">
        No {label.toLowerCase()} banner
      </div>
    );
  }
  return isVideoMedia(media) ? (
    <video src={media.url} poster={posterOf(media) || undefined} controls className="max-h-[60vh] w-full rounded-xl bg-black object-contain" />
  ) : (
    <img src={media.url} alt={`${label} banner`} className="max-h-[60vh] w-full rounded-xl object-contain" />
  );
}

export function BannerReviewModal({ current, pending, focus = "pending", busy, onApprove, onReject, onClose }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const compare = Boolean(pending?.url && current?.url);
  const reviewing = Boolean(pending?.url);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submitReject = () => {
    if (!reason.trim()) return setError("A reason is required so the vendor knows what to fix.");
    onReject(reason.trim());
    onClose();
  };

  const panes = compare
    ? [
        { key: "current", label: "Live now", media: current },
        { key: "pending", label: "Waiting for review", media: pending },
      ]
    : [{ key: focus, label: focus === "pending" ? "Waiting for review" : "Live now", media: focus === "pending" ? pending : current }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4" onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-[14px] font-semibold">{reviewing ? "Review banner" : "Banner"}</p>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40">
            <X size={17} />
          </button>
        </div>

        <div className={`grid gap-4 ${panes.length > 1 ? "md:grid-cols-2" : ""}`}>
          {panes.map((p) => (
            <div key={p.key}>
              <p className={`mb-2 flex items-center gap-1.5 text-[12px] font-semibold ${p.key === "pending" ? "text-amber-300" : "text-emerald-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.key === "pending" ? "bg-amber-400" : "bg-emerald-400"}`} />
                {p.label}
                {p.media?.kind && <span className="font-normal text-white/50">· {p.media.kind}</span>}
              </p>
              <BannerMediaLarge media={p.media} label={p.label} />
            </div>
          ))}
        </div>

        {reviewing && (onApprove || onReject) && (
          <div className="mt-4 rounded-xl bg-white/5 p-3">
            {rejecting ? (
              <div>
                <textarea
                  autoFocus
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Why is this banner being rejected? The vendor will see this."
                  className="w-full resize-none rounded-lg bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-red-400/60"
                />
                {error && <p className="mt-1 text-[12px] text-red-300">{error}</p>}
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setRejecting(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-white/80 hover:bg-white/10">
                    Back
                  </button>
                  <button onClick={submitReject} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                    <XCircleIcon size={13} /> Reject banner
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] text-white/70">
                  {compare ? "Approving swaps the live banner for the new one." : "Approving makes this the live banner."}
                </p>
                <div className="flex gap-2">
                  {onReject && (
                    <button onClick={() => setRejecting(true)} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-[12.5px] font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-60">
                      <XCircleIcon size={13} /> Reject
                    </button>
                  )}
                  {onApprove && (
                    <button
                      onClick={async () => {
                        await onApprove();
                        onClose();
                      }}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-[12.5px] font-semibold text-neutral-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve banner
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
