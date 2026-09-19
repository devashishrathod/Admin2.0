import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Loader2,
  AlertTriangle,
  X,
  Power,
  Filter,
  Layers,
} from "lucide-react";
import ToggleSwitch from "../../components/common/ToggleSwitch";
import ConfirmActionModal from "../../components/common/ConfirmActionModal";
import SelectDropdown from "../../components/common/SelectDropdown";
import { getFaqs, createFaq, updateFaq, deleteFaq } from "./services/FaqApi";

/* -------------------------------------------------------------------------
 * FAQ types — the categories the user asked for (voucher, offer,
 * transaction, onboarding, settlement, "etc"), plus a catch-all. Admin-
 * curated grouping, not a confirmed backend enum — edit this list if the
 * real API turns out to restrict it further.
 * ---------------------------------------------------------------------- */
const FAQ_TYPES = ["VOUCHER", "OFFER", "TRANSACTION", "ONBOARDING", "SETTLEMENT", "GENERAL"];

function humanizeType(type) {
  if (!type) return "General";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function normalizeFaq(raw) {
  return {
    id: raw._id || raw.id,
    question: raw.question || "Untitled question",
    answer: raw.answer || "",
    type: raw.type && FAQ_TYPES.includes(raw.type) ? raw.type : "GENERAL",
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt,
  };
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-colors focus:border-emerald-500/50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600";

/* -------------------------------------------------------------------------
 * Add / Edit modal
 * ---------------------------------------------------------------------- */
function FaqFormModal({ open, initialData, onClose, onSave }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [type, setType] = useState(FAQ_TYPES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuestion(initialData?.question || "");
    setAnswer(initialData?.answer || "");
    setType(initialData?.type || FAQ_TYPES[0]);
    setError("");
  }, [open, initialData]);

  if (!open) return null;
  const isEdit = Boolean(initialData?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave({ question: question.trim(), answer: answer.trim(), type });
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
          <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">{isEdit ? "Edit FAQ" : "Add FAQ"}</h2>
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
              Question<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
            </label>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How do I redeem a voucher?" required className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <div className="flex flex-wrap gap-2">
              {FAQ_TYPES.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setType(opt)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    type === opt
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  {humanizeType(opt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
              Answer<span className="ml-0.5 text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Full answer shown to the user."
              required
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
              disabled={!question.trim() || !answer.trim() || submitting}
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
 * One accordion row — click the question to expand the answer. The
 * admin controls (toggle/edit/delete) sit in their own click-stopping
 * span so they never also trigger the expand/collapse.
 * ---------------------------------------------------------------------- */
function FaqAccordionItem({ faq, isOpen, onToggleOpen, onEdit, onDelete, onRequestToggleActive }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <button onClick={onToggleOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="flex min-w-0 items-center gap-2.5">
          <ChevronDown size={15} className={`shrink-0 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          <span className="truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">{faq.question}</span>
          {!faq.isActive && (
            <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              Inactive
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ToggleSwitch checked={faq.isActive} onChange={onRequestToggleActive} title={faq.isActive ? "Deactivate" : "Activate"} />
          <button
            onClick={onEdit}
            aria-label={`Edit ${faq.question}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Delete ${faq.question}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-neutral-100 px-4 py-3.5 text-[13px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          {faq.answer || <span className="text-neutral-400 dark:text-neutral-600">No answer yet.</span>}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Main page — one accordion group per type, each holding its own
 * question/answer accordion rows.
 * ---------------------------------------------------------------------- */
export default function Faq() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [openIds, setOpenIds] = useState(() => new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);
  const [toggleError, setToggleError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getFaqs({ page: 1, limit: 200 });
      const rows = (res?.data?.data ?? res?.data ?? []).map(normalizeFaq);
      setFaqs(rows);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesType = typeFilter === "All" || f.type === typeFilter;
      const matchesSearch = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [faqs, search, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    FAQ_TYPES.forEach((t) => map.set(t, []));
    filtered.forEach((f) => {
      if (!map.has(f.type)) map.set(f.type, []);
      map.get(f.type).push(f);
    });
    return Array.from(map.entries()).filter(([, rows]) => rows.length > 0);
  }, [filtered]);

  const toggleOpen = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSave = async (payload) => {
    if (editingFaq) {
      await updateFaq(editingFaq.id, payload);
    } else {
      await createFaq(payload);
    }
    setFormOpen(false);
    setEditingFaq(null);
    fetchFaqs();
  };

  const handleConfirmToggle = async () => {
    setToggleSubmitting(true);
    setToggleError("");
    try {
      await updateFaq(toggleTarget.id, { isActive: !toggleTarget.isActive });
      setToggleTarget(null);
      fetchFaqs();
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
      await deleteFaq(deleteTarget.id);
      setDeleteTarget(null);
      fetchFaqs();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">FAQs</h1>
            <p className="mt-1 text-[13px] text-neutral-500">Frequently asked questions, grouped by type.</p>
          </div>
          <button
            onClick={() => {
              setEditingFaq(null);
              setFormOpen(true);
            }}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-[13.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
          >
            <Plus size={15} />
            Add FAQ
          </button>
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Search size={15} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search question or answer..."
              className="w-56 bg-transparent text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>
          <SelectDropdown
            value={typeFilter}
            options={["All", ...FAQ_TYPES]}
            icon={Filter}
            onChange={setTypeFilter}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-14 text-[13px] text-neutral-500 dark:border-neutral-800">
            <Loader2 size={16} className="animate-spin" />
            Loading FAQs…
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/5 px-4 py-4 text-[13px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            Failed to load FAQs: {loadError}
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-5 py-14 text-center text-[13px] text-neutral-500 dark:border-neutral-800">
            No FAQs match your filters.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([type, rows]) => (
              <div key={type}>
                <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-neutral-500">
                  <Layers size={12} />
                  {humanizeType(type)}
                  <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    {rows.length}
                  </span>
                </p>
                <div className="space-y-2">
                  {rows.map((faq) => (
                    <FaqAccordionItem
                      key={faq.id}
                      faq={faq}
                      isOpen={openIds.has(faq.id)}
                      onToggleOpen={() => toggleOpen(faq.id)}
                      onEdit={() => {
                        setEditingFaq(faq);
                        setFormOpen(true);
                      }}
                      onDelete={() => setDeleteTarget(faq)}
                      onRequestToggleActive={() => setToggleTarget(faq)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FaqFormModal
        open={formOpen}
        initialData={editingFaq}
        onClose={() => {
          setFormOpen(false);
          setEditingFaq(null);
        }}
        onSave={handleSave}
      />

      <ConfirmActionModal
        open={Boolean(toggleTarget)}
        tone={toggleTarget?.isActive ? "danger" : "neutral"}
        icon={Power}
        title={toggleTarget?.isActive ? "Deactivate this FAQ?" : "Activate this FAQ?"}
        description={
          toggleTarget?.isActive
            ? "Users will no longer see this question once deactivated."
            : "This question will become visible to users again."
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
        title="Delete this FAQ?"
        description="This permanently removes the question and answer. This cannot be undone."
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
