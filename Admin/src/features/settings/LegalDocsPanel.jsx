import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, AlertTriangle, X, Power, FileText } from "lucide-react";
import Table, { StatusBadge } from "../../components/common/Table";
import ToggleSwitch from "../../components/common/ToggleSwitch";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import { termsAndConditionsApi, privacyPoliciesApi } from "./services/LegalApi";

const TYPE_OPTIONS = ["CUSTOMER", "VENDOR"];
const PAGE_SIZE = 10;

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeLegalDoc(raw) {
  return {
    id: raw._id || raw.id,
    title: raw.title || "Untitled",
    type: raw.type || "—",
    description: raw.description || "",
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

function LegalFormModal({ open, initialData, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title || "");
    setType(initialData?.type && TYPE_OPTIONS.includes(initialData.type) ? initialData.type : TYPE_OPTIONS[0]);
    setDescription(initialData?.description || "");
    setError("");
  }, [open, initialData]);

  if (!open) return null;
  const isEdit = Boolean(initialData?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave({ title: title.trim(), type, description: description.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={submitting ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">
            {isEdit ? "Edit Document" : "Add Document"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Title<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Terms of Service — v2" required className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Audience</label>
            <div className="flex gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setType(opt)}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                    type === opt
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Full document content shown to the user."
              className={inputClass}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * LegalDocsPanel — Terms & Conditions / Privacy Policy management, shown
 * inside Settings' "Legal" section. `kind` picks which real resource this
 * instance talks to; both share the exact same UI since the backend
 * shapes are identical.
 * ---------------------------------------------------------------------- */
export default function LegalDocsPanel({ kind }) {
  const api = kind === "privacy" ? privacyPoliciesApi : termsAndConditionsApi;
  const label = kind === "privacy" ? "Privacy Policy" : "Terms & Conditions";

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.getAll({ page: 1, limit: 100 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(normalizeLegalDoc);
      setDocs(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.trim().toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (payload) => {
    if (editingDoc) {
      await api.update(editingDoc.id, payload);
    } else {
      await api.create(payload);
    }
    setFormOpen(false);
    setEditingDoc(null);
    fetchDocs();
  };

  const handleConfirmToggle = async () => {
    setToggleSubmitting(true);
    setToggleError("");
    try {
      await api.update(toggleTarget.id, { isActive: !toggleTarget.isActive });
      setToggleTarget(null);
      fetchDocs();
    } catch (err) {
      setToggleError(err.message);
    } finally {
      setToggleSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteSubmitting(true);
    setDeleteError("");
    try {
      await api.remove(deleteTarget.id);
      setDeleteTarget(null);
      fetchDocs();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (d) => (
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <FileText size={13} />
          </span>
          <span className="font-medium text-neutral-800 dark:text-neutral-200">{d.title}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Audience",
      render: (d) => (
        <span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">{d.type}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (d) => <StatusBadge status={d.isActive ? "Active" : "Inactive"} />,
    },
    { key: "createdAt", label: "Created", render: (d) => formatDateTime(d.createdAt) },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          <ToggleSwitch
            checked={d.isActive}
            onChange={() => setToggleTarget(d)}
            title={d.isActive ? "Deactivate" : "Activate"}
          />
          <button
            onClick={() => {
              setEditingDoc(d);
              setFormOpen(true);
            }}
            aria-label={`Edit ${d.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteTarget(d)}
            aria-label={`Delete ${d.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
          <Search size={15} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${label.toLowerCase()}...`}
            className="w-56 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>
        <button
          onClick={() => {
            setEditingDoc(null);
            setFormOpen(true);
          }}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
        >
          <Plus size={15} />
          Add {label}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
          <Loader2 size={16} className="animate-spin" />
          Loading {label.toLowerCase()}…
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} className="shrink-0" />
          Failed to load {label.toLowerCase()}: {loadError}
        </div>
      ) : (
        <Table
          columns={columns}
          data={pageRows}
          emptyMessage={`No ${label.toLowerCase()} documents yet.`}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
        />
      )}

      <LegalFormModal
        open={formOpen}
        initialData={editingDoc}
        onClose={() => {
          setFormOpen(false);
          setEditingDoc(null);
        }}
        onSave={handleSave}
      />

      <ConfirmActionModal
        open={Boolean(toggleTarget)}
        tone={toggleTarget?.isActive ? "danger" : "neutral"}
        icon={Power}
        title={toggleTarget?.isActive ? `Deactivate "${toggleTarget?.title}"?` : `Activate "${toggleTarget?.title}"?`}
        description={
          toggleTarget?.isActive
            ? "Users will no longer see this document once deactivated."
            : "This document will become visible to users again."
        }
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        submitting={toggleSubmitting}
        error={toggleError}
        onClose={() => {
          setToggleTarget(null);
          setToggleError("");
        }}
        onConfirm={handleConfirmToggle}
      />

      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        tone="danger"
        icon={Trash2}
        title={`Delete "${deleteTarget?.title}"?`}
        description="This permanently removes the document. This cannot be undone."
        confirmLabel="Delete"
        submitting={deleteSubmitting}
        error={deleteError}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
