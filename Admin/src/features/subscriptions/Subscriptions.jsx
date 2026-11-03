import { useEffect, useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, CreditCard, Gift, Eye, FlaskConical, RefreshCw } from "lucide-react";
import Table from "../../components/common/Table";
import { useAllSubscriptionPages } from "./queries/subscriptionsQueries";
import { formatBatch, MISSING, isNotFoundMessage } from "../../utils/helpers";
import EmptyState from "../../components/common/EmptyState";
import ValueOr from "../../components/common/ValueOr";
import Loader from "../../components/common/Loader";
import SubscriptionsOverview from "./SubscriptionsOverview";
import StatusPill from "./components/StatusPill";
import { formatDate, formatCurrency, pick, isDummySubscription } from "./subscriptionUtils";

const STATUS_OPTIONS = ["All", "ACTIVE", "PENDING", "EXPIRED", "UPGRADED"];
const SOURCE_OPTIONS = ["All", "PAYMENT", "ADMIN_PAYMENT", "ADMIN_MANUAL"];

/* scope "all" (sidebar: Subscriptions) = real ones only;
   scope "dummy" (sidebar: Dummy Subscriptions) = isDummy ones only. */
export default function Subscriptions({ scope = "all" }) {
  const navigate = useNavigate();
  const isDummyScope = scope === "dummy";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [source, setSource] = useState("All");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // The row rides along in router state so the detail page renders
  // instantly, without waiting on the all-pages fetch.
  const openDetails = (row) => navigate(`/subscriptions/${row._id}`, { state: { row } });

  // The API can't filter on isDummy, so every page is loaded and split
  // here — paging is then done client-side over this scope's rows.
  // Every row matching the server-side filters, both real and dummy.
  const {
    data: allRows = [],
    isPending: loading,
    isFetching,
    error,
    refetch,
  } = useAllSubscriptionPages(
    {
      search: debouncedSearch,
      status: status === "All" ? undefined : status,
      source: source === "All" ? undefined : source,
    },
    { placeholderData: keepPreviousData }
  );
  // A "not found" reply just means nothing matches — the table's empty
  // state, not an error.
  const rawLoadError = error?.message ?? "";
  const loadError = isNotFoundMessage(rawLoadError) ? "" : rawLoadError;

  const scopedRows = useMemo(
    () => allRows.filter((r) => isDummySubscription(r) === isDummyScope),
    [allRows, isDummyScope]
  );
  const total = scopedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rows = scopedRows.slice((page - 1) * limit, page * limit);

  // Debounce search — the query refetches when debouncedSearch (or the
  // status / source filters) change; paging is local, so no refetch.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const columns = [
    {
      key: "brand",
      label: "Brand",
      render: (row) => (
        <button onClick={() => openDetails(row)} className="text-left">
          <p className="text-[13.5px] font-medium text-neutral-800 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400">
            <ValueOr value={row.brand?.brandName} fallback="No brand" />
          </p>
          <p className="text-[11.5px] text-neutral-500"><ValueOr value={pick(row.brand?.merchantId, row.brand?.uniqueId)} fallback="No merchant ID" /></p>
          {isDummySubscription(row) && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              <FlaskConical size={9} />
              D
            </span>
          )}
          {isDummySubscription(row) && (row.dummyBatch || row.brand?.dummyBatch) && (
            <p className="mt-0.5 font-mono text-[10.5px] text-violet-600 dark:text-violet-400">
              {formatBatch(row.dummyBatch || row.brand?.dummyBatch)}
            </p>
          )}
        </button>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div>
          <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200"><ValueOr value={row.plan?.name} fallback={MISSING.plan} /></p>
          <p className="text-[11.5px] text-neutral-500">
            {row.plan?.type === "MONTHLY" ? "Monthly" : "Yearly"} · {formatCurrency(row.plan?.price)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusPill status={row.status} isLapsed={row.isLapsed} />,
    },
    {
      key: "source",
      label: "Source",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-[10.5px] font-semibold text-neutral-700 dark:text-neutral-300">
            {row.source || MISSING.method}
          </span>
          {row.isFreeGrant && (
            <span className="flex items-center gap-1 text-[10.5px] font-medium text-violet-600 dark:text-violet-400">
              <Gift size={10} />
              Free grant
            </span>
          )}
        </div>
      ),
    },
    {
      key: "paidAmount",
      label: "Paid",
      align: "right",
      render: (row) => (
        <div>
          <p className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(row.paidAmount)}</p>
          {row.dueAmount > 0 && <p className="text-[11px] text-amber-600 dark:text-amber-400">Due {formatCurrency(row.dueAmount)}</p>}
        </div>
      ),
    },
    {
      key: "validity",
      label: "Validity",
      render: (row) => (
        <div>
          <p className="text-[12.5px] text-neutral-700 dark:text-neutral-300">
            {!row.startDate && !row.endDate ? (
              <ValueOr value={null} fallback="Dates not set" />
            ) : (
              `${formatDate(row.startDate)} → ${row.endDate ? formatDate(row.endDate) : "No end date"}`
            )}
          </p>
          <p className={`text-[11px] ${row.isLapsed ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>
            {row.isLapsed ? "Expired" : row.daysRemaining != null ? `${row.daysRemaining} days left` : "No end date"}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Granted On",
      render: (row) => <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "view",
      label: "",
      align: "right",
      render: (row) => (
        <button
          onClick={() => openDetails(row)}
          aria-label="View full details"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors hover:border-emerald-400/40 hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <Eye size={13} />
        </button>
      ),
    },
  ];

  const tableRows = rows.map((r) => ({ ...r, id: r._id }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard size={19} />
          </span>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {isDummyScope ? "D Subscriptions" : "Subscriptions"}
            </h1>
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400">
              {isDummyScope
                ? `Test / demo subscriptions — kept separate from real ones. ${total} total.`
                : `Every brand's plan, across the whole platform — ${total} total.`}
            </p>
          </div>
        </div>

        {/* Overview — every subscription matching the filters below (status,
            source, search), across all pages, not just the table page. */}
        <SubscriptionsOverview rows={scopedRows} loading={isFetching} />

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 sm:max-w-xs sm:flex-1">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand name, merchant ID…"
              className="w-full bg-transparent text-[13.5px] text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-44"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s}
              </option>
            ))}
          </select>

          <select
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value);
            }}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 focus:border-emerald-400/60 focus:outline-none sm:w-48"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Sources" : s}
              </option>
            ))}
          </select>
        </div>

        {/* Load state */}
        {loading && (
          <Loader label="Loading subscriptions…" />
        )}

        {!loading && loadError && (
          <EmptyState
            tone="error"
            icon="error"
            title="Couldn't load subscriptions"
            description={loadError}
            action={{ label: "Try again", icon: RefreshCw, onClick: () => refetch() }}
          />
        )}

        {!loading && !loadError && (
          <>
            <Table
              columns={columns}
              data={tableRows}
              emptyTitle={isDummyScope ? "No D subscriptions" : "No subscriptions found"} emptyDescription={isDummyScope ? "Test / demo subscriptions will show up here." : "No subscriptions match this status, source or search. Try a different filter."} emptyIcon="subscription"
            />

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-[12.5px] text-neutral-700 dark:text-neutral-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
