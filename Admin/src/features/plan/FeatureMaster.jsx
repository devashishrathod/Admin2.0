import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, GripVertical, Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createPlanFeature,
  deletePlanFeature,
  getPlanFeatures,
  reorderPlanFeatures,
  updatePlanFeature,
} from "./services/planApi";
import { ImpactConfirmModal } from "./PlanModals";

/* -------------------------------------------------------------------------
 * Feature master (#75f–#75j) — one common list of plan features. Every plan
 * only stores its own value per feature (`featureValues`). System rows
 * (LIMIT / FLAG) come from the code: rename / reorder only, never delete,
 * hide or retype.
 * ---------------------------------------------------------------------- */

export const FEATURE_KINDS = {
  LIMIT: "LIMIT",
  FLAG: "FLAG",
  DISPLAY_NUMBER: "DISPLAY_NUMBER",
  DISPLAY_BOOLEAN: "DISPLAY_BOOLEAN",
  DISPLAY_TEXT: "DISPLAY_TEXT",
};

export const FEATURE_KIND_LABELS = {
  LIMIT: "Limit (enforced)",
  FLAG: "Flag (enforced)",
  DISPLAY_NUMBER: "Number",
  DISPLAY_BOOLEAN: "Yes / No",
  DISPLAY_TEXT: "Text",
};

const DISPLAY_KINDS = [FEATURE_KINDS.DISPLAY_NUMBER, FEATURE_KINDS.DISPLAY_BOOLEAN, FEATURE_KINDS.DISPLAY_TEXT];

// Pulls the feature array out of the #75f / #75i response.
export function extractFeatures(res) {
  const list = res?.data?.features ?? res?.features ?? res?.data ?? [];
  return Array.isArray(list) ? [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) : [];
}

// Empty value in the shape each kind expects.
export function emptyFeatureValue(kind) {
  switch (kind) {
    case FEATURE_KINDS.LIMIT:
      return { limit: 0, isUnlimited: false };
    case FEATURE_KINDS.FLAG:
    case FEATURE_KINDS.DISPLAY_BOOLEAN:
      return { isEnabled: false };
    case FEATURE_KINDS.DISPLAY_NUMBER:
      return { number: "" };
    case FEATURE_KINDS.DISPLAY_TEXT:
      return { text: "" };
    default:
      return null;
  }
}

