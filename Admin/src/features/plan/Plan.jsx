import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  IndianRupee,
  Tag,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ListChecks,
  Loader2,
  Eye,
  Users,
  ImagePlus,
  Layers,
  Gift,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LabelList } from "recharts";
import PlanDetails from "./PlanDetails";
import FeatureMaster, {
  FEATURE_KINDS,
  FeatureValueInput,
  extractFeatures,
  serializeFeatureValue,
} from "./FeatureMaster";
import PlanCompare from "./PlanCompare";
import ToggleSwitch from "../../components/common/ToggleSwitch";
import { ApplyTermsModal, ENTITLEMENT_LABELS, ImpactConfirmModal } from "./PlanModals";
import {
  getPlans,
  addPlan,
  updatePlan,
  deletePlan,
  getPlanFeatures,
  uploadPlanImage,
  removePlanImage,
} from "../plan/services/planApi";

/* -------------------------------------------------------------------------
 * Data shape (subscription redesign, Phases 1–8)
 *
 * {
 *   id, name, description, image,
 *   tier: 1–100 — upgrade / downgrade is measured by it,
 *   durationValue, durationUnit: "DAY" | "MONTH" | "YEAR", durationLabel,
 *   type / typeLabel — derived by the server (WEEKLY … YEARLY, CUSTOM),
 *   price, discountType: "PERCENT" | "FLAT", discountPercent, discountAmount,
 *   discountedPrice — derived by the server,
 *   isTrial, status: "Active" | "Inactive",
 *   popular: boolean,               // UI-only, not persisted by the API
 *   benefits, limitations,          // legacy free text
 *   entitlements: { subBrands, franchises, vouchers, showcase: { isUnlimited, limit },
 *                   dealPack, prioritySupport: { isEnabled } },
 *   featureValues: [{ key, value }] // feature master values
 * }
 * ---------------------------------------------------------------------- */

const uid = () => Math.random().toString(36).slice(2, 10);

// Plan length units + per-unit max (the platform cap maxPlanDurationMonths,
// default 180, is checked by the server on top).
const DURATION_UNITS = Object.freeze({
  DAY: { label: "Days", max: 365 },
  MONTH: { label: "Months", max: 180 },
  YEAR: { label: "Years", max: 15 },
});

// `type` is derived by the server from the duration — only read for charts.
const PLAN_TYPES = Object.freeze({
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  HALF_YEARLY: "HALF_YEARLY",
  YEARLY: "YEARLY",
  CUSTOM: "CUSTOM",
});

const PLAN_TYPE_LABELS = {
  [PLAN_TYPES.WEEKLY]: "Weekly",
  [PLAN_TYPES.MONTHLY]: "Monthly",
  [PLAN_TYPES.QUARTERLY]: "Quarterly",
  [PLAN_TYPES.HALF_YEARLY]: "Half-Yearly",
  [PLAN_TYPES.YEARLY]: "Yearly",
  [PLAN_TYPES.CUSTOM]: "Custom",
};

// Legacy plans (before durationValue/durationUnit) — read their length from type.
const LEGACY_TYPE_DURATION = {
  WEEKLY: { durationValue: 7, durationUnit: "DAY" },
  MONTHLY: { durationValue: 1, durationUnit: "MONTH" },
  QUARTERLY: { durationValue: 3, durationUnit: "MONTH" },
  HALF_YEARLY: { durationValue: 6, durationUnit: "MONTH" },
  YEARLY: { durationValue: 1, durationUnit: "YEAR" },
};

// Standard lengths → the legacy `type` enum (spelled the old backend's way,
// "QUATERLY") and its durationInDays. Other lengths have no legacy type.
function legacyTypeFor(value, unit) {
  const v = Number(value);
  if (unit === "DAY" && v === 7) return { type: "WEEKLY", days: 7 };
  if (unit === "MONTH" && v === 1) return { type: "MONTHLY", days: 30 };
  if (unit === "MONTH" && v === 3) return { type: "QUATERLY", days: 90 };
  if (unit === "MONTH" && v === 6) return { type: "HALF_YEARLY", days: 182 };
  if ((unit === "MONTH" && v === 12) || (unit === "YEAR" && v === 1)) return { type: "YEARLY", days: 365 };
  return null;
}

// Billing Type dropdown in the plan form → the duration it stands for.
const BILLING_TYPE_PRESETS = {
  [PLAN_TYPES.WEEKLY]: { durationValue: 7, durationUnit: "DAY" },
  [PLAN_TYPES.MONTHLY]: { durationValue: 1, durationUnit: "MONTH" },
  [PLAN_TYPES.QUARTERLY]: { durationValue: 3, durationUnit: "MONTH" },
  [PLAN_TYPES.HALF_YEARLY]: { durationValue: 6, durationUnit: "MONTH" },
  [PLAN_TYPES.YEARLY]: { durationValue: 1, durationUnit: "YEAR" },
};

// Fixed, non-cycled categorical order for the billing-mix chart below.
const PLAN_TYPE_CHART_COLORS = {
  [PLAN_TYPES.WEEKLY]: "#2a78d6",
  [PLAN_TYPES.MONTHLY]: "#38bdf8",
  [PLAN_TYPES.QUARTERLY]: "#eda100",
  [PLAN_TYPES.HALF_YEARLY]: "#e87ba4",
  [PLAN_TYPES.YEARLY]: "#34d399",
  [PLAN_TYPES.CUSTOM]: "#a78bfa",
};

