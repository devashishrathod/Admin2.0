import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Repeat,
  Pencil,
} from "lucide-react";
import { EmptyState, inputClass } from "./BrandShared";
import {
  getBrandShowcase,
  createShowcaseSection,
  deleteShowcaseSection,
  addShowcaseMedia,
  updateShowcaseMedia,
  deleteShowcaseMedia,
  replaceShowcaseMedia,
  reorderShowcaseSections,
  reorderShowcaseMedia,
} from "./services/showcaseApi";
import { mergeRefs, dragSensors, useClickWithoutDrag } from "./utils/dndHelpers";

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
// older/differently-shaped record still returns one.
function normalizeShowcaseMediaItem(item) {
  return {
    id: item?._id ?? item?.id,
    url: item?.url ?? "",
    isVideo: item?.type === "VIDEO",
    duration: item?.metadata?.duration ?? item?.duration,
    isShowInVideoClips: Boolean(item?.isShowInVideoClips),
    title: item?.title || "",
    altText: item?.altText || "",
    isActive: item?.isActive !== false,
    thumbnail: item?.thumbnail || "",
  };
}

function formatMediaDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------
 * Staged upload modal — files are picked first, then this modal confirms
 * the batch (with an optional "show in video clips" + custom thumbnail)
 * before anything is actually sent to the server.
 * ---------------------------------------------------------------------- */
