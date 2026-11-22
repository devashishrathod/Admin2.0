import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutGrid, List, X, Check, AlertTriangle } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import Table from "../../components/common/Table";
import StatusStepButton from "../../components/common/StatusStepButton";
import Loader from "../../components/common/Loader";
import { RejectReasonModal } from "../brand/BrandShared";
import { PaginationBar } from "../category/CatalogShared";
import { useDebouncedValue } from "../notification/hooks/useNotificationState";
import { useBrandStageList } from "../brand/queries/brandQueries";
import { WaitingChip } from "../brand/BrandStageChips";
import { reviewBrandVerification } from "./services/NewOnboardingApi";
import { mapVerification } from "./verificationData";
import { useLatestVerification } from "./queries/onboardingReviewQueries";
import OnboardingCard from "./OnboardingCard";
import { onboardingTableColumns } from "./onboardingBrand";
import VerificationDetails from "./VerificationDetails";

/* Approve from the list — optional note, sent as { action: "APPROVED", note }
   (same as the details page's Approve). */
function ApproveNoteModal({ brand, busy, error, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={busy ? undefined : onClose}>
      <form
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(note.trim());
        }}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-neutral-900"
      >
        <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-50">Approve brand?</h2>
        <p className="mt-1 text-[12.5px] text-neutral-500">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{brand.brandName}</span> will go live for customers.
        </p>

        <label htmlFor="approve-note" className="mb-1.5 mt-4 block text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
          Note <span className="text-neutral-500">(optional)</span>
        </label>
        <textarea
          id="approve-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          autoFocus
          disabled={busy}
          placeholder="e.g. Bank passbook manually verified over call"
          className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[13px] text-neutral-800 placeholder:text-neutral-400 focus:border-emerald-400/60 focus:outline-none focus:ring-1 focus:ring-emerald-400/60 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:placeholder:text-neutral-600"
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-950/30 border-t-neutral-950" /> : <Check size={14} />}
            Approve
          </button>
        </div>
      </form>
    </div>
  );
}

/* A WAITING brand always has an attempt; this is only the fallback while
   the attempt lookup failed, so the details page still opens. */
function verificationFromBrand(b) {
  return mapVerification({
    brandId: b.id,
    attemptNumber: 0,
    brand: { _id: b.id, brandName: b.brandName, uniqueId: b.brandId, logo: b.logo, status: b.status, isApproved: b.isApproved },
    vendor: { currentScreen: b.onboardingScreen },
  });
}

const PAGE_SIZE = 12;

// Sub-tabs = server filters on the WAITING stage (#25a brand flags). The
// waitingChip itself is not a list filter (§3), so "Resubmitted" is a chip only.
const TABS = [
  { key: "All", label: "All", filters: {} },
  { key: "UnderReview", label: "Under review", filters: { isRejected: false, isRevoked: false } },
  { key: "Rejected", label: "Rejected", filters: { isRejected: true } },
  { key: "Revoked", label: "Revoked", filters: { isRevoked: true } },
];

/* -------------------------------------------------------------------------
 * Brand Waiting — the WAITING tab (admin guide §3):
 * GET /brands/admin/get-all?onboardingStage=WAITING — submitted and not
 * approved, rejected / revoked included, each with the server's waitingChip.
 * Paging, search and the sub-tabs run on the server. Opening a brand loads
 * its current verification attempt (GET /brands/admin/verifications?brandId).
 * ---------------------------------------------------------------------- */
