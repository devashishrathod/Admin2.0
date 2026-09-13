import React, { useState, useEffect, useCallback, useRef } from "react";
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
  CheckCircle2,
  Repeat,
  Gift,
  Award,
  TrendingUp,
  Percent,
  Users,
  Store,
  Wallet,
  Layers,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import Table from "../../components/common/Table";
import PromoCodeDetails from "./PromoCodeDetails";
import { createPromoCode, getPromoCodes, updatePromoCode } from "./services/PromoCodeApi";
import {
  PROMO_DISCOUNT_TYPES,
  PROMO_AUDIENCE,
  PROMO_APPLIES_TO,
  PROMO_COST_BEARING_MODE,
  PROMO_APPLICABLE_ACTIONS,
  PROMO_STATUSES,
  DISCOUNT_TYPE_LABELS,
  AUDIENCE_LABELS,
  APPLIES_TO_LABELS,
  COST_BEARING_LABELS,
  APPLICABLE_ACTION_LABELS,
} from "./promoCodeEnums";
import { getVouchers } from "../voucher/services/VoucherApi";
import { getAllBrands } from "../brand/services/brandApi";
import { getCategories } from "../category/services/CategoryApi";
import { getPlans } from "../plan/services/planApi";

const STATUS_FILTERS = ["All", PROMO_STATUSES.LIVE, PROMO_STATUSES.SCHEDULED, PROMO_STATUSES.EXPIRED];
const STATUS_LABELS = { All: "All", LIVE: "Live", SCHEDULED: "Scheduled", EXPIRED: "Expired" };

const ACTION_OPTIONS = Object.values(PROMO_APPLICABLE_ACTIONS).map((value) => ({
  value,
  label: APPLICABLE_ACTION_LABELS[value],
}));
const ACTION_LABELS = APPLICABLE_ACTION_LABELS;

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Effective display status, folded from the two real flags the API gives us
// (isExpired, isActive) into one badge — same idea as deriveStatus() in
// features/newOnboarding/NewOnboarding.jsx.
function deriveDisplayStatus(row) {
  if (row.isExpired) return { label: "Expired", className: "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400" };
  if (!row.isActive) return { label: "Inactive", className: "bg-amber-400/10 text-amber-600 dark:text-amber-400" };
  return { label: "Live", className: "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" };
}

const CHART_COLORS = { PERCENT: "#2FDE8C", FLAT: "#38BDF8" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[11.5px] shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-xl dark:shadow-black/40">
      {label && <p className="mb-1 font-medium text-neutral-700 dark:text-neutral-300">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, caption, tint }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon size={16} />
        </span>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="text-[19px] font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
        </div>
      </div>
      {caption && <p className="mt-2 text-[11px] text-neutral-500">{caption}</p>}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Small reusable form bits used by the rebuilt Add/Edit form.
 * ---------------------------------------------------------------------- */

// A removable-chip multi-select for real records (vouchers/brands/
// categories) fetched from their own feature's API — type to filter,
// click a result to add it.
// A closed-by-default dropdown with a checkbox list — click to open,
// search to filter, check/uncheck to select. Selected items also show as
// removable chips above the trigger.
function MultiIdPicker({ label, hint, options, selectedIds, onChange, placeholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.filter((o) => selectedIds.includes(o.id));
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  const toggle = (id) => onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <span
              key={o.id}
              className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11.5px] font-medium text-emerald-600 dark:text-emerald-400"
            >
              {o.label}
              <button
                type="button"
                onClick={() => toggle(o.id)}
                aria-label={`Remove ${o.label}`}
                className="text-emerald-600/70 hover:text-red-500 dark:text-emerald-400/70"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13px] text-neutral-600 transition-colors hover:border-emerald-400/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
      >
        <span>{selected.length ? `${selected.length} selected` : "None selected — no restriction"}</span>
        <ChevronDown size={15} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && <p className="px-3 py-2 text-[12px] text-neutral-500">No matches.</p>}
            {filtered.map((o) => {
              const checked = selectedIds.includes(o.id);
              return (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.id)}
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-emerald-400 dark:border-neutral-700"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        </div>
      )}
      {hint && <p className="mt-1.5 text-[11px] text-neutral-600">{hint}</p>}
    </div>
  );
}

