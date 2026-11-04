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
  EyeOff,
  CheckCircle2,
  Radio,
  CalendarClock,
  Smartphone,
  PieChart as PieIcon,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Table from "../../components/common/Table";
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
import ToggleSwitch from "../../components/common/ToggleSwitch";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import StatusStepButton from "../../components/common/StatusStepButton";
import TickerPreview from "./TickerPreview";
import { LimitedField } from "../category/CatalogShared";
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

  // Add stays disabled until every required input is in (like Category).
  // Same rules handleSubmit checks; `missing` names what's left.
  const missing = [
    !form.title.trim() && "title",
    !isEdit && !form.icon && "icon",
    !form.startDateLocal && "start date",
    !form.endDateLocal && "end date",
    form.startDateLocal && form.endDateLocal && form.startDateLocal > form.endDateLocal && "end date after the start",
    (TARGET_ID_TYPES.includes(form.redirectType) || PICKER_TYPES.includes(form.redirectType)) && !form.targetId.trim() && "redirect target",
    form.redirectType === REDIRECT_TYPES.EXTERNAL_URL && !form.url.trim() && "URL",
  ].filter(Boolean);
  const canSubmit = missing.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = "Title is required";
    else if (form.title.trim().length > TITLE_MAX_LENGTH) {
      nextErrors.title = `Title must be ${TITLE_MAX_LENGTH} characters or fewer`;
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
          {/* Live preview — updates as the icon / title change */}
          <div className="mb-4">
            <p className="mb-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Preview in app</p>
            <TickerPreview items={[{ key: "draft", title: form.title.trim() || "Your ticker title", icon: form.iconPreview }]} />
          </div>

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
            <LimitedField
              id="ticker-title"
              label="Title"
              required
              value={form.title}
              onChange={(v) => {
                setField("title", v);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              max={TITLE_MAX_LENGTH}
              placeholder="e.g. Free Shipping This Month"
              error={errors.title}
            />
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
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {!canSubmit && (
              <p className="mr-auto text-[11.5px] text-neutral-500">
                Still needed: <span className="font-medium text-neutral-700 dark:text-neutral-300">{missing.join(", ")}</span>
              </p>
            )}
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
              disabled={saving || !canSubmit}
              title={canSubmit ? undefined : `Add ${missing.join(", ")} first`}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
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
  if (!row.isActive) return { label: "Deactive", tone: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" };
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

// Live state pill — status the customer actually gets right now.
const LIVE_STATE = {
  Live: { dot: "bg-emerald-500", text: "text-emerald-700", tone: "emerald" },
  Scheduled: { dot: "bg-sky-500", text: "text-sky-700", tone: "sky" },
  Expired: { dot: "bg-red-500", text: "text-red-700", tone: "red" },
  Inactive: { dot: "bg-neutral-400", text: "text-neutral-600", tone: "neutral", label: "Deactive" },
};
const liveLabel = (state) => LIVE_STATE[state]?.label || state;
// Status donut slices — same hues as the pills' dots.
const STATE_COLORS = { Live: "#10b981", Scheduled: "#0ea5e9", Expired: "#ef4444", Inactive: "#a3a3a3" };

const OV_CARD = "rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

// Small KPI tile for the overview row.
function OverviewTile({ icon: Icon, tint, label, value, note }) {
  return (
    <div className={`${OV_CARD} flex items-center gap-3 !p-3.5`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11.5px] font-medium text-neutral-500">{label}</p>
        <p className="text-[19px] font-bold leading-tight tabular-nums text-neutral-900 dark:text-neutral-50">{value}</p>
        {note && <p className="truncate text-[10.5px] text-neutral-500">{note}</p>}
      </div>
    </div>
  );
}

// Grid card — same compact layout as the Banner / Category cards: icon +
// title + order / live state on top, Active/Deactive switch top-right, a
// mini app preview strip (scrolls on hover), one schedule line, then
// redirect + View / Edit / Delete icons.
function TickerCard({ row, categories, brands, toggling, onToggle, onView, onEdit, onDelete }) {
  const chip = scheduleChip(row);
  const state = LIVE_STATE[row.liveState] || LIVE_STATE.Inactive;
  const hasSchedule = Boolean(row.startDate || row.endDate);
  const iconBtn =
    "flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800";
  return (
    <div
      className={`ticker-card group relative flex flex-col rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-emerald-400/30 dark:bg-neutral-900 dark:shadow-black/20 ${
        row.isActive ? "" : "opacity-80"
      }`}
    >
      {/* Active / Deactive switch, top-right */}
      <div className="absolute right-3 top-3">
        <ToggleSwitch
          checked={row.isActive}
          disabled={toggling}
          title={row.isActive ? "Click to make Deactive" : "Click to make Active"}
          onChange={() => onToggle(row)}
        />
      </div>

      {/* Icon + title */}
      <div className="flex items-center gap-3 pr-11">
        <button onClick={() => onView(row)} title="View" aria-label={`View ${row.title}`} className="shrink-0 transition-transform group-hover:scale-[1.03]">
          <TickerIcon row={row} className="h-14 w-14 rounded-2xl ring-1 ring-neutral-200/70 dark:ring-neutral-700/60" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onView(row)}
            title={row.title}
            className="block max-w-full truncate text-left text-[14px] font-semibold leading-tight text-neutral-900 hover:text-emerald-600 dark:text-neutral-50 dark:hover:text-emerald-400"
          >
            {row.title}
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span
              title="Display order"
              className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <Hash size={10} /> {row.displayOrder}
            </span>
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold dark:bg-neutral-800 dark:text-neutral-200 ${state.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
              {liveLabel(row.liveState)}
            </span>
          </div>
        </div>
      </div>

      {/* How it looks in the app — scrolls while the card is hovered */}
      <TickerPreview items={[{ key: row.id, title: row.title, icon: row.icon }]} mode="hover" size="sm" className="mt-3" />

      {/* Schedule — dates + "x days left" on one line */}
      <div className="mt-2.5 flex min-w-0 items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span className="flex min-w-0 items-center gap-1">
          <CalendarDays size={11} className="shrink-0" />
          <span className="truncate">{hasSchedule ? `${shortDate(row.startDate)} – ${shortDate(row.endDate, "No end date")}` : "No schedule set"}</span>
        </span>
        {hasSchedule && row.isActive && (
          <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip.tone}`}>
            <Clock3 size={10} /> {chip.label}
          </span>
        )}
      </div>

      {/* Redirect + actions */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <RedirectChip redirect={row.redirect} categories={categories} brands={brands} />
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={() => onView(row)} aria-label={`View ${row.title}`} title="View" className={`${iconBtn} hover:text-sky-600 dark:hover:text-sky-400`}>
            <Eye size={14} />
          </button>
          <button onClick={() => onEdit(row)} aria-label={`Edit ${row.title}`} title="Edit" className={`${iconBtn} hover:text-emerald-600 dark:hover:text-emerald-400`}>
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(row)}
            aria-label={`Delete ${row.title}`}
            title="Delete"
            className={`${iconBtn} hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400`}
          >
            <Trash2 size={14} />
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
  // Active / Deactive switch — the ticker being flipped (confirm first).
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const askToggle = (row) => {
    setStatusError("");
    setStatusTarget(row);
  };

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

  // PUT /promotionalTickers/update/:id. This client's form-data builder
  // always sends title + displayOrder, so the ticker's current values go
  // along unchanged and only isActive flips.
  const confirmStatus = async () => {
    if (!statusTarget) return;
    setStatusSaving(true);
    setStatusError("");
    try {
      const t = statusTarget;
      await updatePromotionalTicker(t.id, {
        title: t.title,
        redirect: t.redirect,
        displayOrder: t.displayOrder,
        startDate: t.startDate,
        endDate: t.endDate,
        isActive: !t.isActive,
      });
      setStatusTarget(null);
      // No manual reload — the write interceptor refreshes ["promotionalTickers"].
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusSaving(false);
    }
  };

  // What the app's strip shows right now: live tickers in display order.
  const liveTickers = useMemo(
    () =>
      allTickers
        .filter((t) => t.liveState === "Live")
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((t) => ({ key: t.id, title: t.title, icon: t.icon })),
    [allTickers]
  );

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
  const overview = useMemo(() => {
    const byState = { Live: 0, Scheduled: 0, Expired: 0, Inactive: 0 };
    let expiring = 0;
    const byRedirect = {};
    for (const t of allTickers) {
      byState[t.liveState] = (byState[t.liveState] || 0) + 1;
      if (t.liveState === "Live" && t.daysLeft != null && t.daysLeft <= 7) expiring += 1;
      const type = t.redirect?.type || REDIRECT_TYPES.NONE;
      byRedirect[type] = (byRedirect[type] || 0) + 1;
    }
    return {
      total: allTickers.length,
      byState,
      expiring,
      statusMix: Object.keys(LIVE_STATE)
        .map((key) => ({ key, name: liveLabel(key), value: byState[key] || 0, color: STATE_COLORS[key] }))
        .filter((d) => d.value > 0),
      redirectMix: Object.values(REDIRECT_TYPES)
        .map((type) => ({ name: type === "NONE" ? "No redirect" : type.replace(/_/g, " ").toLowerCase(), count: byRedirect[type] || 0 }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
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
      // Click → confirm → Active / Deactive (same as the card's switch).
      render: (row) => (
        <StatusStepButton
          label={liveLabel(row.liveState)}
          tone={(LIVE_STATE[row.liveState] || LIVE_STATE.Inactive).tone}
          stepLabel={row.isActive ? "Deactivate" : "Activate"}
          disabled={statusSaving}
          onClick={() => askToggle(row)}
        />
      ),
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
            Add
          </button>
        </div>

        {/* Overview — from the unpaginated snapshot:
              row 1: four KPI tiles
              row 2: app preview (live tickers, display order) · status · redirect */}
        {chartsError && (
          <EmptyState
            variant="compact"
            tone="error"
            icon="error"
            title="Couldn't load the overview"
            description={chartsError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => allTickersQuery.refetch() }}
            className="mb-4"
          />
        )}
        {!allTickersQuery.isPending && !chartsError && (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <OverviewTile icon={Megaphone} tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" label="Total tickers" value={overview.total} note={`${overview.byState.Inactive} deactive`} />
              <OverviewTile icon={Radio} tint="bg-sky-400/10 text-sky-600 dark:text-sky-400" label="Live now" value={overview.byState.Live} note="Scrolling in the app" />
              <OverviewTile icon={CalendarClock} tint="bg-violet-400/10 text-violet-600 dark:text-violet-400" label="Scheduled" value={overview.byState.Scheduled} note="Start later" />
              <OverviewTile
                icon={Clock3}
                tint="bg-amber-400/10 text-amber-600 dark:text-amber-400"
                label="Ending in 7 days"
                value={overview.expiring}
                note={`${overview.byState.Expired} already expired`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              {/* App preview */}
              <div className={`${OV_CARD} lg:col-span-6`}>
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
                  <Smartphone size={14} className="text-emerald-500" /> App preview
                </p>
                <p className="mb-3 mt-0.5 truncate text-[11.5px] text-neutral-500">
                  {liveTickers.length
                    ? `${liveTickers.length} live ticker${liveTickers.length === 1 ? "" : "s"} · in display order · hover to pause`
                    : "Active tickers inside their schedule show here"}
                </p>
                {/* Mock of the app's top area so the strip reads in context */}
                <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-neutral-200/70 dark:bg-neutral-950/60 dark:ring-neutral-800">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    <span className="h-2.5 w-24 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                    <span className="ml-auto h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                  <TickerPreview items={liveTickers} emptyText="No live ticker right now" />
                  <div className="mt-2.5 h-8 rounded-xl bg-neutral-200/70 dark:bg-neutral-800/70" />
                </div>
              </div>

              {/* Status */}
              <div className={`${OV_CARD} lg:col-span-3`}>
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
                  <PieIcon size={14} className="text-emerald-500" /> Status
                </p>
                <p className="mb-2 mt-0.5 text-[11.5px] text-neutral-500">What customers get right now</p>
                {overview.total ? (
                  <div className="flex items-center gap-3">
                    <div className="relative h-24 w-24 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={overview.statusMix} dataKey="value" nameKey="name" innerRadius={30} outerRadius={42} paddingAngle={3} cornerRadius={4} stroke="none" isAnimationActive={false}>
                            {overview.statusMix.map((s) => (
                              <Cell key={s.key} fill={s.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[16px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{overview.total}</p>
                        <p className="mt-0.5 text-[9.5px] text-neutral-500">Tickers</p>
                      </div>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1">
                      {overview.statusMix.map((s) => (
                        <li key={s.key} className="flex items-center gap-1.5 text-[11.5px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                          <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{s.name}</span>
                          <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{s.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="py-6 text-center text-[12px] text-neutral-500">No tickers yet.</p>
                )}
              </div>

              {/* Redirect mix */}
              <div className={`${OV_CARD} lg:col-span-3`}>
                <p className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
                  <LinkIcon size={14} className="text-emerald-500" /> Tap goes to
                </p>
                <p className="mb-2.5 mt-0.5 text-[11.5px] text-neutral-500">Redirect type of each ticker</p>
                {overview.redirectMix.length ? (
                  <ul className="space-y-2">
                    {overview.redirectMix.map((r) => (
                      <li key={r.name}>
                        <div className="mb-1 flex items-center justify-between text-[11.5px]">
                          <span className="truncate capitalize text-neutral-600 dark:text-neutral-300">{r.name}</span>
                          <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{r.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <div className="h-full rounded-full bg-sky-400" style={{ width: `${(r.count / overview.total) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-6 text-center text-[12px] text-neutral-500">No tickers yet.</p>
                )}
              </div>
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
                      toggling={statusSaving && statusTarget?.id === row.id}
                      onToggle={askToggle}
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

      {/* Active / Deactive confirmation */}
      <ConfirmActionModal
        open={Boolean(statusTarget)}
        tone={statusTarget?.isActive ? "danger" : "neutral"}
        icon={statusTarget?.isActive ? EyeOff : CheckCircle2}
        title={statusTarget?.isActive ? "Deactivate this ticker?" : "Activate this ticker?"}
        description={
          statusTarget?.isActive
            ? `"${statusTarget?.title}" will stop scrolling in the customer app until it's turned back on.`
            : `"${statusTarget?.title}" will scroll in the customer app again (within its schedule).`
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Activate"}
        submitting={statusSaving}
        error={statusError}
        onConfirm={confirmStatus}
        onClose={() => {
          if (statusSaving) return;
          setStatusTarget(null);
          setStatusError("");
        }}
      />

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
