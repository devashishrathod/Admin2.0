import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Image as ImageIcon,
  Layers,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";
import {
  createSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from "../../features/subcategory/services/SubCategoryApi";
import { getCategories } from "../../features/category/services/CategoryApi";
const EMPTY_FORM = {
  id: null,
  name: "",
  description: "",
  image: null,       // File object when a new image is picked
  imagePreview: "",  // existing image URL (edit) or local object URL (new pick)
  categoryId: "",
  isActive: true,
};

/* -------------------------------------------------------------------------
 * Reusable image uploader (click to upload, preview, remove)
 * ---------------------------------------------------------------------- */

function ImageUploader({ imagePreview, hasImage, onPick, onRemove, label = "Image" }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPick(file);
    e.target.value = "";
  };

  return (
    <div>
      <label className="mb-2 block text-[12.5px] font-medium text-neutral-300">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-700 bg-neutral-950 transition-colors hover:border-emerald-400/50"
        >
          {imagePreview ? (
            <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-neutral-600" />
          )}
        </button>

        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-neutral-800 px-3 py-1.5 text-[12px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
          >
            {hasImage ? "Change Image" : "Upload Image"}
          </button>
          {hasImage && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[11.5px] font-medium text-red-400 transition-colors hover:text-red-300"
            >
              Remove
            </button>
          )}
          <p className="text-[11px] text-neutral-600">PNG or JPG, up to 2MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add / Edit Sub-Category modal
 * ---------------------------------------------------------------------- */

function SubCategoryFormModal({ open, initialData, categories, saving, onClose, onSave }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Sub-category name is required";
    if (!form.categoryId) nextErrors.categoryId = "Please select a parent category";
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
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">
              {isEdit ? "Edit Sub-Category" : "Add Sub-Category"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit ? "Update the details for this sub-category." : "Create a new sub-category."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-5">
            <ImageUploader
              imagePreview={form.imagePreview}
              hasImage={Boolean(form.imagePreview)}
              onPick={(file) =>
                setForm((prev) => ({
                  ...prev,
                  image: file,
                  imagePreview: URL.createObjectURL(file),
                }))
              }
              onRemove={() => setForm((prev) => ({ ...prev, image: null, imagePreview: "" }))}
              label="Sub-Category Image"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="subcat-name" className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Sub-Category Name
            </label>
            <input
              id="subcat-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Mobiles & Accessories"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.name && <p className="mt-1.5 text-[12px] text-red-400">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label
              htmlFor="subcat-description"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-300"
            >
              Description
            </label>
            <textarea
              id="subcat-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short description of this sub-category"
              rows={3}
              className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="subcat-parent" className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Parent Category
            </label>
            <select
              id="subcat-parent"
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              disabled={isEdit} // most APIs don't allow moving a sub-category to another parent on update
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 disabled:opacity-50 ${
                errors.categoryId
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && (
              <p className="mt-1.5 text-[12px] text-red-400">{errors.categoryId}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Status</label>
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
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 items-center rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Sub-Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * View modal — read-only details for a sub-category
 * ---------------------------------------------------------------------- */

function SubCategoryViewModal({ open, subCategory, categoryName, loading, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-neutral-50">Sub-Category Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading || !subCategory ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-neutral-500">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-800">
                  {subCategory.image ? (
                    <img
                      src={subCategory.image}
                      alt={subCategory.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon size={20} className="text-neutral-600" />
                  )}
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-neutral-50">{subCategory.name}</p>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-1 text-[11.5px] font-medium text-neutral-300">
                    <Layers size={11} />
                    {categoryName}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <StatusBadge status={subCategory.isActive ? "Active" : "Inactive"} />
              </div>

              {subCategory.description && (
                <p className="mt-4 text-[13px] leading-relaxed text-neutral-400">
                  {subCategory.description}
                </p>
              )}

              <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                  Voucher Count
                </p>
                <p className="mt-1 text-[15px] font-semibold text-neutral-50">
                  {subCategory.voucherCount ?? 0}
                </p>
              </div>

              {subCategory.createdAt && (
                <p className="mt-4 text-[11.5px] text-neutral-600">
                  Created {new Date(subCategory.createdAt).toLocaleString("en-IN")}
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

function DeleteConfirmModal({ subCategory, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-50">Delete sub-category?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{subCategory.name}" permanently.
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

function apiToRow(sub) {
  return {
    id: sub._id ?? sub.id,
    name: sub.name,
    description: sub.description,
    image: sub.image,
    categoryId: sub.categoryId,
    isActive: sub.isActive,
    status: sub.isActive ? "Active" : "Inactive",
    voucherCount: sub.voucherCount ?? 0,
    createdAt: sub.createdAt,
  };
}

function rowToFormDraft(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    image: null,
    imagePreview: row.image ?? "",
    categoryId: row.categoryId ?? "",
    isActive: Boolean(row.isActive),
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function SubCategory() {
  const [categories, setCategories] = useState([]);

  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);
  const [viewSubCategory, setViewSubCategory] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const categoryName = (id) => categories.find((c) => c.id === id)?.name || "—";

  // ── Load parent categories once (for the dropdown + filter) ────
  useEffect(() => {
    (async () => {
      try {
        const res = await getCategories({ page: 1, limit: 100 });
        const rows = (res?.data?.data ?? []).map((c) => ({ id: c._id ?? c.id, name: c.name }));
        setCategories(rows);
      } catch (err) {
        console.error("Failed to load categories:", err.message);
      }
    })();
  }, []);

  // ── Load sub-categories ──────────────────────────────────────
  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getSubCategories({
        page,
        limit,
        search,
        categoryId: categoryFilter === "All" ? undefined : categoryFilter,
      });
      const rows = (res?.data?.data ?? []).map(apiToRow);
      setSubCategories(rows);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSubCategories();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Refetch on category filter change
  useEffect(() => {
    setPage(1);
    fetchSubCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  // Refetch on page change
  useEffect(() => {
    fetchSubCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAddClick = () => {
    setEditingSubCategory({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? "" });
    setSaveError("");
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingSubCategory(rowToFormDraft(row));
    setSaveError("");
    setModalOpen(true);
  };

  const handleView = async (row) => {
    setViewTarget(row);
    setViewSubCategory(null);
    setViewLoading(true);
    try {
      const res = await getSubCategoryById(row.id);
      const detail = res?.data ?? res;
      setViewSubCategory(apiToRow(detail));
    } catch (err) {
      setViewSubCategory(row);
      console.error("Failed to load sub-category details:", err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      if (form.id) {
        await updateSubCategory(form.id, {
          name: form.name.trim(),
          description: form.description,
          image: form.image,
          isActive: form.isActive,
        });
      } else {
        await createSubCategory(form.categoryId, {
          name: form.name.trim(),
          description: form.description,
          image: form.image,
          isActive: form.isActive,
        });
      }
      setModalOpen(false);
      setEditingSubCategory(null);
      fetchSubCategories();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSubCategory(deleteTarget.id);
      setDeleteTarget(null);
      fetchSubCategories();
    } catch (err) {
      console.error("Failed to delete sub-category:", err.message);
    } finally {
      setDeleting(false);
    }
  };

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
      key: "image",
      label: "Image",
      render: (row) => (
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
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
      label: "Sub-Category Name",
      render: (row) => <span className="font-medium text-neutral-50">{row.name}</span>,
    },
    {
      key: "category",
      label: "Parent Category",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-2.5 py-1 text-[11.5px] font-medium text-neutral-300">
          <Layers size={11} />
          {categoryName(row.categoryId)}
        </span>
      ),
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">
              Sub-Category
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Manage sub-categories and the parent category each one belongs to.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Sub-Category
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs sm:flex-1">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sub-category..."
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-56"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading sub-categories…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load sub-categories: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Table */}
            <Table
              columns={columns}
              data={subCategories}
              emptyMessage="No sub-categories yet. Add one to get started."
            />

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

      {/* Add / Edit modal */}
      <SubCategoryFormModal
        open={modalOpen}
        initialData={editingSubCategory}
        categories={categories}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingSubCategory(null);
        }}
        onSave={handleSave}
      />
      {modalOpen && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-neutral-900 px-4 py-2.5 text-[12.5px] text-red-400 shadow-lg">
          {saveError}
        </div>
      )}

      {/* View modal */}
      <SubCategoryViewModal
        open={Boolean(viewTarget)}
        subCategory={viewSubCategory}
        categoryName={viewSubCategory ? categoryName(viewSubCategory.categoryId) : ""}
        loading={viewLoading}
        onClose={() => {
          setViewTarget(null);
          setViewSubCategory(null);
        }}
      />

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          subCategory={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}