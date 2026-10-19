import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Eye,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import CommonEmptyState from "../../components/common/EmptyState";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import {
  addListingFeature,
  deleteListingFeature,
  getListingFeatures,
  updateListingFeature,
  LISTING_FEATURE_LIMITS,
} from "./services/listingFeaturesApi";
import Loader from "../../components/common/Loader";

/* -------------------------------------------------------------------------
 * Listing Features tab (Brand Details) — the amenities shown on a brand's
 * listing (Dine-In, Free Wi-Fi, …). Admin can add, view, edit and delete
 * them, same fields as the VenderPanel's Add Listing Feature modal: title,
 * description, icon (image or video) and Active. Dummy brands are view-only.
 * ---------------------------------------------------------------------- */

const VIDEO_URL = /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i;

function toFeature(f) {
  const icon = f.icon?.url ?? (typeof f.icon === "string" ? f.icon : "");
  return {
    id: f._id ?? f.id,
    title: f.title || "Untitled feature",
    description: f.description || "",
    icon,
    isVideo: VIDEO_URL.test(icon) || String(f.icon?.mimeType || "").startsWith("video/"),
    isActive: f.isActive !== false,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Icon / video thumbnail. Images load lazily; videos only fetch metadata.
function FeatureMedia({ src, isVideo, alt, className = "", controls = false }) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 ${className}`}>
        <ImageIcon size={18} className="text-neutral-400" />
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className={`relative overflow-hidden bg-neutral-950 ${className}`}>
        <video src={src} className="h-full w-full object-cover" muted preload="metadata" controls={controls} playsInline />
        {!controls && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
              <Play size={11} fill="currentColor" />
            </span>
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={`overflow-hidden bg-neutral-50 dark:bg-neutral-800 ${className}`}>
      <img src={src} alt={alt} loading="lazy" decoding="async" className="h-full w-full object-contain" />
    </div>
  );
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
        active ? "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-neutral-400"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ---- Add / Edit modal -------------------------------------------------- */

const fieldClass =
  "w-full rounded-xl border border-transparent bg-emerald-50/70 px-3.5 py-2.5 text-[13.5px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-emerald-300 focus:bg-white dark:bg-emerald-500/10 dark:text-neutral-100 dark:focus:border-emerald-500/40 dark:focus:bg-neutral-900";

function FeatureFormModal({ feature, onClose, onSubmit }) {
  const isEdit = Boolean(feature);
  const [title, setTitle] = useState(feature?.title || "");
  const [description, setDescription] = useState(feature?.description || "");
  const [isActive, setIsActive] = useState(feature?.isActive ?? true);
  const [iconFile, setIconFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Free the local preview URL when it's replaced or the modal closes.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Icon must be an image or a video.");
      return;
    }
    setError("");
    setIconFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Title is required.");
    if (!isEdit && !iconFile) return setError("Please choose an icon image or video.");
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), isActive, iconFile });
      onClose();
    } catch (err) {
      setError(err.message || `Couldn't ${isEdit ? "update" : "add"} this feature.`);
      setSubmitting(false);
    }
  };

  const shownSrc = previewUrl || feature?.icon || "";
  const shownIsVideo = iconFile ? iconFile.type.startsWith("video/") : Boolean(feature?.isVideo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={submitting ? undefined : onClose}>
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
              {isEdit ? <Pencil size={17} /> : <Plus size={18} />}
            </span>
            <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              {isEdit ? "Edit Listing Feature" : "Add Listing Feature"}
            </h3>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close" className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="lf-title" className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Title</label>
              <span className="text-[10.5px] text-neutral-400">{title.length}/{LISTING_FEATURE_LIMITS.title}</span>
            </div>
            <input
              id="lf-title"
              value={title}
              maxLength={LISTING_FEATURE_LIMITS.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dine-In"
              className={fieldClass}
              autoFocus
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="lf-desc" className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Description</label>
              <span className="text-[10.5px] text-neutral-400">{description.length}/{LISTING_FEATURE_LIMITS.description}</span>
            </div>
            <textarea
              id="lf-desc"
              rows={3}
              value={description}
              maxLength={LISTING_FEATURE_LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this feature"
              className={`${fieldClass} resize-none`}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Icon (image or video)
              {isEdit && <span className="font-normal text-neutral-400"> — leave it to keep the current one</span>}
            </p>
            <div className="flex items-center gap-3">
              <FeatureMedia src={shownSrc} isVideo={shownIsVideo} alt="Icon preview" className="h-20 w-20 shrink-0 rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800" />
              <label className="flex h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-[12px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400">
                <UploadCloud size={16} />
                <span className="max-w-full truncate px-2">{iconFile ? iconFile.name : shownSrc ? "Change icon" : "Choose file"}</span>
                <input type="file" accept="image/*,video/*" onChange={pickFile} className="hidden" />
              </label>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-xl bg-neutral-50 px-3.5 py-2.5 dark:bg-neutral-800/60">
            <span>
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Active</span>
              <span className="block text-[11px] text-neutral-500">Shown on the brand's listing</span>
            </span>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-emerald-500" />
          </label>

          {error && (
            <p className="flex items-center gap-1.5 rounded-xl bg-red-500/5 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? (isEdit ? "Updating…" : "Adding…") : isEdit ? "Update Feature" : "Add Feature"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---- View modal ------------------------------------------------------- */

function FeatureViewModal({ feature, readOnly, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
        <div className="relative">
          <FeatureMedia src={feature.icon} isVideo={feature.isVideo} alt={feature.title} controls className="aspect-video w-full" />
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{feature.title}</h3>
            <StatusPill active={feature.isActive} />
          </div>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            {feature.description || <span className="text-neutral-400">No description added.</span>}
          </p>
          <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-[11.5px] dark:border-neutral-800">
            <p className="text-neutral-500">
              Added <span className="block font-medium text-neutral-800 dark:text-neutral-200">{fmtDate(feature.createdAt)}</span>
            </p>
            <p className="text-neutral-500">
              Last updated <span className="block font-medium text-neutral-800 dark:text-neutral-200">{fmtDate(feature.updatedAt)}</span>
            </p>
          </div>
          {!readOnly && (
            <button
              onClick={() => onEdit(feature)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-400 text-[13px] font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              <Pencil size={14} /> Edit Feature
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- Card -------------------------------------------------------------- */

const CARD_BTN =
  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-600 transition-colors dark:border-neutral-800 dark:text-neutral-300";

function FeatureCard({ feature, readOnly, onView, onEdit, onDelete }) {
  return (
    <div className="group flex flex-col rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-start gap-3">
        <button onClick={() => onView(feature)} aria-label={`View ${feature.title}`} className="shrink-0">
          <FeatureMedia src={feature.icon} isVideo={feature.isVideo} alt={feature.title} className="h-14 w-14 rounded-xl ring-1 ring-neutral-200 dark:ring-neutral-800" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => onView(feature)}
              title={feature.title}
              className="line-clamp-1 text-left text-[14px] font-semibold text-neutral-900 hover:text-emerald-600 dark:text-neutral-50 dark:hover:text-emerald-400"
            >
              {feature.title}
            </button>
            <StatusPill active={feature.isActive} />
          </div>
          <p className="mt-1 line-clamp-2 min-h-8 text-[12px] leading-4 text-neutral-500" title={feature.description}>
            {feature.description || <span className="text-neutral-400">No description</span>}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1 border-t border-neutral-100 pt-2.5 text-[11px] text-neutral-500 dark:border-neutral-800">
        <CalendarDays size={11} /> Added {fmtDate(feature.createdAt)}
      </p>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button onClick={() => onView(feature)} className={`${CARD_BTN} hover:border-sky-400/40 hover:text-sky-600 dark:hover:text-sky-400`}>
          <Eye size={13} /> View
        </button>
        {!readOnly && (
          <>
            <button onClick={() => onEdit(feature)} className={`${CARD_BTN} hover:border-emerald-400/40 hover:text-emerald-600 dark:hover:text-emerald-400`}>
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={() => onDelete(feature)}
              aria-label={`Delete ${feature.title}`}
              title="Delete"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---- Tab --------------------------------------------------------------- */

export default function ListingFeaturesTab({ brand, readOnly = false }) {
  const brandId = brand.id;
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formTarget, setFormTarget] = useState(null); // null = closed, "new" = add, feature = edit
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getListingFeatures(brandId);
      setFeatures(list.map(toFeature));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values) => {
    if (formTarget === "new") {
      await addListingFeature(brandId, values);
    } else {
      await updateListingFeature(formTarget.id, { brandId, ...values });
    }
    load();
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteListingFeature(deleting.id, brandId);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteBusy(false);
    }
  };

  const activeCount = features.filter((f) => f.isActive).length;
  const openEdit = (f) => {
    setViewing(null);
    setFormTarget(f);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
            <Sparkles size={15} className="text-emerald-500" /> Listing Features
          </h3>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            Amenities shown on this brand's listing
            {features.length > 0 && ` · ${activeCount} of ${features.length} active`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            aria-label="Refresh"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {!readOnly && (
            <button
              onClick={() => setFormTarget("new")}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              <Plus size={15} /> Add Feature
            </button>
          )}
        </div>
      </div>

      {loading && features.length === 0 ? (
        <Loader label="Loading listing features…" />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> Couldn't load listing features: {error}</span>
          <button onClick={load} className="font-semibold underline underline-offset-2">Retry</button>
        </div>
      ) : features.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200/70 bg-white/40 dark:border-neutral-800 dark:bg-neutral-900/40">
          <CommonEmptyState
            variant="compact"
            icon={Sparkles}
            title="No listing features yet"
            description={readOnly ? "This brand hasn't added any listing features." : "Add amenities like Dine-In, Free Wi-Fi or Valet Parking."}
            action={readOnly ? undefined : { label: "Add Feature", onClick: () => setFormTarget("new"), icon: Plus }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.id} feature={f} readOnly={readOnly} onView={setViewing} onEdit={openEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {formTarget && (
        <FeatureFormModal
          key={formTarget === "new" ? "new" : formTarget.id}
          feature={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSubmit={handleSubmit}
        />
      )}

      {viewing && <FeatureViewModal feature={viewing} readOnly={readOnly} onClose={() => setViewing(null)} onEdit={openEdit} />}

      <ConfirmActionModal
        open={Boolean(deleting)}
        tone="danger"
        icon={Trash2}
        title="Delete listing feature?"
        description={deleting ? `"${deleting.title}" will be removed from this brand's listing. This can't be undone.` : ""}
        confirmLabel="Delete"
        submitting={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => {
          if (deleteBusy) return;
          setDeleting(null);
          setDeleteError("");
        }}
      />
    </div>
  );
}
