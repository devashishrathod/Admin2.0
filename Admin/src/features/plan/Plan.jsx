import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  IndianRupee,
  Tag,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ListChecks,
  Loader2,
} from "lucide-react";
import {
  getPlans,
  addPlan,
  updatePlan,
  deletePlan,
  toggleFeatureAvailability,
  updateFeatureValue,
} from "../plan/services/planApi";

/* -------------------------------------------------------------------------
 * Data shape (matches the real API payload)
 *
 * {
 *   id, name, description, price, strikePrice,
 *   discountType: "PERCENT" | "FLAT", discountPercent,
 *   type: "MONTHLY" | "YEARLY",
 *   status: "Active" | "Inactive",
 *   popular: boolean,               // UI-only, not persisted by the API
 *   benefits: string[],
 *   limitations: string[],
 *   features: [{ id, title, value, available }],
 *   entitlements: {
 *     subBrands: { isUnlimited, limit? },
 *     franchises: { isUnlimited, limit? },
 *     vouchers: { isEnabled },
 *     dealPack: { isEnabled },
 *     prioritySupport: { isEnabled },
 *     showcase: { isEnabled },
 *   }
 * }
 * ---------------------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);

const emptyEntitlements = () => ({
  subBrands: { isUnlimited: false, limit: 0 },
  franchises: { isUnlimited: false, limit: 0 },
  vouchers: { isEnabled: false },
  dealPack: { isEnabled: false },
  prioritySupport: { isEnabled: false },
  showcase: { isEnabled: false },
});

const emptyPlanDraft = () => ({
  id: null,
  name: "",
  description: "",
  price: "",
  strikePrice: "",
  discountType: "PERCENT",
  discountPercent: "",
  type: "MONTHLY",
  status: "Active",
  popular: false,
  benefits: [],
  limitations: [],
  features: [],
  entitlements: emptyEntitlements(),
});

// Normalizes whatever the API returns into the shape every component below
// expects — fills in missing arrays/fields with safe defaults so nothing
// crashes on `.length`, `.map`, etc. Handles both `_id` and `id`.
//
// NOTE: `popular` is still UI-only — the real API doesn't return it.
function normalizeEntitlementLimit(raw) {
  return {
    isUnlimited: Boolean(raw?.isUnlimited),
    limit: raw?.limit ?? 0,
  };
}

function normalizeEntitlements(raw) {
  const defaults = emptyEntitlements();
  return {
    subBrands: raw?.subBrands ? normalizeEntitlementLimit(raw.subBrands) : defaults.subBrands,
    franchises: raw?.franchises ? normalizeEntitlementLimit(raw.franchises) : defaults.franchises,
    vouchers: { isEnabled: Boolean(raw?.vouchers?.isEnabled) },
    dealPack: { isEnabled: Boolean(raw?.dealPack?.isEnabled) },
    prioritySupport: { isEnabled: Boolean(raw?.prioritySupport?.isEnabled) },
    showcase: { isEnabled: Boolean(raw?.showcase?.isEnabled) },
  };
}

function normalizePlan(raw) {
  return {
    id: raw?._id ?? raw?.id ?? uid(),
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    price: raw?.price ?? 0,
    strikePrice: raw?.strikePrice ?? "",
    discountType: raw?.discountType ?? "PERCENT",
    discountPercent: raw?.discountPercent ?? 0,
    type: raw?.type ?? "MONTHLY",
    durationInDays: raw?.durationInDays ?? "",
    status: raw?.status ?? (raw?.isActive === false ? "Inactive" : "Active"),
    popular: Boolean(raw?.popular),
    benefits: Array.isArray(raw?.benefits) ? raw.benefits : [],
    limitations: Array.isArray(raw?.limitations) ? raw.limitations : [],
    features: Array.isArray(raw?.features)
      ? raw.features.map((f) => ({
          id: f?._id ?? f?.id ?? uid(),
          title: f?.title ?? "",
          value: f?.value ?? "",
          available: Boolean(f?.available),
        }))
      : [],
    entitlements: normalizeEntitlements(raw?.entitlements),
  };
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

function TypePill({ type }) {
  return (
    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {type === "MONTHLY" ? "Monthly" : "Yearly"}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Plan card
 * ---------------------------------------------------------------------- */

