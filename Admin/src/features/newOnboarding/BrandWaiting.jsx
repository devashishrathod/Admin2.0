import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutGrid, List, X, Check, AlertTriangle } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import StatTile from "../../components/common/StatTile";
import Table from "../../components/common/Table";
import StatusStepButton from "../../components/common/StatusStepButton";
import { RejectReasonModal } from "../brand/BrandShared";
import { reviewBrandVerification } from "./services/NewOnboardingApi";
import { fetchAllVerifications, latestByBrand } from "./verificationData";
import OnboardingCard from "./OnboardingCard";
import { onboardingTableColumns } from "./onboardingBrand";
import VerificationDetails from "./VerificationDetails";
import { useBrands } from "../brand/BrandContext";
import Loader from "../../components/common/Loader";

// Which brands show here is decided by the brand itself, not the system
// verdict: the vendor finished onboarding (isOnBoardingCompleted) or is on
// the UNDER_REVIEW screen, and brand.isApproved === false (see `waiting` in
// the component). Approved brands move to Live Brands.
const isUnderReviewScreen = (screen) =>
  String(screen || "").trim().toUpperCase().replace(/[\s-]+/g, "_") === "UNDER_REVIEW";

/* Approve from the table — optional note, sent as { action: "APPROVED", note }
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

/* -------------------------------------------------------------------------
 * Brand Waiting — brands waiting for admin approval (list + navigation into
 * the verification details page).
 * ---------------------------------------------------------------------- */