// One tile of the form's bento-grid flow — a numbered, icon-labeled card
// so the long real schema reads as a sequence (Basics → Audience →
// Discount → Scope → Limits → Validity → Status) instead of one
// continuous scroll of fields. Every card uses the same neutral surface —
// the selected state inside a card (SegmentedField below) is what carries
// color, not the card itself, so nothing reads as a box-inside-a-box.
function FormCard({ step, icon: Icon, title, subtitle, span = 1, children }) {
  return (
    <div className={`rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60 ${span === 2 ? "sm:col-span-2" : ""}`}>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          {step}
        </span>
        {Icon && <Icon size={14} className="shrink-0 text-neutral-500 dark:text-neutral-400" />}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-100">{title}</p>
          {subtitle && <p className="text-[11px] text-neutral-500">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// A uniform segmented control (classic pill-track style) for every enum
// field in this form — Discount Type, Audience, Applies To, Cost Bearing
// and Status — so every enum reads the same way, and the selected option
// is shown by a raised chip rather than a colored border (which read as a
// box-inside-a-box when the surrounding card also had a tint).
function SegmentedField({ label, value, options, onChange, columns = options.length }) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>}
      <div
        className="grid gap-1 rounded-xl bg-neutral-200/70 p-1 dark:bg-neutral-900"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <button
            type="button"
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors ${
              value === opt.value
                ? "bg-white text-emerald-600 shadow-sm dark:bg-neutral-800 dark:text-emerald-400"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A single-select dropdown — same closed-by-default trigger + panel
// pattern as MultiIdPicker, just one choice instead of many. Used for
// Audience, where a segmented control read as a box-inside-a-box.
function DropdownField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-neutral-800 transition-colors hover:border-emerald-400/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      >
        <span>{current?.label ?? "Select…"}</span>
        <ChevronDown size={15} className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {options.map((opt) => (
            <button
              type="button"
              key={String(opt.value)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`block w-full px-3.5 py-2.5 text-left text-[13px] transition-colors ${
                value === opt.value
                  ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A quiet, contained note for when a picker's own list failed to load —
// same info the admin needs, without a stark red exclamation.
// The raw error (e.g. a Joi validation string like "Query.limit must be
// less than or equal to 100") is logged to the console for debugging, not
// shown here — an admin doesn't need the backend's own validator wording,
// just a plain "this didn't load" plus somewhere to look next.
function PickerErrorNote({ what }) {
  return (
    <div className="mb-1.5 flex items-start gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
      <AlertTriangle size={12} className="mt-[1px] shrink-0" />
      <span>Couldn't load {what} right now — check the browser console or try reopening this form.</span>
    </div>
  );
}

const EMPTY_FORM = {
  id: null,
  code: "",
  description: "",
  discountType: PROMO_DISCOUNT_TYPES.PERCENT,
  discountPercent: "",
  discountAmount: "",
  maxDiscountAmount: "",
  minOrderValue: "",
  validFrom: "",
  validTill: "",
  totalUsageLimit: "",
  perBrandUsageLimit: "",
  isActive: true,

  // ---------- audience ----------
  audience: PROMO_AUDIENCE.VENDOR,

  // ---------- vendor scope (audience === VENDOR) ----------
  subscriptionIds: [],
  applicableActions: [],
  firstTimeOnly: false,

  // ---------- customer scope (audience === CUSTOMER) ----------
  voucherIds: [],
  brandIds: [],
  categoryIds: [],
  perCustomerUsageLimit: "",
  firstOrderOnly: false,
  minBillAmount: "",
  appliesTo: PROMO_APPLIES_TO.NET_BILL,
  costBearing: { mode: PROMO_COST_BEARING_MODE.PLATFORM, vendorPercent: "" },
};

/* -------------------------------------------------------------------------
 * Add / Edit modal — every real field from the backend's Joi validator,
 * split into Audience → (Vendor scope | Customer scope) → shared sections
 * so the form only ever shows what's relevant to the code's own audience.
 * ---------------------------------------------------------------------- */

function PromoCodeFormModal({ open, initialData, saving, plans, vouchers, brands, categories, pickerErrors = {}, onClose, onSave }) {
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
  const setCostBearing = (patch) => setForm((prev) => ({ ...prev, costBearing: { ...prev.costBearing, ...patch } }));

  const toggleAction = (value) => {
    setForm((prev) => ({
      ...prev,
      applicableActions: prev.applicableActions.includes(value)
        ? prev.applicableActions.filter((a) => a !== value)
        : [...prev.applicableActions, value],
    }));
  };

  const isCustomer = form.audience === PROMO_AUDIENCE.CUSTOMER;
  const isVendor = form.audience === PROMO_AUDIENCE.VENDOR;
  const costBearingNeedsBrands =
    isCustomer && [PROMO_COST_BEARING_MODE.VENDOR, PROMO_COST_BEARING_MODE.SHARED].includes(form.costBearing.mode);

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Promo code is required";
    const discountField = form.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? "discountPercent" : "discountAmount";
    if (!String(form[discountField]).trim()) nextErrors[discountField] = "Discount value is required";
    if (!form.validFrom) nextErrors.validFrom = "Start date is required";
    if (!form.validTill) nextErrors.validTill = "End date is required";
    if (form.validFrom && form.validTill && form.validFrom > form.validTill) {
      nextErrors.validTill = "End date must be after start date";
    }
    // A code that debits a vendor's payout (VENDOR/SHARED cost-bearing)
    // must be scoped to specific brands — otherwise it would deduct from
    // whichever brand a customer happened to visit (assertCoherent, backend).
    if (costBearingNeedsBrands && form.brandIds.length === 0) {
      nextErrors.brandIds = "Vendor/Shared cost-bearing needs at least one brand selected.";
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
        className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Step 1 — Basics */}
          <FormCard step={1} icon={Tag} title="Basics" span={2}>
            <div>
              <label htmlFor="promo-code" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Code
              </label>
              <input
                id="promo-code"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH20"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 font-mono text-[13.5px] tracking-wide text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                  errors.code
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                    : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                }`}
                disabled={isEdit}
              />
              {errors.code && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{errors.code}</p>}
              {isEdit && <p className="mt-1.5 text-[11.5px] text-neutral-600">Code can't be changed after creation.</p>}
            </div>

            <div>
              <label htmlFor="promo-description" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                Description <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <textarea
                id="promo-description"
                value={form.description}
                onChange={handleChange("description")}
                rows={2}
                placeholder="e.g. Launch offer — 20% off, capped at ₹1,000"
                className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </FormCard>

          {/* Step 2 — Audience (drives which later steps appear) */}
          <FormCard step={2} icon={Users} title="Audience" subtitle="Which checkout this code belongs to">
            <DropdownField
              value={form.audience}
              onChange={(v) => setField("audience", v)}
              options={Object.values(PROMO_AUDIENCE).map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))}
            />
            <p className="text-[11px] text-neutral-600">A vendor and a customer never see each other's codes.</p>
          </FormCard>

          {/* Step 3 — Discount */}
          <FormCard step={3} icon={Percent} title="Discount">
            <div className="grid grid-cols-2 gap-3">
              <SegmentedField
                label="Discount Type"
                value={form.discountType}
                onChange={(v) => setField("discountType", v)}
                options={Object.values(PROMO_DISCOUNT_TYPES).map((t) => ({ value: t, label: DISCOUNT_TYPE_LABELS[t] }))}
              />
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  {form.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? "Discount (%)" : "Discount Amount (₹)"}
                </label>
                {form.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? (
                  <input
                    type="number"
                    min={0}
                    value={form.discountPercent}
                    onChange={handleChange("discountPercent")}
                    placeholder="20"
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                      errors.discountPercent
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                        : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                    }`}
                  />
                ) : (
                  <input
                    type="number"
                    min={0}
                    value={form.discountAmount}
                    onChange={handleChange("discountAmount")}
                    placeholder="500"
                    className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
                      errors.discountAmount
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                        : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                    }`}
                  />
                )}
                {(errors.discountPercent || errors.discountAmount) && (
                  <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.discountPercent || errors.discountAmount}</p>
                )}
              </div>
            </div>

            {form.discountType === PROMO_DISCOUNT_TYPES.PERCENT && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Max Discount Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscountAmount}
                  onChange={handleChange("maxDiscountAmount")}
                  placeholder="1000"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                />
                <p className="mt-1.5 text-[11px] text-neutral-600">Caps how much a percent-based discount can be worth.</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Min Order Value (₹)</label>
              <input
                type="number"
                min={0}
                value={form.minOrderValue}
                onChange={handleChange("minOrderValue")}
                placeholder="1999"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </FormCard>

          {/* Step 4 — Vendor scope */}
          {isVendor && (
            <FormCard step={4} icon={Store} title="Vendor Scope" subtitle="Which subscription plans and actions this code covers" span={2}>
              {pickerErrors.plans && <PickerErrorNote what="plans" />}
              <MultiIdPicker
                label="Eligible Subscription Plans"
                options={plans}
                selectedIds={form.subscriptionIds}
                onChange={(v) => setField("subscriptionIds", v)}
                placeholder="Search plans…"
              />
              <p className="text-[11px] text-neutral-600">
                Voucher/Brand/Category scoping lives under Customer audience (Step 2) — a vendor code only ever discounts a subscription.
              </p>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Applicable Actions</label>
                <div className="flex flex-wrap gap-2">
                  {ACTION_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleAction(opt.value)}
                      className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                        form.applicableActions.includes(opt.value)
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                          : "border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-600">None selected means any action.</p>
              </div>
              <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.firstTimeOnly}
                  onChange={(e) => setField("firstTimeOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 bg-white accent-emerald-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
                First subscription purchase only
              </label>
            </FormCard>
          )}

          {/* Step 4 — Customer scope */}
          {isCustomer && (
            <FormCard step={4} icon={Gift} title="Customer Scope" subtitle="Which vouchers, brands and categories this code covers" span={2}>
              <SegmentedField
                label="Applies To"
                value={form.appliesTo}
                onChange={(v) => setField("appliesTo", v)}
                options={Object.values(PROMO_APPLIES_TO).map((t) => ({ value: t, label: APPLIES_TO_LABELS[t] }))}
                columns={2}
              />

              <div>
                {pickerErrors.vouchers && <PickerErrorNote what="vouchers" />}
                <MultiIdPicker
                  label="Eligible Vouchers"
                  options={vouchers}
                  selectedIds={form.voucherIds}
                  onChange={(v) => setField("voucherIds", v)}
                  placeholder="Search vouchers…"
                />
              </div>
              <div>
                {pickerErrors.brands && <PickerErrorNote what="brands" />}
                <MultiIdPicker
                  label="Eligible Brands"
                  options={brands}
                  selectedIds={form.brandIds}
                  onChange={(v) => setField("brandIds", v)}
                  placeholder="Search brands…"
                />
                {errors.brandIds && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.brandIds}</p>}
              </div>
              <div>
                {pickerErrors.categories && <PickerErrorNote what="categories" />}
                <MultiIdPicker
                  label="Eligible Categories"
                  options={categories}
                  selectedIds={form.categoryIds}
                  onChange={(v) => setField("categoryIds", v)}
                  placeholder="Search categories…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Per-Customer Usage Limit</label>
                  <input
                    type="number"
                    min={0}
                    value={form.perCustomerUsageLimit}
                    onChange={handleChange("perCustomerUsageLimit")}
                    placeholder="1"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Min Bill Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.minBillAmount}
                    onChange={handleChange("minBillAmount")}
                    placeholder="500"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) => setField("firstOrderOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 bg-white accent-emerald-400 dark:border-neutral-700 dark:bg-neutral-900"
                />
                First order only
              </label>
            </FormCard>
          )}

          {/* Step 5 — Cost bearing (customer audience only) */}
          {isCustomer && (
            <FormCard step={5} icon={Wallet} title="Who Funds The Discount">
              <SegmentedField
                value={form.costBearing.mode}
                onChange={(m) => setCostBearing({ mode: m })}
                options={Object.values(PROMO_COST_BEARING_MODE).map((m) => ({ value: m, label: COST_BEARING_LABELS[m] }))}
                columns={3}
              />
              {form.costBearing.mode === PROMO_COST_BEARING_MODE.SHARED && (
                <div>
                  <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Vendor's Share (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.costBearing.vendorPercent}
                    onChange={(e) => setCostBearing({ vendorPercent: e.target.value })}
                    placeholder="50"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                  />
                </div>
              )}
              {costBearingNeedsBrands && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Vendor/Shared takes money out of a specific vendor's payout — this code must be scoped to specific brands (Step 4).
                </p>
              )}
            </FormCard>
          )}

          {/* Step 6 — Usage limits */}
          <FormCard step={6} icon={Layers} title="Usage Limits">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Total Usage Limit</label>
                <input
                  type="number"
                  min={0}
                  value={form.totalUsageLimit}
                  onChange={handleChange("totalUsageLimit")}
                  placeholder="500"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Per Brand Usage Limit</label>
                <input
                  type="number"
                  min={0}
                  value={form.perBrandUsageLimit}
                  onChange={handleChange("perBrandUsageLimit")}
                  placeholder="1"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
                />
              </div>
            </div>
          </FormCard>

          {/* Step 7 — Validity & status */}
          <FormCard step={7} icon={Calendar} title="Validity & Status" span={2}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Valid From</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={handleChange("validFrom")}
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 [color-scheme:light] dark:bg-neutral-900 dark:text-neutral-200 dark:[color-scheme:dark] ${
                    errors.validFrom
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                />
                {errors.validFrom && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.validFrom}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Valid Till</label>
                <input
                  type="date"
                  value={form.validTill}
                  onChange={handleChange("validTill")}
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13.5px] text-neutral-800 focus:outline-none focus:ring-1 [color-scheme:light] dark:bg-neutral-900 dark:text-neutral-200 dark:[color-scheme:dark] ${
                    errors.validTill
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
                      : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
                  }`}
                />
                {errors.validTill && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{errors.validTill}</p>}
              </div>
            </div>

            <SegmentedField
              label="Status"
              value={form.isActive}
              onChange={(v) => setField("isActive", v)}
              options={[
                { value: true, label: "Active" },
                { value: false, label: "Inactive" },
              ]}
              columns={2}
            />
          </FormCard>
        </div>

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-end gap-2.5">
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
    discountType: promo.discountType || PROMO_DISCOUNT_TYPES.PERCENT,
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

    // Real fields per the Joi validator — defensively defaulted since the
    // last confirmed getAll sample predates them.
    audience: promo.audience || PROMO_AUDIENCE.VENDOR,
    appliesTo: promo.appliesTo || PROMO_APPLIES_TO.NET_BILL,
    costBearing: {
      mode: promo.costBearing?.mode || PROMO_COST_BEARING_MODE.PLATFORM,
      vendorPercent: promo.costBearing?.vendorPercent ?? 0,
    },
    voucherIds: Array.isArray(promo.voucherIds) ? promo.voucherIds : [],
    brandIds: Array.isArray(promo.brandIds) ? promo.brandIds : [],
    categoryIds: Array.isArray(promo.categoryIds) ? promo.categoryIds : [],
    perCustomerUsageLimit: promo.perCustomerUsageLimit ?? 0,
    firstOrderOnly: Boolean(promo.firstOrderOnly),
    minBillAmount: promo.minBillAmount ?? 0,
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

    audience: row.audience,
    subscriptionIds: [...row.subscriptionIds],
    voucherIds: [...row.voucherIds],
    brandIds: [...row.brandIds],
    categoryIds: [...row.categoryIds],
    perCustomerUsageLimit: row.perCustomerUsageLimit,
    firstOrderOnly: row.firstOrderOnly,
    minBillAmount: row.minBillAmount,
    appliesTo: row.appliesTo,
    costBearing: { ...row.costBearing },
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
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  // Real vouchers/brands/categories/plans for the pickers — each reuses
  // that feature's own "get all" API rather than a fabricated one. Errors
  // are surfaced (not swallowed) so an empty picker always says WHY it's
  // empty instead of just silently showing nothing.
  const [vouchers, setVouchers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pickerErrors, setPickerErrors] = useState({});

  useEffect(() => {
    // 100 is the real backend cap on these two list endpoints (a limit of
    // 200 gets rejected outright with "must be less than or equal to
    // 100") — capped here for all three for consistency.
    getVouchers({ page: 1, limit: 100 })
      .then((res) => {
        const rows = (res?.data?.data ?? []).map((v) => ({ id: v._id, label: v.name || v._id }));
        setVouchers(rows);
      })
      .catch((err) => {
        console.error("Failed to load vouchers for promo code picker:", err.message);
        setPickerErrors((prev) => ({ ...prev, vouchers: true }));
      });
    getAllBrands({ page: 1, limit: 100 })
      .then((res) => {
        const rows = (res?.data?.data ?? res?.data ?? []).map((b) => ({ id: b._id, label: b.brandName || b._id }));
        setBrands(rows);
      })
      .catch((err) => {
        console.error("Failed to load brands for promo code picker:", err.message);
        setPickerErrors((prev) => ({ ...prev, brands: true }));
      });
    getCategories({ page: 1, limit: 100 })
      .then((res) => {
        const rows = (res?.data?.data ?? []).map((c) => ({ id: c._id, label: c.name || c._id }));
        setCategories(rows);
      })
      .catch((err) => {
        console.error("Failed to load categories for promo code picker:", err.message);
        setPickerErrors((prev) => ({ ...prev, categories: true }));
      });
    // getPlans() returns the raw envelope, not a fixed { data: { data } }
    // shape — same defensive unwrap Plan.jsx itself uses.
    getPlans()
      .then((res) => {
        const rawList = Array.isArray(res) ? res : res?.data?.data ?? res?.data?.plans ?? res?.data ?? res?.plans ?? [];
        const rows = (Array.isArray(rawList) ? rawList : []).map((p) => ({ id: p._id ?? p.id, label: p.name || p._id || p.id }));
        setPlans(rows);
      })
      .catch((err) => {
        console.error("Failed to load plans for promo code picker:", err.message);
        setPickerErrors((prev) => ({ ...prev, plans: true }));
      });
  }, []);

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
      setTotal(res?.data?.total ?? rows.length);
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

  // Everything below is derived from the codes already loaded for the
  // current page/filter — no extra fetches, so these are scoped to what's
  // currently shown rather than a platform-wide total.
  const liveCount = promoCodes.filter((r) => !r.isExpired).length;
  const totalRedemptions = promoCodes.reduce((sum, r) => sum + r.usedCount, 0);
  const remainingTotal = promoCodes.reduce((sum, r) => sum + r.remainingUses, 0);

  const topCode = promoCodes.length
    ? [...promoCodes].sort((a, b) => b.usedCount - a.usedCount)[0]
    : null;

  const topByRedemptions = [...promoCodes]
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5)
    .map((r) => ({ name: r.code, Redemptions: r.usedCount }));

  const usageByTypeData = Object.entries(
    promoCodes.reduce((acc, r) => {
      const key = r.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? "Percentage Off" : "Flat Amount";
      acc[key] = (acc[key] || 0) + r.usedCount;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name,
    value,
    color: name === "Percentage Off" ? CHART_COLORS.PERCENT : CHART_COLORS.FLAT,
  }));

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
      const isCustomer = form.audience === PROMO_AUDIENCE.CUSTOMER;
      // These fields are `.min(1).optional()` in the real backend Joi
      // schema — they may be left out entirely, but sending 0 (what an
      // empty form field coerces to) fails validation. Omit instead of
      // defaulting to 0 whenever the admin hasn't set a value ≥ 1.
      const positiveIntOrUndefined = (value) => {
        const n = Number(value);
        return Number.isFinite(n) && n >= 1 ? n : undefined;
      };
      const payload = {
        description: form.description.trim(),
        discountType: form.discountType,
        discountPercent: Number(form.discountPercent) || 0,
        discountAmount: Number(form.discountAmount) || 0,
        maxDiscountAmount: positiveIntOrUndefined(form.maxDiscountAmount),
        minOrderValue: Number(form.minOrderValue) || 0,
        validFrom: form.validFrom,
        validTill: form.validTill,
        totalUsageLimit: positiveIntOrUndefined(form.totalUsageLimit),
        perBrandUsageLimit: positiveIntOrUndefined(form.perBrandUsageLimit),
        isActive: form.isActive,
        audience: form.audience,

        // vendor scope
        subscriptionIds: form.subscriptionIds,
        applicableActions: form.applicableActions,
        firstTimeOnly: form.firstTimeOnly,

        // customer scope — the backend rejects these keys outright on a
        // VENDOR promo code (not just a non-empty value), so they must be
        // left out of the payload entirely, not sent as [] / false / 0.
        voucherIds: isCustomer ? form.voucherIds : undefined,
        brandIds: isCustomer ? form.brandIds : [],
        categoryIds: isCustomer ? form.categoryIds : undefined,
        perCustomerUsageLimit: isCustomer ? positiveIntOrUndefined(form.perCustomerUsageLimit) : undefined,
        firstOrderOnly: isCustomer ? form.firstOrderOnly : undefined,
        minBillAmount: isCustomer ? Number(form.minBillAmount) || 0 : undefined,
        appliesTo: isCustomer ? form.appliesTo : undefined,
        costBearing: isCustomer
          ? {
              mode: form.costBearing.mode,
              ...(form.costBearing.mode === PROMO_COST_BEARING_MODE.SHARED
                ? { vendorPercent: Number(form.costBearing.vendorPercent) || 0 }
                : {}),
            }
          : undefined,
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
      key: "code",
      label: "Code",
      render: (row) => (
        <div>
          <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold text-neutral-900 dark:text-neutral-50">
            <Tag size={12} className="text-emerald-500 dark:text-emerald-400" />
            {row.code}
          </span>
          {row.description && <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-neutral-500">{row.description}</p>}
        </div>
      ),
    },
    {
      key: "audience",
      label: "Audience",
      render: (row) => (
        <span className="flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          <Users size={11} />
          {row.audience === PROMO_AUDIENCE.CUSTOMER ? "Customer" : "Vendor"}
        </span>
      ),
    },
    {
      key: "discount",
      label: "Discount",
      render: (row) => (
        <div>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {row.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? `${row.discountPercent}%` : `₹${row.discountAmount}`}
          </span>
          {row.discountType === PROMO_DISCOUNT_TYPES.PERCENT && row.maxDiscountAmount > 0 && (
            <p className="mt-0.5 text-[11px] text-neutral-500">Capped at ₹{row.maxDiscountAmount}</p>
          )}
          {row.minOrderValue > 0 && (
            <p className="mt-0.5 text-[11px] text-neutral-500">Min order ₹{row.minOrderValue}</p>
          )}
        </div>
      ),
    },
    {
      key: "applicable",
      label: "Applicable",
      render: (row) => (
        <div>
          {row.applicableActions.length ? (
            <div className="flex flex-wrap gap-1">
              {row.applicableActions.map((a) => (
                <span key={a} className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {ACTION_LABELS[a] || a}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-neutral-500">All actions</span>
          )}
          {row.firstTimeOnly && <p className="mt-1 text-[11px] text-sky-600 dark:text-sky-400">First-time only</p>}
        </div>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => (
        <p className="text-[12.5px] text-neutral-700 dark:text-neutral-300">
          {formatDate(row.validFrom)} → {formatDate(row.validTill)}
        </p>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (row) => {
        const pct = row.totalUsageLimit > 0 ? Math.min(100, (row.usedCount / row.totalUsageLimit) * 100) : null;
        return (
          <div>
            <p className="text-[12.5px] text-neutral-700 dark:text-neutral-300">
              {row.usedCount} / {row.totalUsageLimit || "∞"}
              <span className="ml-1.5 text-[11px] text-neutral-500">· {row.remainingUses} left</span>
            </p>
            {pct !== null && (
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const s = deriveDisplayStatus(row);
        return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.className}`}>{s.label}</span>;
      },
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-sky-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-sky-400"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            aria-label={`Edit ${row.code}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-emerald-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-emerald-400"
          >
            <Pencil size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Promo Codes</h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Manage discounts, campaigns and promotional offers.
            </p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={16} />
            Create Promo Code
          </button>
        </div>

        {/* KPI row — every number here comes straight from the codes already
            loaded for the current page/filter, nothing fabricated. */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            icon={Tag}
            label="Total Promo Codes"
            value={total}
            tint="bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          />
          <KpiTile
            icon={CheckCircle2}
            label="Live Now"
            value={liveCount}
            caption="Of the codes currently shown"
            tint="bg-sky-400/10 text-sky-600 dark:text-sky-400"
          />
          <KpiTile
            icon={Repeat}
            label="Total Redemptions"
            value={totalRedemptions.toLocaleString("en-IN")}
            caption="Of the codes currently shown"
            tint="bg-amber-400/10 text-amber-600 dark:text-amber-400"
          />
          <KpiTile
            icon={Gift}
            label="Remaining Uses"
            value={remainingTotal.toLocaleString("en-IN")}
            caption="Of the codes currently shown"
            tint="bg-fuchsia-400/10 text-fuchsia-600 dark:text-fuchsia-400"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          {/* ── Main: search, filters, table ─────────────────────── */}
          <div className="min-w-0">
            {/* Search + status filter */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-xs">
                <Search size={16} className="shrink-0 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code or description..."
                  className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                <SlidersHorizontal size={14} className="ml-1 shrink-0 text-neutral-500" />
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      statusFilter === s ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                    }`}
                  >
                    {STATUS_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </div>

            {modalOpen && saveError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
                <AlertTriangle size={14} className="shrink-0" />
                {saveError}
              </div>
            )}

            {/* Load state */}
            {loading && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
                <Loader2 size={16} className="animate-spin" />
                Loading promo codes…
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
                Failed to load promo codes: {loadError}
              </div>
            )}

            {!loading && !loadError && (
              <>
                <Table
                  columns={columns}
                  data={promoCodes}
                  emptyMessage="No promo codes yet. Add one to get started."
                  minWidth={0}
                  dense
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

          {/* ── Sidebar: top code + charts, all derived from loaded data ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-400/10 to-white p-4 dark:to-neutral-900">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Award size={13} />
                Top Code
              </p>
              {topCode ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-mono text-[16px] font-bold text-neutral-900 dark:text-neutral-50">
                      <Tag size={14} className="text-emerald-500 dark:text-emerald-400" />
                      {topCode.code}
                    </span>
                    {(() => {
                      const s = deriveDisplayStatus(topCode);
                      return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${s.className}`}>{s.label}</span>;
                    })()}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-950/60">
                      <p className="text-[10.5px] text-neutral-500">Redemptions</p>
                      <p className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{topCode.usedCount}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-950/60">
                      <p className="text-[10.5px] text-neutral-500">Offer</p>
                      <p className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
                        {topCode.discountType === PROMO_DISCOUNT_TYPES.PERCENT ? `${topCode.discountPercent}%` : `₹${topCode.discountAmount}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(topCode.id)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 py-2 text-[12px] font-medium text-emerald-600 transition-colors hover:bg-emerald-400/10 dark:text-emerald-400"
                  >
                    <Eye size={13} />
                    View Full Details
                  </button>
                </>
              ) : (
                <p className="text-[12.5px] text-neutral-500">No codes to rank yet.</p>
              )}
              <p className="mt-2 text-[10.5px] text-neutral-500">Most redeemed among the codes currently shown.</p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <TrendingUp size={13} />
                Top Codes by Redemptions
              </p>
              {topByRedemptions.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topByRedemptions} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: "#8C9A91", fontSize: 10.5 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#8C9A91", fontSize: 10.5, fontFamily: "monospace" }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="Redemptions" fill="#2FDE8C" radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-[12.5px] text-neutral-500">No redemptions yet.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <Percent size={13} />
                Redemptions by Discount Type
              </p>
              {usageByTypeData.some((d) => d.value > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={usageByTypeData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={65} paddingAngle={3}>
                        {usageByTypeData.map((d) => (
                          <Cell key={d.name} fill={d.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 space-y-1.5">
                    {usageByTypeData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-[11.5px]">
                        <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-[12.5px] text-neutral-500">No redemptions yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      <PromoCodeFormModal
        open={modalOpen}
        initialData={editingPromo}
        saving={saving}
        plans={plans}
        vouchers={vouchers}
        brands={brands}
        categories={categories}
        pickerErrors={pickerErrors}
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