// Cleans a draft value for the API — `null` means "no value on this plan".
export function serializeFeatureValue(kind, value) {
  if (value == null) return null;
  switch (kind) {
    case FEATURE_KINDS.LIMIT:
      return value.isUnlimited
        ? { limit: 0, isUnlimited: true }
        : { limit: Number(value.limit) || 0, isUnlimited: false };
    case FEATURE_KINDS.FLAG:
    case FEATURE_KINDS.DISPLAY_BOOLEAN:
      return { isEnabled: Boolean(value.isEnabled) };
    case FEATURE_KINDS.DISPLAY_NUMBER:
      return value.number === "" || value.number == null ? null : { number: Number(value.number) };
    case FEATURE_KINDS.DISPLAY_TEXT:
      return value.text?.trim() ? { text: value.text.trim().slice(0, 200) } : null;
    default:
      return null;
  }
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

const smallInputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/50 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-600";

function Pill({ on, onClick, onLabel, offLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
        on
          ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}

/* One input per feature kind — used by the plan form and the default value
 * field below. `value: null` = not set on this plan. */
export function FeatureValueInput({ kind, unit, value, onChange }) {
  const v = value ?? emptyFeatureValue(kind);
  switch (kind) {
    case FEATURE_KINDS.LIMIT:
      return (
        <div className="flex items-center gap-2">
          {!v.isUnlimited && (
            <input
              type="number"
              min={0}
              value={v.limit}
              onChange={(e) => onChange({ ...v, limit: e.target.value })}
              placeholder="e.g. 5"
              className={smallInputClass}
            />
          )}
          <Pill
            on={v.isUnlimited}
            onClick={() => onChange({ ...v, isUnlimited: !v.isUnlimited })}
            onLabel="Unlimited"
            offLabel="Limited"
          />
        </div>
      );
    case FEATURE_KINDS.FLAG:
    case FEATURE_KINDS.DISPLAY_BOOLEAN:
      return (
        <Pill
          on={v.isEnabled}
          onClick={() => onChange({ isEnabled: !v.isEnabled })}
          onLabel={kind === FEATURE_KINDS.FLAG ? "Enabled" : "Yes"}
          offLabel={kind === FEATURE_KINDS.FLAG ? "Disabled" : "No"}
        />
      );
    case FEATURE_KINDS.DISPLAY_NUMBER:
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={v.number ?? ""}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="Not set"
            className={smallInputClass}
          />
          {unit && <span className="shrink-0 text-[12px] text-neutral-500">{unit}</span>}
        </div>
      );
    case FEATURE_KINDS.DISPLAY_TEXT:
      return (
        <input
          value={v.text ?? ""}
          maxLength={200}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Not set"
          className={smallInputClass}
        />
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------
 * Add / edit feature modal
 * ---------------------------------------------------------------------- */

const emptyFeatureDraft = () => ({
  label: "",
  key: "",
  kind: FEATURE_KINDS.DISPLAY_TEXT,
  description: "",
  unit: "",
  group: "",
  sortOrder: "",
  defaultValue: null,
  showInComparison: true,
  isActive: true,
});

function draftFromFeature(f) {
  return {
    label: f.label ?? "",
    key: f.key ?? "",
    kind: f.kind,
    description: f.description ?? "",
    unit: f.unit ?? "",
    group: f.group ?? "",
    sortOrder: f.sortOrder ?? "",
    defaultValue: f.defaultValue ?? null,
    showInComparison: f.showInComparison !== false,
    isActive: f.isActive !== false,
  };
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] normal-case text-neutral-400">{hint}</span>}
    </label>
  );
}

function FeatureFormModal({ feature, onClose, onSaved }) {
  const isNew = !feature;
  const original = useMemo(() => (feature ? draftFromFeature(feature) : emptyFeatureDraft()), [feature]);
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // System rows: only `editableFields`; display rows: `editableFields: null` = all.
  const editable = (field) => !feature?.isSystem || (feature.editableFields || []).includes(field);
  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const typeLock = isNew
    ? ""
    : feature.isSystem
      ? "Enforced by the code — its type never changes."
      : feature.plansWithValue > 0
        ? `Used on ${feature.plansWithValue} plan(s) — remove those values or make a new feature to change the type.`
        : "";

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {
        label: draft.label.trim(),
        kind: draft.kind,
        description: draft.description.trim(),
        unit: draft.unit.trim(),
        group: draft.group.trim(),
        showInComparison: draft.showInComparison,
        isActive: draft.isActive,
        defaultValue: serializeFeatureValue(draft.kind, draft.defaultValue),
      };
      if (draft.sortOrder !== "") body.sortOrder = Number(draft.sortOrder);

      let res;
      if (isNew) {
        if (draft.key.trim()) body.key = draft.key.trim();
        res = await createPlanFeature(body);
      } else {
        // Send only what changed — and only fields this row allows.
        const originalBody = {
          ...original,
          label: original.label.trim(),
          defaultValue: serializeFeatureValue(original.kind, original.defaultValue),
          sortOrder: original.sortOrder === "" ? undefined : Number(original.sortOrder),
        };
        const patch = {};
        Object.entries(body).forEach(([k, v]) => {
          if (!editable(k)) return;
          if (JSON.stringify(v) !== JSON.stringify(originalBody[k])) patch[k] = v;
        });
        if (!Object.keys(patch).length) {
          onClose();
          return;
        }
        res = await updatePlanFeature(feature._id, patch);
      }
      onSaved(res?.data ?? res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = draft.label.trim().length >= 2 && !saving;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
            {feature?.isSystem && <Lock size={14} className="text-neutral-500" />}
            {isNew ? "Add Feature" : `Edit Feature · ${feature.label}`}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        {feature?.isSystem && (
          <p className="mb-4 rounded-xl bg-neutral-50 px-3 py-2.5 text-[12px] normal-case text-neutral-500 dark:bg-neutral-950/60">
            Enforced by the code — you can rename and reorder it, but not hide, delete or change its type.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Label">
              <input
                value={draft.label}
                maxLength={80}
                disabled={!editable("label")}
                onChange={(e) => set("label", e.target.value)}
                placeholder="e.g. Support channel"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Type is locked for system rows and for display rows already used
              by a plan (#75h answers 422 for both) — show why instead of a
              dead dropdown. */}
          {typeLock ? (
            <Field label="Type" hint={typeLock}>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300">
                <Lock size={13} className="shrink-0 text-neutral-500" />
                {FEATURE_KIND_LABELS[draft.kind] || draft.kind}
              </div>
            </Field>
          ) : (
            <Field label="Type">
              <select
                value={draft.kind}
                onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value, defaultValue: null }))}
                className={inputClass}
              >
                {DISPLAY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {FEATURE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Key" hint={isNew ? "Optional, camelCase — made from the label if blank. Never changes." : "Never changes."}>
            <input
              value={draft.key}
              maxLength={48}
              disabled={!isNew}
              onChange={(e) => set("key", e.target.value)}
              placeholder="supportChannel"
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Description">
              <input
                value={draft.description}
                maxLength={300}
                disabled={!editable("description")}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Shown on the plan card and comparison"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Group">
            <input
              value={draft.group}
              maxLength={40}
              disabled={!editable("group")}
              onChange={(e) => set("group", e.target.value)}
              placeholder="e.g. Service"
              className={inputClass}
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              min={0}
              max={100000}
              value={draft.sortOrder}
              disabled={!editable("sortOrder")}
              onChange={(e) => set("sortOrder", e.target.value)}
              placeholder="900"
              className={inputClass}
            />
          </Field>

          {(draft.kind === FEATURE_KINDS.DISPLAY_NUMBER || feature?.isSystem) && (
            <Field label="Unit">
              <input
                value={draft.unit}
                maxLength={20}
                disabled={!editable("unit")}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="e.g. hrs"
                className={inputClass}
              />
            </Field>
          )}

          {!feature?.isSystem && (
            <div className="sm:col-span-2">
              <Field label="Default value" hint="Used when a plan has no value of its own.">
                <FeatureValueInput
                  kind={draft.kind}
                  unit={draft.unit}
                  value={draft.defaultValue}
                  onChange={(v) => set("defaultValue", v)}
                />
              </Field>
            </div>
          )}
        </div>

        {!feature?.isSystem && (
          <div className="mt-4 flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={draft.showInComparison}
                onChange={(e) => set("showInComparison", e.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              Show in comparison
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              Active
            </label>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : isNew ? "Add Feature" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Feature master screen
 * ---------------------------------------------------------------------- */

export default function FeatureMaster({ onChanged }) {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [reordering, setReordering] = useState(false);

  const [deleteState, setDeleteState] = useState(null); // { feature, impact?, confirmToken?, message? }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Reloads quietly (no spinner) after an edit — the table stays on screen.
  const load = async () => {
    try {
      setFeatures(extractFeatures(await getPlanFeatures()));
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const afterChange = async () => {
    await load();
    onChanged?.();
  };

  // Drag-drop reorder → PUT reorder with fresh sortOrders. Nothing is written
  // if any id is wrong, so on failure just reload the server's order.
  const drop = async (toIndex) => {
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from == null || from === toIndex) return;

    const next = [...features];
    const [moved] = next.splice(from, 1);
    next.splice(toIndex, 0, moved);
    const items = next.map((f, i) => ({ featureId: f._id, sortOrder: (i + 1) * 10 }));
    setFeatures(next.map((f, i) => ({ ...f, sortOrder: (i + 1) * 10 })));

    setReordering(true);
    setActionError("");
    try {
      const res = await reorderPlanFeatures(items);
      const list = extractFeatures(res);
      if (list.length) setFeatures(list);
      onChanged?.();
    } catch (err) {
      setActionError(err.message);
      load();
    } finally {
      setReordering(false);
    }
  };

  const runDelete = async () => {
    const { feature, confirmToken } = deleteState;
    setDeleting(true);
    setDeleteError("");
    try {
      await deletePlanFeature(feature._id, confirmToken);
      setDeleteState(null);
      afterChange();
    } catch (err) {
      if (err.status === 409 && err.details?.confirmToken) {
        setDeleteState({
          feature,
          impact: err.details.impact,
          confirmToken: err.details.confirmToken,
          message: err.message,
        });
      } else {
        setDeleteError(err.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-neutral-500">
          Drag to reorder. Enforced limits are locked — rename or reorder only.
          {reordering && <Loader2 size={12} className="ml-2 inline animate-spin" />}
        </p>
        <button
          onClick={() => setEditing(null)}
          className="flex items-center gap-1.5 self-start rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
        >
          <Plus size={14} />
          Add Feature
        </button>
      </div>

      {actionError && (
        <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
          <Loader2 size={16} className="animate-spin" />
          Loading features…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
          Failed to load features: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-neutral-500">
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3 text-left font-semibold">Feature</th>
                  <th className="px-3 py-3 text-left font-semibold">Type</th>
                  <th className="px-3 py-3 text-left font-semibold">Group</th>
                  <th className="px-3 py-3 text-center font-semibold">Plans</th>
                  <th className="px-3 py-3 text-center font-semibold">Compare</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {features.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-neutral-500">
                      No features yet.
                    </td>
                  </tr>
                )}
                {features.map((f, i) => (
                  <tr
                    key={f._id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverIndex(i);
                    }}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    onDrop={() => drop(i)}
                    className={`border-t border-neutral-100 dark:border-neutral-800 ${
                      dragIndex === i ? "opacity-40" : ""
                    } ${overIndex === i && dragIndex !== i ? "bg-emerald-400/5" : ""}`}
                  >
                    <td className="cursor-grab px-3 py-3 text-neutral-400">
                      <GripVertical size={14} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
                        {f.isSystem && <Lock size={12} className="shrink-0 text-neutral-500" />}
                        {f.label}
                        {f.unit && <span className="text-[11px] font-normal text-neutral-500">({f.unit})</span>}
                      </p>
                      <p className="text-[11px] text-neutral-500">{f.key}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-600 dark:text-neutral-400">{FEATURE_KIND_LABELS[f.kind] || f.kind}</td>
                    <td className="px-3 py-3 text-neutral-600 dark:text-neutral-400">{f.group || "—"}</td>
                    <td className="px-3 py-3 text-center text-neutral-600 dark:text-neutral-400">{f.plansWithValue ?? 0}</td>
                    <td className="px-3 py-3 text-center text-neutral-600 dark:text-neutral-400">
                      {f.showInComparison !== false ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                          f.isActive !== false
                            ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400"
                        }`}
                      >
                        {f.isActive !== false ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(f)}
                          aria-label={`Edit ${f.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-emerald-400/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <Pencil size={14} />
                        </button>
                        {!f.isSystem && (
                          <button
                            onClick={() => {
                              setDeleteError("");
                              setDeleteState({ feature: f });
                            }}
                            aria-label={`Delete ${f.label}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <FeatureFormModal
          feature={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            afterChange();
          }}
        />
      )}

      {deleteState && (
        <ImpactConfirmModal
          title={deleteState.confirmToken ? `"${deleteState.feature.label}" is used by plans` : `Delete "${deleteState.feature.label}"?`}
          message={
            deleteState.message ||
            "Removes this row from every plan card and the comparison. Running subscribers aren't affected."
          }
          impact={deleteState.impact}
          impactLabels={{ plans: "Plans with a value" }}
          confirmLabel={deleteState.confirmToken ? "Delete anyway" : "Delete"}
          busy={deleting}
          error={deleteError}
          onCancel={() => !deleting && setDeleteState(null)}
          onConfirm={runDelete}
        />
      )}
    </div>
  );
}