export default function BrandWaiting() {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All"); // All · Waiting · Rejected
  const [limit] = useState(9); // 3×3 grid of cards per page


  const [selectedId, setSelectedId] = useState(null);

  // Which single review action is currently in flight — "approve" | "reject" |
  // "reviewed" | "force-on" | "force-off" | "revoke" | null. Tracking this
  // per-action (instead of one shared busy boolean) means clicking the
  // Reviewed toggle only spins the Reviewed toggle, not the Approve button.
  const [busyAction, setBusyAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const { allBrands, fetchBrands } = useBrands();
  // Grid by default; switch to a table with the toggle above the list.
  const [view, setView] = useState("grid");
  // "Now" captured once when the page opens (render must stay pure).
  const [openedAt] = useState(() => Date.now());
  // Table row Approve / Reject — the row whose modal is open.
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  /* The list endpoint only takes page/limit/search — it can't filter to
     "waiting" — and its pages mix approved/rejected rows in. Filtering one
     server page at a time hid waiting brands on later pages (page 1 empty,
     "Page 1 of 6"). So every page is loaded, the waiting ones kept, and
     paging happens here over just those. */
  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setVerifications(await fetchAllVerifications(search));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchVerifications();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Every waiting brand (all server pages), then this page's slice of them.
  // Brand Waiting rule: the vendor finished onboarding (isOnBoardingCompleted)
  // or is on the UNDER_REVIEW screen, and the brand isn't approved yet
  // (isApproved false) → it waits here for the admin to approve or reject.
  // One card per brand — its latest attempt.
  const waiting = [...latestByBrand(verifications).values()].filter(
    (v) =>
      (v.vendor?.isOnBoardingCompleted || isUnderReviewScreen(v.vendor?.currentScreen)) &&
      !v.brand?.isApproved
  );
  // Tabs — rejected (and revoked) brands moved here from New Onboarding.
  const isRejectedV = (v) =>
    ["REJECTED", "REVOKED"].includes(v.derivedStatus) || Boolean(v.brand?.isRejected);
  const pendingOnly = waiting.filter((v) => !isRejectedV(v));
  const rejectedOnly = waiting.filter(isRejectedV);
  const TAB_ROWS = { All: waiting, Waiting: pendingOnly, Rejected: rejectedOnly };
  const tabRows = TAB_ROWS[tab] || waiting;
  const totalPages = Math.max(1, Math.ceil(tabRows.length / limit));

  // KPI tiles (same tile as Live Vouchers). Waiting / Rejected switch the tab.
  const waitingTiles = [
    { icon: "hourglass", label: "Waiting", value: pendingOnly.length, hint: "Needs your decision", tint: "amber", tabKey: "Waiting" },
    { icon: "alert", label: "Rejected", value: rejectedOnly.length, hint: "Rejected / revoked", tint: "red", tabKey: "Rejected" },
    { icon: "up", label: "High Score", value: pendingOnly.filter((v) => v.score >= 70).length, hint: "Score 70+ · likely safe", tint: "emerald" },
    { icon: "down", label: "Low Score", value: pendingOnly.filter((v) => v.score < 40).length, hint: "Under 40 · check carefully", tint: "violet" },
    { icon: "repeat", label: "Resubmitted", value: waiting.filter((v) => (v.attemptNumber ?? 1) > 1).length, hint: "Fixed & sent back", tint: "sky" },
  ];
  const safePage = Math.min(page, totalPages);
  const filtered = tabRows.slice((safePage - 1) * limit, safePage * limit);

  // Card + table are the New Onboarding ones, which read the Brand list item
  // (steps, category, phone, joined). Join each verification to its brand;
  // fall back to the verification's own brand snapshot if it isn't loaded.
  const brandsById = new Map(allBrands.map((b) => [b.id, b]));
  const toRow = (v) => {
    const brandId = v.brandId || v.brand?.id;
    const listed = brandsById.get(brandId);
    const base = listed || {
      id: brandId,
      brandId: v.brand?.uniqueId,
      brandName: v.brand?.brandName,
      logo: v.brand?.logo,
      onboardingFlags: {},
      onboardingScreen: v.vendor?.currentScreen,
      joinedDate: v.createdAt,
      category: "—",
      contactPhone: v.brand?.whatsappNumber ? `+91 ${v.brand.whatsappNumber}` : "—",
    };
    return { ...base, verificationId: v.id, review: statusFor(v), rejected: isRejectedV(v) };
  };
  function statusFor(v) {
    return isRejectedV(v)
      ? { label: v.derivedStatus === "REVOKED" ? "Revoked" : "Rejected", tone: "red" }
      : { label: "Waiting for approval", tone: "amber" };
  }
  const openRow = (row) => setSelectedId(row.verificationId);
  const verificationOf = (row) => verifications.find((v) => v.id === row.verificationId);

  // Table workflow (same as Settlement): the status pill turns into
  // "Approve ›" on hover; Reject sits next to View in the Action column.
  // Approve stays available on rejected rows as a manual override — same
  // rule as the details page (canReview = brand not approved).
  const tableColumns = onboardingTableColumns({
    onOpen: openRow,
    now: openedAt,
    renderStatus: (row) => (
      <StatusStepButton
        label={row.review.tone === "red" ? row.review.label : "Waiting"}
        tone={row.review.tone}
        stepLabel="Approve"
        disabled={Boolean(busyAction)}
        onClick={() => {
          setActionError("");
          setApproveTarget(row);
        }}
      />
    ),
    renderActions: (row) =>
      !row.rejected && (
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

  const selected = verifications.find((v) => v.id === selectedId) || null;

  /* ---- Review workflow (Approve / Reject / Reviewed / Force / Revoke) --- */
  const handleReview = async (verification, payload, key) => {
    setActionError("");
    setBusyAction(key);
    try {
      const brandId = verification.brandId || verification.brand?.id;
      await reviewBrandVerification(brandId, payload);
      await fetchVerifications();
      // Refresh the open detail view and the app-wide brand list (Live
      // Brand / New Onboarding / Dashboard) so nothing needs a reload.
      setDetailReloadKey((k) => k + 1);
      fetchBrands({ silent: true });
      return true;
    } catch (err) {
      setActionError(err.message);
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const handleApprove = (verification, note) => handleReview(verification, { action: "APPROVED", note }, "approve");
  const handleReject = (verification, rejectionReason) =>
    handleReview(verification, { action: "REJECTED", rejectionReason }, "reject");
  // Case D — plain toggle, no explicit direction (server flips isReviewed).
  const handleMarkReviewed = (verification) => handleReview(verification, { action: "REVIEWED" }, "reviewed");
  // Case D2 — force isReviewed to an explicit true/false.
  const handleForceReviewed = (verification, isReviewed) =>
    handleReview(verification, { action: "REVIEWED", isReviewed }, isReviewed ? "force-on" : "force-off");
  const handleRevoke = (verification, revokeReason) =>
    handleReview(verification, { action: "REVOKED", revokeReason }, "revoke");

  if (selected) {
    return (
      <VerificationDetails
        verification={selected}
        onBack={() => {
          setSelectedId(null);
          setActionError("");
        }}
        onApprove={(note) => handleApprove(selected, note)}
        onReject={(reason) => handleReject(selected, reason)}
        onMarkReviewed={() => handleMarkReviewed(selected)}
        onForceReviewed={(isReviewed) => handleForceReviewed(selected, isReviewed)}
        onRevoke={(reason) => handleRevoke(selected, reason)}
        busyAction={busyAction}
        actionError={actionError}
        reloadKey={detailReloadKey}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Brand Waiting
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Brands waiting for admin approval — review scores and checks, then open a card to approve
            or reject. {pendingOnly.length} waiting · {rejectedOnly.length} rejected.
          </p>
        </div>

        {/* KPI tiles */}
        {!loadError && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {waitingTiles.map(({ tabKey, ...t }) => (
              <StatTile
                key={t.label}
                {...t}
                value={loading ? "…" : t.value}
                active={tabKey ? tab === tabKey : false}
                onClick={
                  tabKey
                    ? () => {
                        setTab(tabKey);
                        setPage(1);
                      }
                    : undefined
                }
              />
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
              placeholder="Search brand name..."
              className="w-full bg-transparent text-[13.5px] text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
            {[
              ["All", waiting.length],
              ["Waiting", pendingOnly.length],
              ["Rejected", rejectedOnly.length],
            ].map(([key, count]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  tab === key
                    ? "bg-emerald-400 text-neutral-950"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {key}
                <span className="text-[10.5px] opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* A table Reject that failed (Approve shows its error in its modal). */}
        {actionError && !approveTarget && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-600 dark:text-red-400">
            <AlertTriangle size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* Grid / table switch — right above the list it controls (same as New Onboarding). */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-neutral-500">
            {loading ? "Loading brands…" : `${tabRows.length} brand${tabRows.length === 1 ? "" : "s"}`}
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

        {/* Load state */}
        {loading && (
          <Loader label="Loading verifications…" />
        )}

        {!loading && loadError && (
          <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
            <EmptyState
              tone="error"
              icon="error"
              title="Couldn't load the approval queue"
              description={`${loadError} — check your connection and try again.`}
              action={{ label: "Try again", onClick: fetchVerifications }}
            />
          </div>
        )}

        {!loading && !loadError && (
          <>
            {filtered.length === 0 ? (
              <div className="rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-neutral-900 dark:shadow-black/20">
                {search ? (
                  <EmptyState
                    icon="search"
                    title="No waiting brands match your search"
                    description="Check the spelling or try another brand name — or clear the search to see the whole queue."
                    action={{ label: "Clear search", onClick: () => setSearch("") }}
                  />
                ) : (
                  tab === "Rejected" ? (
                    <EmptyState
                      icon="onboarding"
                      title="No rejected brands"
                      description="Brands you reject (or revoke) show up here so you can review them again once the vendor fixes things."
                      action={{ label: "See Waiting", onClick: () => setTab("Waiting") }}
                    />
                  ) : (
                    <EmptyState
                      icon="onboarding"
                      title="No brands waiting for approval"
                      description="You're all caught up. Brands land here once a vendor finishes onboarding."
                      action={{ label: "See New Onboarding", onClick: () => navigate("/new-onboarding") }}
                      secondaryAction={{ label: "Live Brands", onClick: () => navigate("/brand") }}
                    />
                  )
                )}
              </div>
            ) : view === "table" ? (
              <Table columns={tableColumns} data={filtered.map(toRow)} minWidth={1080} emptyTitle="No brands waiting for approval" emptyIcon="onboarding" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((v) => (
                  <OnboardingCard
                    key={v.id}
                    brand={toRow(v)}
                    onOpen={openRow}
                    now={openedAt}
                    status={statusFor(v)}
                    // Same modals as the table; no Reject on already-rejected rows.
                    actions={{
                      busy: Boolean(busyAction),
                      onApprove: (row) => {
                        setActionError("");
                        setApproveTarget(row);
                      },
                      onReject: isRejectedV(v)
                        ? undefined
                        : (row) => {
                            setActionError("");
                            setRejectTarget(row);
                          },
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12.5px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                >
                  Prev
                </button>
                <span className="text-[12.5px] text-neutral-500">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[12.5px] text-neutral-700 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Table row Approve — optional note */}
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
            const v = verificationOf(approveTarget);
            if (v && (await handleApprove(v, note))) setApproveTarget(null);
          }}
        />
      )}

      {/* Table row Reject — reason is shown to the brand owner */}
      {rejectTarget && (
        <RejectReasonModal
          brand={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => {
            const v = verificationOf(rejectTarget);
            setRejectTarget(null);
            if (v) handleReject(v, reason);
          }}
        />
      )}
    </div>
  );
}
