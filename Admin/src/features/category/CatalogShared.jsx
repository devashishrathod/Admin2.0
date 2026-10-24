import { useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Power,
  LayoutGrid,
  List,
  Eye,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import ToggleSwitch from "../../components/common/ToggleSwitch";

/* -------------------------------------------------------------------------
 * Pieces shared by the Category and Sub-Category screens, so both follow
 * the same rules: toggle confirm, delete-with-counts, grid/table switch,
 * status tabs with counts, backend pagination bar, length-limited fields.
 * ---------------------------------------------------------------------- */

/* Text input / textarea with a live "12 / 25" counter. */
export function LimitedField({ id, label, required, value, onChange, max, multiline, placeholder, error }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
          {label}
          {required ? <span className="ml-0.5 text-red-500">*</span> : <span className="ml-1 text-neutral-400">(optional)</span>}
        </label>
        <span className={`text-[11px] tabular-nums ${value.length >= max ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"}`}>
          {value.length} / {max}
        </span>
      </div>
      <Tag
        id={id}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        rows={multiline ? 3 : undefined}
        className={`w-full rounded-xl border bg-neutral-50 px-3.5 py-2.5 text-[13.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600 ${
          multiline ? "resize-none" : ""
        } ${
          error
            ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/60"
            : "border-neutral-200 focus:border-emerald-400/60 focus:ring-emerald-400/60 dark:border-neutral-800"
        }`}
      />
      {error && <p className="mt-1.5 text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

/* Required icon picker with preview. */
export function IconPicker({ preview, onPick }) {
  return (
    <div>
      <label className="mb-2 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
        Icon<span className="ml-0.5 text-red-500">*</span>
      </label>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800">
          {preview ? <img src={preview} alt="preview" className="h-full w-full object-cover" /> : <ImageIcon size={18} className="text-neutral-500" />}
        </div>
        <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-500 dark:border-neutral-700 dark:text-neutral-400">
          <ImageIcon size={14} />
          {preview ? "Change icon" : "Upload icon"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-500">PNG, JPG or WEBP image.</p>
    </div>
  );
}

/* Confirm before flipping Active / Inactive. `impact` lists what the
   change affects, e.g. "12 brands · 30 vouchers". */
export function ConfirmToggleModal({ kind, item, impact, busy, onCancel, onConfirm }) {
  const activating = !item.isActive;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={busy ? undefined : onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              activating ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-400/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Power size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              {activating ? `Activate this ${kind}?` : `Deactivate this ${kind}?`}
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
              <span className="font-medium capitalize text-neutral-800 dark:text-neutral-200">{item.name}</span>{" "}
              {activating
                ? "will show in the customer app and in the vendor dropdowns again."
                : "will be hidden from the customer app and from new brands. Existing links stay as they are."}
            </p>
            {impact && <p className="mt-2 text-[12px] text-neutral-500">Linked: {impact}</p>}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              activating ? "bg-emerald-400 text-neutral-950 hover:bg-emerald-300" : "bg-amber-400 text-neutral-950 hover:bg-amber-300"
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {activating ? "Yes, Activate" : "Yes, Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Delete confirm that lists every attached count. `counts` =
   [{ label, total, active, blocks }] — `blocks` marks what the backend
   refuses a delete for (still in use). */
export function DeleteWithCountsModal({ kind, item, counts, deleting, error, onCancel, onConfirm }) {
  const blockers = counts.filter((c) => c.blocks && c.total > 0);
  const blocked = blockers.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={deleting ? undefined : onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 dark:text-neutral-50">Delete this {kind}?</h3>
            <p className="mt-1 text-[12.5px] text-neutral-500">
              <span className="font-medium capitalize text-neutral-800 dark:text-neutral-200">{item.name}</span> and everything attached to it:
            </p>
          </div>
        </div>

        <div className={`mt-4 grid gap-2 ${counts.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
          {counts.map((c) => (
            <div
              key={c.label}
              className={`rounded-xl px-3.5 py-2.5 ${
                c.blocks && c.total > 0 ? "bg-red-500/5 ring-1 ring-red-400/30" : "bg-neutral-50 dark:bg-neutral-950/60"
              }`}
            >
              <p className="text-[10.5px] uppercase tracking-wider text-neutral-500">{c.label}</p>
              <p className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{c.total}</p>
              <p className="text-[10.5px] text-neutral-500">
                {c.active} active · {Math.max(0, c.total - c.active)} inactive
              </p>
            </div>
          ))}
        </div>

        {blocked ? (
          <p className="mt-3 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            Can't delete — {blockers.map((b) => `${b.total} ${b.label.toLowerCase()}`).join(", ")} still use it. Move or delete them
            first, or deactivate it instead.
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-neutral-500">Nothing blocks this delete. It's a soft delete.</p>
        )}
        {error && <p className="mt-2 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-neutral-200 px-4 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting || blocked}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting && <Loader2 size={14} className="animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* All / Active / Inactive tabs with backend counts, plus the grid/table
   switch on the right. */
export function StatusTabsAndView({ status, onStatus, counts, view, onView }) {
  const tabs = [
    { key: "All", label: "All", count: counts.all },
    { key: "Active", label: "Active", count: counts.active },
    { key: "Inactive", label: "Inactive", count: counts.inactive },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onStatus(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              status === t.key ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-[10.5px] ${
                status === t.key ? "bg-emerald-400/20" : "bg-neutral-200 dark:bg-neutral-800"
              }`}
            >
              {t.count ?? "–"}
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-0.5 rounded-xl bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        {[
          { key: "grid", icon: LayoutGrid, label: "Grid view" },
          { key: "table", icon: List, label: "Table view" },
        ].map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            aria-label={label}
            title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              view === key ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* Grid tile — icon, title, parent chip (sub-categories), description,
   linked counts, status toggle and every action. */
export function CatalogGridCard({ item, chip, stats, toggling, onToggle, onView, onEdit, onDelete }) {
  const actionBtn =
    "flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800";
  return (
    <div
      className={`group relative flex flex-col rounded-2xl bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:ring-emerald-400/30 dark:bg-neutral-900 dark:shadow-black/20 ${
        item.isActive ? "" : "opacity-80"
      }`}
    >
      {/* Status switch, top-right */}
      <div className="absolute right-3 top-3">
        <ToggleSwitch
          checked={Boolean(item.isActive)}
          disabled={toggling}
          title={item.isActive ? "Click to make Inactive" : "Click to make Active"}
          onChange={onToggle}
        />
      </div>

      {/* Big icon + title */}
      <div className="flex items-center gap-3 pr-10">
        <button
          onClick={onView}
          title="View"
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200/70 transition-transform group-hover:scale-[1.03] dark:bg-neutral-800 dark:ring-neutral-700/60"
        >
          {item.image ? (
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-neutral-400" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold capitalize leading-tight text-neutral-900 dark:text-neutral-50" title={item.name}>
            {item.name}
          </p>
          {chip}
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              item.isActive
                ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
            {item.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2.5 line-clamp-2 min-h-[2.4em] text-[11.5px] leading-snug text-neutral-500" title={item.description || ""}>
        {item.description || "No description"}
      </p>

      {/* Linked counts as compact pills + actions */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1 rounded-md bg-neutral-50 px-1.5 py-0.5 text-[10.5px] text-neutral-500 dark:bg-neutral-950/60"
            >
              <b className="font-semibold text-neutral-800 dark:text-neutral-100">{s.total}</b>
              {s.label}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center">
          <button onClick={onView} aria-label={`View ${item.name}`} title="View" className={`${actionBtn} hover:text-sky-600 dark:hover:text-sky-400`}>
            <Eye size={14} />
          </button>
          <button onClick={onEdit} aria-label={`Edit ${item.name}`} title="Edit" className={`${actionBtn} hover:text-emerald-600 dark:hover:text-emerald-400`}>
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} aria-label={`Delete ${item.name}`} title="Delete" className={`${actionBtn} hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400`}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* View popup shared by Category and Sub-Category: banner + big icon,
   title, status, parent (sub-categories), description, every linked count
   (total / active / inactive with a bar), dates, ID, and Edit. */
export function CatalogViewModal({ open, kind, item, loading, parentName, stats = [], onClose, onEdit }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not set";
  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the id is still selectable */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-neutral-900">
        {/* Banner */}
        <div className="relative h-24 bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 dark:from-emerald-950/60 dark:via-neutral-800 dark:to-teal-950/40">
          <span className="absolute left-5 top-4 text-[11px] font-semibold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
            {kind} details
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 dark:bg-neutral-900/70 dark:text-neutral-300"
          >
            <X size={15} />
          </button>
        </div>

        {loading || !item ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-neutral-500">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="px-5 pb-5">
            {/* Icon + title — `relative z-10` keeps the overlapping icon above
                the (positioned) banner; the title starts below the banner. */}
            <div className="relative z-10 -mt-10 flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-4 ring-white dark:bg-neutral-800 dark:ring-neutral-900">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-neutral-400" />}
              </div>
              <div className="min-w-0 pt-11">
                <p className="truncate text-[18px] font-bold capitalize leading-tight text-neutral-900 dark:text-neutral-50">{item.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                      item.isActive ? "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-neutral-400"}`} />
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                  {parentName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-medium capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      <Layers size={10} />
                      {parentName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-950/60">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">Description</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {item.description || "No description added."}
              </p>
            </div>

            {/* Linked counts */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {stats.map(({ label, total = 0, active = 0 }) => {
                const pct = total ? Math.round((active / total) * 100) : 0;
                return (
                  <div key={label} className="rounded-2xl border border-neutral-100 px-3.5 py-3 dark:border-neutral-800">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
                      <p className="text-[18px] font-bold leading-none text-neutral-900 dark:text-neutral-50">{total}</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-neutral-500">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{active} active</span> ·{" "}
                      {Math.max(0, total - active)} inactive
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Meta */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-neutral-500">
              <span>
                Created {fmt(item.createdAt)}
                {item.updatedAt && ` · Updated ${fmt(item.updatedAt)}`}
              </span>
              <button onClick={copyId} title="Copy ID" className="flex items-center gap-1 font-mono text-[10.5px] normal-case hover:text-neutral-800 dark:hover:text-neutral-200">
                {item.id}
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <button
                onClick={onClose}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Close
              </button>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Backend pagination: "Showing 11–20 of 47", page numbers, page size. */
export function PaginationBar({ page, limit, total, totalPages, onPage, onLimit }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  // Compact page list: 1 … p-1 p p+1 … last
  const pages = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) pages.push(n);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <div className="flex items-center gap-2 text-[12.5px] text-neutral-500">
        <span>
          Showing {from}–{to} of {total}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimit(Number(e.target.value))}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-neutral-800 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
          aria-label="Rows per page"
        >
          {[12, 24, 48].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
          >
            <ChevronLeft size={15} />
          </button>
          {pages.map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-[12.5px] text-neutral-400">
                …
              </span>
            ) : (
              <button
                key={n}
                onClick={() => onPage(n)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[12.5px] font-medium ${
                  page === n ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-neutral-800"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
