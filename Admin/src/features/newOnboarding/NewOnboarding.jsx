import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, AlertTriangle, LayoutGrid, List } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import Table from "../../components/common/Table";
import Loader from "../../components/common/Loader";
import { PaginationBar } from "../category/CatalogShared";
import { useDebouncedValue } from "../notification/hooks/useNotificationState";
import { useBrandStageList } from "../brand/queries/brandQueries";
import { STAGE_ROUTES } from "../brand/brandStage";
import VerificationDetails from "./VerificationDetails";
import { mapVerification } from "./verificationData";
import { useLatestVerification } from "./queries/onboardingReviewQueries";
import OnboardingCard from "./OnboardingCard";
import { onboardingTableColumns } from "./onboardingBrand";

/* A NEW brand usually has no verification attempt yet — build one from the
   list row so the details page (plan, outlets, vouchers, history) opens. */
function verificationFromBrand(b) {
  return mapVerification({
    brandId: b.id,
    attemptNumber: 0,
    brand: { _id: b.id, brandName: b.brandName, uniqueId: b.brandId, logo: b.logo, status: b.status },
    vendor: { currentScreen: b.onboardingScreen },
  });
}

const PAGE_SIZE = 12;

/* -------------------------------------------------------------------------
 * New Onboarding — the NEW tab (admin guide §3):
 * GET /brands/admin/get-all?onboardingStage=NEW — not submitted and not
 * approved. Paging and search run on the server; `stageCounts` feeds the
 * three tab tiles. Shows where each vendor is stuck (vendor.currentScreen).
 * Also the entry point for adding a brand from the admin panel. View only —
 * Approve / Reject happen on Brand Waiting.
 * ---------------------------------------------------------------------- */
export default function NewOnboarding() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [view, setView] = useState("grid");
  // "Now" captured once when the page opens (render must stay pure).
  const [openedAt] = useState(() => Date.now());
  const [selectedBrand, setSelectedBrand] = useState(null);

  // A new search starts from page 1 (state adjusted during render, no effect).
  const [searchedFor, setSearchedFor] = useState(debouncedSearch);
  if (searchedFor !== debouncedSearch) {
    setSearchedFor(debouncedSearch);
    setPage(1);
  }

  const listQuery = useBrandStageList({ onboardingStage: "NEW", page, limit, search: debouncedSearch });
  const { rows = [], total = 0, totalPages = 1, stageCounts } = listQuery.data ?? {};
  const loading = listQuery.isPending;
  const error = listQuery.error?.message ?? "";

  // Opening a brand: its current attempt, if it ever submitted (old
  // rejected / revoked brands without submittedAt are in NEW, §3).
  const latestQuery = useLatestVerification(selectedBrand?.id);

  const tiles = [
    { icon: "draft", label: "New onboardings", value: stageCounts?.NEW, hint: "Not submitted yet", tint: "amber", stage: "NEW" },
    { icon: "hourglass", label: "Waiting brands", value: stageCounts?.WAITING, hint: "Submitted, awaiting decision", tint: "sky", stage: "WAITING" },
    { icon: "brand", label: "Live brands", value: stageCounts?.LIVE, hint: "Approved", tint: "emerald", stage: "LIVE" },
  ];

  const tableColumns = onboardingTableColumns({ onOpen: setSelectedBrand, now: openedAt });

  if (selectedBrand) {
    if (latestQuery.isPending) return <Loader label="Loading brand details…" />;
    return (
      <VerificationDetails
        // No attempt (or the lookup failed) → the brand's own snapshot.
        verification={latestQuery.data || verificationFromBrand(selectedBrand)}
        onBack={() => setSelectedBrand(null)}
        readOnly
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">New Onboarding</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Brands that haven't submitted for review yet. Each card shows the vendor's current screen.
          </p>
        </div>
        {/* Admin onboards a brand for the vendor (Onboarding v2 wizard). */}
        <button
          type="button"
          onClick={() => navigate("/brand/onboard")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300"
        >
          <Plus size={14} />
          Add Brand
        </button>
      </div>

      {/* Tab tiles — server stageCounts (same filters, every stage) */}
      {!error && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiles.map(({ stage, ...t }) => (
            <StatTile
              key={stage}
              {...t}
              value={loading ? "…" : t.value ?? 0}
              active={stage === "NEW"}
              onClick={stage === "NEW" ? undefined : () => navigate(STAGE_ROUTES[stage])}
            />
          ))}
        </div>
      )}

      {/* Search + grid / table switch */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-xs sm:flex-1">
          <Search size={16} className="shrink-0 text-neutral-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, ID or phone..."
            className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
          />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12.5px] text-neutral-500">
            {loading ? "Loading brands…" : `${total} brand${total === 1 ? "" : "s"} in onboarding`}
          </p>
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
            {[
              ["grid", LayoutGrid, "Grid"],
              ["table", List, "Table"],
            ].map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-pressed={view === key}
                title={`${label} view`}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                  view === key ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Loader label="Loading brands…" />
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/[0.06] px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {error}</span>
          <button onClick={() => listQuery.refetch()} className="font-semibold underline underline-offset-2">
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
          <EmptyState
            icon={debouncedSearch ? "search" : "onboarding"}
            title={debouncedSearch ? "No brands match your search" : "No brands in onboarding right now"}
            description={
              debouncedSearch
                ? "Check the spelling or try a brand name, ID or phone number."
                : "Vendors who start signing up and haven't submitted yet will show up here."
            }
          />
        </div>
      ) : (
        <>
          {view === "table" ? (
            <Table columns={tableColumns} data={rows} minWidth={1180} emptyTitle="No brands in onboarding right now" emptyIcon="onboarding" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((b) => (
                <OnboardingCard key={b.id} brand={b} onOpen={setSelectedBrand} now={openedAt} />
              ))}
            </div>
          )}
          <div className="mt-6">
            <PaginationBar
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPage={setPage}
              onLimit={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
