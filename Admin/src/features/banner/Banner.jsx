import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Image as ImageIcon,
  Video,
  Film,
  Link as LinkIcon,
  AlertTriangle,
  Loader2,
  Clock3,
  Play,
  Tag,
  CalendarDays,
  LayoutGrid,
  List,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import Table from "../../components/common/Table";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  buildRedirectPayload,
  presignUploadAndConfirm,
  BANNER_TYPES,
  BANNER_UPLOAD_PURPOSE,
  REDIRECT_TYPES,
} from "./services/BannerApi";
import { bannerQueryOptions, useBanners } from "./queries/bannerQueries";
import { useCategories } from "../category/queries/categoryQueries";
import { useBrandsPage } from "../brand/queries/brandQueries";
import StatusStepButton from "../../components/common/StatusStepButton";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";

const TYPE_OPTIONS = [
  { value: BANNER_TYPES.IMAGE, label: "Image", icon: ImageIcon, accept: "image/*" },
  { value: BANNER_TYPES.VIDEO, label: "Video", icon: Video, accept: "video/*" },
  { value: BANNER_TYPES.GIF, label: "GIF", icon: Film, accept: "image/gif" },
];

const REDIRECT_OPTIONS = [
  { value: REDIRECT_TYPES.NONE, label: "None" },
  { value: REDIRECT_TYPES.CATEGORY, label: "Category" },
  { value: REDIRECT_TYPES.DEAL, label: "Deal" },
  { value: REDIRECT_TYPES.BRAND, label: "Brand" },
  { value: REDIRECT_TYPES.OFFER, label: "Offer" },
  { value: REDIRECT_TYPES.EXTERNAL_URL, label: "External URL" },
];

const TARGET_ID_TYPES = [REDIRECT_TYPES.DEAL, REDIRECT_TYPES.BRAND, REDIRECT_TYPES.OFFER];

/* ---- Banner size --------------------------------------------------------
 * The customer app's home banner is 1600 px wide and 1300–1332 px tall
 * (1332 is the ideal). Anything outside that is rejected before upload. The
 * server doesn't check this, so the panel does. Previews use the 1600 × 1332
 * shape (BANNER_ASPECT) so they look like the app.
 * ---------------------------------------------------------------------- */
export const BANNER_SPEC = { width: 1600, minHeight: 1300, height: 1332 };
export const BANNER_SPEC_LABEL = `${BANNER_SPEC.width} × ${BANNER_SPEC.minHeight}–${BANNER_SPEC.height} px`;
export const BANNER_ASPECT = "aspect-[1600/1332]";

// Real pixel size of a picked file — <img> for images/GIFs, <video>
// metadata for videos.
export function readMediaSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const done = (w, h) => {
      URL.revokeObjectURL(url);
      w && h ? resolve({ width: w, height: h }) : reject(new Error("Couldn't read this file's size."));
    };
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done(0, 0);
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done(0, 0);
      img.src = url;
    }
  });
}

// null when the size is OK, otherwise the reason it's rejected.
export function bannerSizeError({ width, height }, what = "image") {
  if (width === BANNER_SPEC.width && height >= BANNER_SPEC.minHeight && height <= BANNER_SPEC.height) return null;
  return `This ${what} is ${width} × ${height} px. Banners must be ${BANNER_SPEC.width} px wide and ${BANNER_SPEC.minHeight}–${BANNER_SPEC.height} px tall — resize it and try again.`;
}

const EMPTY_FORM = {
  id: null,
  title: "",
  description: "",
  type: BANNER_TYPES.IMAGE,
  file: null, // File object when a new media file is picked
  filePreview: "", // existing media URL (edit) or local object URL (new pick)
  posterFile: null, // still-image poster — required alongside a new VIDEO file
  posterPreview: "", // existing poster URL (edit) or local object URL (new pick)
  redirectType: REDIRECT_TYPES.NONE,
  targetId: "",
  url: "",
  startDateLocal: "", // datetime-local input value
  endDateLocal: "",
  isActive: true,
};
const TITLE_MAX_LENGTH = 25;

/* ---- date helpers -------------------------------------------------------*/
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(local) {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}
export function formatDateTime(iso) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not set";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* -------------------------------------------------------------------------
 * Add / Edit modal — type-aware media upload + title + redirect target
 * ---------------------------------------------------------------------- */

