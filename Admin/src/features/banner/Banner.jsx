import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";
// Real API calls — wired up in ./services/BannerApi.js, disabled for now
// while the page runs on local dummy data. Uncomment and swap the mock
// handlers below (fetchBanners / handleSave / confirmDelete / handleView)
// back to these once the backend endpoints are ready.
// import {
//   createBanner,
//   getBanners,
//   getBannerById,
//   updateBanner,
//   deleteBanner,
// } from "./services/BannerApi";

// Dummy banners (Unsplash images) shown until the real API is wired back in.
const DUMMY_BANNERS = [
  {
    id: 1,
    title: "Monsoon Mega Sale — Up to 60% Off",
    link: "/category/fashion",
    order: 1,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80&auto=format&fit=crop",
    isActive: true,
    status: "Active",
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: 2,
    title: "New Season Sneaker Drop",
    link: "/category/footwear",
    order: 2,
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=80&auto=format&fit=crop",
    isActive: true,
    status: "Active",
    createdAt: "2026-07-04T09:30:00.000Z",
  },
  {
    id: 3,
    title: "Premium Watches — Festive Offer",
    link: "/category/accessories",
    order: 3,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80&auto=format&fit=crop",
    isActive: false,
    status: "Inactive",
    createdAt: "2026-07-08T14:15:00.000Z",
  },
  {
    id: 4,
    title: "Fragrance Fest — Buy 1 Get 1",
    link: "/category/beauty",
    order: 4,
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200&q=80&auto=format&fit=crop",
    isActive: true,
    status: "Active",
    createdAt: "2026-07-12T11:45:00.000Z",
  },
  {
    id: 5,
    title: "Weekend Grocery Deals",
    link: "/category/grocery",
    order: 5,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80&auto=format&fit=crop",
    isActive: true,
    status: "Active",
    createdAt: "2026-07-15T08:00:00.000Z",
  },
];

const EMPTY_FORM = {
  id: null,
  title: "",
  link: "",
  order: 0,
  image: null, // File object when a new image is picked
  imagePreview: "", // existing image URL (edit) or local object URL (new pick)
  isActive: true,
};

/* -------------------------------------------------------------------------
 * Add / Edit modal — banner image upload + title + redirect link + order.
 * ---------------------------------------------------------------------- */

function BannerFormModal({ open, initialData, saving, onClose, onSave }) {
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
    if (!form.title.trim()) nextErrors.title = "Banner title is required";
    if (!isEdit && !form.image) nextErrors.image = "Banner image is required";
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">
              {isEdit ? "Edit Banner" : "Add Banner"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit
                ? "Update the details for this banner."
                : "Upload a new promotional banner."}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5">
          {/* Image upload — wide banner preview */}
          <div className="mb-4">
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-300">
              Banner Image
            </label>
            <div className="flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-700 bg-neutral-800">
              {form.imagePreview ? (
                <img
                  src={form.imagePreview}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon size={24} className="text-neutral-600" />
              )}
            </div>
            <label className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 text-[12.5px] font-medium text-neutral-400 transition-colors hover:border-emerald-400/60 hover:text-emerald-400">
              <ImageIcon size={14} />
              {form.image || form.imagePreview ? "Change image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                className="hidden"
              />
            </label>
            {errors.image && (
              <p className="mt-1.5 text-[12px] text-red-400">{errors.image}</p>
            )}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label
              htmlFor="banner-title"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-300"
            >
              Banner Title
            </label>
            <input
              id="banner-title"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="e.g. Monsoon Mega Sale"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.title
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-[12px] text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Redirect link */}
          <div className="mb-4">
            <label
              htmlFor="banner-link"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-300"
            >
              Redirect Link
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 focus-within:border-emerald-400/60 focus-within:ring-1 focus-within:ring-emerald-400/60">
              <LinkIcon size={14} className="shrink-0 text-neutral-500" />
              <input
                id="banner-link"
                value={form.link}
                onChange={handleChange("link")}
                placeholder="https://... or /category/electronics"
                className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Display order */}
          <div className="mb-6">
            <label
              htmlFor="banner-order"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-300"
            >
              Display Order
            </label>
            <input
              id="banner-order"
              type="number"
              min={0}
              value={form.order}
              onChange={handleChange("order")}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
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
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
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

