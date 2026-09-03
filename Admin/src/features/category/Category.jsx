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
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip,
  LabelList,
} from "recharts";
import Table, { StatusBadge } from "../../components/common/Table";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../../features/category/services/CategoryApi";

const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  image: null,       // File object when a new image is picked
  imagePreview: "",  // existing image URL (edit) or local object URL (new pick)
  isActive: true,
};

/* -------------------------------------------------------------------------
 * Add / Edit modal — now uses a real image file upload + description,
 * matching the actual API payload.
 * ---------------------------------------------------------------------- */

function CategoryFormModal({ open, initialData, saving, onClose, onSave }) {
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

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((prev) => ({
      ...prev,
      image: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Category name is required";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={saving ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
              {isEdit ? "Edit Category" : "Add Category"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit
                ? "Update the details for this category."
                : "Create a new product category."}
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
        <form onSubmit={handleSubmit} className="px-5 py-5">
          {/* Image upload */}
          <div className="mb-4">
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Category Image
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                {form.imagePreview ? (
                  <img
                    src={form.imagePreview}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon size={18} className="text-neutral-600" />
                )}
              </div>
              <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-400 dark:border-neutral-700 dark:text-neutral-400">
                <ImageIcon size={14} />
                {form.image ? "Change image" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Name */}
          <div className="mb-4">
            <label
              htmlFor="cat-name"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300"
            >
              Category Name
            </label>
            <input
              id="cat-name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Electronics"
              className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
              }`}
            />
            {errors.name && (
              <p className="mt-1.5 text-[12px] text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label
              htmlFor="cat-description"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300"
            >
              Description
            </label>
            <textarea
              id="cat-description"
              value={form.description}
              onChange={handleChange("description")}
              placeholder="Short description of this category"
              rows={3}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Status
            </label>
            <div className="flex gap-2">
              {[
                { label: "Active", value: true },
                { label: "Inactive", value: false },
              ].map((s) => (
                <button
                  type="button"
                  key={s.label}
                  onClick={() => setForm((prev) => ({ ...prev, isActive: s.value }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.isActive === s.value
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * View modal — read-only details for a category
 * ---------------------------------------------------------------------- */

function CategoryViewModal({ open, category, loading, onClose }) {
  if (!open) return null;

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
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">Category Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading || !category ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-neutral-500">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-neutral-600" />
                  )}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{category.name}</p>
                  <StatusBadge status={category.isActive ? "Active" : "Inactive"} />
                </div>
              </div>

              {category.description && (
                <p className="mt-4 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {category.description}
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Sub Categories
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                    {category.subCategoryCount ?? 0}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-950 dark:shadow-black/20">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Vouchers
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                    {category.voucherCount ?? 0}
                  </p>
                </div>
              </div>

              {category.createdAt && (
                <p className="mt-4 text-[11.5px] text-neutral-600">
                  Created {new Date(category.createdAt).toLocaleString("en-IN")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

function DeleteConfirmModal({ category, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-50">Delete category?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{category.name}" and its sub-categories/vouchers link.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-neutral-800 px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors hover:border-neutral-700 disabled:opacity-50"
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

function apiToRow(cat) {
  return {
    id: cat._id ?? cat.id,
    name: cat.name,
    description: cat.description,
    image: cat.image,
    isActive: cat.isActive,
    status: cat.isActive ? "Active" : "Inactive",
    subCategoryCount: cat.subCategoryCount ?? 0,
    voucherCount: cat.voucherCount ?? 0,
    createdAt: cat.createdAt,
  };
}

function rowToFormDraft(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    image: null,
    imagePreview: row.image ?? "",
    isActive: Boolean(row.isActive),
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null); // row summary that was clicked
  const [viewCategory, setViewCategory] = useState(null); // full detail from API
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // A broader, unpaginated snapshot used only for the overview charts —
  // the paginated `categories` list above only ever holds one page, which
  // would make a status/count chart misleading.
  const [allCategories, setAllCategories] = useState([]);
  const [chartsError, setChartsError] = useState("");

  const fetchAllCategories = useCallback(async () => {
    setChartsError("");
    try {
      const res = await getCategories({ page: 1, limit: 100 });
      setAllCategories((res?.data?.data ?? []).map(apiToRow));
    } catch (err) {
      setAllCategories([]);
      setChartsError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchAllCategories();
  }, [fetchAllCategories]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getCategories({ page, limit, search });
      const rows = (res?.data?.data ?? []).map(apiToRow);
      setCategories(rows);
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
      fetchCategories();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on page change (search effect already handles search changes)
  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAddClick = () => {
    setEditingCategory(null);
    setSaveError("");
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingCategory(rowToFormDraft(row));
    setSaveError("");
    setModalOpen(true);
  };

  const handleView = async (row) => {
    setViewTarget(row);
    setViewCategory(null);
    setViewLoading(true);
    try {
      const res = await getCategoryById(row.id);
      const detail = res?.data ?? res;
      setViewCategory(apiToRow(detail));
    } catch (err) {
      // fall back to the row data we already have if the detail call fails
      setViewCategory(row);
      console.error("Failed to load category details:", err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      if (form.id) {
        await updateCategory(form.id, {
          name: form.name.trim(),
          description: form.description,
          image: form.image,
          isActive: form.isActive,
        });
      } else {
        await createCategory({
          name: form.name.trim(),
          description: form.description,
          image: form.image,
          isActive: form.isActive,
        });
      }
      setModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
      fetchAllCategories();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      fetchCategories();
      fetchAllCategories();
    } catch (err) {
      console.error("Failed to delete category:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Overview charts — derived from the broader allCategories snapshot, not
  // the current paginated page, so they reflect the true full set.
  const activeCount = allCategories.filter((c) => c.isActive).length;
  const inactiveCount = allCategories.length - activeCount;
  const statusMix = [
    { name: "Active", value: activeCount, color: "#2FDE8C" },
    { name: "Inactive", value: inactiveCount, color: "#A3A3A3" },
  ].filter((s) => s.value > 0);

  const topBySubCategories = [...allCategories]
    .sort((a, b) => b.subCategoryCount - a.subCategoryCount)
    .slice(0, 6);
  const topByVouchers = [...allCategories]
    .sort((a, b) => b.voucherCount - a.voucherCount)
    .slice(0, 6);

  // Column config for the shared Table component.
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => (
        <span className="text-neutral-500">{(page - 1) * limit + index + 1}</span>
      ),
    },
    {
      key: "icon",
      label: "Category Icon",
      render: (row) => (
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
          {row.image ? (
            <img src={row.image} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={15} className="text-neutral-600" />
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "Category Name",
      render: (row) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-50">{row.name}</span>
      ),
    },
    {
      key: "subCategoryCount",
      label: "Sub Category Count",
      align: "center",
    },
    {
      key: "voucherCount",
      label: "Voucher Count",
      align: "center",
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
            onClick={() => handleView(row)}
            aria-label={`View ${row.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-sky-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
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
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Category
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Manage product categories, sub-categories and their vouchers.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Category
          </button>
        </div>

        {/* Overview charts — real data, independent of the table's filters */}
        {chartsError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            Couldn't load chart data: {chartsError}
          </div>
        )}
        <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <PieChartIcon size={14} className="text-emerald-500" /> Status Mix
            </div>
            <div className="flex flex-col items-center">
              <div className="relative h-[110px] w-[110px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusMix}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={34}
                      outerRadius={52}
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {statusMix.map((s) => (
                        <Cell key={s.name} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50">{allCategories.length}</span>
                  <span className="text-[8.5px] text-neutral-500">Total</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {statusMix.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} · {s.value}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={14} className="text-violet-500" /> Top by Sub-Categories
            </div>
            {topBySubCategories.length ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={topBySubCategories} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    formatter={(v) => [v, "Sub-Categories"]}
                    labelFormatter={(name) => name}
                    contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                    cursor={{ fill: "rgba(139,92,246,0.06)" }}
                  />
                  <Bar dataKey="subCategoryCount" fill="#a78bfa" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="subCategoryCount" position="top" style={{ fontSize: 10, fill: "#525252" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-[12.5px] text-neutral-500">No data yet.</div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={14} className="text-sky-500" /> Top by Vouchers
            </div>
            {topByVouchers.length ? (
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={topByVouchers} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    formatter={(v) => [v, "Vouchers"]}
                    labelFormatter={(name) => name}
                    contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                    cursor={{ fill: "rgba(56,189,248,0.06)" }}
                  />
                  <Bar dataKey="voucherCount" fill="#38BDF8" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="voucherCount" position="top" style={{ fontSize: 10, fill: "#525252" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-[12.5px] text-neutral-500">No data yet.</div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:max-w-xs">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category..."
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading categories…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load categories: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Table */}
            <Table
              columns={columns}
              data={categories}
              emptyMessage="No categories yet. Add one to get started."
            />

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

      {/* Add / Edit Category modal */}
      <CategoryFormModal
        open={modalOpen}
        initialData={editingCategory}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSave}
      />
      {modalOpen && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-white px-4 py-2.5 text-[12.5px] text-red-600 shadow-lg dark:bg-neutral-900 dark:text-red-400">
          {saveError}
        </div>
      )}

      {/* View Category modal */}
      <CategoryViewModal
        open={Boolean(viewTarget)}
        category={viewCategory}
        loading={viewLoading}
        onClose={() => {
          setViewTarget(null);
          setViewCategory(null);
        }}
      />

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          category={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}