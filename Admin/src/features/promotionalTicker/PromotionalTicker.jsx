import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Image as ImageIcon,
  Loader2,
  Clock3,
  Link as LinkIcon,
  Tag,
  Store,
  CalendarDays,
  LayoutGrid,
  List,
  Megaphone,
  Hash,
  RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import Table, { StatusBadge } from "../../components/common/Table";
import {
  createPromotionalTicker,
  updatePromotionalTicker,
  deletePromotionalTicker,
  REDIRECT_TYPES,
} from "./services/PromotionalTickerApi";
import { promotionalTickerQueryOptions, usePromotionalTickers } from "./queries/promotionalTickerQueries";
import { useCategories } from "../category/queries/categoryQueries";
import { useBrandsPage } from "../brand/queries/brandQueries";
import DeleteConfirmModal from "./TickerDeleteConfirmModal";
import EmptyState from "../../components/common/EmptyState";
import { apiToRow, formatDateTime, redirectSummary } from "./tickerUtils";
import Loader from "../../components/common/Loader";
import { MISSING, orText } from "../../utils/helpers";

const EMPTY_FORM = {
  id: null,
  title: "",
  displayOrder: 0,
  icon: null, // File object when a new icon is picked
  iconPreview: "", // existing icon URL (edit) or local object URL (new pick)
  startDateLocal: "", // datetime-local input value
  endDateLocal: "",
  isActive: true,
  redirectType: REDIRECT_TYPES.NONE,
  targetId: "",
  url: "",
};
const TITLE_MAX_LENGTH = 25;

const REDIRECT_OPTIONS = [
  { value: REDIRECT_TYPES.NONE, label: "None" },
  { value: REDIRECT_TYPES.CATEGORY, label: "Category" },
  { value: REDIRECT_TYPES.DEAL, label: "Deal" },
  { value: REDIRECT_TYPES.BRAND, label: "Brand" },
  { value: REDIRECT_TYPES.OFFER, label: "Offer" },
  { value: REDIRECT_TYPES.EXTERNAL_URL, label: "External URL" },
];

// Redirect types that take a pasted id (CATEGORY and BRAND have pickers).
const TARGET_ID_TYPES = [REDIRECT_TYPES.DEAL, REDIRECT_TYPES.OFFER];
const PICKER_TYPES = [REDIRECT_TYPES.CATEGORY, REDIRECT_TYPES.BRAND];

// Always the full shape — unused keys go as null:
// { type: "NONE", targetId: null, url: null }
function buildRedirect(form) {
  const type = form.redirectType || REDIRECT_TYPES.NONE;
  const needsTarget = PICKER_TYPES.includes(type) || TARGET_ID_TYPES.includes(type);
  return {
    type,
    targetId: needsTarget ? form.targetId.trim() || null : null,
    url: type === REDIRECT_TYPES.EXTERNAL_URL ? form.url.trim() || null : null,
  };
}

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
/* -------------------------------------------------------------------------
 * Add / Edit modal — icon upload + title + redirect target + display order
 * ---------------------------------------------------------------------- */

