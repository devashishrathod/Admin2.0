import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import Table, { StatusBadge } from "../../components/common/Table";
import {
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
  buildRedirectPayload,
  BANNER_TYPES,
  REDIRECT_TYPES,
} from "./services/BannerApi";
import { getCategories } from "../category/services/CategoryApi";

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

const EMPTY_FORM = {
  id: null,
  title: "",
  description: "",
  type: BANNER_TYPES.IMAGE,
  file: null, // File object when a new media file is picked
  filePreview: "", // existing media URL (edit) or local object URL (new pick)
  redirectType: REDIRECT_TYPES.NONE,
  targetId: "",
  url: "",
  startDateLocal: "", // datetime-local input value
  endDateLocal: "",
  isActive: true,
};

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
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* -------------------------------------------------------------------------
 * Add / Edit modal — type-aware media upload + title + redirect target
 * ---------------------------------------------------------------------- */

function BannerFormModal({ open, initialData, saving, categories, onClose, onSave }) {
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
    // A different type uploads to a different field (image/video/gif) —
    // drop whatever was picked for the previous type.
    setForm((prev) => ({ ...prev, type: nextType, file: null, filePreview: "" }));
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, file, filePreview: URL.createObjectURL(file) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Banner title is required";
    if (!isEdit && !form.file) nextErrors.file = `A ${typeOption.label.toLowerCase()} file is required`;
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
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Banner {typeOption.label}
            </label>
            <div className="flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800">
              {form.filePreview ? (
                form.type === BANNER_TYPES.VIDEO ? (
                  <video src={form.filePreview} className="h-full w-full object-cover" muted controls />
                ) : (
                  <img src={form.filePreview} alt="preview" className="h-full w-full object-cover" />
                )
              ) : (
                <typeOption.icon size={24} className="text-neutral-400 dark:text-neutral-600" />
              )}
            </div>
            <label className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400">
              <typeOption.icon size={14} />
              {form.filePreview ? `Change ${typeOption.label.toLowerCase()}` : `Upload ${typeOption.label.toLowerCase()}`}
              <input type="file" accept={typeOption.accept} onChange={handleFilePick} className="hidden" />
            </label>
            {errors.file && <p className="mt-1.5 text-[12px] text-red-500 dark:text-red-400">{errors.file}</p>}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label htmlFor="banner-title" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Banner Title
            </label>
            <input
              id="banner-title"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="e.g. Diwali Mega Sale"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
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

            {TARGET_ID_TYPES.includes(form.redirectType) && (
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
          <div className="mb-4 grid grid-cols-2 gap-3">
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
 * View modal — read-only details for a banner
 * ---------------------------------------------------------------------- */

function BannerViewModal({ open, banner, categories, onClose }) {
  if (!open || !banner) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Banner Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
            {banner.mediaUrl ? (
              banner.type === BANNER_TYPES.VIDEO ? (
                <video src={banner.mediaUrl} className="h-full w-full object-cover" muted controls />
              ) : (
                <img src={banner.mediaUrl} alt={banner.title} className="h-full w-full object-cover" />
              )
            ) : (
              <ImageIcon size={22} className="text-neutral-400 dark:text-neutral-600" />
            )}
          </div>

          <div className="mt-4 flex items-start justify-between gap-3">
            <p className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{banner.title}</p>
            <StatusBadge status={banner.isActive ? "Active" : "Inactive"} />
          </div>

          {banner.description && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">{banner.description}</p>
          )}

          <p className="mt-3 text-[12.5px] text-sky-600 dark:text-sky-400">{redirectSummary(banner.redirect, categories)}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">Type</p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-900 capitalize dark:text-neutral-50">{banner.type?.toLowerCase()}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">Status</p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                {banner.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Validity</p>
            <p className="mt-1 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">
              {formatDateTime(banner.startDate)} → {formatDateTime(banner.endDate)}
            </p>
          </div>

          {banner.createdAt && (
            <p className="mt-4 text-[11.5px] text-neutral-400 dark:text-neutral-600">Created {formatDateTime(banner.createdAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

function DeleteConfirmModal({ banner, deleting, onCancel, onConfirm }) {
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

function redirectSummary(redirect, categories) {
  if (!redirect || redirect.type === REDIRECT_TYPES.NONE) return "No redirect";
  if (redirect.type === REDIRECT_TYPES.EXTERNAL_URL) return redirect.url || "External URL";
  if (redirect.type === REDIRECT_TYPES.CATEGORY) {
    const cat = categories.find((c) => c.id === redirect.targetId);
    return `Category: ${cat?.name || redirect.targetId}`;
  }
  return `${redirect.type}: ${redirect.targetId}`;
}

// The real getAll response nests each media file as { url, storage }
// under whichever key matches the banner's type (image/video/gif) — there
// is no separate `type` field on read, so it's derived from which of
// those keys is actually populated (with a real `url`).
function extractMedia(banner) {
  if (banner.video?.url) return { type: BANNER_TYPES.VIDEO, mediaUrl: banner.video.url };
  if (banner.gif?.url) return { type: BANNER_TYPES.GIF, mediaUrl: banner.gif.url };
  if (banner.image?.url) return { type: BANNER_TYPES.IMAGE, mediaUrl: banner.image.url };
  // Fall back to a plain string if some record still returns one (e.g.
  // an older / differently-shaped record).
  if (typeof banner.image === "string") return { type: BANNER_TYPES.IMAGE, mediaUrl: banner.image };
  if (typeof banner.video === "string") return { type: BANNER_TYPES.VIDEO, mediaUrl: banner.video };
  if (typeof banner.gif === "string") return { type: BANNER_TYPES.GIF, mediaUrl: banner.gif };
  return { type: banner.type || BANNER_TYPES.IMAGE, mediaUrl: "" };
}

function apiToRow(banner) {
  const redirect = parseRedirect(banner);
  const { type, mediaUrl } = extractMedia(banner);
  return {
    id: banner._id ?? banner.id,
    // `title` isn't always present on the records this endpoint returns
    // (some have none at all) — fall back to the description, then a
    // placeholder, so the table/details never show a blank name.
    title: banner.title || banner.description || "Untitled banner",
    description: banner.description || "",
    type,
    mediaUrl,
    redirect,
    startDate: banner.startDate,
    endDate: banner.endDate,
    // Computed once at fetch time (not during render) so the "expiring
    // soon" chart never calls Date.now() from inside the component body.
    daysLeft: banner.endDate ? (new Date(banner.endDate).getTime() - Date.now()) / 86400000 : null,
    isActive: Boolean(banner.isActive),
    status: banner.isActive ? "Active" : "Inactive",
    createdAt: banner.createdAt,
  };
}

function rowToFormDraft(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    type: row.type,
    file: null,
    filePreview: row.mediaUrl ?? "",
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
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Unpaginated snapshot used only to power the summary charts above the
  // table — never build a summary from a single paginated page of rows.
  const [allBanners, setAllBanners] = useState([]);
  const [chartsError, setChartsError] = useState("");

  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Categories power the redirect-target picker when type is CATEGORY —
  // fetched once from the existing Category API.
  useEffect(() => {
    getCategories({ page: 1, limit: 100 })
      .then((res) => {
        const rows = (res?.data?.data ?? []).map((c) => ({ id: c._id ?? c.id, name: c.name }));
        setCategories(rows);
      })
      .catch(() => {});
  }, []);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getBanners({ page, limit, search });
      const rows = (res?.data?.data ?? []).map(apiToRow);
      setBanners(rows);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  const fetchAllBanners = useCallback(async () => {
    setChartsError("");
    try {
      const res = await getBanners({ page: 1, limit: 100 });
      setAllBanners((res?.data?.data ?? []).map(apiToRow));
    } catch (err) {
      // Table above still works even if this fails — just surface why the
      // chart row is missing instead of silently leaving it blank.
      setChartsError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchAllBanners();
  }, [fetchAllBanners]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchBanners();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on page change (search effect already handles search changes)
  useEffect(() => {
    fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      const redirect = buildRedirectPayload({
        type: form.redirectType,
        targetId: form.targetId.trim(),
        url: form.url.trim(),
      });
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        redirect,
        startDate: localInputToIso(form.startDateLocal),
        endDate: localInputToIso(form.endDateLocal),
        isActive: form.isActive,
        file: form.file,
      };
      if (form.id) {
        await updateBanner(form.id, payload);
      } else {
        await createBanner(payload);
      }
      setModalOpen(false);
      setEditingBanner(null);
      fetchBanners();
      fetchAllBanners();
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
      fetchBanners();
      fetchAllBanners();
    } catch (err) {
      console.error("Failed to delete banner:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Chart data — derived from the unpaginated `allBanners` snapshot.
  const statusMix = [
    { name: "Active", value: allBanners.filter((b) => b.isActive).length },
    { name: "Inactive", value: allBanners.filter((b) => !b.isActive).length },
  ].filter((d) => d.value > 0);

  const typeMix = TYPE_OPTIONS.map((t) => ({
    name: t.label,
    count: allBanners.filter((b) => b.type === t.value).length,
  }));

  const expiringCount = allBanners.filter(
    (b) => b.isActive && b.daysLeft != null && b.daysLeft >= 0 && b.daysLeft <= 7
  ).length;
  const expiringMix = [
    { name: "Expiring ≤ 7 days", value: expiringCount },
    { name: "Others", value: allBanners.length - expiringCount },
  ];
  const expiringData = expiringMix.filter((d) => d.value > 0);

  // Column config for the shared Table component.
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{(page - 1) * limit + index + 1}</span>,
    },
    {
      key: "media",
      label: "Banner",
      render: (row) => (
        <div className="flex h-10 w-20 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
          {row.mediaUrl ? (
            row.type === BANNER_TYPES.VIDEO ? (
              <video src={row.mediaUrl} className="h-full w-full object-cover" muted />
            ) : (
              <img src={row.mediaUrl} alt={row.title} className="h-full w-full object-cover" />
            )
          ) : (
            <ImageIcon size={15} className="text-neutral-600" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.title}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <span className="capitalize text-neutral-700 dark:text-neutral-300">{row.type?.toLowerCase()}</span>,
    },
    {
      key: "redirect",
      label: "Redirect",
      render: (row) => (
        <span className="max-w-[200px] truncate text-neutral-500 dark:text-neutral-400">{redirectSummary(row.redirect, categories)}</span>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => (
        <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
          {formatDateTime(row.startDate)} → {formatDateTime(row.endDate)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setViewTarget(row)}
            aria-label={`View ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-sky-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Banner</h1>
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
              <div className="relative flex h-[130px] items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={3} stroke="none">
                      {statusMix.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === "Active" ? "#34d399" : "#d4d4d4"} />
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
              <div className="h-[130px]">
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
                <div className="relative flex h-[130px] items-center justify-center">
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
                <div className="flex h-[130px] items-center justify-center text-[12.5px] text-neutral-500">No banners yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-xs">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banner..."
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading banners…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load banners: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Table */}
            <Table columns={columns} data={banners} emptyMessage="No banners yet. Add one to get started." />

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

      {/* View Banner modal */}
      <BannerViewModal
        open={Boolean(viewTarget)}
        banner={viewTarget}
        categories={categories}
        onClose={() => setViewTarget(null)}
      />

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