function BannerFormModal({ open, initialData, saving, categories, brands, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY_FORM);
      setErrors({});
    }
  }, [open, initialData]);

  if (!open) return null;

  const isEdit = Boolean(form.id);
  const typeOption = TYPE_OPTIONS.find((t) => t.value === form.type) || TYPE_OPTIONS[0];

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleChange = (field) => (e) => setField(field, e.target.value);

  const handleTypeChange = (nextType) => {
    // A different type picks a different file to upload — drop whatever
    // was picked (media + poster) for the previous type.
    setForm((prev) => ({
      ...prev,
      type: nextType,
      file: null,
      filePreview: "",
      fileSize: null,
      posterFile: null,
      posterPreview: "",
      posterSize: null,
    }));
    setErrors((prev) => ({ ...prev, file: undefined, posterFile: undefined }));
  };

  // Wrong-size files are rejected on pick (never reach the form / upload).
  const handleFilePick = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ""; // let the same file be re-picked after a rejection
    if (!file) return;
    try {
      const size = await readMediaSize(file);
      const error = bannerSizeError(size, typeOption.label.toLowerCase());
      if (error) {
        setErrors((prev) => ({ ...prev, file: error }));
        return;
      }
      setErrors((prev) => ({ ...prev, file: undefined }));
      setForm((prev) => ({ ...prev, file, filePreview: URL.createObjectURL(file), fileSize: size }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, file: err.message }));
    }
  };

  // The poster fills the same banner slot until the video plays — same size rule.
  const handlePosterPick = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      const size = await readMediaSize(file);
      const error = bannerSizeError(size, "poster");
      if (error) {
        setErrors((prev) => ({ ...prev, posterFile: error }));
        return;
      }
      setErrors((prev) => ({ ...prev, posterFile: undefined }));
      setForm((prev) => ({ ...prev, posterFile: file, posterPreview: URL.createObjectURL(file), posterSize: size }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, posterFile: err.message }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Banner title is required";
    else if (form.title.trim().length > TITLE_MAX_LENGTH) {
      nextErrors.title = `Banner title must be ${TITLE_MAX_LENGTH} characters or fewer`;
    }
    if (!isEdit && !form.file) nextErrors.file = `A ${typeOption.label.toLowerCase()} file is required`;
    // A video banner needs its poster whenever a new video file is being
    // sent — the backend requires both together, it never reuses an old one.
    if (form.type === BANNER_TYPES.VIDEO && form.file && !form.posterFile) {
      nextErrors.posterFile = "A poster image is required for video banners";
    }
    if (TARGET_ID_TYPES.includes(form.redirectType) || form.redirectType === REDIRECT_TYPES.CATEGORY) {
      if (!form.targetId.trim()) nextErrors.targetId = "A target is required for this redirect type";
    }
    if (form.redirectType === REDIRECT_TYPES.EXTERNAL_URL && !form.url.trim()) {
      nextErrors.url = "A URL is required for redirect type External URL";
    }
    if (form.startDateLocal && form.endDateLocal && form.startDateLocal > form.endDateLocal) {
      nextErrors.endDateLocal = "End date must be after start date";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto"
      onClick={saving ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              {isEdit ? "Edit Banner" : "Add Banner"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit ? "Update the details for this banner." : "Upload a new promotional banner."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {/* Media type */}
          <div className="mb-4">
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Media Type</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.type === t.value
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  <t.icon size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media upload — wide banner preview */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Banner {typeOption.label}
              </label>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                {BANNER_SPEC_LABEL}
              </span>
            </div>
            {/* Exactly the app's banner shape (2:1), so this is how it will look. */}
            <div className="relative mx-auto flex aspect-[1600/1332] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
              {form.filePreview ? (
                form.type === BANNER_TYPES.VIDEO ? (
                  <video src={form.filePreview} className="h-full w-full object-contain" muted controls />
                ) : (
                  <img src={form.filePreview} alt="preview" className="h-full w-full object-contain" />
                )
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                  <typeOption.icon size={24} />
                  <span className="text-[11px] font-medium">{BANNER_SPEC_LABEL}</span>
                </div>
              )}
              {form.fileSize && (
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
                  ✓ {form.fileSize.width} × {form.fileSize.height} px
                </span>
              )}
            </div>
            <label className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400">
              <typeOption.icon size={14} />
              {form.filePreview ? `Change ${typeOption.label.toLowerCase()}` : `Upload ${typeOption.label.toLowerCase()}`}
              <input type="file" accept={typeOption.accept} onChange={handleFilePick} className="hidden" />
            </label>
            {errors.file && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.file}</p>}
          </div>

          {/* Poster upload — required whenever a new video file is picked */}
          {form.type === BANNER_TYPES.VIDEO && (
            <div className="mb-4">
              <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Poster Image <span className="font-normal text-neutral-500">(shown before the video plays)</span>
              </label>
              <div className="relative mx-auto flex aspect-[1600/1332] w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
                {form.posterPreview ? (
                  <img src={form.posterPreview} alt="poster preview" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                    <ImageIcon size={24} />
                    <span className="text-[11px] font-medium">{BANNER_SPEC_LABEL}</span>
                  </div>
                )}
                {form.posterSize && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">
                    ✓ {form.posterSize.width} × {form.posterSize.height} px
                  </span>
                )}
              </div>
              <label className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400">
                <ImageIcon size={14} />
                {form.posterPreview ? "Change poster" : "Upload poster"}
                <input type="file" accept="image/*" onChange={handlePosterPick} className="hidden" />
              </label>
              {errors.posterFile && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.posterFile}</p>}
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label htmlFor="banner-title" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Banner Title
            </label>
            <input
              id="banner-title"
              value={form.title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setField("title", e.target.value.slice(0, TITLE_MAX_LENGTH))}
              placeholder="e.g. Diwali Mega Sale"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            <p className="mt-1 text-right text-[11px] text-neutral-400">{form.title.length}/{TITLE_MAX_LENGTH}</p>
            {errors.title && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="banner-description" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Description <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              id="banner-description"
              value={form.description}
              onChange={handleChange("description")}
              rows={2}
              placeholder="Up to 50% off during the festive season"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
          </div>

          {/* Redirect */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Redirect On Tap</label>
            <select
              value={form.redirectType}
              onChange={(e) => setForm((prev) => ({ ...prev, redirectType: e.target.value, targetId: "", url: "" }))}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            >
              {REDIRECT_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {form.redirectType === REDIRECT_TYPES.CATEGORY && (
              <div className="mt-2.5">
                <select
                  value={form.targetId}
                  onChange={handleChange("targetId")}
                  className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 ${
                    errors.targetId
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.targetId && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.targetId}</p>}
              </div>
            )}

            {/* Brand target = dropdown of real brands (dummy ones left out). */}
            {form.redirectType === REDIRECT_TYPES.BRAND && (
              <div className="mt-2.5">
                <select
                  value={form.targetId}
                  onChange={handleChange("targetId")}
                  className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 ${
                    errors.targetId
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                >
                  <option value="">Select a brand…</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {errors.targetId && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.targetId}</p>}
              </div>
            )}

            {TARGET_ID_TYPES.includes(form.redirectType) && form.redirectType !== REDIRECT_TYPES.BRAND && (
              <div className="mt-2.5">
                <input
                  value={form.targetId}
                  onChange={handleChange("targetId")}
                  placeholder={`${REDIRECT_OPTIONS.find((r) => r.value === form.redirectType)?.label} ID`}
                  className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                    errors.targetId
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                />
                {errors.targetId && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.targetId}</p>}
              </div>
            )}

            {form.redirectType === REDIRECT_TYPES.EXTERNAL_URL && (
              <div className="mt-2.5">
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-neutral-50 px-3.5 py-2.5 focus-within:ring-1 dark:bg-neutral-950 ${
                    errors.url
                      ? "border-red-500/60 focus-within:border-red-500/60 focus-within:ring-red-500/60"
                      : "border-neutral-200 focus-within:border-emerald-400/60 focus-within:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                >
                  <LinkIcon size={14} className="shrink-0 text-neutral-500" />
                  <input
                    value={form.url}
                    onChange={handleChange("url")}
                    placeholder="https://trydood.com"
                    className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
                  />
                </div>
                {errors.url && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.url}</p>}
              </div>
            )}
          </div>

          {/* Validity */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Start Date</label>
              <input
                type="datetime-local"
                value={form.startDateLocal}
                onChange={handleChange("startDateLocal")}
                className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 [color-scheme:light] dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark] ${
                  errors.startDateLocal
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                }`}
              />
              {errors.startDateLocal && <p className="mt-1.5 text-[11.5px] text-red-500 dark:text-red-400">{errors.startDateLocal}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">End Date</label>
              <input
                type="datetime-local"
                value={form.endDateLocal}
                onChange={handleChange("endDateLocal")}
                className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 [color-scheme:light] dark:bg-neutral-950 dark:text-neutral-200 dark:[color-scheme:dark] ${
                  errors.endDateLocal
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                }`}
              />
              {errors.endDateLocal && <p className="mt-1.5 text-[11.5px] text-red-500 dark:text-red-400">{errors.endDateLocal}</p>}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Status</label>
            <div className="flex gap-2">
              {[
                { label: "Active", value: true },
                { label: "Inactive", value: false },
              ].map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => setField("isActive", s.value)}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.isActive === s.value
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-[13.5px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

export function DeleteConfirmModal({ banner, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">Delete banner?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{banner.title}" and it will stop showing in the app.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-60"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Helpers to map between API shape and the form's shape
 * ---------------------------------------------------------------------- */

function parseRedirect(banner) {
  let r = banner.redirect;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      r = { type: REDIRECT_TYPES.NONE };
    }
  }
  return r || { type: REDIRECT_TYPES.NONE };
}

export function redirectSummary(redirect, categories) {
  if (!redirect || redirect.type === REDIRECT_TYPES.NONE) return "No redirect";
  if (redirect.type === REDIRECT_TYPES.EXTERNAL_URL) return redirect.url || "External URL";
  if (redirect.type === REDIRECT_TYPES.CATEGORY) {
    const cat = categories.find((c) => c.id === redirect.targetId);
    return `Category: ${cat?.name || redirect.targetId}`;
  }
  return `${redirect.type}: ${redirect.targetId}`;
}

// The real getAll/create/update response nests media as a single unified
// object — { url, kind, width, height, mimeType, sizeBytes, originalName,
// provider } — with `kind` (IMAGE | VIDEO | GIF) telling us the type
// directly, and for VIDEO two extra fields: `duration` and `thumbnail`
// (the poster image — named `poster` on the way in, `thumbnail` on the
// way out, deliberately, to match every other client-facing surface).
// Older records that still return per-type image/video/gif keys are kept
// as a fallback so previously-created banners keep rendering.
function extractMedia(banner) {
  if (banner.media?.url) {
    return {
      type: banner.media.kind || banner.type || BANNER_TYPES.IMAGE,
      mediaUrl: banner.media.url,
      posterUrl: banner.media.thumbnail || "",
    };
  }
  if (banner.video?.url) return { type: BANNER_TYPES.VIDEO, mediaUrl: banner.video.url, posterUrl: "" };
  if (banner.gif?.url) return { type: BANNER_TYPES.GIF, mediaUrl: banner.gif.url, posterUrl: "" };
  if (banner.image?.url) return { type: BANNER_TYPES.IMAGE, mediaUrl: banner.image.url, posterUrl: "" };
  // Fall back to a plain string if some record still returns one (e.g.
  // an older / differently-shaped record).
  if (typeof banner.image === "string") return { type: BANNER_TYPES.IMAGE, mediaUrl: banner.image, posterUrl: "" };
  if (typeof banner.video === "string") return { type: BANNER_TYPES.VIDEO, mediaUrl: banner.video, posterUrl: "" };
  if (typeof banner.gif === "string") return { type: BANNER_TYPES.GIF, mediaUrl: banner.gif, posterUrl: "" };
  return { type: banner.type || BANNER_TYPES.IMAGE, mediaUrl: "", posterUrl: "" };
}

export function apiToRow(banner) {
  const redirect = parseRedirect(banner);
  const { type, mediaUrl, posterUrl } = extractMedia(banner);
  return {
    id: banner._id ?? banner.id,
    // `title` isn't always present on the records this endpoint returns
    // (some have none at all) — fall back to the description, then a
    // placeholder, so the table/details never show a blank name.
    title: banner.title || banner.description || "Untitled banner",
    description: banner.description || "",
    type,
    mediaUrl,
    posterUrl,
    redirect,
    startDate: banner.startDate,
    endDate: banner.endDate,
    // Computed once at fetch time (not during render) so the "expiring
    // soon" chart never calls Date.now() from inside the component body.
    daysLeft: banner.endDate ? (new Date(banner.endDate).getTime() - Date.now()) / 86400000 : null,
    startsInDays: banner.startDate ? (new Date(banner.startDate).getTime() - Date.now()) / 86400000 : null,
    // Media details for the view page (width/height can be null on older records).
    mediaWidth: banner.media?.width ?? null,
    mediaHeight: banner.media?.height ?? null,
    mediaSizeBytes: banner.media?.sizeBytes ?? null,
    mediaMime: banner.media?.mimeType || "",
    mediaDuration: banner.media?.duration ?? null,
    updatedAt: banner.updatedAt,
    isActive: Boolean(banner.isActive),
    status: banner.isActive ? "Active" : "Inactive",
    // What the customer actually sees right now, for the table's status pill:
    // inactive → Inactive; past end date → Expired; before start → Scheduled.
    liveState: !banner.isActive
      ? "Inactive"
      : banner.endDate && new Date(banner.endDate).getTime() < Date.now()
      ? "Expired"
      : banner.startDate && new Date(banner.startDate).getTime() > Date.now()
      ? "Scheduled"
      : "Live",
    createdAt: banner.createdAt,
  };
}

const LIVE_STATE_TONES = { Live: "emerald", Scheduled: "sky", Expired: "red", Inactive: "neutral" };
export const TYPE_BADGE = {
  [BANNER_TYPES.IMAGE]: { label: "Image", icon: ImageIcon },
  [BANNER_TYPES.VIDEO]: { label: "Video", icon: Video },
  [BANNER_TYPES.GIF]: { label: "GIF", icon: Film },
};
const shortDate = (iso, fallback = "Not set") =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : fallback;

// "x days left" / "Starts in x days" / "Expired" chip for the Schedule column.
export function scheduleChip(row) {
  if (row.liveState === "Scheduled") {
    const d = Math.ceil(row.startsInDays);
    return { label: d <= 1 ? "Starts tomorrow" : `Starts in ${d} days`, tone: "bg-sky-400/10 text-sky-600 dark:text-sky-400" };
  }
  if (row.daysLeft == null) return { label: "No end date", tone: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" };
  if (row.daysLeft < 0) return { label: "Expired", tone: "bg-red-500/10 text-red-600 dark:text-red-400" };
  const d = Math.ceil(row.daysLeft);
  return {
    label: d <= 1 ? "Ends today" : `${d} days left`,
    tone: d <= 7 ? "bg-amber-400/10 text-amber-600 dark:text-amber-400" : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  };
}

// Redirect target as a small chip — shared by the table and the grid cards.
function RedirectChip({ redirect: r, categories }) {
  if (!r || r.type === REDIRECT_TYPES.NONE) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-1 text-[11.5px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <LinkIcon size={11} className="shrink-0" /> No redirect
      </span>
    );
  }
  if (r.type === REDIRECT_TYPES.EXTERNAL_URL) {
    let host = r.url || "External URL";
    try {
      host = new URL(r.url).hostname.replace(/^www./, "");
    } catch {
      // keep the raw text if it isn't a full URL
    }
    return (
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        title={r.url}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-sky-400/10 px-2 py-1 text-[11.5px] font-medium text-sky-700 hover:underline dark:text-sky-400"
      >
        <LinkIcon size={11} className="shrink-0" /> <span className="truncate normal-case">{host}</span>
      </a>
    );
  }
  const summary = redirectSummary(r, categories);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-violet-400/10 px-2 py-1 text-[11.5px] font-medium text-violet-700 dark:text-violet-400">
      <Tag size={11} className="shrink-0" />{" "}
      <span className="truncate" title={summary}>
        {/* The tag icon already says "category", so drop the "Category: " prefix */}
        {summary.replace(/^Category:\s*/, "")}
      </span>
    </span>
  );
}

// Banner media (image, GIF or video poster) with the type badge — the
// table thumbnail and the grid card's cover both use it. Images load lazily
// and videos only fetch metadata, so a full grid stays light.
function BannerMedia({ row, className = "", showBadge = true, children }) {
  const badge = TYPE_BADGE[row.type] || TYPE_BADGE[BANNER_TYPES.IMAGE];
  const BadgeIcon = badge.icon;
  const isVideo = row.type === BANNER_TYPES.VIDEO;
  const thumb = isVideo ? row.posterUrl || "" : row.mediaUrl;
  return (
    <div className={`relative ${BANNER_ASPECT} shrink-0 overflow-hidden bg-gradient-to-br from-emerald-400/20 via-sky-400/15 to-violet-400/20 ${className}`}>
      {thumb ? (
        <img src={thumb} alt={row.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : isVideo && row.mediaUrl ? (
        <video src={row.mediaUrl} className="h-full w-full object-cover" muted preload="metadata" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon size={18} className="text-neutral-400" />
        </div>
      )}
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={11} fill="currentColor" />
          </span>
        </span>
      )}
      {showBadge && (
        <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          <BadgeIcon size={9} /> {badge.label}
        </span>
      )}
      {children}
    </div>
  );
}

const CARD_BTN =
  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-600 transition-colors dark:border-neutral-800 dark:text-neutral-300";

// Compact status pill for the card cover — the table's StatusStepButton is
// fixed-width so its column lines up, which is far too wide over an image.
const COVER_STATUS = {
  Live: { dot: "bg-emerald-500", text: "text-emerald-700" },
  Scheduled: { dot: "bg-sky-500", text: "text-sky-700" },
  Expired: { dot: "bg-red-500", text: "text-red-700" },
  Inactive: { dot: "bg-neutral-400", text: "text-neutral-600" },
};

// "12 Oct – 30 Nov 2026" (year once when both dates share it).
function cardDateRange(start, end) {
  if (!start && !end) return "No schedule set";
  const fmt = (iso, withYear) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" } : {}) });
  if (start && end) {
    const sameYear = new Date(start).getFullYear() === new Date(end).getFullYear();
    return `${fmt(start, !sameYear)} – ${fmt(end, true)}`;
  }
  return start ? `From ${fmt(start, true)}` : `Until ${fmt(end, true)}`;
}

// Grid card: cover with type + status along the top (so the banner's own
// artwork at the bottom stays visible), then title, redirect, schedule,
// and View / Edit / Delete.
function BannerCard({ row, categories, onView, onEdit, onDelete }) {
  const chip = scheduleChip(row);
  const badge = TYPE_BADGE[row.type] || TYPE_BADGE[BANNER_TYPES.IMAGE];
  const BadgeIcon = badge.icon;
  const status = COVER_STATUS[row.liveState] || COVER_STATUS.Inactive;
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20">
      <button onClick={() => onView(row)} className="relative block w-full text-left" aria-label={`View ${row.title}`}>
        <BannerMedia row={row} showBadge={false}>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/40 to-transparent" />
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            <BadgeIcon size={10} /> {badge.label}
          </span>
          <span className={`absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold shadow-sm backdrop-blur-sm ${status.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {row.liveState}
          </span>
        </BannerMedia>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="min-w-0">
          <button
            onClick={() => onView(row)}
            title={row.title}
            className="line-clamp-1 text-left text-[14px] font-semibold text-neutral-900 hover:text-emerald-600 dark:text-neutral-50 dark:hover:text-emerald-400"
          >
            {row.title}
          </button>
          {row.description && row.description !== row.title && (
            <p className="mt-0.5 line-clamp-1 text-[11.5px] text-neutral-500" title={row.description}>
              {row.description}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <RedirectChip redirect={row.redirect} categories={categories} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
          <p className="flex min-w-0 items-center gap-1 text-[11px] text-neutral-500">
            <CalendarDays size={11} className="shrink-0" />
            <span className="truncate">{cardDateRange(row.startDate, row.endDate)}</span>
          </p>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.tone}`}>
            <Clock3 size={10} /> {chip.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => onView(row)} className={`${CARD_BTN} hover:border-sky-400/40 hover:text-sky-600 dark:hover:text-sky-400`}>
            <Eye size={13} /> View
          </button>
          <button onClick={() => onEdit(row)} className={`${CARD_BTN} hover:border-emerald-400/40 hover:text-emerald-600 dark:hover:text-emerald-400`}>
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => onDelete(row)}
            aria-label={`Delete ${row.title}`}
            title="Delete"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Remembered grid/table choice for this tab (storage can be blocked).
const VIEW_KEY = "banners:view";
const readView = () => {
  try {
    return sessionStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
};

function rowToFormDraft(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    type: row.type,
    file: null,
    filePreview: row.mediaUrl ?? "",
    posterFile: null,
    posterPreview: row.posterUrl ?? "",
    redirectType: row.redirect?.type || REDIRECT_TYPES.NONE,
    targetId: row.redirect?.targetId || "",
    url: row.redirect?.url || "",
    startDateLocal: isoToLocalInput(row.startDate),
    endDateLocal: isoToLocalInput(row.endDate),
    isActive: Boolean(row.isActive),
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Banner() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [view, setViewState] = useState(readView);
  // Grid fills 3 / 4 columns evenly; the table keeps its 10 rows.
  const limit = view === "grid" ? 12 : 10;
  const setView = (next) => {
    setViewState(next);
    setPage(1);
    try {
      sessionStorage.setItem(VIEW_KEY, next);
    } catch {
      // not remembered — fine
    }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Banner details are a page now (/banner/:id), not a modal.
  const navigate = useNavigate();
  const location = useLocation();
  const openDetails = (row) => navigate(`/banner/${row.id}`);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Categories power the redirect-target picker when type is CATEGORY.
  // A failure just leaves the picker empty.
  const categoriesQuery = useCategories({ page: 1, limit: 100 });
  const categories = useMemo(
    () => (categoriesQuery.data?.data?.data ?? []).map((c) => ({ id: c._id ?? c.id, name: c.name })),
    [categoriesQuery.data]
  );
  // Brands for the BRAND redirect picker — real brands only (isDummy skipped).
  const brandsQuery = useBrandsPage({ page: 1, limit: 100 });
  const brands = useMemo(
    () =>
      (brandsQuery.data?.data?.data ?? brandsQuery.data?.data ?? [])
        .filter((b) => !b.isDummy)
        .map((b) => ({ id: b._id ?? b.id, name: b.brandName || b.uniqueId || b._id })),
    [brandsQuery.data]
  );

  // One fetch per page / page size / search change.
  const bannersQuery = useBanners(
    { page, limit, search: debouncedSearch },
    { placeholderData: keepPreviousData }
  );
  const banners = useMemo(
    () => (bannersQuery.data?.data?.data ?? []).map(apiToRow),
    [bannersQuery.data]
  );
  const totalPages = bannersQuery.data?.data?.totalPages ?? 1;
  const loading = bannersQuery.isPending;
  const loadError = bannersQuery.error?.message ?? "";

  // Unpaginated snapshot used only to power the summary charts above the
  // table — never build a summary from a single paginated page of rows.
  // Table above still works even if this fails — chartsError surfaces why
  // the chart row is missing instead of silently leaving it blank.
  const allBannersQuery = useBanners({ page: 1, limit: 100 });
  const allBanners = useMemo(
    () => (allBannersQuery.data?.data?.data ?? []).map(apiToRow),
    [allBannersQuery.data]
  );
  const chartsError = allBannersQuery.error?.message ?? "";

  // Debounce search so we don't hit the API on every keystroke; a new
  // search goes back to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      if (search === debouncedSearch) return;
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const handleAddClick = () => {
    setEditingBanner(null);
    setSaveError("");
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingBanner(rowToFormDraft(row));
    setSaveError("");
    setModalOpen(true);
  };

  // "Edit" on the banner details page comes back here with { editId } —
  // load that banner and open the edit form, then clear the state so a
  // refresh doesn't reopen it.
  const editIdFromDetails = location.state?.editId;
  useEffect(() => {
    if (!editIdFromDetails) return;
    navigate(location.pathname, { replace: true, state: null });
    // Through the cache: the details page just loaded this banner, so this
    // is usually instant (no request while it's still fresh).
    queryClient
      .query(bannerQueryOptions(editIdFromDetails))
      .then((b) => {
        if (b) handleEdit(apiToRow(b));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromDetails]);

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      const redirect = buildRedirectPayload({
        type: form.redirectType,
        targetId: form.targetId.trim(),
        url: form.url.trim(),
      });
      // `type` is never sent — the backend derives it from the uploaded
      // file's real mime type and ignores/ rejects a stray `type` field.
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        redirect,
        startDate: localInputToIso(form.startDateLocal),
        endDate: localInputToIso(form.endDateLocal),
        isActive: form.isActive,
      };
      const isVideo = form.type === BANNER_TYPES.VIDEO;
      if (form.id) {
        // Editing: the presigned road isn't offered for update, only
        // create — send the raw file(s) as plain multipart under `media`
        // (and `poster` for a new video file).
        await updateBanner(form.id, {
          ...payload,
          mediaFile: form.file,
          posterFile: isVideo ? form.posterFile : null,
        });
      } else if (form.file) {
        // Creating with a file: presign + upload straight to S3 first,
        // then hand the confirmed upload id(s) to /banners/create instead
        // of the raw file(s). A video needs its own separate poster upload.
        const mediaUploadId = await presignUploadAndConfirm({ file: form.file, purpose: BANNER_UPLOAD_PURPOSE.MEDIA });
        let posterUploadId;
        if (isVideo) {
          posterUploadId = await presignUploadAndConfirm({ file: form.posterFile, purpose: BANNER_UPLOAD_PURPOSE.POSTER });
        }
        await createBanner({ ...payload, mediaUploadId, posterUploadId });
      } else {
        await createBanner(payload);
      }
      setModalOpen(false);
      setEditingBanner(null);
      // No manual reload — the write interceptor refreshes ["banners"].
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBanner(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete banner:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Chart data — derived from the unpaginated `allBanners` snapshot, in
  // one pass, and only when that snapshot changes (not on every keystroke).
  const { statusMix, typeMix, expiringMix, expiringData } = useMemo(() => {
    let active = 0;
    let expiring = 0;
    const byType = {};
    for (const b of allBanners) {
      if (b.isActive) {
        active += 1;
        if (b.daysLeft != null && b.daysLeft >= 0 && b.daysLeft <= 7) expiring += 1;
      }
      byType[b.type] = (byType[b.type] || 0) + 1;
    }
    const expiringMix = [
      { name: "Expiring ≤ 7 days", value: expiring },
      { name: "Others", value: allBanners.length - expiring },
    ];
    return {
      statusMix: [
        { name: "Active", value: active },
        { name: "Inactive", value: allBanners.length - active },
      ].filter((d) => d.value > 0),
      typeMix: TYPE_OPTIONS.map((t) => ({ name: t.label, count: byType[t.value] || 0 })),
      expiringMix,
      expiringData: expiringMix.filter((d) => d.value > 0),
    };
  }, [allBanners]);

  // Column config for the shared Table component — same look as the
  // voucher table.
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors dark:border-neutral-800 dark:text-neutral-400";
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-14",
      render: (_row, index) => <span className="text-neutral-500">{(page - 1) * limit + index + 1}</span>,
    },
    {
      key: "banner",
      label: "Banner",
      cellClass: "min-w-72 whitespace-normal",
      render: (row) => {
        return (
          <button onClick={() => openDetails(row)} className="group flex items-center gap-3 text-left">
            <BannerMedia row={row} className="h-14 rounded-xl" />
            <div className="min-w-0">
              <p className="line-clamp-1 font-semibold text-neutral-900 group-hover:text-emerald-600 dark:text-neutral-50 dark:group-hover:text-emerald-400">
                {row.title}
              </p>
              {row.description && row.description !== row.title && (
                <p className="mt-0.5 line-clamp-1 text-[11.5px] text-neutral-500">{row.description}</p>
              )}
              <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-neutral-400">
                <CalendarDays size={10} /> Added {shortDate(row.createdAt)}
              </p>
            </div>
          </button>
        );
      },
    },
    {
      key: "redirect",
      label: "Redirect",
      cellClass: "max-w-56 whitespace-normal",
      render: (row) => <RedirectChip redirect={row.redirect} categories={categories} />,
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (row) => {
        const chip = scheduleChip(row);
        return (
          <div>
            <p className="whitespace-nowrap text-[12px] text-neutral-600 dark:text-neutral-300">
              {shortDate(row.startDate)} – {shortDate(row.endDate, "No end date")}
            </p>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.tone}`}>
              <Clock3 size={10} /> {chip.label}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusStepButton label={row.liveState} tone={LIVE_STATE_TONES[row.liveState]} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openDetails(row)} aria-label={`View ${row.title}`} title="View" className={`${iconBtn} hover:border-sky-400/40 hover:text-sky-600 dark:hover:text-sky-400`}>
            <Eye size={13} />
          </button>
          <button onClick={() => handleEdit(row)} aria-label={`Edit ${row.title}`} title="Edit" className={`${iconBtn} hover:border-emerald-400/40 hover:text-emerald-600 dark:hover:text-emerald-400`}>
            <Pencil size={13} />
          </button>
          <button onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.title}`} title="Delete" className={`${iconBtn} hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400`}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];


  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Banner</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Upload and manage promotional banners shown in the app.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Banner
          </button>
        </div>

        {/* Charts */}
        {chartsError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            Couldn't load chart data: {chartsError}
          </div>
        )}
        {allBanners.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Status Mix</p>
              <div className="relative flex h-32.5 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={3} stroke="none">
                      {statusMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === "Active" ? "var(--color-emerald-400)" : "#d4d4d4"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[18px] font-bold text-neutral-800 dark:text-neutral-100">{allBanners.length}</p>
                  <p className="text-[10px] text-neutral-500">Banners</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Type Mix</p>
              <div className="h-32.5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeMix} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                    <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Expiring Soon</p>
              {expiringData.length ? (
                <div className="relative flex h-32.5 items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expiringData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={3} stroke="none">
                        {expiringData.map((entry) => (
                          <Cell key={entry.name} fill={entry.name === "Expiring ≤ 7 days" ? "#f59e0b" : "#d4d4d4"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <Clock3 size={14} className="mb-0.5 text-amber-500" />
                    <p className="text-[16px] font-bold text-neutral-800 dark:text-neutral-100">{expiringMix[0].value}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-32.5 items-center justify-center text-[12.5px] text-neutral-500">No banners yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Search + Grid / Table toggle */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:w-full sm:max-w-xs">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search banner..."
              className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>
          <div className="flex items-center gap-1 self-start rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 sm:self-auto">
            {[
              { key: "grid", label: "Grid", icon: LayoutGrid },
              { key: "table", label: "Table", icon: List },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-label={`${label} view`}
                aria-pressed={view === key}
                title={`${label} view`}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                  view === key ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Load state */}
        {loading && (
          <Loader label="Loading banners…" />
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load banners: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {view === "grid" ? (
              banners.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {banners.map((row) => (
                    <BannerCard
                      key={row.id}
                      row={row}
                      categories={categories}
                      onView={openDetails}
                      onEdit={handleEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="banner"
                  title={debouncedSearch ? "No banners match your search" : "No banners yet"}
                  description={debouncedSearch ? "Try a different title or clear the search." : "Banners show on the customer app's home screen. Add your first one to get started."}
                  action={debouncedSearch ? { label: "Clear search", onClick: () => setSearch("") } : { label: "Add Banner", onClick: handleAddClick }}
                />
              )
            ) : (
              <Table columns={columns} data={banners} emptyTitle="No banners yet" emptyDescription="Banners show on the customer app's home screen. Add your first one to get started." emptyIcon="banner" emptyAction={{ label: "Add Banner", onClick: handleAddClick }} minWidth={960} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12.5px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12.5px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Banner modal */}
      <BannerFormModal
        open={modalOpen}
        initialData={editingBanner}
        saving={saving}
        categories={categories}
        brands={brands}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingBanner(null);
        }}
        onSave={handleSave}
      />
      {modalOpen && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-white px-4 py-2.5 text-[12.5px] text-red-600 shadow-lg dark:bg-neutral-900 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          banner={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