function TickerFormModal({ open, initialData, categories = [], brands = [], saving, onClose, onSave }) {
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

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleChange = (field) => (e) => setField(field, e.target.value);

  const handleIconPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({ ...prev, icon: file, iconPreview: URL.createObjectURL(file) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Ticker title is required";
    else if (form.title.trim().length > TITLE_MAX_LENGTH) {
      nextErrors.title = `Ticker title must be ${TITLE_MAX_LENGTH} characters or fewer`;
    }
    if (!isEdit && !form.icon) nextErrors.icon = "An icon is required";
    if (!form.startDateLocal) nextErrors.startDateLocal = "Start date is required";
    if (!form.endDateLocal) nextErrors.endDateLocal = "End date is required";
    if (form.startDateLocal && form.endDateLocal && form.startDateLocal > form.endDateLocal) {
      nextErrors.endDateLocal = "End date must be after start date";
    }
    if ((TARGET_ID_TYPES.includes(form.redirectType) || PICKER_TYPES.includes(form.redirectType)) && !form.targetId.trim()) {
      nextErrors.targetId = "A target is required for this redirect type";
    }
    if (form.redirectType === REDIRECT_TYPES.EXTERNAL_URL && !form.url.trim()) {
      nextErrors.url = "A URL is required for redirect type External URL";
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
              {isEdit ? "Edit Promotional Ticker" : "Add Promotional Ticker"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit ? "Update the details for this ticker." : "Create a new promotional ticker."}
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
          {/* Icon upload */}
          <div className="mb-4">
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Icon</label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                {form.iconPreview ? (
                  <img src={form.iconPreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={18} className="text-neutral-400 dark:text-neutral-600" />
                )}
              </div>
              <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-emerald-400">
                <ImageIcon size={14} />
                {form.iconPreview ? "Change icon" : "Upload icon"}
                <input type="file" accept="image/*" onChange={handleIconPick} className="hidden" />
              </label>
            </div>
            {errors.icon && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.icon}</p>}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label htmlFor="ticker-title" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Title
            </label>
            <input
              id="ticker-title"
              value={form.title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setField("title", e.target.value.slice(0, TITLE_MAX_LENGTH))}
              placeholder="e.g. Free Shipping This Month"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            <p className="mt-1 text-right text-[11px] text-neutral-400">{form.title.length}/{TITLE_MAX_LENGTH}</p>
            {errors.title && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.title}</p>}
          </div>

          {/* Display order */}
          <div className="mb-4">
            <label htmlFor="ticker-order" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Display Order
            </label>
            <input
              id="ticker-order"
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={handleChange("displayOrder")}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
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

            {PICKER_TYPES.includes(form.redirectType) && (
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
                  <option value="">
                    {form.redirectType === REDIRECT_TYPES.BRAND ? "Select a brand…" : "Select a category…"}
                  </option>
                  {(form.redirectType === REDIRECT_TYPES.BRAND ? brands : categories).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.targetId && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.targetId}</p>}
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
                {errors.targetId && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.targetId}</p>}
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
                {errors.url && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.url}</p>}
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
              {errors.startDateLocal && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.startDateLocal}</p>}
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
              {errors.endDateLocal && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.endDateLocal}</p>}
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Ticker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * View modal — read-only details for a ticker
 * ---------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * Helpers to map between API shape and the form's shape
 * ---------------------------------------------------------------------- */

