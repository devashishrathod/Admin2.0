import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  IndianRupee,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Feature matrix definition (rows of the comparison table)
 * type: "boolean" -> check / cross toggle
 * type: "text"    -> free text value per plan (e.g. delivery time, cap)
 * ---------------------------------------------------------------------- */

const INITIAL_FEATURE_LIST = [
  { key: "orderLimit", label: "Monthly Order Limit", type: "text" },
  { key: "deliveryTime", label: "Delivery Priority", type: "text" },
  { key: "freeDelivery", label: "Free Delivery", type: "boolean" },
  { key: "exclusiveDeals", label: "Exclusive Deals & Offers", type: "boolean" },
  { key: "earlyAccess", label: "Early Access To Sales", type: "boolean" },
  { key: "prioritySupport", label: "Priority Customer Support", type: "boolean" },
  { key: "loyaltyPoints", label: "2x Loyalty Points", type: "boolean" },
  { key: "birthdayReward", label: "Birthday Reward", type: "boolean" },
  { key: "returnWindow", label: "Extended Return Window", type: "boolean" },
  { key: "dedicatedManager", label: "Dedicated Relationship Manager", type: "boolean" },
  { key: "conciergeSupport", label: "24x7 Concierge Support", type: "boolean" },
];

/* -------------------------------------------------------------------------
 * Mock data — Prime Lite, Prime Pluse, Prime Elite
 * All prices are base amounts; GST is added on top and shown as a note.
 * ---------------------------------------------------------------------- */

const INITIAL_PLANS = [
  {
    id: 1,
    name: "Prime Lite",
    tagline: "For occasional shoppers",
    price: 465,
    billingCycle: "Yearly",
    status: "Active",
    popular: false,
    features: {
      orderLimit: "10 / mo",
      deliveryTime: "Standard",
      freeDelivery: false,
      exclusiveDeals: true,
      earlyAccess: false,
      prioritySupport: false,
      loyaltyPoints: false,
      birthdayReward: true,
      returnWindow: false,
      dedicatedManager: false,
      conciergeSupport: false,
    },
  },
  {
    id: 2,
    name: "Prime Pluse",
    tagline: "For regular customers who want more",
    price: 930,
    billingCycle: "Yearly",
    status: "Active",
    popular: true,
    features: {
      orderLimit: "30 / mo",
      deliveryTime: "Priority",
      freeDelivery: true,
      exclusiveDeals: true,
      earlyAccess: true,
      prioritySupport: true,
      loyaltyPoints: true,
      birthdayReward: true,
      returnWindow: true,
      dedicatedManager: false,
      conciergeSupport: false,
    },
  },
  {
    id: 3,
    name: "Prime Elite",
    tagline: "For our most valued customers",
    price: 1880,
    billingCycle: "Yearly",
    status: "Active",
    popular: false,
    features: {
      orderLimit: "Unlimited",
      deliveryTime: "Express",
      freeDelivery: true,
      exclusiveDeals: true,
      earlyAccess: true,
      prioritySupport: true,
      loyaltyPoints: true,
      birthdayReward: true,
      returnWindow: true,
      dedicatedManager: true,
      conciergeSupport: true,
    },
  },
];

const emptyFeatureSet = (featureList) =>
  featureList.reduce((acc, f) => {
    acc[f.key] = f.type === "boolean" ? false : "";
    return acc;
  }, {});

const emptyPlanDraft = (featureList) => ({
  id: null,
  name: "",
  tagline: "",
  price: "",
  billingCycle: "Yearly",
  status: "Active",
  popular: false,
  features: emptyFeatureSet(featureList),
});

// Turns a typed label into a safe, unique object key for the new benefit
const slugifyKey = (label) => {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "benefit";
  return `${base}_${Date.now().toString(36)}`;
};

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:border-emerald-400/50 focus:outline-none";

/* -------------------------------------------------------------------------
 * Plan card
 * ---------------------------------------------------------------------- */

