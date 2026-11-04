import { Fragment, useState } from "react";
import {
  Search,
  UserX,
  CalendarClock,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import useBackLayer from "../../lib/useBackLayer";
import { useAccountDeletions } from "./queries/accountDeletionQueries";
import { restoreAccountDeletion, deleteAccountNow } from "./services/AccountDeletionApi";

/* -------------------------------------------------------------------------
 * Account deletions (release v1.12 guide §1, API doc §15b).
 *
 * Customers who asked to delete their account: DELETION_SCHEDULED (inside
 * the grace period — can be restored or purged now) and DELETED (purged —
 * read-only; name / number come from the sale snapshot because the live
 * profile is wiped).
 * ---------------------------------------------------------------------- */

const PAGE_SIZE = 20;

const STATE_TABS = [
  { id: "", label: "All" },
  { id: "DELETION_SCHEDULED", label: "Scheduled" },
  { id: "DELETED", label: "Deleted" },
];

const HOLD_LABELS = {
  REFUND_OPEN: "Refund open",
  DISPUTE_OPEN: "Dispute open",
  PAYOUT_OPEN: "Payout open",
  PENDING_CLAIM: "Pending claim",
};

const VIA_LABELS = { APP: "App", LEGACY_APP: "Old app", WEB: "Web", ADMIN: "Admin" };

const REASON_MIN = 5;
const REASON_MAX = 300;

function holdLabel(h) {
  return HOLD_LABELS[h] || String(h).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function fmtDate(iso, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(
    "en-IN",
    withTime
      ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "2-digit", month: "short", year: "numeric" }
  );
}

function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 10) return raw || null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

// One API row → what the table shows. Purged rows have no live name /
// number, so fall back to the claim snapshot.
function normalizeRow(raw) {
  const deletion = raw.deletion || {};
  const snapshot = raw.snapshot || {};
  return {
    userId: raw.userId,
    customerId: raw.customerId,
    uniqueId: raw.uniqueId || "—",
    name: raw.name || snapshot.name || null,
    phone: formatPhone(raw.whatsappNumber || snapshot.whatsappNumber),
    fromSnapshot: !raw.name && Boolean(snapshot.name || snapshot.whatsappNumber),
    state: raw.accountState,
    isScheduled: raw.accountState === "DELETION_SCHEDULED",
    requestedAt: deletion.requestedAt,
    scheduledFor: deletion.scheduledFor,
    purgedAt: deletion.purgedAt,
    via: deletion.via,
    holds: Array.isArray(deletion.holds) ? deletion.holds : [],
    history: Array.isArray(deletion.history) ? deletion.history : [],
  };
}