const ENTITLEMENT_KEYS = ["subBrands", "franchises", "vouchers", "showcase", "dealPack", "prioritySupport"];
const LIMIT_KEYS = ["subBrands", "franchises", "vouchers", "showcase"];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const emptyEntitlements = () => ({
  subBrands: { isUnlimited: false, limit: 0 },
  franchises: { isUnlimited: false, limit: 0 },
  vouchers: { isUnlimited: false, limit: 0 },
  dealPack: { isEnabled: false },
  prioritySupport: { isEnabled: false },
  showcase: { isUnlimited: false, limit: 0 },
});

const emptyPlanDraft = () => ({
  id: null,
  name: "",
  description: "",
  image: null,
  tier: "",
  durationValue: 1,
  durationUnit: "MONTH",
  price: "",
  discountType: "PERCENT",
  discountValue: "",
  isTrial: false,
  status: "Active",
  popular: false,
  benefits: [],
  limitations: [],
  entitlements: emptyEntitlements(),
  displayValues: {},
  imageFile: null,
  removeImage: false,
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
    vouchers: raw?.vouchers ? normalizeEntitlementLimit(raw.vouchers) : defaults.vouchers,
    dealPack: { isEnabled: Boolean(raw?.dealPack?.isEnabled) },
    prioritySupport: { isEnabled: Boolean(raw?.prioritySupport?.isEnabled) },
    showcase: raw?.showcase ? normalizeEntitlementLimit(raw.showcase) : defaults.showcase,
  };
}

function durationLabelOf(value, unit) {
  if (!value || !unit) return "";
  const word = { DAY: "day", MONTH: "month", YEAR: "year" }[unit] || unit.toLowerCase();
  return `${value} ${word}${Number(value) === 1 ? "" : "s"}`;
}

export function normalizePlan(raw) {
  const type = raw?.type === "QUATERLY" ? "QUARTERLY" : raw?.type ?? null;
  const legacyDuration = LEGACY_TYPE_DURATION[type] ?? {};
  const durationValue = raw?.durationValue ?? legacyDuration.durationValue ?? null;
  const durationUnit = raw?.durationUnit ?? legacyDuration.durationUnit ?? null;
  const discountType = raw?.discountType ?? "PERCENT";
  return {
    id: raw?._id ?? raw?.id ?? uid(),
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    image: raw?.image ?? null,
    tier: raw?.tier ?? null,
    type,
    typeLabel: raw?.typeLabel ?? PLAN_TYPE_LABELS[type] ?? "",
    durationValue,
    durationUnit,
    durationLabel: raw?.durationLabel ?? durationLabelOf(durationValue, durationUnit),
    price: raw?.price ?? 0,
    discountType,
    discountPercent: raw?.discountPercent ?? 0,
    // Older plans stored a FLAT discount's rupees in discountPercent.
    discountAmount: raw?.discountAmount ?? (discountType === "FLAT" ? raw?.discountPercent ?? 0 : 0),
    discountedPrice: raw?.discountedPrice ?? null,
    isTrial: Boolean(raw?.isTrial),
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
    featureValues: Array.isArray(raw?.featureValues)
      ? raw.featureValues.filter((fv) => fv?.key).map((fv) => ({ key: fv.key, value: fv.value ?? null, label: fv.label }))
      : [],
  };
}

// Plan length in months — only used to order plans that share a tier.
function durationInMonths(plan) {
  const v = Number(plan.durationValue) || 0;
  if (plan.durationUnit === "DAY") return v / 30;
  if (plan.durationUnit === "YEAR") return v * 12;
  return v;
}

function serializeEntitlements(ent) {
  const out = {};
  LIMIT_KEYS.forEach((k) => {
    out[k] = ent[k].isUnlimited
      ? { limit: 0, isUnlimited: true }
      : { limit: Number(ent[k].limit) || 0, isUnlimited: false };
  });
  out.dealPack = { isEnabled: Boolean(ent.dealPack.isEnabled) };
  out.prioritySupport = { isEnabled: Boolean(ent.prioritySupport.isEnabled) };
  return out;
}

/* -------------------------------------------------------------------------
 * Small shared bits
 * ---------------------------------------------------------------------- */

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] normal-case text-neutral-400 dark:text-neutral-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

/* Small colored-dot legend under a donut chart — so a mix with only one
 * populated segment still reads as "N Active, 0 Inactive" instead of a
 * plain, unlabeled ring. */
function MixLegend({ items }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.name} className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          {item.name} · {item.value}
        </span>
      ))}
    </div>
  );
}