function PlanCard({ plan, onEdit, onDelete }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-neutral-900 p-5 ${
        plan.popular ? "border-emerald-400/60" : "border-neutral-800"
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10.5px] font-semibold text-neutral-950">
          <Star size={10} fill="currentColor" />
          Most Popular
        </span>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-neutral-50">{plan.name}</h3>
          <p className="mt-0.5 text-[12px] text-neutral-500">{plan.tagline}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            plan.status === "Active"
              ? "bg-emerald-400/10 text-emerald-400"
              : "bg-neutral-700/40 text-neutral-400"
          }`}
        >
          {plan.status}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-[24px] font-bold text-neutral-50">
          ₹{Number(plan.price).toLocaleString("en-IN")}
        </span>
        <span className="text-[12px] text-neutral-500">/{plan.billingCycle}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-400">
          + GST
        </span>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-neutral-800 pt-4">
        <button
          onClick={() => onEdit(plan)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-800 py-2 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-400"
        >
          <Pencil size={13} />
          Edit
        </button>
        <button
          onClick={() => onDelete(plan)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-800 py-2 text-[12.5px] font-medium text-neutral-300 transition-colors hover:border-red-500/60 hover:text-red-400"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Benefits comparison matrix — click a check/cross to toggle,
 * click a text cell to edit it inline.
 * ---------------------------------------------------------------------- */

function ComparisonTable({ plans, featureList, onToggleFeature, onEditFeatureText, onRemoveBenefit }) {
  const [editingCell, setEditingCell] = useState(null); // `${planId}-${featureKey}`

  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-10 text-center text-[13px] text-neutral-500">
        No plans yet — add a plan to build the comparison table.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-900">
              <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Benefits Of Plan
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className="px-4 py-3.5 text-center text-[12.5px] font-semibold text-neutral-200"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {featureList.map((feature, i) => (
              <tr
                key={feature.key}
                className={`group ${i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/40"}`}
              >
                <td className="px-4 py-3 text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span>{feature.label}</span>
                    {onRemoveBenefit && (
                      <button
                        onClick={() => onRemoveBenefit(feature.key)}
                        aria-label={`Remove ${feature.label} benefit`}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 size={12} className="text-neutral-600 hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
                {plans.map((plan) => {
                  const value = plan.features?.[feature.key];
                  const cellId = `${plan.id}-${feature.key}`;

                  if (feature.type === "boolean") {
                    return (
                      <td key={plan.id} className="px-4 py-3 text-center">
                        <button
                          onClick={() => onToggleFeature(plan.id, feature.key)}
                          aria-label={`Toggle ${feature.label} for ${plan.name}`}
                          className="inline-flex"
                        >
                          {value ? (
                            <Check
                              size={16}
                              className="text-emerald-400 transition-transform hover:scale-110"
                            />
                          ) : (
                            <X
                              size={16}
                              className="text-red-400/80 transition-transform hover:scale-110"
                            />
                          )}
                        </button>
                      </td>
                    );
                  }

                  // text-type cell
                  const isEditing = editingCell === cellId;
                  return (
                    <td key={plan.id} className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={value}
                          onBlur={(e) => {
                            onEditFeatureText(plan.id, feature.key, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-24 rounded-md border border-emerald-400/50 bg-neutral-950 px-2 py-1 text-center text-[12.5px] text-neutral-200 focus:outline-none"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell(cellId)}
                          className="rounded-md px-2 py-1 text-neutral-300 transition-colors hover:bg-neutral-800"
                        >
                          {value || "—"}
                        </button>
                      )}
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
 * Add / Edit plan modal
 * ---------------------------------------------------------------------- */

function PlanFormModal({ draft, isNew, featureList, onChange, onCancel, onSave }) {
  const setField = (field, value) => onChange({ ...draft, [field]: value });
  const setFeature = (key, value) =>
    onChange({ ...draft, features: { ...draft.features, [key]: value } });

  const canSave = draft.name.trim() && String(draft.price).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-50">
            {isNew ? "Add Customer Plan" : `Edit Plan · ${draft.name}`}
          </h2>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
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
              placeholder="e.g. Prime Lite"
              className={inputClass}
            />
          </Field>
          <Field label="Billing Cycle">
            <select
              value={draft.billingCycle}
              onChange={(e) => setField("billingCycle", e.target.value)}
              className={inputClass}
            >
              <option>Monthly</option>
              <option>Yearly</option>
            </select>
          </Field>

          <div className="col-span-2">
            <Field label="Tagline">
              <input
                value={draft.tagline}
                onChange={(e) => setField("tagline", e.target.value)}
                placeholder="Short one-line description"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Price (₹) + GST">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="465"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
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
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-[12.5px] text-neutral-300">
              <input
                type="checkbox"
                checked={draft.popular}
                onChange={(e) => setField("popular", e.target.checked)}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-emerald-400"
              />
              Mark as "Most Popular"
            </label>
          </div>
        </div>

        {/* Benefits */}
        <p className="mb-3 mt-6 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          Benefits Of Plan
        </p>
        <div className="space-y-1.5">
          {featureList.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2"
            >
              <span className="flex items-center gap-2 text-[12.5px] text-neutral-400">
                <Clock size={12} className="text-neutral-600" />
                {feature.label}
              </span>
              {feature.type === "boolean" ? (
                <button
                  onClick={() => setFeature(feature.key, !draft.features[feature.key])}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    draft.features[feature.key]
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {draft.features[feature.key] ? "Included" : "Not Included"}
                </button>
              ) : (
                <input
                  value={draft.features[feature.key]}
                  onChange={(e) => setFeature(feature.key, e.target.value)}
                  placeholder="e.g. 30 / mo, Unlimited"
                  className="w-32 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-right text-[12.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-neutral-800 px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isNew ? "Add Plan" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Delete confirmation modal
 * ---------------------------------------------------------------------- */

function DeleteConfirmModal({ plan, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-50">Delete plan?</h3>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              This removes "{plan.name}" and its column from the comparison table.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="rounded-xl border border-neutral-800 px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add benefit modal — creates a new row in the comparison table (and in
 * every plan's feature set) with either a boolean toggle or free text.
 * ---------------------------------------------------------------------- */

function AddBenefitModal({ onCancel, onSave }) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("boolean");

  const canSave = label.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14.5px] font-semibold text-neutral-50">Add Benefit</h3>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <Field label="Benefit Name">
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Free Gift Wrapping"
            className={inputClass}
          />
        </Field>

        <div className="mt-4">
          <span className="mb-1.5 block text-[12px] font-medium text-neutral-400">
            Value Type
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType("boolean")}
              className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                type === "boolean"
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              Included / Not Included
            </button>
            <button
              onClick={() => setType("text")}
              className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                type === "text"
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-400"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              Custom Text Value
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-4">
          <button
            onClick={onCancel}
            className="rounded-xl border border-neutral-800 px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(label.trim(), type)}
            disabled={!canSave}
            className="rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Benefit
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

export default function CustomerPlan() {
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [featureList, setFeatureList] = useState(INITIAL_FEATURE_LIST);
  const [draft, setDraft] = useState(null); // plan currently being added/edited
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addingBenefit, setAddingBenefit] = useState(false);

  const openAdd = () => {
    setDraft(emptyPlanDraft(featureList));
    setIsNew(true);
  };

  const openEdit = (plan) => {
    // Merge in defaults first so a plan created before a newer benefit
    // existed still has every current key when the modal opens.
    setDraft({
      ...plan,
      features: { ...emptyFeatureSet(featureList), ...plan.features },
    });
    setIsNew(false);
  };

  const closeModal = () => setDraft(null);

  const saveDraft = () => {
    if (isNew) {
      const newPlan = { ...draft, id: Date.now() };
      setPlans((prev) => [...prev, newPlan]);
    } else {
      setPlans((prev) => prev.map((p) => (p.id === draft.id ? { ...draft } : p)));
    }
    setDraft(null);
  };

  const toggleFeature = (planId, key) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, features: { ...p.features, [key]: !p.features[key] } } : p
      )
    );
  };

  const editFeatureText = (planId, key, value) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, features: { ...p.features, [key]: value } } : p
      )
    );
  };

  // Adds a new benefit row: registers it in the feature list, then gives
  // every existing plan a default value for it (false / "").
  const addBenefit = (label, type) => {
    const key = slugifyKey(label);
    setFeatureList((prev) => [...prev, { key, label, type }]);
    setPlans((prev) =>
      prev.map((p) => ({
        ...p,
        features: { ...p.features, [key]: type === "boolean" ? false : "" },
      }))
    );
    setAddingBenefit(false);
  };

  // Removes a benefit row from the table and strips it out of every plan.
  const removeBenefit = (key) => {
    setFeatureList((prev) => prev.filter((f) => f.key !== key));
    setPlans((prev) =>
      prev.map((p) => {
        const { [key]: _omit, ...rest } = p.features;
        return { ...p, features: rest };
      })
    );
  };

  const confirmDelete = () => {
    setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-50">
              Customer Plans
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Add, edit or remove customer membership plans, and manage what each plan includes.
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

        {/* Plan cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>

        {/* Benefits comparison */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            Benefits Of Plan
          </p>
          <button
            onClick={() => setAddingBenefit(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-[12px] font-medium text-neutral-300 transition-colors hover:border-emerald-400/60 hover:text-emerald-400"
          >
            <Plus size={13} />
            Add Benefit
          </button>
        </div>
        <ComparisonTable
          plans={plans}
          featureList={featureList}
          onToggleFeature={toggleFeature}
          onEditFeatureText={editFeatureText}
          onRemoveBenefit={removeBenefit}
        />
      </div>

      {/* Modals */}
      {draft && (
        <PlanFormModal
          draft={draft}
          isNew={isNew}
          featureList={featureList}
          onChange={setDraft}
          onCancel={closeModal}
          onSave={saveDraft}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          plan={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
      {addingBenefit && (
        <AddBenefitModal
          onCancel={() => setAddingBenefit(false)}
          onSave={addBenefit}
        />
      )}
    </div>
  );
}