function UploadMediaModal({ files, uploading, progress, error, onClose, onConfirm }) {
  const [isShowInVideoClips, setIsShowInVideoClips] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const thumbInputRef = useRef(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={uploading ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Add Media</h2>
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
                key={`${file.name}-${i}`}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
              >
                {file.type.startsWith("video/") ? <FileVideo size={18} /> : <ImageIcon size={18} />}
              </div>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2.5 text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={isShowInVideoClips}
              onChange={(e) => setIsShowInVideoClips(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-emerald-500 focus:ring-emerald-400 dark:border-neutral-700"
            />
            Show in video clips
          </label>

          {isShowInVideoClips && (
            <div className="mt-3">
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Thumbnail for clips (optional)
              </label>
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="flex h-9 items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-500 dark:border-neutral-700 dark:text-neutral-400"
              >
                <Upload size={13} />
                {thumbnail ? thumbnail.name : "Choose image"}
              </button>
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
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
              onClick={() => onConfirm({ isShowInVideoClips, thumbnail: isShowInVideoClips ? thumbnail : null })}
              disabled={uploading}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Click-to-preview modals — opened from a media tile's click (never its
 * drag). `media` is a snapshot taken at click time, so a Replace/Delete
 * closes the modal immediately rather than trying to reflect a
 * mutated/deleted item it can no longer see once the section reloads.
 * ---------------------------------------------------------------------- */
function MediaPreviewHeader({ onEdit, onReplace, onDelete, replacing, deleting, onClose, children }) {
  const fileInputRef = useRef(null);
  return (
    <div className="mb-3 flex items-center justify-end gap-2">
      {children}
      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20"
      >
        <Pencil size={13} />
        Edit
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={replacing}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3.5 text-[12.5px] font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {replacing ? <Loader2 size={13} className="animate-spin" /> : <Repeat size={13} />}
        Replace
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500/20 px-3.5 text-[12.5px] font-medium text-red-300 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        Delete
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X size={16} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onReplace(file);
        }}
      />
    </div>
  );
}

function ImageModal({ media, replacing, deleting, onClose, onEdit, onReplace, onDelete }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        <MediaPreviewHeader replacing={replacing} deleting={deleting} onEdit={onEdit} onReplace={onReplace} onDelete={onDelete} onClose={onClose} />
        <img src={media.url} alt={media.altText} className="max-h-[75vh] w-full rounded-2xl object-contain" />
      </div>
    </div>
  );
}

function VideoModal({ media, replacing, deleting, togglingClips, onClose, onEdit, onReplace, onDelete, onToggleClips }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
        <MediaPreviewHeader replacing={replacing} deleting={deleting} onEdit={onEdit} onReplace={onReplace} onDelete={onDelete} onClose={onClose}>
          <button
            type="button"
            onClick={onToggleClips}
            disabled={togglingClips}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              media.isShowInVideoClips ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {togglingClips ? <Loader2 size={13} className="animate-spin" /> : <FileVideo size={13} />}
            {media.isShowInVideoClips ? "In Video Clips" : "Show in Video Clips"}
          </button>
        </MediaPreviewHeader>
        <video src={media.url} className="max-h-[75vh] w-full rounded-2xl bg-black" controls autoPlay playsInline />
      </div>
    </div>
  );
}

// Edits one media item's own metadata (title/alt text/active) via the
// confirmed PATCH .../media/update/:mediaId — opened either from a tile's
// hover icon or from inside the click-to-preview modal.
function EditMediaModal({ media, submitting, error, onClose, onSave }) {
  const [title, setTitle] = useState(media.title || "");
  const [altText, setAltText] = useState(media.altText || "");
  const [isActive, setIsActive] = useState(media.isActive !== false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(media.thumbnail || "");
  const thumbInputRef = useRef(null);

  // Revoke the object URL for a newly-picked thumbnail on unmount — the
  // existing thumbnail (a real https URL) is left alone, revoking it
  // would be a no-op anyway since it was never created via createObjectURL.
  useEffect(() => {
    return () => {
      if (thumbnailFile) URL.revokeObjectURL(thumbnailPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThumbnailPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      altText: altText.trim(),
      isActive,
      ...(thumbnailFile ? { thumbnail: thumbnailFile } : {}),
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={submitting ? undefined : onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Edit Media</h2>
          <button
            onClick={onClose}
            disabled={submitting}
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
          <div className="mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-950">
            {media.isVideo ? (
              <video src={media.url} className="h-full w-full object-contain" controls muted playsInline preload="metadata" />
            ) : (
              <img src={media.url} alt={media.altText || ""} className="h-full w-full object-contain" />
            )}
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

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Thumbnail <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                {thumbnailPreview ? (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-neutral-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400"
              >
                <Upload size={13} />
                {thumbnailPreview ? "Change" : "Upload"} thumbnail
              </button>
              <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleThumbnailPick} className="hidden" />
            </div>
          </div>

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
              disabled={submitting}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * One media tile in the grid — simultaneously the sortable root, the drag
 * handle, AND the click target (see useClickWithoutDrag in dndHelpers.js).
 * ---------------------------------------------------------------------- */
function ShowcaseMediaTile({ media, index, onPreview, onEdit, onDelete, deleting }) {
  const { ref, handleRef, isDragging } = useSortable({ id: media.id, index });
  const onPointerDown = useClickWithoutDrag(() => onPreview(media));

  return (
    <div
      ref={mergeRefs(ref, handleRef)}
      onPointerDown={onPointerDown}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="group relative aspect-video cursor-grab touch-none overflow-hidden bg-neutral-950 active:cursor-grabbing"
    >
      {media.isVideo ? (
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
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(media);
          }}
          aria-label="Edit media"
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
        {media.isVideo ? (
          <div className="flex h-full w-full items-center justify-center text-neutral-500">
            <FileVideo size={14} />
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
function ShowcaseSectionCard({ brand, section, index, onChanged }) {
  const { ref, handleRef, isDragging } = useSortable({ id: section._id, index });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingSection, setDeletingSection] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [error, setError] = useState("");

  const [previewMedia, setPreviewMedia] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [togglingClips, setTogglingClips] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const fileInputRef = useRef(null);

  const media = (section.medias ?? []).map(normalizeShowcaseMediaItem).filter((m) => m.url);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length) setPendingFiles(files);
  };

  const handleConfirmUpload = async ({ isShowInVideoClips, thumbnail }) => {
    if (!pendingFiles?.length) return;
    setUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      await addShowcaseMedia(
        section._id,
        pendingFiles,
        { brandId: brand.id, isShowInVideoClips, thumbnail },
        setUploadProgress
      );
      setPendingFiles(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    setDeletingId(mediaId);
    setError("");
    try {
      await deleteShowcaseMedia(section._id, mediaId, brand.id);
      setPreviewMedia(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSection = async () => {
    if (!window.confirm(`Delete the "${section.title}" album and all its media?`)) return;
    setDeletingSection(true);
    setError("");
    try {
      await deleteShowcaseSection(section._id, brand.id);
      onChanged();
    } catch (err) {
      setError(err.message);
      setDeletingSection(false);
    }
  };

  const handleReplaceMedia = async (file) => {
    if (!previewMedia) return;
    setReplacing(true);
    setError("");
    try {
      await replaceShowcaseMedia(section._id, previewMedia.id, { file, brandId: brand.id });
      setPreviewMedia(null);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setReplacing(false);
    }
  };

  const handleToggleClips = async () => {
    if (!previewMedia) return;
    setTogglingClips(true);
    setError("");
    try {
      await updateShowcaseMedia(section._id, previewMedia.id, {
        isShowInVideoClips: !previewMedia.isShowInVideoClips,
      });
      setPreviewMedia((prev) => (prev ? { ...prev, isShowInVideoClips: !prev.isShowInVideoClips } : prev));
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingClips(false);
    }
  };

  const handleUpdateMedia = async (patch) => {
    if (!editingMedia) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await updateShowcaseMedia(section._id, editingMedia.id, patch);
      setEditingMedia(null);
      // The preview modal (if open on the same item) should reflect the
      // edit immediately rather than waiting for the next full refetch.
      setPreviewMedia((prev) => (prev && prev.id === editingMedia.id ? { ...prev, ...patch } : prev));
      onChanged();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Media reordering — its own DragDropProvider, nested inside the
  // section-level one (a genuinely separate draggable set).
  const handleMediaDragEnd = async (event) => {
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
      );
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div
          ref={handleRef}
          className="flex min-w-0 flex-1 cursor-grab items-center gap-3 touch-none active:cursor-grabbing"
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 dark:bg-neutral-800">
            {section.coverImage ? (
              <img src={section.coverImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-400">
                <ImageIcon size={16} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-neutral-800 dark:text-neutral-200">{section.title}</p>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              {section.photoCount ?? 0} photo{section.photoCount === 1 ? "" : "s"} · {section.videoCount ?? 0} video
              {section.videoCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
            aria-label={`Delete ${section.title} album`}
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
        </div>
      </div>

      {error && <p className="px-4 pb-2 text-[11.5px] text-red-600 dark:text-red-400">{error}</p>}

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
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {media.map((m, i) => (
                <ShowcaseMediaTile
                  key={m.id}
                  media={m}
                  index={i}
                  onPreview={setPreviewMedia}
                  onEdit={setEditingMedia}
                  onDelete={handleDeleteMedia}
                  deleting={deletingId === m.id}
                />
              ))}
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

      {previewMedia &&
        (previewMedia.isVideo ? (
          <VideoModal
            media={previewMedia}
            replacing={replacing}
            deleting={deletingId === previewMedia.id}
            togglingClips={togglingClips}
            onClose={() => setPreviewMedia(null)}
            onEdit={() => setEditingMedia(previewMedia)}
            onReplace={handleReplaceMedia}
            onDelete={() => handleDeleteMedia(previewMedia.id)}
            onToggleClips={handleToggleClips}
          />
        ) : (
          <ImageModal
            media={previewMedia}
            replacing={replacing}
            deleting={deletingId === previewMedia.id}
            onClose={() => setPreviewMedia(null)}
            onEdit={() => setEditingMedia(previewMedia)}
            onReplace={handleReplaceMedia}
            onDelete={() => handleDeleteMedia(previewMedia.id)}
          />
        ))}

      {editingMedia && (
        <EditMediaModal
          media={editingMedia}
          submitting={editSubmitting}
          error={editError}
          onClose={() => {
            if (editSubmitting) return;
            setEditingMedia(null);
            setEditError("");
          }}
          onSave={handleUpdateMedia}
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
export default function ShowcaseAlbums({ brand }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [addingSection, setAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchShowcase = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getBrandShowcase(brand.id);
      const list = res?.data?.sections ?? res?.sections ?? res?.data ?? [];
      setSections(Array.isArray(list) ? list : []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brand.id]);

  useEffect(() => {
    fetchShowcase();
  }, [fetchShowcase]);

  const handleCreateSection = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      await createShowcaseSection({ brandId: brand.id, title: newTitle.trim(), sortOrder: sections.length + 1 });
      setNewTitle("");
      setAddingSection(false);
      fetchShowcase();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Section reordering — same move()-then-persist pattern as media
  // reordering, one level up.
  const handleSectionDragEnd = async (event) => {
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
    setSections(reordered); // optimistic — the grid feels instant
    try {
      await reorderShowcaseSections(
        brand.id,
        reordered.map((s, i) => ({ id: s._id, sortOrder: i + 1 }))
      );
    } catch {
      fetchShowcase(); // resync with the server if the reorder didn't stick
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-50">Showcase</p>
            <p className="mt-0.5 text-[12px] text-neutral-500">Real ambience, menu and event albums shown on this brand's profile.</p>
          </div>
          <button
            type="button"
            onClick={() => setAddingSection((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3.5 py-2 text-[12px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-400/20 dark:text-emerald-400"
          >
            <Plus size={13} />
            Add Album
          </button>
        </div>

        {addingSection && (
          <form
            onSubmit={handleCreateSection}
            className="mb-3 flex flex-col gap-2 rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:flex-row sm:items-center"
          >
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Album title, e.g. Ambience Photos"
              className={`${inputClass} sm:flex-1`}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!newTitle.trim() || creating}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating && <Loader2 size={13} className="animate-spin" />}
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingSection(false);
                  setNewTitle("");
                  setCreateError("");
                }}
                className="rounded-xl px-3 py-2.5 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                Cancel
              </button>
            </div>
            {createError && <p className="text-[11.5px] text-red-600 dark:text-red-400 sm:basis-full">{createError}</p>}
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-10 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading showcase…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            Couldn't load showcase: {loadError}
          </div>
        ) : sections.length ? (
          <DragDropProvider sensors={dragSensors} onDragEnd={handleSectionDragEnd}>
            <div className="space-y-3">
              {sections.map((s, index) => (
                <ShowcaseSectionCard key={s._id} brand={brand} section={s} index={index} onChanged={fetchShowcase} />
              ))}
            </div>
          </DragDropProvider>
        ) : (
          <EmptyState label="No showcase albums yet. Add one to upload photos or videos." />
        )}
      </div>
    </div>
  );
}