function Tabs({ tab, onChange }) {
  const items = [
    { id: "plans", label: "Plans" },
    { id: "features", label: "Feature Master" },
    { id: "compare", label: "Compare" },
  ];
  return (
    <div className="mb-6 inline-flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            tab === t.id
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Plan card
 * ---------------------------------------------------------------------- */

// One plan feature as shown on the card — "Outlets · 3", "Deal Pack · ✓".
function featureChipText(value, unit) {
  if (value == null) return "—";
  if ("isUnlimited" in value || "limit" in value) return value.isUnlimited ? "Unlimited" : String(value.limit ?? 0);
  if ("isEnabled" in value) return value.isEnabled ? "Yes" : "No";
  if ("number" in value) return `${value.number}${unit ? ` ${unit}` : ""}`;
  if ("text" in value) return value.text || "—";
  return "—";
}

// The plan's featureValues (what the backend returns), falling back to
// entitlements for older plans — in feature-master order.
function planFeatureList(plan, featureMeta) {
  const list = plan.featureValues.length
    ? plan.featureValues
    : ENTITLEMENT_KEYS.map((key) => ({ key, value: plan.entitlements[key] }));
  return list
    .filter((fv) => fv.value != null)
    .map((fv) => {
      const meta = featureMeta[fv.key];
      return {
        key: fv.key,
        label: meta?.label ?? fv.label ?? ENTITLEMENT_LABELS[fv.key] ?? fv.key,
        text: featureChipText(fv.value, meta?.unit),
        off: fv.value.isEnabled === false || (!fv.value.isUnlimited && "limit" in fv.value && !Number(fv.value.limit)),
        order: meta?.sortOrder ?? ENTITLEMENT_KEYS.indexOf(fv.key),
      };
    })
    .sort((a, b) => a.order - b.order);
}

function PlanCard({ plan, featureMeta, onView, onEdit, onDelete, onApplyTerms }) {
  const featureList = planFeatureList(plan, featureMeta);
  const discounted = plan.discountedPrice != null ? Number(plan.discountedPrice) : null;
  const hasDiscount = discounted != null && discounted < Number(plan.price || 0);
  const discountLabel =
    plan.discountType === "PERCENT"
      ? Number(plan.discountPercent) > 0 && `${Math.round(Number(plan.discountPercent))}% OFF`
      : Number(plan.discountAmount) > 0 && `₹${Number(plan.discountAmount).toLocaleString("en-IN")} OFF`;

  return (
    <div
      className={`relative flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20 ${
        plan.popular ? "ring-1 ring-emerald-400/60" : ""
      }`}
    >
      {plan.popular && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10.5px] font-semibold text-neutral-950">
          <Star size={10} fill="currentColor" />
          Most Popular
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {plan.image ? (
            <img src={plan.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <Layers size={16} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">{plan.name}</h3>
            <p className="mt-0.5 truncate text-[12px] text-neutral-500">{plan.description || "No description"}</p>
          </div>
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

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${
            plan.tier != null
              ? "bg-violet-400/10 text-violet-600 dark:text-violet-400"
              : "bg-amber-400/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          {plan.tier != null ? `Tier ${plan.tier}` : "No tier"}
        </span>
        {plan.durationLabel && (
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {plan.durationLabel}
          </span>
        )}
        {plan.isTrial && (
          <span className="flex items-center gap-1 rounded-md bg-sky-400/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-sky-600 dark:text-sky-400">
            <Gift size={10} />
            Free trial
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[24px] font-bold text-neutral-900 dark:text-neutral-50">
          ₹{Number(hasDiscount ? discounted : plan.price || 0).toLocaleString("en-IN")}
        </span>
        {plan.typeLabel && <span className="text-[12px] text-neutral-500">/ {plan.typeLabel}</span>}
      </div>
      {(hasDiscount || discountLabel) && (
        <div className="mt-1 flex items-center gap-2">
          {hasDiscount && (
            <span className="rounded-md bg-neutral-200 px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-500 line-through dark:bg-neutral-800 dark:text-neutral-400">
              ₹{Number(plan.price).toLocaleString("en-IN")}
            </span>
          )}
          {discountLabel && (
            <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
              {discountLabel}
            </span>
          )}
        </div>
      )}

      {featureList.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {featureList.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 dark:bg-neutral-950/60"
            >
              <span className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">{f.label}</span>
              <span
                className={`shrink-0 text-[11.5px] font-semibold ${
                  f.off ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {f.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {(plan.benefits.length > 0 || plan.limitations.length > 0) && (
        <div className="mt-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-950/60">
          {plan.benefits.slice(0, 2).map((b, i) => (
            <p key={i} className="flex items-start gap-1.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
              <ThumbsUp size={11} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              {b}
            </p>
          ))}
          {plan.limitations.slice(0, 1).map((l, i) => (
            <p key={i} className="mt-1 flex items-start gap-1.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
              <ThumbsDown size={11} className="mt-0.5 shrink-0 text-red-600/70 dark:text-red-400/70" />
              {l}
            </p>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(plan)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-sky-400/60 hover:text-sky-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-sky-400"
          >
            <Eye size={13} />
            View
          </button>
          <button
            onClick={() => onEdit(plan)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400"
          >
            <Pencil size={13} />
            Edit
          </button>
          <button
            onClick={() => onDelete(plan)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-red-500/60 hover:text-red-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-red-400"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
        <button
          onClick={() => onApplyTerms(plan)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-sky-400/10 hover:text-sky-600 dark:hover:text-sky-400"
        >
          <Users size={13} />
          Apply limits to current subscribers
        </button>
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
 * Plan features — what the backend returns in the plan's `featureValues`.
 *  - System rows (subBrands … prioritySupport) are the enforced limits:
 *    LIMIT ({ limit, isUnlimited }) / FLAG ({ isEnabled }), edited through
 *    `entitlements` (the server keeps the matching featureValues in sync).
 *  - Display rows are any other key the plan has a value for, edited in
 *    place and sent back as `featureValues`.
 * ---------------------------------------------------------------------- */

// Kind of a display value the master didn't describe — read off its shape.
function inferFeatureKind(value) {
  if (value && typeof value === "object") {
    if ("limit" in value || "isUnlimited" in value) return FEATURE_KINDS.LIMIT;
    if ("number" in value) return FEATURE_KINDS.DISPLAY_NUMBER;
    if ("text" in value) return FEATURE_KINDS.DISPLAY_TEXT;
    if ("isEnabled" in value) return FEATURE_KINDS.DISPLAY_BOOLEAN;
  }
  return FEATURE_KINDS.DISPLAY_TEXT;
}

function FeatureRow({ label, badge, children }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">{label}</p>
        <p className="text-[10.5px] text-neutral-400">{badge}</p>
      </div>
      <div className="w-44 shrink-0">{children}</div>
    </div>
  );
}

function PlanFeaturesEditor({ entitlements, displayRows, displayValues, labels, onEntitlementsChange, onDisplayChange }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
        <ListChecks size={13} className="text-neutral-600" />
        Plan Features
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ENTITLEMENT_KEYS.map((key) => {
          const isLimit = LIMIT_KEYS.includes(key);
          return (
            <FeatureRow key={key} label={labels[key] || ENTITLEMENT_LABELS[key]} badge={isLimit ? "Limit · enforced" : "Flag · enforced"}>
              <FeatureValueInput
                kind={isLimit ? FEATURE_KINDS.LIMIT : FEATURE_KINDS.FLAG}
                value={entitlements[key]}
                onChange={(v) => onEntitlementsChange({ ...entitlements, [key]: v })}
              />
            </FeatureRow>
          );
        })}
        {displayRows.map((row) => (
          <FeatureRow key={row.key} label={row.label} badge={row.group ? `Display · ${row.group}` : "Display"}>
            <FeatureValueInput
              kind={row.kind}
              unit={row.unit}
              value={displayValues[row.key]}
              onChange={(v) => onDisplayChange({ ...displayValues, [row.key]: v })}
            />
          </FeatureRow>
        ))}
      </div>
    </div>
  );
}

function ImagePicker({ draft, onChange, onError }) {
  const preview = useMemo(() => (draft.imageFile ? URL.createObjectURL(draft.imageFile) : null), [draft.imageFile]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);
  const current = preview || (!draft.removeImage ? draft.image : null);

  const pick = (file) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return onError("Plan image must be JPEG, PNG, WEBP or GIF.");
    if (file.size > IMAGE_MAX_BYTES) return onError("Plan image must be 10 MB or smaller.");
    onError("");
    onChange({ ...draft, imageFile: file, removeImage: false });
  };

  return (
    <div className="flex items-center gap-3">
      {current ? (
        <img src={current} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-neutral-400 dark:border-neutral-700">
          <ImagePlus size={18} />
        </span>
      )}
      <label className="cursor-pointer rounded-xl border border-neutral-200 px-3 py-2 text-[12.5px] font-medium text-neutral-700 transition-colors hover:border-emerald-400/60 hover:text-emerald-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-emerald-400">
        {current ? "Change image" : "Upload image"}
        <input
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {current && (
        <button
          onClick={() => onChange({ ...draft, imageFile: null, removeImage: Boolean(draft.image) })}
          className="rounded-xl px-3 py-2 text-[12.5px] font-medium text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          Remove
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Add / Edit plan modal
 * ---------------------------------------------------------------------- */

// Client-side mirror of the server's #71 rules — first problem wins.
function validateDraft(draft, isNew) {
  const tier = Number(draft.tier);
  if (draft.name.trim().length < 3) return "Plan name needs at least 3 characters.";
  if ((isNew || draft.tier !== "") && (!Number.isInteger(tier) || tier < 1 || tier > 100))
    return "Tier must be a whole number from 1 to 100.";
  const unit = DURATION_UNITS[draft.durationUnit];
  const dv = Number(draft.durationValue);
  if (!unit || !Number.isInteger(dv) || dv < 1 || dv > unit.max)
    return `Duration must be 1–${unit?.max ?? "?"} ${unit?.label.toLowerCase() ?? ""}.`;
  if (!draft.isTrial && (draft.price === "" || Number(draft.price) < 0)) return "Price must be 0 or more.";
  const disc = Number(draft.discountValue) || 0;
  if (draft.discountType === "PERCENT" && (disc < 0 || disc > 100)) return "Discount must be 0–100%.";
  if (draft.discountType === "FLAT" && disc > (Number(draft.price) || 0))
    return "Flat discount cannot be more than the price.";
  return "";
}

function PlanFormModal({ draft, isNew, saving, entitlementLabels, displayRows, onChange, onCancel, onSave }) {
  const [imageError, setImageError] = useState("");
  const setField = (field, value) => onChange({ ...draft, [field]: value });
  const problem = validateDraft(draft, isNew);
  // Derived from the duration, so the two never disagree.
  const billingType = legacyTypeFor(draft.durationValue, draft.durationUnit)?.type.replace("QUATERLY", "QUARTERLY") ?? "CUSTOM";
  const canSave = !problem && !saving;

  const price = draft.isTrial ? 0 : Number(draft.price) || 0;
  const disc = Number(draft.discountValue) || 0;
  const estimate = Math.max(0, draft.discountType === "PERCENT" ? price - (price * disc) / 100 : price - disc);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
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

        {!isNew && (
          <p className="mb-4 rounded-xl bg-sky-400/5 px-3 py-2.5 text-[12px] text-sky-700 dark:text-sky-400">
            Changes to duration, price, tier and limits only apply to new purchases. Running subscribers keep
            their frozen terms unless you apply the new limits to them after saving.
          </p>
        )}

        {/* Image */}
        <div className="mb-5">
          <ImagePicker draft={draft} onChange={onChange} onError={setImageError} />
          {imageError && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{imageError}</p>}
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <Field label="Plan Name">
            <input
              value={draft.name}
              maxLength={120}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Advanced Plan"
              className={inputClass}
            />
          </Field>
          <Field label={isNew ? "Tier (required)" : "Tier"} hint="Basic 1, Pro 2, … — upgrade / downgrade is decided by this.">
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={draft.tier}
              onChange={(e) => setField("tier", e.target.value)}
              placeholder="e.g. 2"
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description">
              <input
                value={draft.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="e.g. Premium access"
                className={inputClass}
              />
            </Field>
          </div>

          <Field
            label="Billing Type"
            hint={
              billingType === "CUSTOM"
                ? "Custom length — only works once the redesigned backend is live."
                : "Picks the duration for you."
            }
          >
            <select
              value={billingType}
              onChange={(e) => {
                const preset = BILLING_TYPE_PRESETS[e.target.value];
                if (preset) onChange({ ...draft, ...preset });
                else if (billingType !== "CUSTOM") onChange({ ...draft, durationValue: 2, durationUnit: "YEAR" });
              }}
              className={inputClass}
            >
              {Object.keys(BILLING_TYPE_PRESETS).map((t) => (
                <option key={t} value={t}>
                  {PLAN_TYPE_LABELS[t]}
                </option>
              ))}
              <option value="CUSTOM">Custom</option>
            </select>
          </Field>

          <Field label="Duration" hint={`Max ${DURATION_UNITS[draft.durationUnit]?.max} ${DURATION_UNITS[draft.durationUnit]?.label.toLowerCase()}`}>
            <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 focus-within:border-emerald-400/50 dark:border-neutral-800 dark:bg-neutral-950">
              <input
                type="number"
                min={1}
                max={DURATION_UNITS[draft.durationUnit]?.max}
                step={1}
                value={draft.durationValue}
                onChange={(e) => setField("durationValue", e.target.value)}
                placeholder="1"
                className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
              <select
                value={draft.durationUnit}
                onChange={(e) => setField("durationUnit", e.target.value)}
                className="w-28 shrink-0 border-l border-neutral-200 bg-transparent px-3 py-2.5 text-[13px] text-neutral-700 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
              >
                {Object.entries(DURATION_UNITS).map(([unit, meta]) => (
                  <option key={unit} value={unit}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Status">
              <select value={draft.status} onChange={(e) => setField("status", e.target.value)} className={inputClass}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>

          <div className="sm:col-span-2">
            <div
              className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                draft.isTrial
                  ? "border-sky-400/50 bg-sky-400/5"
                  : "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-600 dark:text-sky-400">
                  <Gift size={15} />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200">Free trial</p>
                  <p className="text-[11.5px] normal-case text-neutral-500">
                    Price is locked to ₹0. Each brand can take a trial only once.
                  </p>
                </div>
              </div>
              <ToggleSwitch
                checked={draft.isTrial}
                onChange={() =>
                  onChange({
                    ...draft,
                    isTrial: !draft.isTrial,
                    ...(!draft.isTrial ? { price: 0, discountValue: "" } : {}),
                  })
                }
              />
            </div>
          </div>

          <Field label="Price (₹)">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 dark:border-neutral-800 dark:bg-neutral-950">
              <IndianRupee size={13} className="text-neutral-500" />
              <input
                type="number"
                min={0}
                value={draft.isTrial ? 0 : draft.price}
                disabled={draft.isTrial}
                onChange={(e) => setField("price", e.target.value)}
                placeholder="2999"
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50 dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
          </Field>
          <Field label="Vendor pays (before GST)">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-3.5 py-2.5">
              <IndianRupee size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[13.5px] font-semibold text-emerald-700 dark:text-emerald-400">
                {estimate.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </span>
              <span className="ml-auto text-[10.5px] normal-case text-neutral-400">auto-calculated</span>
            </div>
          </Field>

          <Field label="Discount Type">
            <select
              value={draft.discountType}
              disabled={draft.isTrial}
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
                max={draft.discountType === "PERCENT" ? 100 : undefined}
                value={draft.discountValue}
                disabled={draft.isTrial}
                onChange={(e) => setField("discountValue", e.target.value)}
                placeholder={draft.discountType === "PERCENT" ? "25" : "500"}
                className="w-full bg-transparent py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50 dark:text-neutral-200 dark:placeholder:text-neutral-600"
              />
            </div>
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

        {/* Plan features (featureValues from the backend) */}
        <div className="mt-6">
          <PlanFeaturesEditor
            entitlements={draft.entitlements}
            displayRows={displayRows}
            displayValues={draft.displayValues}
            labels={entitlementLabels}
            onEntitlementsChange={(next) => setField("entitlements", next)}
            onDisplayChange={(next) => setField("displayValues", next)}
          />
        </div>

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

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          {problem && <p className="mr-auto text-[11.5px] text-amber-700 dark:text-amber-400">{problem}</p>}
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave()}
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

/* After an edit that changed limits — offer to push them to running subscribers. */
function ApplyPromptModal({ plan, onLater, onReview }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10 text-sky-600 dark:text-sky-400">
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              Apply to current subscribers too?
            </h3>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              "{plan.name}" limits changed. They reach new purchases only — review who else would get them.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onLater}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Not now
          </button>
          <button
            onClick={onReview}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-400"
          >
            Review impact
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page
 * ---------------------------------------------------------------------- */

function extractPlan(res) {
  const raw = res?.data?.plan ?? res?.plan ?? res?.data ?? res;
  return raw && (raw.name || raw.entitlements || raw._id || raw.id) ? raw : null;
}

export default function Plan() {
  const [tab, setTab] = useState("plans");

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [features, setFeatures] = useState([]);

  const [draft, setDraft] = useState(null);
  const [draftOrigin, setDraftOrigin] = useState(null); // plan as it was when the edit opened
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deactivateState, setDeactivateState] = useState(null); // { impact, confirmToken, message }

  const [deleteState, setDeleteState] = useState(null); // { plan, impact?, confirmToken?, message? }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [applyPrompt, setApplyPrompt] = useState(null);
  const [applyTarget, setApplyTarget] = useState(null);

  const [viewingPlanId, setViewingPlanId] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      const res = await getPlans();
      const rawList = Array.isArray(res) ? res : res?.data?.data ?? res?.data?.plans ?? res?.data ?? res?.plans ?? [];
      setPlans((Array.isArray(rawList) ? rawList : []).map(normalizePlan));
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only needed for the renamed system labels — on failure the defaults stay.
  const loadFeatures = useCallback(async () => {
    try {
      setFeatures(extractFeatures(await getPlanFeatures()));
    } catch {
      /* keep ENTITLEMENT_LABELS */
    }
  }, []);

  useEffect(() => {
    loadPlans();
    loadFeatures();
  }, [loadPlans, loadFeatures]);

  // System feature labels (admin may rename "Sub Brands" → "Outlets").
  const entitlementLabels = useMemo(() => {
    const out = { ...ENTITLEMENT_LABELS };
    features.forEach((f) => {
      if (f.isSystem && f.label) out[f.key] = f.label;
    });
    return out;
  }, [features]);

  // Feature master by key — labels (incl. renamed system ones), unit, order.
  const featureMeta = useMemo(() => {
    const out = {};
    features.forEach((f) => {
      out[f.key] = f;
    });
    return out;
  }, [features]);

  // Display (non-system) features the plan being edited has a value for —
  // label / kind / unit from the feature master, else read off the value.
  const displayRows = useMemo(() => {
    const rows = (draftOrigin?.featureValues ?? [])
      .filter((fv) => !ENTITLEMENT_KEYS.includes(fv.key))
      .map((fv) => {
        const master = features.find((f) => f.key === fv.key);
        return {
          key: fv.key,
          label: master?.label ?? fv.label ?? fv.key,
          kind: master?.kind ?? inferFeatureKind(fv.value),
          unit: master?.unit ?? "",
          group: master?.group ?? "",
          sortOrder: master?.sortOrder ?? Infinity,
        };
      });
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [draftOrigin, features]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (a.tier ?? Infinity) - (b.tier ?? Infinity) ||
          durationInMonths(a) - durationInMonths(b) ||
          Number(a.price) - Number(b.price)
      ),
    [plans]
  );

  const openAdd = () => {
    setDraft(emptyPlanDraft());
    setDraftOrigin(null);
    setIsNew(true);
    setSaveError("");
  };

  const openEdit = (plan) => {
    // featureValues is what the backend now returns per plan — its system
    // keys win over `entitlements`, the rest are the display values.
    const entitlements = JSON.parse(JSON.stringify(plan.entitlements));
    const displayValues = {};
    plan.featureValues.forEach((fv) => {
      if (fv.value == null) return;
      if (ENTITLEMENT_KEYS.includes(fv.key)) {
        entitlements[fv.key] = LIMIT_KEYS.includes(fv.key)
          ? { isUnlimited: Boolean(fv.value.isUnlimited), limit: fv.value.limit ?? 0 }
          : { isEnabled: Boolean(fv.value.isEnabled) };
      } else {
        displayValues[fv.key] = fv.value;
      }
    });
    setDraft({
      ...emptyPlanDraft(),
      id: plan.id,
      name: plan.name,
      description: plan.description,
      image: plan.image,
      tier: plan.tier ?? "",
      durationValue: plan.durationValue ?? 1,
      durationUnit: plan.durationUnit ?? "MONTH",
      price: plan.price,
      discountType: plan.discountType,
      discountValue: plan.discountType === "FLAT" ? plan.discountAmount || "" : plan.discountPercent || "",
      discountedPrice: plan.discountedPrice,
      isTrial: plan.isTrial,
      status: plan.status,
      popular: plan.popular,
      benefits: [...plan.benefits],
      limitations: [...plan.limitations],
      entitlements,
      displayValues,
    });
    setDraftOrigin(plan);
    setIsNew(false);
    setSaveError("");
  };

  const closeModal = () => {
    if (saving) return;
    setDraft(null);
    setDeactivateState(null);
  };

  const buildPayload = () => {
    const disc = Number(draft.discountValue) || 0;
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      durationValue: Number(draft.durationValue),
      durationUnit: draft.durationUnit,
      price: draft.isTrial ? 0 : Number(draft.price) || 0,
      discountType: draft.discountType,
      discountPercent: draft.isTrial || draft.discountType !== "PERCENT" ? 0 : disc,
      discountAmount: draft.isTrial || draft.discountType !== "FLAT" ? 0 : disc,
      isTrial: draft.isTrial,
      isActive: draft.status === "Active",
      benefits: draft.benefits.map((b) => b.trim()).filter(Boolean),
      limitations: draft.limitations.map((l) => l.trim()).filter(Boolean),
      entitlements: serializeEntitlements(draft.entitlements),
    };
    if (draft.tier !== "") payload.tier = Number(draft.tier);

    // Display feature values the admin changed in the form (system ones go
    // through `entitlements` above).
    const featureValues = displayRows
      .map((row) => {
        const before = draftOrigin?.featureValues.find((fv) => fv.key === row.key)?.value ?? null;
        const next = serializeFeatureValue(row.kind, draft.displayValues[row.key]);
        return JSON.stringify(next) !== JSON.stringify(before) ? { key: row.key, value: next } : null;
      })
      .filter(Boolean);
    if (featureValues.length) payload.featureValues = featureValues;

    // Backends before the redesign still require `type` (+ durationInDays).
    // The new one ignores `type` when a duration is sent and strips
    // durationInDays, so sending both is safe on either.
    const legacy = legacyTypeFor(payload.durationValue, payload.durationUnit);
    if (legacy) {
      payload.type = legacy.type;
      payload.durationInDays = legacy.days;
    }
    return payload;
  };

  // Image changes go through their own endpoint (#75a / #75b) once the plan exists.
  const syncImage = async (planId) => {
    if (draft.imageFile) {
      const res = await uploadPlanImage(planId, draft.imageFile);
      return res?.data?.image ?? null;
    }
    if (draft.removeImage) {
      await removePlanImage(planId);
      return null;
    }
    return undefined;
  };

  // ── Add / Update plan via API ────────────────────────────────
  const saveDraft = async (confirmToken) => {
    const payload = buildPayload();
    if (confirmToken) payload.confirmToken = confirmToken;

    setSaving(true);
    setSaveError("");
    let savedPlan;
    try {
      if (isNew) {
        const created = await addPlan(payload);
        savedPlan = normalizePlan(extractPlan(created) ?? payload);
      } else {
        const updated = await updatePlan(draft.id, payload);
        savedPlan = normalizePlan(extractPlan(updated) ?? { _id: draft.id, ...payload });
      }
    } catch (err) {
      setSaving(false);
      // Deactivating a plan in use → 409 + confirmToken; confirm and resend.
      if (err.status === 409 && err.details?.confirmToken) {
        setDeactivateState({ impact: err.details.impact, confirmToken: err.details.confirmToken, message: err.message });
      } else {
        setDeactivateState(null);
        setSaveError(err.message);
      }
      return;
    }

    savedPlan.popular = draft.popular;
    let imageFailed = "";
    try {
      const image = await syncImage(savedPlan.id);
      if (image !== undefined) savedPlan.image = image;
    } catch (err) {
      imageFailed = `Plan saved, but the image failed: ${err.message}`;
    }

    setPlans((prev) =>
      isNew ? [...prev, savedPlan] : prev.map((p) => (p.id === savedPlan.id ? savedPlan : p))
    );
    loadFeatures(); // plansWithValue counts moved

    const limitsChanged =
      !isNew &&
      draftOrigin &&
      JSON.stringify(serializeEntitlements(draftOrigin.entitlements)) !== JSON.stringify(payload.entitlements);

    setSaving(false);
    setDeactivateState(null);
    if (imageFailed) {
      setSaveError(imageFailed);
      setIsNew(false);
      setDraft((d) => ({ ...d, id: savedPlan.id, image: savedPlan.image, imageFile: d.imageFile }));
      return;
    }
    setDraft(null);
    if (limitsChanged) setApplyPrompt(savedPlan);
  };

  // ── Delete plan via API (two-step: 409 impact → confirmToken) ──
  const runDelete = async () => {
    const { plan, confirmToken } = deleteState;
    setDeleting(true);
    setDeleteError("");
    try {
      await deletePlan(plan.id, confirmToken);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      setDeleteState(null);
    } catch (err) {
      if (err.status === 409 && err.details?.confirmToken) {
        setDeleteState({ plan, impact: err.details.impact, confirmToken: err.details.confirmToken, message: err.message });
      } else {
        setDeleteError(err.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (viewingPlanId) {
    return <PlanDetails planId={viewingPlanId} onBack={() => setViewingPlanId(null)} />;
  }

  const statusMix = [
    { name: "Active", value: plans.filter((p) => p.status === "Active").length, color: "#34d399" },
    { name: "Inactive", value: plans.filter((p) => p.status !== "Active").length, color: "#d4d4d4" },
  ];

  const priceCompare = sortedPlans.map((p) => ({
    name: p.name,
    price: Number(p.discountedPrice ?? p.price) || 0,
  }));

  const billingMix = Object.values(PLAN_TYPES)
    .map((t) => ({
      name: PLAN_TYPE_LABELS[t],
      value: plans.filter((p) => (p.type ?? PLAN_TYPES.CUSTOM) === t).length,
      color: PLAN_TYPE_CHART_COLORS[t],
    }))
    .filter((d) => d.value > 0);

  // Features a plan actually offers: enforced limits above 0 / enabled flags,
  // plus every display feature it has a value for.
  const featureCoverage = sortedPlans.map((p) => {
    const e = p.entitlements;
    const enforced =
      LIMIT_KEYS.filter((k) => e[k].isUnlimited || Number(e[k].limit) > 0).length +
      [e.dealPack.isEnabled, e.prioritySupport.isEnabled].filter(Boolean).length;
    const display = p.featureValues.filter((fv) => !ENTITLEMENT_KEYS.includes(fv.key) && fv.value != null).length;
    return { name: p.name, available: enforced + display };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Subscription Plans
            </h1>
            <p className="mt-1 text-[13px] text-neutral-500">
              Plans, tiers and limits for vendors — plus the common feature list and the comparison vendors see.
            </p>
          </div>
          {tab === "plans" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 self-start rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
            >
              <Plus size={15} />
              Add Plan
            </button>
          )}
        </div>

        <Tabs tab={tab} onChange={setTab} />


        {tab === "features" && <FeatureMaster onChanged={loadFeatures} />}
        {tab === "compare" && <PlanCompare />}

        {tab === "plans" && (
          <>
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
                {plans.some((p) => p.tier == null) && (
                  <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/5 px-4 py-3 text-[12.5px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    Some plans have no tier yet — upgrade / downgrade falls back to price for them. Edit and set a tier.
                  </div>
                )}

                {/* Charts — one row, four equal cards */}
                {plans.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Status Mix</p>
                      <div className="relative flex h-27.5 items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={statusMix} dataKey="value" nameKey="name" innerRadius={32} outerRadius={48} paddingAngle={3} stroke="none">
                              {statusMix.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-[16px] font-bold text-neutral-800 dark:text-neutral-100">{plans.length}</p>
                          <p className="text-[9.5px] text-neutral-500">Plans</p>
                        </div>
                      </div>
                      <MixLegend items={statusMix} />
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Billing Type Mix</p>
                      <div className="relative flex h-27.5 items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={billingMix} dataKey="value" nameKey="name" innerRadius={32} outerRadius={48} paddingAngle={3} stroke="none">
                              {billingMix.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-[16px] font-bold text-neutral-800 dark:text-neutral-100">{plans.length}</p>
                          <p className="text-[9.5px] text-neutral-500">Plans</p>
                        </div>
                      </div>
                      <MixLegend items={billingMix} />
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Price Comparison</p>
                      <div className="h-37.5">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priceCompare} barCategoryGap="30%" margin={{ top: 18, left: 0, right: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#a3a3a3" }} axisLine={false} tickLine={false} interval={0} />
                            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Price"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                            <Bar dataKey="price" fill="#34d399" radius={[6, 6, 0, 0]}>
                              <LabelList
                                dataKey="price"
                                position="top"
                                formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                                style={{ fontSize: 9.5, fill: "#525252" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">Feature Coverage</p>
                      <div className="h-37.5">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={featureCoverage} barCategoryGap="30%" margin={{ top: 18, left: 0, right: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: "#a3a3a3" }} axisLine={false} tickLine={false} interval={0} />
                            <Tooltip formatter={(v) => [`${v} feature${v === 1 ? "" : "s"}`, "Offered"]} contentStyle={{ borderRadius: 10, border: "none", fontSize: 12 }} />
                            <Bar dataKey="available" fill="#38bdf8" radius={[6, 6, 0, 0]}>
                              <LabelList dataKey="available" position="top" style={{ fontSize: 9.5, fill: "#525252" }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {plans.length === 0 && (
                  <div className="mb-8 rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
                    No plans yet — add your first plan.
                  </div>
                )}

                {/* Plan cards — tier, then length, then price */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onView={(p) => setViewingPlanId(p.id)}
                      onEdit={openEdit}
                      onDelete={(p) => {
                        setDeleteError("");
                        setDeleteState({ plan: p });
                      }}
                      onApplyTerms={setApplyTarget}
                      featureMeta={featureMeta}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {draft && (
        <PlanFormModal
          draft={draft}
          isNew={isNew}
          saving={saving}
          entitlementLabels={entitlementLabels}
          displayRows={displayRows}
          onChange={setDraft}
          onCancel={closeModal}
          onSave={() => saveDraft()}
        />
      )}
      {draft && saveError && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-red-500/30 bg-white px-4 py-2.5 text-[12.5px] text-red-600 shadow-lg dark:bg-neutral-900 dark:text-red-400 dark:shadow-none">
          {saveError}
        </div>
      )}
      {draft && deactivateState && (
        <ImpactConfirmModal
          title={`Deactivate "${draft.name}"?`}
          message={deactivateState.message}
          impact={deactivateState.impact}
          confirmLabel="Deactivate anyway"
          tone="amber"
          busy={saving}
          onCancel={() => !saving && setDeactivateState(null)}
          onConfirm={() => saveDraft(deactivateState.confirmToken)}
        />
      )}
      {deleteState && (
        <ImpactConfirmModal
          title={deleteState.confirmToken ? `"${deleteState.plan.name}" is in use` : `Delete "${deleteState.plan.name}"?`}
          message={
            deleteState.message ||
            "Stops new purchases and renewals of this plan. There is no restore."
          }
          impact={deleteState.impact}
          confirmLabel={deleteState.confirmToken ? "Delete anyway" : "Delete"}
          busy={deleting}
          error={deleteError}
          onCancel={() => !deleting && setDeleteState(null)}
          onConfirm={runDelete}
        />
      )}
      {applyPrompt && (
        <ApplyPromptModal
          plan={applyPrompt}
          onLater={() => setApplyPrompt(null)}
          onReview={() => {
            setApplyTarget(applyPrompt);
            setApplyPrompt(null);
          }}
        />
      )}
      {applyTarget && (
        <ApplyTermsModal plan={applyTarget} labels={entitlementLabels} onClose={() => setApplyTarget(null)} />
      )}
    </div>
  );
}
