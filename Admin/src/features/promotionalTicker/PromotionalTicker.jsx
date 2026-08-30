import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";
import {
  createPromotionalTicker,
  getPromotionalTickers,
  updatePromotionalTicker,
  deletePromotionalTicker,
  REDIRECT_TYPES,
} from "./services/PromotionalTickerApi";
import { getCategories } from "../category/services/CategoryApi";

const EMPTY_FORM = {
  id: null,
  title: "",
  displayOrder: 0,
  icon: null, // File object when a new icon is picked
  iconPreview: "", // existing icon URL (edit) or local object URL (new pick)
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
 * Add / Edit modal — icon upload + title + redirect target + display order
 * ---------------------------------------------------------------------- */

function TickerFormModal({ open, initialData, saving, onClose, onSave }) {
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
    if (!isEdit && !form.icon) nextErrors.icon = "An icon is required";
    if (!form.startDateLocal) nextErrors.startDateLocal = "Start date is required";
    if (!form.endDateLocal) nextErrors.endDateLocal = "End date is required";
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
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
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
              onChange={handleChange("title")}
              placeholder="e.g. Free Shipping This Month"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
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

function TickerViewModal({ open, ticker, categories, onClose }) {
  if (!open || !ticker) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Ticker Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
              {ticker.icon ? (
                <img src={ticker.icon} alt={ticker.title} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={20} className="text-neutral-400 dark:text-neutral-600" />
              )}
            </div>
            <div>
              <p className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{ticker.title}</p>
              <StatusBadge status={ticker.isActive ? "Active" : "Inactive"} />
            </div>
          </div>

          <p className="mt-3 text-[12.5px] text-sky-600 dark:text-sky-400">{redirectSummary(ticker.redirect, categories)}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">Display Order</p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{ticker.displayOrder ?? 0}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">Status</p>
              <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{ticker.isActive ? "Active" : "Inactive"}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="text-[11px] uppercase tracking-wider text-neutral-500">Validity</p>
            <p className="mt-1 text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">
              {formatDateTime(ticker.startDate)} → {formatDateTime(ticker.endDate)}
            </p>
          </div>

          {ticker.createdAt && (
            <p className="mt-4 text-[11.5px] text-neutral-400 dark:text-neutral-600">Created {formatDateTime(ticker.createdAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

function DeleteConfirmModal({ ticker, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">Delete ticker?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{ticker.title}" and it will stop showing in the app.
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

function parseRedirect(ticker) {
  let r = ticker.redirect;
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

function apiToRow(ticker) {
  // `icon` comes back nested as { url, storage }, not a plain string —
  // fall back to a plain string too in case some record is shaped that way.
  const iconUrl = ticker.icon?.url ?? (typeof ticker.icon === "string" ? ticker.icon : "");
  return {
    id: ticker._id ?? ticker.id,
    title: ticker.title || "Untitled ticker",
    icon: iconUrl,
    redirect: parseRedirect(ticker),
    displayOrder: ticker.displayOrder ?? 0,
    startDate: ticker.startDate,
    endDate: ticker.endDate,
    isActive: Boolean(ticker.isActive),
    status: ticker.isActive ? "Active" : "Inactive",
    createdAt: ticker.createdAt,
  };
}

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
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function PromotionalTicker() {
  const [tickers, setTickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicker, setEditingTicker] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Categories power the redirect-target picker when redirect type is
  // CATEGORY — fetched once from the existing Category API.
  useEffect(() => {
    getCategories({ page: 1, limit: 100 })
      .then((res) => {
        const rows = (res?.data?.data ?? []).map((c) => ({ id: c._id ?? c.id, name: c.name }));
        setCategories(rows);
      })
      .catch(() => {});
  }, []);

  const fetchTickers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getPromotionalTickers({ page, limit, search });
      const rows = (res?.data?.data ?? []).map(apiToRow);
      setTickers(rows);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchTickers();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on page change (search effect already handles search changes)
  useEffect(() => {
    fetchTickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      };
      if (form.id) {
        await updatePromotionalTicker(form.id, payload);
      } else {
        await createPromotionalTicker(payload);
      }
      setModalOpen(false);
      setEditingTicker(null);
      fetchTickers();
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
      fetchTickers();
    } catch (err) {
      console.error("Failed to delete ticker:", err.message);
    } finally {
      setDeleting(false);
    }
  };

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
      render: (row) => (
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
          {row.icon ? (
            <img src={row.icon} alt={row.title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={15} className="text-neutral-400 dark:text-neutral-600" />
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
      key: "redirect",
      label: "Redirect",
      render: (row) => (
        <span className="max-w-[200px] truncate text-neutral-500 dark:text-neutral-400">{redirectSummary(row.redirect, categories)}</span>
      ),
    },
    {
      key: "displayOrder",
      label: "Order",
      align: "center",
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
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Promotional Ticker</h1>
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

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:max-w-xs dark:border-neutral-800 dark:bg-neutral-900">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticker..."
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading tickers…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load tickers: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Table */}
            <Table columns={columns} data={tickers} emptyMessage="No promotional tickers yet. Add one to get started." />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-300 disabled:opacity-40"
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
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingTicker(null);
        }}
        onSave={handleSave}
      />
      {modalOpen && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-neutral-900 px-4 py-2.5 text-[12.5px] text-red-400 shadow-lg">
          {saveError}
        </div>
      )}

      {/* View Ticker modal */}
      <TickerViewModal
        open={Boolean(viewTarget)}
        ticker={viewTarget}
        categories={categories}
        onClose={() => setViewTarget(null)}
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
