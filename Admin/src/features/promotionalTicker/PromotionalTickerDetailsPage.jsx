import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
  Link as LinkIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "../../components/common/Table";
import EmptyState from "../../components/common/EmptyState";
import TickerDeleteConfirmModal from "./TickerDeleteConfirmModal";
import {
  deletePromotionalTicker,
  getPromotionalTickerById,
} from "./services/PromotionalTickerApi";
import { apiToRow, formatDateTime, redirectSummary } from "./tickerUtils";
import Loader from "../../components/common/Loader";

const cardClass =
  "rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20";

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <div className="mt-0.5 break-words text-[13.5px] font-semibold text-neutral-900 dark:text-neutral-50">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PromotionalTickerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticker, setTicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await getPromotionalTickerById(id);
      setTicker(raw ? apiToRow(raw) : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Fetch the route's ticker into local page state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate("/promotional-ticker");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePromotionalTicker(ticker.id);
      navigate("/promotional-ticker", { replace: true });
    } catch (err) {
      setActionError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <Loader variant="page" label="Loading promotional ticker…" />
    );
  }

  if (error || !ticker) {
    return (
      <EmptyState
        variant="page"
        tone={error ? "error" : "default"}
        icon={error ? "error" : "ticker"}
        title={error ? "Couldn't load this promotional ticker" : "Promotional ticker not found"}
        description={
          error
            ? `${error} — check your connection and try again.`
            : "We couldn't find a promotional ticker with this link. It may have been deleted, or the link is no longer valid."
        }
        action={{ label: "Back to Promotional Tickers", icon: ArrowLeft, onClick: () => navigate("/promotional-ticker") }}
        secondaryAction={error ? { label: "Try again", onClick: load } : undefined}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={13} /> Back to Promotional Tickers
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/promotional-ticker", { state: { editId: ticker.id } })}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-emerald-400"
          >
            <Pencil size={13} /> Edit Ticker
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-neutral-600 transition-colors hover:border-red-500/40 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:text-red-400"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className={`${cardClass} h-fit`}>
          <div className="mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-950">
            {ticker.icon ? (
              <img src={ticker.icon} alt={ticker.title} className="h-full w-full object-contain" />
            ) : (
              <ImageIcon size={36} className="text-neutral-400 dark:text-neutral-600" />
            )}
          </div>
          <div className="mt-4 flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{ticker.title}</h1>
            <StatusBadge status={ticker.isActive ? "Active" : "Inactive"} />
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-neutral-500">Ticker details</h2>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <InfoRow icon={LinkIcon} label="Redirect">
              {redirectSummary(ticker.redirect)}
            </InfoRow>
            {ticker.redirect?.url && (
              <InfoRow icon={LinkIcon} label="Redirect URL">
                <a href={ticker.redirect.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">
                  {ticker.redirect.url}
                </a>
              </InfoRow>
            )}
            <InfoRow icon={Clock3} label="Display order">{ticker.displayOrder ?? 0}</InfoRow>
            <InfoRow icon={CalendarDays} label="Starts">{formatDateTime(ticker.startDate)}</InfoRow>
            <InfoRow icon={CalendarDays} label="Ends">{formatDateTime(ticker.endDate)}</InfoRow>
            {ticker.createdAt && (
              <InfoRow icon={CalendarDays} label="Created">{formatDateTime(ticker.createdAt)}</InfoRow>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {actionError}
        </div>
      )}

      {confirmDelete && (
        <TickerDeleteConfirmModal
          ticker={ticker}
          deleting={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