// "x days left" / "Starts in x days" / "Expired" chip — table and cards.
function scheduleChip(row) {
  if (!row.isActive) return { label: "Inactive", tone: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" };
  if (row.startsInDays != null && row.startsInDays > 0) {
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
function RedirectChip({ redirect: r, categories, brands }) {
  if (!r || r.type === REDIRECT_TYPES.NONE) return <span className="text-[12px] text-neutral-400">No redirect</span>;
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
  const summary = redirectSummary(r, categories, brands);
  const Icon = r.type === REDIRECT_TYPES.BRAND ? Store : Tag;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-violet-400/10 px-2 py-1 text-[11.5px] font-medium text-violet-700 dark:text-violet-400">
      <Icon size={11} className="shrink-0" />
      {/* The icon already says category / brand, so drop that prefix */}
      <span className="truncate" title={summary}>{summary.replace(/^(Category|Brand):\s*/, "")}</span>
    </span>
  );
}

// Ticker icon (or a placeholder), lazy-loaded.
function TickerIcon({ row, className = "h-9 w-9 rounded-lg" }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-neutral-200 dark:bg-neutral-800 ${className}`}>
      {row.icon ? (
        <img src={row.icon} alt={row.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon size={15} className="text-neutral-400 dark:text-neutral-600" />
      )}
    </div>
  );
}

const CARD_BTN =
  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 text-[12px] font-medium text-neutral-600 transition-colors dark:border-neutral-800 dark:text-neutral-300";

// Grid card: a strip previewing the ticker as it scrolls in the app, then
// order + status, redirect, schedule, and View / Edit / Delete.
function TickerCard({ row, categories, brands, onView, onEdit, onDelete }) {
  const chip = scheduleChip(row);
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 dark:bg-neutral-900 dark:shadow-black/20">
      <button
        onClick={() => onView(row)}
        aria-label={`View ${row.title}`}
        className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-left text-white"
      >
        <TickerIcon row={row} className="h-8 w-8 rounded-full bg-white/20 ring-2 ring-white/30 dark:bg-white/20" />
        <span className="line-clamp-1 flex-1 text-[13.5px] font-semibold">{row.title}</span>
        <Megaphone size={14} className="shrink-0 opacity-70" />
      </button>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" title="Display order">
            <Hash size={10} /> {row.displayOrder}
          </span>
          <StatusBadge status={row.status} />
        </div>

        <div className="min-w-0">
          <RedirectChip redirect={row.redirect} categories={categories} brands={brands} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
          <p className="flex items-center gap-1 whitespace-nowrap text-[11px] text-neutral-500">
            <CalendarDays size={11} /> {shortDate(row.startDate)} – {shortDate(row.endDate, "No end date")}
          </p>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.tone}`}>
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

const shortDate = (iso, fallback = "Not set") =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : fallback;

// Remembered grid/table choice for this tab (storage can be blocked).
const VIEW_KEY = "tickers:view";
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
    displayOrder: row.displayOrder ?? 0,
    icon: null,
    iconPreview: row.icon ?? "",
    startDateLocal: isoToLocalInput(row.startDate),
    endDateLocal: isoToLocalInput(row.endDate),
    isActive: Boolean(row.isActive),
    redirectType: row.redirect?.type || REDIRECT_TYPES.NONE,
    targetId: row.redirect?.targetId || "",
    url: row.redirect?.url || "",
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function PromotionalTicker() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const openDetails = (row) => navigate(`/promotional-ticker/${row.id}`);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Categories power the redirect-target picker when redirect type is
  // CATEGORY. A failure just leaves the picker empty.
  const categoriesQuery = useCategories({ page: 1, limit: 100 });
  const categories = useMemo(
    () => (categoriesQuery.data?.data?.data ?? []).map((c) => ({ id: c._id ?? c.id, name: c.name })),
    [categoriesQuery.data]
  );
  // Brands power the picker when redirect type is BRAND.
  // Real brands only — isDummy ones never show in the picker.
  const brandsQuery = useBrandsPage({ page: 1, limit: 100 });
  const brands = useMemo(
    () =>
      (brandsQuery.data?.data?.data ?? brandsQuery.data?.data ?? [])
        .filter((b) => !b.isDummy)
        .map((b) => ({ id: b._id ?? b.id, name: b.brandName || b.name || b._id })),
    [brandsQuery.data]
  );

  // One fetch per page / page size / search change.
  const tickersQuery = usePromotionalTickers(
    { page, limit, search: debouncedSearch },
    { placeholderData: keepPreviousData }
  );
  const tickers = useMemo(
    () => (tickersQuery.data?.data?.data ?? []).map(apiToRow),
    [tickersQuery.data]
  );
  const totalPages = tickersQuery.data?.data?.totalPages ?? 1;
  const loading = tickersQuery.isPending;
  const loadError = tickersQuery.error?.message ?? "";

  // Unpaginated snapshot used only to power the summary charts above the
  // table — never build a summary from a single paginated page of rows.
  // Table above still works even if this fails — chartsError surfaces why
  // the chart row is missing instead of silently leaving it blank.
  const allTickersQuery = usePromotionalTickers({ page: 1, limit: 100 });
  const allTickers = useMemo(
    () => (allTickersQuery.data?.data?.data ?? []).map(apiToRow),
    [allTickersQuery.data]
  );
  const chartsError = allTickersQuery.error?.message ?? "";

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
    setEditingTicker(null);
    setSaveError("");
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingTicker(rowToFormDraft(row));
    setSaveError("");
    setModalOpen(true);
  };

  const editIdFromDetails = location.state?.editId;
  useEffect(() => {
    if (!editIdFromDetails) return;
    navigate(location.pathname, { replace: true, state: null });
    // Through the cache: the details page just loaded this ticker, so this
    // is usually instant (no request while it's still fresh).
    queryClient
      .query(promotionalTickerQueryOptions(editIdFromDetails))
      .then((ticker) => {
        if (ticker) handleEdit(apiToRow(ticker));
        else setSaveError("This promotional ticker could not be found.");
      })
      .catch((err) => setSaveError(err.message));
    // The navigation state is consumed once; the form is opened from the
    // asynchronously loaded record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdFromDetails]);

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        title: form.title.trim(),
        displayOrder: Number(form.displayOrder) || 0,
        startDate: localInputToIso(form.startDateLocal),
        endDate: localInputToIso(form.endDateLocal),
        isActive: form.isActive,
        icon: form.icon,
        redirect: buildRedirect(form),
      };
      if (form.id) {
        await updatePromotionalTicker(form.id, payload);
      } else {
        await createPromotionalTicker(payload);
      }
      setModalOpen(false);
      setEditingTicker(null);
      // No manual reload — the write interceptor refreshes ["promotionalTickers"].
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deletePromotionalTicker(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete ticker:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Chart data — derived from the unpaginated `allTickers` snapshot, in
  // one pass, and only when that snapshot changes (not on every keystroke).
  const { statusMix, redirectMix, expiringMix, expiringData } = useMemo(() => {
    let active = 0;
    let expiring = 0;
    const byRedirect = {};
    for (const t of allTickers) {
      if (t.isActive) {
        active += 1;
        if (t.daysLeft != null && t.daysLeft >= 0 && t.daysLeft <= 7) expiring += 1;
      }
      const type = t.redirect?.type || REDIRECT_TYPES.NONE;
      byRedirect[type] = (byRedirect[type] || 0) + 1;
    }
    const expiringMix = [
      { name: "Expiring ≤ 7 days", value: expiring },
      { name: "Others", value: allTickers.length - expiring },
    ];
    return {
      statusMix: [
        { name: "Active", value: active },
        { name: "Inactive", value: allTickers.length - active },
      ].filter((d) => d.value > 0),
      redirectMix: Object.values(REDIRECT_TYPES).map((type) => ({
        name: type === "NONE" ? "No redirect" : type.replace(/_/g, " "),
        count: byRedirect[type] || 0,
      })),
      expiringMix,
      expiringData: expiringMix.filter((d) => d.value > 0),
    };
  }, [allTickers]);

  // Column config for the shared Table component.
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{(page - 1) * limit + index + 1}</span>,
    },
    {
      key: "icon",
      label: "Icon",
      render: (row) => <TickerIcon row={row} />,
    },
    {
      key: "title",
      label: "Title",
      render: (row) => <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.title}</span>,
    },
    {
      key: "redirect",
      label: "Redirect",
      cellClass: "max-w-56 whitespace-normal",
      render: (row) => <RedirectChip redirect={row.redirect} categories={categories} brands={brands} />,
    },
    {
      key: "displayOrder",
      label: "Order",
      align: "center",
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => {
        const chip = scheduleChip(row);
        return (
          <div>
            <p className="whitespace-nowrap text-[12px] text-neutral-500 dark:text-neutral-400">
              {orText(formatDateTime(row.startDate), MISSING.date)} → {orText(formatDateTime(row.endDate), "No end date")}
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
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "action",
      label: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openDetails(row)}
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Promotional Ticker</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Manage the scrolling promotional tickers shown in the app.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Ticker
          </button>
        </div>

        {/* Charts */}
        {chartsError && (
          <EmptyState
            variant="compact"
            tone="error"
            icon="error"
            title="Couldn't load chart data"
            description={chartsError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => allTickersQuery.refetch() }}
            className="mb-4"
          />
        )}
        {allTickers.length > 0 && (
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
                  <p className="text-[18px] font-bold text-neutral-800 dark:text-neutral-100">{allTickers.length}</p>
                  <p className="text-[10px] text-neutral-500">Tickers</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Redirect Mix</p>
              <div className="h-32.5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={redirectMix} barCategoryGap="25%">
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#a3a3a3" }} axisLine={false} tickLine={false} interval={0} />
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
                <div className="flex h-32.5 items-center justify-center text-[12.5px] text-neutral-500">No tickers yet.</div>
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
              placeholder="Search ticker..."
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
          <Loader label="Loading tickers…" />
        )}

        {!loading && loadError && (
          <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load promotional tickers"
              description={loadError}
              action={{ label: "Try again", icon: RefreshCw, onClick: () => tickersQuery.refetch() }}
            />
          </div>
        )}

        {!loading && !loadError && (
          <>
            {view === "grid" ? (
              tickers.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tickers.map((row) => (
                    <TickerCard
                      key={row.id}
                      row={row}
                      categories={categories}
                      brands={brands}
                      onView={openDetails}
                      onEdit={handleEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="ticker"
                  title={debouncedSearch ? "No tickers match your search" : "No promotional tickers yet"}
                  description={debouncedSearch ? "Try a different title or clear the search." : "Tickers scroll across the top of the customer app. Add one to start promoting."}
                  action={debouncedSearch ? { label: "Clear search", onClick: () => setSearch("") } : { label: "Add Ticker", onClick: handleAddClick }}
                />
              )
            ) : (
              <Table columns={columns} data={tickers} emptyTitle="No promotional tickers yet" emptyDescription="Tickers scroll across the top of the customer app. Add one to start promoting." emptyIcon="ticker" emptyAction={{ label: "Add Ticker", onClick: handleAddClick }} />
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

      {/* Add / Edit Ticker modal */}
      <TickerFormModal
        open={modalOpen}
        initialData={editingTicker}
        categories={categories}
        brands={brands}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingTicker(null);
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
          ticker={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
