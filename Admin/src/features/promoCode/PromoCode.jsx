import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  X,
  Eye,
  Tag,
  AlertTriangle,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";
import PromoCodeDetails from "./PromoCodeDetails";
import {
  createPromoCode,
  getPromoCodes,
  updatePromoCode,
  DISCOUNT_TYPES,
  PROMO_STATUSES,
  APPLICABLE_ACTIONS,
} from "./services/PromoCodeApi";

const STATUS_FILTERS = ["All", PROMO_STATUSES.LIVE, PROMO_STATUSES.SCHEDULED, PROMO_STATUSES.EXPIRED];
const STATUS_LABELS = { All: "All", LIVE: "Live", SCHEDULED: "Scheduled", EXPIRED: "Expired" };

const ACTION_OPTIONS = [
  { value: APPLICABLE_ACTIONS.NEW, label: "New" },
  { value: APPLICABLE_ACTIONS.UPGRADE, label: "Upgrade" },
];

const EMPTY_FORM = {
  id: null,
  code: "",
  description: "",
  discountType: DISCOUNT_TYPES.PERCENT,
  discountPercent: "",
  discountAmount: "",
  maxDiscountAmount: "",
  minOrderValue: "",
  applicableActions: [],
  firstTimeOnly: false,
  validFrom: "",
  validTill: "",
  totalUsageLimit: "",
  perBrandUsageLimit: "",
  isActive: true,
};

/* -------------------------------------------------------------------------
 * Add / Edit modal
 * ---------------------------------------------------------------------- */