function PlanCard({ plan, onEdit, onDelete }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-5 dark:bg-neutral-900 ${
        plan.popular ? "border-emerald-400/60" : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10.5px] font-semibold text-neutral-950">
          <Star size={10} fill="currentColor" />
          Most Popular
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{plan.name}</h3>
          <p className="mt-0.5 text-[12px] text-neutral-500">{plan.description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            plan.status === "Active"
              ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
          }`}
        >
          {plan.status}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50">
          ₹{Number(plan.price || 0).toLocaleString("en-IN")}
        </span>
        <TypePill type={plan.type} />
      </div>
      <div className="mt-1 flex items-center gap-2">
        {plan.strikePrice ? (
          <span className="text-[12.5px] text-neutral-600 line-through">
            ₹{Number(plan.strikePrice).toLocaleString("en-IN")}
          </span>
        ) : null}
        {Number(plan.discountPercent) > 0 ? (
          <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            {plan.discountType === "PERCENT"
              ? `${plan.discountPercent}% OFF`
              : `₹${plan.discountPercent} OFF`}
          </span>
        ) : null}
      </div>

      {plan.benefits.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {plan.benefits.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              <ThumbsUp size={12} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {b}
            </li>
          ))}
          {plan.benefits.length > 3 && (
            <li className="text-[11.5px] text-neutral-600">+{plan.benefits.length - 3} more</li>
          )}
        </ul>
      )}

      {plan.limitations.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {plan.limitations.slice(0, 2).map((l, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[12px] text-neutral-600">
              <ThumbsDown size={12} className="mt-0.5 shrink-0 text-red-600/70 dark:text-red-400/70" />
              {l}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          onClick={() => onEdit(plan)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-400 dark:border-neutral-800 dark:text-neutral-300"
        >
          <Pencil size={13} />
          Edit
        </button>
        <button
          onClick={() => onDelete(plan)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-red-500/60 hover:text-red-400 dark:border-neutral-800 dark:text-neutral-300"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Benefits / limitations comparison matrix — rows are the union of every
 * feature title used across all plans. Click a check/cross to toggle
 * availability, click the value to edit it inline.
 * ---------------------------------------------------------------------- */

function ComparisonTable({ plans, onToggleFeature, onEditFeatureValue }) {
  const [editingCell, setEditingCell] = useState(null); // `${planId}-${title}`

  const featureTitles = useMemo(() => {
    const seen = [];
    plans.forEach((p) =>
      p.features.forEach((f) => {
        if (!seen.includes(f.title)) seen.push(f.title);
      })
    );
    return seen;
  }, [plans]);

  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
        No plans yet — add a plan to build the comparison table.
      </div>
    );
  }

  if (!featureTitles.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
        No features added to any plan yet — add features from the plan editor.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-white dark:bg-neutral-900">
              <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Feature
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="px-4 py-3.5 text-center text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureTitles.map((title, i) => (
              <tr key={title} className={i % 2 === 0 ? "bg-neutral-50 dark:bg-neutral-950" : "bg-neutral-100 dark:bg-neutral-900/40"}>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{title}</td>
                {plans.map((plan) => {
                  const feature = plan.features.find((f) => f.title === title);
                  const cellId = `${plan.id}-${title}`;

                  if (!feature) {
                    return (
                      <td key={plan.id} className="px-4 py-3 text-center text-neutral-400 dark:text-neutral-700">
                        —
                      </td>
                    );
                  }

                  const isEditing = editingCell === cellId;

                  return (
                    <td key={plan.id} className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onToggleFeature(plan.id, feature.id)}
                          aria-label={`Toggle ${title} for ${plan.name}`}
                          className="inline-flex shrink-0"
                        >
                          {feature.available ? (
                            <Check size={15} className="text-emerald-600 transition-transform hover:scale-110 dark:text-emerald-400" />
                          ) : (
                            <X size={15} className="text-red-600/80 transition-transform hover:scale-110 dark:text-red-400/80" />
                          )}
                        </button>
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={feature.value}
                            onBlur={(e) => {
                              onEditFeatureValue(plan.id, feature.id, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-16 rounded-md border border-emerald-400/50 bg-neutral-50 px-1.5 py-0.5 text-center text-[12px] text-neutral-800 focus:outline-none dark:bg-neutral-950 dark:text-neutral-200"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell(cellId)}
                            className="rounded-md px-1.5 py-0.5 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                          >
                            {feature.value || "—"}
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Editable list rows used for Benefits and Limitations
 * ---------------------------------------------------------------------- */

function EditableStringList({ title, icon, items, placeholder, accent, onChange }) {
  const update = (i, value) => {
    const next = [...items];
    next[i] = value;
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          {icon}
          {title}
        </p>
        <button
          onClick={add}
          className={`flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11.5px] font-medium text-neutral-700 transition-colors hover:${accent} dark:border-neutral-800 dark:text-neutral-300`}
        >
          <Plus size={12} />
          Add
        </button>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-2.5 text-[12px] text-neutral-600 dark:border-neutral-800">
            None added yet.
          </p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
            <button
              onClick={() => remove(i)}
              aria-label="Remove"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Editable feature rows (title / value / available) inside the plan modal
 * ---------------------------------------------------------------------- */

function EditableFeatureList({ features, onChange }) {
  const update = (i, patch) => {
    const next = [...features];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i) => onChange(features.filter((_, idx) => idx !== i));
  const add = () => onChange([...features, { id: uid(), title: "", value: "", available: true }]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          <ListChecks size={13} className="text-neutral-600" />
          Features
        </p>
        <button
          onClick={add}
          className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[11.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
        >
          <Plus size={12} />
          Add Feature
        </button>
      </div>

      <div className="space-y-1.5">
        {features.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 px-3 py-2.5 text-[12px] text-neutral-500 dark:border-neutral-800 dark:text-neutral-600">
            No features added yet.
          </p>
        )}
        {features.map((f, i) => (
          <div
            key={f.id}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950"
          >
            <input
              value={f.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Feature title, e.g. Sub Brand"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
            <input
              value={f.value}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder="Value"
              className="w-24 shrink-0 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-right text-[12px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
            />
            <button
              onClick={() => update(i, { available: !f.available })}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
                f.available
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {f.available ? "Available" : "Unavailable"}
            </button>
            <button
              onClick={() => remove(i)}
              aria-label="Remove feature"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Entitlements editor — subBrands/franchises are unlimited-or-limited,
 * the rest (vouchers, dealPack, prioritySupport, showcase) are plain
 * enable/disable switches.
 * ---------------------------------------------------------------------- */

function EnableToggle({ label, enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-colors ${
        enabled
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {label}
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
          enabled ? "bg-emerald-400/20" : "bg-neutral-200 dark:bg-neutral-800"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </button>
  );
}

function LimitOrUnlimitedField({ label, entitlement, onChange }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
        <button
          type="button"
          onClick={() => onChange({ ...entitlement, isUnlimited: !entitlement.isUnlimited })}
          aria-pressed={entitlement.isUnlimited}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
            entitlement.isUnlimited
              ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
              : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          }`}
        >
          {entitlement.isUnlimited ? "Unlimited" : "Limited"}
        </button>
      </div>
      {!entitlement.isUnlimited && (
        <input
          type="number"
          min={0}
          value={entitlement.limit}
          onChange={(e) => onChange({ ...entitlement, limit: e.target.value })}
          placeholder="e.g. 5"
          className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600"
        />
      )}
    </div>
  );
}