export default function BrandWaiting() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [tab, setTab] = useState("All");
  const [view, setView] = useState("grid");
  // "Now" captured once when the page opens (render must stay pure).
  const [openedAt] = useState(() => Date.now());

  const [selectedBrand, setSelectedBrand] = useState(null);
  // Which single review action is in flight — "approve" | "reject" |
  // "reviewed" | "force-on" | "force-off" | "revoke" | null.
  const [busyAction, setBusyAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  // A new search starts from page 1 (state adjusted during render, no effect).
  const [searchedFor, setSearchedFor] = useState(debouncedSearch);
  if (searchedFor !== debouncedSearch) {
    setSearchedFor(debouncedSearch);
    setPage(1);
  }

  const activeTab = TABS.find((t) => t.key === tab) || TABS[0];
  const listQuery = useBrandStageList({ onboardingStage: "WAITING", page, limit, search: debouncedSearch, ...activeTab.filters });
  const { rows = [], total = 0, totalPages = 1, stageCounts } = listQuery.data ?? {};
  const loading = listQuery.isPending;
  const loadError = listQuery.error?.message ?? "";

  // Per-tab counts: one-row server queries (read `total`), same search.
  const countParams = (filters) => ({ onboardingStage: "WAITING", page: 1, limit: 1, search: debouncedSearch, ...filters });
  const underReviewCount = useBrandStageList(countParams(TABS[1].filters)).data?.total;
  const rejectedCount = useBrandStageList(countParams(TABS[2].filters)).data?.total;
  const revokedCount = useBrandStageList(countParams(TABS[3].filters)).data?.total;
  const tabCounts = { All: stageCounts?.WAITING, UnderReview: underReviewCount, Rejected: rejectedCount, Revoked: revokedCount };

  const latestQuery = useLatestVerification(selectedBrand?.id);

  const tiles = [
    { icon: "hourglass", label: "Waiting brands", value: stageCounts?.WAITING, hint: "Submitted, not approved", tint: "amber", tabKey: "All" },
    { icon: "scan", label: "Under review", value: underReviewCount, hint: "Needs your decision", tint: "sky", tabKey: "UnderReview" },
    { icon: "alert", label: "Rejected", value: rejectedCount, hint: "Vendor is fixing", tint: "red", tabKey: "Rejected" },
    { icon: "repeat", label: "Revoked", value: revokedCount, hint: "Approval taken back", tint: "violet", tabKey: "Revoked" },
  ];

  const switchTab = (key) => {
    setTab(key);
    setPage(1);
  };

  /* ---- Review workflow (Approve / Reject / Reviewed / Force / Revoke) --- */
  const handleReview = async (brandId, payload, key) => {
    setActionError("");
    setBusyAction(key);
    try {
      await reviewBrandVerification(brandId, payload);
      // The interceptor refreshes every ["brands"] query (this list, the open
      // attempt, the app-wide brand list). Wait for the list so the buttons
      // re-enable only once the new state is on screen.
      await listQuery.refetch({ cancelRefetch: false });
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleApprove = (brandId, note) => handleReview(brandId, { action: "APPROVED", note }, "approve");
  const handleReject = (brandId, rejectionReason) => handleReview(brandId, { action: "REJECTED", rejectionReason }, "reject");
  const handleMarkReviewed = (brandId) => handleReview(brandId, { action: "REVIEWED" }, "reviewed");
  const handleForceReviewed = (brandId, isReviewed) =>
    handleReview(brandId, { action: "REVIEWED", isReviewed }, isReviewed ? "force-on" : "force-off");
  const handleRevoke = (brandId, revokeReason) => handleReview(brandId, { action: "REVOKED", revokeReason }, "revoke");

  const isClosedRow = (row) => row.waitingChip === "REJECTED" || row.waitingChip === "REVOKED";

  const tableColumns = onboardingTableColumns({
    onOpen: setSelectedBrand,
    now: openedAt,
    dateField: "submitted",
    renderStatus: (row) =>
      isClosedRow(row) ? (
        <WaitingChip chip={row.waitingChip} />
      ) : (
        <StatusStepButton
          label={row.waitingChip === "RESUBMITTED" ? "Resubmitted" : "Under review"}
          tone="amber"
          stepLabel="Approve"
          disabled={Boolean(busyAction)}
          onClick={() => {
            setActionError("");
            setApproveTarget(row);
          }}
        />
      ),
    renderActions: (row) =>
      !isClosedRow(row) && (
        <button
          onClick={() => {
            setActionError("");
            setRejectTarget(row);
          }}
          disabled={Boolean(busyAction)}
          title="Reject"
          aria-label={`Reject ${row.brandName}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:border-red-500/40 hover:text-red-600 disabled:cursor-wait disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-red-400"
        >
          <X size={14} />
        </button>
      ),
  });

  if (selectedBrand) {
    if (latestQuery.isPending) return <Loader label="Loading brand details…" />;
    const verification = latestQuery.data || verificationFromBrand(selectedBrand);
    const brandId = selectedBrand.id;
    return (
      <VerificationDetails
        verification={verification}
        onBack={() => {
          setSelectedBrand(null);
          setActionError("");
        }}
        onApprove={(note) => handleApprove(brandId, note)}
        onReject={(reason) => handleReject(brandId, reason)}
        onMarkReviewed={() => handleMarkReviewed(brandId)}
        onForceReviewed={(isReviewed) => handleForceReviewed(brandId, isReviewed)}
        onRevoke={(reason) => handleRevoke(brandId, reason)}
        busyAction={busyAction}
        actionError={actionError}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">Brand Waiting</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Brands that submitted for review and aren't approved yet — rejected and revoked ones included. Open a card to review the checks and decide.
          </p>
        </div>

        {/* KPI tiles — server counts; each switches the sub-tab */}
        {!loadError && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map(({ tabKey, ...t }) => (
              <StatTile key={t.label} {...t} value={t.value ?? "…"} active={tab === tabKey} onClick={() => switchTab(tabKey)} />
            ))}
          </div>
        )}

        {/* Search + tabs */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 dark:border-neutral-800 dark:bg-neutral-900 sm:max-w-xs sm:flex-1">
            <Search size={16} className="shrink-0 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, ID or phone..."
              className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  tab === t.key ? "bg-emerald-400 text-neutral-950" : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {t.label}
                <span className="text-[10.5px] opacity-70">{tabCounts[t.key] ?? "…"}</span>
              </button>
            ))}
          </div>
        </div>

        {/* A list Reject that failed (Approve shows its error in its modal). */}
        {actionError && !approveTarget && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* Grid / table switch */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-neutral-500">{loading ? "Loading brands…" : `${total} brand${total === 1 ? "" : "s"}`}</p>
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

        {loading && <Loader label="Loading brands…" />}

        {!loading && loadError && (
          <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load the waiting brands"
              description={`${loadError} — check your connection and try again.`}
              action={{ label: "Try again", onClick: () => listQuery.refetch() }}
            />
          </div>
        )}

        {!loading && !loadError && (
          <>
            {rows.length === 0 ? (
              <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                {debouncedSearch ? (
                  <EmptyState
                    icon="search"
                    title="No waiting brands match your search"
                    description="Check the spelling or try another brand name — or clear the search to see the whole queue."
                    action={{ label: "Clear search", onClick: () => setSearch("") }}
                  />
                ) : tab !== "All" ? (
                  <EmptyState
                    icon="onboarding"
                    title={`No ${activeTab.label.toLowerCase()} brands`}
                    description="Nothing in this part of the queue right now."
                    action={{ label: "See all waiting", onClick: () => switchTab("All") }}
                  />
                ) : (
                  <EmptyState
                    icon="onboarding"
                    title="No brands waiting for approval"
                    description="You're all caught up. Brands land here once a vendor submits for review."
                    action={{ label: "See New Onboarding", onClick: () => navigate("/new-onboarding") }}
                    secondaryAction={{ label: "Live Brands", onClick: () => navigate("/brand") }}
                  />
                )}
              </div>
            ) : view === "table" ? (
              <Table columns={tableColumns} data={rows} minWidth={1240} emptyTitle="No brands waiting for approval" emptyIcon="onboarding" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <OnboardingCard
                    key={row.id}
                    brand={row}
                    onOpen={setSelectedBrand}
                    now={openedAt}
                    dateField="submitted"
                    // Rejected / revoked rows wait for the vendor — no quick actions.
                    actions={
                      isClosedRow(row)
                        ? undefined
                        : {
                            busy: Boolean(busyAction),
                            onApprove: (r) => {
                              setActionError("");
                              setApproveTarget(r);
                            },
                            onReject: (r) => {
                              setActionError("");
                              setRejectTarget(r);
                            },
                          }
                    }
                  />
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

      {/* List Approve — optional note */}
      {approveTarget && (
        <ApproveNoteModal
          brand={approveTarget}
          busy={busyAction === "approve"}
          error={actionError}
          onClose={() => {
            setApproveTarget(null);
            setActionError("");
          }}
          onConfirm={async (note) => {
            if (await handleApprove(approveTarget.id, note)) setApproveTarget(null);
          }}
        />
      )}

      {/* List Reject — reason is shown to the brand owner */}
      {rejectTarget && (
        <RejectReasonModal
          brand={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => {
            const target = rejectTarget;
            setRejectTarget(null);
            handleReject(target.id, reason);
          }}
        />
      )}
    </div>
  );
}
