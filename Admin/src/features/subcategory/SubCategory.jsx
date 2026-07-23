import React, { useState, useRef } from "react";
import { Plus, Search, Pencil, Trash2, X, Image as ImageIcon, Layers } from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";

/* -------------------------------------------------------------------------
 * Mock data
 * ---------------------------------------------------------------------- */

const CATEGORIES = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Fashion" },
  { id: 3, name: "Groceries" },
  { id: 4, name: "Beauty & Wellness" },
];

const INITIAL_SUBCATEGORIES = [
  {
    id: 101,
    name: "Mobiles & Accessories",
    image: "",
    categoryId: 1,
    voucherCount: 18,
    status: "Active",
  },
  {
    id: 102,
    name: "Laptops & Computers",
    image: "",
    categoryId: 1,
    voucherCount: 9,
    status: "Active",
  },
  {
    id: 103,
    name: "Home Appliances",
    image: "",
    categoryId: 1,
    voucherCount: 5,
    status: "Inactive",
  },
  {
    id: 201,
    name: "Men's Wear",
    image: "",
    categoryId: 2,
    voucherCount: 11,
    status: "Active",
  },
  {
    id: 202,
    name: "Women's Wear",
    image: "",
    categoryId: 2,
    voucherCount: 14,
    status: "Active",
  },
  {
    id: 401,
    name: "Skincare",
    image: "",
    categoryId: 4,
    voucherCount: 7,
    status: "Active",
  },
];

const EMPTY_FORM = {
  id: null,
  name: "",
  image: "",
  categoryId: CATEGORIES[0]?.id ?? "",
  status: "Active",
};

/* -------------------------------------------------------------------------
 * Reusable image uploader (click to upload, preview, remove)
 * ---------------------------------------------------------------------- */

function ImageUploader({ image, onChange, onRemove, label = "Image" }) {
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
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
          {image ? (
            <img src={image} alt="preview" className="h-full w-full object-cover" />
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
            {image ? "Change Image" : "Upload Image"}
          </button>
          {image && (
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

function SubCategoryFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
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
      onClick={onClose}
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
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5">
          <div className="mb-5">
            <ImageUploader
              image={form.image}
              onChange={(image) => setForm((prev) => ({ ...prev, image }))}
              onRemove={() => setForm((prev) => ({ ...prev, image: "" }))}
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
            <label htmlFor="subcat-parent" className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Parent Category
            </label>
            <select
              id="subcat-parent"
              value={form.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: Number(e.target.value) }))}
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 ${
                errors.categoryId
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            >
              <option value="" disabled>
                Select a category
              </option>
              {CATEGORIES.map((cat) => (
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
              {["Active", "Inactive"].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((prev) => ({ ...prev, status: s }))}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.status === s
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center rounded-xl border border-neutral-800 px-4 text-[13.5px] font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              {isEdit ? "Save Changes" : "Add Sub-Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function SubCategory() {
  const [subCategories, setSubCategories] = useState(INITIAL_SUBCATEGORIES);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  const categoryName = (id) => CATEGORIES.find((c) => c.id === id)?.name || "—";

  const filtered = subCategories.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(search.toLowerCase()) ||
      categoryName(sub.categoryId).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || sub.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddClick = () => {
    setEditingSubCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (sub) => {
    setEditingSubCategory(sub);
    setModalOpen(true);
  };

  const handleDelete = (sub) => {
    setSubCategories((prev) => prev.filter((s) => s.id !== sub.id));
  };

  const handleSave = (formValues) => {
    if (formValues.id) {
      setSubCategories((prev) =>
        prev.map((s) =>
          s.id === formValues.id
            ? {
                ...s,
                name: formValues.name.trim(),
                image: formValues.image,
                categoryId: formValues.categoryId,
                status: formValues.status,
              }
            : s
        )
      );
    } else {
      const nextId =
        subCategories.length > 0 ? Math.max(...subCategories.map((s) => s.id)) + 1 : 1;
      setSubCategories((prev) => [
        ...prev,
        {
          id: nextId,
          name: formValues.name.trim(),
          image: formValues.image,
          categoryId: formValues.categoryId,
          voucherCount: 0,
          status: formValues.status,
        },
      ]);
    }
    setModalOpen(false);
    setEditingSubCategory(null);
  };

  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => <span className="text-neutral-500">{index + 1}</span>,
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
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDelete(row)}
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
              placeholder="Search sub-category or category..."
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value === "All" ? "All" : Number(e.target.value))
            }
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-56"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No sub-categories yet. Add one to get started."
        />
      </div>

      {/* Add / Edit modal */}
      <SubCategoryFormModal
        open={modalOpen}
        initialData={editingSubCategory}
        onClose={() => {
          setModalOpen(false);
          setEditingSubCategory(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}