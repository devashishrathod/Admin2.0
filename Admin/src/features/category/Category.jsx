import React, { useState, useEffect, useMemo } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
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
  Legend,
} from "recharts";
import Table from "../../components/common/Table";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../features/category/services/CategoryApi";
import { useCategories, useCategory } from "./queries/categoryQueries";
import { queryKeys } from "../../lib/query";
import Loader from "../../components/common/Loader";
import ToggleSwitch from "../../components/common/ToggleSwitch";
import {
  LimitedField,
  IconPicker,
  ConfirmToggleModal,
  DeleteWithCountsModal,
  StatusTabsAndView,
  CatalogGridCard,
  CatalogViewModal,
  PaginationBar,
} from "./CatalogShared";
import { NAME_MIN, NAME_MAX, DESC_MAX, STATUS_PARAM, listTotal } from "./catalogLimits";

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

  // Icon + title are required, description optional; the submit button
  // stays disabled until those are filled.
  const nameLen = form.name.trim().length;
  const hasIcon = Boolean(form.image || form.imagePreview);
  const canSubmit = hasIcon && nameLen >= NAME_MIN && nameLen <= NAME_MAX && form.description.length <= DESC_MAX;

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (nameLen < NAME_MIN) nextErrors.name = `Title needs at least ${NAME_MIN} characters`;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    if (!canSubmit) return;
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
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <IconPicker
            preview={form.imagePreview}
            onPick={(file) => setForm((prev) => ({ ...prev, image: file, imagePreview: URL.createObjectURL(file) }))}
          />

          <LimitedField
            id="cat-name"
            label="Title"
            required
            value={form.name}
            onChange={(v) => {
              setForm((prev) => ({ ...prev, name: v }));
              if (errors.name) setErrors({});
            }}
            max={NAME_MAX}
            placeholder="e.g. Electronics"
            error={errors.name}
          />

          <LimitedField
            id="cat-description"
            label="Description"
            value={form.description}
            onChange={(v) => setForm((prev) => ({ ...prev, description: v }))}
            max={DESC_MAX}
            multiline
            placeholder="Short description of this category"
          />

          {/* Status — only when adding; on edit it's changed from the list's
              toggle (with a confirm), not here. */}
          {!isEdit && (
            <div className="pb-2">
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Status</label>
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
                        ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              disabled={saving || !canSubmit}
              title={!canSubmit ? "Add an icon and a title first" : undefined}
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Every count attached to a category, for the delete box. Sub-categories,
// brands and vouchers block a delete (API refuses); promo codes don't.
const categoryCounts = (row) => [
  { label: "Sub-categories", ...row.stats.subCategories, blocks: true },
  { label: "Brands", ...row.stats.brands, blocks: true },
  { label: "Vouchers", ...row.stats.vouchers, blocks: true },
  { label: "Promo codes", ...row.stats.promoCodes, blocks: false },
];

/* -------------------------------------------------------------------------
 * Helpers to map between API shape and the form's shape
 * ---------------------------------------------------------------------- */

function apiToRow(cat) {
  const stats = cat.stats || {};
  const subCategories = {
    total: stats.subCategories?.total ?? cat.subCategoryCount ?? 0,
    active: stats.subCategories?.active ?? 0,
  };
  const brands = { total: stats.brands?.total ?? 0, active: stats.brands?.active ?? 0 };
  const vouchers = { total: stats.vouchers?.total ?? cat.voucherCount ?? 0, active: stats.vouchers?.active ?? 0 };
  const promoCodes = { total: stats.promoCodes?.total ?? 0, active: stats.promoCodes?.active ?? 0 };

  return {
    id: cat._id ?? cat.id,
    name: cat.name,
    description: cat.description,
    image: cat.image,
    isActive: cat.isActive,
    status: cat.isActive ? "Active" : "Inactive",
    stats: { subCategories, brands, vouchers, promoCodes },
    subCategoryCount: subCategories.total,
    voucherCount: vouchers.total,
    brandCount: brands.total,
    promoCodeCount: promoCodes.total,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
}

// Flips one category's isActive inside a cached getAll response — used for
// the optimistic status toggle. Detail entries (no data.data array) pass through.
function patchCachedCategory(old, id, isActive) {
  if (!Array.isArray(old?.data?.data)) return old;
  return {
    ...old,
    data: {
      ...old.data,
      data: old.data.data.map((c) => ((c._id ?? c.id) === id ? { ...c, isActive } : c)),
    },
  };
}

// A small "total + active" pair shown in table cells and the view modal.
function StatCell({ total, active }) {
  return (
    <div className="leading-tight">
      <div className="font-semibold text-neutral-900 dark:text-neutral-50">{total}</div>
      <div className="text-[10.5px] text-neutral-500">{active} active</div>
    </div>
  );
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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  // The search text actually sent to the API — trails `search` by 400ms.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  // All / Active / Inactive — sent to the API as `isActive`.
  const [statusFilter, setStatusFilter] = useState("All");
  // Grid by default; table on request.
  const [view, setView] = useState("grid");
  // Row whose status switch was clicked — confirmed before the API call.
  const [toggleTarget, setToggleTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null); // row summary that was clicked

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState("");

  // Overview charts — every category matching the current search + status
  // filter (up to 100, not just the visible page), so the charts follow
  // the filters like the list does.
  const allCategoriesQuery = useCategories({
    page: 1,
    limit: 100,
    search: debouncedSearch,
    isActive: STATUS_PARAM[statusFilter],
  });
  // "No any category found" (404) = nothing matches → empty charts.
  const chartsNotFound = /not found|no .*found/i.test(allCategoriesQuery.error?.message || "");
  const allCategories = useMemo(
    () => (chartsNotFound ? [] : (allCategoriesQuery.data?.data?.data ?? []).map(apiToRow)),
    [allCategoriesQuery.data, chartsNotFound]
  );
  const chartsError = chartsNotFound ? "" : allCategoriesQuery.error?.message ?? "";

  // Pagination, search and the status filter all run on the backend; the
  // counts below come from the same filters, so they match the list.
  const categoriesQuery = useCategories(
    { page, limit, search: debouncedSearch, isActive: STATUS_PARAM[statusFilter] },
    { placeholderData: keepPreviousData }
  );
  // A 404 "No any category found" is just an empty page, not an error.
  const listNotFound = /not found|no .*found/i.test(categoriesQuery.error?.message || "");
  const categories = useMemo(
    () => (listNotFound ? [] : (categoriesQuery.data?.data?.data ?? []).map(apiToRow)),
    [categoriesQuery.data, listNotFound]
  );
  const totalPages = listNotFound ? 1 : categoriesQuery.data?.data?.totalPages ?? 1;
  const total = listTotal(categoriesQuery) ?? 0;
  const loading = categoriesQuery.isPending;
  const loadError = listNotFound ? "" : categoriesQuery.error?.message ?? "";

  // Active / inactive totals for the tabs — same search, limit 1 (only the
  // `total` is used).
  const activeCountQuery = useCategories({ page: 1, limit: 1, search: debouncedSearch, isActive: true });
  const inactiveCountQuery = useCategories({ page: 1, limit: 1, search: debouncedSearch, isActive: false });
  const activeTotal = listTotal(activeCountQuery);
  const inactiveTotal = listTotal(inactiveCountQuery);
  const statusCounts = {
    active: activeTotal,
    inactive: inactiveTotal,
    all: activeTotal != null && inactiveTotal != null ? activeTotal + inactiveTotal : undefined,
  };

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Full detail for the View modal; falls back to the clicked row's summary
  // if the detail call fails.
  const viewQuery = useCategory(viewTarget?.id);
  const viewLoading = Boolean(viewTarget) && viewQuery.isPending;
  const viewCategory = useMemo(() => {
    if (!viewTarget) return null;
    if (viewQuery.data) return apiToRow(viewQuery.data?.data ?? viewQuery.data);
    return viewQuery.error ? viewTarget : null;
  }, [viewTarget, viewQuery.data, viewQuery.error]);

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

  const handleView = (row) => {
    setViewTarget(row);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      if (form.id) {
        // No isActive on edit — status changes only via the list toggle.
        await updateCategory(form.id, {
          name: form.name.trim(),
          description: form.description,
          image: form.image,
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
      // No manual reload — the write interceptor refreshes ["categories"].
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Status toggle in the table row. Sends the row's current name/description
  // with the flipped flag; no image, so the existing one is kept.
  const handleToggleActive = async (row) => {
    const isActive = !row.isActive;
    setTogglingId(row.id);
    setToggleError("");
    // Optimistic: flip the row in every cached list page (table + charts).
    queryClient.setQueriesData({ queryKey: queryKeys.categories.all }, (old) =>
      patchCachedCategory(old, row.id, isActive)
    );
    try {
      await updateCategory(row.id, { name: row.name, description: row.description ?? "", isActive });
      setToggleTarget(null);
    } catch (err) {
      // Revert by refetching the real state from the server.
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      setToggleError(`Couldn't update "${row.name}": ${err.message}`);
      setToggleTarget(null);
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      // e.g. "Cannot delete this category — 2 sub-categories, 3 brands …"
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Filters reset to page 1.
  const changeStatus = (s) => {
    setStatusFilter(s);
    setPage(1);
  };
  const changeLimit = (n) => {
    setLimit(n);
    setPage(1);
  };

  // Overview charts — derived from the broader allCategories snapshot, not
  // the current paginated page, so they reflect the true full set.
  const activeCount = allCategories.filter((c) => c.isActive).length;
  const inactiveCount = allCategories.length - activeCount;
  // Tiles always show both statuses; the donut only draws non-empty slices.
  const statusTiles = [
    { name: "Active", value: activeCount, color: "#2FDE8C" },
    { name: "Inactive", value: inactiveCount, color: "#A3A3A3" },
  ];
  const statusMix = statusTiles.filter((s) => s.value > 0);

  // One combined breakdown chart (rather than 4 separate single-metric
  // charts) so all real stats — sub-categories, brands, vouchers, promo
  // codes — are visible side-by-side per category.
  const topByStats = [...allCategories]
    .map((c) => ({
      name: c.name,
      subCategories: c.stats.subCategories.total,
      brands: c.stats.brands.total,
      vouchers: c.stats.vouchers.total,
      promoCodes: c.stats.promoCodes.total,
    }))
    .sort(
      (a, b) =>
        b.subCategories + b.brands + b.vouchers + b.promoCodes -
        (a.subCategories + a.brands + a.vouchers + a.promoCodes)
    )
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
      label: "Icon",
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
      label: "Title",
      render: (row) => (
        <span className="font-medium capitalize text-neutral-900 dark:text-neutral-50">{row.name}</span>
      ),
    },
    {
      key: "subCategoryCount",
      label: "Sub Categories",
      align: "center",
      render: (row) => <StatCell total={row.stats.subCategories.total} active={row.stats.subCategories.active} />,
    },
    {
      key: "brandCount",
      label: "Brands",
      align: "center",
      render: (row) => <StatCell total={row.stats.brands.total} active={row.stats.brands.active} />,
    },
    {
      key: "voucherCount",
      label: "Vouchers",
      align: "center",
      render: (row) => <StatCell total={row.stats.vouchers.total} active={row.stats.vouchers.active} />,
    },
    {
      key: "promoCodeCount",
      label: "Promo Codes",
      align: "center",
      render: (row) => <StatCell total={row.stats.promoCodes.total} active={row.stats.promoCodes.active} />,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={Boolean(row.isActive)}
            disabled={togglingId === row.id}
            title={row.isActive ? "Click to make Inactive" : "Click to make Active"}
            onChange={() => setToggleTarget(row)}
          />
          <span className={`text-[11px] font-semibold ${row.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400"}`}>
            {row.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      ),
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
            onClick={() => {
              setDeleteError("");
              setDeleteTarget(row);
            }}
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
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
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
            Add
          </button>
        </div>

        {/* Overview charts — follow the search / status filters */}
        {chartsError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            Couldn't load chart data: {chartsError}
          </div>
        )}
        <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <div className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <PieChartIcon size={14} className="text-emerald-500" /> Status Mix
            </div>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">Categories by current state</p>

            <div className="flex flex-1 items-center gap-4 pt-3">
              {/* Box is larger than the donut's diameter (2 × outerRadius)
                  plus Recharts' 5px margin, so the ring never gets clipped. */}
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusMix.length ? statusMix : [{ name: "None", value: 1, color: "#E5E5E5" }]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={64}
                      paddingAngle={statusMix.length > 1 ? 3 : 0}
                      cornerRadius={6}
                      isAnimationActive={false}
                    >
                      {(statusMix.length ? statusMix : [{ name: "None", color: "#E5E5E5" }]).map((s) => (
                        <Cell key={s.name} fill={s.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{allCategories.length}</span>
                  <span className="mt-1 text-[10.5px] text-neutral-500">Total</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                {statusTiles.map((s) => {
                  const pct = allCategories.length ? Math.round((s.value / allCategories.length) * 100) : 0;
                  return (
                    <div key={s.name} className="rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-950/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-neutral-500">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </span>
                        <span className="text-[10.5px] font-semibold text-neutral-400">{pct}%</span>
                      </div>
                      <p className="mt-0.5 text-[18px] font-bold leading-tight text-neutral-900 dark:text-neutral-50">{s.value}</p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 lg:col-span-2">
            <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-neutral-900 dark:text-neutral-50">
              <BarChart3 size={14} className="text-violet-500" /> Category Stats Overview
            </div>
            {topByStats.length ? (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={topByStats} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    labelFormatter={(name) => name}
                    contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="subCategories" name="Sub-Categories" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="brands" name="Brands" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vouchers" name="Vouchers" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="promoCodes" name="Promo Codes" fill="#2FDE8C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-47.5 items-center justify-center text-[12.5px] text-neutral-500">No data yet.</div>
            )}
          </div>
        </div>

        {/* Search + status tabs (with backend counts) + grid / table */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 sm:w-72">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category..."
              className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>
          <StatusTabsAndView status={statusFilter} onStatus={changeStatus} counts={statusCounts} view={view} onView={setView} />
        </div>

        {/* Load state */}
        {loading && (
          <Loader label="Loading categories…" />
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load categories: {loadError}
          </div>
        )}

        {toggleError && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="shrink-0" />
            {toggleError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {view === "grid" ? (
              categories.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categories.map((row) => (
                    <CatalogGridCard
                      key={row.id}
                      item={row}
                      stats={[
                        { label: "Sub-cats", total: row.stats.subCategories.total },
                        { label: "Brands", total: row.stats.brands.total },
                        { label: "Vouchers", total: row.stats.vouchers.total },
                        { label: "Promos", total: row.stats.promoCodes.total },
                      ]}
                      toggling={togglingId === row.id}
                      onToggle={() => setToggleTarget(row)}
                      onView={() => handleView(row)}
                      onEdit={() => handleEdit(row)}
                      onDelete={() => {
                        setDeleteError("");
                        setDeleteTarget(row);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Table
                  columns={columns}
                  data={[]}
                  emptyTitle={debouncedSearch || statusFilter !== "All" ? "No categories match" : "No categories yet"}
                  emptyDescription="Categories group brands in the customer app. Add the first one to get started."
                  emptyIcon="category"
                  emptyAction={{ label: "Add", onClick: handleAddClick }}
                  dense
                />
              )
            ) : (
              <Table
                columns={columns}
                data={categories}
                emptyTitle={debouncedSearch || statusFilter !== "All" ? "No categories match" : "No categories yet"}
                emptyDescription="Categories group brands in the customer app. Add the first one to get started."
                emptyIcon="category"
                emptyAction={{ label: "Add", onClick: handleAddClick }}
                dense
                minWidth={920}
              />
            )}

            {/* Pagination — counts come from the backend for the current filters */}
            <PaginationBar page={page} limit={limit} total={total} totalPages={totalPages} onPage={setPage} onLimit={changeLimit} />
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
      <CatalogViewModal
        open={Boolean(viewTarget)}
        kind="Category"
        item={viewCategory}
        loading={viewLoading}
        stats={
          viewCategory
            ? [
                { label: "Sub-categories", ...viewCategory.stats.subCategories },
                { label: "Brands", ...viewCategory.stats.brands },
                { label: "Vouchers", ...viewCategory.stats.vouchers },
                { label: "Promo codes", ...viewCategory.stats.promoCodes },
              ]
            : []
        }
        onClose={() => setViewTarget(null)}
        onEdit={() => {
          const row = viewCategory;
          setViewTarget(null);
          if (row) handleEdit(row);
        }}
      />

      {/* Status toggle confirmation */}
      {toggleTarget && (
        <ConfirmToggleModal
          kind="category"
          item={toggleTarget}
          impact={`${toggleTarget.stats.subCategories.total} sub-categories · ${toggleTarget.stats.brands.total} brands · ${toggleTarget.stats.vouchers.total} vouchers`}
          busy={togglingId === toggleTarget.id}
          onCancel={() => setToggleTarget(null)}
          onConfirm={() => handleToggleActive(toggleTarget)}
        />
      )}

      {/* Delete confirmation — with every attached count */}
      {deleteTarget && (
        <DeleteWithCountsModal
          kind="category"
          item={deleteTarget}
          counts={categoryCounts(deleteTarget)}
          deleting={deleting}
          error={deleteError}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}