function StatePill({ scheduled }) {
  return scheduled ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <CalendarClock size={12} /> Scheduled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-400">
      <UserX size={12} /> Deleted
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Reason modal — shared by Restore and Delete now                    */
/* ------------------------------------------------------------------ */

function ReasonModal({ action, row, onClose, onDone, onStale }) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useBackLayer(Boolean(action), () => !submitting && onClose());
  if (!action || !row) return null;

  const isDelete = action === "delete";
  const trimmed = reason.trim();
  const reasonError =
    trimmed.length === 0
      ? ""
      : trimmed.length < REASON_MIN
      ? `At least ${REASON_MIN} characters.`
      : trimmed.length > REASON_MAX
      ? `At most ${REASON_MAX} characters.`
      : "";
  const canSubmit = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX && (!isDelete || confirmed);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = isDelete ? await deleteAccountNow(row.userId, trimmed) : await restoreAccountDeletion(row.userId, trimmed);
      onDone(res?.message || (isDelete ? "Personal data deleted." : "Account restored."));
    } catch (err) {
      setError(err);
      // The row changed under us (restored / purged elsewhere) — refresh the list.
      if (err.code === "NOT_SCHEDULED") onStale?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={submitting ? undefined : onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20"
      >
        <div className="mb-4 flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              isDelete ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isDelete ? <Trash2 size={17} /> : <RotateCcw size={17} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-semibold text-neutral-900 dark:text-neutral-50">
              {isDelete ? "Delete account now" : "Restore account"}
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-500">
              {row.name || row.uniqueId} · {row.phone || row.uniqueId}
            </p>
          </div>
        </div>

        {isDelete ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] font-medium text-red-600 dark:text-red-400">
            Personal data hamesha ke liye hat jayega. Paise ke records rahenge.
          </div>
        ) : (
          <p className="mb-4 text-[12.5px] text-neutral-500">
            The account goes back to ACTIVE and the customer is told the deletion was cancelled.
          </p>
        )}

        <label className="mb-1.5 block text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={REASON_MAX + 50}
          placeholder={isDelete ? "e.g. Customer asked for immediate deletion" : "e.g. Customer called support"}
          className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-500 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
        />
        <div className="mt-1 flex justify-between text-[10.5px] text-neutral-500">
          <span className={reasonError ? "text-red-500" : ""}>{reasonError || `${REASON_MIN}–${REASON_MAX} characters.`}</span>
          <span>{trimmed.length}/{REASON_MAX}</span>
        </div>

        {isDelete && (
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12.5px] text-neutral-700 dark:text-neutral-300">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            I understand this cannot be undone.
          </label>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <p>{error.message}</p>
              {error.code === "PURGE_ON_HOLD" && error.holds?.length > 0 && (
                <p className="mt-1 font-medium">Blocked by: {error.holds.map(holdLabel).join(", ")}</p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || submitting}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isDelete ? "bg-red-500 text-white hover:bg-red-400" : "bg-emerald-400 text-neutral-950 hover:bg-emerald-300"
            }`}
          >
            {submitting && <Loader2 size={13} className="animate-spin" />}
            {isDelete ? "Delete now" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountDeletions() {
  const [state, setState] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({ action: null, row: null });
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(null);

  const params = { state: state || undefined, search: search || undefined, page, limit: PAGE_SIZE };
  const { data: res, isPending, isFetching, error, refetch } = useAccountDeletions(params);

  const payload = res?.data ?? {};
  const rows = (Array.isArray(payload.data) ? payload.data : []).map(normalizeRow);
  const total = Number(payload.total) || 0;
  const totalPages = Math.max(1, Number(payload.totalPages) || 1);

  const submitSearch = (e) => {
    e?.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl dark:text-neutral-50">Account deletions</h1>
        <p className="text-[13px] text-neutral-500">
          Customers who asked to delete their account. Scheduled accounts can be restored or purged now; money records are never deleted.
        </p>
      </div>

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] px-4 py-2.5 text-[12.5px] text-emerald-700 dark:text-emerald-400">
          {notice}
          <button type="button" onClick={() => setNotice("")} className="text-[11.5px] font-medium opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATE_TABS.map((t) => (
            <button
              key={t.id || "all"}
              type="button"
              onClick={() => {
                setState(t.id);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                state === t.id
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                  : "border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t.label}
            </button>
          ))}
          {isFetching && !isPending && <Loader2 size={14} className="animate-spin text-neutral-400" />}
        </div>

        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:w-80 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onBlur={submitSearch}
            placeholder="Name, number or unique ID…"
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </form>
      </div>

      {isPending ? (
        <Loader label="Loading account deletions…" />
      ) : error ? (
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <EmptyState
            tone="error"
            icon="error"
            title="Couldn't load account deletions"
            description={error.message}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <EmptyState
            icon={search ? "search" : "customer"}
            title={search ? "No deletions match this search" : "No account deletions"}
            description={
              search
                ? "Purged accounts can only be found by their unique ID."
                : "Accounts appear here as soon as a customer asks to delete theirs."
            }
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <table className="w-full min-w-[920px] text-left text-[12.5px]">
              <thead className="border-b border-neutral-100 text-[11px] uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">State</th>
                  <th className="px-4 py-3 font-semibold">Requested</th>
                  <th className="px-4 py-3 font-semibold">Scheduled for</th>
                  <th className="px-4 py-3 font-semibold">Via</th>
                  <th className="px-4 py-3 font-semibold">Holds</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {rows.map((r) => (
                  <Fragment key={r.userId}>
                    <tr className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{r.name || "Name removed"}</p>
                        <p className="text-neutral-500">{r.phone || "Number removed"}</p>
                        <p className="font-mono text-[10.5px] text-neutral-400">{r.uniqueId}</p>
                        {r.fromSnapshot && <p className="text-[10.5px] text-neutral-400">From sale snapshot</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatePill scheduled={r.isScheduled} />
                        {!r.isScheduled && r.purgedAt && (
                          <p className="mt-1 text-[10.5px] text-neutral-500">Purged {fmtDate(r.purgedAt)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{fmtDate(r.requestedAt, true)}</td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{fmtDate(r.scheduledFor)}</td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{VIA_LABELS[r.via] || r.via || "—"}</td>
                      <td className="px-4 py-3">
                        {r.holds.length > 0 ? (
                          <div className="max-w-[220px] rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                            <p className="flex items-center gap-1 font-semibold">
                              <ShieldAlert size={12} /> Purge ruka hai — refund/dispute/payout khula
                            </p>
                            <p className="mt-0.5">{r.holds.map(holdLabel).join(", ")}</p>
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.history.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpanded(expanded === r.userId ? null : r.userId)}
                              className="rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              History
                            </button>
                          )}
                          {r.isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => setModal({ action: "restore", row: r })}
                                className="flex items-center gap-1 rounded-lg border border-emerald-400/40 px-2.5 py-1.5 text-[12px] font-medium text-emerald-600 hover:bg-emerald-400/10 dark:text-emerald-400"
                              >
                                <RotateCcw size={12} /> Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => setModal({ action: "delete", row: r })}
                                className="flex items-center gap-1 rounded-lg border border-red-500/40 px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                              >
                                <Trash2 size={12} /> Delete now
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === r.userId && (
                      <tr>
                        <td colSpan={7} className="bg-neutral-50 px-4 py-3 dark:bg-neutral-950/40">
                          <ul className="space-y-1 text-[11.5px] text-neutral-600 dark:text-neutral-400">
                            {r.history.map((h, i) => (
                              <li key={i}>
                                <span className="font-semibold">{h.action}</span> · {fmtDate(h.at, true)} · by {h.by || "—"}
                                {h.via ? ` · via ${VIA_LABELS[h.via] || h.via}` : ""}
                                {h.reason ? ` — ${h.reason}` : ""}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[12.5px] text-neutral-500">
              {total} account{total === 1 ? "" : "s"} · page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <ReasonModal
        key={modal.row ? `${modal.action}-${modal.row.userId}` : "none"}
        action={modal.action}
        row={modal.row}
        onClose={() => setModal({ action: null, row: null })}
        onStale={() => refetch()}
        onDone={(msg) => {
          setModal({ action: null, row: null });
          setNotice(msg);
        }}
      />
    </div>
  );
}