function PromoCodeFormModal({ open, initialData, saving, onClose, onSave }) {
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

  const toggleAction = (value) => {
    setForm((prev) => ({
      ...prev,
      applicableActions: prev.applicableActions.includes(value)
        ? prev.applicableActions.filter((a) => a !== value)
        : [...prev.applicableActions, value],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Promo code is required";
    const discountField = form.discountType === DISCOUNT_TYPES.PERCENT ? "discountPercent" : "discountAmount";
    if (!String(form[discountField]).trim()) nextErrors[discountField] = "Discount value is required";
    if (!form.validFrom) nextErrors.validFrom = "Start date is required";
    if (!form.validTill) nextErrors.validTill = "End date is required";
    if (form.validFrom && form.validTill && form.validFrom > form.validTill) {
      nextErrors.validTill = "End date must be after start date";
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
        className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-50">
              {isEdit ? "Edit Promo Code" : "Add Promo Code"}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              {isEdit ? "Update the details for this promo code." : "Create a new promotional discount code."}
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
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {/* Code */}
          <div className="mb-4">
            <label htmlFor="promo-code" className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Code
            </label>
            <input
              id="promo-code"
              value={form.code}
              onChange={(e) => setField("code", e.target.value.toUpperCase())}
              placeholder="e.g. LAUNCH20"
              className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 font-mono text-[13.5px] tracking-wide text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                errors.code
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                  : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
              }`}
              disabled={isEdit}
            />
            {errors.code && <p className="mt-1.5 text-[12px] text-red-400">{errors.code}</p>}
            {isEdit && <p className="mt-1.5 text-[11.5px] text-neutral-600">Code can't be changed after creation.</p>}
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="promo-description" className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
              Description <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <textarea
              id="promo-description"
              value={form.description}
              onChange={handleChange("description")}
              rows={2}
              placeholder="e.g. Launch offer — 20% off, capped at ₹1,000"
              className="w-full resize-none rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          {/* Discount */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Discount Type</label>
              <select
                value={form.discountType}
                onChange={handleChange("discountType")}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              >
                <option value={DISCOUNT_TYPES.PERCENT}>Percent</option>
                <option value={DISCOUNT_TYPES.FLAT}>Flat</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">
                {form.discountType === DISCOUNT_TYPES.PERCENT ? "Discount (%)" : "Discount Amount (₹)"}
              </label>
              {form.discountType === DISCOUNT_TYPES.PERCENT ? (
                <input
                  type="number"
                  min={0}
                  value={form.discountPercent}
                  onChange={handleChange("discountPercent")}
                  placeholder="20"
                  className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                    errors.discountPercent
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                  }`}
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  value={form.discountAmount}
                  onChange={handleChange("discountAmount")}
                  placeholder="500"
                  className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 ${
                    errors.discountAmount
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                  }`}
                />
              )}
              {(errors.discountPercent || errors.discountAmount) && (
                <p className="mt-1.5 text-[11.5px] text-red-400">{errors.discountPercent || errors.discountAmount}</p>
              )}
            </div>
          </div>

          {form.discountType === DISCOUNT_TYPES.PERCENT && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Max Discount Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={form.maxDiscountAmount}
                onChange={handleChange("maxDiscountAmount")}
                placeholder="1000"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              />
              <p className="mt-1.5 text-[11px] text-neutral-600">Caps how much a percent-based discount can be worth.</p>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Min Order Value (₹)</label>
            <input
              type="number"
              min={0}
              value={form.minOrderValue}
              onChange={handleChange("minOrderValue")}
              placeholder="1999"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
            />
          </div>

          {/* Usage limits */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Total Usage Limit</label>
              <input
                type="number"
                min={0}
                value={form.totalUsageLimit}
                onChange={handleChange("totalUsageLimit")}
                placeholder="500"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Per Brand Usage Limit</label>
              <input
                type="number"
                min={0}
                value={form.perBrandUsageLimit}
                onChange={handleChange("perBrandUsageLimit")}
                placeholder="1"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60"
              />
            </div>
          </div>

          {/* Validity */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Valid From</label>
              <input
                type="date"
                value={form.validFrom}
                onChange={handleChange("validFrom")}
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 [color-scheme:dark] ${
                  errors.validFrom
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.validFrom && <p className="mt-1.5 text-[11.5px] text-red-400">{errors.validFrom}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Valid Till</label>
              <input
                type="date"
                value={form.validTill}
                onChange={handleChange("validTill")}
                className={`w-full rounded-xl border bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 focus:outline-none focus:ring-1 [color-scheme:dark] ${
                  errors.validTill
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-800 focus:border-emerald-400/60 focus:ring-emerald-400/60"
                }`}
              />
              {errors.validTill && <p className="mt-1.5 text-[11.5px] text-red-400">{errors.validTill}</p>}
            </div>
          </div>

          {/* Applicable actions */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-300">Applicable Actions</label>
            <div className="flex gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggleAction(opt.value)}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    form.applicableActions.includes(opt.value)
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                      : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* First time only */}
          <label className="mb-6 flex items-center gap-2 text-[12.5px] text-neutral-300">
            <input
              type="checkbox"
              checked={form.firstTimeOnly}
              onChange={(e) => setField("firstTimeOnly", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-emerald-400"
            />
            First-time brands only
          </label>

          {/* Status */}
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
                  onClick={() => setField("isActive", s.value)}
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Promo Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Helpers to map between API shape and the form's shape
 * ---------------------------------------------------------------------- */

function apiToRow(promo) {
  return {
    id: promo._id ?? promo.id,
    code: promo.code,
    description: promo.description || "",
    discountType: promo.discountType || DISCOUNT_TYPES.PERCENT,
    discountPercent: promo.discountPercent ?? 0,
    discountAmount: promo.discountAmount ?? 0,
    maxDiscountAmount: promo.maxDiscountAmount ?? 0,
    minOrderValue: promo.minOrderValue ?? 0,
    subscriptionIds: Array.isArray(promo.subscriptionIds) ? promo.subscriptionIds : [],
    applicableActions: Array.isArray(promo.applicableActions) ? promo.applicableActions : [],
    firstTimeOnly: Boolean(promo.firstTimeOnly),
    validFrom: promo.validFrom || "",
    validTill: promo.validTill || "",
    totalUsageLimit: promo.totalUsageLimit ?? 0,
    perBrandUsageLimit: promo.perBrandUsageLimit ?? 0,
    usedCount: promo.usedCount ?? 0,
    consumedCount: promo.consumedCount ?? 0,
    reservedCount: promo.reservedCount ?? 0,
    remainingUses: promo.remainingUses ?? 0,
    isExpired: Boolean(promo.isExpired),
    isActive: Boolean(promo.isActive),
    status: promo.isActive ? "Active" : "Inactive",
  };
}

function rowToFormDraft(row) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discountType,
    discountPercent: row.discountPercent,
    discountAmount: row.discountAmount,
    maxDiscountAmount: row.maxDiscountAmount,
    minOrderValue: row.minOrderValue,
    applicableActions: [...row.applicableActions],
    firstTimeOnly: row.firstTimeOnly,
    validFrom: row.validFrom,
    validTill: row.validTill,
    totalUsageLimit: row.totalUsageLimit,
    perBrandUsageLimit: row.perBrandUsageLimit,
    isActive: row.isActive,
  };
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function PromoCode() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  const fetchPromoCodes = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getPromoCodes({
        page,
        limit,
        search,
        status: statusFilter === "All" ? "" : statusFilter,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const rows = (res?.data?.data ?? []).map(apiToRow);
      setPromoCodes(rows);
      setTotalPages(res?.data?.totalPages ?? 1);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchPromoCodes();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  // Refetch on page change (search/status effect already handles those changes)
  useEffect(() => {
    fetchPromoCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (selectedId) {
    return <PromoCodeDetails id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const handleAddClick = () => {
    setEditingPromo(null);
    setSaveError("");
    setModalOpen(true);
  };

  const handleEdit = (row) => {
    setEditingPromo(rowToFormDraft(row));
    setSaveError("");
    setModalOpen(true);
  };

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        description: form.description.trim(),
        discountType: form.discountType,
        discountPercent: Number(form.discountPercent) || 0,
        discountAmount: Number(form.discountAmount) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        minOrderValue: Number(form.minOrderValue) || 0,
        applicableActions: form.applicableActions,
        firstTimeOnly: form.firstTimeOnly,
        validFrom: form.validFrom,
        validTill: form.validTill,
        totalUsageLimit: Number(form.totalUsageLimit) || 0,
        perBrandUsageLimit: Number(form.perBrandUsageLimit) || 0,
        isActive: form.isActive,
      };
      if (form.id) {
        // Code can't be edited — never included in the update body.
        await updatePromoCode(form.id, payload);
      } else {
        // Code is only set on create.
        await createPromoCode({ ...payload, code: form.code.trim().toUpperCase() });
      }
      setModalOpen(false);
      setEditingPromo(null);
      fetchPromoCodes();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
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
      key: "code",
      label: "Code",
      render: (row) => (
        <div>
          <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold text-neutral-50">
            <Tag size={12} className="text-emerald-400" />
            {row.code}
          </span>
          {row.description && <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-neutral-500">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (row) => (
        <span className="font-semibold text-neutral-200">
          {row.discountType === DISCOUNT_TYPES.PERCENT ? `${row.discountPercent}%` : `₹${row.discountAmount}`}
        </span>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (row) => (
        <span className="text-neutral-300">
          {row.usedCount} / {row.totalUsageLimit || "∞"}
        </span>
      ),
    },
    {
      key: "remaining",
      label: "Remaining",
      render: (row) => <span className="text-neutral-400">{row.remainingUses}</span>,
    },
    {
      key: "expired",
      label: "Expired",
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            row.isExpired ? "bg-neutral-700/40 text-neutral-400" : "bg-emerald-400/10 text-emerald-400"
          }`}
        >
          {row.isExpired ? "Expired" : "Live"}
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
            onClick={() => setSelectedId(row.id)}
            aria-label={`View ${row.code}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.code}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-emerald-400"
          >
            <Pencil size={15} />
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
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">Promo Codes</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Create and manage promotional discount codes.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Add Promo Code
          </button>
        </div>

        {/* Search + status filter */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or description..."
              className="w-full bg-transparent text-[13.5px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-1.5">
            <SlidersHorizontal size={14} className="ml-1 shrink-0 text-neutral-500" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  statusFilter === s ? "bg-emerald-400 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>

        {modalOpen && saveError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {saveError}
          </div>
        )}

        {/* Load state */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-800 py-14 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" />
            Loading promo codes…
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-400">
            Failed to load promo codes: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            <Table columns={columns} data={promoCodes} emptyMessage="No promo codes yet. Add one to get started." />

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
      <PromoCodeFormModal
        open={modalOpen}
        initialData={editingPromo}
        saving={saving}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingPromo(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
