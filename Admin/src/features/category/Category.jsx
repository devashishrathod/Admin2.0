import React, { useState } from "react";
import { Plus, Search, Pencil, Trash2, X, Image as ImageIcon } from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";

const INITIAL_CATEGORIES = [
  {
    id: 1,
    name: "Electronics",
    emoji: "💻",
    subCategoryCount: 12,
    voucherCount: 34,
    status: "Active",
  },
  {
    id: 2,
    name: "Fashion",
    emoji: "👕",
    subCategoryCount: 8,
    voucherCount: 21,
    status: "Active",
  },
  {
    id: 3,
    name: "Groceries",
    emoji: "🛒",
    subCategoryCount: 5,
    voucherCount: 9,
    status: "Inactive",
  },
  {
    id: 4,
    name: "Beauty & Wellness",
    emoji: "💄",
    subCategoryCount: 6,
    voucherCount: 14,
    status: "Active",
  },
];

const EMPTY_FORM = {
  id: null,
  name: "",
  emoji: "🏷️",
  icon: "",
  status: "Active",
};

const EMOJI_OPTIONS = ["🏷️", "💻", "👕", "🛒", "💄", "🏠", "🎮", "📚", "🍔", "🚗"];

function CategoryFormModal({ open, initialData, onClose, onSave }) {
  const [form, setForm] = useState(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Re-sync form state whenever a new record is opened for editing.
  React.useEffect(() => {
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">
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
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5">
          {/* Icon picker */}
          <div className="mb-4">
            <label className="mb-2 block text-[12.5px] font-medium text-neutral-300">
              Category Icon
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-800">
                {form.icon ? (
                  <img
                    src={form.icon}
                    alt="preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[20px]">{form.emoji || "🏷️"}</span>
                )}
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {EMOJI_OPTIONS.map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, emoji: em, icon: "" }))
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[14px] transition-colors ${
                      form.emoji === em && !form.icon
                        ? "bg-emerald-400/15 ring-1 ring-emerald-400"
                        : "bg-neutral-800 hover:bg-neutral-700"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Icon URL (optional, overrides emoji) */}
          <div className="mb-4">
            <label
              htmlFor="cat-icon-url"
              className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-300"
            >
              <ImageIcon size={13} className="text-neutral-500" />
              Icon Image URL{" "}
              <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="cat-icon-url"
              value={form.icon}
              onChange={handleChange("icon")}
              placeholder="https://..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          {/* Name */}
          <div className="mb-4">
            <label
              htmlFor="cat-name"
              className="mb-1.5 block text-[12.5px] font-medium text-neutral-300"
            >
              Category Name
            </label>
            <input
              id="cat-name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="e.g. Electronics"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.name
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
            />
            {errors.name && (
              <p className="mt-1.5 text-[12px] text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Status
            </label>
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

          {/* Footer actions */}
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
              {isEdit ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Category() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClick = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (cat) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleDelete = (cat) => {
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  };

  const handleSave = (formValues) => {
    if (formValues.id) {
      // Update existing category
      setCategories((prev) =>
        prev.map((c) =>
          c.id === formValues.id
            ? {
                ...c,
                name: formValues.name.trim(),
                emoji: formValues.emoji,
                icon: formValues.icon,
                status: formValues.status,
              }
            : c
        )
      );
    } else {
      // Create new category
      const nextId =
        categories.length > 0
          ? Math.max(...categories.map((c) => c.id)) + 1
          : 1;
      setCategories((prev) => [
        ...prev,
        {
          id: nextId,
          name: formValues.name.trim(),
          emoji: formValues.emoji,
          icon: formValues.icon,
          subCategoryCount: 0,
          voucherCount: 0,
          status: formValues.status,
        },
      ]);
    }
    setModalOpen(false);
    setEditingCategory(null);
  };

  // Column config for the shared Table component.
  const columns = [
    {
      key: "sno",
      label: "S.No",
      width: "w-16",
      render: (_row, index) => (
        <span className="text-neutral-500">{index + 1}</span>
      ),
    },
    {
      key: "icon",
      label: "Category Icon",
      render: (row) => (
        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
          {row.icon ? (
            <img
              src={row.icon}
              alt={row.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[15px]">{row.emoji || "🏷️"}</span>
          )}
        </div>
      ),
    },
    {
      key: "name",
      label: "Category Name",
      render: (row) => (
        <span className="font-medium text-neutral-50">{row.name}</span>
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

        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category..."
            className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>

        {/* Table */}
        <Table
          columns={columns}
          data={filtered}
          emptyMessage="No categories yet. Add one to get started."
        />
      </div>

      {/* Add / Edit Category modal */}
      <CategoryFormModal
        open={modalOpen}
        initialData={editingCategory}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}