function BannerViewModal({ open, banner, loading, onClose }) {
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
          <h2 className="text-[15px] font-semibold text-neutral-50">Banner Details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5">
          {loading || !banner ? (
            <div className="flex items-center justify-center gap-2 py-14 text-[13px] text-neutral-500">
              <Loader2 size={16} className="animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-800">
                {banner.image ? (
                  <img
                    src={banner.image}
                    alt={banner.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon size={22} className="text-neutral-600" />
                )}
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <p className="text-[16px] font-semibold text-neutral-50">{banner.title}</p>
                <StatusBadge status={banner.isActive ? "Active" : "Inactive"} />
              </div>

              {banner.link && (
                <a
                  href={banner.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-sky-400 hover:text-sky-300"
                >
                  <LinkIcon size={12} />
                  {banner.link}
                </a>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Display Order
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-neutral-50">
                    {banner.order ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                    Status
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-neutral-50">
                    {banner.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              {banner.createdAt && (
                <p className="mt-4 text-[11.5px] text-neutral-600">
                  Created {new Date(banner.createdAt).toLocaleString("en-IN")}
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

function DeleteConfirmModal({ banner, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-50">Delete banner?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{banner.title}" and it will stop showing in the app.
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

function apiToRow(banner) {
  return {
    id: banner._id ?? banner.id,
    title: banner.title,
    link: banner.link,
    order: banner.order ?? 0,
    image: banner.image,
    isActive: banner.isActive,
    status: banner.isActive ? "Active" : "Inactive",
    createdAt: banner.createdAt,
  };
}

function rowToFormDraft(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    link: row.link ?? "",
    order: row.order ?? 0,
    image: null,
    imagePreview: row.image ?? "",
    isActive: Boolean(row.isActive),
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function Banner() {
  // Acts as the mock "backend" — all reads/writes below go through this
  // instead of the real API while BannerApi.js is disabled.
  const [allBanners, setAllBanners] = useState(DUMMY_BANNERS);

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [viewTarget, setViewTarget] = useState(null); // row summary that was clicked
  const [viewBanner, setViewBanner] = useState(null); // full detail from API
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      // --- Dummy data (active) ---
      const filtered = allBanners.filter((b) =>
        !search || b.title.toLowerCase().includes(search.toLowerCase())
      );
      const sorted = [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const start = (page - 1) * limit;
      setBanners(sorted.slice(start, start + limit).map(apiToRow));
      setTotalPages(Math.max(1, Math.ceil(sorted.length / limit)));

      // --- Real API (disabled) ---
      // const res = await getBanners({ page, limit, search });
      // const rows = (res?.data?.data ?? []).map(apiToRow);
      // setBanners(rows);
      // setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, allBanners]);

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
  }, [page, allBanners]);

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

  const handleView = async (row) => {
    setViewTarget(row);
    setViewBanner(null);
    setViewLoading(true);
    try {
      // --- Dummy data (active) ---
      const detail = allBanners.find((b) => b.id === row.id) ?? row;
      setViewBanner(apiToRow(detail));

      // --- Real API (disabled) ---
      // const res = await getBannerById(row.id);
      // const detail = res?.data ?? res;
      // setViewBanner(apiToRow(detail));
    } catch (err) {
      // fall back to the row data we already have if the detail call fails
      setViewBanner(row);
      console.error("Failed to load banner details:", err.message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        title: form.title.trim(),
        link: form.link.trim(),
        order: Number(form.order) || 0,
        // No real upload endpoint while the API is disabled — keep the
        // locally-picked preview URL (or the existing image on edit).
        image: form.imagePreview || form.image,
        isActive: form.isActive,
      };

      // --- Dummy data (active) ---
      if (form.id) {
        setAllBanners((prev) =>
          prev.map((b) => (b.id === form.id ? { ...b, ...payload, status: payload.isActive ? "Active" : "Inactive" } : b))
        );
      } else {
        const nextId = allBanners.reduce((max, b) => Math.max(max, b.id), 0) + 1;
        setAllBanners((prev) => [
          ...prev,
          { id: nextId, ...payload, status: payload.isActive ? "Active" : "Inactive", createdAt: new Date().toISOString() },
        ]);
      }

      // --- Real API (disabled) ---
      // if (form.id) {
      //   await updateBanner(form.id, { ...payload, image: form.image });
      // } else {
      //   await createBanner({ ...payload, image: form.image });
      // }
      // fetchBanners();

      setModalOpen(false);
      setEditingBanner(null);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      // --- Dummy data (active) ---
      setAllBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);

      // --- Real API (disabled) ---
      // await deleteBanner(deleteTarget.id);
      // setDeleteTarget(null);
      // fetchBanners();
    } catch (err) {
      console.error("Failed to delete banner:", err.message);
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
      render: (_row, index) => (
        <span className="text-neutral-500">{(page - 1) * limit + index + 1}</span>
      ),
    },
    {
      key: "image",
      label: "Banner",
      render: (row) => (
        <div className="flex h-10 w-20 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
          {row.image ? (
            <img src={row.image} alt={row.title} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={15} className="text-neutral-600" />
          )}
        </div>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="font-medium text-neutral-50">{row.title}</span>
      ),
    },
    {
      key: "link",
      label: "Redirect Link",
      render: (row) =>
        row.link ? (
          <a
            href={row.link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300"
          >
            <LinkIcon size={12} />
            <span className="max-w-[180px] truncate">{row.link}</span>
          </a>
        ) : (
          <span className="text-neutral-600">—</span>
        ),
    },
    {
      key: "order",
      label: "Order",
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
            aria-label={`View ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
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
              Banner
            </h1>
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

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search banner..."
            className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading banners…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load banners: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Table */}
            <Table
              columns={columns}
              data={banners}
              emptyMessage="No banners yet. Add one to get started."
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

      {/* Add / Edit Banner modal */}
      <BannerFormModal
        open={modalOpen}
        initialData={editingBanner}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingBanner(null);
        }}
        onSave={handleSave}
      />
      {modalOpen && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-neutral-900 px-4 py-2.5 text-[12.5px] text-red-400 shadow-lg">
          {saveError}
        </div>
      )}

      {/* View Banner modal */}
      <BannerViewModal
        open={Boolean(viewTarget)}
        banner={viewBanner}
        loading={viewLoading}
        onClose={() => {
          setViewTarget(null);
          setViewBanner(null);
        }}
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
