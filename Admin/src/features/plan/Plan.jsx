import React, { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Star,
  IndianRupee,
  Tag,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * Feature matrix definition (rows of the comparison table)
 * type: "boolean" -> check / cross toggle
 * type: "text"    -> free text value per plan (e.g. outlet count, SLA)
 * ---------------------------------------------------------------------- */

const FEATURE_LIST = [
  { key: "outlets", label: "Outlets Allowed", type: "text" },
  { key: "supportSla", label: "Support Response Time", type: "text" },
  { key: "listings", label: "Product / Service Listings", type: "boolean" },
  { key: "verifiedBadge", label: "Verified Badge", type: "boolean" },
  { key: "analytics", label: "Analytics Dashboard", type: "boolean" },
  { key: "reviews", label: "Customer Reviews", type: "boolean" },
  { key: "settlements", label: "Settlement Reports", type: "boolean" },
  { key: "marketing", label: "Marketing Tools", type: "boolean" },
  { key: "customerChat", label: "Customer Chat", type: "boolean" },
  { key: "prioritySupport", label: "Priority Support", type: "boolean" },
  { key: "customBranding", label: "Custom Branding", type: "boolean" },
  { key: "apiAccess", label: "API Access", type: "boolean" },
  { key: "teamMembers", label: "Team Member Accounts", type: "boolean" },
  { key: "ads", label: "Advertisement Slots", type: "boolean" },
  { key: "advancedReports", label: "Advanced Reports", type: "boolean" },
];

/* -------------------------------------------------------------------------
 * Mock data — Basic, Advanced, Pro, Pro Lite
 * ---------------------------------------------------------------------- */

const INITIAL_PLANS = [
  {
    id: 1,
    name: "Basic",
    tagline: "For brands just getting started",
    price: 1999,
    oldPrice: 2499,
    discountLabel: "20% OFF",
    billingCycle: "Yearly",
    status: "Active",
    popular: false,
    features: {
      outlets: "01",
      supportSla: "48 Hrs",
      listings: true,
      verifiedBadge: false,
      analytics: false,
      reviews: true,
      settlements: true,
      marketing: false,
      customerChat: true,
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
      teamMembers: true,
      ads: false,
      advancedReports: false,
    },
  },
  {
    id: 2,
    name: "Advanced",
    tagline: "For growing multi-outlet brands",
    price: 2999,
    oldPrice: 3999,
    discountLabel: "25% OFF",
    billingCycle: "Yearly",
    status: "Active",
    popular: false,
    features: {
      outlets: "15",
      supportSla: "24 Hrs",
      listings: true,
      verifiedBadge: true,
      analytics: true,
      reviews: true,
      settlements: true,
      marketing: true,
      customerChat: true,
      prioritySupport: false,
      customBranding: true,
      apiAccess: false,
      teamMembers: true,
      ads: true,
      advancedReports: false,
    },
  },
  {
    id: 3,
    name: "Pro",
    tagline: "For established regional chains",
    price: 3999,
    oldPrice: 5499,
    discountLabel: "27% OFF",
    billingCycle: "Yearly",
    status: "Active",
    popular: true,
    features: {
      outlets: "25",
      supportSla: "12 Hrs",
      listings: true,
      verifiedBadge: true,
      analytics: true,
      reviews: true,
      settlements: true,
      marketing: true,
      customerChat: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: false,
      teamMembers: true,
      ads: true,
      advancedReports: true,
    },
  },
  {
    id: 4,
    name: "Pro Lite",
    tagline: "For national brands at scale",
    price: 4999,
    oldPrice: 6999,
    discountLabel: "29% OFF",
    billingCycle: "Yearly",
    status: "Active",
    popular: false,
    features: {
      outlets: "Unlimited",
      supportSla: "Instant",
      listings: true,
      verifiedBadge: true,
      analytics: true,
      reviews: true,
      settlements: true,
      marketing: true,
      customerChat: true,
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
      teamMembers: true,
      ads: true,
      advancedReports: true,
    },
  },
];

const emptyFeatureSet = () =>
  FEATURE_LIST.reduce((acc, f) => {
    acc[f.key] = f.type === "boolean" ? false : "";
    return acc;
  }, {});

const emptyPlanDraft = () => ({
  id: null,
  name: "",
  tagline: "",
  price: "",
  oldPrice: "",
  discountLabel: "",
  billingCycle: "Yearly",
  status: "Active",
  popular: false,
  features: emptyFeatureSet(),
});

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
        {plan.oldPrice && (
          <span className="text-[12.5px] text-neutral-600 line-through">
            ₹{Number(plan.oldPrice).toLocaleString("en-IN")}
          </span>
        )}
        {plan.discountLabel && (
          <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-400">
            {plan.discountLabel}
          </span>
        )}
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
 * click a text cell to edit it inline (quick admin edits without
 * opening the full plan modal).
 * ---------------------------------------------------------------------- */

function ComparisonTable({ plans, onToggleFeature, onEditFeatureText }) {
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
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
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
            {FEATURE_LIST.map((feature, i) => (
              <tr
                key={feature.key}
                className={i % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/40"}
              >
                <td className="px-4 py-3 text-neutral-400">{feature.label}</td>
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
                          className="w-20 rounded-md border border-emerald-400/50 bg-neutral-950 px-2 py-1 text-center text-[12.5px] text-neutral-200 focus:outline-none"
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

function PlanFormModal({ draft, isNew, onChange, onCancel, onSave }) {
  const setField = (field, value) => onChange({ ...draft, [field]: value });
  const setFeature = (key, value) =>
    onChange({ ...draft, features: { ...draft.features, [key]: value } });

  const canSave = draft.name.trim() && String(draft.price).trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-50">
            {isNew ? "Add Plan" : `Edit Plan · ${draft.name}`}
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
              placeholder="e.g. Basic"
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

          <Field label="Price (₹)">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                value={draft.price}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="1999"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </Field>
          <Field label="Old Price (₹, optional)">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                value={draft.oldPrice}
                onChange={(e) => setField("oldPrice", e.target.value)}
                placeholder="2499"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Discount Label">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5">
              <Tag size={13} className="text-neutral-500" />
              <input
                value={draft.discountLabel}
                onChange={(e) => setField("discountLabel", e.target.value)}
                placeholder="20% OFF"
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
        </div>

        <label className="mt-4 flex items-center gap-2 text-[12.5px] text-neutral-300">
          <input
            type="checkbox"
            checked={draft.popular}
            onChange={(e) => setField("popular", e.target.checked)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-emerald-400"
          />
          Mark as "Most Popular"
        </label>

        {/* Benefits */}
        <p className="mb-3 mt-6 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          Benefits Of Plan
        </p>
        <div className="space-y-1.5">
          {FEATURE_LIST.map((feature) => (
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
                  placeholder="e.g. 15, Unlimited, 24 Hrs"
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
 * Main page
 * ---------------------------------------------------------------------- */

export default function Plan() {
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [draft, setDraft] = useState(null); // plan currently being added/edited
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAdd = () => {
    setDraft(emptyPlanDraft());
    setIsNew(true);
  };

  const openEdit = (plan) => {
    setDraft({ ...plan, features: { ...plan.features } });
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
              Subscription Plans
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Add, edit or remove plans, and manage what each plan includes.
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
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
          Benefits Of Plan
        </p>
        <ComparisonTable
          plans={plans}
          onToggleFeature={toggleFeature}
          onEditFeatureText={editFeatureText}
        />
      </div>

      {/* Modals */}
      {draft && (
        <PlanFormModal
          draft={draft}
          isNew={isNew}
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
    </div>
  );
}