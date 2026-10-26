import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import useBackLayer from "../../lib/useBackLayer";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import {
  Plus,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  FileVideo,
  Trash2,
  Upload,
  X,
  GripVertical,
  ListOrdered,
  Pencil,
  LayoutGrid,
  Images,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
  Eye,
  Lock,
  Layers,
} from "lucide-react";
import ShowcaseGallery from "./ShowcaseGallery";
import { EmptyState, inputClass } from "./BrandShared";
import CommonEmptyState from "../../components/common/EmptyState";
import { queryKeys } from "../../lib/query";
import { useBrandShowcase } from "./queries/showcaseQueries";
import {
  deleteShowcaseSection,
  addShowcaseMedia,
  updateShowcaseMedia,
  deleteShowcaseMedia,
  replaceShowcaseMedia,
  createShowcaseSectionWithMedia,
  reorderShowcaseSections,
  reorderShowcaseMedia,
  isVideoFile,
} from "./services/showcaseApi";
import { getBrandSubscription } from "./services/subscriptionApi";
import { mergeRefs, dragSensors, useClickWithoutDrag } from "./utils/dndHelpers";
import Loader from "../../components/common/Loader";

/* -------------------------------------------------------------------------
 * Ported "as-is" from the VenderPanel Showcase Details flow: a staged
 * upload modal (select files -> confirm with an optional "video clips" +
 * thumbnail step, never upload straight from <input>'s onChange), a
 * click-to-preview modal per media tile (Replace / Delete / Show in Video
 * Clips), and dnd-kit/react drag-and-drop REORDERING for both sections and
 * media-within-a-section. See the porting doc for the full reference.
 * ---------------------------------------------------------------------- */

// Confirmed against the real media/update response: duration sits under
// `metadata`, not flat on the item — kept the flat fallback too in case an
// older/differently-shaped record still returns one. The section detail
// endpoint nests the file under `item.media` (super admin doc A-5), the
// older customer gallery had it flat — read both.
function normalizeShowcaseMediaItem(item, index) {
  const type = String(item?.type ?? item?.media?.kind ?? "").toUpperCase();
  const realId = item?._id ?? item?.id ?? item?.mediaId ?? item?.media?._id ?? null;
  return {
    // A placeholder keeps React keys / drag indexes working, but edit,
    // delete and replace need the server's id in the URL — `hasId` gates them.
    id: realId ?? `media-${index}`,
    hasId: Boolean(realId),
    url: item?.media?.url ?? item?.url ?? "",
    isVideo: type === "VIDEO",
    duration: item?.metadata?.duration ?? item?.media?.duration ?? item?.duration,
    isShowInVideoClips: Boolean(item?.isShowInVideoClips),
    title: item?.title || "",
    altText: item?.altText || "",
    isActive: item?.isActive !== false,
    thumbnail: item?.media?.thumbnail ?? item?.thumbnail ?? "",
  };
}

// customerVisibility (super admin doc #36): why a section isn't reaching
// customers. Only the reason codes are documented, not the key, so read
// the likely ones.
const NOT_LIVE_REASONS = {
  HIDDEN: "hidden",
  INACTIVE: "inactive",
  NOT_ENOUGH_MEDIA: "needs more media",
};

function notLiveLabel(section) {
  const cv = section.customerVisibility;
  if (section.isVisible === false) return "Hidden from customers";
  if (!cv || cv.isLive !== false) return "";
  const code = cv.reason ?? cv.reasons?.[0] ?? cv.status;
  return `Not live for customers${NOT_LIVE_REASONS[code] ? ` · ${NOT_LIVE_REASONS[code]}` : ""}`;
}

// Tiles shown inline per album before "+N more" (opens the gallery).
const PREVIEW_LIMIT = 8;
// Section cards view: 4 tiles per card, the 4th becomes "+N".
const SECTION_CARD_TILES = 4;
// Top switch: Collections (default) / Gallery / Albums.
const SHOWCASE_VIEWS = ["sections", "gallery", "albums"];
// Albums shown at first, and added per "Show more".
const ALBUMS_STEP = 2;

function formatMediaDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Every modal here renders into document.body: the album card is
// overflow-hidden and dnd-kit transforms it, which turns `fixed` into
// "fixed to the card" and clipped the modal's header and buttons.
function ModalPortal({ children }) {
  return createPortal(children, document.body);
}

// Preview of a not-yet-uploaded file. The object URL is created and set
// inside the effect (not useMemo) so StrictMode's mount → cleanup → mount
// makes a fresh URL instead of leaving a revoked one on the element.
// `contain` = large preview (whole frame visible, video gets controls).
function LocalFileThumb({ file, contain = false }) {
  const ref = useRef(null);
  const isVideo = file.type.startsWith("video/");
  const fit = contain ? "object-contain" : "object-cover";

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // #t=0.1 makes the browser paint a real frame instead of a black box.
    if (ref.current) ref.current.src = isVideo && !contain ? `${url}#t=0.1` : url;
    return () => URL.revokeObjectURL(url);
  }, [file, isVideo, contain]);

  return isVideo ? (
    <>
      <video ref={ref} className={`h-full w-full ${fit}`} muted playsInline preload="metadata" controls={contain} />
      {!contain && <FileVideo size={12} className="absolute bottom-1 right-1 text-white drop-shadow" />}
    </>
  ) : (
    <img ref={ref} alt="" className={`h-full w-full ${fit}`} />
  );
}