function EntitlementsEditor({ entitlements, onChange }) {
  const set = (key, value) => onChange({ ...entitlements, [key]: value });

  return (
    <div>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
        Entitlements
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LimitOrUnlimitedField
          label="Sub Brands"
          entitlement={entitlements.subBrands}
          onChange={(next) => set("subBrands", next)}
        />
        <LimitOrUnlimitedField
          label="Franchises"
          entitlement={entitlements.franchises}
          onChange={(next) => set("franchises", next)}
        />
        <EnableToggle
          label="Vouchers"
          enabled={entitlements.vouchers.isEnabled}
          onChange={(v) => set("vouchers", { isEnabled: v })}
        />
        <EnableToggle
          label="Deal Pack"
          enabled={entitlements.dealPack.isEnabled}
          onChange={(v) => set("dealPack", { isEnabled: v })}
        />
        <EnableToggle
          label="Priority Support"
          enabled={entitlements.prioritySupport.isEnabled}
          onChange={(v) => set("prioritySupport", { isEnabled: v })}
        />
        <EnableToggle
          label="Showcase"
          enabled={entitlements.showcase.isEnabled}
          onChange={(v) => set("showcase", { isEnabled: v })}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add / Edit plan modal
 * ---------------------------------------------------------------------- */

function PlanFormModal({ draft, isNew, saving, onChange, onCancel, onSave }) {
  const setField = (field, value) => onChange({ ...draft, [field]: value });

  const canSave = draft.name.trim() && String(draft.price).trim() && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
            {isNew ? "Add Plan" : `Edit Plan · ${draft.name}`}
          </h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan Name">
            <input
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Advanced Plan"
              className={inputClass}
            />
          </Field>
          <Field label="Type">
            <select
              value={draft.type}
              onChange={(e) => setField("type", e.target.value)}
              className={inputClass}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </Field>

          <div className="col-span-2">
            <Field label="Description">
              <input
                value={draft.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="e.g. Premium access"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Price (₹)">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="2999"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </Field>
          <Field label="Strike Price (₹, optional)">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                value={draft.strikePrice}
                onChange={(e) => setField("strikePrice", e.target.value)}
                placeholder="3999"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </Field>

          <Field label="Discount Type">
            <select
              value={draft.discountType}
              onChange={(e) => setField("discountType", e.target.value)}
              className={inputClass}
            >
              <option value="PERCENT">Percent</option>
              <option value="FLAT">Flat</option>
            </select>
          </Field>
          <Field label={draft.discountType === "PERCENT" ? "Discount (%)" : "Discount (₹)"}>
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <Tag size={13} className="text-neutral-500" />
              <input
                type="number"
                min={0}
                value={draft.discountPercent}
                onChange={(e) => setField("discountPercent", e.target.value)}
                placeholder="25"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(e) => setField("status", e.target.value)}
              className={inputClass}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>

        <label className="mt-4 flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={draft.popular}
            onChange={(e) => setField("popular", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 bg-white accent-emerald-400 dark:border-neutral-700 dark:bg-neutral-950"
          />
          Mark as "Most Popular"
        </label>

        {/* Benefits */}
        <div className="mt-6">
          <EditableStringList
            title="Benefits"
            icon={<ThumbsUp size={13} className="text-neutral-600" />}
            items={draft.benefits}
            placeholder="e.g. Unlimited transactions"
            accent="border-emerald-400/60 hover:text-emerald-400"
            onChange={(next) => setField("benefits", next)}
          />
        </div>

        {/* Limitations */}
        <div className="mt-6">
          <EditableStringList
            title="Limitations"
            icon={<ThumbsDown size={13} className="text-neutral-600" />}
            items={draft.limitations}
            placeholder="e.g. No franchise support"
            accent="border-red-400/60 hover:text-red-400"
            onChange={(next) => setField("limitations", next)}
          />
        </div>

        {/* Features */}
        <div className="mt-6">
          <EditableFeatureList
            features={draft.features}
            onChange={(next) => setField("features", next)}
          />
        </div>

        {/* Entitlements */}
        <div className="mt-6">
          <EntitlementsEditor
            entitlements={draft.entitlements}
            onChange={(next) => setField("entitlements", next)}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : isNew ? "Add Plan" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

function DeleteConfirmModal({ plan, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">Delete plan?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{plan.name}" and its column from the comparison table.
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
 * Main page
 * ---------------------------------------------------------------------- */

export default function Plan() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [draft, setDraft] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load plans from the API on mount ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const res = await getPlans();
        const rawList = Array.isArray(res)
          ? res
          : res?.data?.data ?? res?.data?.plans ?? res?.data ?? res?.plans ?? [];
        if (!cancelled) setPlans((Array.isArray(rawList) ? rawList : []).map(normalizePlan));
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = () => {
    setDraft(emptyPlanDraft());
    setIsNew(true);
    setSaveError("");
  };

  const openEdit = (plan) => {
    setDraft({
      ...plan,
      benefits: [...plan.benefits],
      limitations: [...plan.limitations],
      features: plan.features.map((f) => ({ ...f })),
      entitlements: {
        subBrands: { ...plan.entitlements.subBrands },
        franchises: { ...plan.entitlements.franchises },
        vouchers: { ...plan.entitlements.vouchers },
        dealPack: { ...plan.entitlements.dealPack },
        prioritySupport: { ...plan.entitlements.prioritySupport },
        showcase: { ...plan.entitlements.showcase },
      },
    });
    setIsNew(false);
    setSaveError("");
  };

  const closeModal = () => {
    if (saving) return;
    setDraft(null);
  };

  // ── Add / Update plan via API ────────────────────────────────
  const saveDraft = async () => {
    const cleaned = {
      ...draft,
      benefits: draft.benefits.map((b) => b.trim()).filter(Boolean),
      limitations: draft.limitations.map((l) => l.trim()).filter(Boolean),
      features: draft.features.filter((f) => f.title.trim()),
    };

    // The real API doesn't accept `popular`/`status` — it wants `isActive`
    // (boolean) and `durationInDays` instead.
    const apiPayload = {
      name: cleaned.name.trim(),
      description: cleaned.description,
      price: Number(cleaned.price) || 0,
      strikePrice: Number(cleaned.strikePrice) || 0,
      discountType: cleaned.discountType,
      discountPercent: Number(cleaned.discountPercent) || 0,
      type: cleaned.type,
      durationInDays: cleaned.type === "YEARLY" ? 365 : 30,
      isActive: cleaned.status === "Active",
      benefits: cleaned.benefits,
      limitations: cleaned.limitations,
      features: cleaned.features.map((f) => ({
        title: f.title,
        value: f.value,
        available: Boolean(f.available),
      })),
      entitlements: {
        subBrands: cleaned.entitlements.subBrands.isUnlimited
          ? { isUnlimited: true }
          : { isUnlimited: false, limit: Number(cleaned.entitlements.subBrands.limit) || 0 },
        franchises: cleaned.entitlements.franchises.isUnlimited
          ? { isUnlimited: true }
          : { isUnlimited: false, limit: Number(cleaned.entitlements.franchises.limit) || 0 },
        vouchers: { isEnabled: Boolean(cleaned.entitlements.vouchers.isEnabled) },
        dealPack: { isEnabled: Boolean(cleaned.entitlements.dealPack.isEnabled) },
        prioritySupport: { isEnabled: Boolean(cleaned.entitlements.prioritySupport.isEnabled) },
        showcase: { isEnabled: Boolean(cleaned.entitlements.showcase.isEnabled) },
      },
    };

    setSaving(true);
    setSaveError("");
    try {
      if (isNew) {
        const created = await addPlan(apiPayload);
        const newPlan = normalizePlan(created?.plan ?? created?.data ?? created ?? cleaned);
        setPlans((prev) => [...prev, newPlan]);
      } else {
        const updated = await updatePlan(cleaned.id, apiPayload);
        const updatedPlan = normalizePlan(updated?.plan ?? updated?.data ?? updated ?? cleaned);
        setPlans((prev) => prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)));
      }
      setDraft(null);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle feature availability via API (optimistic) ──────────
  const toggleFeature = async (planId, featureId) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              features: p.features.map((f) =>
                f.id === featureId ? { ...f, available: !f.available } : f
              ),
            }
          : p
      )
    );
    try {
      await toggleFeatureAvailability(planId, featureId);
    } catch (err) {
      // revert on failure
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                features: p.features.map((f) =>
                  f.id === featureId ? { ...f, available: !f.available } : f
                ),
              }
            : p
        )
      );
      console.error("Failed to toggle feature:", err.message);
    }
  };

  // ── Edit feature value via API (optimistic) ────────────────────
  const editFeatureValue = async (planId, featureId, value) => {
    let previousValue;
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? {
              ...p,
              features: p.features.map((f) => {
                if (f.id === featureId) {
                  previousValue = f.value;
                  return { ...f, value };
                }
                return f;
              }),
            }
          : p
      )
    );
    try {
      await updateFeatureValue(planId, featureId, value);
    } catch (err) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                features: p.features.map((f) =>
                  f.id === featureId ? { ...f, value: previousValue } : f
                ),
              }
            : p
        )
      );
      console.error("Failed to update feature value:", err.message);
    }
  };

  // ── Delete plan via API ─────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deletePlan(deleteTarget.id);
      setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete plan:", err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Subscription Plans
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Add, edit or remove plans, and manage benefits, limitations and features for each.
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 self-start rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={15} />
            Add Plan
          </button>
        </div>

        {/* Load state */}
        {loading && (
          <div className="mb-8 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading plans…
          </div>
        )}

        {!loading && loadError && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            Failed to load plans: {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <>
            {/* Plan cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} onEdit={openEdit} onDelete={setDeleteTarget} />
              ))}
            </div>

            {/* Feature comparison */}
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
              Feature Comparison
            </p>
            <ComparisonTable
              plans={plans}
              onToggleFeature={toggleFeature}
              onEditFeatureValue={editFeatureValue}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {draft && (
        <PlanFormModal
          draft={draft}
          isNew={isNew}
          saving={saving}
          onChange={setDraft}
          onCancel={closeModal}
          onSave={saveDraft}
        />
      )}
      {draft && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-white px-4 py-2.5 text-[12.5px] text-red-600 shadow-lg dark:bg-neutral-900 dark:text-red-400 dark:shadow-none">
          {saveError}
        </div>
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          plan={deleteTarget}
          deleting={deleting}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}