// One poster picker per video in the batch — the backend needs a poster
// for every video, matched by position (super admin doc A-3).
// `posters[i]` belongs to `files[i]`; photos never get one.
function VideoPosterFields({ files, posters, onChange, disabled }) {
  const videoIndexes = files.map((f, i) => (isVideoFile(f) ? i : -1)).filter((i) => i !== -1);
  if (!videoIndexes.length) return null;

  const setPoster = (index, file) => {
    const next = [...posters];
    next[index] = file;
    onChange(next);
  };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
        Poster for each video <span className="font-normal text-neutral-500">(required)</span>
      </p>
      {videoIndexes.map((i) => (
        <div key={`${files[i].name}-${i}`} className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950">
          {/* The video itself, so it's clear which one this poster is for. */}
          <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
            <LocalFileThumb file={files[i]} />
          </div>
          <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-600 dark:text-neutral-400" title={files[i].name}>
            {files[i].name}
          </span>
          {posters[i] && (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-2 ring-emerald-400/60" title="Poster">
              <LocalFileThumb file={posters[i]} />
            </div>
          )}
          <label
            className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed px-3 text-[12px] font-medium transition-colors ${
              posters[i]
                ? "border-emerald-400/50 text-emerald-600 dark:text-emerald-400"
                : "border-neutral-300 text-neutral-500 hover:border-emerald-400/60 hover:text-emerald-500 dark:border-neutral-700 dark:text-neutral-400"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            <Upload size={12} />
            {posters[i] ? "Change" : "Add poster"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) setPoster(i, file);
              }}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

const missingPoster = (files, posters) => files.some((f, i) => isVideoFile(f) && !posters[i]);

/* -------------------------------------------------------------------------
 * Staged upload modal — files are picked first, then this modal confirms
 * the batch (a poster per video, optional "show in video clips") before
 * anything is actually sent to the server. `mode="replace"` reuses it to
 * collect a poster when a video replaces an existing item.
 * ---------------------------------------------------------------------- */
// Full-size look at a picked file before it's uploaded.
function LocalFileViewer({ file, onClose }) {
  useBackLayer(true, onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={16} />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="relative flex h-[75vh] w-full max-w-3xl items-center justify-center">
        <LocalFileThumb file={file} contain />
      </div>
      <p className="absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 truncate text-[12px] text-white/70">{file.name}</p>
    </div>
  );
}

const tileBtn =
  "flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-colors hover:bg-black/90";

function UploadMediaModal({ files: initialFiles, uploading, progress, error, onClose, onConfirm, mode = "add" }) {
  const [isShowInVideoClips, setIsShowInVideoClips] = useState(false);
  // Files are kept here (not in the parent) so View / Replace / Remove can
  // change the batch while `posters[i]` stays paired with `files[i]`.
  const [files, setFiles] = useState(initialFiles);
  const [posters, setPosters] = useState([]);
  const [viewing, setViewing] = useState(null);
  const replaceInputRef = useRef(null);
  const replaceIndexRef = useRef(null);
  const addMoreInputRef = useRef(null);
  const hasVideo = files.some(isVideoFile);
  useBackLayer(true, () => !uploading && onClose());

  // New files go on the end, so existing posters keep their positions.
  const handleAddMore = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length) setFiles((cur) => [...cur, ...picked]);
  };
  const blocked = missingPoster(files, posters);

  const removeFile = (index) => {
    if (files.length === 1) return onClose(); // nothing left to upload
    setFiles((cur) => cur.filter((_, i) => i !== index));
    setPosters((cur) => cur.filter((_, i) => i !== index));
  };

  const startReplace = (index) => {
    replaceIndexRef.current = index;
    replaceInputRef.current?.click();
  };

  const handleReplacePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const index = replaceIndexRef.current;
    if (!file || index == null) return;
    setFiles((cur) => cur.map((f, i) => (i === index ? file : f)));
    // The old poster belonged to the old file.
    setPosters((cur) => {
      const next = [...cur];
      next[index] = undefined;
      return next;
    });
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={uploading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            {mode === "replace" ? "Replace Media" : "Add Media"}
          </h2>
          <button
            onClick={onClose}
            disabled={uploading}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[13px] text-neutral-600 dark:text-neutral-400">
            {files.length} file{files.length === 1 ? "" : "s"} ready to upload.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${file.lastModified}-${i}`}
                title={file.name}
                className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
              >
                {file.type.startsWith("video/") || file.type.startsWith("image/") ? (
                  <LocalFileThumb file={file} />
                ) : (
                  <ImageIcon size={18} />
                )}
                {!uploading && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button type="button" onClick={() => setViewing(file)} aria-label="View" title="View" className={tileBtn}>
                      <Eye size={12} />
                    </button>
                    <button type="button" onClick={() => startReplace(i)} aria-label="Replace" title="Replace" className={tileBtn}>
                      <RefreshCw size={12} />
                    </button>
                    {mode === "add" && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label="Remove"
                        title="Remove"
                        className={`${tileBtn} hover:bg-red-600`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {mode === "add" && (
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={uploading}
                title="Add more photos or videos"
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400"
              >
                <Plus size={16} />
                <span className="text-[10.5px] font-medium">Add more</span>
              </button>
            )}
          </div>
          <input
            ref={addMoreInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleAddMore}
            className="hidden"
          />
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleReplacePick}
            className="hidden"
          />
          {viewing && <LocalFileViewer file={viewing} onClose={() => setViewing(null)} />}

          <VideoPosterFields files={files} posters={posters} onChange={setPosters} disabled={uploading} />

          {hasVideo && mode === "add" && (
            <label className="mt-4 flex items-center gap-2.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={isShowInVideoClips}
                onChange={(e) => setIsShowInVideoClips(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-500 focus:ring-emerald-400 dark:border-neutral-700"
              />
              Show in video clips
            </label>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-neutral-500">Uploading… {progress}%</p>
            </div>
          )}

          {error && <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm({ files, isShowInVideoClips: hasVideo && isShowInVideoClips, posters })}
              disabled={uploading || blocked}
              title={blocked ? "Add a poster for every video first" : undefined}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? "Uploading…" : mode === "replace" ? "Replace" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function AddShowcaseSectionModal({ submitting, progress, error, onClose, onConfirm }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [posters, setPosters] = useState([]);
  const [isShowInVideoClips, setIsShowInVideoClips] = useState(false);
  const fileInputRef = useRef(null);
  const blocked = missingPoster(files, posters);
  useBackLayer(true, () => !submitting && onClose());

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim() || submitting || blocked) return;
    onConfirm({ title: title.trim(), description: description.trim(), files, posters, isShowInVideoClips });
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      onClick={submitting ? undefined : onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
              <Plus size={18} />
            </span>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Add Showcase Section</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Section title</span>
            <input
              autoFocus
              required
              maxLength={20}
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 20))}
              placeholder="e.g. Ambience photo"
              className={`${inputClass} border-transparent bg-emerald-50/80 focus:border-emerald-300 dark:bg-emerald-950/20`}
            />
            <span className="mt-1 block text-right text-[10.5px] text-neutral-400">{title.length}/20</span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Description (optional)</span>
            <textarea
              maxLength={300}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 300))}
              className={`${inputClass} resize-y border-transparent bg-emerald-50/80 focus:border-emerald-300 dark:bg-emerald-950/20`}
            />
            <span className="mt-1 block text-right text-[10.5px] text-neutral-400">{description.length}/300</span>
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">Photos / Videos</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              disabled={submitting}
              onChange={(event) => {
                setFiles((current) => [...current, ...Array.from(event.target.files || [])]);
                event.target.value = "";
              }}
              className="block w-full text-[12px] text-neutral-500 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3.5 file:py-2 file:text-[12px] file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/40 dark:file:text-emerald-400"
            />
            {files.length > 0 && (
              <div className="mt-2 flex items-start justify-between gap-3 text-[11.5px] text-neutral-500">
                <span className="min-w-0 truncate">{files.map((file) => file.name).join(", ")}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setPosters([]);
                  }}
                  disabled={submitting}
                  className="shrink-0 font-medium text-red-500 hover:text-red-600"
                >
                  Clear
                </button>
              </div>
            )}
            <VideoPosterFields files={files} posters={posters} onChange={setPosters} disabled={submitting} />
          </div>

          {files.some(isVideoFile) && (
            <label className="flex items-center gap-2.5 text-[12.5px] text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={isShowInVideoClips}
                onChange={(event) => setIsShowInVideoClips(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-emerald-500 focus:ring-emerald-400 dark:border-neutral-700"
              />
              Show in video clips
            </label>
          )}

          {submitting && (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Creating section and uploading media… {progress}%</p>
            </div>
          )}
          {error && <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2.5 text-[13px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || submitting || blocked}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Adding…" : "Add Section"}
          </button>
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}

// Edits one media item's own metadata (title/alt text/active) via the
// confirmed PATCH .../media/update/:mediaId — opened either from a tile's
// hover icon or from inside the click-to-preview modal. The file itself
// can be swapped too: Replace only stages the new file (with Undo) and it
// is uploaded on Save; Remove deletes the item after a confirm.
function EditMediaModal({ media, submitting, removing, error, onClose, onSave, onRemove }) {
  const [title, setTitle] = useState(media.title || "");
  const [altText, setAltText] = useState(media.altText || "");
  const [isActive, setIsActive] = useState(media.isActive !== false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [replacement, setReplacement] = useState(null);
  const thumbInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const busy = submitting || removing;
  useBackLayer(true, () => !busy && onClose());

  // The poster follows whichever file will be live after Save. A video
  // replacement needs its own poster (doc A-4); photos never take one.
  const isVideo = replacement ? isVideoFile(replacement) : media.isVideo;
  const existingThumb = replacement ? "" : media.thumbnail;
  const posterMissing = Boolean(replacement) && isVideo && !thumbnailFile;

  const handleThumbnailPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setThumbnailFile(file);
  };

  const handleReplacePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReplacement(file);
    setThumbnailFile(null); // the old poster belonged to the old file
  };

  const undoReplace = () => {
    setReplacement(null);
    setThumbnailFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (posterMissing) return;
    onSave({
      title: title.trim(),
      altText: altText.trim(),
      isActive,
      ...(replacement ? { replacement, poster: isVideo ? thumbnailFile : null } : {}),
      ...(!replacement && thumbnailFile ? { thumbnail: thumbnailFile } : {}),
    });
  };

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={busy ? undefined : onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Edit Media</h2>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto px-5 py-5">
          {/* Shows whichever media is actually being edited — image or
              video, so there's never any doubt which item these fields
              belong to. */}
          <div className="relative mb-2 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
            {replacement ? (
              <LocalFileThumb file={replacement} contain />
            ) : media.isVideo ? (
              <video src={media.url} className="h-full w-full object-contain" controls muted playsInline preload="metadata" />
            ) : (
              <img src={media.url} alt={media.altText || ""} className="h-full w-full object-contain" />
            )}
            {replacement && (
              <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-emerald-400 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-950">
                New — replaces on Save
              </span>
            )}
          </div>

          {/* Replace / Remove — a staged replacement can be undone until Save. */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {replacement ? (
              <>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-500" title={replacement.name}>
                  {replacement.name}
                </span>
                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  disabled={busy}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Upload size={12} />
                  Pick another
                </button>
                <button
                  type="button"
                  onClick={undoReplace}
                  disabled={busy}
                  className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-amber-600 transition-colors hover:bg-amber-400/10 disabled:opacity-50 dark:text-amber-400"
                >
                  <RotateCcw size={12} />
                  Undo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => replaceInputRef.current?.click()}
                  disabled={busy || !media.hasId}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[12px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
                >
                  <Upload size={12} />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={busy || !media.hasId}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-[12px] font-medium text-red-600 transition-colors hover:border-red-400/60 hover:bg-red-500/5 disabled:opacity-50 dark:border-neutral-800 dark:text-red-400"
                >
                  {removing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  {removing ? "Removing…" : "Remove"}
                </button>
              </>
            )}
            <input ref={replaceInputRef} type="file" accept="image/*,video/*" onChange={handleReplacePick} className="hidden" />
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekend Brunch Setup"
              className={inputClass}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Alt Text</label>
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this photo/video"
              className={inputClass}
            />
          </div>

          {/* Poster is video-only — a photo with a thumbnail is a 422 (doc A-9). */}
          {isVideo && (
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Poster{" "}
              <span className={`font-normal ${posterMissing ? "text-red-500" : "text-neutral-500"}`}>
                ({replacement ? "required for the new video" : "optional"})
              </span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                {thumbnailFile ? (
                  <LocalFileThumb file={thumbnailFile} />
                ) : existingThumb ? (
                  <img src={existingThumb} alt="Thumbnail preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-neutral-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                disabled={busy}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400"
              >
                <Upload size={13} />
                {thumbnailFile || existingThumb ? "Change" : "Upload"} poster
              </button>
              <input ref={thumbInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailPick} className="hidden" />
            </div>
          </div>
          )}

          <label className="mb-5 flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 bg-neutral-50 accent-emerald-400 dark:border-neutral-700 dark:bg-neutral-950"
            />
            Active (visible in the app)
          </label>

          {error && <p className="mb-4 text-[12px] text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || posterMissing}
              title={posterMissing ? "Add a poster for the new video first" : undefined}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? (replacement ? "Replacing…" : "Saving…") : replacement ? "Replace & Save" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}

/* -------------------------------------------------------------------------
 * One media tile in the grid — simultaneously the sortable root, the drag
 * handle, AND the click target (see useClickWithoutDrag in dndHelpers.js).
 * ---------------------------------------------------------------------- */
function ShowcaseMediaTile({ media, index, onPreview, onEdit, onDelete, deleting, readOnly = false }) {
  const { ref, handleRef, isDragging } = useSortable({ id: media.id, index, disabled: readOnly });
  const onPointerDown = useClickWithoutDrag(() => media.url && onPreview(media));

  return (
    <div
      ref={mergeRefs(ref, handleRef)}
      onPointerDown={onPointerDown}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="group relative aspect-video cursor-grab touch-none overflow-hidden rounded-xl bg-neutral-950 ring-1 ring-black/5 transition-shadow hover:ring-2 hover:ring-emerald-400/70 active:cursor-grabbing dark:ring-white/5"
    >
      {!media.url ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-neutral-500">
          {media.isVideo ? <FileVideo size={18} /> : <ImageIcon size={18} />}
          <span className="text-[10px]">No preview</span>
        </div>
      ) : media.isVideo ? (
        <>
          <video src={media.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          {media.duration != null && (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {formatMediaDuration(media.duration)}
            </span>
          )}
        </>
      ) : (
        <img
          src={media.url}
          alt={media.altText}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      {!media.isActive && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
          Inactive
        </span>
      )}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {media.url && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(media);
            }}
            aria-label="View media"
            title="View"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm hover:bg-black/90"
          >
            <Eye size={11} />
          </button>
        )}
        {!readOnly && (
        <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(media);
          }}
          aria-label="Edit media"
          title="Edit"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm hover:bg-black/90"
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(media.id);
          }}
          disabled={deleting}
          aria-label="Delete media"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm hover:bg-black/90 disabled:opacity-100"
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

// Alternate, simpler list view for reordering — same sortable id/index
// contract as the grid tile, just a small drag-handle icon instead of the
// whole row being draggable, for when dragging tiny grid tiles is fiddly.
function ShowcaseOrderRow({ media, index }) {
  const { ref, handleRef, isDragging } = useSortable({ id: media.id, index });
  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-950"
    >
      <button
        ref={handleRef}
        type="button"
        aria-label="Drag to reorder"
        className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-400 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
        {media.isVideo || !media.url ? (
          <div className="flex h-full w-full items-center justify-center text-neutral-500">
            {media.isVideo ? <FileVideo size={14} /> : <ImageIcon size={14} />}
          </div>
        ) : (
          <img src={media.url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <span className="text-[12px] text-neutral-600 dark:text-neutral-400">{media.isVideo ? "Video" : "Photo"}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * One Showcase album ("section" / "group") — cover, real photo/video
 * counts, a draggable-to-reorder media grid (or an alternate Order list),
 * and the staged Add Media modal.
 * ---------------------------------------------------------------------- */
// No "reload" callback: each save below goes through the shared axios
// interceptor, which refreshes the showcase cache on success.
function ShowcaseSectionCard({ brand, section, index, readOnly = false }) {
  const { ref, handleRef, isDragging } = useSortable({ id: section._id, index, disabled: readOnly });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSection, setDeletingSection] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [error, setError] = useState("");

  // Full-screen gallery: { mode: "grid" | "viewer", index }.
  const [gallery, setGallery] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [togglingClips, setTogglingClips] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  // A video picked as a replacement waits here until its poster is chosen.
  const [replaceTarget, setReplaceTarget] = useState(null);

  const fileInputRef = useRef(null);

  // Every media item shows, even one without a usable url (as a "No
  // preview" tile) — nothing the admin added is silently dropped. If the
  // media list didn't load, fall back to get-all's own counts.
  const media = (section.medias ?? []).map(normalizeShowcaseMediaItem);
  const photoCount = media.length ? media.filter((m) => !m.isVideo).length : section.photoCount ?? 0;
  const videoCount = media.length ? media.length - photoCount : section.videoCount ?? 0;
  const sectionTitle = section.title?.trim() || "Untitled album";
  const notLive = notLiveLabel(section);
  const firstImage = media.find((m) => !m.isVideo && m.url)?.url;
  // Inline grid shows up to PREVIEW_LIMIT tiles; beyond that the last slot
  // becomes "+N more" and opens the full gallery.
  const overflow = media.length > PREVIEW_LIMIT;
  const visibleMedia = overflow ? media.slice(0, PREVIEW_LIMIT - 1) : media;
  const hiddenCount = media.length - visibleMedia.length;
  const closeGallery = useCallback(() => setGallery(null), []);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) setPendingFiles(files);
  };

  // `files` is the batch as edited in the modal (removed / replaced items).
  const handleConfirmUpload = async ({ files, isShowInVideoClips, posters }) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      await addShowcaseMedia(section._id, files, { isShowInVideoClips, posters }, setUploadProgress);
      setPendingFiles(null);    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // DELETE /showcase/section/:sectionId/media/delete/:mediaId (soft delete).
  const handleDeleteMedia = async (mediaId) => {
    const target = media.find((m) => m.id === mediaId);
    if (target && !target.hasId) {
      setError("This item came back from the server without an id, so it can't be deleted from here.");
      return;
    }
    if (!window.confirm(`Delete this ${target?.isVideo ? "video" : "photo"} from "${sectionTitle}"?`)) return;
    setDeletingId(mediaId);
    setError("");
    try {
      await deleteShowcaseMedia(section._id, mediaId, brand.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSection = async () => {
    if (!window.confirm(`Delete the "${sectionTitle}" album and all its media?`)) return;
    setDeletingSection(true);
    setError("");
    try {
      await deleteShowcaseSection(section._id, brand.id);    } catch (err) {
      setError(err.message);
      setDeletingSection(false);
    }
  };

  const runReplace = async (mediaId, file, poster) => {
    setReplacing(true);
    setError("");
    try {
      await replaceShowcaseMedia(section._id, mediaId, { file, poster });
      setReplaceTarget(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
    }
  };

  // A photo replaces straight away; a video first needs a poster (doc A-4),
  // so it opens the upload modal in replace mode.
  const handleReplaceMedia = (target, file) => {
    if (!target) return;
    if (isVideoFile(file)) {
      setError("");
      setReplaceTarget({ mediaId: target.id, file });
      setGallery(null); // the poster modal sits below the gallery
      return;
    }
    runReplace(target.id, file);
  };

  const handleToggleClips = async (target) => {
    if (!target) return;
    setTogglingClips(true);
    setError("");
    try {
      // The gallery reads the live list, which refreshes after this save.
      await updateShowcaseMedia(section._id, target.id, {
        isShowInVideoClips: !target.isShowInVideoClips,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingClips(false);
    }
  };

  // A staged replacement goes up first (PUT .../media/replace), then the
  // title / alt text / active flags are saved on the same item.
  const handleUpdateMedia = async ({ replacement, poster, ...patch }) => {
    if (!editingMedia) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      let mediaId = editingMedia.id;
      if (replacement) {
        const res = await replaceShowcaseMedia(section._id, mediaId, { file: replacement, poster });
        // In case the server answers with a new record id.
        mediaId = res?.data?._id ?? mediaId;
      }
      await updateShowcaseMedia(section._id, mediaId, patch);
      setEditingMedia(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Remove from inside the Edit modal — same soft delete as the tile's ×.
  const handleRemoveFromEdit = async () => {
    if (!editingMedia?.hasId) return;
    if (!window.confirm(`Remove this ${editingMedia.isVideo ? "video" : "photo"} from "${sectionTitle}"?`)) return;
    setDeletingId(editingMedia.id);
    setEditError("");
    try {
      await deleteShowcaseMedia(section._id, editingMedia.id, brand.id);
      setEditingMedia(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Media reordering — its own DragDropProvider, nested inside the
  // section-level one (a genuinely separate draggable set).
  const handleMediaDragEnd = async (event) => {
    if (readOnly) return;
    if (event.canceled) return;
    const draggedId = event.operation.source?.id;
    if (draggedId == null) return;
    const idItems = media.map((m) => ({ id: m.id }));
    const moved = move(idItems, event);
    const newIndex = moved.findIndex((m) => m.id === draggedId);
    if (newIndex === -1) return;
    try {
      await reorderShowcaseMedia(
        section._id,
        moved.map((m, i) => ({ id: m.id, sortOrder: i + 1 }))
      );    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="overflow-hidden rounded-3xl border border-white/80 bg-white/65 shadow-[0_8px_30px_rgba(16,185,129,0.07)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div
          ref={handleRef}
          className="flex min-w-0 flex-1 cursor-grab items-center gap-3 touch-none active:cursor-grabbing"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 ring-1 ring-black/5 dark:bg-neutral-800 dark:ring-white/10">
            {section.coverImage || firstImage ? (
              <img src={section.coverImage || firstImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <ImageIcon size={18} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`truncate text-[14.5px] font-bold ${
                section.title?.trim() ? "text-neutral-900 dark:text-neutral-50" : "italic text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {sectionTitle}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky-600 dark:text-sky-400">
                <ImageIcon size={10} />
                {photoCount} photo{photoCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-violet-600 dark:text-violet-400">
                <FileVideo size={10} />
                {videoCount} video{videoCount === 1 ? "" : "s"}
              </span>
              {notLive && (
                <span className="inline-flex rounded-full bg-amber-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-400">
                  {notLive}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {media.length > 0 && (
            <button
              type="button"
              onClick={() => setGallery({ mode: "grid", index: 0 })}
              className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-[11.5px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <LayoutGrid size={12} />
              View all
            </button>
          )}
        {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-2 text-[11.5px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-400"
          >
            <Upload size={12} />
            Add Media
          </button>
          {media.length > 1 && (
            <button
              type="button"
              onClick={() => setShowOrderPanel((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-semibold transition-colors ${
                showOrderPanel
                  ? "bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              <ListOrdered size={12} />
              Order
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteSection}
            disabled={deletingSection}
            aria-label={`Delete ${sectionTitle} album`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-500"
          >
            {deletingSection ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
        </>
        )}
        </div>
      </div>

      {error && <p className="px-4 pb-2 text-[11.5px] text-red-600 dark:text-red-400">{error}</p>}
      {section.mediaLoadFailed && (
        <p className="px-4 pb-2 text-[11.5px] text-red-600 dark:text-red-400">Couldn't load this album's media.</p>
      )}

      {media.length ? (
        showOrderPanel ? (
          <div className="space-y-1.5 px-4 pb-4">
            <DragDropProvider sensors={dragSensors} onDragEnd={handleMediaDragEnd}>
              {media.map((m, i) => (
                <ShowcaseOrderRow key={m.id} media={m} index={i} />
              ))}
            </DragDropProvider>
          </div>
        ) : (
          <DragDropProvider sensors={dragSensors} onDragEnd={handleMediaDragEnd}>
            {/* Big albums: show the first few, the last tile opens the
                gallery with "+N more". Order panel / gallery show all. */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
              {visibleMedia.map((m, i) => (
                <ShowcaseMediaTile
                  key={m.id}
                  readOnly={readOnly}
                  media={m}
                  index={i}
                  onPreview={() => setGallery({ mode: "viewer", index: i })}
                  onEdit={setEditingMedia}
                  onDelete={handleDeleteMedia}
                  deleting={deletingId === m.id}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setGallery({ mode: "grid", index: 0 })}
                  className="group relative aspect-video overflow-hidden rounded-xl bg-neutral-900"
                >
                  {/* The 4th item itself, blurred behind "+N" — a video
                      uses its poster image. */}
                  {(() => {
                    const next = media[visibleMedia.length];
                    const src = next?.isVideo ? next.thumbnail : next?.url;
                    return src ? (
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-[2px] transition-transform duration-300 group-hover:scale-125"
                      />
                    ) : null;
                  })()}
                  <span className="relative flex h-full w-full flex-col items-center justify-center bg-black/40 text-white">
                    <span className="text-[20px] font-bold leading-none">+{hiddenCount}</span>
                    <span className="mt-1 text-[11px] font-medium text-white/80">View all</span>
                  </span>
                </button>
              )}
            </div>
          </DragDropProvider>
        )
      ) : (
        <div className="mx-4 mb-4 flex flex-col items-center gap-2 rounded-2xl bg-neutral-50 py-8 text-center dark:bg-neutral-950/60">
          <ImageIcon size={18} className="text-neutral-400 dark:text-neutral-600" />
          <p className="text-[12px] text-neutral-500">No media in this album yet.</p>
        </div>
      )}

      {pendingFiles && (
        <UploadMediaModal
          files={pendingFiles}
          uploading={uploading}
          progress={uploadProgress}
          error={error}
          onClose={() => {
            if (uploading) return;
            setPendingFiles(null);
            setError("");
          }}
          onConfirm={handleConfirmUpload}
        />
      )}

      {replaceTarget && (
        <UploadMediaModal
          mode="replace"
          files={[replaceTarget.file]}
          uploading={replacing}
          progress={0}
          error={error}
          onClose={() => {
            if (replacing) return;
            setReplaceTarget(null);
            setError("");
          }}
          onConfirm={({ files, posters }) => runReplace(replaceTarget.mediaId, files[0], posters[0])}
        />
      )}

      {gallery && (
        <ShowcaseGallery
          title={sectionTitle}
          media={media}
          startIndex={gallery.index}
          startMode={gallery.mode}
          readOnly={readOnly}
          busy={{ replacing, togglingClips, deletingId }}
          onClose={closeGallery}
          onEdit={setEditingMedia}
          onReplace={handleReplaceMedia}
          onDelete={(m) => handleDeleteMedia(m.id)}
          onToggleClips={handleToggleClips}
        />
      )}

      {editingMedia && (
        <EditMediaModal
          media={editingMedia}
          submitting={editSubmitting}
          removing={deletingId === editingMedia.id}
          error={editError}
          onClose={() => {
            if (editSubmitting || deletingId === editingMedia.id) return;
            setEditingMedia(null);
            setEditError("");
          }}
          onSave={handleUpdateMedia}
          onRemove={handleRemoveFromEdit}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Top-level export — the admin-managed Showcase album system: real albums
 * (sections) with real media, fetched via GET /showcase/get-brand-showcase,
 * reorderable (sections AND media) via drag-and-drop, and editable via the
 * add-media/replace-media/delete-media/delete-section endpoints.
 * ---------------------------------------------------------------------- */
/* -------------------------------------------------------------------------
 * Collections view — one card per album: title + counts and a 2×2 of its
 * first 4 items. With more than 4, the 4th tile shows that item blurred
 * under "+N" (the rest of the album). Clicking a tile opens the album's
 * gallery on it; "+N" / the header open the album's full grid. View only —
 * editing stays in the Albums view.
 * ---------------------------------------------------------------------- */
function SectionCard({ section, onOpen }) {
  const media = (section.medias ?? []).map(normalizeShowcaseMediaItem);
  const title = section.title?.trim() || "Untitled album";
  const photos = media.filter((m) => !m.isVideo).length;
  const videos = media.length - photos;
  const overflow = media.length > SECTION_CARD_TILES;
  const tiles = media.slice(0, SECTION_CARD_TILES);
  const moreCount = media.length - (SECTION_CARD_TILES - 1);
  const notLive = notLiveLabel(section);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/65 shadow-[0_6px_20px_rgba(16,185,129,0.06)] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-900/60 dark:shadow-black/30">
      <button type="button" onClick={() => onOpen(section, "grid", 0)} className="flex items-center justify-between gap-2 p-2.5 pb-2 text-left">
        <div className="min-w-0">
          <p className={`truncate text-[12.5px] font-bold ${section.title?.trim() ? "text-neutral-900 dark:text-neutral-50" : "italic text-neutral-400"}`}>{title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-400/10 px-1.5 py-px text-[10px] font-semibold text-sky-600 dark:text-sky-400">
              <ImageIcon size={9} /> {photos}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-400/10 px-1.5 py-px text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              <FileVideo size={9} /> {videos}
            </span>
            {notLive && (
              <span title={notLive} className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            )}
          </div>
        </div>
        {media.length > 0 && (
          <span title="View all" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <LayoutGrid size={11} />
          </span>
        )}
      </button>

      {media.length ? (
        <div className="grid grid-cols-2 gap-1 px-2.5 pb-2.5">
          {tiles.map((m, i) => {
            const isMore = overflow && i === SECTION_CARD_TILES - 1;
            const src = m.isVideo ? m.thumbnail : m.url;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => (isMore ? onOpen(section, "grid", 0) : onOpen(section, "viewer", i))}
                className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {src ? (
                  <img
                    src={src}
                    alt={m.altText}
                    loading="lazy"
                    className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${isMore ? "scale-110 opacity-50 blur-[2px]" : ""}`}
                  />
                ) : m.isVideo && m.url ? (
                  <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" className={`h-full w-full object-cover ${isMore ? "opacity-50 blur-[2px]" : ""}`} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-neutral-500">
                    {m.isVideo ? <FileVideo size={16} /> : <ImageIcon size={16} />}
                  </span>
                )}
                {isMore ? (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white">
                    <span className="text-[17px] font-bold leading-none">+{moreCount}</span>
                    <span className="mt-0.5 text-[10px] font-medium text-white/80">View all</span>
                  </span>
                ) : (
                  m.isVideo && (
                    <span className="pointer-events-none absolute bottom-1 left-1 flex items-center rounded bg-black/70 p-0.5 text-white">
                      <FileVideo size={9} />
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-2.5 mb-2.5 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-neutral-50 py-8 dark:bg-neutral-950/60">
          <ImageIcon size={18} className="text-neutral-400" />
          <p className="text-[12px] text-neutral-500">No media yet</p>
        </div>
      )}
    </div>
  );
}

// readOnly (dummy brands): albums and media are view-only — no add, upload,
// edit, replace, delete or reorder.
export default function ShowcaseAlbums({ brand, readOnly = false }) {
  // Albums come from the shared cache (queries/showcaseQueries.js). Every
  // add / edit / delete / reorder below refreshes it automatically through
  // the axios interceptor — no manual refetch anywhere in this file.
  const queryClient = useQueryClient();
  const showcaseQuery = useBrandShowcase(brand.id);
  const sections = showcaseQuery.data ?? [];
  const loading = showcaseQuery.isPending;
  const loadError = showcaseQuery.error?.message ?? "";

  // Albums are shown 2 at a time ("Show more"). Always a prefix of the list,
  // so a shown album's index is its real index and drag-reorder stays right.
  const [visibleAlbums, setVisibleAlbums] = useState(ALBUMS_STEP);
  const shownSections = sections.slice(0, visibleAlbums);
  const remainingAlbums = Math.max(0, sections.length - shownSections.length);

  // "sections" (default, shown as "Collections") = one small card per album; "gallery" = every
  // album's media in one grid; "albums" = full editable album cards.
  // The view lives in the URL (?showcase=gallery) as its own history entry,
  // so Back steps through Collections / Gallery / Albums one by one. Other
  // params (e.g. the brand page's ?tab=) are kept.
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get("showcase");
  const view = SHOWCASE_VIEWS.includes(viewParam) ? viewParam : "sections";
  const setView = (next) => {
    if (next === view) return;
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("showcase", next);
      return params;
    });
  };
  const [galleryIndex, setGalleryIndex] = useState(null);
  const closeAllGallery = useCallback(() => setGalleryIndex(null), []);
  // Sections view: one album's gallery { section, mode, index }.
  const [sectionGallery, setSectionGallery] = useState(null);
  const closeSectionGallery = useCallback(() => setSectionGallery(null), []);
  // Ids are prefixed with the album id so keys stay unique across albums.
  const allMedia = sections.flatMap((s) =>
    (s.medias ?? []).map((item, i) => ({
      ...normalizeShowcaseMediaItem(item, i),
      id: `${s._id}:${item?._id ?? item?.id ?? i}`,
      album: s.title?.trim() || "Untitled album",
    }))
  );

  // Plan limit on albums: usage.showcase { used, limit, isUnlimited } from
  // GET /subscribeds/get (same cache entry as the Subscription tab). No
  // plan / no bucket = nothing is blocked.
  const subQuery = useQuery({
    queryKey: queryKeys.subscribeds.view("brand", { brandId: brand.id }),
    queryFn: () => getBrandSubscription(brand.id),
    enabled: Boolean(brand.id) && !readOnly,
  });
  const showcasePool = subQuery.data?.data?.usage?.showcase;
  const albumLimit = showcasePool && !showcasePool.isUnlimited && showcasePool.limit != null ? Number(showcasePool.limit) : null;
  const atAlbumLimit = albumLimit != null && sections.length >= albumLimit;

  const [addingSection, setAddingSection] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createError, setCreateError] = useState("");
  const [createNotice, setCreateNotice] = useState("");

  const handleCreateSection = async ({ title, description, files, posters, isShowInVideoClips }) => {
    if (!title || creating) return;
    setCreating(true);
    setCreateProgress(0);
    setCreateError("");
    setCreateNotice("");
    try {
      const result = await createShowcaseSectionWithMedia(
        { brandId: brand.id, title, description, sortOrder: sections.length + 1 },
        files,
        { isShowInVideoClips, posters },
        setCreateProgress
      );
      setAddingSection(false);
      // The new album goes last — make sure it's on screen.
      setVisibleAlbums(sections.length + 1);
      if (result.mediaError) {
        setCreateNotice(`Showcase section was created, but media upload failed: ${result.mediaError.message}`);
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Section reordering — same move()-then-persist pattern as media
  // reordering, one level up.
  const handleSectionDragEnd = async (event) => {
    if (readOnly) return;
    if (event.canceled) return;
    const draggedId = event.operation.source?.id;
    if (draggedId == null) return;
    const idItems = sections.map((s) => ({ id: s._id }));
    const moved = move(idItems, event);
    const newIndex = moved.findIndex((s) => s.id === draggedId);
    if (newIndex === -1) return;
    const reordered = moved.map((item, i) => ({
      ...sections.find((s) => s._id === item.id),
      sortOrder: i + 1,
    }));
    // Optimistic: write the new order straight into the cache so the grid
    // moves instantly; the interceptor refetches the real order on success.
    const showcaseKey = queryKeys.showcase.brand(brand.id);
    queryClient.setQueryData(showcaseKey, reordered);
    try {
      await reorderShowcaseSections(
        brand.id,
        reordered.map((s, i) => ({ id: s._id, sortOrder: i + 1 }))
      );
    } catch {
      // Failed requests don't invalidate — resync with the server by hand.
      queryClient.invalidateQueries({ queryKey: showcaseKey });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
              <Images size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">Showcase media</p>
              <p className="truncate text-[12px] text-neutral-500">Ambience, menu and event albums shown on this brand's profile.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sections.length > 0 && (
              <div className="flex items-center rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800">
                {[
                  ["sections", Layers, "Collections"],
                  ["gallery", LayoutGrid, "Gallery"],
                  ["albums", Images, "Albums"],
                ].map(([key, Icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      view === key
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-50"
                        : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            )}
            {!readOnly && (
            // Wrapper carries the hover — a disabled button gets no mouse events.
            <div className="group relative" tabIndex={atAlbumLimit ? 0 : undefined} aria-describedby={atAlbumLimit ? "showcase-limit-tip" : undefined}>
              <button
                type="button"
                disabled={atAlbumLimit}
                onClick={() => {
                  setCreateError("");
                  setCreateNotice("");
                  setAddingSection(true);
                }}
                className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-2 text-[12px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:text-emerald-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
              >
                {atAlbumLimit ? <Lock size={12} /> : <Plus size={13} />}
                Add Album
                {albumLimit != null && (
                  <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums dark:bg-white/10">
                    {sections.length}/{albumLimit}
                  </span>
                )}
              </button>
              {atAlbumLimit && (
                <div
                  id="showcase-limit-tip"
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-neutral-900 px-3 py-2 text-[11.5px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  Plan limit reached — {sections.length}/{albumLimit} showcase albums used. Upgrade the subscription or delete an album to add more.
                </div>
              )}
            </div>
            )}
          </div>
        </div>

        {createNotice && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{createNotice}</span>
            <button
              type="button"
              onClick={() => setCreateNotice("")}
              aria-label="Dismiss message"
              className="ml-auto shrink-0 text-current opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <Loader label="Loading showcase…" />
        ) : loadError ? (
          <CommonEmptyState
            variant="compact"
            tone="error"
            icon="error"
            title="Couldn't load showcase"
            description={loadError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => showcaseQuery.refetch() }}
          />
        ) : sections.length && view === "sections" ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {sections.map((s) => (
              <SectionCard key={s._id} section={s} onOpen={(section, mode, index) => setSectionGallery({ section, mode, index })} />
            ))}
          </div>
        ) : sections.length && view === "gallery" ? (
          // Gallery — all albums' media in one grid, not split by section.
          // View-only here; editing stays in the Albums view.
          allMedia.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {allMedia.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => m.url && setGalleryIndex(i)}
                  title={m.album}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-950 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  {!m.url ? (
                    <span className="flex h-full w-full items-center justify-center text-neutral-500">
                      {m.isVideo ? <FileVideo size={16} /> : <ImageIcon size={16} />}
                    </span>
                  ) : m.isVideo ? (
                    <video
                      src={`${m.url}#t=0.1`}
                      poster={m.thumbnail || undefined}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt={m.altText}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  {m.isVideo && (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <FileVideo size={9} />
                      {formatMediaDuration(m.duration) || "Video"}
                    </span>
                  )}
                  {!m.isActive && (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                      Inactive
                    </span>
                  )}
                  {/* Which album it's from, on hover */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[10.5px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {m.album}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState label="No photos or videos in any album yet." />
          )
        ) : sections.length ? (
          <DragDropProvider sensors={dragSensors} onDragEnd={handleSectionDragEnd}>
            <div className="space-y-3">
              {shownSections.map((s, index) => (
                <ShowcaseSectionCard key={s._id} brand={brand} section={s} index={index} readOnly={readOnly} />
              ))}
            </div>

            {/* Albums pager — Show more / Show all / Show less */}
            {sections.length > ALBUMS_STEP && (
              <div className="mt-3 flex flex-col items-center justify-between gap-2 rounded-2xl border border-dashed border-neutral-200 px-4 py-2.5 sm:flex-row dark:border-neutral-800">
                <p className="text-[12px] text-neutral-500">
                  Showing <span className="font-semibold text-neutral-800 dark:text-neutral-200">{shownSections.length}</span> of{" "}
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{sections.length}</span> albums
                </p>
                <div className="flex items-center gap-1.5">
                  {remainingAlbums > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setVisibleAlbums((n) => n + ALBUMS_STEP)}
                        className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
                      >
                        <ChevronDown size={13} />
                        Show {Math.min(ALBUMS_STEP, remainingAlbums)} more
                      </button>
                      {remainingAlbums > ALBUMS_STEP && (
                        <button
                          type="button"
                          onClick={() => setVisibleAlbums(sections.length)}
                          className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          Show all ({sections.length})
                        </button>
                      )}
                    </>
                  )}
                  {remainingAlbums === 0 && (
                    <button
                      type="button"
                      onClick={() => setVisibleAlbums(ALBUMS_STEP)}
                      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      <ChevronUp size={13} />
                      Show less
                    </button>
                  )}
                </div>
              </div>
            )}
          </DragDropProvider>
        ) : (
          <EmptyState label="No showcase albums yet. Add one to upload photos or videos." />
        )}
      </div>
      {sectionGallery && (
        <ShowcaseGallery
          title={sectionGallery.section.title?.trim() || "Untitled album"}
          media={(sectionGallery.section.medias ?? []).map(normalizeShowcaseMediaItem)}
          startIndex={sectionGallery.index}
          startMode={sectionGallery.mode}
          readOnly
          busy={{}}
          onClose={closeSectionGallery}
        />
      )}
      {galleryIndex != null && (
        <ShowcaseGallery
          title="All media"
          media={allMedia}
          startIndex={galleryIndex}
          startMode="viewer"
          readOnly
          busy={{}}
          onClose={closeAllGallery}
        />
      )}
      {addingSection && !atAlbumLimit && (
        <AddShowcaseSectionModal
          submitting={creating}
          progress={createProgress}
          error={createError}
          onClose={() => {
            if (creating) return;
            setAddingSection(false);
            setCreateError("");
          }}
          onConfirm={handleCreateSection}
        />
      )}
    </div>
  );
}
